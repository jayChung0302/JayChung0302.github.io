---
layout: post
toc: true
title: "uv — No more pip"
categories: misc
tags:
  - python
  - uv
  - package-manager
  - productivity
author: Nate
---

![uv 벤치마크 — pip-sync 대비 약 77배 빠른 설치 속도](/imgs/1.png)

Python 프로젝트를 시작할 때마다 반복되는 의식이 있다. virtualenv 만들고, pip install 하고, requirements.txt 관리하고. 이 루틴을 깔끔하게 끝내줄 도구를 찾았다.

## uv가 뭔데

[uv](https://docs.astral.sh/uv/)는 Rust로 작성된 Python 패키지 & 프로젝트 매니저다. 가상 환경 생성, 의존성 관리, Python 버전 관리, 패키징, 심지어 formatter나 linter 같은 서드파티 도구 실행까지 하나로 처리한다.

공식 벤치마크 기준으로 pip이나 poetry 대비 **10~100배 빠르다**. 캐싱과 최적화를 적극적으로 활용해서 대규모 프로젝트에서도 빠르게 설치/업데이트가 가능하다.

## 기본 사용법

설치는 한 줄이면 된다:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

프로젝트 초기화 — `pyproject.toml`을 생성하고 환경을 세팅한다:
```bash
uv init .
```

패키지 설치 (`pip install` 대체):
```bash
uv add numpy opencv-python
```

설치된 패키지 목록 확인:
```bash
uv list
```

`pyproject.toml` 기반으로 전체 의존성 동기화:
```bash
uv sync
```

빌드 및 배포:
```bash
uv build
uv publish  # PyPI에 배포
```

기존 `requirements.txt`에서 마이그레이션하는 것도 간단하다:
```bash
uv add -r requirements.txt
uv add --dev ipykernel  # 개발용 의존성
```

IDE가 `.venv` 가상 환경을 바로 인식하기 때문에 별도 설정 없이 쓸 수 있다.

## Git에 뭘 올리고 뭘 빼야 하나

### 반드시 올려야 하는 파일

| 파일 | 설명 |
|------|------|
| `pyproject.toml` | 프로젝트 메타데이터 + 추상적 의존성 정의 |
| `uv.lock` | 정확한 패키지 버전이 기록된 lock 파일 |
| `src/` 또는 `app/` | 소스 코드 |
| `.python-version` | 고정 Python 버전 (uv가 생성) |

`uv.lock`은 `.gitignore`에 넣으면 안됨. 이 파일이 있어야 **동일한 버전**의 라이브러리를 사용할 수 있다.


### .gitignore 템플릿

uv 프로젝트에 바로 쓸 수 있는 설정:

```
# 가상 환경
.venv/
venv/
ENV/

# Python 컴파일 파일
__pycache__/
*.py[cod]
*$py.class

# 환경 변수
.env
.env.local

# 빌드
dist/
build/
*.egg-info/

# IDE
.vscode/
.idea/

# macOS
.DS_Store
```

## 정리

uv를 쓰면서 가장 크게 느낀 건 **의존성 설치 속도**다. `pip install`이 끝나길 기다리는 시간이 체감상 거의 사라졌다. 그리고 virtualenv, pip, pip-tools, poetry가 각각 맡던 역할을 하나로 통합해주니까 피로도가 상당히 내려간 느낌임.

앞으로 Python 프로젝트를 새로 시작한다면 uv부터 깔고 보는 걸 추천한다.
