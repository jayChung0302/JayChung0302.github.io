(function () {
  'use strict';

  // Only on post pages
  var postContent = document.querySelector('.post-content');
  if (!postContent) return;

  // Create progress bar
  var bar = document.createElement('div');
  bar.className = 'reading-progress-bar';
  document.body.appendChild(bar);

  var scrollContainer = document.querySelector('.site-main');
  if (!scrollContainer) return;

  var ticking = false;

  function updateProgress() {
    var scrollTop = scrollContainer.scrollTop;
    var scrollHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight;
    var progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    bar.style.width = Math.min(progress, 100) + '%';
    ticking = false;
  }

  scrollContainer.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(updateProgress);
      ticking = true;
    }
  });

  updateProgress();
})();
