---
layout: post
toc: true
title: "Espanso — easy open-source text replacement & shortcut"
description: "TextExpander 평생 라이선스 서버 종료 후 Espanso로 마이그레이션. 무료 오픈소스 텍스트 확장기 소개와 설정 방법."
categories: misc
tags:
  - productivity
  - espanso
  - automation
  - open-source
author: Nate
---

TextExpander 평생 라이선스를 구매해서 잘 쓰고 있었는데, 어느 날 갑자기 활성화가 안 된다. 확인해보니 라이선스 서버가 종료됐단다. 평생 라이선스라며?

## TextExpander에 무슨 일이

![The discontinuation of TextExpander's legacy license servers has rendered my lifetime purchase useless, leading me to lose trust in cloud-dependent paid services despite their offer of a one-year free subscription](/imgs/4.png)
TextExpander 측에서 온 메일 내용을 요약하면 이렇다:

> 구버전 평생 라이선스를 관리하던 서드파티 서버가 운영을 종료했습니다. 라이선스 인증 서버가 없어졌기 때문에, 기존 라이선스 키로는 더 이상 활성화가 불가능합니다.

평생 라이선스를 샀는데 서버가 꺼지면 끝이라니. 보상으로 구독 서비스 1년 무료를 제안하긴 했지만, 그 이후엔 또 구독료를 내야 한다. 이런 경험을 하니 클라우드 의존적인 유료 서비스에 대한 신뢰가 확 떨어졌다.

그래서 대안을 찾았다. **Espanso**.

## Espanso란

Espanso는 한마디로 **오픈소스 텍스트 확장기**다. 자주 사용하는 긴 문장, 이메일 주소, 코드 조각 등을 짧은 단축어로 등록해두고, 타이핑하면 즉시 변환해준다.

### 주요 특징

- **크로스 플랫폼**: Windows, macOS, Linux 모두 지원
- **오픈소스 & 무료**: 비용 없음, 프라이버시 걱정 없음
- **Rust 기반**: 가볍고 빠름, 시스템 자원 거의 안 먹음
- **텍스트 기반 설정**: YAML 파일로 단축어 관리. Git으로 동기화 가능
- **강력한 확장성**: 날짜 삽입, 쉘 스크립트 실행, 폼 입력 등 복잡한 자동화 지원

### 설치

```bash
# macOS (Homebrew)
brew install espanso

# Windows (Winget)
winget install espanso

# Linux
# https://espanso.org/install/ 참고
```

설치 후 `espanso start`로 실행하면 된다.

## 기본 사용법

설정 파일 위치:
- macOS: `~/.config/espanso/match/base.yml`
- Windows: `%APPDATA%\espanso\match\base.yml`

### 기본 예제

```yaml
matches:
  # 이메일 주소
  - trigger: ":email"
    replace: "myemail@example.com"

  # 인사말
  - trigger: ":hello"
    replace: "안녕하세요, 문의 주셔서 감사합니다."

  # 특수 기호
  - trigger: "::shrug"
    replace: "¯\\_(ツ)_/¯"
```

이제 어디서든 `:email`을 입력하면 이메일 주소로 자동 변환된다.

### 동적 값 삽입

```yaml
matches:
  # 오늘 날짜
  - trigger: ":date"
    replace: "{{date}}"
    vars:
      - name: date
        type: date
        params:
          format: "%Y-%m-%d"

  # 현재 시간
  - trigger: ":time"
    replace: "{{time}}"
    vars:
      - name: time
        type: date
        params:
          format: "%H:%M"

  # 클립보드 내용 활용
  - trigger: ":clip"
    replace: "클립보드: {{clipboard}}"
    vars:
      - name: clipboard
        type: clipboard
```

### 쉘 스크립트 실행

```yaml
matches:
  # 현재 Git 브랜치
  - trigger: ":branch"
    replace: "{{output}}"
    vars:
      - name: output
        type: shell
        params:
          cmd: "git branch --show-current"
```

### 폼 입력

```yaml
matches:
  - trigger: ":meeting"
    form: |
      회의록
      --------
      일시: [[date]]
      참석자: [[attendees]]
      안건: [[agenda]]
```

`:meeting` 입력 시 폼이 뜨고, 각 필드를 채우면 완성된 템플릿이 삽입된다.

## TextExpander에서 마이그레이션

기존 TextExpander 스니펫을 Espanso로 옮기는 건 수동으로 해야 한다. 다행히 TextExpander 앱에서 스니펫 그룹을 우클릭해 내보내기가 가능하다. 내보낸 파일을 보면서 YAML로 옮겨 적으면 된다.

스니펫이 많다면 좀 귀찮긴 하지만, 한 번 옮기고 나면 Git으로 버전 관리도 되고 여러 기기 간 동기화도 자유롭다.

## 왜 Espanso인가

| | TextExpander | Espanso |
|---|--------------|---------|
| 가격 | 연 $59.95 (구독) | 무료 |
| 라이선스 | 클라우드 의존 | 로컬, 서버 불필요 |
| 설정 | GUI | YAML (Git 동기화 가능) |
| 플랫폼 | macOS, Windows, iOS | macOS, Windows, Linux |
| 확장성 | 제한적 | 쉘 스크립트, 폼 등 |

TextExpander 사태를 겪고 나니, 로컬에서 돌아가고 서버 의존성이 없다는 게 얼마나 큰 장점인지 체감했다. 설정 파일 기반이라 처음엔 약간의 진입장벽이 있지만, 개발자라면 오히려 이 방식이 더 편하다.

## 정리

평생 라이선스라고 믿고 산 서비스가 서버 종료로 못 쓰게 되는 경험은 꽤 허탈하다. 이번 기회에 오픈소스, 로컬 우선 도구의 가치를 다시 느꼈다.

텍스트 확장기가 필요하다면 Espanso를 추천한다. 무료고, 빠르고, 내 데이터는 내 컴퓨터에 있다.

- 공식 사이트: [espanso.org](https://espanso.org/)
- GitHub: [espanso/espanso](https://github.com/espanso/espanso)
- 문서: [espanso.org/docs](https://espanso.org/docs/)
