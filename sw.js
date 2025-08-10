const CACHE = 'mb-cache-v3';
const ASSETS = [
  './','./index.html','./manifest.json','./assets/logo.svg','./assets/products.json',
  './assets/icons/icon-192.png','./assets/icons/icon-512.png','./assets/favicon-32.png','./scripts/app.js'
];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k!==CACHE ? caches.delete(k) : null))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request).then(resp => {
    const copy = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return resp;
  }).catch(() => caches.match('./index.html'))));
});