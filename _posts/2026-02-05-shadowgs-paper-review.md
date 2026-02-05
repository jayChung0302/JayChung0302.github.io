---
layout: post
toc: true
title: "ShadowGS 논문 리뷰 — Shadow를 Geometry Signal로 재정의한 Satellite 3DGS"
categories: research
tags:
  - 3dgs
  - satellite
  - paper-review
  - remote-sensing
  - shadow
author: Nate
---

Satellite 3DGS 계열 논문 리뷰 시리즈의 세 번째다. [EOGS]({% post_url 2024-10-01-eogs-paper-review %}), [EOGS++]({% post_url 2025-12-30-eogs-plus-plus-review %})에 이어 **ShadowGS: Shadow-Aware 3D Gaussian Splatting for Satellite Imagery**를 다룬다.

EOGS가 "3DGS를 satellite에 적용할 수 있다"를 증명했고, EOGS++가 "end-to-end pipeline이 가능하다"를 보여줬다면, ShadowGS는 한 단계 더 나아가 "shadow를 단순한 nuisance가 아니라 geometry를 constraining하는 물리적 signal로 보는" 논문이다.

## 핵심 용어 정리

### 3D Gaussian Splatting (3DGS)

장면을 continuous field(NeRF) 대신 anisotropic 3D Gaussian primitive 집합으로 표현하고, rasterization 기반으로 rendering하는 방식. 빠른 학습과 실시간 rendering이 장점.

### Shadow Consistency Constraint

Satellite view direction과 sun direction이 collinear할 때, shadow는 self-occluded 되어야 한다는 물리적 성질을 이용한 geometry regularization loss. 이 논문의 핵심

### Physics-based Rendering Equation (Remote Sensing)

Direct sunlight, skylight, near-surface reflection을 명시적으로 분리해 모델링하는 rendering equation. Shadow region에서도 albedo 복원이 가능함.

### Ray-marching-based Shadow Computation

Rasterization의 한계를 넘기 위해, Gaussian center에서 sun direction으로 ray를 쏘아 BVH(Bounding Volume Hierarchy) 기반으로 occlusion을 계산하는 shadow 모델링 방식.

### Shadow Map Prior (FDRNet)

Sparse-view 환경에서 pre-trained shadow detection network의 output을 supervision signal로 사용하는 geometry/illumination 안정화 기법.

## 연구 배경 및 문제 정의

이 논문이 다루는 핵심 문제는 **multi-temporal satellite imagery에서 shadow inconsistency가 3D reconstruction과 novel view synthesis를 심각하게 저해한다**는 점이다.

Satellite imagery의 근본적 특성:

- Acquisition time이 다르고
- Sun elevation / azimuth가 계속 변하며
- 동일 geometry 위에 서로 다른 shadow pattern이 얹힌다

이 상황에서 기존 방법론들의 한계:

**MVS 계열** — 동시 촬영 가정을 깔고 있어 appearance variation에 취약

**NeRF 계열 (S-NeRF, SatNeRF, EO-NeRF):**
- Shadow를 implicit하게 다루거나
- Geometry–shadow coupling이 약해
- Shadow 정보가 density / geometry에 entangle됨

**3DGS 계열 (EOGS, SatGS):**
- Rasterization 특성상 global illumination 효과(특히 shadow)를 정확히 모델링하기 어려움
- Shadow mapping은 aliasing / approximation 문제가 존재

> 핵심 질문: "Shadow를 geometry-consistent하게 분리·모델링하면서도, 3DGS의 효율성을 유지할 수 있는가?"

## 제안 방법론

ShadowGS는 기존 3DGS 위에 **3개의 핵심 축**을 추가한다.

### 1. Geometry: Depth & Normal with Ray–Gaussian Intersection

RaDe-GS 계열을 따라 explicit depth / normal을 Gaussian 단위로 정의한다. Ray–Gaussian intersection으로 pixel-wise depth $d$와 normal $\mathbf{n}$을 계산하고, **Depth–Normal Consistency Loss**로 surface coherence를 강화한다.

이전 EOGS에서는 elevation rendering만으로 geometry를 표현했는데, ShadowGS는 normal까지 명시적으로 다루면서 surface quality가 한 단계 올라간다.

### 2. Illumination-aware Rendering Equation

Illumination을 다음처럼 분해함:

- **Direct sunlight** $S_{sun}$: ray marching으로 계산
- **Skylight** $L_{sky}$: global low-order SH
- **Near-surface reflection** $L_n$: per-Gaussian SH
- **Albedo** $F$: per-Gaussian SH

최종 rendering:

$$L_{total} = S_{sun} + (1 - S_{sun}) \cdot (L_{sky} + L_n)$$

$$C = F \cdot L_{total}$$

Shadow region($S_{sun} \approx 0$)에서도 skylight + near-surface reflection이 남아 있으므로 **albedo가 붕괴되지 않는다**. EO-NeRF에서 shadow 영역의 texture가 albedo에 박히는 문제가 있었는데, 이 formulation이 그 문제를 구조적으로 해결한다.

### 3. Ray-marching-based Shadow Modeling

EOGS의 shadow mapping은 pure splatting 기반이라 효율적이었지만, aliasing과 approximation 한계가 있었다. ShadowGS는 다른 접근을 취한다:

1. Gaussian center에서 sun direction으로 ray cast
2. BVH + fixed step ray marching
3. 각 intersected Gaussian의 response로 solar visibility $S_{sun}$ 계산
4. Rasterization 이후 physics-based equation에 결합

Rasterization의 효율성은 유지하면서, shadow 계산만 ray-marching으로 전환한 hybrid 설계다.

### 4. Shadow Consistency Constraint

이 논문의 핵심 아이디어다.

물리적 관찰: **View direction이 sun direction과 평행(collinear)하면, shadow는 관측 불가능하다.** 태양 방향에서 바라보면 모든 shadow는 self-occluded 되기 때문이다.

이때 rendered shadow map $S_v$는 all-ones가 되어야 한다:

$$\mathcal{L}_{S1} = \|S_v - \mathbf{1}\|_1$$

이 단순한 loss가 가져오는 효과가 강력하다:

- **Opacity를 surface에 밀착**시킴
- **Floating Gaussian 제거**
- **Geometry sharpness 대폭 개선**

EOGS의 Opaqueness Loss($L_s = \sum H(s(u))$)가 shadow의 binary 성질을 entropy로 강제했다면, ShadowGS의 Shadow Consistency Constraint는 그 아이디어를 **물리적 원리로 일반화**한 것이다. Shadow의 존재/부재를 view–sun geometry 관계로부터 직접 유도한다는 점에서 더 근본적이다.

### 5. Sparse-view: Shadow Map Prior

Sparse-view 환경에서의 추가 안정화 기법:

- FDRNet shadow mask를 BCE loss로 supervision
- Vegetation 영역은 NDVI / DEVI로 제외
- Densification 이후에는 off (false positive 방지)

View 수가 충분하면 shadow prior는 오히려 noise가 된다는 점을 논문에서 명확히 분석하고 있다. Prior를 무조건 쓰는 게 아니라 **언제 꺼야 하는지까지 설계**한 점이 실용적이다.

## 핵심 결과

### Multi-view (DFC2019 + IARPA)

| Metric | ShadowGS 개선 폭 |
|--------|------------------|
| DSM MAE | ~0.62 m 개선 (DFC2019 기준) |
| Novel View PSNR | +2.93 dB (DFC2019), +1.18 dB (IARPA, vs EOGS) |
| Shadow BER | 거의 절반 수준 감소 |
| Shadow ACC | 최고 성능 |

### Sparse-view

EO-NeRF / EOGS 대비 큰 폭으로 우수. Shadow prior 사용 시 MAE 추가 감소. 다만 view 수가 많아지면 shadow prior는 오히려 noise가 됨.

### Ablation — 각 component의 기여

| Component | 주요 효과 |
|-----------|-----------|
| Depth–Normal | MAE −1.50 m |
| Rendering Equation | PSNR +5.93 dB |
| Shadow Consistency | MAE −0.70 m (결정적) |

Rendering equation의 PSNR 기여가 가장 크고, geometry 관점에서는 Shadow Consistency Constraint가 결정적이다. 학습 시간은 AOI당 약 10분으로, EOGS의 효율성을 크게 훼손하지 않으면서 성능을 끌어올렸다.

## EOGS → EOGS++ → ShadowGS 진화 경로 정리

| | EOGS | EOGS++ | ShadowGS |
|---|------|--------|----------|
| Shadow | Splatting-based shadow mapping | 동일 | Ray-marching + physics-based |
| Geometry | Elevation render | + TSDF post-processing | + Explicit depth/normal |
| Camera | Affine approximation | + Internal BA | Affine approximation |
| Core Loss | Opaqueness entropy | + Opacity reset | Shadow Consistency Constraint |
| Input | Pansharpened | PAN-only 가능 | Pansharpened |
| DSM MAE | ~1.46 m | ~1.19 m | ~0.84 m (DFC2019) |

세 논문이 각각 다른 축을 강화했다. EOGS는 feasibility, EOGS++는 pipeline completeness, ShadowGS는 physics-based accuracy.

## 결론 및 시사점

ShadowGS의 핵심 성과:

1. **3DGS의 rasterization 한계를 ray-marching + physics-based rendering으로 보완** — hybrid 설계가 효율성과 정확성을 동시에 확보
2. **Shadow–Geometry coupling을 loss level에서 강제** — Shadow Consistency Constraint는 단순하지만 효과가 압도적
3. **Multi-temporal satellite imagery에서** 더 정확한 DSM, 더 일관된 albedo, relightable / controllable shadow rendering 달성

개인적으로 가장 인상적인 부분은 Shadow Consistency Constraint의 설계다. "태양 방향에서 보면 shadow가 안 보인다"는 너무나 당연한 물리적 사실을 loss로 formalize한 것인데, 이 하나의 constraint가 floating Gaussian 제거, geometry sharpening, opacity 안정화를 동시에 달성한다. 좋은 inductive bias란 이런 것이다.

향후 확장 가능성:
- Seasonal appearance modeling
- Land-cover change disentanglement
- True orthophoto / DSM / 3D city pipeline

3D Gaussian Splatting을 remote sensing inverse rendering으로 확장하는 데 있어 중요한 기준점이 되는 논문이다.
