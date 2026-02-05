---
layout: post
toc: true
title: "EOGS++ 리뷰 — Satellite Gaussian Splatting의 End-to-End 가능성"
description: "EOGS++ 논문 리뷰. Internal BA와 PAN-only 학습으로 위성 영상 3D 복원의 end-to-end pipeline 구현."
categories: research
tags:
  - 3dgs
  - satellite
  - nerf
  - reconstruction
  - paper-review
author: Nate
---

위성 영상 기반 3D reconstruction에서 Gaussian Splatting이 어디까지 왔는지 정리해본다. EOGS++는 기존 EOGS의 구조적 한계를 걷어내면서 raw sensor input에서 DSM까지 end-to-end pipeline을 만들려는 시도다. 새로운 이론을 제안하는 논문은 아니지만, 중요한 질문들에 대해 engineering-heavy한 답을 내놓고 있다.

## 핵심 용어 정리

- **EOGS++**: 기존 EOGS를 확장하여 external preprocessing (Bundle Adjustment, pansharpening)을 제거하고 end-to-end satellite reconstruction을 목표로 한 프레임워크
- **Internal BA**: optical flow 기반으로 camera pose error를 pixel-level shift로 근사하여, training loop 내부에서 camera refinement를 수행하는 방식
- **3-PAN**: MSI(Multi Spectral Imge - RGB NIR 등) 없이 raw high-resolution PAN 영상만으로 reconstruction을 수행하는 전략
- **Opacity Reset + Early Stopping**: opacity를 주기적으로 리셋하고 photometric loss 기반 early stopping으로 학습을 안정화
- **TSDF Post-processing**: multi-view depth rendering 결과를 [TSDF](Truncated Signed Distance Function) fusion으로 통합해 DSM을 생성하는 단계

## 왜 EOGS++인가

EOGS는 이미 **EO-NeRF 수준의 accuracy를 수 분 내에 달성**한 강력한 baseline이었다. 그런데 실전 적용에는 구조적 제약이 남아 있었음.

1. **External BA 의존** — RPC camera의 pointing error를 외부 BA 툴로 보정해야 해서 end-to-end pipeline이 불가능
2. **Pansharpening 전처리 필수** — PAN + MSI를 합쳐야 해서 sensor mismatch, artifact, alignment noise가 유입
3. **Sharpness 부족** — 빠른 수렴은 되지만 fine structure가 무너지는 사례 존재
4. **DSM 생성의 view bias** — nadir virtual view 기반 elevation rendering의 불안정성

EOGS++가 던지는 질문:

> Satellite Gaussian Splatting을 raw sensor input → DSM까지 완전히 internalized 된 pipeline으로 만들 수 있는가?

## Method: 무엇이 바뀌었나

### 1. Internal Bundle Adjustment via Optical Flow

핵심 아이디어: RPC error는 satellite imagery에서 주로 **pixel offset**으로 나타난다. 그러면 full BA 대신 translation-only BA로 충분하지 않을까?

Rendered image와 training image 사이의 optical flow를 계산하고, 이를 constant shift로 평균화한 뒤 bilinear resampling으로 정렬한다. Stop-gradient를 적용해서 flow network와 GS를 disentangle.

**정량 결과 (MAE, meters):**

| Method | MAE ↓ |
|--------|-------|
| Raw RPC | 1.93 |
| Learnable affine (learn wv) | 1.82 |
| **Optical flow BA** | **1.36** |
| External BA | 1.33 |

Internal BA가 external BA와 **3cm 차이**까지 근접했다. learnable affine matrix 직접 optimization은 local minima에 빠지는 문제가 있었는데, optical flow 기반 근사가 훨씬 안정적이다.

### 2. Direct Panchromatic Rendering (3-PAN)

MSI를 완전히 제거하고 PAN 영상만 쓴다. 1-channel PAN을 3-channel로 복제해서 GS에 넣는 단순한 전략.

| Method | MAE ↓ |
|--------|-------|
| Brovey pansharpening | 1.33 |
| **3-PAN** | **1.33** |
| Single-channel PAN (d=1) | 1.47 |
| PAN+MSI joint | 1.77 |

놀라운 건 **PAN+MSI를 같이 쓰면 오히려 악화**된다는 점이다. GS는 PAN과 MSI를 동시에 exploit하는 representation이 아니고, MSI는 geometry에 큰 기여를 하지 못한다. PAN-only가 가장 robust.

이건 satellite GS 설계 관점에서 **굉장히 중요한 negative result**다. pansharpening이 필수라는 기존 가정을 뒤집는다.

### 3. Opacity Reset + Early Stopping

3DGS 원 논문의 opacity reset을 재도입한다. αk ← min(αk, 0.05) every 3k iters. Iteration을 5k에서 40k로 늘렸는데, 문제는 photometric loss가 다시 증가한다는 것. 이걸 loss minimum 시점에서 early stop으로 해결한다.

효과:
- Gaussian floater 제거
- Edge / building boundary 선명화
- Vegetation 같은 unstable structure는 일부 희생 → DSM 목적에는 합리적 trade-off

### 4. TSDF-based DSM Post-processing

Training view 각각에서 depth를 렌더하고, view-normal angle 기반 weight로 TSDF fusion → Marching Cubes → mesh → hole filling → DSM. GS 자체는 implicit surface이기 때문에 DSM은 **explicit geometry consolidation이 필수**다.

## 최종 결과

| Method | MAE ↓ | Time |
|--------|-------|------|
| EO-NeRF | 1.29 | ~15h |
| EOGS | 1.33 | 9min |
| **EOGS++** | **1.19** | **25min** |

EOGS 대비 −0.14m, EO-NeRF 대비 −0.10m. 여전히 orders-of-magnitude faster. 특히 building region에서 개선 폭이 크다.

## 정리

EOGS++가 증명한 것들:

1. Satellite Gaussian Splatting은 **raw sensor → DSM까지 end-to-end 가능**하다
2. External BA, pansharpening은 **필수가 아니다**
3. PAN-only reconstruction은 geometry 관점에서 **충분히 강력**하다
4. 다만 GS 기반 DSM은 **opacity lifecycle 관리**와 **explicit post-processing** 없이는 완성되지 않는다

개인적으로 가장 인상적이었던 건 3-PAN의 negative result다. pansharpening을 당연하게 쓰고 있었는데.. base 가정을 의심하는 게 연구의 시작이라는 걸 다시 한번 느꼈다.

[TSDF]: https://www.emergentmind.com/topics/truncated-signed-distance-field-tsdf/