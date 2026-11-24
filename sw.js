// Работа справочника без сети.
// Оболочка сайта: сначала сеть, без сети — сохранённая копия.
// Картинки и шрифты: сохраняем при первом показе.
// Сам справочник (ответ сервера) хранится не здесь, а в памяти страницы (localStorage) вместе с датой проверки подписки.
const SHELL = 'orads-shell-v21';
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

  // Страница и файлы сайта: сеть; если есть копия и сеть не ответила за 4 секунды — копия.
  if (url.origin === location.origin) {
    // no-cache: GitHub отдаёт файлы с кэшем на 10 минут — всегда сверяемся с сервером, чтобы обновления доходили сразу.
    const net = fetch(req.mode === 'navigate' ? new Request(url.href, { cache: 'no-cache', credentials: 'same-origin' }) : new Request(req, { cache: 'no-cache' }))
      .then((r) => {
        if (r.ok) { const copy = r.clone(); caches.open(SHELL).then((c) => c.put(req, copy)); }
        return r;
      });
    net.catch(() => {});
    const cached = caches.match(req, { ignoreSearch: true }).then((m) =>
      m || (req.mode === 'navigate'
        ? caches.match('./index.html', { ignoreSearch: true }).then((x) => x || caches.match('./', { ignoreSearch: true }))
        : undefined));
    e.respondWith(
      cached.then((c) => {
        if (c) {
          const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000));
          return Promise.race([net, timeout]).then((r) => (r.ok ? r : c)).catch(() => c);
        }
        return net.catch(() => offline(req));
      })
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

// Никогда не отдаём пустой ответ: без копии и без сети — понятная страница с кнопкой повтора.
function offline(req) {
  if (req.mode !== 'navigate') return new Response('', { status: 504 });
  const html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>Справочник O-RADS US</title><body style="margin:0;font:16px/1.4 -apple-system,system-ui,sans-serif;background:#F5F5F7;color:#1d1d1f;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center">'
    + '<div style="padding:24px;max-width:340px"><img src="icon-192.png" width="72" height="72" style="border-radius:18px" alt="">'
    + '<h2 style="margin:16px 0 8px">Нет связи с сервером</h2><p style="color:#6e6e73;margin:0 0 20px">Проверьте интернет или попробуйте через Wi‑Fi.</p>'
    + '<button onclick="location.reload()" style="border:0;border-radius:14px;padding:14px 22px;background:#6B1F2A;color:#fff;font:600 16px system-ui">Повторить</button></div>';
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
