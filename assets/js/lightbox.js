(function () {
  'use strict';

  // Create overlay element
  var overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Image preview');
  overlay.innerHTML = '<img class="lightbox-img" alt="">';
  document.body.appendChild(overlay);

  var lightboxImg = overlay.querySelector('.lightbox-img');

  // Close on overlay click or Escape key
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });

  function close() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function open(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // Attach click to all images inside post content
  var postContent = document.querySelector('.post-content');
  if (!postContent) return;

  var images = postContent.querySelectorAll('img');
  images.forEach(function (img) {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', function (e) {
      e.preventDefault();
      open(this.src, this.alt);
    });
  });
})();
