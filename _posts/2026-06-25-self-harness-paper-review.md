---
layout: post
toc: true
math: true
title: "Self-Harness 논문 리뷰 — Fixed Model이 자기 자신의 Harness를 개선하다"
description: "Self-Harness 논문 리뷰: Fixed LLM이 execution trace와 verifier 결과만으로 자기 자신이 사용하는 harness를 weakness mining → proposal → regression-gated promotion 루프로 개선하는 framework"
categories: research
tags:
  - paper-review
  - llm-agent
  - agent-harness
  - self-improvement
  - terminal-bench
  - prompt-engineering
author: Nate
---

## 1. Key Terms & Definitions

- **Harness**: LLM-based agent를 실제 환경에서 동작시키는 non-parameter 장치. system prompt, tools, memory, runtime control policy, verification rule, failure-recovery procedure 등을 포함하며, model weight는 바꾸지 않는다.
- **Self-Harness**: agent가 자신의 execution trace와 verifier 결과를 바탕으로, 자기 자신이 사용하는 harness를 직접 개선하는 paradigm이다. Human harness engineering이나 stronger external agent에 의존하지 않는다는 점이 핵심이다.
- **Weakness Mining**: held-in task 실행 결과에서 failed trace를 수집하고, verifier-grounded failure signature로 cluster하여 recurring failure pattern을 찾는 단계다. 논문에서는 failure signature를 $\phi(r_i) = (c_i, q_i, m_i)$로 정의한다. 여기서 $c_i$는 verifier-level cause, $q_i$는 agent behavior의 causal status, $m_i$는 reusable agent mechanism이다.
- **Harness Proposal**: Weakness Mining으로 얻은 evidence bundle을 기반으로, 같은 fixed model이 proposer 역할을 하며 $K$개의 diverse yet minimal harness edit $\Delta_j$를 생성하는 단계다. 각 proposal은 특정 failure mechanism과 editable harness surface에 연결되어야 한다.
- **Proposal Validation**: candidate harness를 held-in / held-out split에서 다시 평가하고, $\Delta_{in} \geq 0$, $\Delta_{ho} \geq 0$, $\max(\Delta_{in}, \Delta_{ho}) > 0$ 조건을 만족할 때만 accept하는 regression gate다. 즉, 한 split에서 좋아져도 다른 split이 나빠지면 reject한다.
- Held-in / Held-out: training / validation set 과 같은 개념.

## 2. Motivation & Problem Statement
이 논문의 핵심 문제의식은 LLM-based agent의 성능이 base model만이 아니라 harness에 강하게 의존하는데(이 부분도 나는 새롭긴 했다. 설계된 harness 에 의해 성능이 상당히 많이 좌우된다.), 현재 harness는 대부분 human expert가 수작업으로 설계한다는 점이다. 같은 model이라도 system prompt, tool interface, verification policy, runtime control이 다르면 behavior가 크게 달라지고, 반대로 같은 harness라도 model family마다 tool-use habit, prompt sensitivity, failure mode가 다르게 나타난다. 이를 "model-specific harness design" 문제로 정의한다. 

**fixed model이 자기 자신의 실패 trace를 근거로, 자기 자신이 사용할 harness를 bounded edit 수준에서 개선할 수 있는가?** 이 질문은 model weight update가 아니라 execution protocol update의 문제다. 즉, model을 더 학습시키는 것이 아니라 agent가 환경과 상호작용하는 방식을 바꾸는 것이다.

## 3. Method & Key Results

Self-Harness는 iterative loop로 구성된다. Figure 2의 workflow를 보면 current harness $h_t$로 fixed model $M$을 task에 실행하고, failed trace를 cluster하여 failure pattern을 만들고, 같은 model을 proposer로 호출해 candidate harness edit를 생성한 뒤, held-in / held-out regression test를 통과한 edit만 $h_{t+1}$에 merge한다. 중요한 점은 loop 전체에서 model weights와 evaluator는 고정되고 harness만 수정된다는 것이다.

초기 harness는 단순하게 시작한다. Figure 3의 code를 보면 Terminal-Bench-2.0 환경에서 filesystem / shell tools를 사용하고, "workspace를 inspect하고 smallest relevant edit surface를 찾으라", "concrete repo changes를 선호하라", "concluding 전에 targeted command/file read/test로 verify하라", "tool call이 실패하면 blindly retry하지 말라" 정도의 기본 instruction만 포함한다. `build_subagents()`와 `build_skills()`는 empty list이고, runtime control policy도 disabled 상태다. 즉, 개선 여지를 크게 남긴 minimal DeepAgent-based harness다.

실험은 Terminal-Bench-2.0의 89개 containerized terminal task 중, unstable external web resource나 unsupported multimodal input을 제외한 fixed 64-case subset에서 수행된다. 평가 model은 MiniMax M2.5, Qwen3.5-35B-A3B, GLM-5 세 가지이며, decoding configuration, tool set, budget, benchmark environment, evaluator는 고정하고 harness만 바꾼다. primary metric은 verifier가 판단한 Pass (%)다.

Self-Harness는 세 model 모두에서 held-in과 held-out 성능을 개선한다.

| Model | Held-in Initial → Self-Harness | Held-out Initial → Self-Harness | 핵심 해석 |
|---|---|---|---|
| MiniMax M2.5 | 43.0% → 50.0% | 40.5% → 61.9% | held-out에서 +21.4pp, generalization 효과가 가장 큼 |
| Qwen3.5-35B-A3B | 15.1% → 36.0% | 23.8% → 38.1% | held-in relative gain 138%, baseline harness와의 mismatch가 컸던 것으로 해석 가능 |
| GLM-5 | 47.7% → 57.0% | 42.9% → 57.1% | 안정적인 양 split 개선 |

논문은 이 결과를 통해 Self-Harness가 단순히 observed failure에 overfit한 것이 아니라, held-out task에도 적용되는 reusable execution mechanism을 학습했다고 주장한다. 특히 acceptance rule이 split 간 trade-off를 허용하지 않기 때문에, 성능 향상이 regression gate를 통과한 harness transition이라는 점을 강조한다.

Figure 5 에서 MiniMax M2.5는 *missing artifacts → create output early*, *stalled tool loops → redirect after 50 tool calls*, *schema-invalid content → use correct content tags* 같은 edit를 retain한다. Figure 6에서 Qwen3.5는 dependency precheck, exact command retry mitigation, missing artifact recovery, tool-error-triggered middleware 중심으로 개선된다. Appendix Figure 10에서 GLM-5는 *persist PATH and verify*, *shift to build/test*, *bound, stage, inspect* 같은 execution discipline을 얻는다. 즉, 세 model이 동일한 generic prompt를 길게 받은 것이 아니라, 각 model의 failure mode에 맞는 다른 harness edit를 받았다는 점이 논문의 핵심 근거다.

다만 방법론적으로 몇 가지 한계도 분명하다.

1. failure clustering이 "exact agreement of verifier-grounded signature"에 의존하므로 evaluator와 trace attribution 품질이 전체 loop의 상한을 결정한다.
2. held-out split도 promotion gate에 사용되기 때문에 엄밀한 의미의 final blind test set은 아니다.
3. Terminal-Bench-2.0의 artifact creation, shell command, dependency, file editing failure에는 잘 맞지만, long-horizon open-world agent나 multimodal agent로 바로 일반화된다고 보기는 어렵다.
4. acceptance criterion이 Pass count non-regression이라서 safety, cost, latency, maintainability 같은 multi-objective constraint는 아직 약하다.

## 4. Conclusion & Impact

이 논문의 핵심 결론은 **agent 개선의 중요한 단위가 model weight가 아니라 harness state일 수 있다**는 것이다. Self-Harness는 fixed model이 자신의 execution trace에서 반복되는 failure mechanism을 발견하고, bounded harness edit를 제안하고, regression test를 통과한 edit만 promote함으로써 성능을 끌어올릴 수 있음을 보인다. 특히 MiniMax M2.5, Qwen3.5-35B-A3B, GLM-5에서 모두 held-out Pass가 상승했다는 점은, harness-level self-improvement가 단순 prompt tweaking을 넘어 실제 agent workflow를 바꿀 수 있음을 시사한다.

앞으로 agent 제품을 만들 때 model을 바꿀 때마다 사람이 prompt와 tool policy를 다시 튜닝하는 방식은 비용이 크다. Self-Harness류의 framework는 각 model/backend별로 failure trace를 수집하고, artifact policy, retry policy, verification policy, tool middleware, subagent decomposition 등을 자동으로 조정하는 **agent 운영 자동화 layer**가 될 수 있다. 특히 coding agent, data analysis agent, terminal automation agent, MLOps agent처럼 verifier나 test가 존재하는 환경에서는 바로 적용해볼 수 있다.

"self-improving agent"를 과장된 open-ended intelligence 문제가 아니라, **auditable harness transition problem**으로 좁혀서 다룬 점이 좋다. 어떤edit가 왜 제안되었는지, 어떤 failure pattern을 겨냥했는지, 어떤 split에서 성능이 바뀌었는지 기록할 수 있기 때문이다. 향후 연구에서는 blind test set 분리, stochastic evaluation 반복 수 증가, cost/latency-aware acceptance rule, safety regression, cross-benchmark transfer, multimodal harness surface까지 확장해볼 수 있다.
