(function () {
  'use strict';

  // Create overlay element
  var overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Image preview');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = '<button class="lightbox-close" aria-label="Close image preview">&times;</button><img class="lightbox-img" alt="" tabindex="0">';
  document.body.appendChild(overlay);

  var lightboxImg = overlay.querySelector('.lightbox-img');
  var closeBtn = overlay.querySelector('.lightbox-close');
  var previouslyFocused = null;

  // Close handlers
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') close();
    // Trap focus within lightbox
    if (e.key === 'Tab') {
      e.preventDefault();
      if (document.activeElement === closeBtn) {
        lightboxImg.focus();
      } else {
        closeBtn.focus();
      }
    }
  });

  function close() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    if (previouslyFocused) {
      previouslyFocused.focus();
      previouslyFocused = null;
    }
  }

  function open(src, alt) {
    previouslyFocused = document.activeElement;
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  // Attach click to all images inside post content
  var postContent = document.querySelector('.post-content');
  if (!postContent) return;

  var images = postContent.querySelectorAll('img');
  images.forEach(function (img) {
    img.style.cursor = 'zoom-in';
    img.setAttribute('tabindex', '0');
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', (img.alt || 'Image') + ' — click to enlarge');
    img.addEventListener('click', function (e) {
      e.preventDefault();
      open(this.src, this.alt);
    });
    img.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(this.src, this.alt);
      }
    });
  });
})();
