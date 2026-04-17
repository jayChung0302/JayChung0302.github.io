(function () {
  'use strict';

  var tocNav = document.querySelector('.toc-nav');
  if (!tocNav) return;

  var tocLinks = tocNav.querySelectorAll('a');
  if (!tocLinks.length) return;

  var linkMap = {};
  var headings = [];

  tocLinks.forEach(function (link) {
    var hash = link.getAttribute('href');
    if (!hash || hash.indexOf('#') === -1) return;
    var id = hash.split('#').pop();
    var heading = document.getElementById(id);
    if (!heading) return;
    linkMap[id] = link;
    headings.push({ id: id, el: heading });
  });

  if (!headings.length) return;

  var activeLink = null;
  var ticking = false;

  function updateHighlight() {
    var threshold = 100;
    var currentId = null;

    for (var i = 0; i < headings.length; i++) {
      if (headings[i].el.getBoundingClientRect().top <= threshold) {
        currentId = headings[i].id;
      }
    }

    if (activeLink) {
      activeLink.classList.remove('toc-active');
    }
    if (currentId && linkMap[currentId]) {
      activeLink = linkMap[currentId];
      activeLink.classList.add('toc-active');
      var tocRect = tocNav.getBoundingClientRect();
      var linkRect = activeLink.getBoundingClientRect();
      if (linkRect.top < tocRect.top || linkRect.bottom > tocRect.bottom) {
        activeLink.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(updateHighlight);
      ticking = true;
    }
  }

  // Listen on both possible scroll containers
  var siteMain = document.querySelector('.site-main');
  if (siteMain) siteMain.addEventListener('scroll', onScroll);
  window.addEventListener('scroll', onScroll);

  updateHighlight();
})();
