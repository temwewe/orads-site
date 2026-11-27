// Разовая правка блока в уроке «Справочник O-RADS US». Первая версия (25.11) добавила в пропуск s, i, r;
// потом — личный ключ ученика t; эта (26.11) — шкала загрузки на экране «Открываем справочник». Запуск: workflow «Правка урока справочника» (DRY=1 — только показать).
// REVERT=1 — убрать правку. Проверяет, что урок из школы «Тимофеева онлайн».
const API = 'https://app.xl.ru/api/v1';
const LESSON_ID = 'MsUmf5w010u7GnQxUhiGHg';
const SCHOOL_ID = 'pLFufPHshk2yzbWIQTb53w';
const TOKEN = process.env.API_TOKEN;
if (!TOKEN) throw new Error('Нет секрета API_TOKEN');
async function api(method, path, body) {
  const r = await fetch(API + path, { method, headers: { Accept: 'application/json', Authorization: 'Bearer ' + TOKEN, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { throw new Error(`${method} ${path}: ${r.status} ${t.slice(0, 200)}`); }
  if (!r.ok || j.success === false) throw new Error(`${method} ${path}: ${r.status} ${JSON.stringify(j.errors || j).slice(0, 300)}`);
  return j.body;
}
// Замены без двойных кавычек, переносов строк, < > & — чтобы они одинаково совпадали в HTML и в JSON дерева редактора.
const PAIRS = [
  // 26.11: шкала загрузки на экране «Открываем справочник» (вариант Б: только заголовок, шкала и проценты справа).
  // В уроке шкала проходит 0–20%, дальше сайт продолжает с 20%.
  ["c.appendChild(ozEl('div', '', 'Открываем справочник')); c.appendChild(ozEl('div', 'font-weight:500;font-size:14px;color:#86868b', 'Проверяем подписку…'));",
   "c.appendChild(ozEl('div', '', 'Проверяем подписку')); var pr = ozEl('div', 'display:flex;align-items:center;gap:10px;margin-top:8px'), pb = ozEl('div', 'width:200px;height:4px;border-radius:2px;background:#EADCDD;overflow:hidden'), pf = ozEl('div', 'height:100%;width:0;background:#752b2d;border-radius:2px'), pt = ozEl('div', 'font-weight:700;font-size:13px;color:#752b2d;min-width:36px;text-align:right;font-variant-numeric:tabular-nums', '0%'); pb.appendChild(pf); pr.appendChild(pb); pr.appendChild(pt); c.appendChild(pr); var sh = 0, s0 = Date.now(); function tick() { var tg = Math.max(ozCover.v || 0, 18 * (1 - Math.exp(-(Date.now() - s0) / 900))); sh += (tg - sh) * 0.12; pf.style.width = sh.toFixed(2) + '%'; pt.textContent = Math.floor(sh) + '%'; if (c.isConnected) requestAnimationFrame(tick); } requestAnimationFrame(tick);"],
  ["if (auto) location.replace(u);", "if (auto) { ozCover.v = 20; setTimeout(function () { location.replace(u); }, 250); }"],
];
const count = (s, x) => s.split(x).length - 1;
const F = ['designSettings', 'designSettingsPublished', 'designHTMLPublished'];
const lesson = await api('GET', `/course-item/${LESSON_ID}?fields=${encodeURIComponent('{id,designConcurrencyStamp,' + F.join(',') + ',course{schoolId}}')}`);
if (!lesson.course || lesson.course.schoolId !== SCHOOL_ID) throw new Error('Урок не из школы «Тимофеева онлайн» — ничего не сохраняю');
const revert = !!process.env.REVERT;
const out = {};
for (const f of F) {
  let s = lesson[f] || '';
  for (const [a, b] of PAIRS) {
    const [from, to] = revert ? [b, a] : [a, b];
    const n = count(s, from);
    console.log(`${f}: «${from.slice(0, 40)}…» найдено ${n}`);
    if (!revert && count(s, b) > 0) throw new Error(f + ': правка уже есть');
    if (n !== 1) throw new Error(f + ': ожидалось ровно 1 совпадение');
    s = s.replace(from, to);
  }
  out[f] = s;
}
// Показать изменённый кусок (без метки с ключом)
const h = out.designHTMLPublished, at = h.indexOf('function ozMe');
console.log('--- фрагмент ---\n' + h.slice(Math.max(0, at - 200), at + 1400).replace(/@@ORADS:[A-Za-z0-9_-]+@@/g, '@@ORADS:…@@'));
if (process.env.DRY) { console.log('DRY: ничего не сохранено'); process.exit(0); }
await api('PUT', '/course-item', { id: LESSON_ID, designConcurrencyStamp: lesson.designConcurrencyStamp,
  designSettings: { value: out.designSettings }, designSettingsPublished: { value: out.designSettingsPublished },
  designHTMLPublished: { value: out.designHTMLPublished }, theoryVisible: { value: true } });
const after = await api('GET', `/course-item/${LESSON_ID}?fields=${encodeURIComponent('{designHTMLPublished}')}`);
if ((after.designHTMLPublished || '') !== out.designHTMLPublished) throw new Error('Урок сохранился не так, как ожидалось');
console.log(revert ? 'Правка убрана' : 'Урок обновлён');
