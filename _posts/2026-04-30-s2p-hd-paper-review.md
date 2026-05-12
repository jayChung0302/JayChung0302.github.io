---
layout: post
toc: true
math: true
title: "s2p-hd 논문 리뷰 — GPU-Accelerated Satellite Stereo Pipeline for Large-Scale DSM Generation"
description: "s2p-hd 논문 리뷰. 기존 s2p를 GPU 가속, robust disparity range estimation, MGM subpixel refinement로 개선한 same-date satellite stereo DSM pipeline."
categories: misc
tags:
  - computer-vision
  - remote-sensing
  - paper-review
  - stereo-matching
  - 3d-reconstruction
author: Nate
---

## 들어가며

최근 satellite 3D reconstruction에서는 NeRF, Gaussian Splatting 기반 multi-date 방법이 높은 reconstruction quality를 보이지만, 계산량과 입력 view 수 요구가 커서 실제 적용 범위가 소규모 AoI에 제한되기 쉽다. 반면 산업적 mapping workflow에서는 여전히 same-date stereo pair 기반 large-scale DSM production이 핵심이다.

s2p-hd는 기존 open-source s2p를 기반으로, same-date satellite stereo에 맞게 고속화·안정화한 GPU-accelerated binocular stereo pipeline이다. 새로운 deep architecture가 아니라 system-level optimization에 초점을 두고, 기존 공개 pipeline 대비 더 낮은 RMSE와 더 짧은 runtime을 동시에 달성한다.

## 핵심 용어 정리

### s2p-hd

기존 s2p를 기반으로, same-date satellite stereo에 맞게 고속화·안정화한 GPU-accelerated binocular stereo pipeline이다. 대규모 영상에서 high-throughput DSM/DEM generation을 목표로 한다.

### SGM (Semi-Global Matching)

Stereo matching의 핵심 알고리즘으로, s2p-hd에서는 GPU 기반 libSGM을 수정·확장해 속도 병목을 줄였다. Disparity range 확장과 left-right consistency 개선이 포함된다.

### MGM (More Global Matching)

선택적 subpixel refinement 단계다. SGM 결과 주변의 좁은 disparity band에서 refinement를 수행해 tile 경계 discontinuity를 줄인다.

### Disparity Range Estimation

Stereo matching 전에 탐색할 disparity 최소·최대 범위를 정하는 단계다. 기존 s2p의 tile별 SIFT 기반 추정보다 더 견고한 bounded range estimation을 사용한다.

### Quasi-simultaneous / Same-date Stereo

동일 날짜 또는 거의 동시에 촬영된 stereo pair를 이용하는 설정이다. Multi-date opportunistic stereo와 구분하여 large-scale efficiency에 초점을 둔다.

## 문제 정의

기존 s2p의 한계는 세 가지다.

1. **Tile별 SIFT 기반 disparity range estimation** — tall building 누락 시 range 과소추정, spurious match 시 range 과대추정이 발생한다. 결과적으로 clipping, noise, runtime 증가로 이어진다.

2. **Tile 간 독립 처리** — large structure clipping과 tile boundary discontinuity가 발생한다.

3. **CPU 중심 stereo matching bottleneck** — throughput이 제한되어 대면적 full-scene processing이 비효율적이다.

논문은 이를 해결하기 위해 robust disparity range estimation, GPU-accelerated stereo matching, rectification/tiling/DSM post-processing optimization을 재설계한다.

## 제안 방법론

### Disparity Range Estimation

기존 s2p의 SIFT 기반 tile-local estimation을 다음 방식으로 보완한다.

- **Reference DEM integration** — coarse DEM (예: SRTM) 기반 초기 altitude range 설정
- **Multiscale estimation** — coarse-to-fine disparity bound refinement
- **Acquisition geometry constraint** — baseline-to-height ($b/H$) ratio 활용
- **Neighbor-aware refinement** — 현재 tile + 주변 8개 neighboring tiles keypoint 활용

Triangulation으로 얻은 altitude 분포가 지나치게 넓으면 outlier를 제거하며, 실제 threshold는 $\text{median}(\text{altitudes}) \pm 250\text{m}$로 제한한다. 이 구조는 tall structure clipping을 줄이고 tile 간 height continuity를 개선한다.

### GPU-Accelerated Stereo Matching

libSGM을 satellite stereo용으로 수정한다.

- Disparity range 256 → 512 pixels
- Negative disparity 대응 left-right consistency fix
- Variable census window
- Same-date imagery용 regularity tuning
- GPU memory scheduling
- Optional MGM subpixel refinement

구조적으로는 SGM → fast dense matching, MGM → local subpixel correction의 hybrid pipeline이다.

### Rectification / Tiling / DSM Generation

**Rectification** — OpenCV 기반 keypoint matching으로 5x acceleration을 달성한다.

**Tile overlap margin** — 다음 식으로 tile continuity를 보장한다.

$$margin = \frac{b}{H} \times h_{max} \times GSD$$

**DSM aggregation** — 기존 averaging 대신 maximum value aggregation을 사용해 overlay artifact를 줄인다. 특히 building edge나 vertical structure에서 더 안정적이다.

## 핵심 결과

### IARPA Dataset

| 모델 | RMSE ↓ | Runtime (s) ↓ |
|------|--------|---------------|
| ASP | 1.80 | 39.08 |
| CARS | 1.23 | 5948.48 |
| s2p | 0.91 | 32.03 |
| s2p-hd (SGM) | 0.89 | 18.52 |
| s2p-hd (MGM) | 0.86 | 20.32 |
| **s2p-hd (SGM + MGM pp)** | **0.84** | 20.56 |

Accuracy 기준 최적 조합은 SGM + MGM post-processing이다.

### GRSS Dataset

| 모델 | RMSE ↓ | Runtime (s) ↓ |
|------|--------|---------------|
| ASP | 2.76 | 140.55 |
| CARS | 3.84 | 66.65 |
| s2p | 2.72 | 36.09 |
| s2p-hd (SGM) | 2.70 | 23.38 |
| s2p-hd (MGM) | 2.70 | 28.33 |
| **s2p-hd (SGM + MGM pp)** | **2.62** | 34.00 |

GRSS에서도 동일하게 SGM + MGM pp 조합이 best RMSE를 기록한다.

### Full DSM Runtime

| 모델 | Runtime (s) ↓ |
|------|---------------|
| ASP | 7,359 |
| CARS | 10,817 |
| s2p | 10,732 |
| s2p-hd (MGM) | 6,483 |
| **s2p-hd (SGM)** | **4,522** |
| s2p-hd (SGM + MGM pp) | 6,837 |

Full-size WorldView-3 pair에서도 throughput advantage가 유지된다. SGM 단독이 가장 빠르고, SGM + MGM pp가 accuracy-speed trade-off에서 최적이다.

## 결론 및 시사점

핵심 기여는 새로운 deep architecture가 아니라, 다음 단계의 system-level optimization이다.

- Disparity range estimation — reference DEM + neighbor-aware refinement
- GPU SGM integration — disparity 512, left-right consistency fix
- MGM subpixel refinement — tile boundary discontinuity 감소
- Rectification speedup — 5x acceleration
- VRAM-aware tiling — GPU memory scheduling
- Max-based DSM aggregation — vertical structure 보존

결과적으로 기존 공개 pipeline 대비 더 낮은 RMSE와 더 짧은 runtime을 동시에 달성한다. Same-date satellite stereo 기반 large-scale mapping workflow에서 실질적으로 배포 가능한 수준의 개선이며, 특히 reference DEM 기반 disparity bounding과 neighbor-aware tile refinement는 다른 stereo pipeline에도 바로 적용 가능한 아이디어다.
