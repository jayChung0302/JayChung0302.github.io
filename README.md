# DOTP (Dump Of The Probing)

개인 블로그 저장소입니다.

## 포스트 작성 방법

### 1. 파일 생성

`_posts` 폴더에 아래 형식으로 마크다운 파일을 생성합니다:

```
YYYY-MM-DD-제목.md
```

예시: `2024-02-03-blog-setup.md`

### 2. Front Matter 작성

파일 상단에 아래 형식으로 메타데이터를 작성합니다:

```yaml
---
layout: post
toc: false
title: 포스트 제목
categories: misc
tags:
  - tag1
  - tag2
author: Nate
---
```

### 3. 본문 작성

Front Matter 아래에 마크다운 문법으로 본문을 작성합니다.

## 로컬 미리보기

```bash
bundle exec jekyll serve
```

`http://127.0.0.1:4000/` 에서 확인 가능합니다.

## 배포

```bash
git add _posts/YYYY-MM-DD-제목.md
git commit -m "Add: 포스트 제목"
git push origin master
```

push 후 GitHub Pages가 자동으로 빌드 및 배포합니다.
