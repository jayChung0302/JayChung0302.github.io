---
layout: post
toc: true
math: true
title: "From Orbit to Ground 논문 리뷰 — Generative City Photogrammetry from Extreme Off-Nadir Satellite Images"
description: "From Orbit to Ground 논문 리뷰. Z-Monotonic SDF로 satellite sparse view에서 city-scale 3D geometry를 복원하고, deterministic restoration network로 ground-level novel view를 합성하는 framework."
categories: misc
tags:
  - computer-vision
  - 3d-reconstruction
  - paper-review
  - remote-sensing
  - neural-rendering
author: Nate
---

## 들어가며

[Satellite 영상만으로 도시를 3D로 복원하고, 거기서 ground-level novel view까지 합성할 수 있을까?](https://arxiv.org/abs/2512.07527) 기존 NeRF/3DGS 계열은 object-level이나 street-level에서는 강력하지만, satellite setting에서는 근본 가정이 깨진다. 입력이 sparse하고 facade에 대한 parallax가 거의 없으며, blur와 atmospheric distortion까지 겹치기 때문이다.

이 논문은 문제를 두 갈래로 분리한다. Geometry는 강한 structural prior로 안정화하고, appearance는 generative prior로 복원하는 decoupled design이다. 그 결과 satellite-only, sparse-view 조건에서도 application-ready mesh + texture asset을 만들어낸다.

## 핵심 용어 정리

### Z-Monotonic SDF

3D city geometry를 일반적인 unconstrained 3D field가 아니라, z축 방향으로 monotonic한 signed distance field로 표현하는 방식이다. $\partial s / \partial z \ge 0$ 제약 덕분에 roof/ground는 continuous surface로, facade는 vertical plateau로 표현되어, sparse satellite view에서도 watertight mesh와 sharp vertical facade를 안정적으로 복원할 수 있다.

### Extreme Viewpoint Extrapolation

Top-down satellite input에서 ground-level novel view를 합성해야 하는 문제다. 사실상 거의 90° 수준의 viewpoint gap이며, facade foreshortening, minimal parallax, texture blur가 동시에 발생한다.

### 2.5D Geometry Representation

도시를 완전한 자유 3D가 아니라 height map 기반 2.5D 구조로 가정하는 표현이다. 일반 remote sensing의 DSM과 닮았지만, 단순 raster height map이 아니라 mesh extraction이 가능한 differentiable 2.5D SDF로 확장했다는 점이 핵심이다.

### Deterministic Restoration Network

FLUX-Schnell 기반 diffusion prior를 stochastic generator가 아니라 degraded render → sharp target의 deterministic restorer로 fine-tuning한 네트워크다. Texture optimization에서 동일 입력에 대해 일관된 supervision이 필요하므로, 일반적인 sampling 기반 diffusion 대신 direct mapping 구조를 사용한다.

### Iterative Texture Refinement

현재 texture atlas로부터 simulated close-range novel view를 렌더링하고, 이를 restoration network로 복원한 pseudo-ground truth로 다시 texture를 업데이트하는 반복 구조다. Geometry를 먼저 고정한 뒤, appearance를 generative prior로 점진적으로 bootstrap한다.

## 문제 정의


> "Extreme off-nadir satellite images만으로 city-scale 3D scene을 reconstruct한 뒤, ground-level에 가까운 novel view까지 photorealistically synthesize할 수 있는가?"

기존 방법의 한계는 세 가지로 정리된다.

1. **Sparse view + minimal parallax** — satellite에서는 vertical structure에 대한 parallax가 거의 없어서, photometric supervision만으로 geometry를 맞추면 noisy, collapsed, shrink-wrapped structure로 무너진다.

2. **Facade foreshortening** — top-down 관점에서 facade의 geometry 단서가 크게 손실된다. NeRF/3DGS 계열은 이 ambiguity를 풀지 못한다.

3. **Appearance degradation** — long-range capture 특성상 blur, atmospheric distortion, sensor limitation 때문에 appearance 자체도 열화된다.

기존 방법들은 "정확한 elevation 중심(DSM/MVS)" 또는 "photo-real rendering 중심이지만 geometry prior 부족(NeRF/3DGS)"이라는 양 극단에 놓여 있고, 저자들은 이 간극을 메우겠다는 것이 동기다.

## 제안 방법론

전체 pipeline은 2-stage다.

### Stage 1: Geometry Reconstruction

도시를 unconstrained 3D volume으로 보지 않고 Z-Monotonic SDF 기반 2.5D surface로 모델링한다. SDF $s(x,y,z)$가 z축을 따라 non-decreasing하도록 $\partial s / \partial z \ge 0$ 제약을 둔다.

Roof/ground처럼 single-valued surface는 일반적인 height function처럼 표현되고, building edge에서는 ground부터 roof까지 vertical plateau가 생겨 facade가 절차적으로 정의된다. "Satellite에서는 facade point가 거의 없는 문제"를 facade를 직접 관측해 reconstruct하는 문제가 아니라, 2.5D prior 안에서 추론 가능한 constrained optimization 문제로 바꿔버리는 것이다.

이후 FlexiCubes 기반 differentiable iso-surfacing으로 mesh를 추출하고, MVS point cloud 대비 z-axis height supervision, Laplacian regularization, normal consistency loss를 함께 사용한다.

### Stage 2: Appearance Modeling

먼저 source satellite image를 differentiable renderer로 back-project해 basic texture를 만든다. 하지만 이 texture는 blur와 projection artifact가 baked-in 되어 품질이 낮다.

그래서 FLUX-Schnell 기반 image restoration network를 fine-tune한다. 핵심은 이것이 일반 diffusion generation이 아니라 deterministic restoration이라는 점이다. Degraded render를 latent로 인코딩해 clean latent로 직접 매핑하는 single-step restoration 형태를 학습해, texture optimization에 필요한 stable supervision을 보장한다. 학습 데이터는 내부 3D urban assets로부터 만든 100,000 paired images다.

이후 simulated UAV-like novel view(고도 450m, pitch 45°, 4방향)를 렌더링하고, restorer로 sharpen한 뒤, 그것을 pseudo-target으로 texture atlas를 다시 최적화한다. 이 iterative refinement를 2회 반복한다. 전체 시스템은 단일 NVIDIA A6000에서 1 km²당 약 1.5시간(geometry 0.5h + appearance 1h) 소요된다.

## 핵심 결과

### Geometry (MatrixCity)

| 모델 | F1 ↑ | Chamfer Distance ↓ |
|------|------|---------------------|
| Skyfall-GS | 0.296 | 0.359 |
| 2DGS | 0.553 | 0.043 |
| **Ours** | **0.643** | **0.036** |

2DGS는 Precision이 더 높지만(0.693) Recall이 낮고(0.464) facade가 shrink-wrap되는 문제가 있다. 저자들은 best competitor 대비 F1 +0.09, Chamfer distance 50% 감소로 요약한다.

### Visual Quality (DFC 2019)

| 모델 | PSNR ↑ | SSIM ↑ | LPIPS ↓ |
|------|--------|--------|---------|
| Mip-Splatting | 10.289 | 0.346 | 0.816 |
| Skyfall-GS | 12.460 | 0.330 | 0.740 |
| **Ours** | **13.059** | **0.358** | **0.556** |

Low-altitude evaluation에서 facade detail 차이가 크게 난다.

### Visual Quality (GoogleEarth)

| 모델 | PSNR ↑ | SSIM ↑ | LPIPS ↓ |
|------|--------|--------|---------|
| Skyfall-GS | 12.282 | 0.229 | 0.521 |
| **Ours** | **12.770** | **0.253** | 0.546 |

PSNR/SSIM은 최고 수준이고, LPIPS는 Skyfall-GS보다 약간 불리하지만 전체적으로 가장 균형 잡힌 성능을 보인다. GoogleEarth는 high-altitude test view 비중이 커서 facade texture 우위가 DFC 2019보다 덜 두드러진다.

### Remote Sensing Baseline 비교 (DFC 2019)

| 모델 | PSNR ↑ | SSIM ↑ | LPIPS ↓ |
|------|--------|--------|---------|
| EOGS | 7.338 | 0.181 | 0.931 |
| Sat-NeRF | 10.220 | 0.278 | 0.816 |
| **Ours** | **13.059** | **0.358** | **0.556** |

단순 DSM/elevation 지향 방식보다, 이 논문 방식이 ground-view visual fidelity에 훨씬 유리하다.

### Ablation

- Naive Marching Cubes 128/256은 F1이 각각 0.279/0.412로, Full Modeling의 0.643보다 크게 낮다
- Image restoration network를 제거하면 PSNR이 17.153 → 17.038로 감소한다. 숫자 차이는 작아 보이지만 figure에서 blur와 inconsistent texture artifact가 확실히 커진다

즉, 이 논문의 성능은 단순히 "좋은 texture network 하나" 때문이 아니라, 2.5D geometry prior + deterministic appearance restoration의 결합에서 나온다.

## 결론 및 시사점

핵심 기여는 satellite-only, sparse-view, minimal-parallax setting에서도 city를 2.5D structural prior로 먼저 안정적으로 reconstruct한 뒤, generative restoration으로 appearance를 refine하면 기존 NeRF/3DGS 계열이 실패하던 orbit-to-ground viewpoint extrapolation을 상당 수준 해결할 수 있다는 것이다.

remote sensing의 metric DSM tradition과 graphics/CV의 photorealistic novel view synthesis를 이어주는 매우 실용적인 bridge다. 산업적으로는 city-scale 3D reconstruction, digital twin, simulation, true orthophoto/mesh asset generation과 직접 맞닿아 있다. 특히 "satellite에서는 facade를 직접 복원하기 어렵다"는 현실을 인정하고, 이를 완전 자유 3D로 우기지 않고 urban prior 기반 constrained representation으로 푼다는 발상이 인상적이다.

다만 limitation도 분명하다. Bridge, overpass 같은 non-monotonic structure는 구조적으로 취약하고, appearance는 사실성보다 plausibility를 우선할 수 있다. 
