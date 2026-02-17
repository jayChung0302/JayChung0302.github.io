---
layout: post
toc: true
title: "RAM 논문 리뷰 — Scene Optimization 없이 3D를 복원하는 Universal Foundation Model"
description: "Reconstruct Anything Model (RAM) 논문 리뷰. Feed-forward 방식으로 single image부터 video까지 다양한 입력에서 3D reconstruction을 수행하는 universal foundation model 분석."
categories: research
tags:
  - 3d-reconstruction
  - paper-review
  - foundation-model
  - feed-forward
author: Nate
---

Satellite 3DGS 계열 논문 리뷰 시리즈([EOGS]({% post_url 2024-10-01-eogs-paper-review %}), [EOGS++]({% post_url 2025-12-30-eogs-plus-plus-review %}), [ShadowGS]({% post_url 2026-02-05-shadowgs-paper-review %}))와는 성격이 다른 논문을 다룬다. **Reconstruct Anything Model (RAM): Towards Universal 3D Reconstruction**은 기존 NeRF/3DGS처럼 scene마다 optimization을 수행하는 패러다임에서 벗어나, **feed-forward foundation model**로 3D를 재구성하려는 시도다.

지금까지 리뷰한 논문들이 "어떻게 하면 GS를 더 정확하게 만들 것인가"에 집중했다면, RAM은 "optimization 자체를 없앨 수 있는가"라는 더 근본적인 질문을 던진다.

## 핵심 용어 정리

### Reconstruct Anything Model (RAM)

단일 모델이 다양한 입력 설정(single image, sparse views, multi-view, video 등)에서 feed-forward 방식으로 3D representation을 예측하는 universal reconstruction model.

### Unified 3D Representation

논문에서 제안하는 공통 3D 표현. Point cloud, implicit field, triplane, Gaussian-like primitive 등 중 하나를 선택해 다양한 입력 조건에서 통일된 출력을 생성한다.

### Cross-Modal Training

이미지, multi-view, video 등 서로 다른 supervision 조건을 하나의 모델에 통합해 학습하는 전략. 입력 modality가 달라도 동일한 3D representation을 출력하도록 학습한다.

### Feed-forward 3D Reconstruction

Scene마다 별도의 optimization loop를 돌리는 대신, 학습된 네트워크의 **forward pass 한 번**으로 3D 출력을 생성하는 방식. Inference 속도가 압도적으로 빠르다.

### Large-scale Pretraining for 3D

2D foundation model(CLIP, DINOv2 등)처럼, massive multi-scene 데이터를 사용해 3D reconstruction prior를 학습하는 paradigm.

## 연구 배경 및 문제 정의

이 논문의 출발점은 매우 근본적이다.

### 기존 3D reconstruction의 한계

**1. Scene-specific optimization paradigm**

NeRF, 3DGS, EOGS, ShadowGS 계열은 한 scene마다 optimization을 새로 수행한다.

- Inference cost가 큼
- 대규모 batch 처리 불가능
- Online / real-time 응용에 제한적

**2. Task-specific 모델의 파편화**

Single-view reconstruction, multi-view stereo, video reconstruction 모델이 각각 별도로 존재한다. 입력 조건이 바뀌면 모델도 바꿔야 한다.

**3. Generalization 부족**

- Indoor → outdoor generalization 어려움
- Object-centric → large-scale scene에서 불안정
- 학습 데이터 도메인에 과적합

### 논문이 던지는 질문

> "하나의 모델이, 어떤 입력 조건이든, optimization 없이, 곧바로 3D를 복원할 수 있는가?"

3D 분야에서의 **"ImageNet moment"**를 노리는 접근이다. 2D vision에서 대규모 사전학습 모델이 downstream task를 지배하게 된 것처럼, 3D reconstruction에서도 같은 패러다임 전환이 가능한지를 탐색한다.

## 제안 방법론

RAM은 크게 세 가지 핵심 설계를 가진다.

### 1. Unified Input Encoding

다양한 입력 설정을 하나의 네트워크 구조로 처리한다.

| 입력 유형 | 설명 |
|-----------|------|
| Single image | 단일 이미지에서 3D 추론 |
| Sparse multi-view | 소수 시점 (2~5장) |
| Dense multi-view | 다수 시점 (수십 장) |
| Video sequence | 연속 프레임 |

이를 위해 view tokens, positional encoding, camera embedding 등을 하나의 transformer backbone에 통합한다.

핵심은 **입력 개수가 달라도 동일 네트워크 구조로 처리**한다는 점이다. Single image든 50장의 multi-view든, 동일한 encoder를 통과한다.

### 2. Unified 3D Representation Head

3D representation 출력을 통합한다.

- Voxel grid
- Implicit field
- Gaussian-like primitive
- Triplane feature

중 하나로 통합 출력하도록 설계하며, Transformer encoder → 3D decoder (MLP or convolutional head) 구조를 취한다.

**Scene optimization이 아니라, forward pass 1번으로 3D 출력**이 핵심이다.

### 3. Large-scale Pretraining Strategy

RAM은 multi-dataset joint training을 수행한다.

| 축 | 구성 |
|----|------|
| 데이터 소스 | Synthetic + Real |
| 대상 | Object + Scene |
| 환경 | Indoor + Outdoor |

학습 과정에서 다양한 supervision signal을 통합한다:

- **Geometry loss** — 3D 형상 정확도
- **Photometric consistency** — 렌더링 일관성
- **Depth supervision** — 깊이 정보 활용
- **Silhouette loss** — 마스크 기반 형상 제약
- **Multi-view consistency** — 시점 간 일관성

## 핵심 결과

### Single-view Reconstruction

기존 single-view SOTA 대비 Chamfer Distance 개선. 단일 이미지에서도 합리적인 3D geometry를 추론한다.

### Sparse-view Setting

COLMAP + NeRF optimization 없이도 geometry reconstruction 품질에서 경쟁력을 확보했다. 이는 기존 파이프라인에서 가장 시간이 오래 걸리는 단계(SfM + per-scene optimization)를 완전히 제거할 수 있음을 의미한다.

### Cross-domain Generalization

훈련에 포함되지 않은 데이터셋에서도 안정적인 reconstruction 성능을 보인다. Foundation model 답게, 도메인 전이 능력이 강하다.

## 구조적 비교: Paradigm별 위치

| Paradigm | 대표 모델 | 특성 |
|----------|-----------|------|
| Optimization-based | NeRF, 3DGS, EOGS, ShadowGS | Scene마다 수분~수시간 최적화 |
| Hybrid | 3DGRT | Optimization + learned component |
| Foundation-based | **RAM** | Forward pass 한 번, 범용 |

지금까지 리뷰한 논문들과 기술적 초점을 비교하면:

| 모델 | 목적 | 기술적 레벨 |
|------|------|-------------|
| RAM | Universal feed-forward 3D | Representation learning |
| EOGS++ | Satellite GS engineering | Rendering / training pipeline |
| ShadowGS | Physics-aware GS | Inverse rendering |
| RaDe-GS | 정확한 depth rasterization | Geometry extraction |

## EO / Satellite 관점에서의 시사점

내 연구 방향(3DGS 기반 national-scale DSM)과 비교하면, RAM의 강점과 약점이 명확히 갈린다.

### RAM의 강점

- **Inference 속도** — Optimization loop 없이 forward pass 한 번
- **대량 처리 가능** — 수천 개 scene을 batch로 처리 가능
- **Strong prior** — 대규모 사전학습에서 획득한 3D reconstruction prior

### RAM의 약점 (Satellite 관점)

- **Sensor-specific camera model에 약할 가능성** — RPC, pushbroom 등 satellite 고유의 camera model을 학습 데이터에서 본 적이 없을 가능성이 높다
- **Physics-based shadow modeling 부재** — ShadowGS가 해결한 multi-temporal shadow inconsistency 문제를 다루지 않는다
- **Sub-meter DSM precision 한계** — Coarse한 geometry prior는 강하지만, 정밀 고도 복원에서는 한계가 있을 수 있다

### 두 패러다임의 결합 가능성

RAM은 **빠른 coarse reconstruction**, GS는 **정밀한 fine reconstruction**이라는 형태의 pipeline이 자연스럽다.

```
RAM (coarse init) → 3DGS optimization (fine refinement)
```

이 구조가 실현되면:

1. RAM으로 초기 3D geometry를 빠르게 추정
2. 이를 3DGS의 초기화로 활용
3. Scene-specific optimization으로 sub-meter 정밀도 달성

기존에 COLMAP → 3DGS로 이어지는 파이프라인에서 COLMAP 단계를 RAM으로 대체하는 것도 고려해볼 수 있다.

## 결론 및 시사점

RAM의 핵심 메시지는 명확하다.

> 3D reconstruction을 optimization-based paradigm에서 feed-forward foundation model paradigm으로 옮길 수 있다.

이 논문이 중요한 이유:

1. **패러다임 전환의 신호** — 2D vision에서 일어난 foundation model 혁명이 3D에서도 시작되고 있다
2. **입력 유연성** — Single image부터 video까지, 하나의 모델로 통합
3. **Scalability** — Per-scene optimization의 병목을 제거

그러나 precision-critical 분야에서의 한계도 분명하다:

- **Sub-meter DSM 정확도**가 필요한 경우
- **Shadow-aware geometry**가 중요한 multi-temporal satellite 환경
- **RPC camera**와 같은 특수 센서 모델이 필요한 경우

이런 조건에서는 여전히 GS 계열의 scene-specific optimization이 유리할 가능성이 높다.

결국 중요한 질문은 "optimization을 완전히 제거할 것인가, RAM의 prior를 optimization 파이프라인에 녹여낼 것인가"다. Satellite 3D reconstruction에서는 후자가 더 현실적인 방향이라고 본다. RAM이 제공하는 coarse 3D prior 위에 ShadowGS / EOGS++ 수준의 physics-aware optimization을 얹는 것이 sub-meter 정밀도와 처리 속도를 모두 잡을 수 있는 경로일 것이다.
