(function () {
  'use strict';

  var toggleButton = document.getElementById('theme-toggle');
  var iconLight = document.getElementById('theme-icon-light');
  var iconDark = document.getElementById('theme-icon-dark');
  var skinDaylight = document.getElementById('skin-daylight');
  var skinMidnight = document.getElementById('skin-midnight');

  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'daylight';
  }

  function setTheme(theme) {
    if (theme === 'midnight') {
      skinDaylight.disabled = true;
      skinMidnight.disabled = false;
      iconLight.style.display = 'none';
      iconDark.style.display = 'inline';
    } else {
      skinDaylight.disabled = false;
      skinMidnight.disabled = true;
      iconLight.style.display = 'inline';
      iconDark.style.display = 'none';
    }
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  // Set initial icon state
  if (getCurrentTheme() === 'midnight') {
    iconLight.style.display = 'none';
    iconDark.style.display = 'inline';
  }

  toggleButton.addEventListener('click', function () {
    var next = (getCurrentTheme() === 'daylight') ? 'midnight' : 'daylight';
    setTheme(next);
  });

  // Listen for system preference changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'midnight' : 'daylight');
      }
    });
  }
})();
