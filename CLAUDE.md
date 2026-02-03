# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jekyll 4.4.1 blog ("DOTP - Dump Of The Probing") using the Hamilton theme, deployed to GitHub Pages at https://jaychung0302.github.io. Content is in Korean (lang: ko). Author: Nate (Jisu Chung).

## Commands

```bash
bundle install                    # Install dependencies
bundle exec jekyll serve          # Local dev server at http://127.0.0.1:4000/
bundle exec jekyll build          # Production build (output: _site/)
```

Ruby 3.3.6 (via rbenv, specified in `.ruby-version`).

## Deployment

Push to `master` triggers GitHub Actions (`.github/workflows/jekyll.yml`) which builds and deploys to GitHub Pages automatically. No manual deploy step needed.

## Architecture

**Theme:** Hamilton theme defined in `jekyll-theme-hamilton.gemspec` — not a remote theme, the theme files live directly in this repo (`_layouts/`, `_sass/hamilton/`, etc.).

**Key integrations:**
- **Dark mode** — `assets/js/dark-mode.js` toggles between `daylight` and `midnight` skins, persisted in localStorage. The `skin` config in `_config.yml` is commented out since JS manages it.
- **Search** — Client-side via Lunr.js (`assets/js/search.js`), index built from `search.json`. Title boosted 10x, tags 5x, categories 3x.
- **Comments** — Disqus (`_includes/disqus.html`), only loads in production (`JEKYLL_ENV == production`).
- **Ads** — Google AdSense in `_includes/custom-head.html`, production only.
- **Analytics** — Google Analytics GA4 (`G-7GT5Q9K67G`) in `_includes/google-analytics.html`.

**Data files (`_data/`):**
- `navigation.yml` — Top nav menu items and visibility toggles
- `social.yml` — Sidebar social media links

**SCSS structure:** `_sass/hamilton/` contains all styles. Skins in `_sass/hamilton/skins/` (daylight, midnight, sunrise, sunset). Custom additions in `custom-styles.scss`.

## Writing Posts

Create files in `_posts/` named `YYYY-MM-DD-title.md` with front matter:

```yaml
---
layout: post
toc: false
title: "Post Title"
categories: misc
tags:
  - tag1
  - tag2
author: Nate
---
```

## Plugins

jekyll-seo-tag, jekyll-feed, jekyll-sitemap, jekyll-paginate (6 posts per page).
