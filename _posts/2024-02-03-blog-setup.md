---
layout: post
toc: false
title: Jekyll blog setup
categories: misc
tags:
  - jekyll
  - ruby
  - bundler
author: Nate
---

첫 글은 역시 Jekyll 을 사용해 간단하게 블로그를 만드는데도 고생을 겪는 나같은 분들을 위한 글이다.
기본적인 스텝은 이 웹사이트 [jekyll-kor] 를 따르는 걸 추천한다.

나는 M1 Macbook 환경에서 진행했다.


- `gem install jekyll bundler`
	- 계속 에러가 났다.
		- 루비가 설치되지 않았기 때문이다.
- rbenv 설치
	- `brew install rbenv`
- rbenv 초기화
	- `rbenv init`
- 설치 가능한 버전 확인
	- `rbenv install -l`
- 적당한 버전으로 루비 설치
	- `sudo rbenv install 3.0.5`
- global 에 설치버전 설정
	- `sudo rbenv global 3.0.5`
- 아래 두개 버전 맞는지 확인
	- `ruby -v`
	- `rbenv versions`

만약에 위 두 명령어로 출력된 버전이 다르다면.. 에러가 발생한다.
이를 해결하려면 환경변수 설정을 통해 바라보는 버전을 맞춰줘야 한다.
- 환경변수 설정
	- `export PATH="$HOME/.rbenv/shims:$PATH"`
	- `export PATH="/Users/chung/.gem/ruby/3.0.5/bin:$PATH"`
- 이렇게 해주니 두개 버전 같은거 확인됐고.. 
	- `gem install jekyll bunlder` 도 해결됐다.
	  
- 매번하기 귀찮으니 zshrc 에 환경변수 수정
```bash
echo 'export PATH="$HOME/.rbenv/shims:$PATH"' >> ~/.zshrc
echo 'eval "$(rbenv init -)"' >> ~/.zshrc
source ~/.zshrc
```

- Jeykll build
	- `sudo jekyll new [blog_name~(ex)myblog]`

- Jeykll serving
	- `sudo bundle exec jekyll serve`
		- 로컬 `http://127.0.0.1:4000/` 주소에서 홈페이지를 확인할 수 있다.

- Jekyll 을 사용하는 이유는 그대로 써도 좋을만큼 우수한 퀄리티의 무료 테마들이 매우 많다는 것이다. [이쪽]에서 마음에 드는걸 고르면 된다.


[jekyll-kor]: https://jekyllrb-ko.github.io/
[이쪽]: http://jekyllthemes.org/
