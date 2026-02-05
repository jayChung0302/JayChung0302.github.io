---
layout: post
toc: true
title: "Claude Code 로 블로그 개선한 후기"
description: "Anthropic Claude Code CLI 에이전트로 Jekyll 블로그를 분석하고 FontAwesome 제거, 접근성 개선 등을 수행한 경험."
categories: misc
tags:
  - claude
  - ai
  - claude-code
  - jekyll
  - blog
author: Nate
---

요즘엔 개발할 때 AI 없이 하면 바보라는 표현이 맞는 거 같다. 이번에 신년맞이로.. 여유시간에 블로그를 좀 손봤는데, Anthropic의 [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview)를 사용해 매우 쉽게 완료했다. 터미널에서 바로 돌아가는 CLI 에이전트인데, 성능이 미쳤다.

## Claude Code 가 뭔데

Claude Code는 터미널에서 `claude` 명령어로 실행하는 AI 코딩 에이전트다. VS Code 확장이나 웹 UI가 아니라 그냥 쉘에서 돌아간다. 파일을 직접 읽고 쓰고, git도 치고, 빌드도 돌린다. 내가 작업 맥락을 설명하면 코드베이스를 탐색하고 계획을 세운 뒤 직접 구현까지 한다.

핵심은 **프로젝트 컨텍스트를 이해한다**는 것이다. 단순히 코드 조각을 생성하는 게 아니라, 내 레포의 구조와 설정 파일, 기존 코드 패턴을 파악한 상태에서 작업한다.

## CLAUDE.md — 프로젝트 메모리

처음에 "너 이 레포에서 뭘 기억하고 있어?" 하고 물어봤다. 대답은 당연히 "아무것도 모른다"였다. 매 세션이 독립적이라 이전 대화를 기억하지 못한다.

그래서 `CLAUDE.md` 파일을 만들었다. 이 파일은 Claude Code가 세션 시작 시 자동으로 읽는 프로젝트 컨텍스트 문서다. 여기에 빌드 명령어, 아키텍처, 주요 설정 등을 적어두면 새 세션에서도 "아 이건 Jekyll 블로그고, 무슨 테마 쓰고, 다크모드는 이렇게 동작하고..." 하고 파악한 상태에서 시작한다.

`/init` 명령으로 자동 생성도 되는데, 코드베이스를 알아서 분석한 뒤 적절한 내용을 채워 넣어 준다.

## 블로그 분석부터 시작

"블로그 뭘 개선하면 좋을까?"라고 물었다. 그랬더니 레포 전체를 탐색하고는 성능, 접근성, UX, SEO, 모바일, 코드 품질 등 카테고리별로 구체적인 개선점을 쭉 뽑아줬다. 그중에서 내가 관심 있는 세 가지를 골랐다:

- **UX 기능 추가** — 읽기 시간, 소셜 공유, Back-to-top
- **성능 최적화** — FontAwesome 제거, GA 이중 로드 수정
- **접근성 개선** — 포커스 인디케이터, 시맨틱 HTML, aria 속성

## Plan Mode

선택하고 나니 plan mode에 들어가서 관련 파일을 하나하나 읽으며 구현 계획을 세웠다. 수정할 파일, 각 파일의 어느 줄을 어떻게 바꿀지, 새로 만들 파일은 뭔지 정리해서 보여준다. 승인하면 바로 구현에 들어간다.

좋았던 건 plan이 꽤 구체적이라는 것이다. "FontAwesome을 제거합니다" 같은 뭉뚱그린 설명이 아니라, `_includes/head.html` 38번 줄의 스크립트 태그를 제거하고, `_includes/header.html`의 `<i class="far fa-user">` 를 어떤 SVG로 교체하고.. 이런 식이다. 큰 그림과 디테일이 같이 보인다.

## 실제로 한 작업들

### FontAwesome v5 제거 → inline SVG

이게 제일 큰 변화였다. FontAwesome v5 JS 파일이 약 100KB인데, 실제로 쓰는 아이콘은 15개 남짓이었다. 이걸 전부 inline SVG로 교체했다.

`_includes/icon.html`이라는 include 파일을 만들어서 `{%raw%}{% include icon.html name="sun" %}{%endraw%}` 같은 식으로 호출하게 했다. `_data/social.yml`도 FontAwesome 클래스명 대신 심플한 아이콘 이름으로 바꿨다.

### GA 이중 로드 수정

`_layouts/default.html`과 `_includes/head.html` 양쪽에서 Google Analytics를 include하고 있었다. 게다가 `default.html` 쪽은 production 체크도 없어서 개발 환경에서도 GA가 로드됐다. `default.html`의 중복 include를 제거했다.

이건 사실 직접 발견하기 어려운 류의 버그다. 두 파일이 분리되어 있다 보니 눈에 안 들어온다.

### 접근성 개선

- 사이드바 토글이 `<a onclick="...">` 였는데, `<button aria-expanded="false" aria-controls="site-sidebar">`로 변경
- `.theme-toggle`과 `.search-input`의 `outline: none`을 `:focus-visible`로 교체
- `<label for="search-input">` 추가 (sr-only)
- 소셜 아이콘에 `aria-label` 추가
- Skip-to-content 링크 추가
- 포스트 이미지의 `![img]` → 의미 있는 alt 텍스트로 교체

### UX 기능

- 포스트 헤더에 **읽기 시간** 표시 (`N min read`)
- **소셜 공유 버튼**: X(Twitter), LinkedIn, URL 복사
- **Back-to-top 버튼**: 300px 이상 스크롤하면 나타남

총 13개 파일 수정, 3개 신규 생성. 마지막에 `bundle exec jekyll build`로 빌드 확인까지 해줬다.

## 느낀 점

**좋았던 것:**
- 코드베이스 전체를 읽고 문제를 찾아내는 능력이 인상적이다. GA 이중 로드 같은 건 사람이 놓치기 쉬운 부분인데 잘 잡아냈다.
- plan mode에서 구현 전에 계획을 보여주고 승인을 받는 흐름이 안심이 된다. 갑자기 이상한 데를 건드리진 않는다.
- 파일을 수정한 뒤 빌드를 돌려 에러가 없는지 검증하는 것까지 한다.

**아쉬웠던 것:**
- 세션 간 기억이 없다. `CLAUDE.md`로 보완할 수 있지만, 이전 세션에서 뭘 했는지는 모른다.
- 가끔 한번에 너무 많은 걸 바꾸려 해서, 의도적으로 범위를 좁혀주는 게 중요하다.

## 마무리

터미널에서 자연어로 "블로그 뭐 개선하면 좋을까?"하고 물어보면 분석하고 계획 세우고 구현까지 해주는 게 신기하긴 하다. 특히 레포 전체를 컨텍스트로 잡고 작업하는 점이 단순 코드 생성 도구와의 차이점이다.

다만 만능은 아니다. 어디까지나 도구고, 뭘 시킬지 판단하고 결과를 검수하는 건 여전히 내 몫이다. 잘 쓰면 생산성이 상당히 올라가는 건 확실하다.
