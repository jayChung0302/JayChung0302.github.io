---
layout: post
toc: true
title: "EOGS 논문 리뷰 — 3D Gaussian Splatting을 Satellite Photogrammetry에 적용"
categories: misc
tags:
  - computer-vision
  - 3d-gaussian-splatting
  - paper-review
  - remote-sensing
author: Nate
---

## 들어가며

EO-NeRF가 satellite DSM 품질에서는 최고 수준이라는 건 이미 입증된 사실이다. 하지만 training time이 수 시간에서 수십 시간이 걸린다는 건, national-scale 처리를 생각하면 현실적이지 않다.

EOGS는 이 문제를 정면으로 건드린다. 3D Gaussian Splatting을 satellite photogrammetry에 본격 적용해서, EO-NeRF 수준의 DSM accuracy를 유지하면서 속도를 약 300배 끌어올린 논문이다. 단순히 "GS를 satellite에 써봤다"가 아니라, representation과 loss 설계를 remote sensing에 맞게 근본적으로 다시 짠 점이 인상적이었다.

## 핵심 용어 정리

### EOGS (Earth-Observation Gaussian Splatting)

3D Gaussian Splatting을 satellite photogrammetry에 최초로 본격 적용한 framework다. DSM(Digital Surface Model)과 appearance를 수 분 내로 추정하는 것이 목표다.

### Affine Camera Approximation

RPC 기반 pushbroom satellite camera를 per-scene affine camera로 근사하는 설계다. 이 근사 덕분에 splatting 연산과의 호환성과 계산 효율을 동시에 확보한다.

### Shadow Mapping (Affine Sun Camera)

EO-NeRF의 ray-marching shadow 대신, graphics 기반 shadow mapping을 Gaussian splatting에 맞게 재정의한 방식이다. Ray-marching 없이 pure splatting만으로 shadow를 처리한다.

### Elevation Render

Depth가 아닌 실제 고도(meter)를 직접 splatting으로 렌더링하는 representation이다. DSM 평가와 shadow 판단의 기준이 된다.

### Regularization Trio

3DGS가 갖는 약한 implicit regularization을 보완하기 위해 도입된 3가지 핵심 loss — Sparsity, View Consistency, Opaqueness — 를 묶어서 부르는 표현이다.

## 연구 배경 및 문제 정의

이 논문의 문제의식은 매우 명확하다.

**EO-NeRF의 한계:**
- Shadow-aware geometry 덕분에 satellite DSM 품질은 최고 수준
- 하지만 NeRF 기반이라 training time이 수 시간~수십 시간
- 대규모 AOI, national-scale 처리에는 비현실적

**3DGS의 한계:**
- 학습과 렌더링이 수백 배 빠르지만, remote sensing에 필요한 요소가 빠져 있음
  - RPC / pushbroom camera 미지원
  - Multi-date shadow 미처리
  - Radiometric inconsistency
  - Sparse-view instability

> 핵심 질문: "EO-NeRF 수준의 DSM accuracy를 유지하면서, satellite-scale에서 실용적인 속도를 달성할 수 있는가?"

EOGS는 이 질문에 "Yes, but representation과 loss를 바꿔야 한다"고 답한다.

## 제안 방법론

### RPC → Affine Camera Approximation

World → UTM → LonLatAlt → RPC → Image → NDC, 이 전체 변환을 per-scene affine transform으로 근사한다. 평균 reprojection error가 약 0.012 pixels 수준이니 실용적으로 충분하다.

이 선택이 가져오는 효과:
- 3DGS의 splatting formulation과 완전히 호환
- Local Jacobian approximation 불필요

사실상 EOGS 전체를 가능하게 만든 1번 설계 포인트다. 이 근사가 성립하지 않았으면 나머지 설계도 의미가 없었을 것이다.

### Elevation-based Shadow Mapping

EO-NeRF는 surface point에서 sun direction으로 ray-marching해서 shadow를 판단한다. NeRF라서 가능한 방식이고, GS에서는 비효율적이다.

EOGS는 다른 접근을 취한다:

1. **Sun camera(Affine)를 정의**
2. Satellite view A에서의 pixel u에 대해 elevation $E_A(u)$를 렌더
3. 동일 3D point를 Sun camera S로 project
4. Resampled sun elevation $E_S(\tilde{u})$와 비교
5. $\Delta h = E_S - E_A$
6. $\Delta h > 0$ → occluded → shadow

Shadow coefficient는 다음과 같이 정의된다:

$$s(u) = \min(\exp(-\rho \cdot \Delta h), 1)$$

Pure splatting 기반 shadow이고, ray-marching이 전혀 없다. GS의 locality 가정을 깨지 않으면서 shadow를 처리한다는 점에서 깔끔한 설계다.

### Image Formation Model

EO-NeRF와 호환되는 image formation model을 구성한다:

- **Intrinsic color** $f_k$
- **Camera-specific affine color correction** $\phi_A$
- **Ambient light** $\psi_A$
- **Shadow coefficient** $s_{A,S}$

Albedo render는 shadow와 color correction을 제거한 형태로 분리 정의된다.

### Regularization — 이 논문의 진짜 핵심

논문에서 가장 중요한 부분은 **3DGS는 regularization이 부족하다**는 통찰이다.

#### (a) Sparsity (Opacity L1)

$$L_o = \frac{1}{K} \sum \alpha_k$$

LASSO 스타일로, $\alpha < \alpha_{min}$인 Gaussian을 제거한다. 최대 2배 training speedup이 가능하다. Densification 없이 "많이 깔고 줄이기" 전략을 취한다는 점이 특징이다.

#### (b) View Consistency (Local Reprojection)

Camera A를 약간 perturb해서 B를 만들고, 동일 3D point라면 albedo와 elevation이 일치해야 한다는 제약을 건다. Sparse-view satellite 환경에 매우 잘 맞는 제약이다.

#### (c) Opaqueness (Shadow Entropy Penalty)

$$L_s = \sum H(s(u))$$

Shadow는 0 또는 1이어야 한다. Semi-transparent shadow는 geometry misuse의 신호다. 이 loss를 통해 EO-NeRF에서 보이던 "texture가 shadow에 박히는" 현상을 제거하고 hard surface를 유도한다.

이 loss는 ShadowGS의 Shadow Consistency Constraint의 전신이라고 봐도 무방하다.

## 핵심 결과

### DSM MAE (DFC2019 + IARPA)

| Method | DSM MAE | Training Time |
|--------|---------|---------------|
| EO-NeRF | ~1.35 m | 15 hours |
| EOGS | ~1.46 m | **3 minutes** |

약 300배 빠르면서 accuracy는 거의 동일하다. Foliage mask를 적용하면 거의 같은 수준이고, building 같은 structural object에서는 오히려 EOGS가 우세하다.

### Ablation 결과

| Component | MAE 개선 |
|-----------|----------|
| Shadow mapping | **-3.16 m** |
| View consistency | -0.20 m |
| Opaqueness | -0.09 m |
| Sparsity | -0.04 m (+속도 개선) |

Shadow mapping의 기여가 압도적이다. Shadow가 단순한 rendering effect가 아니라 geometry constraint라는 점을 숫자로 보여준다.

### Coverage 분석

- High visibility 영역: EOGS > EO-NeRF
- Low visibility 영역: EOGS 취약

Low visibility 영역에서의 한계는 향후 개선 포인트로 남아 있다.

## 결론 및 시사점

EOGS는 단순한 "GS 적용 논문"이 아니다.

- 3D Gaussian Splatting이 satellite photogrammetry에 실제로 쓸 수 있음을 증명
- EO-NeRF의 핵심 아이디어(shadow, physics)를 GS-friendly formulation으로 재구성
- DSM / True Orthophoto / Large-scale AOI 파이프라인의 현실적 출발점을 제시

### 중요한 시사점

- **Affine camera 근사 + GS는 national-scale에서도 유효**하다
- **Shadow는 rendering effect가 아니라 geometry constraint**다
- 3DGS 계열은 shadow consistency, view consistency, opacity pressure 같은 explicit loss 없이는 remote sensing에 불완전하다

ShadowGS는 사실상 EOGS의 "physics & geometry 강화 버전"이며, EOGS → ShadowGS는 매우 자연스러운 진화 경로다.

> 한 줄 정리: EOGS는 3DGS를 satellite photogrammetry에 적용하기 위해 camera model, shadow, regularization을 근본부터 재설계하고, EO-NeRF 대비 300배 빠른 속도에 거의 동등한 DSM accuracy를 달성했다.
