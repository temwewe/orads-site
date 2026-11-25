// Разовая правка урока «Справочник O-RADS US» (решение Артёма 25.11: урок — только вход):
// 1) убирает загрузчик копии справочника (lesson-copy.mjs), 2) заменяет карточку #ozApp на новую:
// «Справочник O-RADS US» + кнопка «Открыть справочник» + как поставить на телефон.
// DRY=1 — только показать. Проверяет школу «Тимофеева онлайн».
const API = 'https://app.xl.ru/api/v1';
const LESSON_ID = 'MsUmf5w010u7GnQxUhiGHg';
const SCHOOL_ID = 'pLFufPHshk2yzbWIQTb53w';
const EL = 'e-_' + LESSON_ID + '-2';
const TOKEN = process.env.API_TOKEN;
if (!TOKEN) throw new Error('Нет секрета API_TOKEN');
async function api(method, path, body) {
  const r = await fetch(API + path, { method, headers: { Accept: 'application/json', Authorization: 'Bearer ' + TOKEN, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { throw new Error(`${method} ${path}: ${r.status} ${t.slice(0, 200)}`); }
  if (!r.ok || j.success === false) throw new Error(`${method} ${path}: ${r.status} ${JSON.stringify(j.errors || j).slice(0, 300)}`);
  return j.body;
}
const F = ['designSettings', 'designSettingsPublished', 'designHTMLPublished'];
const L = await api('GET', `/course-item/${LESSON_ID}?fields=${encodeURIComponent('{id,designConcurrencyStamp,' + F.join(',') + ',course{schoolId}}')}`);
if (!L.course || L.course.schoolId !== SCHOOL_ID) throw new Error('Урок не из школы «Тимофеева онлайн» — ничего не сохраняю');
const mark = (/@@ORADS:[A-Za-z0-9_-]+@@/.exec(L.designHTMLPublished) || [])[0];
if (!mark) throw new Error('Нет метки в уроке');

const CARD = "<div id=\"ozApp\" style=\"display:none;margin:0 0 14px;padding:18px 18px 16px;border-radius:18px;background:#f6eeee;font:15px/1.45 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:#2a1a1b\"><div style=\"font-weight:700;font-size:18px;margin:0 0 6px\">Справочник O-RADS US</div><div style=\"color:#6b5b5c\">Справочник открывается на отдельном сайте. Поставьте его значком на экран телефона — тогда он будет открываться как приложение и работать без интернета до конца подписки.</div><a id=\"ozAppBtn\" href=\"#\" style=\"display:block;margin-top:14px;padding:14px;border-radius:14px;background:#752b2d;color:#fff;text-align:center;text-decoration:none;font-weight:600;font-size:16px\">Открыть справочник</a><details style=\"margin-top:12px;color:#4a3a3b\"><summary style=\"cursor:pointer;font-weight:600;color:#752b2d\">Как поставить на телефон</summary><div style=\"margin-top:8px\"><b>iPhone (Safari):</b> откройте справочник → кнопка «Поделиться» (квадрат со стрелкой) → «На экран \"Домой\"» → «Добавить».<br><b>Android (Chrome):</b> откройте справочник → меню ⋮ → «Установить приложение» или «Добавить на гл. экран».<br><span style=\"color:#6b5b5c\">В других браузерах: вкладка «Профиль» в справочнике → «Установить на телефон».</span></div></details></div>";
const LOADER_START = '<style>\n/* В уроке справочник встроен';
function fix(s, label) {
  const a = s.indexOf(LOADER_START);
  if (a < 0) throw new Error(label + ': не нашёл загрузчик');
  let t = s.slice(0, a).replace(/\s+$/, '');
  const c0 = t.indexOf('<div id="ozApp"');
  if (c0 < 0 || t.indexOf('<div id="ozApp"', c0 + 1) >= 0) throw new Error(label + ': карточка #ozApp не найдена или их несколько');
  const btn = t.indexOf('</a></div>', c0);
  if (btn < 0) throw new Error(label + ': не нашёл конец карточки');
  const old = t.slice(c0, btn + 10);
  console.log(label + ': старая карточка ' + old.length + ' симв., загрузчик ' + (s.length - a) + ' симв.');
  return t.slice(0, c0) + CARD + t.slice(btn + 10);
}
function walk(node, fn) { if (!node || typeof node !== 'object') return; fn(node); for (const v of Object.values(node)) if (v && typeof v === 'object') walk(v, fn); }
const out = {};
let el = null;
for (const f of ['designSettings', 'designSettingsPublished']) {
  const tree = JSON.parse(L[f]); let hit = 0;
  walk(tree, (n) => { if (n.id !== EL) return; const before = n.html; if (typeof before !== 'string') throw new Error(f + ': нет поля html'); n.html = fix(before, f); hit++; if (f === 'designSettingsPublished') el = { before, after: n.html }; });
  if (hit !== 1) throw new Error(f + ': элемент найден ' + hit + ' раз');
  out[f] = JSON.stringify(tree);
}
const H = L.designHTMLPublished, at = H.indexOf(el.before);
if (at < 0) throw new Error('designHTMLPublished: содержимое элемента не совпало с деревом — ничего не сохраняю');
out.designHTMLPublished = H.slice(0, at) + el.after + H.slice(at + el.before.length);
if (!out.designHTMLPublished.includes(mark)) throw new Error('Пропала метка');
console.log('designHTMLPublished: было ' + H.length + ', станет ' + out.designHTMLPublished.length);
if (process.env.DRY) { console.log('DRY: ничего не сохранено'); process.exit(0); }
await api('PUT', '/course-item', { id: LESSON_ID, designConcurrencyStamp: L.designConcurrencyStamp,
  designSettings: { value: out.designSettings }, designSettingsPublished: { value: out.designSettingsPublished },
  designHTMLPublished: { value: out.designHTMLPublished }, theoryVisible: { value: true } });
const after = await api('GET', `/course-item/${LESSON_ID}?fields=${encodeURIComponent('{designHTMLPublished}')}`);
if ((after.designHTMLPublished || '') !== out.designHTMLPublished) throw new Error('Урок сохранился не так, как ожидалось');
console.log('Урок обновлён');
