const CACHE = 'mb-cache-v5';
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/logo.svg",
  "./assets/products.json",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/favicon-32.png",
  "./scripts/app.js",
  "./assets/hero.jpg",
  "./assets/img/hortifruti/01.jpg",
  "./assets/img/hortifruti/02.jpg",
  "./assets/img/hortifruti/03.jpg",
  "./assets/img/hortifruti/04.jpg",
  "./assets/img/hortifruti/05.jpg",
  "./assets/img/hortifruti/06.jpg",
  "./assets/img/hortifruti/07.jpg",
  "./assets/img/hortifruti/08.jpg",
  "./assets/img/hortifruti/09.jpg",
  "./assets/img/hortifruti/10.jpg",
  "./assets/img/frios/01.jpg",
  "./assets/img/frios/02.jpg",
  "./assets/img/frios/03.jpg",
  "./assets/img/frios/04.jpg",
  "./assets/img/frios/05.jpg",
  "./assets/img/frios/06.jpg",
  "./assets/img/frios/07.jpg",
  "./assets/img/frios/08.jpg",
  "./assets/img/frios/09.jpg",
  "./assets/img/frios/10.jpg",
  "./assets/img/acougue/01.jpg",
  "./assets/img/acougue/02.jpg",
  "./assets/img/acougue/03.jpg",
  "./assets/img/acougue/04.jpg",
  "./assets/img/acougue/05.jpg",
  "./assets/img/acougue/06.jpg",
  "./assets/img/acougue/07.jpg",
  "./assets/img/acougue/08.jpg",
  "./assets/img/acougue/09.jpg",
  "./assets/img/acougue/10.jpg",
  "./assets/img/mercearia/01.jpg",
  "./assets/img/mercearia/02.jpg",
  "./assets/img/mercearia/03.jpg",
  "./assets/img/mercearia/04.jpg",
  "./assets/img/mercearia/05.jpg",
  "./assets/img/mercearia/06.jpg",
  "./assets/img/mercearia/07.jpg",
  "./assets/img/mercearia/08.jpg",
  "./assets/img/mercearia/09.jpg",
  "./assets/img/mercearia/10.jpg",
  "./assets/img/bebidas/01.jpg",
  "./assets/img/bebidas/02.jpg",
  "./assets/img/bebidas/03.jpg",
  "./assets/img/bebidas/04.jpg",
  "./assets/img/bebidas/05.jpg",
  "./assets/img/bebidas/06.jpg",
  "./assets/img/bebidas/07.jpg",
  "./assets/img/bebidas/08.jpg",
  "./assets/img/bebidas/09.jpg",
  "./assets/img/bebidas/10.jpg"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k!==CACHE ? caches.delete(k) : null))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request).then(resp => {
    const copy = resp.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return resp;
  }).catch(() => caches.match('./index.html'))));
});