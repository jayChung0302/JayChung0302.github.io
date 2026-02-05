---
layout: post
toc: true
title: "블로그 기능 업데이트 기록"
description: "Jekyll 블로그에 다크 모드, Lunr.js 검색, Disqus 댓글, AdSense 광고를 추가한 과정 정리."
categories: misc
tags:
  - jekyll
  - blog
  - darkmode
  - disqus
  - search
  - adsense
author: Nate
---

오랜만에 블로그를 다시 들여다봤다. 글을 쓰려니 기본 기능이 너무 부실해서, 글쓰기 전에 블로그 자체를 좀 손보기로 했다. 하루 동안 꽤 많은 걸 넣었는데 기록 겸 정리해본다.

## 다크 모드

요즘 다크 모드 없는 사이트가 있나 싶을 정도로 기본이 된 기능이다. 헤더에 해/달 아이콘 토글 버튼을 넣었고, `localStorage`에 사용자 선택을 저장해서 재방문 시에도 유지되도록 했다. 시스템 설정(`prefers-color-scheme`)도 감지해서 처음 방문하는 경우엔 OS 설정을 따른다.

기술적으로는 `skin-daylight.css`와 `skin-midnight.css` 두 개의 스킨을 만들어 놓고, JS에서 `<link>` 태그의 `disabled` 속성을 토글하는 방식이다. 페이지 렌더 전에 테마를 적용하는 early-init 스크립트를 넣어서 화면이 번쩍이는 현상(FOIT)도 방지했다.

## 클라이언트 사이드 검색 (Lunr.js)

Jekyll은 정적 사이트라 서버 사이드 검색이 안 된다. [Lunr.js](https://lunrjs.com/)를 사용해서 빌드 타임에 검색 인덱스(`search.json`)를 생성하고, 브라우저에서 전문 검색이 가능하도록 구현했다.

검색 가중치는 다음과 같이 설정했다:
- `title`: boost 10
- `tags`: boost 5
- `categories`: boost 3
- `content`: boost 1

최소 2글자 이상 입력하면 실시간으로 결과가 나오고, 결과에는 본문 처음 200자 미리보기가 표시된다. 네비게이션 메뉴에 검색 링크도 추가했다.

## Disqus 댓글

정적 사이트에서 댓글 기능을 붙이려면 외부 서비스가 필요하다. Disqus를 선택했고 production 환경에서만 로드되도록 조건을 걸었다. `page.url | absolute_url`로 각 포스트의 고유 URL을 Disqus에 전달해서 댓글이 올바른 페이지에 연결되도록 했다.

처음에 `_config.yml`에 `url` 설정이 빠져 있어서 `absolute_url` 필터가 제대로 동작하지 않는 문제가 있었는데, 사이트 URL을 명시해 주니 해결됐다.

## 관련 포스트 (Related Posts)

각 글 하단에 관련 포스트를 최대 3개까지 보여주도록 했다. 같은 태그나 카테고리를 공유하는 포스트를 수집하는 방식이고, 태그 매칭을 우선 처리한 뒤 카테고리 매칭으로 보충한다. 현재 글은 자동으로 제외되고 중복도 걸러진다.

## Google AdSense

수익화를 위해 AdSense auto-ads 스크립트를 `custom-head.html`에 삽입했다. Disqus와 마찬가지로 `jekyll.environment == 'production'` 조건을 걸어서 로컬 개발 환경에서는 광고가 뜨지 않도록 했다.

## 성능 개선

### Google Fonts 최적화
기존에 사용하던 Google Fonts v1 API를 v2로 마이그레이션하고 `display=swap` 파라미터를 추가했다. 폰트 로딩 중에 시스템 폰트를 보여주다가 웹 폰트가 준비되면 교체하는 방식이라 사용자가 빈 텍스트를 보게 되는 걸 막아준다. `preconnect` 힌트도 추가해서 DNS 조회와 연결 수립을 미리 해 둔다.

그리고 사용하지 않던 중국어 폰트 5개를 제거해서 불필요한 요청을 줄였다.

### 죽은 외부 서비스 제거
사이드바에 있던 `hits.seeyoufarm.com` 방문자 배지가 서비스 장애(`ECONNREFUSED`)로 응답이 오지 않아 브라우저의 load 이벤트가 발화되지 않는 문제가 있었다. 페이지가 다 그려졌는데도 탭 스피너가 계속 도는 현상이었다. 해당 배지를 제거해서 해결했다.

### OG Image 기본값 설정
소셜 미디어 공유 시 썸네일이 표시되도록 `_config.yml`에 `og_image` 기본값을 설정했다.

## 마무리

하루 만에 꽤 많은 기능을 넣은 것 같다. 아직 글은 몇 개 없지만 인프라가 갖춰졌으니 이제 글 쓰는 일에 집중할 수 있겠다.
