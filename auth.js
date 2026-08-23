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

  async function addHistoryEntry(dataUrl, filename, kind) {
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

  /* ---------------- mockup POV (dipegang tangan / saku celana / latar aesthetic) ---------------- */
  let mockupItem = null;
  let mockupImgObj = null;
  let mockupStyle = 'hand';

  function openMockupModal(id) {
    const item = getMyHistory().find((i) => i.id === id);
    if (!item) return;
    mockupItem = item;
    mockupStyle = 'hand';
    updateMockupTabsUI();
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

  function setMockupStyle(style) {
    mockupStyle = style;
    updateMockupTabsUI();
    renderMockupCanvas();
  }

  function updateMockupTabsUI() {
    document.querySelectorAll('.mockup-tab-btn').forEach((btn) => {
      btn.classList.toggle('mockup-tab-active', btn.dataset.style === mockupStyle);
    });
  }

  function downloadMockupResult() {
    const canvas = $('mockup-canvas');
    if (!canvas || !mockupItem) return;
    const label = mockupStyle === 'hand' ? 'tangan' : mockupStyle === 'pocket' ? 'saku' : 'aesthetic';
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

  function drawBokehBackground(ctx, W, H, c1, c2) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) {
      const r = 30 + Math.random() * 90;
      const x = Math.random() * W, y = Math.random() * H;
      const dg = ctx.createRadialGradient(x, y, 0, x, y, r);
      dg.addColorStop(0, 'rgba(255,255,255,0.16)');
      dg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = dg;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawHandMockup(ctx, W, H, img) {
    drawBokehBackground(ctx, W, H, '#c9a04a', '#5f5646');
    const vg = ctx.createRadialGradient(W / 2, H * 0.35, H * 0.1, W / 2, H * 0.35, H * 0.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(20,15,5,0.4)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    const cx = W / 2, cy = H * 0.4, rotation = -7 * Math.PI / 180;
    const { w, h } = drawStripImage(ctx, img, cx, cy, W * 0.56, H * 0.62, rotation, { shadow: true });

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    const skin = '#c8895f', skinShade = '#a66a44';
    ctx.fillStyle = skin;
    roundRectPath(ctx, -w * 0.58, h * 0.2, w * 1.16, h * 0.85, w * 0.3);
    ctx.fill();
    const fingerW = w * 0.24;
    [-0.3, -0.02, 0.26].forEach((fx, i) => {
      ctx.fillStyle = i === 1 ? skin : skinShade;
      roundRectPath(ctx, fx * w - fingerW / 2, h * 0.02, fingerW, h * 0.42, fingerW * 0.45);
      ctx.fill();
    });
    ctx.fillStyle = skinShade;
    roundRectPath(ctx, -w * 0.66, h * 0.06, w * 0.28, h * 0.22, w * 0.1);
    ctx.fill();
    ctx.restore();
  }

  function drawPocketMockup(ctx, W, H, img) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#5b7fa0');
    grad.addColorStop(1, '#33495f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#1f2f3f';
    ctx.lineWidth = 3;
    for (let x = -H; x < W; x += 12) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.stroke(); }
    ctx.restore();

    const cx = W * 0.5, cy = H * 0.4, rotation = 6 * Math.PI / 180;
    drawStripImage(ctx, img, cx, cy, W * 0.5, H * 0.52, rotation, { shadow: true });

    const mouthY = H * 0.6;
    ctx.fillStyle = '#4a6a87';
    ctx.beginPath();
    ctx.moveTo(W * 0.1, mouthY + 10);
    ctx.quadraticCurveTo(W * 0.5, mouthY - 26, W * 0.9, mouthY + 10);
    ctx.lineTo(W * 0.86, H * 0.94);
    ctx.quadraticCurveTo(W * 0.5, H, W * 0.14, H * 0.94);
    ctx.closePath();
    ctx.fill();
    ctx.setLineDash([7, 6]);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255, 224, 170, 0.6)';
    ctx.beginPath();
    ctx.moveTo(W * 0.1, mouthY + 10);
    ctx.quadraticCurveTo(W * 0.5, mouthY - 26, W * 0.9, mouthY + 10);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,224,170,0.5)';
    ctx.beginPath(); ctx.arc(W * 0.5, mouthY + 40, 6, 0, Math.PI * 2); ctx.fill();
  }

  function drawBgMockup(ctx, W, H, img) {
    drawBokehBackground(ctx, W, H, '#e6dcc0', '#c9a04a');
    const cx = W / 2, cy = H / 2, rotation = -4 * Math.PI / 180;
    drawStripImage(ctx, img, cx, cy, W * 0.62, H * 0.72, rotation, { shadow: true, shadowBlur: 45, shadowOffsetY: 28 });
    ctx.save();
    ctx.font = '600 22px sans-serif';
    ctx.fillStyle = 'rgba(36,31,22,0.55)';
    ctx.textAlign = 'center';
    ctx.fillText('jepretin.app', W / 2, H - 28);
    ctx.restore();
  }

  function renderMockupCanvas() {
    const canvas = $('mockup-canvas');
    if (!canvas || !mockupImgObj) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (mockupStyle === 'hand') drawHandMockup(ctx, W, H, mockupImgObj);
    else if (mockupStyle === 'pocket') drawPocketMockup(ctx, W, H, mockupImgObj);
    else drawBgMockup(ctx, W, H, mockupImgObj);
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
    openMockupModal, closeMockupModal, setMockupStyle, downloadMockupResult
  };
  // Convenience globals used directly by onclick="" attributes in index.html
  window.logoutUser = logoutUser;
  window.openHistoryModal = openHistoryModal;
  window.closeHistoryModal = closeHistoryModal;
  window.clearMyHistory = clearMyHistory;
})();
