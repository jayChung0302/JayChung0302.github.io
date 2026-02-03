(function () {
  'use strict';

  var btn = document.querySelector('.back-to-top');
  var main = document.getElementById('site-main');
  if (!btn || !main) return;

  main.addEventListener('scroll', function () {
    btn.style.display = main.scrollTop > 300 ? '' : 'none';
  });

  btn.addEventListener('click', function () {
    main.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
