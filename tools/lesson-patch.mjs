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
  // 27.11: экран «Проверяем подписку» в уроке — живой бордовый фон как на сайте школы (и как экран загрузки справочника).
  ["background:#F5F5F7;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font:600 17px/1.3 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:#1d1d1f;",
   "background:#5a1015;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font:650 19px/1.3 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:#fff;overflow:hidden;"],
  ["st.textContent = '@keyframes ozR{0%{transform:scale(.55);opacity:.9;border-color:#752b2d}100%{transform:scale(1.6);opacity:0;border-color:#F4B6C2}}",
   "st.textContent = '@keyframes ozR{0%{transform:scale(.6);opacity:.75}100%{transform:scale(1.75);opacity:0}}#ozCov .oz-au i{position:absolute;display:block;inset:auto;border:0;border-radius:50%;opacity:1}#ozCov .oz-au i:nth-child(1){width:95vmax;height:95vmax;left:-35vmax;top:-30vmax;background:radial-gradient(closest-side,#c3262c,rgba(195,38,44,0));animation:ozA1 13s ease-in-out infinite alternate}#ozCov .oz-au i:nth-child(2){width:80vmax;height:80vmax;right:-30vmax;top:5vmax;background:radial-gradient(closest-side,#8e1a20,rgba(142,26,32,0));animation:ozA2 16s ease-in-out infinite alternate}#ozCov .oz-au i:nth-child(3){width:70vmax;height:70vmax;left:-10vmax;bottom:-30vmax;background:radial-gradient(closest-side,#d8333a,rgba(216,51,58,0));opacity:.85;animation:ozA3 11s ease-in-out infinite alternate}#ozCov .oz-au i:nth-child(4){width:60vmax;height:60vmax;right:-20vmax;bottom:-25vmax;background:radial-gradient(closest-side,rgba(28,3,5,.85),rgba(28,3,5,0));animation:ozA4 15s ease-in-out infinite alternate}#ozCov .oz-au i:nth-child(5){width:45vmax;height:45vmax;left:25vmax;top:20vmax;background:radial-gradient(closest-side,rgba(255,120,110,.45),rgba(255,120,110,0));animation:ozA5 9s ease-in-out infinite alternate}@keyframes ozA1{to{transform:translate(28vmax,18vmax) scale(1.15)}}@keyframes ozA2{to{transform:translate(-26vmax,22vmax) scale(.9)}}@keyframes ozA3{to{transform:translate(22vmax,-24vmax) scale(1.2)}}@keyframes ozA4{to{transform:translate(-20vmax,-28vmax) scale(1.1)}}@keyframes ozA5{to{transform:translate(-18vmax,14vmax) scale(1.3)}}"],
  ["#ozCov i{position:absolute;inset:0;border-radius:50%;border:2px solid #752b2d;",
   "#ozCov i{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(255,255,255,.7);"],
  ["c.appendChild(st); var e = ozEl('div', 'position:relative;width:120px;height:120px;display:grid;place-items:center;margin-bottom:18px');",
   "c.appendChild(st); var au = ozEl('div', 'position:absolute;inset:-20%;overflow:hidden;pointer-events:none;z-index:-1'); au.className = 'oz-au'; for (var q = 5; q--;) au.appendChild(document.createElement('i')); c.appendChild(au); var e = ozEl('div', 'position:relative;width:132px;height:132px;display:grid;place-items:center;margin-bottom:14px');"],
  ["'position:relative;width:64px;height:64px;border-radius:16px;box-shadow:0 6px 20px rgba(117,43,45,.25)'",
   "'position:relative;width:78px;height:78px;border-radius:21px;box-shadow:0 14px 44px rgba(20,0,2,.55),0 0 0 1.5px rgba(255,255,255,.55)'"],
  ["pb = ozEl('div', 'width:200px;height:4px;border-radius:2px;background:#EADCDD;overflow:hidden'), pf = ozEl('div', 'height:100%;width:0;background:#752b2d;border-radius:2px'), pt = ozEl('div', 'font-weight:700;font-size:13px;color:#752b2d;",
   "pb = ozEl('div', 'width:210px;height:4px;border-radius:2px;background:rgba(255,255,255,.22);overflow:hidden'), pf = ozEl('div', 'height:100%;width:0;background:#fff;border-radius:2px;box-shadow:0 0 10px rgba(255,255,255,.6)'), pt = ozEl('div', 'font-weight:700;font-size:13px;color:#fff;"],
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
