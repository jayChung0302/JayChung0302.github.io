---
layout: post
toc: true
math: true
title: "ToothFaSiry2 논문 리뷰 — 42-class CBCT Dataset과 Mamba 기반 Maxillofacial Segmentation"
description: "ToothFairy2 논문 리뷰. 530 CBCT volumes, 42 anatomical classes의 대규모 공개 dataset과 α-shape refinement, nnU-Net customization, Mamba 기반 모델 비교 분석."
categories: research
tags:
  - paper-review
  - medical-imaging
  - segmentation
  - mamba
  - dataset
  - cbct
author: Nate
---

[ToothFairy2](https://openaccess.thecvf.com/content/CVPR2025/papers/Bolelli_Segmenting_Maxillofacial_Structures_in_CBCT_Volumes_CVPR_2025_paper.pdf)는 **치과용 CT(CBCT) 데이터를 42개 class로 voxel 단위 annotate한 대규모 공개 [dataset](https://github.com/AImageLab-zip/ToothFairy2-Benchmark?tab=readme-ov-file)**이다. annotation refinement에 α-shape를 쓴다거나, nnU-Net의 data augmentation 하나를 제거하는 것만으로 DSC가 +10 오른다는 결과가 실용적인 관점에서 인상적이다.

이 논문은 새로운 segmentation 알고리즘을 제안하는 게 아니라, **dataset + benchmark + practical optimization**에 집중하는 연구다. 그런 만큼 모델 구조보다는 데이터 설계와 training 전략 측면에서 얻을 인사이트가 있다.

## 핵심 용어 정리

### CBCT (Cone-Beam Computed Tomography)

치과 및 구강악안면 영역에서 사용되는 3D volumetric imaging modality. 일반 CT보다 방사선 피폭이 낮고 해상도가 높아 치과용으로 널리 쓰인다. Jawbone, teeth, Inferior Alveolar Canal(IAC), maxillary sinus 등 복잡한 구조를 voxel 단위 3D volume으로 생성한다. 처음 접해본 imaging 도메인이었는데, 치아 뿌리 하나하나, 신경관 위치까지 3D로 표현된다는 게 꽤 인상적이다.

### DSC (Dice Similarity Coefficient)

Segmentation 성능 평가의 표준 metric.

$$\text{DSC} = \frac{2|P \cap GT|}{|P| + |GT|}$$

작은 ROI에서 IoU보다 안정적으로 동작하며, binary와 multi-class 모두 적용 가능하다.

### HD95 (95th percentile Hausdorff Distance)

예측과 GT boundary 간 거리의 95 percentile 값. Outlier에 덜 민감하게 boundary accuracy를 측정하는 metric이다. DSC가 volume overlap을 보는 반면 HD95는 boundary precision을 본다.

### Mamba / State-Space Model

Transformer의 $O(N^2)$ attention 문제를 우회하기 위해 제안된 state-space 기반 sequence modeling 구조. Long-range dependency를 linear complexity로 처리할 수 있어 고해상도 3D volume 처리에 유리하다. UMamba, VMamba, Swin-UMamba 등이 의료 영상 분야에서 활발히 연구되고 있다.

## 연구 배경 및 문제 정의

CBCT 기반 maxillofacial segmentation은 수술 계획, 임플란트 배치, 신경관 손상 예방 등에 필수적이다. 구강외과 의사가 수술 전 IAC(하치조관) 위치를 정확히 파악하지 못하면 신경 손상 위험이 있는데, 이를 자동으로 segmentation하는 기술이 실용적으로 매우 중요하다.

문제는 기존 공개 dataset의 한계다.

- 대부분 데이터셋 규모가 50 CBCT 미만
- Teeth 또는 IAC 등 **특정 구조 하나에만** 집중
- Multi-class가 아닌 binary segmentation 위주
- 3D dense voxel annotation 대신 2D annotation에 그침
- Implant, crown 같은 인공 구조물 포함 없음

42-class 수준의 3D multi-class segmentation dataset은 사실상 존재하지 않았다. 그 결과 모델 학습 자체보다 데이터 부재가 generalization의 병목이 되어왔다.


### ToothFairy2 Dataset

본 논문의 핵심 contribution은 dataset 자체다.

- **530 CBCT volumes** (480 train / 50 test)
- **42 anatomical classes**: jawbones, L/R Inferior Alveolar Canal, L/R Maxillary sinus, pharynx, FDI 기준 개별 치아, implants, crowns, bridges 포함
- Voxel spacing: train 0.3mm isotropic, test 0.4mm → 0.3mm rescale
- Test set은 Grand Challenge 플랫폼에서 평가

FDI notation(World Dental Numbering System) 기반으로 개별 치아를 다 따로 annotate한다는 부분이 흥미로웠다. 치아 32개(사랑니 4개도 포함이다 ㅋㅋ)가 각각 별도 class로 잡히는 구조다.

### Annotation Pipeline

Semi-automated annotation 전략을 사용한다.

1. 5개의 nnU-Net 기반 base model로 초기 mask 생성
2. 전문가 7명이 axial / sagittal / coronal multi-plane 보정
3. Train annotator ≠ Test annotator로 annotator bias 방지

2D slice 단위로 annotation할 때 생기는 **jagged artifact**
![jagged artifact issue](/imgs/5.png){: width="400"} 문제를 해결하기 위해 α-shape 기반 refinement를 적용한다. 이 부분이 개인적으로 가장 인상적이었다.

**α-shape refinement 과정:**

1. 3D annotation에서 dense point set 추출
2. Delaunay triangulation
3. α-complex 구성
4. α-shape 추출 (concave α-shape, α < 0 사용)
5. Smooth polygonal mesh 생성 후 rasterization → voxelization

일반적인 post-processing이 morphological operation 수준에 그치는 것과 달리, geometry-aware refinement를 annotation 단계에 적용한 것이다. 결과적으로 slice 경계에서 발생하는 jagged artifact를 제거하고, physically plausible한 smooth surface를 얻는다. Annotation quality가 모델 성능에 직접 영향을 준다는 점에서, 이런 세심한 pipeline 설계가 data-centric research의 좋은 예다.

### 비교 모델

세 계열의 모델을 비교한다.

- **CNN**: nnU-Net, nnU-Net ResEnc
- **Transformer**: TransUNet, nnFormer, UNETR++
- **Mamba-based**: UMamba, VMamba, Swin-UMamba

### nnU-Net Customization — 실무적으로 가장 중요한 파트

논문에서 가장 실용적인 인사이트가 여기서 나온다. nnU-Net의 default augmentation 중 **left/right mirroring을 제거하는 것만으로 DSC가 크게 오른다**.

이유는 간단하다. Maxillofacial 구조는 sagittal symmetry가 강하다. Left/right mirroring augmentation을 그대로 쓰면, 모델이 좌우를 구분하는 능력을 잃어버린다. L/R IAC, L/R maxillary sinus처럼 좌우를 명확히 구분해야 하는 42개 class 구조에서는 치명적이다.

| Configuration | DSC |
|---|---|
| Default nnU-Net ResEnc | 74.16 |
| w/o mirroring augmentation | 80.79 |
| + deeper network | 82.11 |
| + post-processing | 84.99 |

Mirroring 제거 하나로 +6.6 DSC, 최종적으로 default 대비 **+10 DSC improvement**다. Augmentation이 항상 좋은 게 아니고, domain의 anatomical symmetry 특성을 알고 설계해야 한다는 교훈이다.

## 핵심 결과

### Model별 DSC 비교

| Model | DSC | HD95 (mm) |
|---|---|---|
| nnU-Net | 70.92 | — |
| nnU-Net ResEnc | 74.16 | — |
| nnFormer | 76.79 | — |
| Swin-UMamba | 79.64 | — |
| **UMamba** | **85.05** | **5.28** |

UMamba가 전체 최고 성능이다. Mamba 계열이 CNN, Transformer 모두를 outperform한다.

### 주요 관찰

**2D Mamba 모델(VMamba, Swin-UMamba)이 생각보다 잘 작동한다.** 일부 class에서 3D 모델을 outperform하는 경우도 있다. 다만 3D spatial consistency 부족으로 prediction fragmentation이 발생한다는 한계가 있다.

**Class별 난이도 차이가 크다.** Jawbones, pharynx는 shape consistency가 높아 DSC 90~95% 이상이다. 반면 teeth segmentation은 어렵다. Missing teeth, implant/crown 혼재, artificial vs natural 구분의 어려움이 복합적으로 작용한다. "Others" class는 underrepresentation으로 최저 성능을 기록한다.

### Cross-dataset Generalization

ToothFairy2로 학습한 모델을 Cui dataset에 적용하면 잘 generalize된다. 반대로 Cui dataset만으로 학습한 모델을 ToothFairy2에 적용하면 DSC가 약 10 감소한다. Dataset의 diversity와 class richness가 generalization capacity를 결정한다는 것을 명확히 보여주는 결과다.

## 결론 및 시사점

ToothFairy2는 현재 공개된 CBCT dataset 중 **가장 큰 multi-class 3D voxel-level dataset**이다. 새로운 알고리즘을 제안하는 논문이 아니라 dataset + benchmark + engineering 최적화 연구지만, 그만큼 실무적으로 활용 가능한 인사이트가 많다.

기술적으로 중요한 포인트 세 가지만 꼽으면:

1. **α-shape 기반 annotation refinement**: geometry-aware한 annotation quality 향상 전략. 3D medical data annotation에서 재사용 가능한 방법론이다.
2. **Augmentation의 domain-specificity**: mirroring augmentation 하나가 10 DSC 차이를 만든다. "더 많은 augmentation"이 아니라 "도메인에 맞는 augmentation"이 맞다.
3. **Mamba의 3D medical segmentation 우위**: Global context와 long-range dependency를 $O(N^2)$ 없이 처리할 수 있다는 Mamba의 장점이 고해상도 3D CBCT volume에서 실질적인 성능 차이로 이어진다.

개인적으로 이 논문을 읽으면서 치과 영역이 생각보다 훨씬 복잡한 3D 구조를 다룬다는 걸 처음 실감했다. 신경관(IAC)이 악골 속을 지나는 위치를 voxel 단위로 정확히 추출하는 일, 인공 임플란트와 자연 치아를 구분해서 각각 segment하는 일 모두 단순해 보이지 않는다. Digital dentistry에서 자동화가 왜 어렵고 왜 중요한지를 dataset 논문 하나로 이해하게 됐다. 
