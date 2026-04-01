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

  button.addEventListener('click', function () {
    var isOpen = sidebar.classList.contains('sidebar-open');
    if (isOpen) {
      close();
    } else {
      open();
    }
  });

  backdrop.addEventListener('click', close);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });
})();
