// Service worker minimal — cuma nge-cache file lokal (HTML/CSS/JS/gambar) biar app-shell
// tetap kebuka walau koneksi lagi jelek, dan biar syarat "installable" PWA di Chrome/Android
// kepenuhi (butuh service worker aktif). Script dari CDN (Tailwind, FontAwesome, gifshot, dll)
// sengaja dibiarkan lewat langsung ke jaringan, bukan di-cache di sini.
const CACHE_NAME = 'jepretin-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './auth.js',
  './splash.js',
  './manifest.json',
  './jepretin-icon.png',
  './jepretin-pp.png',
  './bg-photo.jpg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Cuma tangani request same-origin (file lokal project ini) — biarkan semua request
  // ke domain lain (CDN, dll) lewat langsung tanpa campur tangan cache.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
