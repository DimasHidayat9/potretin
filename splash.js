(function () {
      const splash = document.getElementById('splash-screen');
      const bar = document.getElementById('splash-progress-bar');
      const badge = document.getElementById('splash-progress-badge');
      const statusText = document.getElementById('splash-status-text');
      const statusLine = document.getElementById('splash-status-line');
      const confettiWrap = document.getElementById('splash-confetti');
      const shutter = document.getElementById('shutter-iris');
      const MIN_MS = 4200;
      const start = Date.now();

      // A few rotating lines so the wait feels like it's actually doing something,
      // instead of staring at one static sentence the whole time.
      const STATUS_LINES = [
        'Ngocok-ngocok filmnya...',
        'Nyetak fotonya...',
        'Nunggu warnanya keluar...',
        'Dikit lagi jadi...',
        'Say cheese!'
      ];
      let statusIndex = 0;
      if (statusText && statusLine && STATUS_LINES.length > 1) {
        setInterval(() => {
          statusIndex = (statusIndex + 1) % STATUS_LINES.length;
          statusLine.classList.add('status-fade');
          setTimeout(() => {
            statusText.textContent = STATUS_LINES[statusIndex];
            statusLine.classList.remove('status-fade');
          }, 300);
        }, 1050);
      }

      // Scatter a handful of colorful confetti pieces with randomized position/size/
      // speed/delay/rotation/color so they read as playful falling confetti rather
      // than a repeating pattern.
      if (confettiWrap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const CONFETTI_COLORS = ['#c9a04a', '#c96b4a', '#b8860b', '#93691f', '#e0c467'];
        const PIECE_COUNT = 18;
        for (let i = 0; i < PIECE_COUNT; i++) {
          const piece = document.createElement('span');
          piece.className = 'splash-confetti-piece';
          const isCircle = Math.random() > 0.5;
          const size = 4 + Math.random() * 4;
          piece.style.width = size + 'px';
          piece.style.height = (isCircle ? size : size * 0.6) + 'px';
          piece.style.borderRadius = isCircle ? '9999px' : '2px';
          piece.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
          piece.style.left = (Math.random() * 100) + '%';
          piece.style.setProperty('--drift', (Math.random() * 70 - 35) + 'px');
          piece.style.setProperty('--spin', (Math.random() * 360 + 160) + 'deg');
          piece.style.animationDuration = (4.5 + Math.random() * 4.5) + 's';
          piece.style.animationDelay = (Math.random() * 6) + 's';
          confettiWrap.appendChild(piece);
        }
      }

      function tick() {
        const elapsed = Date.now() - start;
        const p = Math.min(96, (elapsed / MIN_MS) * 100);
        const pClamped = Math.max(4, Math.min(96, p)); // keep badge from clipping off either edge
        if (bar) bar.style.width = p + '%';
        if (badge) {
          badge.style.left = pClamped + '%';
          badge.textContent = Math.round(p) + '%';
        }
        if (elapsed < MIN_MS) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);

      function hideSplash() {
        const remaining = Math.max(0, MIN_MS - (Date.now() - start));
        setTimeout(() => {
          if (bar) bar.style.width = '100%';
          if (badge) { badge.style.left = '96%'; badge.textContent = '100%'; }
          setTimeout(() => {
            // Shutter closes over the splash content with a quick flash,
            // then the whole screen fades to reveal the landing page.
            splash.classList.add('splash-shutter-close');
            const closeFlash = document.getElementById('shutter-flash');
            if (closeFlash) {
              closeFlash.style.opacity = '0';
              closeFlash.classList.remove('shutter-flash-repeat');
              // Force reflow so the animation restarts cleanly.
              void closeFlash.offsetWidth;
              closeFlash.classList.add('shutter-flash-repeat');
            }
            const landing = document.getElementById('landing-screen');
            if (landing) landing.classList.add('play-intro');
            const flash = document.getElementById('landing-strip-flash');
            if (flash) flash.classList.add('develop-flash');
            setTimeout(() => {
              splash.classList.add('splash-fade-out');
            }, 380);
            setTimeout(() => { splash.style.display = 'none'; }, 900);
          }, 160);
        }, remaining);
      }

      if (shutter) {
        shutter.addEventListener('animationend', () => {
          shutter.remove();
        });
      }

      if (document.readyState === 'complete') hideSplash();
      else window.addEventListener('load', hideSplash);
    })();