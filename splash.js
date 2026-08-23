(function () {
      const splash = document.getElementById('splash-screen');
      const bar = document.getElementById('splash-progress-bar');
      const pct = document.getElementById('splash-progress-pct');
      const statusText = document.getElementById('splash-status-text');
      const dustWrap = document.getElementById('splash-dust');
      const shutter = document.getElementById('shutter-iris');
      const MIN_MS = 1900;
      const start = Date.now();

      // A few rotating lines so the wait feels like it's actually doing something,
      // instead of staring at one static sentence the whole time.
      const STATUS_LINES = [
        'Menyiapkan studio foto...',
        'Menghangatkan lampu kilat...',
        'Memuat rol film...',
        'Mengatur fokus kamera...',
        'Hampir siap, senyum ya!'
      ];
      let statusIndex = 0;
      if (statusText && STATUS_LINES.length > 1) {
        setInterval(() => {
          statusIndex = (statusIndex + 1) % STATUS_LINES.length;
          statusText.classList.add('status-fade');
          setTimeout(() => {
            statusText.textContent = STATUS_LINES[statusIndex];
            statusText.classList.remove('status-fade');
          }, 300);
        }, 950);
      }

      // Scatter a handful of soft dust motes with randomized position/speed/delay so
      // they read as ambient studio-light particles rather than a repeating pattern.
      if (dustWrap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const MOTE_COUNT = 10;
        for (let i = 0; i < MOTE_COUNT; i++) {
          const mote = document.createElement('span');
          mote.className = 'splash-dust-mote';
          const size = 2 + Math.random() * 3;
          mote.style.width = size + 'px';
          mote.style.height = size + 'px';
          mote.style.left = (Math.random() * 100) + '%';
          mote.style.setProperty('--drift', (Math.random() * 60 - 30) + 'px');
          mote.style.animationDuration = (5 + Math.random() * 5) + 's';
          mote.style.animationDelay = (Math.random() * 6) + 's';
          dustWrap.appendChild(mote);
        }
      }

      function tick() {
        const elapsed = Date.now() - start;
        const p = Math.min(96, (elapsed / MIN_MS) * 100);
        if (bar) bar.style.width = p + '%';
        if (pct) pct.textContent = Math.round(p) + '%';
        if (elapsed < MIN_MS) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);

      function hideSplash() {
        const remaining = Math.max(0, MIN_MS - (Date.now() - start));
        setTimeout(() => {
          if (bar) bar.style.width = '100%';
          if (pct) pct.textContent = '100%';
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
