# Blog Improvement History & Roadmap

> 마지막 업데이트: 2026-03-03

---

## 1. 구현 완료된 기능

| 기능 | 관련 파일 | 비고 |
|---|---|---|
| 다크모드 | `assets/js/dark-mode.js`, `_includes/head.html` | localStorage 저장, 시스템 설정 감지, FOUC 방지 |
| 클라이언트 사이드 검색 | `search.html`, `search.json`, `assets/js/search.js` | Lunr.js 기반, 제목 10x/태그 5x/카테고리 3x 부스트 |
| MathJax 3 | `_includes/mathjax.html` | `math: true` front matter로 온디맨드 로딩 |
| 목차 (TOC) | `_includes/toc.html`, `_includes/sidebar-toc.html` | 사이드바 TOC 대체 표시 |
| 읽기 시간 표시 | `_layouts/post.html`, `_layouts/home.html` | 200단어/분 기준 |
| 페이지네이션 | `_layouts/home.html` | 6개/페이지, 윈도우 방식 + 말줄임표 |
| 소셜 공유 버튼 | `_layouts/post.html` | X/Twitter, LinkedIn, URL 복사 |
| 관련 포스트 | `_layouts/post.html` | 태그 > 카테고리 기반 매칭, 최대 3개 |
| 맨 위로 버튼 | `assets/js/back-to-top.js` | sticky 포지셔닝 |
| Disqus 댓글 | `_includes/disqus.html` | production 전용, per-post opt-out 가능 |
| Google Analytics GA4 | `_includes/google-analytics.html` | DNT 존중 |
| Google AdSense | `_includes/custom-head.html` | production 전용 |
| Skip-to-content 링크 | `_layouts/default.html` | 키보드 접근성 |
| SEO 태그 | `jekyll-seo-tag` | Twitter Card, OG 이미지 설정 |
| RSS 피드 | `jekyll-feed` | 사이드바 구독 링크 |
| 사이트맵 | `jekyll-sitemap` | `robots.txt`에 선언 |
| GitHub Actions CI/CD | `.github/workflows/jekyll.yml` | master push 시 자동 배포 |

---

## 2. 알려진 버그

### HIGH - 수정 필요

| # | 문제 | 위치 | 설명 |
|---|---|---|---|
| B1 | 소셜 링크가 테마 원작자를 가리킴 | `_config.yml:39-40` | `social.links`에 `ngzhio`(Hamilton 테마 작성자) Twitter/Facebook이 남아있음. JSON-LD 구조화 데이터에 영향 |
| B2 | archive 날짜 변수 오류 | `_layouts/archive-taxonomies.html:69` | `datetime` 속성에 `page.date`(미정의) 사용, `post.date`여야 함 |
| B3 | 구형 jQuery 보안 취약점 | `dump/jquery-3.3.1.min.js` | CVE-2019-11358, CVE-2020-11022 등. 공개적으로 서빙됨 |

### MEDIUM - 개선 권장

| # | 문제 | 위치 | 설명 |
|---|---|---|---|
| B4 | 태그가 slug 형태로 표시 | `_layouts/post.html:64` | 카테고리는 원본명 표시, 태그는 `paper-review` 같은 slug로 표시 |
| B5 | Prev/Next 라벨 혼동 | `_layouts/post.html:94,103` | Jekyll의 `page.next`(최신)를 "Prev"로, `page.previous`(과거)를 "Next"로 표시 |
| B6 | 검색 URL 구성 취약 | `assets/js/search.js:10` | `baseURI` regex로 경로 추출 — `data-*` 속성으로 서버 사이드 주입이 더 안전 |

### LOW

| # | 문제 | 위치 | 설명 |
|---|---|---|---|
| B7 | `skin.scss` 사용되지 않는 파일 | `assets/css/skin.scss` | 어떤 템플릿에서도 참조하지 않는 dead code |
| B8 | `_posts/.ruby-version` 잘못된 위치 | `_posts/.ruby-version` | 루트에 이미 존재, `_posts/` 안 파일은 불필요 |

---

## 3. 개선 제안

### 성능 (Performance)

| # | 제안 | 우선도 | 설명 |
|---|---|---|---|
| P1 | GitHub Actions 캐시 활성화 | HIGH | `bundler-cache: false` → `true`로 변경. 배포 시간 60초→10초 단축 |
| P2 | Lunr.js 버전 고정 + SRI 해시 | HIGH | `unpkg.com/lunr/lunr.js` → 버전 핀닝 (`lunr@2.3.9`) + integrity 속성 추가 |
| P3 | Google Fonts 최적화 | MEDIUM | 5개 폰트 패밀리 로딩 중. `Dancing Script`는 사이트 타이틀에만 사용 — `&text=DOTP`로 서브셋 가능 |
| P4 | search.json 콘텐츠 제한 | MEDIUM | 전체 포스트 내용 포함 — 포스트 증가 시 파일 비대화. 1000자로 truncate 권장 |
| P5 | 이미지 lazy loading | LOW | `loading="lazy"` 미적용. 이미지 많은 포스트에서 초기 로딩 개선 가능 |

### SEO

| # | 제안 | 우선도 | 설명 |
|---|---|---|---|
| S1 | 구형 포스트 `description` 추가 | HIGH | `2024-02-03-blog-setup.md`, `2024-02-05-obsidian-para.md`, `2024-10-01-eogs-paper-review.md`에 description 미설정 → 검색엔진에서 중복 meta description |
| S2 | `logo` 필드 수정 | MEDIUM | `selfie2.jpg`(개인사진)가 JSON-LD Organization 로고로 사용됨. 사이트 로고/아이콘으로 변경 권장 |
| S3 | OG 이미지 일관성 | LOW | `avatar`/`og_image` = `selfie1.png`, `logo` = `selfie2.jpg` — 통일 권장 |

### 접근성 (Accessibility)

| # | 제안 | 우선도 | 설명 |
|---|---|---|---|
| A1 | 모바일 햄버거 메뉴 시맨틱 개선 | MEDIUM | `<input checkbox>` 해킹 → `<button aria-expanded>` 변경 |
| A2 | 드롭다운 `javascript:void(0)` 제거 | MEDIUM | `_includes/header.html:30` — `<button>`으로 대체 |
| A3 | 링크 `:focus-visible` 스타일 추가 | LOW | 커스텀 요소에는 적용됨, 기본 `<a>` 태그에는 미적용 |

### 코드 품질 / 정리

| # | 제안 | 우선도 | 설명 |
|---|---|---|---|
| C1 | `CLAUDE.md`를 빌드 제외 | HIGH | `_config.yml` `exclude`에 추가. 현재 프로덕션 사이트에 공개됨 |
| C2 | `dump/` 디렉토리 정리 | HIGH | CV, 포트폴리오 PDF 등 개인 문서가 공개 서빙됨. `exclude`에 추가하거나 삭제 |
| C3 | `Gemfile.lock`에 Linux 플랫폼 추가 | MEDIUM | 로컬에서 `bundle lock --add-platform x86_64-linux` 실행 후 커밋하면 CI 불필요한 스텝 제거 가능 |
| C4 | 이미지 경로 통일 | LOW | `imgs/` (포스트 이미지) vs `assets/images/` (사이트 에셋) — `assets/images/posts/`로 통합 권장 |
| C5 | 인라인 스크립트 외부화 | LOW | `post.html`의 copy-URL 스크립트를 별도 JS 파일로 분리 |
| C6 | `about.md` `<b>` 태그 정리 | LOW | 전체 본문이 `<b>` 래핑 — 가독성/시맨틱 문제 |

### UX

| # | 제안 | 우선도 | 설명 |
|---|---|---|---|
| U1 | 검색 키보드 단축키 | LOW | `/` 또는 `Ctrl+K`로 검색 포커스 |
| U2 | 검색 결과 읽기 시간 표시 | LOW | 홈페이지에는 표시, 검색 결과에는 미표시 |

---

## 4. 작업 완료 로그

아래는 실제 완료된 작업 기록입니다. 새 작업 완료 시 추가해주세요.

| 날짜 | 작업 | 커밋 |
|---|---|---|
| - | Disqus 댓글, 다크모드 토글, Lunr.js 검색 추가 | `9693dd1` |
| - | Disqus URL 수정, 검색 permalink 수정 | `6be61be` |
| - | hits.seeyoufarm.com 배지 제거 (무한 로딩 수정) | `e3dd530` |
| - | Google AdSense, 관련 포스트 섹션 추가 | `6b4b10d` |
| - | Google Fonts 최적화, 기본 OG 이미지 추가 | `e22a4da` |
| - | UX/성능/접근성 개선 + Claude Code 포스트 | `c264b51` |
| - | 읽기 시간 표시 기능 추가 | `dd2f5d5` |
| - | 태그 페이지 추가 | `fb9ebcd` |
| - | 블로그 설명 수정, 포스트별 description 추가 | `a674dda` |
| - | 페이지네이션 번호 수정, 포스트 네비게이션 간격 추가 | `bdac7b4` |
