---
layout: post
toc: false
title: "항공/위성 영상 Small Object Detection — CNN의 효율을 넘어 Transformer의 성능으로"
categories: ai
tags:
  - computer-vision
  - object-detection
  - remote-sensing
  - deep-learning
  - transformer
author: Nate
---

항공·위성 영상에서 3~10px 수준의 초소형 객체를 탐지하는 일은, 컴퓨터 비전에서도 특히 난이도가 높은 문제에 속한다. 단순히 객체가 작아서 어려운 것이 아니다. 정보량이 지나치게 적고, 배경은 복잡하며, 때로는 객체 자체보다 주변 맥락이 더 중요한 단서가 되기 때문이다. 차량이 몇 픽셀에 불과한 상황에서는 신호가 쉽게 희석되고, 도시의 그림자나 지면 질감은 객체와 비슷한 패턴을 만들어 오탐지를 유도한다. 활주로 위의 비행기처럼, 무엇이 놓여 있는지보다 어디에 놓여 있는지가 더 중요해지는 경우도 많다. 이 문제는 결국 "작은 물체를 본다"기보다, 희미한 신호를 복잡한 장면 속에서 맥락과 함께 복원해내는 일에 가깝다.

이런 조건에서 CNN은 오랫동안 가장 현실적인 해답이었다. 이유는 분명하다. CNN은 강한 귀납적 편향(Inductive Bias)을 바탕으로, 적은 데이터와 비교적 제한된 연산 자원만으로도 국소적인 특징(Local Feature)을 잘 포착한다. 특히 3×3 convolution은 에지, 코너, 질감처럼 작은 객체를 구성하는 fine-grained spatial feature를 직접적으로 학습하는 데 유리하다. 초소형 객체는 대개 edge에서 시작해 corner, texture, object part 수준으로 인식되는데, 이 과정은 CNN의 구조와 잘 맞물린다. 여기에 [FPN](https://arxiv.org/abs/1612.03144) 계열 구조가 더해지면서 고해상도 feature map과 의미론적 정보를 함께 유지할 수 있게 되었고, Faster R-CNN, RetinaNet, YOLO, EfficientDet 같은 대표적인 Detector들이 모두 이 흐름 위에서 발전해왔다. 그래서 실시간성이 중요하거나, 연산 자원이 부족하거나, 프로젝트 초기에 데이터가 충분하지 않은 경우에는 여전히 CNN이 가장 좋은 출발점이 된다.

반면 Transformer는 한동안 소형 객체 탐지에 불리하다는 평가를 받았다. 초기 ViT 계열 모델은 큰 patch 단위로 이미지를 분할했는데, 예를 들어 16×16 패치 안에 6px짜리 차량이 들어가면 객체 신호가 패치 내부에서 쉽게 묻혀버린다. [DETR](https://arxiv.org/abs/2005.12872) 초기 모델이 small object 성능에서 약점을 보였던 것도 이와 무관하지 않다. 하지만 최근의 발전은 이 한계를 꽤 분명하게 넘어섰다. [Swin Transformer](https://arxiv.org/abs/2103.14030)처럼 계층적 구조를 도입한 모델은 더 작은 패치에서 시작해 정보를 점진적으로 추상화함으로써, 초소형 객체가 초반 단계에서 소실되는 문제를 줄였다. Deformable Attention은 이미지 전체를 균일하게 보는 대신 중요한 위치만 선택적으로 샘플링하면서 연산 효율과 정밀도를 동시에 끌어올렸다. 그리고 무엇보다 Self-Supervised Learning이 결합되면서, 위성 영상처럼 라벨은 부족하지만 원시 데이터는 매우 많은 영역에서 Transformer의 강점이 본격적으로 드러나기 시작했다. 대규모 unlabeled 데이터를 활용하는 MAE류 학습에서는, Transformer가 CNN보다 더 높은 성능 상한을 보여주는 경우가 점점 늘고 있다.

그래서 지금 시점에서 CNN과 Transformer의 관계는 경쟁이라기보다 역할 분담에 가깝다. CNN은 여전히 효율적인 출발점이다. 빠르고, 안정적이며, 적은 자원으로도 좋은 baseline을 만들 수 있다. 반대로 Transformer 계열은 전역 맥락을 더 깊게 읽어내고, 충분한 데이터와 학습 전략이 주어졌을 때 성능 한계를 더 멀리 밀어낼 수 있다. 특히 복잡한 도시 환경, 항만, 활주로처럼 객체와 배경의 관계 자체가 중요한 경우에는 전역적인 문맥 이해가 점점 더 중요해진다. 이 단계로 갈수록 Transformer 기반 구조의 가치가 분명해진다.

물론 실제 위성영상 프로젝트에서는 모델 선택만으로는 충분하지 않다. 초소형 객체 문제는 거의 항상 전처리와 후처리 전략을 함께 요구한다. Super Resolution은 작은 객체의 pixel footprint 자체를 키워주는 직접적인 수단이고, Tiling은 10,000×10,000 이상의 대형 영상을 더 작은 조각으로 나눠 신호를 보존하게 해준다. 물론 이때는 tile 경계에 걸리는 객체를 위해 overlap과 NMS 설계를 함께 고려해야 한다. 또한 FPN, BiFPN, PAN 같은 multi-scale feature aggregation은 사실상 필수에 가깝다. 작은 객체는 단일 해상도에서 안정적으로 잡히기 어렵기 때문이다. 여기에 위성영상 특유의 회전 문제까지 고려하면, axis-aligned box 대신 oriented box를 다루는 탐지기 역시 중요한 옵션이 된다. 선박이나 항공기처럼 방향성이 의미를 가지는 객체는 rotated detection이 훨씬 자연스럽다.

결국 현재의 최적해는 어느 한쪽의 완승이라기보다, 두 구조의 장점을 결합하는 방향으로 수렴하고 있다. 자원이 제한된 상황에서는 CNN이 여전히 가장 실용적이다. 하지만 정확도의 상한을 끌어올리고, 더 복잡한 장면에서 더 높은 수준의 추론을 요구받는 순간부터는 Transformer 기반의 하이브리드 구조, 혹은 정교하게 설계된 attention 메커니즘이 사실상 필수에 가까워진다. 그래서 위성영상 분석 프로젝트를 설계한다면, 초반에는 ConvNeXt 같은 현대적 CNN으로 탄탄한 baseline을 만들고, 이후 고도화 단계에서 Swin, DINO 계열, 혹은 deformable attention 기반 모델로 넘어가는 전략이 가장 현실적이다. CNN은 여전히 효율의 언어를 잘하고, Transformer는 점점 더 성능의 상한을 다시 쓰고 있다.
