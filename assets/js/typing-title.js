(function () {
  'use strict';

  var el = document.getElementById('typed-title');
  if (!el) return;

  var fullText = 'DOTP';
  var subtitle = ' — Dump Of The Probing';
  var i = 0;
  var phase = 'title'; // 'title' → 'pause' → 'subtitle'

  function typeTitle() {
    if (i <= fullText.length) {
      el.textContent = fullText.slice(0, i);
      i++;
      setTimeout(typeTitle, 150);
    } else {
      phase = 'pause';
      setTimeout(typeSubtitle, 400);
    }
  }

  var j = 0;
  function typeSubtitle() {
    if (j <= subtitle.length) {
      el.textContent = fullText + subtitle.slice(0, j);
      j++;
      setTimeout(typeSubtitle, 40);
    } else {
      // Done — hide cursor after a moment
      setTimeout(function () {
        var cursor = document.querySelector('.typing-cursor');
        if (cursor) cursor.classList.add('cursor-done');
      }, 1500);
    }
  }

  // Only animate on first visit per session
  if (sessionStorage.getItem('titleTyped')) {
    el.textContent = fullText + subtitle;
    var cursor = document.querySelector('.typing-cursor');
    if (cursor) cursor.style.display = 'none';
    return;
  }

  sessionStorage.setItem('titleTyped', '1');
  setTimeout(typeTitle, 300);
})();
