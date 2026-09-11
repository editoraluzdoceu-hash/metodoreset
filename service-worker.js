const CACHE_NAME = 'metodo-reset-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

// Instala e faz cache dos arquivos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Remove caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estratégia: cache-first para assets locais, network-first para navegação, com fallback offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Não cachear requisições de analytics ou externas não essenciais, exceto fonts
  const isExternal = url.origin !== self.location.origin;
  const isFont = url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('fonts.googleapis.com');
  
  if (isExternal && !isFont) {
    // Para externos não-font, tenta rede e falha silenciosamente
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Se é navegação (html), tenta rede primeiro
      if (event.request.mode === 'navigate') {
        return fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached || caches.match('./index.html'));
      }

      // Para outros assets, cache-first com revalidação
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
