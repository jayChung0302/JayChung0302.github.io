(function () {
  'use strict';

  var button = document.querySelector('.site-sidebar-button');
  var sidebar = document.getElementById('site-sidebar');
  if (!button || !sidebar) return;

  // Create backdrop for mobile
  var backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  document.body.appendChild(backdrop);

  function open() {
    sidebar.classList.add('sidebar-open');
    backdrop.classList.add('active');
    button.setAttribute('aria-expanded', 'true');
  }

  function close() {
    sidebar.classList.remove('sidebar-open');
    backdrop.classList.remove('active');
    button.setAttribute('aria-expanded', 'false');
  }

  // Open button
  button.addEventListener('click', function () {
    var isOpen = sidebar.classList.contains('sidebar-open');
    if (isOpen) close();
    else open();
  });

  // Close button inside sidebar
  var closeBtn = document.getElementById('sidebar-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', close);
  }

  // Backdrop click
  backdrop.addEventListener('click', close);

  // Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });

  // Swipe left to close
  var touchStartX = 0;
  var touchCurrentX = 0;
  var swiping = false;

  sidebar.addEventListener('touchstart', function (e) {
    touchStartX = e.touches[0].clientX;
    touchCurrentX = touchStartX;
    swiping = true;
  }, { passive: true });

  sidebar.addEventListener('touchmove', function (e) {
    if (!swiping) return;
    touchCurrentX = e.touches[0].clientX;
    var diff = touchStartX - touchCurrentX;
    // Only track left swipes
    if (diff > 0) {
      sidebar.style.transform = 'translateX(' + (-diff) + 'px)';
      sidebar.style.transition = 'none';
    }
  }, { passive: true });

  sidebar.addEventListener('touchend', function () {
    if (!swiping) return;
    swiping = false;
    var diff = touchStartX - touchCurrentX;
    sidebar.style.transition = '';
    sidebar.style.transform = '';

    // Close if swiped more than 80px left
    if (diff > 80) {
      close();
    }
  }, { passive: true });
})();
