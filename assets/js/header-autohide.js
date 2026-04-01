(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  var scrollContainer = document.querySelector('.site-main');
  if (!header || !scrollContainer) return;

  var lastScrollTop = 0;
  var threshold = 50; // minimum scroll before toggling
  var ticking = false;

  function update() {
    var scrollTop = scrollContainer.scrollTop;
    var delta = scrollTop - lastScrollTop;

    if (delta > threshold) {
      // Scrolling down — hide header
      header.classList.add('header-hidden');
      lastScrollTop = scrollTop;
    } else if (delta < -threshold) {
      // Scrolling up — show header
      header.classList.remove('header-hidden');
      lastScrollTop = scrollTop;
    }

    // Always show at top
    if (scrollTop < threshold) {
      header.classList.remove('header-hidden');
      lastScrollTop = scrollTop;
    }

    ticking = false;
  }

  scrollContainer.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  });
})();
