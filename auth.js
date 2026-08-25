/* ============================================================
   JEPRETIN — Auth & Photo History (client-side only)
   ------------------------------------------------------------
   Semua data (akun, sesi, riwayat foto) disimpan di localStorage
   browser ini saja. Tidak ada server, jadi ini BUKAN sistem login
   yang aman untuk data sensitif — cukup untuk personalisasi &
   riwayat foto per-perangkat pada kiosk/demo.
   ============================================================ */
(function () {
  const USERS_KEY = 'jepretin_users_v1';
  const SESSION_KEY = 'jepretin_session_v1';
  const HISTORY_KEY = 'jepretin_history_v1';
  const MAX_HISTORY_PER_USER = 24;
  const USERNAME_RE = /^[a-zA-Z0-9_]{3,16}$/;

  /* ---------------- storage helpers ---------------- */
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) { return false; }
  }
  function getUsers() { return readJSON(USERS_KEY, {}); }
  function getHistoryStore() { return readJSON(HISTORY_KEY, {}); }

  /* ---------------- crypto helpers ---------------- */
  function toHex(buffer) {
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  function randomSaltHex() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return toHex(arr.buffer);
  }
  async function hashPassword(password, saltHex) {
    const enc = new TextEncoder();
    const data = enc.encode(saltHex + ':' + password);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return toHex(digest);
  }

  /* ---------------- session ---------------- */
  function getCurrentUserKey() {
    return localStorage.getItem(SESSION_KEY) || null;
  }
  function getCurrentUser() {
    const key = getCurrentUserKey();
    if (!key) return null;
    const users = getUsers();
    return users[key] || null;
  }
  function isLoggedIn() { return !!getCurrentUserKey(); }

  /* ---------------- register / login / logout ---------------- */
  async function registerUser(usernameRaw, password, passwordConfirm) {
    const username = (usernameRaw || '').trim();
    if (!USERNAME_RE.test(username)) {
      return { ok: false, error: 'Username 3-16 karakter, huruf/angka/underscore saja.' };
    }
    if (!password || password.length < 4) {
      return { ok: false, error: 'Kata sandi minimal 4 karakter.' };
    }
    if (password !== passwordConfirm) {
      return { ok: false, error: 'Konfirmasi kata sandi tidak cocok.' };
    }
    const key = username.toLowerCase();
    const users = getUsers();
    if (users[key]) {
      return { ok: false, error: 'Username sudah dipakai, coba yang lain.' };
    }
    const salt = randomSaltHex();
    const hash = await hashPassword(password, salt);
    users[key] = { username, salt, hash, createdAt: new Date().toISOString() };
    if (!writeJSON(USERS_KEY, users)) {
      return { ok: false, error: 'Gagal menyimpan akun (penyimpanan browser penuh).' };
    }
    localStorage.setItem(SESSION_KEY, key);
    return { ok: true, username };
  }

  async function loginUser(usernameRaw, password) {
    const username = (usernameRaw || '').trim();
    const key = username.toLowerCase();
    const users = getUsers();
    const record = users[key];
    if (!record) {
      return { ok: false, error: 'Username belum terdaftar.' };
    }
    const hash = await hashPassword(password, record.salt);
    if (hash !== record.hash) {
      return { ok: false, error: 'Kata sandi salah.' };
    }
    localStorage.setItem(SESSION_KEY, key);
    return { ok: true, username: record.username };
  }

  function logoutUser() {
    localStorage.removeItem(SESSION_KEY);
    document.documentElement.classList.remove('jp-logged-in');
    location.reload();
  }

  /* ---------------- photo history ---------------- */
  function downscaleForHistory(dataUrl, maxW) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(c.toDataURL('image/jpeg', 0.72));
        } catch (e) {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  const KIND_LABELS = { strip: 'Strip Foto', grid: 'Grid 2x2', gif: 'GIF Animasi', ig: 'IG Post' };

  async function addHistoryEntry(dataUrl, filename, kind, frame) {
    const key = getCurrentUserKey();
    if (!key || !dataUrl) return;
    const thumb = await downscaleForHistory(dataUrl, 360);
    const store = getHistoryStore();
    const list = store[key] || [];
    list.unshift({
      id: 'h_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      thumb,
      filename: filename || '',
      kind: kind || 'strip',
      frame: frame || 'nature',
      ts: Date.now()
    });
    store[key] = list.slice(0, MAX_HISTORY_PER_USER);
    if (!writeJSON(HISTORY_KEY, store)) {
      // storage full — drop oldest half and retry once
      store[key] = list.slice(0, Math.floor(MAX_HISTORY_PER_USER / 2));
      writeJSON(HISTORY_KEY, store);
    }
    renderHistoryModal();
  }

  function getMyHistory() {
    const key = getCurrentUserKey();
    if (!key) return [];
    const store = getHistoryStore();
    return store[key] || [];
  }

  function clearMyHistory() {
    const key = getCurrentUserKey();
    if (!key) return;
    const store = getHistoryStore();
    store[key] = [];
    writeJSON(HISTORY_KEY, store);
    renderHistoryModal();
  }

  function deleteHistoryEntry(id) {
    const key = getCurrentUserKey();
    if (!key) return;
    const store = getHistoryStore();
    store[key] = (store[key] || []).filter(item => item.id !== id);
    writeJSON(HISTORY_KEY, store);
    renderHistoryModal();
  }

  /* ---------------- UI wiring ---------------- */
  let authMode = 'login'; // 'login' | 'register'

  function $(id) { return document.getElementById(id); }

  function setAuthMode(mode) {
    authMode = mode;
    const isLogin = mode === 'login';
    $('auth-tab-login')?.classList.toggle('mode-active', isLogin);
    $('auth-tab-register')?.classList.toggle('mode-active', !isLogin);
    $('auth-confirm-wrap')?.classList.toggle('hidden', isLogin);
    $('auth-submit-btn').innerHTML = isLogin
      ? '<i class="fa-solid fa-right-to-bracket"></i><span>Masuk</span>'
      : '<i class="fa-solid fa-user-plus"></i><span>Daftar</span>';
    $('auth-switch-hint').innerHTML = isLogin
      ? 'Belum punya akun? <button type="button" onclick="JepretinAuth.setAuthMode(\'register\')" class="text-[var(--brass-soft)] font-bold hover:underline">Daftar di sini</button>'
      : 'Sudah punya akun? <button type="button" onclick="JepretinAuth.setAuthMode(\'login\')" class="text-[var(--brass-soft)] font-bold hover:underline">Masuk di sini</button>';
    setAuthError('');
    clearAllHints();
    if (mode === 'register') validateUsernameLive();
  }

  function setAuthError(msg) {
    const el = $('auth-error');
    if (!el) return;
    if (!msg) { el.classList.add('hidden'); el.textContent = ''; return; }
    el.textContent = msg;
    el.classList.remove('hidden');
    el.classList.remove('auth-shake');
    void el.offsetWidth;
    el.classList.add('auth-shake');
  }

  function revealLandingAfterAuth() {
    const authScreen = $('auth-screen');
    const landing = $('landing-screen');
    if (authScreen) authScreen.classList.add('auth-fade-out');
    if (landing) landing.classList.add('play-intro');
    setTimeout(() => { if (authScreen) authScreen.style.display = 'none'; }, 480);
  }

  function updateIdentityUI() {
    const user = getCurrentUser();
    const name = user ? user.username : '';
    const greetEl = $('landing-greet');
    if (greetEl) {
      greetEl.textContent = name ? `Halo, ${name} \u2014 mesin siap buat kamu!` : '';
      greetEl.classList.toggle('hidden', !name);
    }
    const logoutHint = $('landing-logout-hint');
    if (logoutHint) logoutHint.classList.toggle('hidden', !name);
    const badgeName = $('user-badge-name');
    if (badgeName) badgeName.textContent = name;
    const badge = $('user-badge');
    if (badge) {
      badge.classList.toggle('hidden', !name);
      badge.classList.toggle('flex', !!name);
    }
  }

  function togglePasswordVisibility(inputId, btnEl) {
    const input = $(inputId);
    if (!input) return;
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    const icon = btnEl.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-eye', showing);
      icon.classList.toggle('fa-eye-slash', !showing);
    }
  }

  /* ---------------- live (real-time) validation ---------------- */
  function setHint(id, msg, tone) {
    const el = $(id);
    if (!el) return;
    if (!msg) {
      el.textContent = '';
      el.classList.add('hidden');
      return;
    }
    el.textContent = msg;
    el.classList.remove('hidden');
    el.classList.remove('text-emerald-400', 'text-[var(--crimson-soft)]', 'text-[#6b6152]');
    el.classList.add(tone === 'ok' ? 'text-emerald-400' : tone === 'bad' ? 'text-[var(--crimson-soft)]' : 'text-[#6b6152]');
  }

  function validateUsernameLive() {
    const el = $('auth-username');
    if (!el) return true;
    const val = el.value.trim();
    if (!val) { setHint('auth-username-hint', ''); return false; }
    if (!USERNAME_RE.test(val)) {
      setHint('auth-username-hint', 'Username 3-16 karakter, huruf/angka/underscore saja.', 'bad');
      return false;
    }
    if (authMode === 'register' && getUsers()[val.toLowerCase()]) {
      setHint('auth-username-hint', 'Username sudah dipakai, coba yang lain.', 'bad');
      return false;
    }
    setHint('auth-username-hint', authMode === 'register' ? 'Username tersedia.' : '', 'ok');
    return true;
  }

  function validatePasswordLive() {
    const el = $('auth-password');
    if (!el) return true;
    const val = el.value;
    if (!val) { setHint('auth-password-hint', ''); return false; }
    if (val.length < 4) {
      setHint('auth-password-hint', `Minimal 4 karakter (${val.length}/4).`, 'bad');
      return false;
    }
    setHint('auth-password-hint', authMode === 'register' ? 'Panjang oke.' : '', 'ok');
    return true;
  }

  function validateConfirmLive() {
    if (authMode !== 'register') { setHint('auth-confirm-hint', ''); return true; }
    const pw = $('auth-password')?.value || '';
    const val = $('auth-password-confirm')?.value || '';
    if (!val) { setHint('auth-confirm-hint', ''); return false; }
    if (val !== pw) {
      setHint('auth-confirm-hint', 'Belum sama dengan kata sandi di atas.', 'bad');
      return false;
    }
    setHint('auth-confirm-hint', 'Cocok!', 'ok');
    return true;
  }

  function clearAllHints() {
    ['auth-username-hint', 'auth-password-hint', 'auth-confirm-hint'].forEach(id => setHint(id, ''));
  }

  function focusUsernameIfVisible() {
    if (isLoggedIn()) return;
    const input = $('auth-username');
    if (input) input.focus({ preventScroll: true });
  }

  function watchSplashAndFocus() {
    const splash = $('splash-screen');
    if (!splash) { focusUsernameIfVisible(); return; }
    if (splash.style.display === 'none') { focusUsernameIfVisible(); return; }
    const obs = new MutationObserver(() => {
      if (splash.style.display === 'none') {
        focusUsernameIfVisible();
        obs.disconnect();
      }
    });
    obs.observe(splash, { attributes: true, attributeFilter: ['style'] });
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    const btn = $('auth-submit-btn');
    const username = $('auth-username').value;
    const password = $('auth-password').value;
    const confirm = $('auth-password-confirm').value;
    btn.disabled = true;
    btn.classList.add('opacity-60');
    try {
      const result = authMode === 'login'
        ? await loginUser(username, password)
        : await registerUser(username, password, confirm);
      if (!result.ok) {
        setAuthError(result.error);
        return;
      }
      document.documentElement.classList.add('jp-logged-in');
      updateIdentityUI();
      revealLandingAfterAuth();
      if (typeof showToast === 'function') {
        showToast(`Halo, ${result.username}! ${authMode === 'register' ? 'Akun dibuat' : 'Berhasil masuk'}.`, '👋');
      }
    } finally {
      btn.disabled = false;
      btn.classList.remove('opacity-60');
    }
  }

  /* ---------------- history modal ---------------- */
  function openHistoryModal() {
    renderHistoryModal();
    const modal = $('history-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  function closeHistoryModal() {
    const modal = $('history-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  function timeAgoLabel(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) + ' \u00b7 ' +
      d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  function renderHistoryModal() {
    const grid = $('history-modal-grid');
    const empty = $('history-empty-state');
    if (!grid) return;
    const items = getMyHistory();
    grid.innerHTML = '';
    if (empty) {
      empty.classList.toggle('hidden', items.length > 0);
      empty.classList.toggle('flex', items.length === 0);
    }
    items.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'relative rounded-xl overflow-hidden border border-[var(--line)] bg-[#ffffff] group card-rise-in';
      card.style.setProperty('--i', idx);
      card.innerHTML = `
        <img src="${item.thumb}" alt="${KIND_LABELS[item.kind] || 'Foto'}" class="w-full aspect-[3/4] object-cover">
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pt-4 pb-1.5">
          <p class="text-[10px] font-bold text-[#f3e6c7] leading-tight">${KIND_LABELS[item.kind] || 'Foto'}</p>
          <p class="text-[9px] text-[#d6c6a0]">${timeAgoLabel(item.ts)}</p>
        </div>
        <div class="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button onclick="JepretinAuth.openMockupModal('${item.id}')" title="Lihat POV" class="w-7 h-7 flex items-center justify-center rounded-full bg-black/60 text-[#241f16] hover:text-[var(--brass-soft)]">
            <i class="fa-solid fa-wand-magic-sparkles text-[11px]"></i>
          </button>
          <a href="${item.thumb}" download="${item.filename || 'jepretin.jpg'}" title="Unduh" class="w-7 h-7 flex items-center justify-center rounded-full bg-black/60 text-[#241f16] hover:text-[var(--brass-soft)]">
            <i class="fa-solid fa-download text-[11px]"></i>
          </a>
          <button onclick="JepretinAuth.deleteHistoryEntry('${item.id}')" title="Hapus" class="w-7 h-7 flex items-center justify-center rounded-full bg-black/60 text-[#241f16] hover:text-[var(--crimson-soft)]">
            <i class="fa-solid fa-trash text-[11px]"></i>
          </button>
        </div>`;
      grid.appendChild(card);
    });
  }

  /* ---------------- mockup POV (latar bertema, mengikuti bingkai foto asli) ---------------- */
  let mockupItem = null;
  let mockupImgObj = null;

  // FRAME_THEMES didefinisikan di app.js (di scope global yang sama karena
  // sama-sama classic <script>). Fallback dipakai kalau app.js belum/tidak sempat load.
  function getFrameThemeCfg(frameId) {
    const themes = (typeof FRAME_THEMES !== 'undefined') ? FRAME_THEMES : null;
    if (themes && themes[frameId]) return themes[frameId];
    if (themes && themes.nature) return themes.nature;
    return {
      accent: '#c9a04a', stampBg: '#fdf8ec', stampFg: '#6b5636',
      brandText: 'JEPRETIN', tagline: 'Captured moments, framed with love',
      stickers: ['✨', '🌿', '📸']
    };
  }

  function openMockupModal(id) {
    const item = getMyHistory().find((i) => i.id === id);
    if (!item) return;
    mockupItem = item;
    const modal = $('mockup-modal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
    const img = new Image();
    img.onload = () => { mockupImgObj = img; renderMockupCanvas(); };
    img.src = item.thumb;
  }

  function closeMockupModal() {
    const modal = $('mockup-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  function downloadMockupResult() {
    const canvas = $('mockup-canvas');
    if (!canvas || !mockupItem) return;
    const label = (mockupItem.frame || 'jepretin').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const a = document.createElement('a');
    a.download = `jepretin-pov-${label}-${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png', 0.95);
    a.click();
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + w - r.tr, y);
    ctx.arcTo(x + w, y, x + w, y + r.tr, r.tr);
    ctx.lineTo(x + w, y + h - r.br);
    ctx.arcTo(x + w, y + h, x + w - r.br, y + h, r.br);
    ctx.lineTo(x + r.bl, y + h);
    ctx.arcTo(x, y + h, x, y + h - r.bl, r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.arcTo(x, y, x + r.tl, y, r.tl);
    ctx.closePath();
  }

  // Menggambar strip foto (dengan bingkai kertas putih tipis + bayangan) yang pas
  // di dalam kotak maksimal maxW x maxH, dirotasi sejumlah `rotation` radian.
  function drawStripImage(ctx, img, cx, cy, maxW, maxH, rotation, opts) {
    const ratio = img.height / img.width;
    let w = maxW, h = w * ratio;
    if (h > maxH) { h = maxH; w = h / ratio; }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    if (opts && opts.shadow) {
      ctx.shadowColor = opts.shadowColor || 'rgba(20,15,5,0.45)';
      ctx.shadowBlur = opts.shadowBlur || 32;
      ctx.shadowOffsetY = opts.shadowOffsetY || 18;
    }
    ctx.fillStyle = '#fdfaf2';
    roundRectPath(ctx, -w / 2 - 7, -h / 2 - 7, w + 14, h + 14, 7);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    return { w, h };
  }

  // Latar belakang galeri bertema: warna, motif sticker, dan teks brand mengikuti
  // bingkai yang dipakai saat foto itu diambil (mis. bingkai "17 Agustus" -> nuansa
  // merah-putih & sticker bendera; bingkai "Floral" -> nuansa pink & sticker bunga).
  function drawThemedGalleryBackground(ctx, W, H, img, frameId) {
    const cfg = getFrameThemeCfg(frameId);
    const accent = cfg.accent || '#c9a04a';
    const bg = cfg.stampBg || '#fdf8ec';
    const fg = cfg.stampFg || '#241f16';

    // Latar gradasi lembut dari warna dasar tema ke warna aksen tema.
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, bg);
    grad.addColorStop(1, accent);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Garis diagonal tipis sebagai tekstur, senada dengan referensi photobooth.
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = fg;
    ctx.lineWidth = 22;
    for (let x = -H; x < W + H; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.stroke();
    }
    ctx.restore();

    // Sticker khas tema disebar di pinggiran sebagai dekorasi (mengganti motif tangan/saku).
    const stickers = (cfg.stickers && cfg.stickers.length) ? cfg.stickers : ['✨'];
    const spots = [
      [W * 0.10, H * 0.07], [W * 0.90, H * 0.07],
      [W * 0.08, H * 0.93], [W * 0.92, H * 0.93],
      [W * 0.50, H * 0.045], [W * 0.06, H * 0.5], [W * 0.94, H * 0.5]
    ];
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.9;
    spots.forEach((p, i) => {
      ctx.font = (22 + (i % 3) * 8) + 'px sans-serif';
      ctx.fillText(stickers[i % stickers.length], p[0], p[1]);
    });
    ctx.restore();

    // Strip foto asli ditampilkan tegak lurus, ditonjolkan dengan bayangan lembut.
    const cx = W / 2, cy = H * 0.42;
    const { w, h } = drawStripImage(ctx, img, cx, cy, W * 0.56, H * 0.62, 0, { shadow: true, shadowBlur: 42, shadowOffsetY: 24 });

    // Lingkaran "wreath" berisi nama tema, gaya kartu undangan/photobooth di referensi.
    const badgeCY = cy + h / 2 + 92;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = fg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(W / 2, badgeCY, 158, 62, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = fg;
    ctx.font = '700 23px sans-serif';
    ctx.fillText(cfg.brandText || 'JEPRETIN', W / 2, badgeCY - 6);
    ctx.globalAlpha = 0.85;
    ctx.font = '600 12px sans-serif';
    ctx.fillText((cfg.tagline || 'jepretin.app').toUpperCase(), W / 2, badgeCY + 18);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = fg;
    ctx.font = '600 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('jepretin.app', W / 2, H - 20);
    ctx.restore();
  }

  function renderMockupCanvas() {
    const canvas = $('mockup-canvas');
    if (!canvas || !mockupImgObj || !mockupItem) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    drawThemedGalleryBackground(ctx, W, H, mockupImgObj, mockupItem.frame);
  }

  /* ---------------- boot ---------------- */
  function boot() {
    if (isLoggedIn()) document.documentElement.classList.add('jp-logged-in');
    updateIdentityUI();
    const form = $('auth-form');
    if (form) form.addEventListener('submit', handleAuthSubmit);
    $('auth-username')?.addEventListener('input', validateUsernameLive);
    $('auth-password')?.addEventListener('input', () => { validatePasswordLive(); validateConfirmLive(); });
    $('auth-password-confirm')?.addEventListener('input', validateConfirmLive);
    setAuthMode('login');
    watchSplashAndFocus();
    // Returning logged-in users: auth-screen is hidden via the .jp-logged-in
    // CSS rule, so the splash reveal lands straight on the landing screen.
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ---------------- public API ---------------- */
  window.JepretinAuth = {
    isLoggedIn, getCurrentUser, logoutUser, setAuthMode,
    addHistoryEntry, getMyHistory, clearMyHistory, deleteHistoryEntry,
    openHistoryModal, closeHistoryModal, togglePasswordVisibility,
    openMockupModal, closeMockupModal, downloadMockupResult
  };
  // Convenience globals used directly by onclick="" attributes in index.html
  window.logoutUser = logoutUser;
  window.openHistoryModal = openHistoryModal;
  window.closeHistoryModal = closeHistoryModal;
  window.clearMyHistory = clearMyHistory;
})();