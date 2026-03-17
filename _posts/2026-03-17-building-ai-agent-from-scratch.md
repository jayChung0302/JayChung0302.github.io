---
layout: post
toc: true
title: "AI Agent 설계 가이드 — Tool Loop 구조부터 Skill 패턴까지"
categories: ai
tags:
  - AI
  - agent
  - Claude
  - tool-use
  - LLM
author: Nate
---

LLM API를 호출해서 답변을 받는 건 쉽다. 하지만 agent를 만들려면 구조가 달라진다. 핵심은 **LLM이 tool을 호출하고, 그 결과를 다시 받아서 판단하는 루프**를 만드는 것이다. 이 글에서는 Claude API 기반으로 실제 동작하는 agent를 처음부터 설계하는 방법을 정리한다.

## Agent의 핵심 — Tool Loop

일반적인 LLM 호출은 단방향이다. 질문 → 답변. 하지만 agent는 다르다.

```
사용자 질문
    ↓
LLM 호출
    ↓
tool_use 응답? ──Yes──→ tool 실행 → 결과를 messages에 추가 → LLM 재호출
    │                                                            ↑
    No                                                           │
    ↓                                                            │
최종 답변 반환                          (반복) ←─────────────────┘
```

핵심 개념은 **tool 실행 결과를 다시 messages에 붙여서 재호출하는 루프**다. LLM이 "더 이상 tool이 필요 없다"고 판단할 때까지 이 루프가 반복된다.

## 프로젝트 구조

```
my-agent/
├── prompts/
│   └── system.md          # 시스템 프롬프트
├── skills/
│   └── web_search.md      # Skill 지침서
├── tools/
│   ├── definitions.py     # Tool 스키마
│   ├── web_search.py      # Tool 구현
│   └── read_file.py       # Tool 구현
└── agent.py               # 메인 루프
```

각 구성요소의 역할을 정리하면 이렇다.

| 구성요소 | 역할 | 형식 |
|----------|------|------|
| `system.md` | agent 페르소나 + 기본 규칙 | 마크다운 |
| `skills/*.md` | 작업별 세부 지침 (how-to) | 마크다운 |
| `tools/definitions.py` | Claude에 노출할 tool 목록 | JSON Schema |
| `tools/*.py` | tool 실제 실행 코드 | Python 함수 |
| `agent.py` | API 루프 + tool 라우팅 | Python |

## 1. 시스템 프롬프트 — `prompts/system.md`

요즘 잘 만든 agent들이 공통적으로 넣는 섹션들이 있다.

```markdown
# Role
당신은 리서치 assistant입니다. 사용자의 질문에 web_search와
read_file 도구를 활용해 정확한 답변을 제공합니다.

# Skills
다음 skill 지침서를 참고해 작업하세요:
- 검색이 필요할 때: skills/web_search.md
- 코드 작성이 필요할 때: skills/code_writer.md

# Rules
- tool을 쓰기 전에 반드시 이유를 한 줄 설명하세요
- 확실하지 않은 사실은 검색으로 확인하세요
- 응답은 한국어로 하세요

# Output format
- 최종 답변은 마크다운으로 정리
- 출처가 있으면 링크 포함
```

**Role**, **Skills**, **Rules**, **Output format** 네 가지 섹션으로 나누면 LLM이 구조적으로 잘 따른다. 시스템 프롬프트가 길어질수록 이런 명시적 구분이 중요하다.

## 2. Skill 지침서 — `skills/web_search.md`

```markdown
# Web search skill

## 언제 쓰나
- 최신 정보가 필요할 때
- 사실 확인이 필요할 때

## 쿼리 작성 규칙
- 한국어보다 영어 검색이 더 풍부한 결과를 냄
- 연도를 쿼리에 포함하면 최신 결과 확보 가능
- 예: "Claude API pricing 2026 official"

## 결과 처리
- 상위 3개 결과를 비교해 교차 확인
- 출처 URL을 반드시 기록
```

Skill은 **Claude가 읽고 따르는 마크다운 문서**다. 코드가 아니라 자연어 지침이라는 게 핵심이다. 코드 수정 없이 이 문서만 업데이트하면 agent의 행동이 바뀐다.

## 3. Tool 스키마 — `tools/definitions.py`

```python
TOOLS = [
    {
        "name": "web_search",
        "description": "웹에서 최신 정보를 검색합니다. 시사, 가격, 문서 등 실시간 정보에 사용.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "검색어 (영어 권장)"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "read_file",
        "description": "로컬 파일을 읽어 내용을 반환합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "파일 경로"
                }
            },
            "required": ["path"]
        }
    }
]
```

`description`이 중요하다. Claude는 이 설명을 보고 어떤 tool을 써야 할지 판단한다. 설명이 모호하면 엉뚱한 tool을 호출하거나 아예 호출하지 않는다.

## 4. 메인 루프 — `agent.py`

이 파일이 agent의 핵심이다.

```python
import anthropic
import json
from pathlib import Path
from tools.definitions import TOOLS
from tools.web_search import web_search
from tools.read_file import read_file

client = anthropic.Anthropic()  # ANTHROPIC_API_KEY 자동 로드

def load_prompt(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")

def execute_tool(name: str, inputs: dict) -> str:
    """tool 이름에 따라 실제 함수 실행"""
    if name == "web_search":
        return web_search(inputs["query"])
    elif name == "read_file":
        return read_file(inputs["path"])
    return f"Unknown tool: {name}"

def run_agent(user_message: str) -> str:
    system_prompt = load_prompt("prompts/system.md")

    # skills도 system prompt에 동적으로 주입 가능
    skill_context = load_prompt("skills/web_search.md")
    system_prompt += f"\n\n---\n{skill_context}"

    messages = [{"role": "user", "content": user_message}]

    while True:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=system_prompt,
            tools=TOOLS,
            messages=messages
        )

        # 최종 응답 (tool 없음)
        if response.stop_reason == "end_turn":
            return response.content[0].text

        # tool_use 블록 처리
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                print(f"[tool] {block.name}({block.input})")
                result = execute_tool(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result
                })

        # messages에 응답 + 결과 추가 후 재호출
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})

if __name__ == "__main__":
    answer = run_agent("Claude API Sonnet 4.6 가격이 얼마야? 검색해서 알려줘")
    print(answer)
```

## 루프를 한 줄씩 뜯어보면

### messages 구조의 변화

agent가 tool을 한 번 호출한 뒤의 `messages` 상태는 이렇게 된다.

```python
[
    {"role": "user", "content": "Claude API 가격이 얼마야?"},
    {"role": "assistant", "content": [TextBlock(...), ToolUseBlock(name="web_search", ...)]},
    {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "...", "content": "..."}]}
]
```

`tool_result`가 `user` role로 들어간다는 점이 중요하다. Claude 입장에서는 "내가 tool을 요청했고, 사용자(시스템)가 결과를 돌려준 것"으로 인식한다.

### stop_reason으로 분기

```python
if response.stop_reason == "end_turn":  # 더 이상 tool 필요 없음
    return response.content[0].text
# 그 외 → tool_use가 있으므로 루프 계속
```

`stop_reason`이 `"end_turn"`이면 Claude가 최종 답변을 내놓은 것이다. `"tool_use"`면 아직 작업 중이라는 뜻이므로 tool을 실행하고 결과를 다시 넘겨야 한다.

## Skill 패턴이 강력한 이유

모든 노하우를 **코드가 아닌 마크다운으로 분리**해두고, agent가 필요할 때 system prompt에 동적으로 주입하거나 `read_file` tool로 직접 읽어오게 하는 구조다.

```
코드 변경 없이 지침만 수정 → agent 행동이 바뀜
```

이게 왜 좋은가:

- **유지보수가 쉽다** — 비개발자도 마크다운 수정으로 agent 행동을 조정할 수 있다
- **버전 관리가 된다** — git으로 지침 변경 이력을 추적할 수 있다
- **조합이 자유롭다** — 태스크에 따라 다른 skill 조합을 system prompt에 주입하면 된다

## 확장 포인트

이 기본 구조 위에 얹을 수 있는 것들이다.

| 확장 | 방법 |
|------|------|
| **멀티 에이전트** | `run_agent()`를 여러 개 만들고 orchestrator가 분기 |
| **메모리** | 대화 이력을 파일/DB에 저장하고 messages에 주입 |
| **Streaming** | `client.messages.create()` 대신 `client.messages.stream()` 사용 |
| **에러 처리** | tool 실행 실패 시 `is_error: true`로 결과 반환 |
| **Max turns 제한** | `while True` 대신 카운터로 무한 루프 방지 |

## 정리

Agent의 본질은 단순하다.

> **LLM 호출 → tool 실행 → 결과 추가 → 재호출**

이 루프를 이해하면 나머지는 전부 응용이다. 시스템 프롬프트로 페르소나를 잡고, skill 마크다운으로 세부 지침을 관리하고, tool schema로 능력을 정의하면 된다. 코드는 놀라울 정도로 짧다 — `agent.py` 하나가 50줄도 안 된다.
