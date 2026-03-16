---
layout: post
toc: true
title: "2026년 LLM API 비용 완전 정리 — 모델별 가격 비교와 실무 가성비 전략"
categories: ai
tags:
  - LLM
  - API
  - pricing
  - GPT
  - Claude
  - Gemini
  - DeepSeek
  - Mistral
author: Nate
---

LLM API를 서비스에 붙이려면 가장 먼저 부딪히는 게 **비용**이다. 모델마다 가격 차이가 크고, 같은 회사 안에서도 tier가 나뉘어 있어서 한눈에 비교하기 어렵다. 이 글에서는 2026년 3월 기준 주요 LLM API의 가격을 정리하고, 실무에서 어떻게 조합해야 비용을 아낄 수 있는지 정리한다.

## 전체 모델 가격 정리 (1M tokens 기준)

| 회사 | 모델 | Input | Output | 평균 비용 |
|------|------|-------|--------|-----------|
| Mistral | Mistral Nemo | $0.02 | $0.04 | $0.03 |
| Google | Gemini 2.5 Flash-Lite | $0.075 | $0.30 | $0.1875 |
| Google | Gemini 2.5 Flash | $0.10 | $0.40 | $0.25 |
| DeepSeek | DeepSeek V3.2 | $0.28 | $0.42 | $0.35 |
| OpenAI | GPT-4o mini | $0.15 | $0.60 | $0.375 |
| OpenAI | GPT-4.1 nano | $0.20 | $0.80 | $0.50 |
| OpenAI | GPT-4.1 mini | $0.40 | $1.60 | $1.00 |
| OpenAI | GPT-3.5 Turbo | $0.50 | $1.50 | $1.00 |
| Anthropic | Claude Haiku 4.5 | $1.00 | $5.00 | $3.00 |
| Google | Gemini 2.5 Pro | $1.25 | $5.00 | $3.125 |
| OpenAI | o3-mini | $1.10 | higher | ~$3+ |
| Google | Gemini 3.1 Pro | $2.00 | $12.00 | $7.00 |
| OpenAI | GPT-4o | $2.50 | $10.00 | $6.25 |
| Anthropic | Claude Sonnet 4.6 | $3.00 | $15.00 | $9.00 |
| Anthropic | Claude Opus 4.6 | $5.00 | $25.00 | $15.00 |

## 가격 순위 (가장 싼 순)

1. **Mistral Nemo** — ≈ $0.03
2. **Gemini 2.5 Flash-Lite** — ≈ $0.19
3. **Gemini 2.5 Flash** — ≈ $0.25
4. **DeepSeek V3.2** — ≈ $0.35
5. **GPT-4o mini** — ≈ $0.375
6. **GPT-4.1 nano** — ≈ $0.50
7. **GPT-4.1 mini / GPT-3.5 Turbo** — ≈ $1.00
8. **Claude Haiku / Gemini Pro / o3-mini** — ≈ $3
9. **GPT-4o** — ≈ $6.25
10. **Claude Sonnet / Opus** — ≈ $9 ~ $15

## 실제 서비스 비용 감각

실제로 돈이 얼마나 나가는지 체감하기 어려우니, 예시를 들어보자.

**가정:** 질문 800 tokens + 답변 1,200 tokens = 총 2,000 tokens per request

| 모델 | 1M tokens 평균 | 요청 1건 비용 | 1만 요청 비용 |
|------|----------------|---------------|---------------|
| Mistral Nemo | $0.03 | $0.00006 | **$0.6** |
| Gemini Flash-Lite | $0.1875 | $0.000375 | **$3.75** |
| DeepSeek V3.2 | $0.35 | $0.0007 | **$7** |
| GPT-4o mini | $0.375 | $0.00075 | **$7.5** |

Mistral Nemo가 압도적으로 싸지만, 성능은 최신 frontier 모델보다 낮다는 점은 감안해야 한다.

## 회사별 가성비 요약

### Google — 가성비 1위

- **추천 모델:** Gemini Flash-Lite
- **장점:** 매우 저렴, free tier 존재, 긴 context window
- **단점:** reasoning이 약함

### OpenAI — 균형형

- **추천 모델:** GPT-4o mini
- **장점:** 안정적인 품질, tool use 우수, ecosystem 강함
- **단점:** Gemini보다 약간 비쌈

### DeepSeek — 가성비 + 성능

- **추천 모델:** DeepSeek V3.2
- **장점:** reasoning 강함, 가격 저렴
- **단점:** ecosystem 약함

### Mistral — 초저가

- **추천 모델:** Nemo
- **장점:** 가장 저렴
- **단점:** reasoning 약함

## 실무에서 많이 쓰는 구조

대부분의 서비스는 하나의 모델만 쓰지 않는다. **Multi-model routing**을 사용해서 요청의 난이도에 따라 모델을 분기한다.

```
cheap model (간단한 분류, 추출)
    ↓
normal model (일반 대화, 요약)
    ↓
reasoning model (복잡한 추론, 분석)
```

예를 들면 이런식이다. 

```
Gemini Flash-Lite  →  GPT-4o mini  →  o3 / Claude / GPT-4o
```

이 구조를 쓰면 **API 비용을 10~30배 절약**할 수 있다.

## 실무에서 진짜 중요한 선택 기준

가격만 보면 순서는 명확하다. 생각보다 Claude 가 많이 비싸다..

> Mistral → Gemini → DeepSeek → OpenAI → Claude

하지만 실제 서비스를 만들 때는 가격 외에도 따져야 할 것이 있다:

1. **Latency** — 응답 속도가 UX를 결정한다
2. **Tool calling** — function calling 안정성
3. **Stability** — API 가용성과 일관성
4. **Ecosystem** — SDK, 문서, 커뮤니티
5. **Reasoning quality** — 복잡한 태스크 처리 능력

그래서 많은 스타트업이 **GPT-4o mini + Gemini Flash** 조합을 선택한다.

## 1M 토큰은 한글로 얼마나 될까?

한글은 영어보다 토큰 효율이 낮다. 영어는 평균 1토큰 ≈ 4글자인 반면, 한글은 BPE 토크나이저 기준 **1글자 ≈ 2~3토큰** 정도 소모된다.

> 1M 토큰 ÷ 평균 2.5 ≈ **약 40만 글자(음절)**

40만 글자가 어느 정도인지 감을 잡아보면:

| 기준 | 계산 | 분량 |
|------|------|------|
| A4 1페이지 | ~800자 (공백 제외) | 약 500페이지 |
| 한국 소설 1권 | ~20만~25만자 | 약 1.5~2권 |
| 신문 기사 1건 | ~600~1,000자 | 약 400~600건 |
| 카카오톡 메시지 | ~30~50자 | 약 8,000~13,000건 |
| 대학 논문 (석사) | ~5만~8만자 | 약 5~8편 |

## 정리

LLM 서비스를 만들 때 추천하는 스택:

| 용도 | 추천 모델 |
|------|-----------|
| Router (분류/라우팅) | Gemini Flash-Lite |
| Chat (일반 대화) | GPT-4o mini |
| Reasoning (추론) | DeepSeek V3.2 |
| Hard tasks (어려운 태스크) | o3 / Claude |
