// Service worker: Португальская грамматика
//
// Стратегия:
//  - Весь курс лежит внутри index.html (HTML+CSS+JS одним файлом), поэтому
//    документ отдаётся NETWORK-FIRST: у онлайн-пользователя всегда свежие
//    темы и задания, без ручного бампа версии кеша. Офлайн — откат на
//    последнюю успешно загруженную копию.
//  - Статика (шрифты, иконки, манифест) — CACHE-FIRST: мгновенный офлайн
//    и меньше сетевых запросов.
//
// CACHE_NAME НЕ надо бампать при изменении контента. Бампай только когда
// меняется сам список STATIC_ASSETS (добавил/переименовал шрифт или иконку)
// или содержимое одного из статических файлов (например manifest.json) —
// именно это заставляет сбросить старые статические файлы на activate.
const CACHE_NAME = 'portuguese-grammar-v2';

//  - Озвучка (assets/audio/*.mp3, Z6) — в precache НЕ кладётся: файлов будет
//    сотни. Кэшируется при первом прослушивании, в отдельный кэш: бамп
//    CACHE_NAME его не стирает. Заменил файл под тем же именем — бампни
//    AUDIO_CACHE (или дай новое имя).
const AUDIO_CACHE = 'portuguese-audio-v1';

const HTML_URLS = ['./', './index.html'];

const STATIC_ASSETS = [
  './manifest.json',
  './assets/fonts/golos-cyrillic.woff2',
  './assets/fonts/golos-latin.woff2',
  './assets/fonts/manrope-latin.woff2',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-192-maskable.png',
  './assets/icons/icon-512-maskable.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32.png',
  './assets/icons/favicon-16.png'
];

const ASSETS_TO_CACHE = HTML_URLS.concat(STATIC_ASSETS);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== AUDIO_CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isHtmlRequest(request) {
  if (request.mode === 'navigate') return true;
  const path = new URL(request.url).pathname;
  return path.endsWith('/') || path.endsWith('/index.html');
}

function isAudioRequest(request) {
  const url = new URL(request.url);
  return url.origin === self.location.origin && /\/assets\/audio\/[^/]+\.mp3$/.test(url.pathname);
}

// <audio> просит файл кусками (Range), а Cache API хранит только целые 200.
// Поэтому: целый файл — в кэш, а на Range-запрос отдаём 206 из него самого.
async function audioResponse(request) {
  const cache = await caches.open(AUDIO_CACHE);
  let full = await cache.match(request.url);
  if (!full) {
    full = await fetch(request.url);
    if (!full.ok) return full;
    await cache.put(request.url, full.clone());
  }
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
  if (!range) return full;
  const buf = await full.arrayBuffer();
  const size = buf.byteLength;
  let start = range[1] === '' ? Math.max(0, size - Number(range[2])) : Number(range[1]);
  let end = range[1] === '' || range[2] === '' ? size - 1 : Math.min(Number(range[2]), size - 1);
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  }
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
      'Content-Length': String(end - start + 1)
    }
  });
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const request = event.request;

  if (isAudioRequest(request)) {
    event.respondWith(audioResponse(request).catch(() => Response.error()));
    return;
  }

  if (isHtmlRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.ok && request.url.startsWith(self.location.origin)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
