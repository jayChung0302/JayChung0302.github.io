(function () {
  'use strict';

  var postContent = document.querySelector('.post-content');
  if (!postContent) return;

  // ─── 1. Code block copy button ───
  var codeBlocks = postContent.querySelectorAll('div.highlight');
  codeBlocks.forEach(function (block) {
    var wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    block.parentNode.insertBefore(wrapper, block);
    wrapper.appendChild(block);

    var btn = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.setAttribute('aria-label', 'Copy code');
    btn.textContent = 'Copy';
    wrapper.appendChild(btn);

    btn.addEventListener('click', function () {
      var code = block.querySelector('code');
      if (!code) return;
      navigator.clipboard.writeText(code.textContent).then(function () {
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = 'Copy'; }, 2000);
      });
    });
  });

  // ─── 2. Heading anchor links ───
  var headings = postContent.querySelectorAll('h2[id], h3[id], h4[id]');
  headings.forEach(function (heading) {
    var link = document.createElement('a');
    link.className = 'heading-anchor';
    link.href = '#' + heading.id;
    link.setAttribute('aria-label', 'Link to this section');
    link.textContent = '#';
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var url = window.location.origin + window.location.pathname + '#' + heading.id;
      navigator.clipboard.writeText(url);
      // Visual feedback
      link.textContent = 'Copied!';
      setTimeout(function () { link.textContent = '#'; }, 1500);
      // Still scroll to heading
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    heading.appendChild(link);
  });

  // ─── 3. External links: new tab + icon ───
  var links = postContent.querySelectorAll('a[href^="http"]');
  var siteHost = window.location.host;
  links.forEach(function (link) {
    if (link.host !== siteHost) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      // Add external icon if not already present
      if (!link.querySelector('.external-icon')) {
        var icon = document.createElement('span');
        icon.className = 'external-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = '\u2009\u2197'; // thin space + ↗
        link.appendChild(icon);
      }
    }
  });
})();
