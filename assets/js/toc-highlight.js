(function () {
  'use strict';

  var tocNav = document.querySelector('.toc-nav');
  if (!tocNav) return;

  var tocLinks = tocNav.querySelectorAll('a');
  if (!tocLinks.length) return;

  // Build a map of id -> toc link
  var linkMap = {};
  var headingIds = [];
  tocLinks.forEach(function (link) {
    var hash = link.getAttribute('href');
    if (!hash || hash.indexOf('#') === -1) return;
    var id = hash.split('#').pop();
    linkMap[id] = link;
    headingIds.push(id);
  });

  if (!headingIds.length) return;

  // The scrollable container is .site-main, not window
  var scrollContainer = document.querySelector('.site-main');
  if (!scrollContainer) return;

  var activeLink = null;
  var ticking = false;

  function updateHighlight() {
    var containerTop = scrollContainer.getBoundingClientRect().top;
    var offset = 80; // px from top to trigger
    var currentId = null;

    // Find the last heading that has scrolled past the offset
    for (var i = 0; i < headingIds.length; i++) {
      var heading = document.getElementById(headingIds[i]);
      if (!heading) continue;
      var rect = heading.getBoundingClientRect();
      if (rect.top - containerTop <= offset) {
        currentId = headingIds[i];
      } else {
        break;
      }
    }

    // Update active class
    if (activeLink) {
      activeLink.classList.remove('toc-active');
    }
    if (currentId && linkMap[currentId]) {
      activeLink = linkMap[currentId];
      activeLink.classList.add('toc-active');
      // Scroll TOC to keep active item visible
      var tocRect = tocNav.getBoundingClientRect();
      var linkRect = activeLink.getBoundingClientRect();
      if (linkRect.top < tocRect.top || linkRect.bottom > tocRect.bottom) {
        activeLink.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }

    ticking = false;
  }

  scrollContainer.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(updateHighlight);
      ticking = true;
    }
  });

  // Initial highlight
  updateHighlight();
})();
