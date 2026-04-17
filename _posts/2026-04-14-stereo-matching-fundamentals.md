---
layout: post
toc: true
math: true
title: "스테레오 매칭(Stereo Matching) 기초 — 두 영상에서 깊이를 복원하는 원리"
description: "스테레오 매칭의 전체 파이프라인을 단계별로 정리한다. 이미지 보정, 비용 계산, 비용 집계, 시차 최적화, 시차 보정까지의 흐름과 각 단계의 핵심 난점을 다룬다."
categories: misc
tags:
  - computer-vision
  - stereo-matching
  - 3d-reconstruction
  - depth-estimation
author: Nate
---

## 스테레오 매칭이란 무엇인가

스테레오 매칭은 서로 약간 다른 위치에서 촬영된 두 장의 이미지를 이용해 장면의 깊이 정보를 추정하는 기술이다. 같은 물체라도 관측 위치가 다르면 영상 위에 맺히는 위치가 조금 달라지는데, 이 위치 차이를 이용하면 물체가 카메라로부터 얼마나 떨어져 있는지 계산할 수 있다.

인간이 두 눈으로 거리감을 느끼는 원리와 거의 같다. 왼쪽 눈과 오른쪽 눈은 약간 떨어져 있으므로 같은 물체를 보더라도 망막에 맺히는 위치가 조금 다르고, 뇌는 이 차이를 이용해 입체감을 복원한다. 스테레오 비전도 본질적으로 같은 문제를 수학적으로 푸는 것이다.

그런데 실제 계산은 그렇게 단순하지 않다. "왼쪽 영상의 이 점이 오른쪽 영상의 어디에 대응하는가?"를 정확히 찾는 일이 매우 어렵기 때문이다. 비슷한 텍스처가 반복될 수도 있고, 한쪽에서는 보이지만 다른 쪽에서는 가려질 수도 있고, 조명이 달라질 수도 있다. 그래서 스테레오 매칭은 보통 다음과 같은 단계적 처리 파이프라인으로 구성된다.

## 1. 이미지 보정 (Image Rectification)

**에피폴라 기하(Epipolar Geometry)**에 의해, 왼쪽 이미지의 한 점에 대응하는 오른쪽 점은 특정 선(에피폴라 라인) 위에 존재한다. 하지만 실제 카메라는 완벽히 정렬되어 있지 않으므로 이 선이 기울어져 있다. 이미지 보정은 카메라 캘리브레이션 정보(intrinsic/extrinsic)를 이용해 **에피폴라 라인을 수평으로 정렬**하는 전처리다.

보정 후에는 왼쪽 점 $(x_L, y)$의 대응점이 오른쪽 같은 행 $(x_R, y)$에 있으므로, 시차는 $d = x_L - x_R$로 단순화된다. 2차원 탐색이 1차원으로 줄어드는 것이 핵심이다. 보정이 부정확하면 이후 전체 파이프라인이 흔들리므로, 캘리브레이션 품질이 스테레오 매칭 성능의 기반이다.

## 2. 비용 계산 (Cost Computation)

각 픽셀 $(x, y)$와 시차 후보 $d$마다 "이 시차가 얼마나 그럴듯한가"를 점수화한 **cost volume** $C(x, y, d)$를 만드는 단계다.

대표적인 비용 함수는 다음과 같다.

- **SAD** — 패치 간 밝기 차이 절대값의 합. $\text{SAD}(p, d) = \sum_{q \in W(p)} \lvert I_L(q) - I_R(q - d) \rvert$. 빠르지만 조명 변화에 민감하다.
- **NCC** — 정규화된 상호상관. 평균/분산을 정규화하므로 밝기 스케일 변화에 강인하다.
- **Census Transform** — 주변 픽셀과의 상대적 밝기 관계를 비트열로 인코딩해 해밍 거리로 비교한다. 조명 변화에 강해 실전에서 가장 많이 사용된다.

비용 계산만으로는 텍스처 없는 영역, 반복 패턴, 가려짐(occlusion) 등에서 정답을 결정하기 어렵다.

## 3. 비용 집계 (Cost Aggregation)

개별 픽셀의 비용은 노이즈에 취약하므로, 주변 윈도우의 비용을 모아 안정화한다. 단순 박스 윈도우:

$$\tilde{C}(x, y, d) = \sum_{(u,v) \in W(x,y)} C(u, v, d)$$

단순 평균은 물체 경계에서 서로 다른 깊이가 섞이는 문제가 있다. 이를 완화하기 위해 **Bilateral/Guided Filter**(공간 거리 + 색 차이 동시 고려), **Cross-based aggregation**(비슷한 색 영역 안에서만 적응적 집계) 등이 사용된다. 본질은 **local evidence를 neighborhood context로 보강하는 과정**이다.

## 4. 시차 최적화 (Disparity Optimization)

각 픽셀마다 최종 시차를 선택하는 단계다. 가장 단순한 **WTA(Winner-Takes-All)**는 $d^*(x, y) = \arg\min_d \tilde{C}(x, y, d)$로, 빠르지만 픽셀 간 일관성이 없다.

현실 깊이는 공간적으로 매끄러우므로, 에너지 최소화로 정식화한다.

$$E(D) = \sum_p C(p, D_p) + \sum_{(p,q) \in \mathcal{N}} P(D_p, D_q)$$

첫 항은 영상 증거와의 적합도(data term), 둘째 항은 이웃 시차 차이에 대한 패널티(smoothness term)다.

**SGBM(Semi-Global Block Matching)**은 여러 방향에서 경로를 따라 비용을 누적하는 준전역적 방법으로, 완전한 global optimization(Graph Cuts, Belief Propagation 등)보다 가볍고 실전에서 가장 많이 쓰인다(OpenCV 기본 제공). 다만 smoothness를 강하게 걸면 경계가 뭉개지고, 약하게 걸면 노이즈가 남는 trade-off는 피할 수 없다.

## 5. 시차 보정 (Disparity Refinement)

최적화 후에도 경계 오류, 점 잡음, 정수 해상도 한계 등이 남으므로 후처리로 다듬는다.

- **좌우 일관성 검사** — 왼쪽/오른쪽 기준 disparity map을 서로 비교해 불일치 픽셀(occlusion 또는 오매칭)을 invalid 처리
- **서브픽셀 추정** — 최적 시차 주변 비용 곡선의 포물선 보간으로 소수점 단위 시차를 복원. $Z = \frac{fB}{d}$이므로 시차 오차가 깊이 오차로 비선형 증폭된다
- **Median filtering** — 점 형태 이상치 제거. 평균 필터보다 경계 보존이 좋다
- **홀 채우기** — invalid 영역을 주변 신뢰도 높은 값으로 보간

## 시차(Disparity)와 깊이(Depth)의 관계

시차 $d = x_L - x_R$와 깊이 $Z$는 다음 관계를 가진다.

$$Z = \frac{f \cdot B}{d}$$

$f$는 초점거리, $B$는 베이스라인이다. 시차가 크면 가깝고, 작으면 멀다. 역수 관계이므로 먼 물체일수록 시차 오차가 깊이 오차로 크게 증폭된다. 베이스라인을 늘리면 분해능이 좋아지지만 occlusion이 심해지고, 초점거리를 늘리면 정밀도가 올라가지만 시야각이 좁아진다.

## 딥러닝 기반 스테레오 매칭

앞에서 정리한 전통적 파이프라인(비용 계산 → 집계 → 최적화 → 보정)은 각 단계가 hand-crafted feature와 heuristic에 의존한다. 딥러닝은 이 파이프라인의 일부 또는 전체를 학습 가능한 구조로 대체한다.

### Feature Extraction의 역할

전통 방식의 비용 계산은 SAD, NCC, Census 같은 hand-crafted descriptor로 픽셀 유사도를 측정했다. 딥러닝 기반 방법은 CNN이나 Transformer로 각 픽셀의 **feature descriptor를 학습**한다. 학습된 feature는 조명 변화, 반사, 약한 텍스처 등 hand-crafted descriptor가 취약한 상황에서도 더 강인한 매칭 단서를 제공한다.

대표적 구조로 **[DispNetC](https://arxiv.org/abs/1512.02134)**, **[GC-Net](https://arxiv.org/abs/1703.04309)**, **[PSMNet](https://arxiv.org/abs/1803.08669)** 등이 있다. 이들은 좌우 영상에서 각각 feature map을 추출한 뒤, 시차 후보마다 feature를 비교해 **4D cost volume**을 구성하고, 3D convolution이나 hourglass 구조로 집계·최적화를 동시에 수행한다.

### LoFTR: Detector-Free Local Feature Matching

**[LoFTR](https://arxiv.org/abs/2104.00680)**(Sun et al., 2021)는 원래 two-view feature matching을 위한 방법이지만, 스테레오 매칭에도 직접 적용할 수 있다. LoFTR에 대한 자세한 분석은 [LoFTR 논문 리뷰]({% post_url 2024-12-20-loftr-paper-review %})를 참고하자.

전통적 feature matching 파이프라인은 다음과 같다.

1. **Detection** — [SIFT](https://en.wikipedia.org/wiki/Scale-invariant_feature_transform), [SuperPoint](https://arxiv.org/abs/1712.07629) 등으로 keypoint를 검출
2. **Description** — 각 keypoint 주변에서 descriptor를 추출
3. **Matching** — descriptor 유사도로 대응점을 찾음

이 방식의 근본 한계는 **detection 단계에서 keypoint가 검출되지 않으면 matching 자체가 불가능**하다는 점이다. 텍스처가 약하거나 반복 패턴이 있는 영역에서 keypoint가 안 잡히면, 해당 영역의 대응 관계를 아예 알 수 없다.

LoFTR는 이 문제를 **detector-free** 구조로 해결한다.

- CNN으로 좌우 영상의 feature map을 추출한 뒤, **Transformer의 self-attention과 cross-attention**을 교차 적용해 두 영상 간의 전역적 관계를 직접 학습한다
- Keypoint detection 없이 **모든 위치에서 dense하게 대응 관계를 추론**할 수 있다
- Coarse level에서 대략적 매칭을 찾고, fine level에서 서브픽셀 정밀도로 refine하는 **coarse-to-fine** 구조를 사용한다

스테레오 매칭 관점에서 LoFTR의 의미는 다음과 같다.

**텍스처 없는 영역에서의 매칭** — Transformer의 global receptive field 덕분에, 해당 위치에 keypoint가 없어도 주변 문맥에서 대응 단서를 가져올 수 있다. 이는 전통 방식의 가장 큰 약점인 textureless region 문제를 완화한다.

**반복 패턴 구분** — Self-attention이 영상 내부의 구조적 관계를 파악하고, cross-attention이 두 영상 간의 대응을 전역적으로 비교하므로, 단순 local patch 비교보다 반복 패턴에서의 ambiguity를 줄일 수 있다.

**Epipolar constraint와의 결합** — 보정된 스테레오 쌍에서는 대응점이 같은 행에 있다는 제약이 있다. LoFTR의 attention을 이 1D 탐색으로 제한하면 계산량을 줄이면서 정확도를 높일 수 있다. **[STTR](https://arxiv.org/abs/2011.02910)**(Li et al., 2021)이 이 아이디어를 직접 구현한 사례다.

### End-to-End 학습의 흐름

최근 스테레오 매칭은 파이프라인 전체를 하나의 네트워크로 학습하는 방향으로 진화하고 있다.

**[RAFT-Stereo](https://arxiv.org/abs/2109.07547)**(Lipson et al., 2021) — Optical flow 추정에서 성공한 RAFT의 iterative refinement를 스테레오에 적용한다. 전체 cost volume을 한 번에 처리하지 않고, correlation lookup + GRU 기반 반복 업데이트로 시차를 점진적으로 정밀화한다. 메모리 효율이 좋고 고해상도 영상에서도 동작한다.

**[CREStereo](https://arxiv.org/abs/2203.11483)**(Li et al., 2022) — Cascaded recurrent 구조로 RAFT-Stereo를 발전시킨다. Adaptive correlation과 hierarchical refinement를 결합해 얇은 구조물과 경계 영역에서의 정밀도를 높였다.

**[UniMatch](https://arxiv.org/abs/2211.05783)**(Xu et al., 2023) — Stereo matching, optical flow, depth estimation을 하나의 통합 프레임워크로 다룬다. 세 태스크가 공유하는 feature extraction + correlation + refinement 구조를 제안하며, cross-task 학습이 각 태스크의 성능을 높인다는 것을 보여준다.

### 전통 방식과 딥러닝의 비교

| 측면 | 전통 방식 (SGM 등) | 딥러닝 (RAFT-Stereo 등) |
|------|-------------------|----------------------|
| Feature | Hand-crafted (Census 등) | 학습된 CNN/Transformer feature |
| 집계/최적화 | Semi-global path, 에너지 최소화 | 3D conv, iterative GRU update |
| 텍스처 약한 영역 | 매우 취약 | 상대적으로 강인 |
| 속도 | 실시간 가능 | GPU 필요, 고해상도에서 느림 |
| 일반화 | 도메인 의존 낮음 | 학습 데이터 분포에 의존 |

딥러닝이 전통 방식을 정확도 면에서 크게 앞서지만, 학습 데이터와 다른 환경에서의 일반화, 실시간 처리, 해석 가능성은 여전히 과제다. 실무에서는 SGM 계열의 안정성과 딥러닝의 정확도를 상황에 맞게 선택하거나, 하이브리드로 조합하는 경우가 많다.

## 실전 포인트

스테레오 매칭은 세 가지 암묵적 가정 위에 성립한다. **밝기 일관성**(같은 점은 두 영상에서 비슷하게 보인다), **공간적 연속성**(이웃 픽셀은 비슷한 깊이다), **가시성**(한쪽에서 보이는 점은 다른 쪽에서도 보인다). 그림자, 반사, 경계, occlusion은 이 가정들을 깨뜨리는 대표적 상황이다.

실무에서 가장 성능에 영향을 주는 요소는 **캘리브레이션 품질**(보정이 틀리면 전체가 흔들림), **텍스처 풍부도**(균일한 표면은 매칭 불가), **시차-깊이 비선형성**(먼 거리일수록 오차 증폭)이다.
