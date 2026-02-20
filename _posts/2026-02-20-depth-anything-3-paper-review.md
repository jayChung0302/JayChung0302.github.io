---
layout: post
toc: true
math: true
title: "Depth Anything 3 논문 리뷰 — Single ViT로 Pose + Geometry를 Unified한 Foundation Model"
description: "Depth Anything 3 논문 리뷰. Depth-Ray Representation과 단일 ViT backbone으로 Pose, Reconstruction, NVS를 통합한 3D vision foundation model 분석."
categories: research
tags:
  - depth-estimation
  - paper-review
  - multi-view
  - transformer
  - 3dgs
  - foundation-model
author: Nate
---

Depth Anything 시리즈의 세 번째 논문, **Depth Anything 3 (DA3)** 리뷰다. 이전 시리즈가 monocular depth estimation에 집중했다면, DA3는 거기서 한 발 더 나아가 pose estimation, 3D reconstruction, novel view synthesis까지 단일 모델로 통합하는 것을 목표로 한다.

가장 인상적인 점은 이 모든 것을 복잡한 multi-transformer stack 없이, **plain pretrained ViT 하나로** 달성했다는 것이다.

## 핵심 용어 정리

### Depth-Ray Representation

각 pixel에 대해 **Depth $D(u,v)$** 와 **Ray $r = (t, d)$** 를 예측하는 표현 방식.

- $t$: camera origin (3D translation)
- $d$: world-frame ray direction (unnormalized)

이 두 값의 조합으로 3D point를 직접 복원할 수 있다:

$$P = t + D(u, v) \cdot d$$

Pose와 geometry를 동시에 표현하는 minimal target이다. Point map만 예측하는 DUSt3R, depth + pose + point map을 모두 예측하는 VGGT 와 달리, depth-ray 조합이 표현력과 단순성을 동시에 만족하는 sweetspot임을 ablation으로 증명한다.

### Input-Adaptive Cross-View Self-Attention

Single transformer 내부에서 **token rearrangement**를 통해 multi-view 간 attention을 수행하는 방식. 별도 multi-branch architecture나 view-specific module 없이 arbitrary한 view 수를 처리할 수 있다.

### Dual-DPT Head

하나의 backbone feature를 공유한 뒤, **Depth branch**와 **Ray branch**로 나누어 최종 prediction을 수행하는 dense prediction head. 중간 representation을 공유하면서도 두 task 간 entanglement를 최소화한다.

### Teacher-Student Paradigm

Synthetic data로만 학습한 monocular teacher가 pseudo-depth를 생성하고, 이를 real-world noisy depth와 **RANSAC scale-shift alignment**하여 student를 학습시키는 구조. Real-world depth의 sparse/noisy/misaligned 특성을 우회하는 핵심 전략이다.

### Visual Geometry Benchmark

Pose AUC (RRA, RTA 기반) + Reconstruction F1/CD + Rendering (PSNR, SSIM, LPIPS)를 통합하는 평가 체계. 총 89+ scenes, 5개 dataset으로 구성되어, 단일 metric이 아니라 3D vision의 전 측면을 평가한다.

## 연구 배경 및 문제 정의

기존 3D vision pipeline은 task 단위로 분리되어 있다.

- Monocular Depth Estimation
- SfM (Structure from Motion)
- MVS (Multi-View Stereo)
- SLAM
- NVS (Novel View Synthesis)

각각을 위한 specialized architecture가 따로 존재하고, 이로 인해 복잡한 multi-stage 설계, joint multi-task optimization의 어려움, pretrained backbone 활용의 제약, arbitrary view cardinality 대응의 한계가 생긴다.

최근 SOTA인 VGGT, Pi3 등도 이 문제에서 자유롭지 않다. Redundant prediction targets, 복잡한 multi-transformer stack, architecture-heavy design이 공통적인 약점이다.

저자들이 던지는 핵심 질문은 두 가지다:

> 정말 multi-task target이 필요한가?
> 단일 plain transformer로 충분하지 않은가?

DA3의 답은 둘 다 "Yes"다. Depth-ray 조합이 충분한 표현력을 가지며, 단일 ViT backbone으로 SOTA를 달성할 수 있다는 것을 실험으로 보인다.

## 제안 방법론

### 1. Minimal Prediction Target: Depth + Ray

기존 접근들의 문제:

- **DUSt3R**: point map만 예측 → cross-view consistency 부족
- **VGGT**: depth + pose + point map을 모두 예측 → redundancy로 인한 entanglement

DA3의 ablation (Table 6)은 여러 target 조합을 비교한다:

| Target | 성능 |
|--------|------|
| depth + cam | 낮음 |
| depth + pcd + cam | 중간 |
| **depth + ray** | **최고** |
| depth + ray + cam | depth + ray와 거의 동일 |

결론: depth + ray 조합이 전 dataset에서 가장 우수하고, camera head를 추가해도 성능 향상이 없으므로 optional한 convenience 정도다. Depth-ray가 minimal하면서도 sufficient한 representation임을 보여준다.

### 2. Single Transformer Backbone

DA3의 backbone은 vanilla **DINOv2 ViT** 하나다. 일부 layer에서 cross-view attention을 수행하며, self-attention layer와 cross-view attention layer의 비율은 $L_s : L_g = 2 : 1$이다.

VGGT-style의 2-transformer stack과 비교한 ablation (Table 7):

> VGGT-style stack → 제안 arch 대비 79.8% 수준으로 하락

원인 분석:

- Full pretrained backbone을 온전히 활용하는가
- Architecture의 단순성이 오히려 학습 안정성을 높임
- Partial alternation 전략이 가장 robust함

Architecture의 복잡함이 성능을 보장하지 않는다는 것을 보여주는 결과다.

### 3. Teacher-Student Learning

Real-world depth 데이터의 현실:

- **Sparse**: 픽셀 대부분이 missing
- **Noisy**: 센서 오류, 반사, 투명 표면
- **Misaligned**: multi-modal 수집 과정의 temporal offset

DA3의 해결책:

1. Synthetic-only 데이터로 monocular **teacher** 학습 (exponential depth + distance-weighted normal loss 사용)
2. Teacher가 real image에 **pseudo-depth 생성**
3. Pseudo-depth와 real sparse depth를 **RANSAC scale-shift alignment**
4. Aligned supervision으로 **student** 학습

Ablation에서 teacher supervision을 제거하면 HiRoom, ScanNet++에서 성능이 급락하고 fine detail 복원력이 크게 감소한다. Synthetic scaling → real-world generalization의 핵심 경로임을 확인한다.

Teacher 모델 설계에서도 선택이 있었다:
- Disparity-based보다 **depth-based geometry**가 우수
- **Exponential depth encoding**이 scale-invariance에 유리

### 4. Feed-Forward 3D Gaussian Splatting

DA3 backbone + **GS-DPT head**의 조합으로 3DGS 파라미터를 feed-forward로 직접 예측한다:

- $\sigma$: opacity
- $q$: rotation quaternion
- $s$: scale
- $c$: RGB

결과 (Table 5, DL3DV PSNR):

| Model | PSNR |
|-------|------|
| VGGT | 20.96 |
| **DA3** | **21.33** |

Out-of-domain 데이터셋 (Tanks & Temples, MegaDepth)에서도 SOTA를 기록한다. 논문이 강조하는 인사이트: **NVS 성능은 geometry estimation 능력과 강한 상관관계를 가진다.** Geometry foundation model이 강하면 rendering quality도 올라간다.

## 핵심 결과 요약

### Pose Accuracy (Table 2)

DA3-Giant는 모든 dataset에서 SOTA를 기록한다. 특히 ScanNet++에서 33% relative gain, 평균적으로 VGGT 대비 35.7% pose accuracy 향상이다.

### Reconstruction (Table 3)

DA3-Giant는 평균적으로 VGGT 대비 25.1% 향상이다. Pose-free setting에서도 dominant하며, Large (0.36B) 모델조차 1.19B 규모의 VGGT를 다수 setting에서 초과한다. Parameter efficiency가 인상적이다.

### Monocular Depth (Table 4)

| Model | δ1 |
|-------|----|
| DA2 | 94.6 |
| DA3 | 95.3 |
| Teacher | 97.2 |

Multi-task 통합 이후에도 monocular depth estimation 자체의 성능이 유지되고 개선된다.

### Metric Depth (Table 11)

ETH3D 기준:

| Model | δ1 |
|-------|----|
| UniDepthv2 | 0.863 |
| **DA3-metric** | **0.917** |

큰 격차다.

### Efficiency (Table 8)

DA3-Large는 **78 FPS**, **1500+ images** 처리 가능하다. Scaling efficiency가 매우 우수해서 large-scale scene에서도 실용적이다.

## 결론 및 시사점

DA3가 증명하는 것:

1. **Depth-ray representation**은 pose + geometry를 unified하게 표현하는 minimal target이다.
2. 복잡한 multi-transformer 설계 없이도, **single pretrained ViT backbone**으로 SOTA 달성이 가능하다.
3. **Teacher-student + synthetic scaling**이 real-world geometry generalization에 결정적이다.
4. 강력한 geometry foundation model은 **3DGS 기반 FF-NVS 성능을 직접적으로 향상**시킨다.

학문적 시사점은 두 가지가 특히 중요해 보인다.

**Representation choice가 architecture보다 더 중요할 수 있다.** 이 논문의 핵심 contribution은 새로운 architecture가 아니라, depth-ray라는 target 선택이다. 무엇을 예측하게 할 것인가가 어떻게 예측할 것인가보다 앞선다.

**Ray-based formulation이 pose regression보다 stable하다.** Pose를 직접 regression하는 것보다, ray direction으로 parameterize하는 것이 optimization landscape 측면에서 유리하다. 이는 최근 다른 geometry 논문들의 흐름과도 맞닿아 있다.

산업적 측면에서 이 모델은 multi-view 3D reconstruction, SLAM, 3DGS rendering, AR/VR spatial mapping 모두에 적용 가능한 universal backbone 역할을 한다. 특히 feed-forward 3DGS에서 강력한 geometry prior가 rendering quality를 직접적으로 좌우한다는 점은, 향후 real-time spatial AI 시스템 설계에서 geometry estimation을 핵심 모듈로 두어야 함을 시사한다.

---

ShadowGS가 "shadow라는 physical signal을 제대로 쓰면 geometry가 좋아진다"를 보여줬다면, DA3는 "geometry를 제대로 표현하면 downstream task 전부가 좋아진다"를 보여준다. 두 논문 모두 결국 geometry representation에 대한 근본적인 질문을 다루고 있다는 점에서, 3D vision의 흐름이 어디로 가는지 잘 보여주는 쌍이다.
