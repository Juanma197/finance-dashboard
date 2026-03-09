/**
 * Wealth OS - Service Worker
 * Caches core app files for offline loading.
 */
const CACHE_NAME = 'wealth-os-v2';

self.addEventListener('install', (event) => {
  const base = new URL('./', self.location.href).href;
  const urls = [
    base,
    base + 'index.html',
    base + 'style.css',
    base + 'script.js'
  ];
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urls)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension') || event.request.url.startsWith('https://cdn')) return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;
  const isApp = path.endsWith('.html') || path.endsWith('style.css') || path.endsWith('script.js') || path === '/' || path.endsWith('/');

  if (!isApp) return;

  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        return res;
      }).catch(() => caches.match('./index.html') || caches.match('./'))
    )
  );
});