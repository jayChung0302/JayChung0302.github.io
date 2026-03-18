---
layout: post
toc: true
title: "Homography"
categories: cv
tags:
  - computer-vision
  - homography
  - projective-geometry
author: Nate
math: true
---

## Homography란

> 한 평면 위의 점들이 다른 영상에서 어디로 가는지를 나타내는 projective transform이다.

첫 번째 영상의 점 $\mathbf{x}$와 두 번째 영상의 점 $\mathbf{x}'$가 있을 때, 같은 평면 위의 점들에 대해

$$\mathbf{x}' \sim H\mathbf{x}$$

라는 관계가 성립한다.

- $H$: $3 \times 3$ 행렬
- $\sim$: 스케일만 다른 동치 관계

사각형 종이를 비스듬히 찍으면 사다리꼴처럼 보인다. 단순한 평행이동, 회전, 확대/축소만으로는 이런 원근 왜곡을 설명할 수 없다. **이걸 표현하는 게 homography**다.

## 언제 성립하나

**경우 A. 장면의 점들이 하나의 평면 위에 있을 때**

예: 종이, 책 표지, 도로 바닥 일부, 벽면, 포스터

**경우 B. 카메라가 회전만 하고 이동은 없을 때**

이 경우는 장면이 평면이 아니어도 전체 영상이 homography로 표현될 수 있다.

## Homogeneous coordinate

영상의 한 점 $(u, v)$를 homography에서는 homogeneous coordinate로 쓴다.

$$\mathbf{x} = \begin{bmatrix} u \\ v \\ 1 \end{bmatrix}$$

이렇게 해야 원근 변환까지 행렬 하나로 표현할 수 있다. Homogeneous coordinate에서는

$$\begin{bmatrix} u \\ v \\ 1 \end{bmatrix} \sim \begin{bmatrix} \lambda u \\ \lambda v \\ \lambda \end{bmatrix} \quad (\lambda \neq 0)$$

를 같은 점으로 본다. 마지막 성분으로 나누면 원래 좌표를 복원할 수 있다:

$$(u, v) = \left(\frac{x_1}{x_3},\; \frac{x_2}{x_3}\right)$$

## 핵심 수식

$$\mathbf{x}' \sim H\mathbf{x}$$

$$H = \begin{bmatrix} h_{11} & h_{12} & h_{13} \\ h_{21} & h_{22} & h_{23} \\ h_{31} & h_{32} & h_{33} \end{bmatrix}$$

행렬곱 결과를 실제 좌표로 변환하면:

$$u' = \frac{h_{11}u + h_{12}v + h_{13}}{h_{31}u + h_{32}v + h_{33}}, \quad v' = \frac{h_{21}u + h_{22}v + h_{23}}{h_{31}u + h_{32}v + h_{33}}$$

분모 $h_{31}u + h_{32}v + h_{33}$ 때문에 이 변환은 단순 affine이 아니라 **projective transform**이 된다. translation, rotation, scaling, shear, 그리고 **perspective distortion**까지 모두 포함할 수 있다.

## 자유도와 추정

$H$는 $3 \times 3$이니까 원소는 9개지만, homogeneous coordinate에서는 $H \sim \alpha H$이므로 **실제 자유도는 8개**다.

점 하나의 대응 $(\mathbf{x} \leftrightarrow \mathbf{x}')$는 2개의 독립 방정식을 준다. 따라서 **최소 4쌍의 점 대응이 필요**하다.

여러 점 대응을 쌓아서 $A\mathbf{h} = \mathbf{0}$ 형태로 만들고, SVD로 $\mathbf{h}$를 구하는 것이 DLT(Direct Linear Transform)의 핵심이다.

## Affine transform과의 차이

**Affine transform** — 마지막 행이 $[0 \;\; 0 \;\; 1]$로 고정:

$$\begin{bmatrix} u' \\ v' \\ 1 \end{bmatrix} = \begin{bmatrix} a_{11} & a_{12} & t_x \\ a_{21} & a_{22} & t_y \\ 0 & 0 & 1 \end{bmatrix} \begin{bmatrix} u \\ v \\ 1 \end{bmatrix}$$

- 직선 → 직선, 평행선 유지, 원근 효과 표현 불가

**Homography** — 마지막 행이 자유:

$$\begin{bmatrix} u' \\ v' \\ w' \end{bmatrix} = \begin{bmatrix} h_{11} & h_{12} & h_{13} \\ h_{21} & h_{22} & h_{23} \\ h_{31} & h_{32} & h_{33} \end{bmatrix} \begin{bmatrix} u \\ v \\ 1 \end{bmatrix}$$

- 직선 → 직선, 평행성 깨질 수 있음, **원근 왜곡 가능**

보존되는 건 직선성뿐이다. 길이, 각도, 면적, 평행성은 보존되지 않는다.

## 응용

책 페이지를 비스듬히 찍었다고 하자. 실제 종이는 평면이니까, 네 모서리를 잡아서 homography를 추정하면 정면에서 본 것처럼 펴낼 수 있다. **이게 CamScanner의 기본 원리다.**

실제로는 다음과 같은 곳에 쓰인다:

- perspective correction / document rectification
- panorama stitching
- bird's-eye view
- planar object tracking
- image warping

구현할 때는 보통 **inverse warping**을 쓴다. Forward warping은 픽셀 구멍이 생기기 쉬우므로, 타깃 픽셀 $\mathbf{x}'$마다 $\mathbf{x} \sim H^{-1}\mathbf{x}'$를 계산해서 원본에서 샘플링한다.

## 자주 헷갈리는 지점

**Homography는 모든 2장 이미지 사이에 성립하나?**

아니다. 전체 장면이 평면일 때만 정확하게 성립한다. 일반 3D 장면을 하나의 homography로 맞추면 일부만 맞고 나머지는 어긋난다.

**3D를 2D로 가는 변환인가?**

아니다. 한 영상 평면의 점을 다른 영상 평면의 점으로 보내는 **2D-2D projective transform**이다.

**$3 \times 3$이면 그냥 선형변환인가?**

겉으로는 행렬곱이지만 실제 좌표로 돌아오면 분모가 생긴다. 유클리드 의미의 선형변환과는 다르다.

## 정리

Homography는
- $\mathbf{x}' \sim H\mathbf{x}$로 표현되는 2D projective transform이고,
- 평면 장면의 두 영상 사이 점 대응을 설명하며
- 8 자유도를 가지며
- 최소 4개 점 대응으로 추정할 수 있고
- 원근 왜곡까지 표현할 수 있다.
