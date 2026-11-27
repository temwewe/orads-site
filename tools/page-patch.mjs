// Разовая правка страницы сайта школы (по умолчанию store.timofeeva-online.ru/orads-pay).
// Меняет строки в designSettings, designSettingsPublished и designHTMLPublished — так правка не пропадёт,
// если кто-то потом опубликует страницу из редактора. Проверяет, что страница из школы «Тимофеева онлайн».
// DRY=1 — только показать; REVERT=1 — вернуть как было.
const API = 'https://app.xl.ru/api/v1';
const PAGE_ID = process.env.PAGE_ID || 'dluhEommI06xTnQ_vzhnKQ';
const SCHOOL_ID = 'pLFufPHshk2yzbWIQTb53w';
const TOKEN = process.env.API_TOKEN;
if (!TOKEN) throw new Error('Нет секрета API_TOKEN');
async function api(method, path, body) {
  const r = await fetch(API + path, { method, headers: { Accept: 'application/json', Authorization: 'Bearer ' + TOKEN, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { throw new Error(`${method} ${path}: ${r.status} ${t.slice(0, 200)}`); }
  if (!r.ok || j.success === false) throw new Error(`${method} ${path}: ${r.status} ${JSON.stringify(j.errors || j).slice(0, 300)}`);
  return j.body;
}
// 27.11: цена на странице подписки — 249 ₽, как в товаре (было 990 ₽).
const PAIRS = [
  ['990 ₽ / месяц', '249 ₽ / месяц'],
  ['990 ₽ в месяц, продление автоматическое.', '249 ₽ в месяц, продление автоматическое.'],
];
const count = (s, x) => s.split(x).length - 1;
const F = ['designSettings', 'designSettingsPublished', 'designHTMLPublished'];
const page = await api('GET', `/site-page/${PAGE_ID}?fields=${encodeURIComponent('{id,url,designConcurrencyStamp,' + F.join(',') + ',site{schoolId}}')}`);
if (!page.site || page.site.schoolId !== SCHOOL_ID) throw new Error('Страница не из школы «Тимофеева онлайн» — ничего не сохраняю');
console.log('Страница', page.url);
const revert = !!process.env.REVERT;
const out = {};
for (const f of F) {
  let s = page[f] || '';
  for (const [a, b] of PAIRS) {
    const [from, to] = revert ? [b, a] : [a, b];
    const n = count(s, from);
    console.log(`${f}: «${from}» найдено ${n}`);
    if (n !== 1) throw new Error(f + ': ожидалось ровно 1 совпадение');
    s = s.replace(from, to);
  }
  out[f] = s;
}
if (process.env.DRY) { console.log('DRY: ничего не сохранено'); process.exit(0); }
await api('PUT', '/site-page', { id: PAGE_ID, designConcurrencyStamp: page.designConcurrencyStamp,
  designSettings: { value: out.designSettings }, designSettingsPublished: { value: out.designSettingsPublished },
  designHTMLPublished: { value: out.designHTMLPublished } });
const after = await api('GET', `/site-page/${PAGE_ID}?fields=${encodeURIComponent('{designHTMLPublished}')}`);
if ((after.designHTMLPublished || '') !== out.designHTMLPublished) throw new Error('Страница сохранилась не так, как ожидалось');
console.log(revert ? 'Правка убрана' : 'Страница обновлена');
