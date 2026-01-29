(function () {
  'use strict';

  var searchInput = document.getElementById('search-input');
  var resultsContainer = document.getElementById('search-results');
  var noResults = document.getElementById('search-no-results');
  var documents = [];
  var idx;

  fetch(searchInput.baseURI.replace(/search\/?$/, '') + 'search.json')
    .then(function (response) { return response.json(); })
    .then(function (data) {
      documents = data;

      idx = lunr(function () {
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

      var params = new URLSearchParams(window.location.search);
      var query = params.get('q');
      if (query) {
        searchInput.value = query;
        performSearch(query);
      }
    });

  searchInput.addEventListener('input', function () {
    var query = this.value.trim();
    if (query.length < 2) {
      resultsContainer.innerHTML = '';
      noResults.style.display = 'none';
      return;
    }
    performSearch(query);
  });

  function performSearch(query) {
    var results;
    try {
      results = idx.search(query);
    } catch (e) {
      results = idx.search(query.replace(/[*+\-:~^]/g, ''));
    }

    if (results.length === 0) {
      resultsContainer.innerHTML = '';
      noResults.style.display = 'block';
      return;
    }

    noResults.style.display = 'none';
    var html = '';
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
