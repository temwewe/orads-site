// Работа справочника без сети.
// Оболочка сайта: сначала сеть, без сети — сохранённая копия.
// Картинки и шрифты: сохраняем при первом показе.
// Сам справочник (ответ сервера) хранится не здесь, а в памяти страницы (localStorage) вместе с датой проверки подписки.
const SHELL = 'orads-shell-v10';
const MEDIA = 'orads-media-v1';
const SHELL_FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== MEDIA).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Версия ключа — только сеть.
  if (url.origin === location.origin && url.pathname.endsWith('/version.json')) return;
  // Зашифрованный справочник с Prodamus не кэшируем: расшифрованная копия хранится в памяти страницы.
  if (url.hostname === 'con.xl.ru' && url.pathname.includes('/files/')) return;

  // Страница и файлы сайта: сеть, при ошибке — копия.
  if (url.origin === location.origin) {
    e.respondWith(
      // no-cache: GitHub отдаёт файлы с кэшем на 10 минут — всегда сверяемся с сервером, чтобы обновления доходили сразу.
      fetch(req.mode === 'navigate' ? new Request(url.href, { cache: 'no-cache', credentials: 'same-origin' }) : new Request(req, { cache: 'no-cache' }))
        .then((r) => {
          if (r.ok) caches.open(SHELL).then((c) => c.put(req, r.clone()));
          return r;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((m) => m || caches.match('./index.html')))
    );
    return;
  }

  // Картинки и шрифты с других адресов: копия, если есть, иначе сеть с сохранением.
  if (req.destination === 'image' || req.destination === 'font' || url.hostname.endsWith('fonts.googleapis.com')) {
    e.respondWith(
      caches.open(MEDIA).then((c) =>
        c.match(req).then((m) =>
          m ||
          fetch(req).then((r) => {
            if (r.ok || r.type === 'opaque') c.put(req, r.clone());
            return r;
          })
        )
      )
    );
  }
});

// Страница присылает список картинок справочника — сохраняем те, которых ещё нет.
self.addEventListener('message', (e) => {
  const list = e.data && e.data.precache;
  if (!Array.isArray(list)) return;
  e.waitUntil(caches.open(MEDIA).then(async (c) => {
    for (const u of list.slice(0, 500)) {
      try {
        if (await c.match(u)) continue;
        const r = await fetch(new Request(u, { mode: 'no-cors', credentials: 'omit' }));
        if (r.ok || r.type === 'opaque') await c.put(u, r);
      } catch (err) { /* нет сети — сохраним в следующий раз */ }
    }
  }));
});
