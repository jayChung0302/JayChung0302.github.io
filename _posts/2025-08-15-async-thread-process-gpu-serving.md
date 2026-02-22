---
layout: post
toc: true
title: "GPU 추론 서버 설계 — Async + Thread + Process 3계층 아키텍처"
description: "FastAPI async web server, thread batcher, multiprocessing GPU worker를 결합한 GPU inference serving 아키텍처 설계와 레퍼런스 코드."
categories: engineering
tags:
  - python
  - fastapi
  - async
  - multiprocessing
  - gpu
  - inference-serving
  - threading
author: Nate
---

GPU 모델을 서빙하는 서버를 짤 때 가장 자주 하는 실수가 하나 있다. 
바로.. **메인 프로세스에서 torch 모델을 로드하는 것.** 
FastAPI 앱을 띄우고, startup 이벤트에서 `model = load_model()` 하고, endpoint에서 바로 `model(input)` 부르는 구조. 작은 규모에서는 돌아가지만, 문제가 쌓인다.

- 모델이 크래시하면 웹 서버 전체가 죽는다
- GIL로 인해 Python thread는 GPU 연산을 병렬화하지 못한다
- 배칭(batching)이 없으니 요청이 몰리면 GPU utilization이 낮은데 latency는 높다
- `spawn` 대신 `fork`로 자식 프로세스를 뒤늦게 만들면 CUDA context가 꼬인다

여기서 정리하는 구조는 이 문제들을 각 계층에서 분리해서 푼다.

## 설계 원칙: 3계층 역할 분리

```
[Client]
   ↓ HTTP
[Async Web Layer]   ← 커넥션 관리, backpressure, timeout, cancellation
   ↓ asyncio.Future + shard queue
[Thread Layer]      ← micro-batching, 큐 샤딩, response dispatch
   ↓ mp.Queue (IPC)
[Process Layer]     ← GPU 컨텍스트 전담, 크래시 격리, 자동 재시작
```

각 계층이 하는 일이 다르다.

- **Async**: 커넥션을 non-blocking으로 들고 있기. `await`로 결과를 기다리되 event loop는 블록하지 않음
- **Thread**: 배칭 window 관리, mp.Queue 블로킹 읽기를 event loop 밖에서 처리
- **Process**: 모델과 GPU context는 여기서만 존재. 죽어도 웹 서버는 안 죽음

## 메시지 프로토콜

계층 간 통신은 세 가지 dataclass로 정의한다.

```python
@dataclass(frozen=True)
class InferenceItem:
    request_id: str
    payload: Any          # text, bytes, dict 등 요청 데이터

@dataclass(frozen=True)
class InferenceBatch:
    batch_id: str
    items: List[InferenceItem]  # micro-batcher가 묶어서 내려보내는 단위

@dataclass(frozen=True)
class InferenceResult:
    request_id: str
    output: Optional[Any] = None
    error: Optional[str] = None   # 에러도 결과 채널로 되돌림
```

`request_id`가 핵심이다. 비동기로 섞인 응답들을 올바른 Future에 매핑하는 키다.

## 레퍼런스 코드

### 튜닝 포인트 (환경변수로 조정)

```python
MAX_BATCH_SIZE    = int(os.getenv("MAX_BATCH_SIZE", "16"))
MAX_BATCH_WAIT_MS = int(os.getenv("MAX_BATCH_WAIT_MS", "5"))   # micro-batching window
NUM_WORKERS       = int(os.getenv("NUM_WORKERS", "1"))          # 보통 GPU 수와 같게
QUEUE_SHARDS      = int(os.getenv("QUEUE_SHARDS", "4"))         # 락 경합 감소
REQUEST_TIMEOUT_S = float(os.getenv("REQUEST_TIMEOUT_S", "2.0"))
```

### GPU Worker 프로세스

모델은 반드시 여기서만 로드한다. 메인 프로세스에서 `import torch` 이후 `cuda` context가 생기면, 이후 `fork`로 자식을 만들 때 CUDA가 꼬인다. `spawn` start method를 쓰면 깨끗하게 새 Python 인터프리터가 뜨고, 거기서 모델을 로드한다.

```python
def gpu_worker_main(
    worker_rank: int,
    in_q: mp.Queue,
    out_q: mp.Queue,
    shutdown_ev: mp.Event,
):
    model = _load_model_on_gpu(worker_rank)
    _ = _gpu_infer(model, [_heavy_preprocess({"warmup": True})])  # warmup

    while not shutdown_ev.is_set():
        try:
            batch: InferenceBatch = in_q.get(timeout=0.1)
        except queue.Empty:
            continue

        if batch is None:  # poison pill
            break

        try:
            inputs = [_heavy_preprocess(it.payload) for it in batch.items]
            outputs = _gpu_infer(model, inputs)
            for it, out in zip(batch.items, outputs):
                out_q.put(InferenceResult(request_id=it.request_id, output=out))
        except Exception as e:
            err = f"{type(e).__name__}: {e}"
            for it in batch.items:
                out_q.put(InferenceResult(request_id=it.request_id, error=err))
```

batch-level 예외가 발생하면 그 배치의 모든 item에 에러를 돌려준다. 에러가 그냥 삭켜지면 클라이언트는 영원히 timeout을 기다린다.

### Batcher (Thread Layer)

```python
class Batcher:
    def __init__(self, loop, worker_in_qs, worker_out_q):
        self.loop = loop
        self.worker_in_qs = worker_in_qs
        self.worker_out_q = worker_out_q

        self.ingress_shards = [queue.Queue(maxsize=4096) for _ in range(QUEUE_SHARDS)]
        self._futures: Dict[str, asyncio.Future] = {}
        self._futures_lock = threading.Lock()
        self._rr_worker = 0

    def submit(self, payload: Any) -> asyncio.Future:
        request_id = uuid.uuid4().hex
        fut = self.loop.create_future()

        with self._futures_lock:
            self._futures[request_id] = fut

        item = InferenceItem(request_id=request_id, payload=payload)
        shard = (hash(request_id) & 0x7FFFFFFF) % QUEUE_SHARDS

        try:
            self.ingress_shards[shard].put_nowait(item)
        except queue.Full:
            with self._futures_lock:
                self._futures.pop(request_id, None)
            fut.set_exception(HTTPException(status_code=429, detail="Ingress queue full"))

        return fut
```

`shard = hash(request_id) % QUEUE_SHARDS`로 요청을 분산한다. 단일 큐에 모든 thread가 경합하는 것보다 락 contention이 크게 줄어든다.

**micro-batcher 루프:**

```python
def _batch_loop(self, shard_idx: int):
    shard_q = self.ingress_shards[shard_idx]
    pending: List[InferenceItem] = []
    deadline = None

    while not self._stop.is_set():
        now = time.time()
        should_flush = pending and (
            len(pending) >= MAX_BATCH_SIZE or
            (deadline is not None and now >= deadline)
        )

        if should_flush:
            batch = InferenceBatch(batch_id=uuid.uuid4().hex, items=pending)
            pending = []
            deadline = None
            self._choose_worker_in_q().put(batch)
            continue

        timeout = 0.001
        if pending and deadline is not None:
            timeout = max(0.0, min(0.005, deadline - now))

        try:
            item = shard_q.get(timeout=timeout)
            pending.append(item)
            if len(pending) == 1:
                deadline = time.time() + (MAX_BATCH_WAIT_MS / 1000.0)
        except queue.Empty:
            continue
```

flush 조건이 두 가지인 게 핵심이다.

- `MAX_BATCH_SIZE` 도달 → 즉시 flush (GPU 효율 우선)
- `deadline` 도달 → 사이즈 미달이어도 flush (latency 보장)

이 두 조건의 균형을 `MAX_BATCH_WAIT_MS`로 조정한다.

**response dispatcher:**

```python
def _response_loop(self):
    while not self._stop.is_set():
        try:
            res: InferenceResult = self.worker_out_q.get(timeout=0.1)
        except queue.Empty:
            continue

        with self._futures_lock:
            fut = self._futures.pop(res.request_id, None)

        if fut is None:
            continue  # timeout으로 이미 drop된 요청

        if res.error:
            self.loop.call_soon_threadsafe(
                fut.set_exception, HTTPException(status_code=500, detail=res.error)
            )
        else:
            self.loop.call_soon_threadsafe(fut.set_result, res.output)
```

`call_soon_threadsafe`가 중요하다. `fut.set_result()`를 thread에서 직접 부르면 thread-safe하지 않다. event loop에 콜백을 등록하는 방식으로 안전하게 Future를 resolve한다.

### WorkerSupervisor (Process Layer)

```python
class WorkerSupervisor:
    def __init__(self, num_workers: int):
        self.num_workers = num_workers
        self.shutdown_ev = mp.Event()
        self.worker_in_qs = [mp.Queue(maxsize=256) for _ in range(num_workers)]
        self.worker_out_q = mp.Queue(maxsize=4096)
        self.procs: List[mp.Process] = []

    def start(self):
        mp.set_start_method("spawn", force=True)  # CUDA 안전을 위해 반드시 spawn

        for i in range(self.num_workers):
            p = mp.Process(
                target=gpu_worker_main,
                args=(i, self.worker_in_qs[i], self.worker_out_q, self.shutdown_ev),
                daemon=True,
            )
            p.start()
            self.procs.append(p)

        threading.Thread(target=self._watchdog_loop, daemon=True).start()

    def _watchdog_loop(self):
        while not self.shutdown_ev.is_set():
            for idx, p in enumerate(list(self.procs)):
                if not p.is_alive():
                    new_p = mp.Process(
                        target=gpu_worker_main,
                        args=(idx, self.worker_in_qs[idx], self.worker_out_q, self.shutdown_ev),
                        daemon=True,
                    )
                    new_p.start()
                    self.procs[idx] = new_p
            time.sleep(0.5)
```

watchdog가 0.5초마다 살아있는지 체크하고, 죽으면 자동 재시작한다. CUDA OOM이나 모델 버그로 worker가 죽어도 웹 서버가 살아있다.

입력 큐를 worker당 하나씩 분리(`worker_in_qs[i]`)한 것도 포인트다. 공유 큐 하나에 모두 밀어넣으면 mp.Queue의 내부 락에서 경합이 생긴다.

### FastAPI 연결

```python
@app.on_event("startup")
async def on_startup():
    global supervisor, batcher
    loop = asyncio.get_running_loop()
    supervisor = WorkerSupervisor(NUM_WORKERS)
    supervisor.start()
    batcher = Batcher(loop, supervisor.worker_in_qs, supervisor.worker_out_q)
    batcher.start()

@app.post("/infer")
async def infer(req: InferReq):
    fut = batcher.submit({"text": req.text})
    try:
        out = await asyncio.wait_for(fut, timeout=REQUEST_TIMEOUT_S)
        return {"ok": True, "result": out}
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Inference timeout")
```

`asyncio.wait_for`로 per-request timeout을 건다. timeout이 터지면 Future는 event loop에서 drop되고, 뒤늦게 worker에서 결과가 와도 `_futures` dict에 해당 `request_id`가 없으므로 무시된다. 메모리 leak이 없다.

### 실행

```bash
pip install fastapi uvicorn pydantic
uvicorn server:app --host 0.0.0.0 --port 8000 --workers 1
```

`--workers`는 1로 고정한다. uvicorn의 worker는 프로세스 복제인데, 이 구조에서는 GPU worker를 직접 관리하기 때문에 uvicorn worker를 늘리면 GPU process가 중복 생성된다. 수평 스케일은 ELB나 Nginx 뒤에 인스턴스를 여러 개 두는 방식이 깔끔하다.

## 병목 포인트별 튜닝

### Tail latency 증가 (큐 경합 / batching delay)

- `QUEUE_SHARDS` 높이기 (4 → 8 → 16)
- `MAX_BATCH_WAIT_MS` 낮추기 (5ms → 1ms). throughput vs latency tradeoff
- shard를 priority class로 분리 (짧은 요청 / 긴 요청 별도 큐)

### GPU utilization 낮음 (작은 배치)

- `MAX_BATCH_SIZE` 높이기
- tokenization 같은 heavy CPU 전처리를 worker 프로세스에서 배치 단위로 처리 (현재 코드가 이 구조)
- dynamic shape / padding 전략 검토

### 메모리 증가 (모델 복제)

원칙은 **GPU당 worker 1개**. 모델이 너무 크면:

- Tensor parallel / pipeline parallel (프레임워크 레벨 솔루션)
- single GPU worker + CUDA stream overlap: 입력은 큐에서, GPU는 stream으로 동시성 확보

### IPC 비용 (큰 payload)

`mp.Queue`는 pickle serialize/deserialize가 들어간다. 입력 텐서가 크면 비용이 커진다.

```python
# mp.Queue 대신 shared_memory 사용 패턴
from multiprocessing import shared_memory

shm = shared_memory.SharedMemory(create=True, size=buffer_size)
# Queue에는 name + shape + dtype + offset만 전달
in_q.put({"shm_name": shm.name, "shape": (H, W, C), "dtype": "uint8"})
```

Queue에 전달하는 데이터를 최소화하고, 실제 payload는 shared memory로 공유한다.

## 실무에서 자주 추가하는 옵션

**Circuit breaker / overload shedding**

ingress shard가 full이면 즉시 429를 반환한다 (이미 `put_nowait`로 구현). 여기서 queue 길이를 모니터링해서 `MAX_BATCH_WAIT_MS`를 동적으로 줄이는 adaptive batching도 적용 가능하다.

**Graceful shutdown**

```python
def stop(self):
    self.shutdown_ev.set()
    # 1. 새 ingress 차단 (상위 레이어에서)
    # 2. pending flush (batcher 루프가 자연스럽게 drain)
    # 3. poison pill 전송
    for q in self.worker_in_qs:
        try:
            q.put_nowait(None)
        except Exception:
            pass
    # 4. join
    for p in self.procs:
        if p.is_alive():
            p.join(timeout=1.0)
```

순서가 중요하다. ingress를 먼저 막고, pending을 flush하고, poison pill로 worker를 정상 종료시킨다. SIGKILL로 바로 죽이면 in-flight 요청이 다 날아간다.

---

이 구조는 구성요소 각각이 새로운 게 아니다. asyncio, threading, multiprocessing 모두 표준 라이브러리다. 핵심은 **각 계층이 어떤 문제를 담당하는지를 명확히 분리하는 것**이다. async가 threading을 대체하지 않고, threading이 multiprocessing을 대체하지 않는다. 세 계층이 서로 다른 문제를 각자 담당할 때 전체 시스템이 안정적으로 돌아간다.
