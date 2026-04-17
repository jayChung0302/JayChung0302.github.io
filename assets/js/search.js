(function () {
  'use strict';

  var searchInput = document.getElementById('search-input');
  var resultsContainer = document.getElementById('search-results');
  var noResults = document.getElementById('search-no-results');
  var documents = [];
  var idx;
  var ready = false;
  var pendingQuery = null;

  fetch(searchInput.dataset.jsonUrl)
    .then(function (response) {
      if (!response.ok) throw new Error('search.json fetch failed: ' + response.status);
      return response.json();
    })
    .then(function (data) {
      documents = data;

      idx = lunr(function () {
        // Remove English-only pipeline functions for Korean/multilingual support
        // lunr.trimmer uses \W which strips all non-ASCII (including Korean)
        this.pipeline.remove(lunr.trimmer);
        this.pipeline.remove(lunr.stemmer);
        this.pipeline.remove(lunr.stopWordFilter);
        this.searchPipeline.remove(lunr.trimmer);
        this.searchPipeline.remove(lunr.stemmer);
        this.searchPipeline.remove(lunr.stopWordFilter);

        this.ref('url');
        this.field('title', { boost: 10 });
        this.field('tags', { boost: 5 });
        this.field('categories', { boost: 3 });
        this.field('content');

        data.forEach(function (doc) {
          this.add({
            url: doc.url,
            title: doc.title,
            tags: doc.tags ? doc.tags.join(' ') : '',
            categories: doc.categories ? doc.categories.join(' ') : '',
            content: doc.content
          });
        }, this);
      });

      ready = true;

      var params = new URLSearchParams(window.location.search);
      var urlQuery = params.get('q');
      if (urlQuery) {
        searchInput.value = urlQuery;
        performSearch(urlQuery);
      } else if (pendingQuery !== null) {
        performSearch(pendingQuery);
        pendingQuery = null;
      }
    })
    .catch(function (err) {
      console.error('Search index init failed:', err);
      noResults.textContent = '검색 인덱스 로드에 실패했습니다.';
      noResults.style.display = 'block';
    });

  searchInput.addEventListener('input', function () {
    var query = this.value.trim();
    if (query.length < 1) {
      resultsContainer.innerHTML = '';
      noResults.style.display = 'none';
      return;
    }
    if (!ready) {
      pendingQuery = query;
      noResults.style.display = 'none';
      resultsContainer.innerHTML = '<li class="search-result-count">검색 인덱스 로딩 중…</li>';
      return;
    }
    performSearch(query);
  });

  function buildQuery(raw) {
    // Tokenize by whitespace; for each token, search both exact and prefix wildcard
    return raw.split(/\s+/).filter(Boolean).map(function (t) {
      var safe = t.replace(/[*+\-:~^()]/g, '');
      if (!safe) return '';
      return safe + ' ' + safe + '*';
    }).join(' ');
  }

  function performSearch(query) {
    var results;
    try {
      results = idx.search(buildQuery(query));
    } catch (e) {
      try {
        results = idx.search(query.replace(/[*+\-:~^()]/g, ''));
      } catch (e2) {
        results = [];
      }
    }

    if (results.length === 0) {
      resultsContainer.innerHTML = '';
      noResults.style.display = 'block';
      return;
    }

    noResults.style.display = 'none';
    var html = '<li class="search-result-count">' + results.length + '개의 결과</li>';
    results.forEach(function (result) {
      var doc = documents.find(function (d) { return d.url === result.ref; });
      if (doc) {
        html += '<li>';
        html += '<h2><a href="' + doc.url + '">' + escapeHtml(doc.title) + '</a></h2>';
        html += '<p class="post-meta"><time>' + doc.date + '</time></p>';
        var snippet = doc.content.substring(0, 200) + '...';
        html += '<div class="post-excerpt">' + escapeHtml(snippet) + '</div>';
        html += '</li>';
      }
    });
    resultsContainer.innerHTML = html;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }
})();
