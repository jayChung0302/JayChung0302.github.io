(function () {
  'use strict';

  var button = document.querySelector('.site-sidebar-button');
  var sidebar = document.getElementById('site-sidebar');
  if (!button || !sidebar) return;

  button.addEventListener('click', function () {
    var isHidden = sidebar.style.display === 'none' || sidebar.style.display === '';
    sidebar.style.display = isHidden ? 'block' : 'none';
    button.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
  });
})();
