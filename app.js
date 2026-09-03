const video = document.getElementById('webcam');
    const captureCanvas = document.getElementById('capture-canvas');
    const exportCanvas = document.getElementById('export-canvas');
    const countdownEl = document.getElementById('countdown');
    const countdownNum = document.getElementById('countdown-num');
    const snapBtn = document.getElementById('snap-btn');
    const snapBtnLabel = document.getElementById('snap-btn-label');
    const gifBtn = document.getElementById('gif-btn');
    const gifBtnLabel = document.getElementById('gif-btn-label');
    const pngBtn = document.getElementById('png-btn');
    const gridBtn = document.getElementById('grid-btn');
    const igBtn = document.getElementById('ig-btn');
    const pngShareBtn = document.getElementById('png-share-btn');
    const gifShareBtn = document.getElementById('gif-share-btn');
    const igShareBtn = document.getElementById('ig-share-btn');
    const pngSaveBtn = document.getElementById('png-save-btn');
    const gridSaveBtn = document.getElementById('grid-save-btn');
    const gifSaveBtn = document.getElementById('gif-save-btn');
    const gifProgressTrack = document.getElementById('gif-progress-track');
    const favoriteHint = document.getElementById('favorite-hint');
    const resetBtn = document.getElementById('reset-btn');
    const photoList = document.getElementById('photo-list');
    const flashEl = document.getElementById('camera-flash');
    const irisOverlay = document.getElementById('iris-overlay');
    const stripCard = document.getElementById('strip-card');
    const stripMockup = document.getElementById('strip-mockup');
    const stripLivePreview = document.getElementById('strip-live-preview');
    let livePreviewToken = 0; // guards against a stale render landing after a newer one started
    const cameraFrame = document.getElementById('camera-frame');
    const cameraErrorEl = document.getElementById('camera-error');
    const cameraErrorDetail = document.getElementById('camera-error-detail');
    const cameraSwitchBtn = document.getElementById('camera-switch-btn');
    const outputLed = document.getElementById('output-led');
    const statusBadge = document.getElementById('status-badge');
    const readyRibbon = document.getElementById('ready-ribbon');
    const toastContainer = document.getElementById('toast-container');
    const machineCard = document.getElementById('machine-card');
    const printSlotPaper = document.getElementById('print-slot-paper');
    const muteIcon = document.getElementById('mute-icon');
    const poseCountSelect = document.getElementById('pose-count-select');
    const intervalSelect = document.getElementById('interval-select');
    const previewBtn = document.getElementById('preview-btn');
    const previewModal = document.getElementById('preview-modal');
    const previewCounter = document.getElementById('preview-counter');
    const previewGrid = document.getElementById('preview-grid');
    let previewMode = 'framed'; // 'raw' | 'framed' | 'ig' — defaults to framed = "siap cetak"
    const framedCache = {};

    // ---- Frame modal (dedicated frame-picker screen) ----
    const frameModal = document.getElementById('frame-modal');
    const frameModalGrid = document.getElementById('frame-modal-grid');
    const frameSummarySwatch = document.getElementById('frame-summary-swatch');
    const frameSummaryLabel = document.getElementById('frame-summary-label');

    // ---- IG modal (dedicated IG-frame + caption picker screen) ----
    const igModal = document.getElementById('ig-modal');
    const igStyleBtns = document.getElementById('ig-style-btns');
    const igCategoryTabs = document.getElementById('ig-category-tabs');
    const igCaptionChips = document.getElementById('ig-caption-chips');
    const igCaptionInput = document.getElementById('ig-caption-input');
    const igPreviewImg = document.getElementById('ig-preview-img');
    const igPreviewLoading = document.getElementById('ig-preview-loading');
    const igSummaryLabel = document.getElementById('ig-summary-label');

    // ---- Mall-kiosk extras: welcome/layout screen, session code, stickers, QR, ambience ----
    const landingScreen = document.getElementById('landing-screen');
    const welcomeScreen = document.getElementById('welcome-screen');
    const welcomeStageStart = document.getElementById('welcome-stage-start');
    const welcomeStageLayout = document.getElementById('welcome-stage-layout');
    const welcomeThemePreview = document.getElementById('welcome-theme-preview');
    const welcomeThemeLabel = document.getElementById('welcome-theme-label');
    const sessionCodeBadge = document.getElementById('session-code-badge');
    const stickerTrayWrap = document.getElementById('sticker-tray-wrap');
    const stickerTray = document.getElementById('sticker-tray');
    const qrPanel = document.getElementById('qr-panel');
    const qrCodeBox = document.getElementById('qr-code-box');
    const qrPanelNote = document.getElementById('qr-panel-note');

    // ---- Auto-crop face/body (auto-center composition) ----
    const autoCropBtn = document.getElementById('auto-crop-btn');
    const autoCropStatusLabel = document.getElementById('auto-crop-status-label');
    const autoCropLiveChip = document.getElementById('auto-crop-live-chip');

    // ---- Photo Battle ----
    const battleModal = document.getElementById('battle-modal');
    const battlePairEl = document.getElementById('battle-pair');
    const battleRoundLabel = document.getElementById('battle-round-label');

    // ---- Countdown pose-prompt ----
    const countdownPromptEl = document.getElementById('countdown-prompt');

    const LAYOUT_PRESETS = {
      strip4: { pose: 4, exportMode: 'png',  label: 'Strip Vertikal 4 Pose' },
      strip6: { pose: 6, exportMode: 'png',  label: 'Strip Vertikal 6 Pose' },
      grid4:  { pose: 4, exportMode: 'grid', label: 'Grid 2×2' }
    };
    let selectedLayout = 'strip4';
    let sessionCode = '';
    let sessionStarted = false;
    let placedStickers = []; // { emoji, xPct, yPct }
    const PROP_STICKERS = ['💗','⭐','👑','😎','✨','🔥','😂','💋','🎉','🕶️'];

    let currentFilter = 'normal';
    let currentFrame = 'nature';
    let suggestedSeasonalTheme = null;
    let capturedImages = [];
    // capturedBursts[i] = array of dataURLs captured over ~1s for pose i (real motion,
    // not a single snapshot). Used only for the animated GIF export; every other feature
    // (print strip, IG post, thumbnails, favorite) keeps using capturedImages as before.
    let capturedBursts = [];
    const BURST_FRAME_COUNT = 12;   // frames grabbed per pose
    const BURST_DURATION_MS = 1400; // total window per pose (~1.4s of playful motion for the GIF only)
    const BURST_INTERVAL_MS = Math.round(BURST_DURATION_MS / (BURST_FRAME_COUNT - 1));
    let favoriteIndex = null;
    let POSE_COUNT = 4;
    let CAPTURE_INTERVAL = 3;
    let isMuted = false;
    let isCapturing = false;
    let isRetaking = false;
    let celebrated = false;
    let idleTimer = null;
    let videoDevices = [];
    let currentDeviceIndex = 0;
    let audioCtx = null;
    let ambientNodes = null;
    let lastExports = { png: null, gif: null, ig: null };

    // ---- Auto-crop (auto-center on person) state — uses the selfieSegmentation model below
    // to find the person's silhouette bounding box and keep the strip composition centered.
    // Works whether the person is sitting or standing, near or far off-center. ----
    let selfieSegmentation = null;
    let segmentationLoading = false;
    let segmentationLoopActive = false;
    let autoFrameEnabled = false;
    let autoFrameLoading = false;
    let autoCropSmoothed = { cx: 0.5, cy: 0.5, zoom: 1 };
    let autoCropLastSeen = 0;
    let maskAnalysisCanvas = null;

    // ---- Photo Battle state ----
    let battleDone = false;
    let battleActive = false;
    let battleOrder = [];
    let battleWinners = [];
    let battleRoundIdx = 0;

    function drawPlacedStickersOnCanvas(ctx, W, H) {
      if (!placedStickers.length) return;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      placedStickers.forEach(s => {
        const size = Math.max(W, H) * 0.06;
        ctx.font = `${size}px sans-serif`;
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 6;
        ctx.fillText(s.emoji, (s.xPct / 100) * W, (s.yPct / 100) * H);
      });
      ctx.restore();
    }

    function buildPlaceholderHTML(count) {
      return Array.from({ length: count }, (_, i) =>
        `<div class="aspect-[3/4] sm:aspect-[4/3] photo-mat photo-skeleton bg-black/15 rounded-lg flex items-center justify-center text-xs opacity-60">Pose ${i + 1}</div>`
      ).join('');
    }

    const PLACEHOLDER_HTML = buildPlaceholderHTML(POSE_COUNT);

    const FRAME_THEMES = {
      nature:   { emoji: '🍃', label: 'Nature',   swatch: 'bg-emerald-100 text-emerald-950 border-emerald-300 hover:border-emerald-500', stickers: ['🌿','🌻','🍃','🌸','🍀','🌱','☀️'], brandClass: 'font-handwriting text-2xl leading-none text-emerald-900', brandText: 'Nature Photo Studio', subText: 'FRESH & WARM DAY',
        tagline: 'Hand-picked moments, naturally framed', stampText: 'ORGANIC MOMENT', accent: '#16a34a', stampBg: '#ecfdf3', stampFg: '#166534', borderStyle: 'leafVine' },
      tech:     { emoji: '💻', label: 'Tech',     swatch: 'bg-slate-900 text-sky-400 border-sky-800 hover:border-sky-400', stickers: ['💻','🤖','🔋','🌐','⚡','💾','🛰️'], brandClass: 'font-tech text-lg font-bold text-sky-400', brandText: '<JEPRETIN/>', subText: 'SYSTEM.LOG // ONLINE',
        tagline: 'render(memory) → captured.png', stampText: 'VERIFIED CAPTURE', accent: '#38bdf8', stampBg: '#0b1220', stampFg: '#38bdf8', borderStyle: 'circuit' },
      retro:    { emoji: '🎮', label: 'Retro',    swatch: 'bg-pink-100 text-pink-950 border-transparent hover:border-pink-500', stickers: ['🎮','👾','🕹️','📼','🎯','🎰','👾'], brandClass: 'font-pixel text-xs tracking-tight text-pink-600', brandText: 'JEPRETIN', subText: 'INSERT COIN 90s',
        tagline: 'PRESS START TO REMEMBER', stampText: 'HIGH SCORE', accent: '#db2777', stampBg: '#fdf2f8', stampFg: '#9d174d', borderStyle: 'pixelDash' },
      minimal:  { emoji: '🎨', label: 'Minimal',  swatch: 'bg-slate-100 text-slate-900 border-transparent hover:border-slate-500', stickers: ['🎨','📐','🏛️','🖋️','☕','📜','✨'], brandClass: 'font-sans text-lg font-black tracking-widest uppercase', brandText: 'STUDIO ART', subText: 'GALLERY EDITION',
        tagline: 'Curated in monochrome, kept forever', stampText: 'GALLERY PIECE', accent: '#0f172a', stampBg: '#ffffff', stampFg: '#0f172a', borderStyle: 'minimalRule' },
      y2k:      { emoji: '🪩', label: 'Y2K',      swatch: 'bg-purple-200 text-purple-950 border-transparent hover:border-purple-500', stickers: ['🪩','💿','⚡','🌈','🦋','🔥','💖'], brandClass: 'font-brand text-xl leading-none text-purple-950', brandText: 'JEPRETIN 2000s', subText: 'HOLOGRAPHIC VIBES',
        tagline: 'Y2K forever ★ disco never dies', stampText: 'MILLENNIUM ICON', accent: '#a855f7', stampBg: '#f3e8ff', stampFg: '#6b21a8', borderStyle: 'sparkle' },
      pastel:   { emoji: '🌷', label: 'Pastel',   swatch: 'bg-pink-50 text-pink-900 border-transparent hover:border-pink-400', stickers: ['🌷','🎀','💗','🦢','🍥','🩰','🌸'], brandClass: 'font-brand text-xl leading-none text-pink-800', brandText: 'Pastel Dream', subText: 'SOFT & SWEET',
        tagline: 'Soft colors, sweeter memories', stampText: 'DREAMY EDITION', accent: '#f9a8d4', stampBg: '#fff0f7', stampFg: '#9d174d', borderStyle: 'scallop' },
      gold:     { emoji: '✨', label: 'Gold Lux', swatch: 'bg-black text-amber-300 border-amber-600 hover:border-amber-400', stickers: ['✨','👑','💎','🏆','⭐','🥂','✨'], brandClass: 'font-arcade text-sm text-amber-300', brandText: 'GOLD STUDIO', subText: 'LUXURY EDITION',
        tagline: 'Est. Luxury Photobooth Collection', stampText: 'CERTIFIED LUXE', accent: '#d4af37', stampBg: '#111111', stampFg: '#d4af37', borderStyle: 'goldOrnate' },
      polaroid: { emoji: '📸', label: 'Polaroid', swatch: 'bg-white text-slate-800 border-slate-200 hover:border-slate-500', stickers: ['📸','🎞️','🖼️','📷','🕰️','🎬','📸'], brandClass: 'font-handwriting text-2xl leading-none text-slate-800', brandText: 'Instant Memories', subText: 'SHAKE IT LIKE A POLAROID',
        tagline: 'Developed instantly, kept eternally', stampText: 'INSTANT PRINT', accent: '#facc15', stampBg: '#fffbeb', stampFg: '#78350f', borderStyle: 'tape' },
      film:     { emoji: '🎞️', label: 'Film',     swatch: 'bg-neutral-900 text-neutral-200 border-neutral-600 hover:border-neutral-300', stickers: ['🎞️','🎬','📽️','🍿','⚫','⚪','🎥'], brandClass: 'font-arcade text-sm text-neutral-200', brandText: 'CINE BOOTH', subText: 'NOW SHOWING',
        tagline: 'A. SCENE 01 — TAKE 01 — ROLL 24', stampText: 'DIRECTOR\'S CUT', accent: '#d4d4d4', stampBg: '#1c1c1c', stampFg: '#e5e5e5', borderStyle: 'sprockets' },
      floral:   { emoji: '💐', label: 'Floral',   swatch: 'bg-fuchsia-50 text-fuchsia-900 border-transparent hover:border-fuchsia-400', stickers: ['💐','🌺','🌼','🦋','🌿','🌷','🌻'], brandClass: 'font-brand text-xl leading-none text-fuchsia-900', brandText: 'Bloom Studio', subText: 'GARDEN PARTY',
        tagline: 'Blooming moments, gently framed', stampText: 'HAND-PICKED', accent: '#c026d3', stampBg: '#fdf4ff', stampFg: '#86198f', borderStyle: 'floral' },
      birthday: { emoji: '🎉', label: 'Birthday', swatch: 'bg-orange-50 text-orange-900 border-transparent hover:border-orange-400', stickers: ['🎉','🎂','🎈','🎁','🥳','✨','🎊'], brandClass: 'font-brand text-xl leading-none text-orange-800', brandText: 'Party Time!', subText: 'HAPPY CELEBRATION',
        tagline: 'Make a wish & keep the memory', stampText: 'CELEBRATION', accent: '#fb923c', stampBg: '#fff7ed', stampFg: '#9a3412', borderStyle: 'confetti' },
      ocean:    { emoji: '🌊', label: 'Ocean',    swatch: 'bg-sky-50 text-sky-900 border-transparent hover:border-sky-400', stickers: ['🌊','🐚','🏖️','☀️','🐬','⛵','🌴'], brandClass: 'font-handwriting text-2xl leading-none text-sky-800', brandText: 'Beach Booth', subText: 'SALT & SUN',
        tagline: 'Waves, sun, and golden memories', stampText: 'COASTAL EDITION', accent: '#0284c7', stampBg: '#f0f9ff', stampFg: '#075985', borderStyle: 'wave' },
      gingham:  { emoji: '🧺', label: 'Gingham',  swatch: 'bg-red-50 text-red-900 border-transparent hover:border-red-400', stickers: ['🧺','🍒','🍓','🧀','🥨','☀️','🍉'], brandClass: 'font-handwriting text-2xl leading-none text-red-800', brandText: 'Gingham Picnic', subText: 'PICNIC DAY OUT',
        tagline: 'Checkered blanket, sunny memories', stampText: 'PICNIC PERFECT', accent: '#dc2626', stampBg: '#fef2f2', stampFg: '#7f1d1d', borderStyle: 'ginghamCheck', photoShape: 'rounded' },
      sweetheart:{ emoji: '💗', label: 'Sweetheart', swatch: 'bg-rose-50 text-rose-900 border-transparent hover:border-rose-400', stickers: ['💗','💕','💌','💘','🌹','😽','💝'], brandClass: 'font-brand text-xl leading-none text-rose-800', brandText: 'Sweetheart Booth', subText: 'BE MY VALENTINE',
        tagline: 'Every frame, a little love letter', stampText: 'LOVE CERTIFIED', accent: '#e11d48', stampBg: '#fff1f2', stampFg: '#9f1239', borderStyle: 'heartScatter', photoShape: 'heart' },
      leopard:  { emoji: '🐆', label: 'Leopard',  swatch: 'bg-amber-50 text-amber-950 border-transparent hover:border-amber-500', stickers: ['🐆','🌟','💋','🖤','👛','🕶️','✨'], brandClass: 'font-arcade text-sm text-amber-950', brandText: 'Wild Leopard', subText: 'STAY WILD',
        tagline: 'Untamed style, unforgettable frame', stampText: 'WILD EDITION', accent: '#78350f', stampBg: '#fef3c7', stampFg: '#451a03', borderStyle: 'leopardSpots', photoShape: 'rounded' },
      comicpop: { emoji: '💥', label: 'Comic Pop', swatch: 'bg-yellow-100 text-red-700 border-transparent hover:border-red-500', stickers: ['💥','⭐','😎','👊','💫','🎯','❗'], brandClass: 'font-arcade text-sm text-red-600', brandText: 'POP! Comic Booth', subText: 'BOOM! CAPTURED',
        tagline: 'POW! Instant comic-book memories', stampText: 'ACTION SHOT', accent: '#ef4444', stampBg: '#fef9c3', stampFg: '#111827', borderStyle: 'comicBurst', photoShape: 'rounded' },
      polkadot: { emoji: '🔵', label: 'Polka Dot', swatch: 'bg-blue-50 text-blue-900 border-transparent hover:border-blue-400', stickers: ['🔵','💙','☁️','🎈','🩵','⚪','✨'], brandClass: 'font-brand text-xl leading-none text-blue-800', brandText: 'Polka Dot Party', subText: 'DOTTY & DREAMY',
        tagline: 'Round, dotty, delightfully cute', stampText: 'DOTTY EDITION', accent: '#2563eb', stampBg: '#eff6ff', stampFg: '#1e3a8a', borderStyle: 'polkaDots', photoShape: 'oval' },
      cowprint: { emoji: '🐄', label: 'Cow Print', swatch: 'bg-stone-100 text-stone-900 border-transparent hover:border-stone-500', stickers: ['🐄','🥛','🌼','🤎','🖤','🌾','⭐'], brandClass: 'font-arcade text-sm text-stone-900', brandText: 'Wild Print Studio', subText: 'MOO-D BOARD',
        tagline: 'Spotted style, one of a kind', stampText: 'FARM FRESH', accent: '#1c1917', stampBg: '#f5f5f4', stampFg: '#292524', borderStyle: 'cowSpots', photoShape: 'rounded' },
      galaxy:   { emoji: '🌌', label: 'Galaxy',    swatch: 'bg-indigo-950 text-indigo-300 border-indigo-700 hover:border-indigo-400', stickers: ['🌌','🪐','🌠','⭐','🚀','👽','🌟'], brandClass: 'font-arcade text-sm text-indigo-300', brandText: 'GALAXY BOOTH', subText: 'STARDUST SESSION',
        tagline: 'Captured somewhere among the stars', stampText: 'COSMIC CAPTURE', accent: '#818cf8', stampBg: '#140b28', stampFg: '#c7d2fe', borderStyle: 'starField' },
      autumn:   { emoji: '🍂', label: 'Autumn',    swatch: 'bg-orange-50 text-orange-950 border-transparent hover:border-orange-500', stickers: ['🍂','🍁','🎃','🌰','☕','🦔','🧣'], brandClass: 'font-handwriting text-2xl leading-none text-orange-900', brandText: 'Autumn Café Studio', subText: 'COZY SEASON',
        tagline: 'Sweater weather, golden memories', stampText: 'COZY EDITION', accent: '#c2703d', stampBg: '#fdf1e3', stampFg: '#7c3f19', borderStyle: 'fallenLeaves', photoShape: 'rounded' },
      // ---- Seasonal / national-event themes — auto-suggested by date via getSeasonalThemeSuggestion() ----
      lebaran:  { emoji: '🌙', label: 'Lebaran',   swatch: 'bg-emerald-50 text-emerald-900 border-transparent hover:border-emerald-500', stickers: ['🌙','⭐','🕌','✨','🎆','🤲','🧺'], brandClass: 'font-brand text-xl leading-none text-emerald-800', brandText: 'Lebaran Bahagia', subText: 'MOHON MAAF LAHIR & BATIN',
        tagline: 'Minal Aidin Wal Faidzin, mohon maaf lahir & batin', stampText: 'IDUL FITRI', accent: '#0f7a4d', stampBg: '#fffbea', stampFg: '#0f7a4d', borderStyle: 'sparkle', seasonal: true },
      natal:    { emoji: '🎄', label: 'Natal',     swatch: 'bg-red-50 text-red-900 border-transparent hover:border-red-500', stickers: ['🎄','🎅','⛄','🔔','❄️','🎁','⭐'], brandClass: 'font-brand text-xl leading-none text-red-800', brandText: 'Christmas Studio', subText: 'JOY TO THE WORLD',
        tagline: 'Selamat Hari Natal & Tahun Baru', stampText: 'MERRY CHRISTMAS', accent: '#b91c1c', stampBg: '#fef2f2', stampFg: '#7f1d1d', borderStyle: 'snowfall', seasonal: true },
      agustusan:{ emoji: '🇮🇩', label: '17 Agustus', swatch: 'bg-red-600 text-white border-transparent hover:border-red-300', stickers: ['🇮🇩','🎉','🎆','🥇','🎗️','⭐','🎊'], brandClass: 'font-arcade text-sm text-white', brandText: 'Merdeka Studio', subText: 'DIRGAHAYU INDONESIA',
        tagline: 'Merdeka! Merdeka! Merdeka!', stampText: 'HUT RI', accent: '#dc2626', stampBg: '#ffffff', stampFg: '#dc2626', borderStyle: 'bunting', photoShape: 'rounded', seasonal: true },
      tahunbaru:{ emoji: '🎆', label: 'Tahun Baru', swatch: 'bg-slate-900 text-amber-300 border-amber-600 hover:border-amber-400', stickers: ['🎆','🥂','🎉','⏰','✨','🎊','🌟'], brandClass: 'font-arcade text-sm text-amber-300', brandText: 'New Year Studio', subText: 'NEW YEAR, NEW ME',
        tagline: 'Selamat Tahun Baru! ✨', stampText: 'HAPPY NEW YEAR', accent: '#eab308', stampBg: '#111827', stampFg: '#eab308', borderStyle: 'confetti', seasonal: true },
      imlek:    { emoji: '🧧', label: 'Imlek',     swatch: 'bg-red-900 text-amber-300 border-amber-600 hover:border-amber-400', stickers: ['🧧','🐉','🏮','🎆','✨','🍊','💰'], brandClass: 'font-handwriting text-2xl leading-none text-amber-300', brandText: 'Imlek Studio', subText: 'GONG XI FA CAI',
        tagline: 'Selamat Tahun Baru Imlek, Gong Xi Fa Cai!', stampText: 'CAP GO MEH', accent: '#e0b23d', stampBg: '#450a0a', stampFg: '#facc15', borderStyle: 'goldOrnate', seasonal: true }
    };
    // Backward-compatible alias used by sticker drawing helper
    const frameStickerMap = Object.fromEntries(Object.entries(FRAME_THEMES).map(([k, v]) => [k, v.stickers]));
    // Themes whose footer chrome should render on a dark paper tone (used by
    // the unified frame-chrome renderer below).
    const DARK_FRAME_THEMES = new Set(['tech', 'gold', 'film', 'galaxy', 'natal', 'agustusan', 'tahunbaru', 'imlek']);

    function buildFrameButtons() {
      const container = frameModalGrid;
      container.innerHTML = '';
      Object.entries(FRAME_THEMES).forEach(([id, cfg], idx) => {
        const btn = document.createElement('button');
        btn.dataset.frame = id;
        btn.onclick = (e) => { setFrameStyle(id, e); closeFrameModal(); };
        btn.className = `relative p-3 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1.5 card-rise-in frame-${id}` + (id === currentFrame ? ' active-choice' : '') + (id === suggestedSeasonalTheme ? ' seasonal-pick' : '');
        btn.style.setProperty('--i', idx);
        const badge = id === suggestedSeasonalTheme ? '<span class="seasonal-badge">✨ Hari ini</span>' : '';
        btn.innerHTML = `${badge}<span class="text-xl drop-shadow">${cfg.emoji}</span><span class="drop-shadow-sm">${cfg.label}</span>`;
        container.appendChild(btn);
        attachRipple(btn);
      });
    }

    function openFrameModal() {
      buildFrameButtons();
      frameModal.classList.remove('hidden');
      frameModal.classList.add('flex');
      document.body.style.overflow = 'hidden';
      clearIdleTimer();
    }

    function closeFrameModal() {
      frameModal.classList.add('hidden');
      frameModal.classList.remove('flex');
      document.body.style.overflow = '';
      armIdleTimer();
    }

    function updateFrameSummary() {
      const cfg = FRAME_THEMES[currentFrame] || FRAME_THEMES.nature;
      frameSummarySwatch.className = `w-11 h-11 rounded-lg flex items-center justify-center text-xl shrink-0 frame-${currentFrame}`;
      frameSummarySwatch.textContent = cfg.emoji;
      frameSummaryLabel.textContent = cfg.label;
    }

    // ---- IG Post frame styles (multiple selectable designs) ----
    const IG_FRAME_STYLES = {
      classic:  { label: 'Klasik',   icon: 'fa-brands fa-instagram', desc: 'Feed IG putih klasik' },
      dark:     { label: 'Dark Mode', icon: 'fa-solid fa-moon',       desc: 'Mode gelap ala malam' },
      polaroid: { label: 'Polaroid', icon: 'fa-solid fa-camera-retro', desc: 'Bingkai instax + tulisan tangan' },
      story:    { label: 'Story',    icon: 'fa-solid fa-bolt',        desc: 'Vertikal ala IG Story' }
    };
    let currentIGStyle = 'classic';

    // ---- Caption presets grouped by who the post is for ----
    const IG_CAPTION_PRESETS = {
      teman: {
        label: 'Teman', emoji: '🙌',
        captions: [
          'Rencana dadakan tapi hasil jepretannya niat banget, gokil 😭📸',
          'Squad receh, tapi vibes-nya nggak ada obat 🔥',
          'Ketawa mulu tiap sesi difoto, literally healing gratis 🤣',
          'Bucin sama circle sendiri itu real, buktinya ini 🙌'
        ]
      },
      sahabat: {
        label: 'Sahabat', emoji: '🤍',
        captions: [
          'Udah kayak keluarga kedua, drama-nya pun real 😭🤍',
          'Sahabat itu red flag aja masih dimaafin, apalagi cuma jelek di foto 💛',
          'Kenal dari kapan tau, tapi chemistry-nya nggak pernah luntur ✨',
          'Sama kamu, momen paling receh pun jadi kenangan yang di-save selamanya 🤍'
        ]
      },
      pacar: {
        label: 'Pacar', emoji: '💕',
        captions: [
          'Real ship, bukan php, buktinya udah sejauh ini 💘',
          'Kamu tuh red flag paling worth it yang pernah gue temu 😚',
          'Mager kemana-mana, tapi kalau sama kamu gercep terus 🥹',
          'Notifikasi favorit gue emang selalu dari kamu 💌'
        ]
      }
    };
    let currentIGCategory = 'teman';
    let currentIGCaption = '';

    const filterCanvasMap = {
      'normal': 'none', 'bw': 'grayscale(100%)', 'sepia': 'sepia(80%)',
      'vintage': 'sepia(40%) contrast(120%)', 'warm': 'sepia(30%) saturate(140%)', 'cool': 'hue-rotate(30deg)'
    };

    /* ---------- Pose prompts — random instruction shown during each countdown ---------- */
    const POSE_PROMPTS = [
      'Pose kaget! 😱', 'Peace sign! ✌️', 'Senyum lebar! 😄', 'Tutup mata, buka pas “cheese”! 😆',
      'Gaya model majalah! 💃', 'Wajah paling kocak! 🤪', 'Tunjuk kamera! 👉', 'Ketawa ngakak! 🤣',
      'Gaya misterius 🕵️', 'Natural aja, santai~ 😌', 'Angkat alis dramatis! 🤨', 'Gaya superhero! 🦸',
      'Kiss bye! 😘', 'Poker face! 😐', 'Loncat kalau sempat! 🤸', 'Wink ke kamera! 😉',
      'Gaya bos besar! 💼', 'Muka error! 😵', 'Tangan bentuk hati! 🫶', 'Sok imut! 🥺'
    ];
    function randomPosePrompt() { return POSE_PROMPTS[Math.floor(Math.random() * POSE_PROMPTS.length)]; }

    /* ---------- Shutter reaction lines — funny "voice line" + toast fired right at capture ---------- */
    const SHUTTER_LINES = [
      'Bagus!', 'Mantap.', 'Foto berhasil.', 'Terekam dengan baik.', 'Hasilnya oke.',
      'Timing pas.', 'Foto tersimpan.', 'Siap, lanjut.', 'Momen terekam.', 'Foto berikutnya.',
      'Klik, berhasil.', 'Bagus, satu lagi.'
    ];

    /* ---------- Decorative marquee bulbs ---------- */
    /* 3D tilt-on-hover for photo cards (mouse/trackpad only — coarse-pointer/touch devices skip it
       since there's no hover state to drive the tilt from). */
    const prefersFinePointer = window.matchMedia('(pointer: fine)').matches;
    const prefersReducedMotionTilt = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function enableTilt(el, maxDeg) {
      if (!el || !prefersFinePointer || prefersReducedMotionTilt) return;
      maxDeg = maxDeg || 7;
      let raf = null;
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rx = (0.5 - py) * maxDeg * 2;
        const ry = (px - 0.5) * maxDeg * 2;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
        });
      });
      el.addEventListener('mouseleave', () => {
        if (raf) cancelAnimationFrame(raf);
        el.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) scale(1)';
      });
    }

    function generateBulbs(container, count) {
      for (let i = 0; i < count; i++) {
        const dot = document.createElement('span');
        dot.className = 'bulb w-1.5 h-1.5 rounded-full';
        dot.style.backgroundColor = 'var(--marquee)';
        dot.style.color = 'var(--marquee)';
        dot.style.animationDelay = (i * 0.15) + 's';
        // Slight per-bulb duration jitter (deterministic via sin) so the chase feels like real,
        // slightly-inconsistent incandescent bulbs rather than a perfectly uniform loop.
        dot.style.animationDuration = (1.65 + Math.sin(i * 1.7) * 0.35).toFixed(2) + 's';
        container.appendChild(dot);
      }
    }
    generateBulbs(document.getElementById('welcome-bulbs-top'), 10);
    generateBulbs(document.getElementById('welcome-bulbs-bottom'), 10);
    generateBulbs(document.getElementById('landing-bulbs-top'), 10);
    generateBulbs(document.getElementById('landing-bulbs-bottom'), 10);
    generateBulbs(document.getElementById('auth-bulbs-top'), 10);
    generateBulbs(document.getElementById('auth-bulbs-bottom'), 10);
    buildFrameButtons();
    updateFrameSummary();
    (function initFrameAccent() {
      const cfg = FRAME_THEMES[currentFrame] || FRAME_THEMES.nature;
      stripCard.style.setProperty('--frame-accent', cfg.accent || '#c9a04a');
      enableTilt(stripCard);
      const stamp = document.getElementById('frame-stamp-ui');
      if (stamp) {
        stamp.textContent = (cfg.stampText || cfg.label).toUpperCase();
        stamp.style.color = cfg.stampFg || '#111111';
        stamp.style.background = cfg.stampBg || 'rgba(255,255,255,0.85)';
        stamp.style.borderColor = cfg.accent || 'currentColor';
      }
    })();
    buildIGStyleButtons();
    buildIGCategoryTabs();
    updateIGSummary();
    // Deferred to the next tick on purpose: this line runs during the initial,
    // synchronous top-to-bottom script execution — before later `const`
    // declarations further down the file (e.g. BORDER_DECORATORS, used deep
    // inside the render chain) have actually run. Calling refreshLiveFramedPreview()
    // directly here throws a temporal-dead-zone ReferenceError that was being
    // silently swallowed, which left the placeholder mockup ("Pose 1/2/3/4"
    // boxes) stuck on screen forever instead of the real frame design.
    // setTimeout(..., 0) waits for the whole script to finish running first,
    // so every const it depends on is safely initialized.
    setTimeout(refreshLiveFramedPreview, 0); // render the real frame chrome immediately, even with zero photos taken

    /* ---------- Audio: synthesized shutter & countdown beep ---------- */
    function getAudioCtx() {
      if (!audioCtx) {
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    }

    function playTone(freq, duration, type, vol) {
      if (isMuted) return;
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    }

    function playCountdownBeep() { playTone(720, 0.12, 'sine', 0.1); }
    function playShutterSound() {
      if (isMuted) return;
      playTone(180, 0.08, 'square', 0.14);
      setTimeout(() => playTone(1400, 0.05, 'square', 0.08), 40);
    }

    /* ---------- Funny "voice line" reaction on capture ----------
       Extends the existing synthesized-beep shutter sound: right as the shutter fires we show
       a random funny line as a toast AND, if the browser supports speech synthesis, actually
       "say" it out loud — a lightweight stand-in for pre-recorded voice clips that needs no
       audio files or extra network requests. */
    function speakLine(text) {
      if (isMuted || !('speechSynthesis' in window)) return;
      try {
        const clean = text.replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u2190-\u21FF\u2B00-\u2BFF]/gu, '').trim();
        if (!clean) return;
        const utter = new SpeechSynthesisUtterance(clean);
        utter.lang = 'id-ID';
        utter.rate = 1.15;
        utter.pitch = 1.3;
        utter.volume = 0.85;
        window.speechSynthesis.cancel(); // avoid queued lines stacking up between rapid shots
        window.speechSynthesis.speak(utter);
      } catch (e) { /* speech synthesis unsupported/blocked — toast + beep still cover the reaction */ }
    }
    function playShutterReaction() {
      if (isMuted) return;
      const line = SHUTTER_LINES[Math.floor(Math.random() * SHUTTER_LINES.length)];
      showToast(line, '📸');
      speakLine(line);
    }

    /* ---------- Ambient background MUSIC — real procedurally-composed loops ----------
       Each "vibe" is an actual little song (chord progression + walking/arpeggiated bass +
       melody hook + drum groove), sequenced live with the Web Audio API using a lookahead
       scheduler (the standard "Tale of Two Clocks" pattern) — not a static drone/pad. All
       notes are synthesized on the fly, so no audio files or network requests are needed. */

    const NOTE_LETTER_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    function noteToMidi(note) {
      const m = /^([A-Ga-g])(#|b)?(-?\d+)$/.exec(note);
      if (!m) return 60;
      let s = NOTE_LETTER_SEMITONE[m[1].toUpperCase()];
      if (m[2] === '#') s += 1; else if (m[2] === 'b') s -= 1;
      return (parseInt(m[3], 10) + 1) * 12 + s;
    }
    function midiToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
    function noteFreq(note, semitoneOffset) { return midiToFreq(noteToMidi(note) + (semitoneOffset || 0)); }
    const CHORD_TONES = { maj: [0, 4, 7], min: [0, 3, 7], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], dom7: [0, 4, 7, 10] };
    function chordFreqs(root, quality) {
      const base = noteToMidi(root);
      return (CHORD_TONES[quality] || CHORD_TONES.maj).map((iv) => midiToFreq(base + iv));
    }

    let musicNoiseBuffer = null;
    function getNoiseBuffer(ctx) {
      if (!musicNoiseBuffer || musicNoiseBuffer.sampleRate !== ctx.sampleRate) {
        const len = ctx.sampleRate * 1;
        musicNoiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = musicNoiseBuffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      return musicNoiseBuffer;
    }

    /* ---- Tiny synth "instrument" voices, all routed through the track's mix bus ---- */
    function synKick(ctx, bus, time, vol) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.14);
      gain.gain.setValueAtTime(vol || 0.9, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.24);
      osc.connect(gain); gain.connect(bus);
      osc.start(time); osc.stop(time + 0.26);
    }
    function synSnare(ctx, bus, time, vol) {
      const noise = ctx.createBufferSource();
      noise.buffer = getNoiseBuffer(ctx);
      const nf = ctx.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 1400;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(vol || 0.45, time);
      ng.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
      noise.connect(nf); nf.connect(ng); ng.connect(bus);
      noise.start(time); noise.stop(time + 0.16);
      const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = 190;
      const og = ctx.createGain();
      og.gain.setValueAtTime((vol || 0.45) * 0.5, time);
      og.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
      osc.connect(og); og.connect(bus);
      osc.start(time); osc.stop(time + 0.1);
    }
    function synHat(ctx, bus, time, open, vol) {
      const noise = ctx.createBufferSource();
      noise.buffer = getNoiseBuffer(ctx);
      const hf = ctx.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 7500;
      const hg = ctx.createGain();
      const dur = open ? 0.16 : 0.045;
      hg.gain.setValueAtTime(vol || 0.16, time);
      hg.gain.exponentialRampToValueAtTime(0.0008, time + dur);
      noise.connect(hf); hf.connect(hg); hg.connect(bus);
      noise.start(time); noise.stop(time + dur);
    }
    function synStab(ctx, bus, freqs, time, dur, wave, vol) {
      freqs.forEach((f) => {
        const osc = ctx.createOscillator(); osc.type = wave || 'triangle'; osc.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, time);
        g.gain.exponentialRampToValueAtTime(vol || 0.09, time + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
        osc.connect(g); g.connect(bus);
        osc.start(time); osc.stop(time + dur + 0.02);
      });
    }
    function synPad(ctx, bus, freqs, time, dur, wave, vol) {
      freqs.forEach((f) => {
        [0, 1].forEach((i) => {
          const osc = ctx.createOscillator();
          osc.type = wave || 'sawtooth';
          osc.frequency.value = f;
          osc.detune.value = i === 0 ? -4 : 4;
          const g = ctx.createGain();
          const peak = vol || 0.05;
          g.gain.setValueAtTime(0.0001, time);
          g.gain.exponentialRampToValueAtTime(peak, time + 0.25);
          g.gain.setValueAtTime(peak, Math.max(time + 0.25, time + dur - 0.2));
          g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
          osc.connect(g); g.connect(bus);
          osc.start(time); osc.stop(time + dur + 0.05);
        });
      });
    }
    function synBass(ctx, bus, freq, time, dur, wave, vol) {
      const osc = ctx.createOscillator(); osc.type = wave || 'sine'; osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(vol || 0.16, time + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      osc.connect(g); g.connect(bus);
      osc.start(time); osc.stop(time + dur + 0.02);
    }
    function synLead(ctx, bus, freq, time, dur, wave, vol) {
      const osc = ctx.createOscillator(); osc.type = wave || 'square'; osc.frequency.value = freq;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 5.5;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = freq * 0.006;
      lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(vol || 0.08, time + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      osc.connect(g); g.connect(bus);
      osc.start(time); lfo.start(time);
      osc.stop(time + dur + 0.02); lfo.stop(time + dur + 0.02);
    }

    /* ---- The 4 studio "vibes" — each a real 4-bar loop with its own chords/bass/melody/drums ---- */
    const MUSIC_TRACKS = {
      lounge: {
        label: 'Lounge Jazz', icon: 'fa-mug-hot', bpm: 86, swing: 0.55, style: 'lounge',
        progression: [{ root: 'D3', q: 'min7' }, { root: 'G3', q: 'dom7' }, { root: 'C3', q: 'maj7' }, { root: 'A2', q: 'min7' }],
      },
      arcade: {
        label: 'Arcade 8-bit', icon: 'fa-gamepad', bpm: 140, swing: 0, style: 'arcade',
        progression: [{ root: 'C3', q: 'maj' }, { root: 'G2', q: 'maj' }, { root: 'A2', q: 'min' }, { root: 'F2', q: 'maj' }],
      },
      lofi: {
        label: 'Lo-fi Chill', icon: 'fa-cloud-moon', bpm: 72, swing: 0.6, style: 'lofi',
        progression: [{ root: 'F3', q: 'maj7' }, { root: 'E3', q: 'min7' }, { root: 'D3', q: 'min7' }, { root: 'C3', q: 'maj7' }],
      },
      synthwave: {
        label: 'Synth Retro', icon: 'fa-satellite-dish', bpm: 100, swing: 0, style: 'synthwave',
        progression: [{ root: 'A2', q: 'min' }, { root: 'F2', q: 'maj' }, { root: 'C3', q: 'maj' }, { root: 'G2', q: 'maj' }],
      },
    };
    const VIBE_KEYS = Object.keys(MUSIC_TRACKS);
    let currentVibe = 'lounge';
    updateVibeButtonUI();

    const STEPS_PER_BAR = 16;
    const BARS_PER_LOOP = 4;
    const SCHEDULE_AHEAD = 0.12; // seconds — how far ahead we queue notes
    const LOOKAHEAD_MS = 25;     // how often the scheduler wakes up to queue more

    function swingDelay(step, secondsPerStep, swingAmt) {
      // Push the "and" of every beat (odd 16th-steps) a touch later for a swung, human feel.
      return step % 2 === 1 ? secondsPerStep * (swingAmt || 0) : 0;
    }

    function scheduleStepForTrack(track, ctx, bus, bar, step, time) {
      const chord = track.progression[bar % track.progression.length];
      const freqs = chordFreqs(chord.root, chord.q);
      const rootBass = noteFreq(chord.root, -12);

      if (track.style === 'lounge') {
        if (step === 0) { synStab(ctx, bus, freqs, time, 0.9, 'triangle', 0.075); synBass(ctx, bus, rootBass, time, 0.5, 'sine', 0.16); }
        if (step === 8) { synBass(ctx, bus, noteFreq(chord.root, -5), time, 0.45, 'sine', 0.13); synSnare(ctx, bus, time, 0.18); }
        if (step === 2 || step === 6 || step === 10 || step === 14) synHat(ctx, bus, time, false, 0.07);
        if (step === 4) synLead(ctx, bus, noteFreq(chord.root, 7), time, 0.32, 'sine', 0.05);
        if (step === 13) synLead(ctx, bus, noteFreq(chord.root, 12), time, 0.32, 'sine', 0.05);
      } else if (track.style === 'arcade') {
        const arp = [0, 4, 7, 4];
        if (step % 4 === 0) synBass(ctx, bus, noteFreq(chord.root, arp[(step / 4) % arp.length] - 12), time, 0.11, 'square', 0.11);
        const hook = [12, 15, 19, 15, 17, 19, 24, 19];
        if (step % 2 === 0) synLead(ctx, bus, noteFreq(chord.root, hook[((step / 2) + bar * 8) % hook.length]), time, 0.16, 'square', 0.07);
        if (step === 0 || step === 4 || step === 8 || step === 12) synKick(ctx, bus, time, 0.8);
        if (step === 4 || step === 12) synSnare(ctx, bus, time, 0.35);
        synHat(ctx, bus, time, false, 0.055);
      } else if (track.style === 'lofi') {
        if (step === 0) { synPad(ctx, bus, freqs, time, 1.8, 'sine', 0.045); synBass(ctx, bus, rootBass, time, 0.6, 'sine', 0.15); synKick(ctx, bus, time, 0.55); }
        if (step === 10) { synBass(ctx, bus, rootBass, time, 0.4, 'sine', 0.11); synKick(ctx, bus, time, 0.5); }
        if (step === 4 || step === 12) synSnare(ctx, bus, time, 0.22);
        if (step === 2 || step === 5 || step === 8 || step === 11 || step === 14) synHat(ctx, bus, time, false, 0.045);
        if (step === 6 && bar % 2 === 1) synLead(ctx, bus, noteFreq(chord.root, 12), time, 0.5, 'triangle', 0.045);
      } else if (track.style === 'synthwave') {
        if (step === 0) { synPad(ctx, bus, freqs, time, 3.6, 'sawtooth', 0.045); synLead(ctx, bus, noteFreq(chord.root, 12), time, 1.4, 'sawtooth', 0.055); }
        if (step === 8) synLead(ctx, bus, noteFreq(chord.root, 15), time, 1.4, 'sawtooth', 0.05);
        const bassPattern = [0, -12, 0, 7, 0, -12, 0, 3];
        if (step % 2 === 0) synBass(ctx, bus, noteFreq(chord.root, bassPattern[(step / 2) % bassPattern.length] - 12), time, 0.22, 'sawtooth', 0.12);
        if (step === 0 || step === 8) synKick(ctx, bus, time, 0.75);
        if (step === 4 || step === 12) synSnare(ctx, bus, time, 0.3);
        if (step % 2 === 0) synHat(ctx, bus, time, false, 0.05);
      }
    }

    function startAmbient() {
      if (isMuted || ambientNodes) return;
      const ctx = getAudioCtx();
      if (!ctx) return;
      const track = MUSIC_TRACKS[currentVibe] || MUSIC_TRACKS.lounge;

      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.0001, ctx.currentTime);
      bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.8);
      const comp = ctx.createDynamicsCompressor();
      bus.connect(comp);
      comp.connect(ctx.destination);

      const state = {
        ctx, bus, comp, track,
        secondsPerStep: (60 / track.bpm) / 4,
        nextNoteTime: ctx.currentTime + 0.05,
        step: 0, bar: 0, timerID: null, stopping: false,
      };

      function advance() {
        state.nextNoteTime += state.secondsPerStep;
        state.step += 1;
        if (state.step >= STEPS_PER_BAR) { state.step = 0; state.bar = (state.bar + 1) % BARS_PER_LOOP; }
      }
      function loop() {
        if (state.stopping) return;
        while (state.nextNoteTime < state.ctx.currentTime + SCHEDULE_AHEAD) {
          const swing = swingDelay(state.step, state.secondsPerStep, state.track.swing);
          scheduleStepForTrack(state.track, state.ctx, state.bus, state.bar, state.step, state.nextNoteTime + swing);
          advance();
        }
        state.timerID = setTimeout(loop, LOOKAHEAD_MS);
      }
      loop();
      ambientNodes = state;
    }
    function stopAmbient() {
      if (!ambientNodes) return;
      const state = ambientNodes;
      ambientNodes = null; // release right away so cycleVibe() can start the next track immediately (crossfade)
      state.stopping = true;
      if (state.timerID) clearTimeout(state.timerID);
      try {
        state.bus.gain.cancelScheduledValues(state.ctx.currentTime);
        state.bus.gain.setValueAtTime(state.bus.gain.value, state.ctx.currentTime);
        state.bus.gain.linearRampToValueAtTime(0.0001, state.ctx.currentTime + 0.35);
      } catch (e) { /* context may already be gone */ }
      setTimeout(() => { try { state.bus.disconnect(); state.comp.disconnect(); } catch (e) {} }, 500);
    }
    function updateVibeButtonUI() {
      const vibe = MUSIC_TRACKS[currentVibe];
      const icon = document.getElementById('vibe-icon');
      const label = document.getElementById('vibe-label');
      if (icon) icon.className = `fa-solid ${vibe.icon} text-xs`;
      if (label) label.textContent = vibe.label;
    }
    function cycleVibe() {
      const idx = VIBE_KEYS.indexOf(currentVibe);
      currentVibe = VIBE_KEYS[(idx + 1) % VIBE_KEYS.length];
      updateVibeButtonUI();
      if (ambientNodes) { stopAmbient(); startAmbient(); }
      showToast(`Musik latar studio: ${MUSIC_TRACKS[currentVibe].label}`, '🎵');
    }

    /* Paper-feed sound — a short noisy sweep timed with the print-out animation */
    function playPrintSound() {
      if (isMuted) return;
      const ctx = getAudioCtx();
      if (!ctx) return;
      const bufferSize = ctx.sampleRate * 0.6;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.35;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.6);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      noise.start(); noise.stop(ctx.currentTime + 0.6);
    }

    function toggleMute() {
      isMuted = !isMuted;
      muteIcon.className = isMuted ? 'fa-solid fa-volume-xmark text-xs' : 'fa-solid fa-volume-high text-xs';
      if (isMuted) stopAmbient();
      else { getAudioCtx(); if (sessionStarted) startAmbient(); }
      showToast(isMuted ? 'Suara dimatikan' : 'Suara diaktifkan', isMuted ? '🔇' : '🔊');
      syncSoundMenuToggle();
    }

    function syncSoundMenuToggle() {
      const sw = document.getElementById('sound-menu-switch');
      const icon = document.getElementById('sound-menu-icon');
      const item = document.getElementById('sound-menu-item');
      if (sw) sw.classList.toggle('is-on', !isMuted);
      if (icon) icon.className = (isMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high') + ' w-5';
      if (item) item.setAttribute('aria-checked', String(!isMuted));
    }

    /* ---------- Button ripple micro-interaction ---------- */
    function attachRipple(el) {
      if (!el) return;
      el.addEventListener('pointerdown', (e) => {
        if (el.disabled) return;
        const rect = el.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const span = document.createElement('span');
        span.className = 'ripple-span';
        span.style.width = span.style.height = size + 'px';
        span.style.left = (e.clientX - rect.left - size / 2) + 'px';
        span.style.top = (e.clientY - rect.top - size / 2) + 'px';
        el.appendChild(span);
        setTimeout(() => span.remove(), 600);
      });
    }
    document.querySelectorAll('.ripple-btn').forEach(attachRipple);
    attachRipple(cameraSwitchBtn);
    attachRipple(document.getElementById('mute-toggle'));
    setActiveNavTab('home');

    /* ---------- Tilt / parallax on the machine card ---------- */
    const canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (machineCard && canHover && !prefersReducedMotion) {
      machineCard.addEventListener('mousemove', (e) => {
        const rect = machineCard.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        machineCard.style.transform = `perspective(900px) rotateY(${px * 5}deg) rotateX(${-py * 5}deg)`;
      });
      machineCard.addEventListener('mouseleave', () => {
        machineCard.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg)';
      });
    }

    /* ---------- Toast + Confetti ---------- */
    function showToast(msg, icon) {
      icon = icon || '✅';
      const el = document.createElement('div');
      el.className = 'pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#ffffff]/95 border border-[#6b5f45] shadow-2xl text-sm font-semibold text-[#241f16] toast-in';
      el.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
      toastContainer.appendChild(el);
      setTimeout(() => {
        el.classList.remove('toast-in');
        el.classList.add('toast-out');
        setTimeout(() => el.remove(), 320);
      }, 2400);
    }

    function fireConfetti() {
      if (typeof confetti === 'function') {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.7 }, colors: ['#c9a04a', '#c96b4a', '#b8860b', '#f3e6c7'] });
      }
    }

    function playPrintOutAnimation() {
      if (!printSlotPaper) return;
      printSlotPaper.classList.remove('animate-paper-slide');
      void printSlotPaper.offsetWidth;
      printSlotPaper.classList.add('animate-paper-slide');
    }

    function celebrateOutput() {
      fireConfetti();
      playPrintOutAnimation();
      playPrintSound();
    }

    /* ---------- Grand Reveal: fires once, right when the last pose of a session lands ---------- */
    function playRevealFanfare() {
      if (isMuted) return;
      // short ascending drumroll — quick pulses building tension
      const rollFreqs = [300, 340, 380, 420, 470, 520];
      rollFreqs.forEach((f, i) => setTimeout(() => playTone(f, 0.07, 'square', 0.06), i * 55));
      // triumphant major triad "ta-da" right after the roll
      const chordDelay = rollFreqs.length * 55 + 90;
      setTimeout(() => {
        playTone(523.25, 0.4, 'triangle', 0.13); // C5
        playTone(659.25, 0.4, 'triangle', 0.1);  // E5
        playTone(783.99, 0.45, 'triangle', 0.11); // G5
      }, chordDelay);
    }

    function showRevealBanner() {
      if (!stripCard) return;
      const old = stripCard.querySelector('.reveal-banner');
      if (old) old.remove();
      const banner = document.createElement('div');
      banner.className = 'reveal-banner';
      banner.innerHTML = '✨ SESI SELESAI! ✨';
      stripCard.appendChild(banner);
      setTimeout(() => banner.remove(), 2200);
    }

    function triggerGrandReveal() {
      playRevealFanfare();
      fireConfetti();
      if (stripCard) {
        stripCard.classList.remove('grand-reveal');
        void stripCard.offsetWidth;
        stripCard.classList.add('grand-reveal');
      }
      showRevealBanner();
    }

    /* ---------- Photo Battle: Tinder-style knockout vote, winner becomes the favorite ----------
       Runs once per session right after the grand reveal, before the strip is treated as final.
       Shuffles all captured poses into random pairs, the tapped/swiped-up photo advances, byes
       auto-advance on odd counts, and the last photo standing is set as the favorite (same
       favoriteIndex used everywhere else — IG post, star badge, etc). */
    function shuffleArray(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    function startPhotoBattle() {
      if (battleActive || battleDone) return;
      if (!capturedImages.length || capturedImages.length < 2) { battleDone = true; return; }
      battleActive = true;
      battleOrder = shuffleArray(capturedImages.map((_, i) => i));
      battleWinners = [];
      battleRoundIdx = 0;
      battleModal.classList.remove('hidden');
      battleModal.classList.add('flex');
      clearIdleTimer();
      runNextBattleMatch();
    }

    function skipPhotoBattle() {
      battleActive = false;
      battleDone = true;
      battleModal.classList.add('hidden');
      battleModal.classList.remove('flex');
      armIdleTimer();
    }

    function runNextBattleMatch() {
      // Still pairs left to fight in this round
      if (battleRoundIdx + 1 < battleOrder.length) {
        const pair = [battleOrder[battleRoundIdx], battleOrder[battleRoundIdx + 1]];
        battleRoundIdx += 2;
        renderBattlePair(pair);
        return;
      }
      // Odd one out this round gets a bye, auto-advances
      if (battleRoundIdx < battleOrder.length) {
        battleWinners.push(battleOrder[battleRoundIdx]);
      }
      if (battleWinners.length <= 1) {
        finishPhotoBattle(battleWinners[0] ?? battleOrder[0]);
        return;
      }
      // Next round: this round's winners become the new bracket
      battleOrder = battleWinners;
      battleWinners = [];
      battleRoundIdx = 0;
      runNextBattleMatch();
    }

    function battleRoundTotalPairs() {
      return Math.floor(battleOrder.length / 2) + (battleOrder.length % 2);
    }

    function renderBattlePair(pair) {
      const matchNo = Math.floor(battleRoundIdx / 2) || 1;
      const totalPairs = battleRoundTotalPairs();
      const isFinalRound = battleOrder.length <= 2;
      battleRoundLabel.textContent = isFinalRound
        ? 'Ronde final — mana yang jadi favorit?'
        : `Ronde eliminasi · Duel ${Math.max(matchNo, 1)} dari ${totalPairs}`;

      battlePairEl.innerHTML = '';
      pair.forEach((photoIdx) => {
        const card = document.createElement('div');
        card.className = 'battle-card';
        card.innerHTML = `
          <img src="${capturedImages[photoIdx]}" alt="Foto pose ${photoIdx + 1}">
          <span class="battle-like-stamp">SUKA</span>
          <span class="battle-nope-stamp">NOPE</span>
          <div class="battle-pick-btn"><i class="fa-solid fa-heart"></i> Pilih Ini</div>
        `;
        card.onclick = (e) => { if (!card.dataset.dragged) chooseBattleWinner(photoIdx, card); };
        attachBattleSwipe(card, () => chooseBattleWinner(photoIdx, card));
        battlePairEl.appendChild(card);

        if (pair.length > 1 && photoIdx === pair[0]) {
          const vs = document.createElement('div');
          vs.className = 'battle-vs';
          vs.textContent = 'VS';
          battlePairEl.appendChild(vs);
        }
      });
    }

    /* Lightweight drag-to-swipe: pressing and dragging a card up (or far enough sideways)
       past a threshold "picks" it, mimicking a Tinder swipe. A plain tap also picks it via
       the card's onclick, so it still works with mouse/keyboard-only input. */
    function attachBattleSwipe(card, onPick) {
      let startX = 0, startY = 0, dragging = false, picked = false;
      const likeStamp = () => card.querySelector('.battle-like-stamp');
      const nopeStamp = () => card.querySelector('.battle-nope-stamp');

      let axisLocked = null; // 'x' once we're sure this is a horizontal swipe, not a page scroll

      card.addEventListener('pointerdown', (e) => {
        dragging = true; picked = false;
        axisLocked = null;
        startX = e.clientX; startY = e.clientY;
        card.classList.add('dragging');
        // Don't capture yet — wait until we know the gesture is actually
        // a horizontal swipe. This lets a plain vertical drag fall through
        // to the browser's native scroll (touch-action: pan-y on .battle-card),
        // instead of the card eating every single-finger touch.
      });
      card.addEventListener('pointermove', (e) => {
        if (!dragging || picked) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (axisLocked === null) {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; // too small to tell yet
          axisLocked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
          if (axisLocked === 'x') card.setPointerCapture(e.pointerId);
          else return; // vertical intent -> let native page scroll handle it
        }
        if (axisLocked !== 'x') return;

        card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg)`;
        card.dataset.dragged = (Math.abs(dx) > 8 || Math.abs(dy) > 8) ? '1' : '';
        likeStamp().style.opacity = dy < -30 ? Math.min(1, -dy / 90) : 0;
        nopeStamp().style.opacity = dx < -40 ? Math.min(1, -dx / 120) : 0;
        if (dx > 90) {
          picked = true;
          onPick();
        }
      });
      const endDrag = () => {
        if (!dragging) return;
        dragging = false;
        card.classList.remove('dragging');
        card.style.transform = '';
        setTimeout(() => { card.dataset.dragged = ''; }, 0);
      };
      card.addEventListener('pointerup', endDrag);
      card.addEventListener('pointercancel', endDrag);
      card.addEventListener('pointerleave', () => { if (dragging && !picked) endDrag(); });
    }

    function chooseBattleWinner(photoIdx, cardEl) {
      if (cardEl) cardEl.classList.add('battle-winner');
      battleWinners.push(photoIdx);
      setTimeout(runNextBattleMatch, 220);
    }

    function finishPhotoBattle(winnerIdx) {
      battleActive = false;
      battleDone = true;
      battleModal.classList.add('hidden');
      battleModal.classList.remove('flex');
      selectFavorite(winnerIdx);
      showToast('Foto favorit terpilih lewat Photo Battle! 🏆', '🏆');
      armIdleTimer();
    }

    /* ---------- Seasonal theme auto-suggest ----------
       Lebaran (Idul Fitri) and Imlek follow the lunar calendar, so their exact dates shift
       every year — this table needs a yearly top-up (check the official Kemenag / national
       calendar). Natal, 17 Agustus, and Tahun Baru are fixed Gregorian dates so they don't
       need updating. */
    const LUNAR_EVENT_DATES = {
      lebaran: { 2024: '2024-04-10', 2025: '2025-03-31', 2026: '2026-03-20', 2027: '2027-03-10', 2028: '2028-02-26' },
      imlek:   { 2024: '2024-02-10', 2025: '2025-01-29', 2026: '2026-02-17', 2027: '2027-02-06', 2028: '2028-01-26' }
    };
    function isDateWithinWindow(today, target, daysBefore, daysAfter) {
      const oneDay = 86400000;
      const t0 = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
      const c0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const diffDays = Math.round((c0 - t0) / oneDay);
      return diffDays >= -daysBefore && diffDays <= daysAfter;
    }
    /* Returns the FRAME_THEMES key to suggest for `today` (or null). Checked in roughly
       chronological order; each event has a "window" of days before/after its exact date
       during which it's considered a live suggestion. */
    function getSeasonalThemeSuggestion(today) {
      today = today || new Date();
      const y = today.getFullYear();
      const lebaranDate = LUNAR_EVENT_DATES.lebaran[y] ? new Date(LUNAR_EVENT_DATES.lebaran[y]) : null;
      const imlekDate = LUNAR_EVENT_DATES.imlek[y] ? new Date(LUNAR_EVENT_DATES.imlek[y]) : null;
      const candidates = [
        { id: 'tahunbaru', target: new Date(y, 0, 1), before: 2, after: 1 },
        { id: 'imlek', target: imlekDate, before: 3, after: 2 },
        { id: 'lebaran', target: lebaranDate, before: 3, after: 4 },
        { id: 'agustusan', target: new Date(y, 7, 17), before: 6, after: 1 },
        { id: 'natal', target: new Date(y, 11, 25), before: 12, after: 2 }
      ];
      for (const c of candidates) {
        if (c.target && isDateWithinWindow(today, c.target, c.before, c.after)) return c.id;
      }
      return null;
    }

    /* ---------- Welcome / layout-select kiosk flow ---------- */
    const THEME_KEYS = Object.keys(FRAME_THEMES);
    /* Picks a live-and-suggested seasonal theme (if today falls in one of its windows),
       pre-applies it as the default frame so the kiosk feels "alive" without manual setup,
       and flags it (✨ badge) in the frame picker so staff/users know why it was chosen. */
    function applySeasonalSuggestionIfAny() {
      const id = getSeasonalThemeSuggestion();
      if (!id || !FRAME_THEMES[id]) return;
      suggestedSeasonalTheme = id;
      const idx = THEME_KEYS.indexOf(id);
      if (idx !== -1) welcomeRotateIdx = idx;
      setFrameStyle(id);
      showToast(`Tema musiman "${FRAME_THEMES[id].label}" otomatis dipasang — ganti kapan saja di menu Tema Bingkai`, FRAME_THEMES[id].emoji);
    }
    let welcomeRotateIdx = 0;
    let welcomeRotateTimer = null;
    function rotateWelcomeTheme() {
      const key = THEME_KEYS[welcomeRotateIdx % THEME_KEYS.length];
      const cfg = FRAME_THEMES[key];
      if (welcomeThemePreview) welcomeThemePreview.innerText = cfg.emoji;
      if (welcomeThemeLabel) welcomeThemeLabel.innerText = cfg.label;
      welcomeRotateIdx++;
    }
    function startWelcomeRotator() {
      rotateWelcomeTheme();
      clearInterval(welcomeRotateTimer);
      welcomeRotateTimer = setInterval(rotateWelcomeTheme, 1800);
    }

    function generateSessionCode() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
      sessionCode = code;
      if (sessionCodeBadge) sessionCodeBadge.innerText = '#' + code;
      return code;
    }

    function enterApp() {
      // Swap the welcome-screen straight to the layout-picking stage while it's
      // still hidden behind the landing page, so the fade-out reveals it seamlessly.
      goToLayoutStage();
      landingScreen.classList.add('landing-fade-out');
      setTimeout(() => { landingScreen.style.display = 'none'; }, 550);
    }

    function goToLayoutStage() {
      welcomeStageStart.classList.add('hidden');
      welcomeStageLayout.classList.remove('hidden');
      welcomeStageLayout.classList.add('flex');
    }
    function backToStartStage() {
      welcomeStageLayout.classList.add('hidden');
      welcomeStageLayout.classList.remove('flex');
      welcomeStageStart.classList.remove('hidden');
    }

    function chooseLayout(layoutKey) {
      const preset = LAYOUT_PRESETS[layoutKey] || LAYOUT_PRESETS.strip4;
      selectedLayout = layoutKey;
      POSE_COUNT = preset.pose;
      poseCountSelect.value = String(preset.pose);
      snapBtnLabel.innerHTML = `<i class="fa-solid fa-camera"></i> Ambil Foto (${POSE_COUNT} Pose)`;
      photoList.innerHTML = buildPlaceholderHTML(POSE_COUNT);
      updateStatusUI(0);
      highlightRecommendedExport(preset.exportMode);

      generateSessionCode();
      sessionStarted = true;
      clearInterval(welcomeRotateTimer);
      welcomeScreen.style.opacity = '0';
      setTimeout(() => { welcomeScreen.style.display = 'none'; }, 400);

      if (!currentStream) initCamera();
      if (!isMuted) { getAudioCtx(); startAmbient(); }
      showToast(`Sesi dimulai · Layout: ${preset.label}`, '🎬');
      armIdleTimer();
    }

    function highlightRecommendedExport(mode) {
      [pngBtn, gridBtn].forEach(b => b && b.classList.remove('ring-2', 'ring-[var(--brass-soft)]', 'ring-offset-2', 'ring-offset-[#ffffff]'));
      const target = mode === 'grid' ? gridBtn : pngBtn;
      if (target) target.classList.add('ring-2', 'ring-[var(--brass-soft)]', 'ring-offset-2', 'ring-offset-[#ffffff]');
    }

    function showWelcomeScreen() {
      welcomeScreen.style.display = 'flex';
      requestAnimationFrame(() => { welcomeScreen.style.opacity = '1'; });
      backToStartStage();
      startWelcomeRotator();
    }

    /* ---------------- Bottom nav: Home / Sesi Potret / Sesi POV / Menu ---------------- */
    function setActiveNavTab(tab) {
      let activeBtn = null;
      document.querySelectorAll('.bottom-nav-btn').forEach((btn) => {
        const isActive = btn.dataset.nav === tab;
        btn.classList.toggle('nav-tab-active', isActive);
        if (isActive) {
          activeBtn = btn;
          btn.classList.remove('nav-tab-pop');
          // Re-trigger the pop animation even on repeated taps of the same tab.
          void btn.offsetWidth;
          btn.classList.add('nav-tab-pop');
        }
      });
      followNavIndicator(activeBtn);
    }

    // Menggerakkan pill indikator brass supaya "meleleh" mengikuti tombol aktif,
    // termasuk saat labelnya masih melebar (bukan lompat instan ke ukuran akhir).
    var navIndicatorRAF = null; // var (not let): setActiveNavTab('home') runs earlier in this
    // script's top-level init (see line ~575), before this point — a `let` here would throw
    // a temporal-dead-zone ReferenceError at that early call and silently abort ALL script
    // execution after it, breaking unrelated things like the layout-picker buttons.
    function followNavIndicator(activeBtn) {
      const dock = document.getElementById('nav-dock');
      const indicator = document.getElementById('nav-indicator');
      if (!dock || !indicator || !activeBtn) return;
      if (navIndicatorRAF) cancelAnimationFrame(navIndicatorRAF);
      indicator.style.opacity = '1';
      const start = performance.now();
      const FOLLOW_MS = 480; // selaras dengan durasi transisi label/ikon di CSS
      function step(now) {
        const dockRect = dock.getBoundingClientRect();
        const btnRect = activeBtn.getBoundingClientRect();
        indicator.style.width = btnRect.width + 'px';
        indicator.style.transform = `translateX(${btnRect.left - dockRect.left}px)`;
        if (now - start < FOLLOW_MS) {
          navIndicatorRAF = requestAnimationFrame(step);
        } else {
          navIndicatorRAF = null;
        }
      }
      navIndicatorRAF = requestAnimationFrame(step);
    }
    window.addEventListener('resize', () => {
      const activeBtn = document.querySelector('.bottom-nav-btn.nav-tab-active');
      if (activeBtn) followNavIndicator(activeBtn);
    });

    function closeAllOpenModalsForNav() {
      [frameModal, igModal, battleModal, previewModal].forEach((m) => {
        if (m && !m.classList.contains('hidden')) {
          m.classList.add('hidden');
          m.classList.remove('flex');
        }
      });
      document.body.style.overflow = '';
      // Galeri (riwayat foto) & pratinjau POV juga berupa overlay modal — pastikan
      // ikut tertutup ketika pindah tab, supaya tab tujuan langsung terlihat.
      if (window.JepretinAuth) {
        JepretinAuth.closeHistoryModal();
        JepretinAuth.closeMockupModal();
      }
    }

    function goHome() {
      closeAllOpenModalsForNav();
      closeMoreMenu();
      setActiveNavTab('home');
      if (welcomeScreen) welcomeScreen.style.display = 'none';
      if (landingScreen) {
        landingScreen.classList.remove('landing-fade-out');
        landingScreen.style.display = 'flex';
      }
    }

    function goToSesiPotret() {
      closeAllOpenModalsForNav();
      closeMoreMenu();
      setActiveNavTab('potret');
      const landingVisible = landingScreen && landingScreen.style.display !== 'none' && !landingScreen.classList.contains('landing-fade-out');
      if (landingVisible) {
        enterApp();
      } else if (welcomeScreen && welcomeScreen.style.display !== 'none' && !sessionStarted) {
        goToLayoutStage();
      }
      // Kalau sesi sudah berjalan, tinggal pastikan tidak ada layar lain yang menutupi studio.
    }

    function goToSesiPOV() {
      closeAllOpenModalsForNav();
      closeMoreMenu();
      setActiveNavTab('pov');
      if (window.JepretinAuth) JepretinAuth.openHistoryModal();
    }

    function openMoreMenu() {
      closeAllOpenModalsForNav();
      setActiveNavTab('menu');
      const modal = document.getElementById('more-menu-modal');
      if (!modal) return;
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      syncSoundMenuToggle();
    }
    function closeMoreMenu() {
      const modal = document.getElementById('more-menu-modal');
      if (!modal) return;
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    startWelcomeRotator();
    applySeasonalSuggestionIfAny();

    let currentStream = null;

    async function initCamera(deviceId) {
      cameraErrorEl.classList.add('hidden');
      cameraErrorEl.classList.remove('flex');
      try {
        if (currentStream) {
          currentStream.getTracks().forEach(t => t.stop());
        }
        const constraints = {
          // Don't force a landscape 4:3 resolution — that made mobile browsers letterbox/
          // crop their naturally-portrait camera stream. Using "ideal" (not exact) lets
          // desktop webcams still get a nice ~1280-wide feed while phones keep their
          // native portrait stream, which now matches the responsive camera-frame box.
          video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = stream;
        video.srcObject = stream;

        // Discover available cameras (for the switch button) after permission is granted
        const devices = await navigator.mediaDevices.enumerateDevices();
        videoDevices = devices.filter(d => d.kind === 'videoinput');
        if (videoDevices.length > 1) {
          cameraSwitchBtn.classList.remove('hidden');
          cameraSwitchBtn.classList.add('flex');
        }
      } catch (err) {
        cameraErrorEl.classList.remove('hidden');
        cameraErrorEl.classList.add('flex');
        cameraErrorDetail.textContent = err && err.name === 'NotAllowedError'
          ? 'Akses kamera ditolak. Izinkan lewat pengaturan browser lalu coba lagi.'
          : 'Kamera tidak ditemukan atau sedang dipakai aplikasi lain.';
      }
    }

    async function switchCamera() {
      if (videoDevices.length < 2) return;
      currentDeviceIndex = (currentDeviceIndex + 1) % videoDevices.length;
      await initCamera(videoDevices[currentDeviceIndex].deviceId);
      showToast('Kamera diganti', '🔄');
    }

    function setFilter(name, evt) {
      currentFilter = name;
      video.className = `w-full h-full object-cover transform -scale-x-100 filter-${name} transition-all duration-300`;

      document.querySelectorAll('#filter-btns button').forEach(b => b.classList.remove('active-choice'));
      if (evt && evt.currentTarget) evt.currentTarget.classList.add('active-choice');
    }

    function setFrameStyle(styleName, evt) {
      currentFrame = styleName;
      stripCard.className = `relative flex-1 p-4 rounded-2xl shadow-2xl flex flex-col gap-3 items-center transition-all duration-500 overflow-hidden tilt-card frame-${styleName}`;

      document.querySelectorAll('#frame-modal-grid button').forEach(b => b.classList.remove('active-choice'));
      if (evt && evt.currentTarget) evt.currentTarget.classList.add('active-choice');
      updateFrameSummary();

      const cfg = FRAME_THEMES[styleName] || FRAME_THEMES.nature;
      const st = cfg.stickers;
      document.getElementById('stk-1').innerText = st[0];
      document.getElementById('stk-2').innerText = st[1];
      document.getElementById('stk-3').innerText = st[2];
      document.getElementById('stk-4').innerText = st[3];
      document.getElementById('stk-5').innerText = st[4];
      document.getElementById('stk-6').innerText = st[5];

      const brand = document.getElementById('brand-ui-text');
      const sub = document.getElementById('subtitle-ui-text');
      const tag = document.getElementById('tagline-ui-text');
      brand.className = cfg.brandClass;
      brand.innerText = 'JEPRETIN'; // always show the real app identity, never the per-theme studio name
      sub.innerText = cfg.subText;
      tag.innerText = cfg.tagline;

      // Accent colour drives the corner brackets + photo mat ring for every theme.
      stripCard.style.setProperty('--frame-accent', cfg.accent || '#c9a04a');
      const stamp = document.getElementById('frame-stamp-ui');
      if (stamp) {
        stamp.textContent = (cfg.stampText || cfg.label).toUpperCase();
        stamp.style.color = cfg.stampFg || '#111111';
        stamp.style.background = cfg.stampBg || 'rgba(255,255,255,0.85)';
        stamp.style.borderColor = cfg.accent || 'currentColor';
        // Restart the entrance animation on every theme switch.
        stamp.classList.remove('frame-stamp-in');
        void stamp.offsetWidth;
        stamp.classList.add('frame-stamp-in');
      }

      // Brief accent sweep on the strip card so switching themes reads as a
      // deliberate re-print, not an instant colour swap.
      stripCard.classList.remove('frame-swap-flash');
      void stripCard.offsetWidth;
      stripCard.classList.add('frame-swap-flash');

      refreshLiveFramedPreview();
    }

    function setPoseCount(val) {
      POSE_COUNT = parseInt(val, 10) || 4;
      snapBtnLabel.innerHTML = `<i class="fa-solid fa-camera"></i> Ambil Foto (${POSE_COUNT} Pose)`;
      if (capturedImages.length > 0) resetSession();
      else {
        photoList.innerHTML = buildPlaceholderHTML(POSE_COUNT);
        updateStatusUI(0);
        Object.keys(framedCache).forEach(k => delete framedCache[k]);
        refreshLiveFramedPreview(); // slot count changed — re-render with the new number of empty slots
      }
    }

    function setInterval_(val) {
      CAPTURE_INTERVAL = parseInt(val, 10) || 3;
    }

    function triggerFlash() {
      flashEl.classList.remove('animate-flash');
      void flashEl.offsetWidth;
      flashEl.classList.add('animate-flash');

      irisOverlay.classList.remove('animate-iris');
      void irisOverlay.offsetWidth;
      irisOverlay.classList.add('animate-iris');

      playShutterSound();
      playShutterReaction();
    }

    async function startCaptureSequence() {
      if (isCapturing || isRetaking) return;
      isCapturing = true;
      capturedImages = [];
      capturedBursts = [];
      favoriteIndex = null;
      celebrated = false;
      battleDone = false;
      clearIdleTimer();
      snapBtn.disabled = true;
      poseCountSelect.disabled = true;
      intervalSelect.disabled = true;
      resetBtn.classList.add('hidden');
      cameraFrame.classList.add('bulb-fast');

      for (let i = 0; i < POSE_COUNT; i++) {
        await runCountdown(CAPTURE_INTERVAL, randomPosePrompt());
        triggerFlash();
        await captureSinglePhoto(i);
      }
      triggerGrandReveal();
      snapBtn.disabled = false;
      poseCountSelect.disabled = false;
      intervalSelect.disabled = false;
      cameraFrame.classList.remove('bulb-fast');
      isCapturing = false;

      // Let the reveal confetti/fanfare play, then — before the strip is treated as final —
      // run the Photo Battle so the two best-liked shots duke it out and the winner becomes favorite.
      if (!battleDone && capturedImages.length >= 2) {
        setTimeout(() => startPhotoBattle(), 1500);
      }
    }

    function runCountdown(sec, promptText) {
      return new Promise((resolve) => {
        countdownEl.classList.remove('hidden');
        countdownEl.classList.add('flex');
        countdownEl.innerHTML = `
          ${promptText ? `<div id="countdown-prompt" class="mb-3 px-4 py-1.5 rounded-full bg-black/40 border border-[var(--brass)]/40 text-sm sm:text-base font-bold text-[var(--brass-soft)] text-center max-w-[85%] pose-prompt-pop">${promptText}</div>` : ''}
          <div class="relative flex items-center justify-center">
            <div class="absolute w-40 h-40 rounded-full opacity-35 blur-lg" style="background:conic-gradient(from 0deg, var(--brass), var(--crimson-soft), var(--marquee), var(--brass)); animation: ringRotate 2s linear infinite;"></div>
            <span id="countdown-num" class="relative text-9xl font-black text-amber-300 drop-shadow-lg">${sec}</span>
          </div>
          <span class="text-xs font-bold uppercase tracking-widest text-[var(--brass-soft)]/90 mt-2">Bersiap!</span>
        `;
        let timer = sec;
        const numEl = () => document.getElementById('countdown-num');
        playCountdownBeep();

        const interval = setInterval(() => {
          timer--;
          if (timer > 0) {
            playCountdownBeep();
            const el = numEl();
            el.innerText = timer;
            el.classList.remove('animate-pop');
            void el.offsetWidth;
            el.classList.add('animate-pop');
          } else {
            clearInterval(interval);
            countdownEl.classList.add('hidden');
            countdownEl.classList.remove('flex');
            resolve();
          }
        }, 1000);
      });
    }

    // Starts/stops the shared selfieSegmentation analysis loop based on whether auto-crop is on.
    function updateSegmentationLoopState() {
      const shouldRun = autoFrameEnabled;
      if (shouldRun && !segmentationLoopActive) {
        segmentationLoopActive = true;
        requestAnimationFrame(segmentationLoop);
      } else if (!shouldRun) {
        segmentationLoopActive = false;
      }
    }

    /* ---------- Auto-crop face/body — keeps the strip composition centered even when the
       person isn't dead-center in frame (sitting, standing, or off to one side). Uses the
       selfieSegmentation model to find the person's silhouette bounding box. ---------- */
    function updateAutoFrameButtonUI() {
      if (autoCropBtn) {
        autoCropBtn.classList.toggle('active-choice', autoFrameEnabled);
        autoCropBtn.setAttribute('aria-pressed', autoFrameEnabled ? 'true' : 'false');
      }
      if (autoCropStatusLabel) autoCropStatusLabel.textContent = autoFrameEnabled ? 'Aktif' : 'Nonaktif';
      if (autoCropLiveChip) {
        autoCropLiveChip.classList.toggle('hidden', !autoFrameEnabled);
        autoCropLiveChip.classList.toggle('flex', autoFrameEnabled);
      }
    }

    async function toggleAutoFrame() {
      if (autoFrameEnabled) disableAutoFrame();
      else await enableAutoFrame();
    }

    async function enableAutoFrame() {
      if (autoFrameLoading || autoFrameEnabled) return;
      autoFrameLoading = true;
      showToast('Menyiapkan deteksi wajah/tubuh…', '🎯');
      try {
        await initSegmentation();
        autoFrameEnabled = true;
        autoCropSmoothed = { cx: 0.5, cy: 0.5, zoom: 1 };
        autoCropLastSeen = 0;
        updateSegmentationLoopState();
        showToast('Auto-crop aktif — komposisi otomatis ngikutin posisi kamu', '🎯');
      } catch (e) {
        showToast('Gagal memuat deteksi tubuh (perlu koneksi internet)', '⚠️');
      }
      autoFrameLoading = false;
      updateAutoFrameButtonUI();
    }

    function disableAutoFrame() {
      autoFrameEnabled = false;
      autoCropSmoothed = { cx: 0.5, cy: 0.5, zoom: 1 };
      updateSegmentationLoopState();
      updateAutoFrameButtonUI();
      showToast('Auto-crop dimatikan', '🎯');
    }

    /* Reads the segmentation mask's alpha channel (person-probability) at low resolution to
       find the person's silhouette bounding box, then smooths it over time (EMA) so the crop
       doesn't jitter frame-to-frame. If nobody is detected for a bit, it eases back to a
       centered full-frame crop instead of freezing on stale data. */
    function computeAutoCropFromMask(maskImage, srcW, srcH) {
      if (!maskAnalysisCanvas) maskAnalysisCanvas = document.createElement('canvas');
      const AW = 40, AH = 30;
      maskAnalysisCanvas.width = AW; maskAnalysisCanvas.height = AH;
      const actx = maskAnalysisCanvas.getContext('2d', { willReadFrequently: true });
      actx.clearRect(0, 0, AW, AH);
      actx.drawImage(maskImage, 0, 0, AW, AH);
      let data;
      try { data = actx.getImageData(0, 0, AW, AH).data; } catch (e) { return; }

      let minX = AW, maxX = -1, minY = AH, maxY = -1;
      const threshold = 90;
      for (let y = 0; y < AH; y++) {
        for (let x = 0; x < AW; x++) {
          const a = data[(y * AW + x) * 4 + 3];
          if (a > threshold) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      const now = performance.now();
      let target;
      if (maxX >= minX && maxY >= minY) {
        autoCropLastSeen = now;
        const cx = (minX + maxX + 1) / 2 / AW;
        const cy = (minY + maxY + 1) / 2 / AH;
        const bh = (maxY - minY + 1) / AH;
        // Aim for the person's bbox height to fill ~62% of the cropped frame, giving
        // headroom for the strip's sticker/caption footer. Clamp so we never zoom in
        // so far it looks broken, nor zoom out past the original frame.
        const zoom = Math.max(0.55, Math.min(1, bh / 0.62));
        target = { cx, cy, zoom };
      } else if (now - autoCropLastSeen > 800) {
        // Nobody detected for a while — relax back to the full centered frame.
        target = { cx: 0.5, cy: 0.5, zoom: 1 };
      } else {
        return; // brief detection gap — keep the last known crop, don't snap back yet
      }

      const lerp = 0.16;
      autoCropSmoothed = {
        cx: autoCropSmoothed.cx + (target.cx - autoCropSmoothed.cx) * lerp,
        cy: autoCropSmoothed.cy + (target.cy - autoCropSmoothed.cy) * lerp,
        zoom: autoCropSmoothed.zoom + (target.zoom - autoCropSmoothed.zoom) * lerp
      };
    }

    /* Turns the smoothed auto-crop state into a source rectangle to hand to drawImage. */
    function getAutoCropRect(w, h) {
      if (!autoFrameEnabled) return { sx: 0, sy: 0, sw: w, sh: h };
      const zoom = autoCropSmoothed.zoom;
      const cw = w * zoom, ch = h * zoom;
      let sx = autoCropSmoothed.cx * w - cw / 2;
      // Small upward bias so there's a bit more headroom above than below.
      let sy = autoCropSmoothed.cy * h - ch / 2 - ch * 0.05;
      sx = Math.max(0, Math.min(w - cw, sx));
      sy = Math.max(0, Math.min(h - ch, sy));
      return { sx, sy, sw: cw, sh: ch };
    }

    function initSegmentation() {
      return new Promise((resolve, reject) => {
        if (selfieSegmentation) { resolve(selfieSegmentation); return; }
        if (typeof SelfieSegmentation === 'undefined') { reject(new Error('SelfieSegmentation not loaded')); return; }
        try {
          const instance = new SelfieSegmentation({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
          });
          instance.setOptions({ modelSelection: 1 });
          instance.onResults(onSegmentationResults);
          selfieSegmentation = instance;
          resolve(instance);
        } catch (e) { reject(e); }
      });
    }

    // How long we'll wait for one segmentation frame before assuming the model has wedged.
    const SEGMENTATION_SEND_TIMEOUT_MS = 4000;
    let segmentationRebuildInProgress = false;

    // The MediaPipe model occasionally wedges (a WebGL context hiccup, tab losing focus, GPU
    // throttling, etc.) in a way where send()'s promise never resolves OR rejects. Since
    // segmentationLoop awaits that promise before scheduling its next frame, a wedge like that
    // would otherwise freeze the entire feed (person + background both stuck) with no way to
    // recover on its own. Tearing the model down and rebuilding it is the reliable fix.
    async function rebuildSegmentationModel() {
      if (segmentationRebuildInProgress) return;
      segmentationRebuildInProgress = true;
      if (selfieSegmentation && typeof selfieSegmentation.close === 'function') {
        try { selfieSegmentation.close(); } catch (e) { /* already dead, ignore */ }
      }
      selfieSegmentation = null;
      try { await initSegmentation(); } catch (e) { /* next loop tick will retry via send() failing */ }
      segmentationRebuildInProgress = false;
    }

    async function segmentationLoop() {
      if (!segmentationLoopActive) return;
      try {
        if (video.readyState >= 2 && video.videoWidth && selfieSegmentation) {
          let timedOut = false;
          await Promise.race([
            selfieSegmentation.send({ image: video }),
            new Promise((_, reject) => setTimeout(() => { timedOut = true; reject(new Error('segmentation send timed out')); }, SEGMENTATION_SEND_TIMEOUT_MS))
          ]);
          if (timedOut) throw new Error('segmentation send timed out');
        }
      } catch (e) {
        // A regular transient frame error just gets skipped. A timeout specifically means the
        // model is wedged, so rebuild it before the next attempt instead of hanging again.
        if (String(e && e.message).includes('timed out') && !segmentationRebuildInProgress) {
          showToast('Deteksi tubuh sempat macet, memulihkan…', '🔄');
          rebuildSegmentationModel();
        }
      }
      if (segmentationLoopActive) requestAnimationFrame(segmentationLoop);
    }

    /* Reads the segmentation mask each frame purely to drive auto-crop (finding the person's
       silhouette bounding box). There's no background compositing here anymore. */
    function onSegmentationResults(results) {
      const w = results.image.width, h = results.image.height;
      if (!w || !h) return;
      if (autoFrameEnabled) computeAutoCropFromMask(results.segmentationMask, w, h);
    }


    /* Grabs one mirrored, filtered frame from the live video into captureCanvas and
       returns it as a dataURL. Shared by the hero-photo capture and the burst capture
       below so both use the exact same crop/mirror/filter math. */
    function grabVideoFrameDataUrl(mime, quality) {
      const ctx = captureCanvas.getContext('2d');
      const w = video.videoWidth || 1280, h = video.videoHeight || 960;
      captureCanvas.width = w;
      captureCanvas.height = h;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.filter = filterCanvasMap[currentFilter] || 'none';
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      const rect = getAutoCropRect(w, h);
      ctx.drawImage(video, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, w, h);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      return captureCanvas.toDataURL(mime || 'image/png', quality);
    }

    /* Captures the decisive photo the instant the flash fires, then keeps recording a short
       extra burst purely to feed the animated GIF export with real playful movement. The
       SAVED photo (print strip, IG post, thumbnails, favorite) always comes from the flash
       moment now — previously it was whatever the LAST burst frame looked like ~2s later,
       so relaxing or moving right after the flash (which people naturally do) ended up
       changing the actual saved photo. */
    async function captureSinglePhoto(idx) {
      const heroFrame = grabVideoFrameDataUrl('image/png');
      capturedImages[idx] = heroFrame;
      renderStripPreview();

      const frames = [grabVideoFrameDataUrl('image/jpeg', 0.85)];
      for (let f = 1; f < BURST_FRAME_COUNT; f++) {
        await new Promise(r => setTimeout(r, BURST_INTERVAL_MS));
        const frame = grabVideoFrameDataUrl('image/jpeg', 0.85);
        frames.push(frame);
        // Fun live preview of the post-flash movement while the burst records —
        // purely cosmetic, doesn't touch the actual saved hero photo.
        updateStripPhotoSlotImage(idx, frame);
      }
      capturedBursts[idx] = frames;

      // Restore the sharp flash-moment frame — the slot currently shows the
      // last burst frame from the loop above.
      capturedImages[idx] = heroFrame;
      updateStripPhotoSlotImage(idx, heroFrame);
    }

    // Swaps just the <img src> for an already-rendered photo slot, without rebuilding
    // the whole strip or retriggering the printOut/develop-flash entrance animations.
    function updateStripPhotoSlotImage(idx, src) {
      const wrap = photoList.children[idx];
      if (!wrap) { renderStripPreview(); return; } // slot missing for some reason — fall back
      const img = wrap.querySelector('img');
      if (img) img.src = src;
    }

    async function retakePhoto(idx) {
      if (isCapturing || isRetaking) return;
      isRetaking = true;
      snapBtn.disabled = true;
      await runCountdown(2, randomPosePrompt());
      triggerFlash();

      const heroFrame = grabVideoFrameDataUrl('image/png');
      capturedImages[idx] = heroFrame;
      renderStripPreview();

      const frames = [grabVideoFrameDataUrl('image/jpeg', 0.85)];
      for (let f = 1; f < BURST_FRAME_COUNT; f++) {
        await new Promise(r => setTimeout(r, BURST_INTERVAL_MS));
        frames.push(grabVideoFrameDataUrl('image/jpeg', 0.85));
      }
      capturedBursts[idx] = frames;
      capturedImages[idx] = heroFrame;
      renderStripPreview();
      showToast(`Pose ${idx + 1} berhasil diambil ulang!`, '🔁');
      snapBtn.disabled = false;
      isRetaking = false;
    }

    function renderStripPreview() {
      photoList.innerHTML = '';
      const allDone = capturedImages.length === POSE_COUNT && capturedImages.length > 0;

      capturedImages.forEach((src, idx) => {
        const wrap = document.createElement('div');
        wrap.className = "relative w-full aspect-[3/4] sm:aspect-[4/3] photo-mat rounded-lg overflow-hidden shadow-md animate-print" + (allDone ? " fav-selectable" : "") + (favoriteIndex === idx ? " fav-selected" : "");
        wrap.style.animationDelay = (idx * 0.05) + 's';
        if (allDone) {
          wrap.onclick = () => selectFavorite(idx);
          wrap.title = "Klik untuk jadikan foto favorit";
        }

        const img = document.createElement('img');
        img.src = src;
        img.alt = `Foto pose ${idx + 1} dari ${POSE_COUNT}`;
        img.className = "w-full h-full object-cover";

        const flashOverlay = document.createElement('div');
        flashOverlay.className = "absolute inset-0 bg-white develop-flash pointer-events-none";

        const retakeBtn = document.createElement('button');
        retakeBtn.className = "retake-btn";
        retakeBtn.type = "button";
        retakeBtn.setAttribute('aria-label', `Ambil ulang pose ${idx + 1}`);
        retakeBtn.title = "Ambil ulang pose ini";
        retakeBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i>';
        retakeBtn.onclick = (e) => { e.stopPropagation(); retakePhoto(idx); };

        wrap.appendChild(img);
        wrap.appendChild(flashOverlay);
        wrap.appendChild(retakeBtn);

        if (favoriteIndex === idx) {
          const star = document.createElement('div');
          star.className = "fav-star-badge badge-pop";
          star.innerText = "⭐";
          wrap.appendChild(star);
        }

        photoList.appendChild(wrap);
      });

      updateStatusUI(capturedImages.length);

      if (allDone) {
        gifBtn.disabled = false;
        pngBtn.disabled = false;
        gridBtn.disabled = false;
        gifShareBtn.disabled = false;
        pngShareBtn.disabled = false;
        pngSaveBtn.disabled = false;
        gridSaveBtn.disabled = false;
        gifSaveBtn.disabled = false;
        previewBtn.disabled = false;
        gifBtn.classList.remove('cursor-not-allowed');
        pngBtn.classList.remove('cursor-not-allowed');
        gridBtn.classList.remove('cursor-not-allowed');
        previewBtn.classList.remove('cursor-not-allowed');
        resetBtn.classList.remove('hidden');
        favoriteHint.classList.remove('hidden');
        buildStickerTray();
        stickerTrayWrap.classList.remove('hidden');

        if (!celebrated) {
          celebrated = true;
          celebrateOutput();
        }
        armIdleTimer();
      }

      refreshLiveFramedPreview();
    }

    /* ---------- Sticker/props tray — tap a sticker to drop it on the strip, tap a placed one to remove ---------- */
    function buildStickerTray() {
      if (stickerTray.childElementCount) return; // build once
      PROP_STICKERS.forEach(emoji => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sticker-tray-btn w-9 h-9 flex items-center justify-center rounded-lg bg-[#ffffff] border border-[var(--line)] hover:border-[var(--brass)]/60 text-lg';
        btn.innerText = emoji;
        btn.setAttribute('aria-label', `Tempel stiker ${emoji}`);
        btn.onclick = () => addSticker(emoji);
        stickerTray.appendChild(btn);
      });
    }

    function addSticker(emoji) {
      if (placedStickers.length >= 8) { showToast('Maksimal 8 stiker per strip', '⚠️'); return; }
      // Drop somewhere over the photo area, with a little randomness so repeats don't stack exactly
      const xPct = 18 + Math.random() * 64;
      const yPct = 12 + Math.random() * 70;
      placedStickers.push({ emoji, xPct, yPct });
      renderPlacedStickers();
      framedCache && Object.keys(framedCache).forEach(k => delete framedCache[k]); // invalidate cached preview
      refreshLiveFramedPreview();
      armIdleTimer();
    }

    function renderPlacedStickers() {
      stripCard.querySelectorAll('.placed-sticker').forEach(el => el.remove());
      placedStickers.forEach((s, i) => {
        const el = document.createElement('span');
        el.className = 'placed-sticker';
        el.style.left = s.xPct + '%';
        el.style.top = s.yPct + '%';
        el.innerText = s.emoji;
        el.title = 'Ketuk untuk hapus';
        el.onclick = () => {
          placedStickers.splice(i, 1);
          renderPlacedStickers();
          Object.keys(framedCache).forEach(k => delete framedCache[k]);
          refreshLiveFramedPreview();
        };
        stripCard.appendChild(el);
      });
    }

    function selectFavorite(idx) {
      favoriteIndex = idx;
      renderStripPreview();
      igBtn.disabled = false;
      igShareBtn.disabled = false;
      igBtn.classList.remove('cursor-not-allowed');
      showToast('Foto favorit dipilih! Siap dicetak gaya IG Post 📱', '⭐');
      armIdleTimer();
    }

    /* ---------- Preview modal: review every photo before downloading anything ---------- */
    function loadImageEl(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    }

    /* Compose a single photo with the current theme's border/brand as a lightweight "framed" preview */
    async function getFramedPhotoDataUrl(src) {
      const cacheKey = currentFrame + '|' + currentFilter + '|' + src.slice(-40);
      if (framedCache[cacheKey]) return framedCache[cacheKey];

      const img = await loadImageEl(src);
      const cfg = FRAME_THEMES[currentFrame] || FRAME_THEMES.nature;
      const W = 900, H = 1080, pad = 46, photoW = W - pad * 2, photoH = 760;
      const footerY = pad + photoH + 56;

      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');

      const isDarkThumb = DARK_FRAME_THEMES.has(currentFrame);
      paintThemedBackground(ctx, isDarkThumb ? '#1c1e17' : '#f7f2e8', cfg.accent || '#c9a04a', W, H, isDarkThumb);

      drawPhotoMat(ctx, cfg.accent, isDarkThumb, pad, pad, photoW, photoH);
      ctx.save();
      ctx.filter = filterCanvasMap[currentFilter] || 'none';
      const imgRatio = img.width / img.height, targetRatio = photoW / photoH;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (imgRatio > targetRatio) { sw = img.height * targetRatio; sx = (img.width - sw) / 2; }
      else { sh = img.width / targetRatio; sy = (img.height - sh) / 2; }
      ctx.drawImage(img, sx, sy, sw, sh, pad, pad, photoW, photoH);
      ctx.restore();

      ctx.strokeStyle = cfg.accent || '#c2ac7c';
      ctx.lineWidth = 8;
      ctx.strokeRect(pad, pad, photoW, photoH);

      ctx.font = "44px sans-serif";
      ctx.textBaseline = 'alphabetic';
      const st = cfg.stickers || [];
      ctx.fillText(st[0] || '✨', pad - 6, pad + 34);
      ctx.textAlign = 'right';
      ctx.fillText(st[1] || '✨', pad + photoW + 6, pad + 34);

      ctx.textAlign = 'center';
      ctx.fillStyle = isDarkThumb ? '#ffffff' : '#241f16';
      ctx.font = "bold 40px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText('JEPRETIN', W / 2, footerY);

      ctx.font = "20px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = isDarkThumb ? 'rgba(237,227,208,0.72)' : 'rgba(26,28,20,0.68)';
      ctx.fillText(cfg.tagline || '', W / 2, footerY + 36);

      const dataUrl = canvas.toDataURL('image/png');
      framedCache[cacheKey] = dataUrl;
      return dataUrl;
    }

    function openPreviewModal() {
      if (capturedImages.length < POSE_COUNT) return;
      previewMode = 'framed'; // buka langsung ke tampilan siap cetak (berbingkai)
      previewModal.classList.remove('hidden');
      previewModal.classList.add('flex');
      document.body.style.overflow = 'hidden';
      renderPreviewGrid();
      clearIdleTimer();
    }

    function closePreviewModal() {
      previewModal.classList.add('hidden');
      previewModal.classList.remove('flex');
      document.body.style.overflow = '';
      armIdleTimer();
    }

    function setPreviewMode(mode) {
      previewMode = mode;
      renderPreviewGrid();
    }

    /* Renders every captured photo at once (as a grid), instead of one photo at a time */
    async function renderPreviewGrid() {
      if (!capturedImages.length) return;

      ['raw', 'framed', 'ig'].forEach(m => {
        document.getElementById(`mode-${m}-btn`).classList.toggle('mode-active', previewMode === m);
      });

      const myRequestMode = previewMode;
      previewGrid.innerHTML = '';

      if (previewMode === 'framed') {
        // Show the exact strip that will be downloaded: 1 image, using the frame + N photos already chosen.
        previewCounter.textContent = `Strip ${capturedImages.length} foto — pratinjau hasil unduhan`;
        previewGrid.className = "flex flex-col items-center gap-3 max-w-md mx-auto";

        const wrap = document.createElement('div');
        wrap.className = "relative w-full rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-[var(--line)] bg-[#ffffff] animate-pop torn-bottom tilt-card";

        const img = document.createElement('img');
        img.alt = `Strip foto ${capturedImages.length} pose dengan bingkai ${currentFrame}`;
        img.className = "w-full h-auto block opacity-0 transition-opacity duration-200";

        const loading = document.createElement('div');
        loading.className = "absolute inset-0 flex items-center justify-center bg-[var(--ink)]/60";
        loading.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-2xl text-[var(--brass-soft)]"></i>';

        wrap.appendChild(img);
        wrap.appendChild(loading);
        previewGrid.appendChild(wrap);
        enableTilt(wrap, 4);

        const hint = document.createElement('p');
        hint.className = "text-[11px] text-[#6b6152] text-center px-2";
        hint.textContent = 'Ini persis file PNG Strip yang akan terunduh saat kamu tekan "Cetak Hasil Photobox".';
        previewGrid.appendChild(hint);

        try {
          const key = 'stripPreview|' + currentFrame + '|' + currentFilter + '|' + capturedImages.join('|').slice(-200);
          const dataUrl = framedCache[key] || await buildPrintStripDataUrl();
          framedCache[key] = dataUrl;
          if (myRequestMode !== previewMode) return; // mode berganti sebelum selesai
          img.src = dataUrl;
          img.classList.remove('opacity-0');
          loading.classList.add('hidden');
        } catch (e) {
          loading.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-red-400"></i>';
        }
        return;
      }

      // Raw / IG modes: one tile per photo, still editable (favorite + retake)
      previewGrid.className = "grid grid-cols-2 gap-3 sm:gap-4 max-w-xl mx-auto";
      const modeLabel = previewMode === 'raw' ? 'foto asli' : 'pratinjau gaya IG';
      previewCounter.textContent = `${capturedImages.length} ${modeLabel}`;

      capturedImages.forEach((src, idx) => {
        const isFav = favoriteIndex === idx;

        const card = document.createElement('div');
        card.className = "relative rounded-xl overflow-hidden shadow-xl shadow-black/40 border border-[var(--line)] bg-[#ffffff] aspect-[3/4] animate-pop tilt-card";
        card.style.animationDelay = (idx * 60) + 'ms';

        // Photo layer gets the torn edge (clip-path also clips children, so badges live
        // outside this layer on `card` itself and stay unclipped).
        const photoInner = document.createElement('div');
        photoInner.className = "absolute inset-0 torn-top overflow-hidden";

        const img = document.createElement('img');
        img.alt = `Foto pose ${idx + 1} dari ${capturedImages.length}`;
        img.className = "w-full h-full object-cover bg-[var(--ink)] opacity-0 transition-opacity duration-200";

        const loading = document.createElement('div');
        loading.className = "absolute inset-0 flex items-center justify-center bg-[var(--ink)]/60";
        loading.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xl text-[var(--brass-soft)]"></i>';

        const numBadge = document.createElement('span');
        numBadge.className = "absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 backdrop-blur text-[11px] font-bold text-[#241f16] flex items-center justify-center";
        numBadge.textContent = idx + 1;

        const favBtn = document.createElement('button');
        favBtn.className = "ripple-btn absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs transition " +
          (isFav ? "bg-gradient-to-br from-[var(--crimson-soft)] to-[var(--marquee)] text-white" : "bg-black/60 backdrop-blur text-amber-200 border border-amber-400/30 hover:border-amber-300");
        favBtn.innerHTML = isFav ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
        favBtn.setAttribute('aria-label', isFav ? `Foto pose ${idx + 1} adalah favorit` : `Jadikan foto pose ${idx + 1} favorit`);
        favBtn.onclick = () => { selectFavorite(idx); renderPreviewGrid(); };

        const retakeBtn = document.createElement('button');
        retakeBtn.className = "ripple-btn absolute bottom-2 right-2 px-2.5 py-1.5 rounded-full bg-black/60 backdrop-blur text-[10px] font-semibold text-[#241f16] border border-[#6b6152]/30 hover:border-[var(--brass-soft)] transition flex items-center gap-1.5";
        retakeBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i><span>Ulang</span>';
        retakeBtn.onclick = () => retakeFromGrid(idx);

        photoInner.appendChild(img);
        photoInner.appendChild(loading);
        card.appendChild(photoInner);
        card.appendChild(numBadge);
        card.appendChild(favBtn);
        card.appendChild(retakeBtn);
        previewGrid.appendChild(card);
        enableTilt(card, 5);
        attachRipple(favBtn);
        attachRipple(retakeBtn);

        (async () => {
          try {
            const dataUrl = previewMode === 'raw' ? src : await renderIGPostDataUrl(idx);
            if (myRequestMode !== previewMode) return; // mode berganti sebelum selesai, buang hasil basi
            img.src = dataUrl;
            img.classList.remove('opacity-0');
            loading.classList.add('hidden');
          } catch (e) {
            loading.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-red-400"></i>';
          }
        })();
      });
    }

    async function retakeFromGrid(idx) {
      closePreviewModal();
      await retakePhoto(idx);
      openPreviewModal();
    }

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!previewModal.classList.contains('hidden')) closePreviewModal();
      if (!frameModal.classList.contains('hidden')) closeFrameModal();
      if (!igModal.classList.contains('hidden')) closeIGModal();
    });


    function updateStatusUI(count) {
      statusBadge.classList.remove('badge-pop');
      void statusBadge.offsetWidth;
      statusBadge.classList.add('badge-pop');
      statusBadge.textContent = `${count}/${POSE_COUNT} FOTO`;

      if (count === 0) {
        statusBadge.className = "font-tech text-[10px] px-2.5 py-1 rounded-full bg-[#ffffff] text-[#8f8163] border border-[var(--line)] transition-all duration-300 badge-pop";
        outputLed.className = "w-2.5 h-2.5 rounded-full bg-[#6b5f45] transition-colors duration-300";
        readyRibbon.textContent = `Ambil ${POSE_COUNT} foto untuk mulai mencetak`;
        readyRibbon.className = "mt-4 text-center text-xs font-bold uppercase tracking-wider text-[#6b6152] transition-all duration-500";
      } else if (count < POSE_COUNT) {
        statusBadge.className = "font-tech text-[10px] px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 transition-all duration-300 badge-pop";
        outputLed.className = "w-2.5 h-2.5 rounded-full bg-amber-400 transition-colors duration-300";
        readyRibbon.textContent = `Mencetak pose ${count} dari ${POSE_COUNT}...`;
        readyRibbon.className = "mt-4 text-center text-xs font-bold uppercase tracking-wider text-amber-300 transition-all duration-500";
      } else {
        statusBadge.className = "font-tech text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 transition-all duration-300 badge-pop";
        outputLed.className = "w-2.5 h-2.5 rounded-full bg-emerald-400 led-ready";
        readyRibbon.textContent = "Siap dicetak & diunduh!";
        readyRibbon.className = "mt-4 text-center text-xs font-bold uppercase tracking-wider text-emerald-300 transition-all duration-500";
      }
    }

    /* ---------- Idle auto-reset (useful for public/event kiosks) ---------- */
    function clearIdleTimer() {
      if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    }
    function armIdleTimer() {
      clearIdleTimer();
      idleTimer = setTimeout(() => {
        showToast('Sesi tidak aktif, kembali ke layar awal', '⏱️');
        resetSession();
        stopAmbient();
        sessionStarted = false;
        showWelcomeScreen();
      }, 60000);
    }

    // Sebelumnya timer ini cuma di-reset dari beberapa titik aksi yang sempit
    // (tutup modal, pilih favorit, dst), jadi orang yang lagi diem sebentar
    // di studio (mikir pose, ganti filter, ngobrol) bisa ke-reset tiba-tiba
    // walau sebenarnya masih aktif pakai halaman. Listener umum ini
    // menganggap KLIK/TAP/SCROLL/KETIK apa pun di halaman studio sebagai
    // "masih aktif", jadi auto-reset cuma kejadian kalau bener-bener tidak
    // disentuh sama sekali selama 60 detik.
    ['pointerdown', 'keydown', 'wheel', 'touchmove'].forEach((evt) => {
      document.addEventListener(evt, () => {
        if (sessionStarted) armIdleTimer();
      }, { passive: true });
    });

    function resetSession() {
      clearIdleTimer();
      if (!previewModal.classList.contains('hidden')) closePreviewModal();
      capturedImages = [];
      capturedBursts = [];
      favoriteIndex = null;
      celebrated = false;
      battleDone = false;
      battleActive = false;
      if (battleModal) { battleModal.classList.add('hidden'); battleModal.classList.remove('flex'); }
      placedStickers = [];
      lastExports = { png: null, gif: null, ig: null };
      photoList.innerHTML = buildPlaceholderHTML(POSE_COUNT);
      renderPlacedStickers();
      stickerTrayWrap.classList.add('hidden');
      Object.keys(framedCache).forEach(k => delete framedCache[k]);
      refreshLiveFramedPreview(); // re-render the same frame design, now with empty slots
      qrPanel.classList.add('hidden');
      [pngBtn, gridBtn].forEach(b => b && b.classList.remove('ring-2', 'ring-[var(--brass-soft)]', 'ring-offset-2', 'ring-offset-[#ffffff]'));
      gifBtn.disabled = true;
      pngBtn.disabled = true;
      igBtn.disabled = true;
      gridBtn.disabled = true;
      previewBtn.disabled = true;
      gifShareBtn.disabled = true;
      pngShareBtn.disabled = true;
      igShareBtn.disabled = true;
      pngSaveBtn.disabled = true;
      gridSaveBtn.disabled = true;
      gifSaveBtn.disabled = true;
      gifBtn.classList.add('cursor-not-allowed');
      pngBtn.classList.add('cursor-not-allowed');
      igBtn.classList.add('cursor-not-allowed');
      gridBtn.classList.add('cursor-not-allowed');
      previewBtn.classList.add('cursor-not-allowed');
      resetBtn.classList.add('hidden');
      favoriteHint.classList.add('hidden');
      updateStatusUI(0);
      showToast('Sesi direset, siap ambil foto baru!', '🔄');
    }

    /* ---------- Web Share API: send output straight to phone / other apps ---------- */
    async function shareDataUrl(dataUrl, filename, mime, text) {
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: mime });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'JEPRETIN', text: text || 'Hasil foto dari JEPRETIN' });
        } else {
          showToast('Perangkat/browser ini belum mendukung berbagi langsung — silakan gunakan tombol download.', 'ℹ️');
        }
      } catch (err) {
        if (err && err.name !== 'AbortError') {
          showToast('Gagal membagikan file.', '⚠️');
        }
      }
    }

    function shareLastExport(kind) {
      const item = lastExports[kind];
      if (!item) {
        showToast('Unduh hasilnya dulu sebelum dibagikan ya!', 'ℹ️');
        return;
      }
      shareDataUrl(item.dataUrl, item.filename, item.mime, item.text);
    }

    /* ---------- QR pickup panel ----------
       A QR code can only hold a couple KB of data, nowhere near a full-res photo, so this
       encodes a small compressed thumbnail instead — an honest "preview to grab on your phone"
       rather than pretending to squeeze the whole file through. The full-res PNG has already
       been downloaded to the device by the time this runs. */
    function showQrForDataUrl(fullDataUrl) {
      if (typeof QRCode === 'undefined' || !qrCodeBox) return;
      const img = new Image();
      img.onload = () => {
        const targetW = 160;
        const targetH = Math.max(1, Math.round(img.height * (targetW / img.width)));
        const c = document.createElement('canvas');
        c.width = targetW; c.height = targetH;
        const cctx = c.getContext('2d');
        cctx.drawImage(img, 0, 0, targetW, targetH);

        let quality = 0.55;
        let thumb = c.toDataURL('image/jpeg', quality);
        let attempts = 0;
        while (thumb.length > 2200 && attempts < 6) {
          quality = Math.max(0.15, quality - 0.1);
          thumb = c.toDataURL('image/jpeg', quality);
          attempts++;
        }

        qrCodeBox.innerHTML = '';
        if (thumb.length <= 2600) {
          new QRCode(qrCodeBox, { text: thumb, width: 108, height: 108, colorDark: '#22261c', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.L });
          qrPanelNote.textContent = 'Pratinjau resolusi rendah. File resolusi penuh sudah otomatis terunduh ke perangkatmu.';
        } else {
          qrCodeBox.innerHTML = '<div class="w-[108px] h-[108px] flex items-center justify-center text-center text-[10px] text-[#6b6152] px-2 leading-snug">QR tak muat untuk foto ini</div>';
          qrPanelNote.textContent = 'Ukuran foto terlalu besar untuk kode QR. File resolusi penuh sudah otomatis terunduh ke perangkatmu.';
        }
        qrPanel.classList.remove('hidden');
      };
      img.onerror = () => {}; // QR is a nice-to-have; don't block the main download flow on failure
      img.src = fullDataUrl;
    }

    function drawThemeStickersOnCanvas(ctx, W, H, photoW, photoH, pad, gap) {
      const st = frameStickerMap[currentFrame];

      ctx.font = "80px sans-serif";
      ctx.fillText(st[0], pad - 50, pad - 10);
      ctx.fillText(st[1], pad + photoW - 30, pad - 10);
      ctx.fillText(st[5], pad - 50, H - 120);
      ctx.fillText(st[6] || st[0], pad + photoW - 30, H - 120);

      ctx.font = "65px sans-serif";
      const poseN = capturedImages.length || 4;
      for (let i = 0; i < poseN; i++) {
        const yPos = pad + i * (photoH + gap);
        if (i === 1) {
          ctx.fillText(st[2], pad - 60, yPos + (photoH / 2));
          ctx.fillText(st[3], pad + photoW - 10, yPos + (photoH / 2));
        } else if (i === 2) {
          ctx.fillText(st[4], pad - 60, yPos + (photoH / 2));
          ctx.fillText(st[2], pad + photoW - 10, yPos + (photoH / 2));
        }
      }
    }

    /* ---------- Curved "seal" text (professional stamp effect) ---------- */
    function drawCurvedText(ctx, text, cx, cy, radius, startRad, endRad, color, font) {
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const step = (endRad - startRad) / Math.max(text.length - 1, 1);
      for (let i = 0; i < text.length; i++) {
        const angle = startRad + step * i;
        ctx.save();
        ctx.translate(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
        ctx.rotate(angle + Math.PI / 2);
        ctx.fillText(text[i], 0, 0);
        ctx.restore();
      }
      ctx.restore();
    }

    function drawThemeStamp(ctx, cfg, cx, cy) {
      const r = 92;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = cfg.stampBg; ctx.globalAlpha = 0.94; ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 3; ctx.strokeStyle = cfg.stampFg; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r - 11, 0, Math.PI * 2);
      ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();

      // Curved text around the top arc
      drawCurvedText(ctx, `★ ${cfg.stampText.toUpperCase()} ★`, cx, cy, r - 26, Math.PI * 1.08, Math.PI * 1.92, cfg.stampFg, "bold 15px 'Fira Code', monospace");

      // Center icon + small rule
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = "34px sans-serif";
      ctx.fillText(cfg.emoji, cx, cy - 4);
      ctx.strokeStyle = cfg.stampFg; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx - 24, cy + 26); ctx.lineTo(cx + 24, cy + 26); ctx.stroke();
      ctx.font = "bold 13px 'Fira Code', monospace"; ctx.fillStyle = cfg.stampFg;
      ctx.fillText('JEPRETIN', cx, cy + 40);
      ctx.restore();
    }

    /* ---------- Per-theme decorative border/sticker illustrations ---------- */
    function decoLeafVine(ctx, W, H, pad, color) {
      ctx.save();
      ctx.strokeStyle = color; ctx.globalAlpha = 0.55; ctx.lineWidth = 3;
      for (let side = 0; side < 2; side++) {
        const x = side === 0 ? pad * 0.42 : W - pad * 0.42;
        ctx.beginPath();
        for (let y = pad; y < H - 340; y += 18) ctx.lineTo(x + Math.sin(y / 60) * 14, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.font = '30px sans-serif'; ctx.textAlign = 'center';
      for (let y = pad + 40; y < H - 380; y += 130) {
        ctx.fillText('🌿', pad * 0.42, y);
        ctx.fillText('🌿', W - pad * 0.42, y + 60);
      }
      ctx.restore();
    }
    function decoCircuit(ctx, W, H, pad, color) {
      ctx.save();
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.5;
      [pad * 0.5, W - pad * 0.5].forEach(x => {
        ctx.beginPath();
        let y = pad;
        while (y < H - 340) {
          ctx.moveTo(x, y); ctx.lineTo(x, y + 40); ctx.lineTo(x + (x < W / 2 ? 20 : -20), y + 60);
          ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
          y += 110;
        }
        ctx.stroke();
      });
      ctx.globalAlpha = 1; ctx.restore();
    }
    function decoPixelDash(ctx, W, H, pad, color) {
      ctx.save();
      ctx.fillStyle = color; ctx.globalAlpha = 0.55;
      for (let y = pad; y < H - 340; y += 26) {
        ctx.fillRect(pad * 0.38, y, 10, 10);
        ctx.fillRect(W - pad * 0.38 - 10, y, 10, 10);
      }
      ctx.globalAlpha = 1; ctx.restore();
    }
    /* "Minimal / Gallery Edition" border — kept strictly monochrome (uses the
       theme's own ink/accent colour, no new hues added) but reworked from a
       single top rule + corner ticks into a proper gallery-mat treatment:
       a double frame around the photo block, ruler-style ticks down both
       margins, bracket corners, and a very quiet dot-grid texture in the
       empty side margins — so the theme still reads as elegant and spare,
       just considered rather than bare. */
    function decoMinimalRule(ctx, W, H, pad, color) {
      ctx.save();

      const frameTop = pad * 0.38;
      const frameBottom = H - 330;
      const frameLeft = pad * 0.38;
      const frameRight = W - pad * 0.38;

      // Outer gallery-mat double frame around the whole photo block.
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 2.5;
      roundRectPath(ctx, frameLeft, frameTop, frameRight - frameLeft, frameBottom - frameTop, 6);
      ctx.stroke();
      ctx.globalAlpha = 0.32;
      ctx.lineWidth = 1;
      roundRectPath(ctx, frameLeft + 9, frameTop + 9, frameRight - frameLeft - 18, frameBottom - frameTop - 18, 4);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Fine ruler ticks down both side margins — a quiet blueprint/gallery
      // label detail so the empty margins read as designed, not blank.
      ctx.lineWidth = 1;
      let i = 0;
      for (let y = frameTop + 20; y < frameBottom - 20; y += 32) {
        const major = i % 4 === 0;
        ctx.globalAlpha = major ? 0.5 : 0.22;
        const len = major ? 12 : 6;
        ctx.beginPath(); ctx.moveTo(frameLeft - len, y); ctx.lineTo(frameLeft, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(frameRight, y); ctx.lineTo(frameRight + len, y); ctx.stroke();
        i++;
      }
      ctx.globalAlpha = 1;

      // Bracket corners bookending the mat frame, like a gallery placard.
      const tick = 22;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.85;
      [[frameLeft, frameTop], [frameRight, frameTop], [frameLeft, frameBottom], [frameRight, frameBottom]].forEach(([x, y]) => {
        const dx = x === frameLeft ? tick : -tick;
        const dy = y === frameTop ? tick : -tick;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + dy); ctx.stroke();
      });
      ctx.globalAlpha = 1;

      // Whisper-quiet dot-grid texture, confined to the empty side margins
      // only (never under the photos), so large blank areas still feel like
      // considered paper instead of a flat void.
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.16;
      const dotStep = 20, r = 1;
      for (let y = frameTop + 24; y < frameBottom - 24; y += dotStep) {
        for (let x = 14; x < frameLeft - 14; x += dotStep) {
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
        for (let x = frameRight + 14; x < W - 14; x += dotStep) {
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      ctx.restore();
    }
    function decoSparkle(ctx, W, H, pad, color, seed) {
      ctx.save();
      ctx.fillStyle = color; ctx.globalAlpha = 0.8;
      function star(x, y, s) {
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = (Math.PI / 2) * i;
          ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
          ctx.lineTo(x + Math.cos(a + Math.PI / 4) * s * 0.3, y + Math.sin(a + Math.PI / 4) * s * 0.3);
        }
        ctx.closePath(); ctx.fill();
      }
      let rnd = seed;
      const next = () => (rnd = (rnd * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < 26; i++) {
        const x = next() * W, y = next() * (H - 340);
        if (x > pad + 20 && x < W - pad - 20 && (y % (H)) > pad) continue;
        star(x, y, 8 + next() * 14);
      }
      ctx.globalAlpha = 1; ctx.restore();
    }
    function decoScallop(ctx, W, H, pad, color) {
      ctx.save();
      ctx.fillStyle = color; ctx.globalAlpha = 0.55;
      for (let y = pad; y < H - 340; y += 44) {
        ctx.beginPath(); ctx.arc(pad * 0.3, y, 14, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(W - pad * 0.3, y + 22, 14, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.restore();
    }
    function decoGoldOrnate(ctx, W, H, pad, color) {
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.globalAlpha = 0.85;
      ctx.strokeRect(pad * 0.32, pad * 0.32, W - pad * 0.64, H - 340 - pad * 0.32);
      ctx.lineWidth = 1.2;
      ctx.strokeRect(pad * 0.42, pad * 0.42, W - pad * 0.84, H - 340 - pad * 0.62);
      // diamond corner flourishes
      const s = 20;
      [[pad * 0.32, pad * 0.32], [W - pad * 0.32, pad * 0.32], [pad * 0.32, H - 340], [W - pad * 0.32, H - 340]].forEach(([x, y]) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = color; ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      });
      ctx.globalAlpha = 1; ctx.restore();
    }
    function decoTape(ctx, W, H, pad, color) {
      ctx.save();
      ctx.globalAlpha = 0.75;
      [[pad * 0.9, -8], [W - pad * 0.9, 6]].forEach(([x, rot]) => {
        ctx.save();
        ctx.translate(x, pad * 0.55);
        ctx.rotate(rot * Math.PI / 180);
        ctx.fillStyle = color;
        ctx.fillRect(-70, -22, 140, 44);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
        ctx.strokeRect(-70, -22, 140, 44);
        ctx.restore();
      });
      ctx.globalAlpha = 1; ctx.restore();
    }
    function decoSprockets(ctx, W, H, pad, color) {
      ctx.save();
      ctx.fillStyle = color; ctx.globalAlpha = 0.85;
      for (let y = pad * 0.5; y < H - 320; y += 46) {
        ctx.fillRect(pad * 0.34, y, 22, 30);
        ctx.fillRect(W - pad * 0.34 - 22, y, 22, 30);
      }
      ctx.globalAlpha = 1; ctx.restore();
    }
    function decoFloral(ctx, W, H, pad, color) {
      ctx.save();
      ctx.fillStyle = color; ctx.globalAlpha = 0.6;
      function flower(x, y, s) {
        for (let i = 0; i < 5; i++) {
          const a = (Math.PI * 2 / 5) * i;
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(a) * s, y + Math.sin(a) * s, s * 0.65, s * 0.4, a, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (let y = pad + 30; y < H - 380; y += 150) {
        flower(pad * 0.42, y, 12);
        flower(W - pad * 0.42, y + 75, 12);
      }
      ctx.globalAlpha = 1; ctx.restore();
    }
    function decoConfetti(ctx, W, H, pad, color, seed) {
      ctx.save();
      const colors = ['#fb923c', '#f472b6', '#facc15', '#34d399', '#60a5fa'];
      let rnd = seed;
      const next = () => (rnd = (rnd * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < 40; i++) {
        const x = next() * W, y = next() * (H - 340);
        if (x > pad + 15 && x < W - pad - 15) continue;
        ctx.save();
        ctx.translate(x, y); ctx.rotate(next() * Math.PI);
        ctx.fillStyle = colors[i % colors.length]; ctx.globalAlpha = 0.85;
        if (i % 2 === 0) ctx.fillRect(-8, -5, 16, 10);
        else { ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      ctx.globalAlpha = 1; ctx.restore();
    }
    function decoWave(ctx, W, H, pad, color) {
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.globalAlpha = 0.6;
      [pad * 0.55, H - 355].forEach(y => {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 8) ctx.lineTo(x, y + Math.sin(x / 45) * 10);
        ctx.stroke();
      });
      ctx.globalAlpha = 1; ctx.restore();
    }
    // Gentle snowfall dots along the margins — used by the Natal theme.
    function decoSnowfall(ctx, W, H, pad, color, seed) {
      ctx.save();
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.85;
      let rnd = seed || 7;
      const next = () => (rnd = (rnd * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < 48; i++) {
        const x = next() * W, y = next() * (H - 340);
        if (x > pad + 15 && x < W - pad - 15) continue;
        ctx.beginPath(); ctx.arc(x, y, 3 + next() * 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.fillStyle = color; ctx.globalAlpha = 0.35;
      for (let i = 0; i < 10; i++) {
        const x = pad * 0.3 + (i % 2) * (W - pad * 0.6), y = pad + i * 60;
        if (y > H - 380) continue;
        ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.restore();
    }
    // Small triangular pennant flags along the top edge — used by the 17 Agustus theme.
    function decoFlagBunting(ctx, W, H, pad, color) {
      ctx.save();
      const colors = ['#dc2626', '#ffffff'];
      const y = pad * 0.42, spacing = 34, size = 20;
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(pad * 0.25, y); ctx.lineTo(W - pad * 0.25, y); ctx.stroke();
      let i = 0;
      for (let x = pad * 0.3; x < W - pad * 0.3; x += spacing) {
        ctx.fillStyle = colors[i % 2]; i++;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + spacing * 0.5, y + size);
        ctx.lineTo(x + spacing, y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.restore();
    }

    /* ---------- Small reusable heart path (used by sweetheart border + photo clip) ---------- */
    function heartPath(ctx, x, y, width, height) {
      // x,y = top-center anchor point of the heart's bounding box
      ctx.beginPath();
      const topCurveHeight = height * 0.3;
      ctx.moveTo(x, y + topCurveHeight);
      ctx.bezierCurveTo(x, y, x - width / 2, y, x - width / 2, y + topCurveHeight);
      ctx.bezierCurveTo(x - width / 2, y + (height + topCurveHeight) / 2, x, y + (height + topCurveHeight) / 2, x, y + height);
      ctx.bezierCurveTo(x, y + (height + topCurveHeight) / 2, x + width / 2, y + (height + topCurveHeight) / 2, x + width / 2, y + topCurveHeight);
      ctx.bezierCurveTo(x + width / 2, y, x, y, x, y + topCurveHeight);
      ctx.closePath();
    }

    function decoGingham(ctx, W, H, pad, color) {
      ctx.save();
      const cell = 22;
      [pad * 0.32, W - pad * 0.32 - cell * 3].forEach((startX) => {
        for (let y = pad; y < H - 340; y += cell) {
          for (let c = 0; c < 3; c++) {
            const on = (Math.floor((y - pad) / cell) + c) % 2 === 0;
            ctx.globalAlpha = on ? 0.45 : 0.15;
            ctx.fillStyle = color;
            ctx.fillRect(startX + c * cell, y, cell - 2, cell - 2);
          }
        }
      });
      ctx.globalAlpha = 1; ctx.restore();
    }
    function decoHeartScatter(ctx, W, H, pad, color, seed) {
      ctx.save();
      ctx.fillStyle = color;
      let rnd = seed;
      const next = () => (rnd = (rnd * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < 16; i++) {
        const side = i % 2 === 0 ? pad * 0.4 : W - pad * 0.4;
        const y = pad + 20 + (i * 47 + next() * 20) % (H - 400);
        const s = 16 + next() * 14;
        ctx.globalAlpha = 0.5 + next() * 0.3;
        heartPath(ctx, side, y, s, s);
        ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.restore();
    }
    function decoLeopardSpots(ctx, W, H, pad, color, seed) {
      ctx.save();
      let rnd = seed;
      const next = () => (rnd = (rnd * 9301 + 49297) % 233280) / 233280;
      function rosette(cx, cy, s) {
        ctx.fillStyle = '#f5deb3'; ctx.globalAlpha = 0.0;
        ctx.beginPath(); ctx.ellipse(cx, cy, s, s * 0.75, next() * Math.PI, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.globalAlpha = 0.75;
        const blobs = 4 + Math.floor(next() * 2);
        for (let b = 0; b < blobs; b++) {
          const a = (Math.PI * 2 / blobs) * b + next() * 0.4;
          const bx = cx + Math.cos(a) * s * 0.6, by = cy + Math.sin(a) * s * 0.5;
          ctx.beginPath(); ctx.ellipse(bx, by, s * 0.32, s * 0.24, a, 0, Math.PI * 2); ctx.stroke();
        }
      }
      [pad * 0.4, W - pad * 0.4].forEach((x) => {
        for (let y = pad + 30; y < H - 380; y += 90) rosette(x, y + next() * 20, 18 + next() * 8);
      });
      ctx.globalAlpha = 1; ctx.restore();
    }
    function decoComicBurst(ctx, W, H, pad, color, seed) {
      ctx.save();
      let rnd = seed;
      const next = () => (rnd = (rnd * 9301 + 49297) % 233280) / 233280;
      // halftone dot columns
      ctx.fillStyle = color;
      for (let side = 0; side < 2; side++) {
        const baseX = side === 0 ? pad * 0.35 : W - pad * 0.35;
        for (let y = pad; y < H - 340; y += 24) {
          const r = 3 + (Math.sin(y / 20) + 1) * 3;
          ctx.globalAlpha = 0.55;
          ctx.beginPath(); ctx.arc(baseX, y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      // little starbursts
      function burst(cx, cy, s, col) {
        ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = col; ctx.globalAlpha = 0.9;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI / 4) * i;
          const rad = i % 2 === 0 ? s : s * 0.45;
          ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
      const bursts = [[pad * 0.4, pad + 40], [W - pad * 0.4, H - 420], [pad * 0.35, H - 450]];
      bursts.forEach(([x, y], i) => burst(x, y, 22, i % 2 === 0 ? '#facc15' : color));
      ctx.globalAlpha = 1; ctx.restore();
    }
    function decoPolkaDots(ctx, W, H, pad, color, seed) {
      ctx.save();
      let rnd = seed;
      const next = () => (rnd = (rnd * 9301 + 49297) % 233280) / 233280;
      for (let side = 0; side < 2; side++) {
        const baseX = side === 0 ? pad * 0.42 : W - pad * 0.42;
        for (let y = pad + 10; y < H - 360; y += 60) {
          const r = 8 + next() * 10;
          ctx.globalAlpha = 0.5 + next() * 0.3;
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(baseX + (side === 0 ? -8 : 8), y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1; ctx.restore();
    }
    function decoCowSpots(ctx, W, H, pad, color, seed) {
      ctx.save();
      let rnd = seed;
      const next = () => (rnd = (rnd * 9301 + 49297) % 233280) / 233280;
      function blob(cx, cy, s) {
        ctx.beginPath();
        const pts = 7;
        for (let i = 0; i <= pts; i++) {
          const a = (Math.PI * 2 / pts) * i;
          const r = s * (0.7 + next() * 0.5);
          const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = color; ctx.globalAlpha = 0.8;
      [pad * 0.4, W - pad * 0.4].forEach((x) => {
        for (let y = pad + 30; y < H - 380; y += 100) blob(x + (next() - 0.5) * 20, y, 20 + next() * 12);
      });
      ctx.globalAlpha = 1; ctx.restore();
    }

    function decoStarField(ctx, W, H, pad, color, seed) {
      ctx.save();
      let rnd = seed;
      const next = () => (rnd = (rnd * 9301 + 49297) % 233280) / 233280;
      // scattered stars in the side margins
      for (let side = 0; side < 2; side++) {
        const baseX = side === 0 ? pad * 0.42 : W - pad * 0.42;
        for (let y = pad; y < H - 340; y += 34) {
          const x = baseX + (next() - 0.5) * pad * 0.5;
          const yy = y + next() * 20;
          const r = 1.5 + next() * 3;
          ctx.globalAlpha = 0.35 + next() * 0.55;
          ctx.fillStyle = next() > 0.75 ? color : '#ffffff';
          ctx.beginPath();
          if (next() > 0.7) {
            // little 4-point sparkle star
            const s = r * 3.2;
            ctx.moveTo(x, yy - s); ctx.lineTo(x + s * 0.28, yy - s * 0.28);
            ctx.lineTo(x + s, yy); ctx.lineTo(x + s * 0.28, yy + s * 0.28);
            ctx.lineTo(x, yy + s); ctx.lineTo(x - s * 0.28, yy + s * 0.28);
            ctx.lineTo(x - s, yy); ctx.lineTo(x - s * 0.28, yy - s * 0.28);
            ctx.closePath();
          } else {
            ctx.arc(x, yy, r, 0, Math.PI * 2);
          }
          ctx.fill();
        }
      }
      // two small "planets" with a thin ring
      [[pad * 0.4, pad + 60, 16], [W - pad * 0.42, H - 460, 12]].forEach(([x, y, r]) => {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x, y, r * 1.8, r * 0.55, -0.4, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.globalAlpha = 1; ctx.restore();
    }
    function decoFallenLeaves(ctx, W, H, pad, color, seed) {
      ctx.save();
      let rnd = seed;
      const next = () => (rnd = (rnd * 9301 + 49297) % 233280) / 233280;
      const palette = [color, '#e08a3c', '#a8531f', '#e3b23c'];
      function leaf(cx, cy, s, rot, col) {
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(rot);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.bezierCurveTo(s * 0.75, -s * 0.5, s * 0.75, s * 0.5, 0, s);
        ctx.bezierCurveTo(-s * 0.75, s * 0.5, -s * 0.75, -s * 0.5, 0, -s);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -s * 0.85); ctx.lineTo(0, s * 0.85); ctx.stroke();
        ctx.restore();
      }
      [pad * 0.42, W - pad * 0.42].forEach((x) => {
        for (let y = pad + 20; y < H - 380; y += 78) {
          ctx.globalAlpha = 0.55 + next() * 0.35;
          leaf(x + (next() - 0.5) * 24, y + next() * 20, 13 + next() * 8, next() * Math.PI * 2, palette[Math.floor(next() * palette.length)]);
        }
      });
      ctx.globalAlpha = 1; ctx.restore();
    }

    const BORDER_DECORATORS = {
      leafVine: decoLeafVine, circuit: decoCircuit, pixelDash: decoPixelDash, minimalRule: decoMinimalRule,
      sparkle: (ctx, W, H, pad, color) => decoSparkle(ctx, W, H, pad, color, 42), scallop: decoScallop,
      goldOrnate: decoGoldOrnate, tape: decoTape, sprockets: decoSprockets, floral: decoFloral,
      confetti: (ctx, W, H, pad, color) => decoConfetti(ctx, W, H, pad, color, 17), wave: decoWave,
      ginghamCheck: decoGingham,
      heartScatter: (ctx, W, H, pad, color) => decoHeartScatter(ctx, W, H, pad, color, 23),
      leopardSpots: (ctx, W, H, pad, color) => decoLeopardSpots(ctx, W, H, pad, color, 31),
      comicBurst: (ctx, W, H, pad, color) => decoComicBurst(ctx, W, H, pad, color, 11),
      polkaDots: (ctx, W, H, pad, color) => decoPolkaDots(ctx, W, H, pad, color, 55),
      cowSpots: (ctx, W, H, pad, color) => decoCowSpots(ctx, W, H, pad, color, 8),
      starField: (ctx, W, H, pad, color) => decoStarField(ctx, W, H, pad, color, 63),
      fallenLeaves: (ctx, W, H, pad, color) => decoFallenLeaves(ctx, W, H, pad, color, 27),
      snowfall: (ctx, W, H, pad, color) => decoSnowfall(ctx, W, H, pad, color, 19),
      bunting: decoFlagBunting
    };

    /* ---------- Photo shape clipping (rect / rounded / heart / oval) ---------- */
    function buildPhotoShapePath(ctx, shape, x, y, w, h) {
      ctx.beginPath();
      if (shape === 'heart') {
        heartPath(ctx, x + w / 2, y, w * 0.98, h * 0.98);
      } else if (shape === 'oval') {
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      } else if (shape === 'rounded') {
        const r = Math.min(w, h) * 0.06;
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      } else {
        ctx.rect(x, y, w, h);
      }
    }
    function drawPhotoIntoShape(ctx, img, srcX, srcY, srcW, srcH, destX, destY, destW, destH, shape, accent) {
      ctx.save();
      buildPhotoShapePath(ctx, shape, destX, destY, destW, destH);
      ctx.clip();
      ctx.drawImage(img, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
      ctx.restore();
      if (shape && shape !== 'rect') {
        ctx.save();
        buildPhotoShapePath(ctx, shape, destX, destY, destW, destH);
        ctx.lineWidth = shape === 'rounded' ? 10 : 8;
        ctx.strokeStyle = accent || '#ffffff';
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawThemeBorderDecoration(ctx, cfg, W, H, pad) {
      const fn = BORDER_DECORATORS[cfg.borderStyle];
      if (fn) fn(ctx, W, H, pad, cfg.accent);
    }

    function applyFrameDesignToCanvas(ctx, W, H, photoW, photoH, pad, gap) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const cfg = FRAME_THEMES[currentFrame] || FRAME_THEMES.nature;

      /* ---------------------------------------------------------------------
         UNIFIED FRAME CHROME — one professional layout system shared by all
         20 themes. Instead of a bespoke oversized comic/handwriting caption
         per theme, every frame gets the same considered anatomy: a slim
         accent edge, an eyebrow label, a restrained brand lockup, a tagline,
         registration ticks, and a receipt-style footer line. Only the accent
         colour, ink colour and paper tone come from the theme — the layout,
         type scale and spacing stay identical so the whole set reads as one
         coherent, print-shop-quality product rather than 20 unrelated
         posters. Border decorators (leafVine, sparkle, wave, etc.) still run
         per theme for a light personality touch in the side margins. */

      const isDark = DARK_FRAME_THEMES.has(currentFrame);
      const paper = isDark ? '#1c1e17' : '#f7f2e8';
      const ink = isDark ? '#ffffff' : '#241f16';
      const inkMuted = isDark ? 'rgba(237,227,208,0.62)' : 'rgba(26,28,20,0.58)';
      const inkFaint = isDark ? 'rgba(237,227,208,0.34)' : 'rgba(26,28,20,0.32)';
      const accent = cfg.accent || '#c9a04a';

      // Living, theme-tinted backdrop behind the whole strip — the photos
      // read as mounted ON this backdrop rather than sitting on a flat
      // colour fill.
      paintThemedBackground(ctx, paper, accent, W, H, isDark);

      // A very soft accent wash behind the footer only, so each theme still
      // feels distinct without shouting.
      const footerTop = H - 320;
      const wash = ctx.createLinearGradient(0, footerTop, 0, H);
      wash.addColorStop(0, hexToRgba(accent, isDark ? 0.14 : 0.08));
      wash.addColorStop(1, hexToRgba(accent, 0));
      ctx.fillStyle = wash;
      ctx.fillRect(0, footerTop, W, 320);

      // Slim accent edge marking the top of the footer, like a designer's
      // colour bar on a print proof.
      ctx.fillStyle = accent;
      ctx.fillRect(pad * 0.42, footerTop + 6, W - pad * 0.84, 4);

      // Corner registration ticks — a quiet professional-print detail,
      // consistent across every theme.
      ctx.strokeStyle = hexToRgba(accent, 0.55);
      ctx.lineWidth = 2;
      [[pad * 0.42, footerTop + 26], [W - pad * 0.42, footerTop + 26]].forEach(([x, y], i) => {
        const dir = i === 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x + dir * 14, y);
        ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7);
        ctx.stroke();
      });

      // Eyebrow label (theme sub-text), small tracked caps.
      ctx.textAlign = 'center';
      ctx.font = "700 24px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = accent;
      drawTrackedText(ctx, (cfg.subText || cfg.label).toUpperCase(), W / 2, footerTop + 62, 3);

      // Brand lockup — one restrained, confident weight/size for every theme.
      ctx.font = "800 54px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = ink;
      ctx.fillText('JEPRETIN', W / 2, footerTop + 118);

      // Thin rule under the brand name.
      ctx.strokeStyle = hexToRgba(accent, 0.5);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 70, footerTop + 138);
      ctx.lineTo(W / 2 + 70, footerTop + 138);
      ctx.stroke();

      // Tagline — quiet, sentence case, not shouting.
      ctx.font = "500 27px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = inkMuted;
      wrapCenteredText(ctx, cfg.tagline, W / 2, footerTop + 178, W - pad * 2.2, 34);

      // Professional per-theme border decoration in the side margins.
      drawThemeBorderDecoration(ctx, cfg, W, H, pad);

      // Footer seal — a small, restrained circular stamp instead of a loud
      // star-studded banner.
      const sealR = 30, sealX = pad * 0.85, sealY = H - 62;
      ctx.save();
      ctx.translate(sealX, sealY);
      ctx.rotate(-0.09);
      ctx.beginPath(); ctx.arc(0, 0, sealR, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(accent, isDark ? 0.16 : 0.1);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = accent;
      ctx.beginPath(); ctx.arc(0, 0, sealR, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, sealR - 5, 0, Math.PI * 2); ctx.stroke();
      ctx.font = "700 10px 'Fira Code', monospace";
      ctx.fillStyle = ink;
      ctx.textAlign = 'center';
      const sealLines = (cfg.stampText || cfg.label).toUpperCase().split(' ');
      sealLines.forEach((word, i) => {
        ctx.fillText(word, 0, (i - (sealLines.length - 1) / 2) * 11 + 3);
      });
      ctx.restore();

      // Receipt-style meta line — session code, date and time, like a real
      // booth's printed slip. Right-aligned against the seal.
      ctx.textAlign = 'right';
      ctx.font = "600 21px 'Fira Code', monospace";
      ctx.fillStyle = inkFaint;
      ctx.fillText(`SESI #${sessionCode || '—'}  ·  ${dateStr}  ·  ${timeStr}`, W - pad * 0.5, H - 58);
      ctx.textAlign = 'center';
    }

    /* Paints a living, theme-tinted backdrop for the whole strip: a paper
       base, two soft accent-coloured glows, a faint diagonal grain, and a
       gentle vignette. Every theme automatically gets its own non-flat
       backdrop from just its accent colour + light/dark tone — no per-theme
       code needed — so photos read as mounted ON a designed background
       instead of floating on a plain colour fill. */
    function paintThemedBackground(ctx, paper, accent, W, H, isDark) {
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, W, H);

      function glow(cx, cy, r, alpha) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, hexToRgba(accent, alpha));
        g.addColorStop(1, hexToRgba(accent, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      glow(W * 0.16, H * 0.1, W * 0.7, isDark ? 0.24 : 0.16);
      glow(W * 0.88, H * 0.42, W * 0.6, isDark ? 0.18 : 0.13);
      glow(W * 0.28, H * 0.92, W * 0.55, isDark ? 0.16 : 0.11);

      // Faint diagonal grain so large empty areas still feel textured, not
      // digitally flat, once printed.
      ctx.save();
      ctx.globalAlpha = isDark ? 0.05 : 0.035;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      for (let x = -H; x < W; x += 26) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.stroke();
      }
      ctx.restore();

      // Soft vignette to ground the edges like a real studio backdrop falloff.
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.72);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.07)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }

    function roundRectPath(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    /* Draws a mounting "mat" behind a photo — a lifted card with a soft
       shadow and a thin accent border — so each photo reads as physically
       layered on top of the theme's backdrop, like a print mounted on
       backing paper, instead of just touching a flat background. */
    function drawPhotoMat(ctx, accent, isDark, x, y, w, h) {
      const m = 14;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.38)';
      ctx.shadowBlur = 26;
      ctx.shadowOffsetY = 10;
      ctx.fillStyle = isDark ? '#14160f' : '#ffffff';
      roundRectPath(ctx, x - m, y - m, w + m * 2, h + m * 2, 14);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = hexToRgba(accent, 0.55);
      ctx.lineWidth = 2;
      roundRectPath(ctx, x - m + 1, y - m + 1, w + m * 2 - 2, h + m * 2 - 2, 13);
      ctx.stroke();
      ctx.restore();
    }


    /* Simple hex(+alpha) helper so theme accent colours can be washed/screened
       without maintaining a second rgba per theme. */
    function hexToRgba(hex, alpha) {
      const h = (hex || '#c9a04a').replace('#', '');
      const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
      const r = parseInt(full.substring(0, 2), 16) || 0;
      const g = parseInt(full.substring(2, 4), 16) || 0;
      const b = parseInt(full.substring(4, 6), 16) || 0;
      return `rgba(${r},${g},${b},${alpha})`;
    }

    /* Draws uppercase text with manual letter-spacing (canvas has no native
       tracking support) — used for the small eyebrow labels. */
    function drawTrackedText(ctx, text, cx, y, spacing) {
      const widths = [...text].map(ch => ctx.measureText(ch).width);
      const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
      let x = cx - total / 2;
      const prevAlign = ctx.textAlign;
      ctx.textAlign = 'left';
      [...text].forEach((ch, i) => { ctx.fillText(ch, x, y); x += widths[i] + spacing; });
      ctx.textAlign = prevAlign;
    }

    /* Word-wraps text centered on cx, starting at y, growing downward by
       lineHeight — used for taglines that vary a lot in length across themes. */
    function wrapCenteredText(ctx, text, cx, y, maxWidth, lineHeight) {
      const words = String(text || '').split(' ');
      let line = '', lines = [];
      words.forEach(word => {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
        else { line = test; }
      });
      if (line) lines.push(line);
      lines = lines.slice(0, 2);
      const startY = y - ((lines.length - 1) * lineHeight) / 2;
      lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineHeight));
    }


    /* Builds the exact final "print strip" image (all N photos combined with the chosen
       theme's frame) as a dataURL. Used both for the real download and for the preview grid,
       so what the user previews is pixel-for-pixel what gets downloaded. */
    /* Keeps the strip-card "tampilan" in sync with the real download output
       AT EVERY STAGE — including before any photo is taken. It always
       renders through buildPrintStripDataUrl(), the exact same function
       exportPhotoStrip() uses, so the frame chrome is never a different
       design that later gets swapped for the "real" one — it's the same
       render the whole time, just filling in as photos come in. */
    async function refreshLiveFramedPreview() {
      const myToken = ++livePreviewToken;
      try {
        const key = 'stripPreview|' + currentFrame + '|' + currentFilter + '|' + capturedImages.join('|').slice(-200);
        const dataUrl = framedCache[key] || await buildPrintStripDataUrl();
        framedCache[key] = dataUrl;
        if (myToken !== livePreviewToken) return; // a newer refresh already started, discard this one
        stripLivePreview.src = dataUrl;
        stripLivePreview.classList.remove('hidden');
        stripMockup.classList.add('hidden');
        stripCard.classList.add('live-frame-active'); // real frame image now showing — strip the outer CSS frame so it doesn't stack behind it
      } catch (e) {
        // Only fall back to the plain mockup if we have nothing rendered yet
        // (e.g. the very first render failed) — never swap a working render
        // back out for the mockup mid-session.
        if (!stripLivePreview.src) { stripMockup.classList.remove('hidden'); stripCard.classList.remove('live-frame-active'); }
      }
    }

    /* Empty (not-yet-captured) photo slot — same mounted "mat" as a real
       photo, but with a dashed accent outline + camera glyph + pose number
       instead of an image, so the strip already reads as the final print
       layout before a single photo has been taken. */
    function drawEmptyPhotoSlot(ctx, cfg, isDark, x, y, w, h, poseNum) {
      drawPhotoMat(ctx, cfg.accent, isDark, x, y, w, h);

      ctx.save();
      roundRectPath(ctx, x, y, w, h, 10);
      ctx.clip();
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.035)';
      ctx.fillRect(x, y, w, h);
      ctx.restore();

      ctx.save();
      roundRectPath(ctx, x + 16, y + 16, w - 32, h - 32, 8);
      ctx.setLineDash([12, 9]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = hexToRgba(cfg.accent || '#c9a04a', 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      const cx = x + w / 2, cy = y + h / 2 - 18;
      ctx.save();
      ctx.strokeStyle = hexToRgba(cfg.accent || '#c9a04a', 0.55);
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      const bw = 84, bh = 58;
      roundRectPath(ctx, cx - bw / 2, cy - bh / 2, bw, bh, 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy + 3, 17, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.42)';
      ctx.font = "700 26px 'Plus Jakarta Sans', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`POSE ${poseNum}`, cx, cy + 62);
      ctx.restore();
    }

    /* Renders the SAME strip artwork used for the download, at every stage —
       zero photos, mid-shoot, or complete. Slots without a captured photo
       yet get drawEmptyPhotoSlot() so the frame chrome (paper, ink, accent
       edge, border decoration, footer) never changes between "tampilan" and
       hasil unduhan; only the photo content fills in as poses are taken. */
    function buildPrintStripDataUrl() {
      return new Promise((resolve, reject) => {
        const N = POSE_COUNT;
        const localCanvas = document.createElement('canvas');
        const ctx = localCanvas.getContext('2d');
        const photoW = 1200, photoH = 900, pad = 100, gap = 50, footerH = 320;
        const W = photoW + (pad * 2), H = (pad * 2) + (photoH * N) + (gap * (N - 1)) + footerH;

        localCanvas.width = W; localCanvas.height = H;

        applyFrameDesignToCanvas(ctx, W, H, photoW, photoH, pad, gap);
        const shapeCfg = FRAME_THEMES[currentFrame] || FRAME_THEMES.nature;
        const isDark = DARK_FRAME_THEMES.has(currentFrame);

        function finalize() {
          drawThemeStickersOnCanvas(ctx, W, H, photoW, photoH, pad, gap);
          drawPlacedStickersOnCanvas(ctx, W, H);
          // Curved authenticity stamp drawn LAST so it sits on top of the first
          // photo's corner — matching the on-screen live preview badge position.
          drawThemeStamp(ctx, shapeCfg, pad + photoW - 78, pad + 78);
          resolve(localCanvas.toDataURL('image/png'));
        }

        // Draw every not-yet-captured slot immediately (synchronous, no image
        // loading needed) so the layout is complete even with 0 photos so far.
        for (let idx = 0; idx < N; idx++) {
          if (idx >= capturedImages.length) {
            const destX = pad, destY = pad + idx * (photoH + gap);
            drawEmptyPhotoSlot(ctx, shapeCfg, isDark, destX, destY, photoW, photoH, idx + 1);
          }
        }

        const capturedCount = capturedImages.length;
        if (capturedCount === 0) { finalize(); return; }

        let loaded = 0;
        capturedImages.forEach((src, idx) => {
          const img = new Image();
          img.onload = () => {
            const destX = pad;
            const destY = pad + idx * (photoH + gap);

            const imgRatio = img.width / img.height;
            const targetRatio = photoW / photoH;

            let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;

            if (imgRatio > targetRatio) {
              srcW = img.height * targetRatio;
              srcX = (img.width - srcW) / 2;
            } else {
              srcH = img.width / targetRatio;
              srcY = (img.height - srcH) / 2;
            }

            drawPhotoMat(ctx, shapeCfg.accent, isDark, destX, destY, photoW, photoH);
            drawPhotoIntoShape(ctx, img, srcX, srcY, srcW, srcH, destX, destY, photoW, photoH, shapeCfg.photoShape || 'rect', shapeCfg.accent);

            loaded++;
            if (loaded === capturedCount) finalize();
          };
          img.onerror = reject;
          img.src = src;
        });
      });
    }

    async function exportPhotoStrip(triggerDownload = true) {
      if (capturedImages.length < POSE_COUNT) return;
      try {
        const dataUrl = await buildPrintStripDataUrl();
        const filename = `jepretin-${currentFrame}-${Date.now()}.png`;
        if (triggerDownload) {
          const a = document.createElement('a');
          a.download = filename;
          a.href = dataUrl;
          a.click();
        }

        lastExports.png = { dataUrl, filename, mime: 'image/png', text: 'Hasil strip foto JEPRETIN' };
        if (window.JepretinAuth) JepretinAuth.addHistoryEntry(dataUrl, filename, 'strip', currentFrame);
        celebrateOutput();
        if (triggerDownload) {
          showQrForDataUrl(dataUrl);
          showToast('Foto berhasil diunduh!', '🖼️');
        } else {
          showToast('Tersimpan ke Galeri!', '💾');
        }
      } catch (e) {
        showToast(triggerDownload ? 'Gagal membuat strip foto.' : 'Gagal menyimpan ke galeri.', '⚠️');
      }
    }

    // Simpan strip ke Galeri tanpa memicu download browser — dipakai oleh
    // tombol bookmark di sebelah tombol "Cetak Hasil Photobox (PNG)".
    function saveStripToGallery() {
      exportPhotoStrip(false);
    }

    /* ---------- Grid (2x2) layout export — an alternative to the vertical strip ---------- */
    function exportPhotoGrid(triggerDownload = true) {
      if (capturedImages.length < POSE_COUNT) return;
      const N = capturedImages.length;
      const cols = 2, rows = Math.ceil(N / cols);
      const exportCtx = exportCanvas.getContext('2d');
      const cell = 900, gap = 30, pad = 50, footerH = 220;
      const W = cell * cols + gap * (cols - 1) + pad * 2;
      const H = cell * rows + gap * (rows - 1) + pad * 2 + footerH;
      exportCanvas.width = W; exportCanvas.height = H;

      const cfg = FRAME_THEMES[currentFrame] || FRAME_THEMES.nature;
      const isDarkGrid = DARK_FRAME_THEMES.has(currentFrame);
      paintThemedBackground(exportCtx, isDarkGrid ? '#1c1e17' : '#f7f2e8', cfg.accent || '#c9a04a', W, H, isDarkGrid);

      let loaded = 0;
      capturedImages.forEach((src, idx) => {
        const img = new Image();
        img.onload = () => {
          const col = idx % cols, row = Math.floor(idx / cols);
          const destX = pad + col * (cell + gap);
          const destY = pad + row * (cell + gap);

          const imgRatio = img.width / img.height;
          let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;
          if (imgRatio > 1) {
            srcW = img.height; srcX = (img.width - srcW) / 2;
          } else {
            srcH = img.width; srcY = (img.height - srcH) / 2;
          }
          drawPhotoMat(exportCtx, cfg.accent, isDarkGrid, destX, destY, cell, cell);
          exportCtx.save();
          exportCtx.filter = filterCanvasMap[currentFilter] || 'none';
          exportCtx.drawImage(img, srcX, srcY, srcW, srcH, destX, destY, cell, cell);
          exportCtx.restore();
          exportCtx.strokeStyle = cfg.accent || '#c2ac7c';
          exportCtx.lineWidth = 6;
          exportCtx.strokeRect(destX, destY, cell, cell);

          loaded++;
          if (loaded === N) {
            drawPlacedStickersOnCanvas(exportCtx, W, H);

            const footerY = pad + rows * cell + (rows - 1) * gap + 80;
            exportCtx.textAlign = 'center';
            exportCtx.fillStyle = isDarkGrid ? '#ffffff' : '#241f16';
            exportCtx.font = "bold 54px 'Plus Jakarta Sans', sans-serif";
            exportCtx.fillText('JEPRETIN', W / 2, footerY);
            exportCtx.font = "20px 'Fira Code', monospace";
            exportCtx.fillStyle = isDarkGrid ? 'rgba(237,227,208,0.6)' : 'rgba(26,28,20,0.55)';
            const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            exportCtx.fillText(`#${sessionCode || '—'} · ${timeStr}`, W / 2, footerY + 46);

            const filename = `jepretin-grid-${currentFrame}-${Date.now()}.png`;
            const dataUrl = exportCanvas.toDataURL('image/png');
            if (triggerDownload) {
              const a = document.createElement('a');
              a.download = filename;
              a.href = dataUrl;
              a.click();
            }

            lastExports.grid = { dataUrl, filename, mime: 'image/png', text: 'Hasil grid 2x2 dari JEPRETIN' };
            if (window.JepretinAuth) JepretinAuth.addHistoryEntry(dataUrl, filename, 'grid', currentFrame);
            celebrateOutput();
            if (triggerDownload) {
              showQrForDataUrl(dataUrl);
              showToast('Grid 2x2 berhasil diunduh!', '🧩');
            } else {
              showToast('Tersimpan ke Galeri!', '💾');
            }
          }
        };
        img.src = src;
      });
    }

    // Simpan grid ke Galeri tanpa memicu download browser.
    function saveGridToGallery() {
      exportPhotoGrid(false);
    }

    function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
      const words = text.split(' ');
      let line = '';
      let lines = 0;
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        if (ctx.measureText(testLine).width > maxWidth && line !== '') {
          ctx.fillText(line.trim(), x, y + lines * lineHeight);
          line = words[i] + ' ';
          lines++;
          if (lines >= 2) { line = line.trim() + '…'; break; }
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), x, y + lines * lineHeight);
      return lines + 1;
    }


    /* Fit an image into a target box using "cover" crop (fills box, crops overflow) */
    function coverFitRect(img, targetW, targetH) {
      const imgRatio = img.width / img.height;
      const targetRatio = targetW / targetH;
      let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;
      if (imgRatio > targetRatio) {
        srcW = img.height * targetRatio;
        srcX = (img.width - srcW) / 2;
      } else {
        srcH = img.width / targetRatio;
        srcY = (img.height - srcH) / 2;
      }
      return { srcX, srcY, srcW, srcH };
    }

    // Jepretin logo used as the IG "profile picture" avatar, embedded directly as a
    // base64 data URI (NOT loaded as an external file). This matters because the app
    // is often opened straight from disk via file:// — an <img> loaded from a separate
    // local file under file:// taints the canvas, causing toDataURL()/download to fail
    // with a SecurityError. A same-origin data URI never taints the canvas, so this
    // works both on file:// and when hosted on a real server.
    const IG_LOGO_SRC = 'data:image/png;base64,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';
    let igLogoImgPromise = null;
    function loadIGLogoImage() {
      if (!igLogoImgPromise) {
        igLogoImgPromise = new Promise((resolve) => {
          const im = new Image();
          im.onload = () => resolve(im);
          im.onerror = () => resolve(null); // fall back gracefully if it somehow fails to decode
          im.src = IG_LOGO_SRC;
        });
      }
      return igLogoImgPromise;
    }

    function drawIGAvatar(ctx, cx, cy, r, logoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();

      if (logoImg) {
        // Real Jepretin logo as the profile picture — cover-fit + clipped to a circle.
        ctx.save();
        ctx.clip();
        ctx.fillStyle = '#000';
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        const { srcX, srcY, srcW, srcH } = coverFitRect(logoImg, r * 2, r * 2);
        ctx.drawImage(logoImg, srcX, srcY, srcW, srcH, cx - r, cy - r, r * 2, r * 2);
        ctx.restore();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.stroke();
      } else {
        // Fallback (logo not yet loaded / failed to load): original gradient + camera glyph.
        const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        grad.addColorStop(0, '#ff2f7e');
        grad.addColorStop(1, '#22e6ff');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.font = `${Math.round(r * 1.1)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📷', cx, cy + r * 0.05);
        ctx.textBaseline = 'alphabetic';
      }
      ctx.restore();
    }

    const IG_HANDLE = 'jepretin.official';
    const IG_DISPLAY_NAME = 'Jepretin';

    /* ---------- IG frame style #1: Klasik (feed IG putih) ---------- */
    function drawIGClassic(img, caption, logoImg) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const W = 1080, HEADER = 160, PHOTO = 1080, ICONS_H = 100, TEXT_H = 190;
      const H = HEADER + PHOTO + ICONS_H + TEXT_H;
      canvas.width = W; canvas.height = H;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);

      const dateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

      drawIGAvatar(ctx, 80, 80, 44, logoImg);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = "bold 36px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(IG_HANDLE, 148, 72);
      ctx.font = "26px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = '#8e8e8e';
      ctx.fillText('📷 Foto Asli · Photobooth', 148, 108);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#0f172a';
      ctx.font = "bold 36px sans-serif";
      ctx.fillText('•••', W - 44, 90);

      ctx.strokeStyle = '#efefef';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, HEADER);
      ctx.lineTo(W, HEADER);
      ctx.stroke();

      ctx.save();
      ctx.filter = filterCanvasMap[currentFilter] || 'none';
      const { srcX, srcY, srcW, srcH } = coverFitRect(img, W, PHOTO);
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, HEADER, W, PHOTO);
      ctx.restore();

      const iconY = HEADER + PHOTO + 62;
      ctx.font = "48px sans-serif";
      ctx.textAlign = 'left';
      ctx.fillText('❤️', 40, iconY);
      ctx.fillText('💬', 128, iconY);
      ctx.fillText('📤', 216, iconY);
      ctx.textAlign = 'right';
      ctx.fillText('🔖', W - 40, iconY);

      const likes = Math.floor(Math.random() * 900) + 120;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = "bold 30px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(`Disukai ${likes.toLocaleString('id-ID')} orang lainnya`, 40, iconY + 60);

      ctx.font = "bold 30px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(IG_HANDLE, 40, iconY + 104);
      const handleW = ctx.measureText(IG_HANDLE + '  ').width;
      ctx.font = "30px 'Plus Jakarta Sans', sans-serif";
      wrapCanvasText(ctx, caption, 40 + handleW, iconY + 104, W - 80 - handleW, 38);

      ctx.font = "24px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = '#8e8e8e';
      ctx.fillText(`${dateStr.toUpperCase()} · JEPRETIN`, 40, iconY + 168);

      return canvas.toDataURL('image/png');
    }

    /* ---------- IG frame style #2: Dark Mode ---------- */
    function drawIGDark(img, caption, logoImg) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const W = 1080, HEADER = 160, PHOTO = 1080, ICONS_H = 100, TEXT_H = 190;
      const H = HEADER + PHOTO + ICONS_H + TEXT_H;
      canvas.width = W; canvas.height = H;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);

      const dateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

      drawIGAvatar(ctx, 80, 80, 44, logoImg);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f5f5f5';
      ctx.font = "bold 36px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(IG_HANDLE, 148, 72);
      ctx.font = "26px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = '#a8a8a8';
      ctx.fillText('📷 Foto Asli · Photobooth', 148, 108);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#f5f5f5';
      ctx.font = "bold 36px sans-serif";
      ctx.fillText('•••', W - 44, 90);

      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, HEADER);
      ctx.lineTo(W, HEADER);
      ctx.stroke();

      ctx.save();
      ctx.filter = filterCanvasMap[currentFilter] || 'none';
      const { srcX, srcY, srcW, srcH } = coverFitRect(img, W, PHOTO);
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, HEADER, W, PHOTO);
      ctx.restore();

      const iconY = HEADER + PHOTO + 62;
      ctx.font = "48px sans-serif";
      ctx.textAlign = 'left';
      ctx.fillText('❤️', 40, iconY);
      ctx.fillText('💬', 128, iconY);
      ctx.fillText('📤', 216, iconY);
      ctx.textAlign = 'right';
      ctx.fillText('🔖', W - 40, iconY);

      const likes = Math.floor(Math.random() * 900) + 120;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f5f5f5';
      ctx.font = "bold 30px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(`Disukai ${likes.toLocaleString('id-ID')} orang lainnya`, 40, iconY + 60);

      ctx.font = "bold 30px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(IG_HANDLE, 40, iconY + 104);
      const handleW = ctx.measureText(IG_HANDLE + '  ').width;
      ctx.font = "30px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = '#f5f5f5';
      wrapCanvasText(ctx, caption, 40 + handleW, iconY + 104, W - 80 - handleW, 38);

      ctx.font = "24px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = '#a8a8a8';
      ctx.fillText(`${dateStr.toUpperCase()} · JEPRETIN`, 40, iconY + 168);

      return canvas.toDataURL('image/png');
    }

    /* ---------- IG frame style #3: Polaroid (instax + tulisan tangan) ---------- */
    function drawIGPolaroid(img, caption) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const W = 1080, MARGIN = 64, PHOTO = W - MARGIN * 2, CAPTION_H = 300;
      const H = MARGIN + PHOTO + CAPTION_H;
      canvas.width = W; canvas.height = H;

      ctx.fillStyle = '#f7f2e8';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#0000';

      ctx.save();
      ctx.filter = filterCanvasMap[currentFilter] || 'none';
      const { srcX, srcY, srcW, srcH } = coverFitRect(img, PHOTO, PHOTO);
      ctx.drawImage(img, srcX, srcY, srcW, srcH, MARGIN, MARGIN, PHOTO, PHOTO);
      ctx.restore();

      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 2;
      ctx.strokeRect(MARGIN, MARGIN, PHOTO, PHOTO);

      const capY = MARGIN + PHOTO + 92;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#2d2013';
      ctx.font = "52px 'Caveat', cursive";
      wrapCanvasText(ctx, caption, W / 2, capY, W - MARGIN * 2, 58);
      // wrapCanvasText assumes left align via fillText(x,y) — override alignment safely:
      ctx.textAlign = 'center';

      ctx.font = "bold 26px 'Pacifico', cursive";
      ctx.fillStyle = '#c9a04a';
      ctx.fillText(IG_DISPLAY_NAME, W / 2, H - 42);

      const dateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
      ctx.font = "22px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = '#6b6152';
      ctx.fillText(dateStr, W / 2, MARGIN + PHOTO + 46);

      return canvas.toDataURL('image/png');
    }

    /* ---------- IG frame style #4: Story (vertikal 9:16) ---------- */
    function drawIGStory(img, caption, logoImg) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const W = 1080, H = 1920;
      canvas.width = W; canvas.height = H;

      ctx.save();
      ctx.filter = filterCanvasMap[currentFilter] || 'none';
      const { srcX, srcY, srcW, srcH } = coverFitRect(img, W, H);
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, W, H);
      ctx.restore();

      // Top gradient + brand row
      const topGrad = ctx.createLinearGradient(0, 0, 0, 320);
      topGrad.addColorStop(0, 'rgba(0,0,0,0.55)');
      topGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, W, 320);

      drawIGAvatar(ctx, 96, 108, 40, logoImg);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = "bold 40px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(IG_DISPLAY_NAME, 156, 100);
      ctx.font = "26px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText('Photobooth Story', 156, 138);

      // Bottom gradient + caption card
      const botGrad = ctx.createLinearGradient(0, H - 640, 0, H);
      botGrad.addColorStop(0, 'rgba(0,0,0,0)');
      botGrad.addColorStop(1, 'rgba(0,0,0,0.72)');
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, H - 640, W, 640);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = "bold 44px 'Plus Jakarta Sans', sans-serif";
      const capLines = wrapCanvasText(ctx, caption, 64, H - 300, W - 128, 56);

      const dateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
      ctx.font = "24px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText(`${dateStr.toUpperCase()} · JEPRETIN.OFFICIAL`, 64, H - 130);

      return canvas.toDataURL('image/png');
    }

    /* Build the Instagram-post-styled canvas for a given photo index; resolves to a dataURL (does not download) */
    async function renderIGPostDataUrl(idx, style, captionOverride) {
      style = style || currentIGStyle || 'classic';
      const src = capturedImages[idx];
      if (!src) throw new Error('no photo');
      const caption = (captionOverride && captionOverride.trim())
        ? captionOverride.trim()
        : (currentIGCaption && currentIGCaption.trim()) || getIGCaptionFallback();

      // Make sure custom webfonts (Caveat/Pacifico) are ready before drawing to canvas,
      // otherwise the first render can fall back to a generic serif font. CSS @import
      // fonts are only fetched once actually requested, so request them explicitly.
      try {
        if (document.fonts) {
          await Promise.all([
            document.fonts.load("52px 'Caveat'"),
            document.fonts.load("bold 26px 'Pacifico'"),
            document.fonts.load("bold 44px 'Plus Jakarta Sans'")
          ]);
          await document.fonts.ready;
        }
      } catch (e) {}

      const [img, logoImg] = await Promise.all([
        new Promise((resolve, reject) => {
          const im = new Image();
          im.onload = () => resolve(im);
          im.onerror = reject;
          im.src = src;
        }),
        loadIGLogoImage()
      ]);

      if (style === 'dark') return drawIGDark(img, caption, logoImg);
      if (style === 'polaroid') return drawIGPolaroid(img, caption, logoImg);
      if (style === 'story') return drawIGStory(img, caption, logoImg);
      return drawIGClassic(img, caption, logoImg);
    }

    function getIGCaptionFallback() {
      const preset = IG_CAPTION_PRESETS[currentIGCategory];
      return (preset && preset.captions[0]) || `Momen seru bareng ${IG_DISPLAY_NAME} 📸`;
    }

    /* ---------- IG modal controls: style picker, caption categories, live preview ---------- */
    function buildIGStyleButtons() {
      igStyleBtns.innerHTML = '';
      Object.entries(IG_FRAME_STYLES).forEach(([id, cfg], idx) => {
        const btn = document.createElement('button');
        btn.dataset.igstyle = id;
        btn.onclick = () => selectIGStyle(id);
        btn.className = 'p-3 rounded-xl border-2 transition text-left flex flex-col gap-1 bg-[#ffffff] border-[var(--line)] hover:border-[var(--crimson-soft)]/50 card-rise-in' + (id === currentIGStyle ? ' active-choice' : '');
        btn.style.setProperty('--i', idx);
        btn.innerHTML = `<span class="flex items-center gap-2 text-sm font-bold text-[#241f16]"><i class="${cfg.icon} text-[var(--crimson-soft)]"></i>${cfg.label}</span><span class="text-[10px] text-[#6b6152] leading-snug">${cfg.desc}</span>`;
        igStyleBtns.appendChild(btn);
        attachRipple(btn);
      });
    }

    function selectIGStyle(id) {
      currentIGStyle = id;
      document.querySelectorAll('#ig-style-btns button').forEach(b => b.classList.toggle('active-choice', b.dataset.igstyle === id));
      updateIGSummary();
      refreshIGPreview();
    }

    function buildIGCategoryTabs() {
      igCategoryTabs.innerHTML = '';
      Object.entries(IG_CAPTION_PRESETS).forEach(([id, cfg]) => {
        const btn = document.createElement('button');
        btn.dataset.igcat = id;
        btn.onclick = () => selectIGCategory(id);
        btn.className = 'ripple-btn px-3.5 py-1.5 rounded-full text-xs font-semibold transition' + (id === currentIGCategory ? ' mode-active' : '');
        btn.innerHTML = `${cfg.emoji} ${cfg.label}`;
        igCategoryTabs.appendChild(btn);
        attachRipple(btn);
      });
    }

    function selectIGCategory(id) {
      currentIGCategory = id;
      document.querySelectorAll('#ig-category-tabs button').forEach(b => b.classList.toggle('mode-active', b.dataset.igcat === id));
      buildIGCaptionChips();
      updateIGSummary();
    }

    function buildIGCaptionChips() {
      igCaptionChips.innerHTML = '';
      const preset = IG_CAPTION_PRESETS[currentIGCategory];
      if (!preset) return;
      const current = (igCaptionInput.value || '').trim();
      preset.captions.forEach(text => {
        const chip = document.createElement('button');
        chip.dataset.captionText = text;
        chip.className = 'ig-chip px-3.5 py-2.5 rounded-xl bg-[#ffffff] border border-[var(--line)] hover:border-[var(--brass)]/50 text-[13px] leading-snug text-[#241f16] transition ripple-btn' + (text === current ? ' selected' : '');
        chip.innerHTML = `<span class="ig-chip-check"><i class="fa-solid fa-check text-[9px]"></i></span><span class="pt-px">${text}</span>`;
        chip.onclick = () => applyIGCaption(text);
        igCaptionChips.appendChild(chip);
        attachRipple(chip);
      });
    }

    function refreshIGChipSelection() {
      const current = (igCaptionInput.value || '').trim();
      document.querySelectorAll('#ig-caption-chips .ig-chip').forEach(chip => {
        chip.classList.toggle('selected', chip.dataset.captionText === current);
      });
    }

    function applyIGCaption(text) {
      igCaptionInput.value = text;
      currentIGCaption = text;
      refreshIGChipSelection();
      refreshIGPreview();
    }

    let igCaptionDebounce = null;
    function onIGCaptionInput() {
      currentIGCaption = igCaptionInput.value;
      refreshIGChipSelection();
      clearTimeout(igCaptionDebounce);
      igCaptionDebounce = setTimeout(refreshIGPreview, 400);
    }

    function updateIGSummary() {
      const styleCfg = IG_FRAME_STYLES[currentIGStyle] || IG_FRAME_STYLES.classic;
      const catCfg = IG_CAPTION_PRESETS[currentIGCategory] || IG_CAPTION_PRESETS.teman;
      igSummaryLabel.textContent = `${styleCfg.label} · Untuk ${catCfg.label}`;
    }

    function openIGModal() {
      if (favoriteIndex === null || !capturedImages[favoriteIndex]) {
        showToast('Pilih dulu 1 foto favorit ya (klik salah satu foto di atas)!', '⭐');
        return;
      }
      if (!igCaptionInput.value.trim()) {
        const fallback = getIGCaptionFallback();
        igCaptionInput.value = fallback;
        currentIGCaption = fallback;
      }
      buildIGStyleButtons();
      buildIGCategoryTabs();
      buildIGCaptionChips();
      igModal.classList.remove('hidden');
      igModal.classList.add('flex');
      document.body.style.overflow = 'hidden';
      clearIdleTimer();
      refreshIGPreview();
    }

    function closeIGModal() {
      igModal.classList.add('hidden');
      igModal.classList.remove('flex');
      document.body.style.overflow = '';
      armIdleTimer();
    }

    let igPreviewToken = 0;
    async function refreshIGPreview() {
      if (favoriteIndex === null || !capturedImages[favoriteIndex]) return;
      const myToken = ++igPreviewToken;
      igPreviewImg.classList.add('opacity-0');
      igPreviewLoading.classList.remove('hidden');
      try {
        const caption = igCaptionInput.value.trim() || getIGCaptionFallback();
        const dataUrl = await renderIGPostDataUrl(favoriteIndex, currentIGStyle, caption);
        if (myToken !== igPreviewToken) return;
        igPreviewImg.src = dataUrl;
        igPreviewImg.classList.remove('opacity-0');
        igPreviewLoading.classList.add('hidden');
      } catch (e) {
        igPreviewLoading.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-red-400"></i>';
      }
    }

    async function exportSingleIGPost(triggerDownload = true) {
      if (favoriteIndex === null || !capturedImages[favoriteIndex]) {
        showToast('Pilih dulu 1 foto favorit ya!', '⭐');
        return;
      }
      const caption = igCaptionInput.value.trim() || getIGCaptionFallback();
      currentIGCaption = caption;
      const dataUrl = await renderIGPostDataUrl(favoriteIndex, currentIGStyle, caption);
      const filename = `jepretin-igpost-${currentIGStyle}-${Date.now()}.png`;
      if (triggerDownload) {
        const a = document.createElement('a');
        a.download = filename;
        a.href = dataUrl;
        a.click();
      }

      lastExports.ig = { dataUrl, filename, mime: 'image/png', text: 'Foto favorit gaya IG Post dari Jepretin' };
      if (window.JepretinAuth) JepretinAuth.addHistoryEntry(dataUrl, filename, 'ig', currentFrame);
      celebrateOutput();
      if (triggerDownload) {
        showToast('Foto favorit ala IG Post berhasil diunduh!', '📱');
      } else {
        showToast('Tersimpan ke Galeri!', '💾');
      }
    }

    // Simpan IG Post ke Galeri tanpa memicu download browser.
    function saveIGPostToGallery() {
      exportSingleIGPost(false);
    }

    /* ---------- Frame renderers for the animated GIF ----------
       These reuse the exact same layout/decoration logic as the static
       "Download Foto" strip (buildPrintStripDataUrl) and grid export
       (exportPhotoGrid), so the GIF always shows the FULL layout the user
       picked — e.g. selectedLayout "strip4" → all 4 poses, "strip6" → all
       6 poses, "grid4" → the 2x2 grid — with the chosen frame theme baked
       in. `imgs` is one image PER SLOT for this instant in time — every
       slot's burst frame is drawn at the same moment, so all poses move
       together instead of one at a time. */
    function buildStripFrameCanvas(imgs) {
      const N = imgs.length;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const photoW = 1200, photoH = 900, pad = 100, gap = 50, footerH = 320;
      const W = photoW + (pad * 2), H = (pad * 2) + (photoH * N) + (gap * (N - 1)) + footerH;
      canvas.width = W; canvas.height = H;

      applyFrameDesignToCanvas(ctx, W, H, photoW, photoH, pad, gap);
      const shapeCfg = FRAME_THEMES[currentFrame] || FRAME_THEMES.nature;

      imgs.forEach((img, idx) => {
        const destX = pad;
        const destY = pad + idx * (photoH + gap);
        const imgRatio = img.width / img.height;
        const targetRatio = photoW / photoH;
        let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;
        if (imgRatio > targetRatio) { srcW = img.height * targetRatio; srcX = (img.width - srcW) / 2; }
        else { srcH = img.width / targetRatio; srcY = (img.height - srcH) / 2; }
        drawPhotoIntoShape(ctx, img, srcX, srcY, srcW, srcH, destX, destY, photoW, photoH, shapeCfg.photoShape || 'rect', shapeCfg.accent);
      });

      drawThemeStickersOnCanvas(ctx, W, H, photoW, photoH, pad, gap);
      drawPlacedStickersOnCanvas(ctx, W, H);
      drawThemeStamp(ctx, shapeCfg, pad + photoW - 78, pad + 78);

      return canvas;
    }

    function buildGridFrameCanvas(imgs) {
      const N = imgs.length;
      const cols = 2, rows = Math.ceil(N / cols);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const cell = 900, gap = 30, pad = 50, footerH = 220;
      const W = cell * cols + gap * (cols - 1) + pad * 2;
      const H = cell * rows + gap * (rows - 1) + pad * 2 + footerH;
      canvas.width = W; canvas.height = H;

      const cfg = FRAME_THEMES[currentFrame] || FRAME_THEMES.nature;
      ctx.fillStyle = cfg.stampBg || '#111111';
      ctx.fillRect(0, 0, W, H);

      imgs.forEach((img, idx) => {
        const col = idx % cols, row = Math.floor(idx / cols);
        const destX = pad + col * (cell + gap);
        const destY = pad + row * (cell + gap);
        const imgRatio = img.width / img.height;
        let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;
        if (imgRatio > 1) { srcW = img.height; srcX = (img.width - srcW) / 2; }
        else { srcH = img.width; srcY = (img.height - srcH) / 2; }
        ctx.save();
        ctx.filter = filterCanvasMap[currentFilter] || 'none';
        ctx.drawImage(img, srcX, srcY, srcW, srcH, destX, destY, cell, cell);
        ctx.restore();
        ctx.strokeStyle = cfg.accent || '#c2ac7c';
        ctx.lineWidth = 6;
        ctx.strokeRect(destX, destY, cell, cell);
      });

      drawPlacedStickersOnCanvas(ctx, W, H);

      const footerY = pad + rows * cell + (rows - 1) * gap + 80;
      ctx.textAlign = 'center';
      ctx.fillStyle = cfg.stampFg || '#f5f5f5';
      ctx.font = "bold 54px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText('JEPRETIN', W / 2, footerY);
      ctx.font = "20px 'Fira Code', monospace";
      ctx.globalAlpha = 0.55;
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      ctx.fillText(`#${sessionCode || '—'} · ${timeStr}`, W / 2, footerY + 46);
      ctx.globalAlpha = 1;

      return canvas;
    }

    /* Scales a canvas down before it goes into gifshot — the strip/grid canvases are
       rendered at print resolution, and encoding ~30+ full-res frames would be very
       slow, so we shrink each frame first (cheap) instead of asking gifshot to do it
       internally for every frame. */
    function downscaleCanvasDataUrl(canvas, maxWidth) {
      if (canvas.width <= maxWidth) return canvas.toDataURL('image/png');
      const scale = maxWidth / canvas.width;
      const small = document.createElement('canvas');
      small.width = Math.round(canvas.width * scale);
      small.height = Math.round(canvas.height * scale);
      const ctx = small.getContext('2d');
      ctx.drawImage(canvas, 0, 0, small.width, small.height);
      return small.toDataURL('image/png');
    }

    async function exportAnimatedGIF(triggerDownload = true) {
      if (capturedImages.length < POSE_COUNT) return;
      gifBtnLabel.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Membuat GIF...</span>';
      gifProgressTrack.classList.remove('hidden');
      gifBtn.disabled = true;
      gifShareBtn.disabled = true;
      gifSaveBtn.disabled = true;

      try {
        // Hero photo per pose — used as a fallback for any slot missing burst data.
        const heroImgs = await Promise.all(capturedImages.map(src => loadImageEl(src)));
        const isGrid = (LAYOUT_PRESETS[selectedLayout] || {}).exportMode === 'grid';
        const buildFrame = isGrid ? buildGridFrameCanvas : buildStripFrameCanvas;
        const gifWidth = 900;

        // Preload every pose's burst so we can pull "what pose N looked like at
        // instant J" for every pose at once — this is what makes every slot move
        // together instead of one pose animating at a time.
        const burstImgsAll = await Promise.all(
          heroImgs.map((hero, poseIdx) => {
            const burst = capturedBursts[poseIdx];
            if (burst && burst.length) return Promise.all(burst.map(src => loadImageEl(src)));
            return Promise.resolve(null); // no burst captured for this pose (fallback below)
          })
        );
        const frameCount = Math.max(...burstImgsAll.map(b => b ? b.length : 0), 1);

        // Play the burst forward, then backward (skipping the two shared end frames)
        // so the loop plays out fully in both directions — noticeably longer and
        // smoother than a single forward pass, without needing to re-record anything.
        const order = [];
        for (let j = 0; j < frameCount; j++) order.push(j);
        for (let j = frameCount - 2; j > 0; j--) order.push(j);

        const frameImages = [];
        for (const j of order) {
          const imgsAtFrame = heroImgs.map((hero, poseIdx) => {
            const burst = burstImgsAll[poseIdx];
            if (!burst || !burst.length) return hero;
            return burst[Math.min(j, burst.length - 1)];
          });
          const canvas = buildFrame(imgsAtFrame);
          frameImages.push(downscaleCanvasDataUrl(canvas, gifWidth));
        }

        const refCanvas = buildFrame(heroImgs);
        const gifHeight = Math.round(gifWidth * (refCanvas.height / refCanvas.width));

        gifshot.createGIF({
          images: frameImages,
          interval: BURST_INTERVAL_MS / 1000,
          gifWidth,
          gifHeight,
          numFrames: frameImages.length
        }, function (obj) {
          if (!obj.error) {
            const filename = `jepretin-animated-${currentFrame}-${Date.now()}.gif`;
            if (triggerDownload) {
              const a = document.createElement('a');
              a.download = filename;
              a.href = obj.image;
              a.click();
            }

            lastExports.gif = { dataUrl: obj.image, filename, mime: 'image/gif', text: 'GIF animasi berbingkai dari JEPRETIN' };
            if (window.JepretinAuth) JepretinAuth.addHistoryEntry(obj.image, filename, 'gif', currentFrame);
            celebrateOutput();
            if (triggerDownload) {
              showToast('GIF animasi berbingkai berhasil diunduh!', '🎞️');
            } else {
              showToast('Tersimpan ke Galeri!', '💾');
            }
            gifShareBtn.disabled = false;
          } else {
            showToast('Gagal membuat GIF, coba lagi ya.', '⚠️');
          }
          gifBtn.disabled = false;
          gifSaveBtn.disabled = false;
          gifProgressTrack.classList.add('hidden');
          gifBtnLabel.innerHTML = '<i class="fa-solid fa-film"></i><span>Download GIF Animasi</span>';
        });
      } catch (e) {
        showToast('Gagal membuat GIF, coba lagi ya.', '⚠️');
        gifBtn.disabled = false;
        gifSaveBtn.disabled = false;
        gifProgressTrack.classList.add('hidden');
        gifBtnLabel.innerHTML = '<i class="fa-solid fa-film"></i><span>Download GIF Animasi</span>';
      }
    }

    // Simpan GIF ke Galeri tanpa memicu download browser.
    function saveGifToGallery() {
      exportAnimatedGIF(false);
    }

    // Camera permission is now requested only after the person picks a layout on the
    // welcome screen (see chooseLayout()) — a real kiosk doesn't grab the camera before
    // someone has actually walked up and tapped "start".