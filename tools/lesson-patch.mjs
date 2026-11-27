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
  // 27.11 (вечер): экран «Проверяем подписку» в уроке — «Эхограмма»: луч УЗИ-сектора на тёмном фоне (вариант 1).
  ["function ozCover() { if (document.getElementById('ozCov')) return; var c = ozEl('div', 'position:fixed;inset:0;z-index:2147483000;background:#F5F5F7;",
   "function ozScan(c) { var cv = document.createElement('canvas'); cv.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;z-index:-1'); c.appendChild(cv); var x = cv.getContext('2d'), D = Math.min(2, window.devicePixelRatio || 1), W = 0, H = 0, sp = [], T0 = Date.now(); for (var i = 1800; i--;) sp.push([Math.random(), Math.random(), Math.random()]); function rs() { W = innerWidth; H = innerHeight; cv.width = W * D; cv.height = H * D; x.setTransform(D, 0, 0, D, 0, 0); } rs(); addEventListener('resize', rs); function fr() { if (!c.isConnected) return; var t = Math.max(0, (Date.now() - T0) / 1000), cx = W / 2, cy = -H * 0.08, R = H * 1.12, a0 = Math.PI / 2 - 0.62, a1 = Math.PI / 2 + 0.62, sn = a1 - a0, sw = a0 + ((t * 0.55) % 1) * sn; x.fillStyle = '#0d0405'; x.fillRect(0, 0, W, H); x.save(); x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R, a0, a1); x.closePath(); x.clip(); var g = x.createRadialGradient(cx, cy, 0, cx, cy, R); g.addColorStop(0, '#3a1013'); g.addColorStop(1, '#140506'); x.fillStyle = g; x.fillRect(0, 0, W, H); for (var j = sp.length; j--;) { var s = sp[j], a = a0 + s[0] * sn, r = s[1] * R, d = ((sw - a) % sn + sn) % sn, f = Math.max(0, 1 - d / sn * 1.4); x.fillStyle = 'rgba(230,' + (150 + s[2] * 60 | 0) + ',' + (150 + s[2] * 50 | 0) + ',' + ((0.15 + 0.85 * f) * (0.25 + s[2] * 0.6)).toFixed(3) + ')'; x.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.6 + s[2] * 1.6, 1.2); } x.strokeStyle = 'rgba(255,200,190,.85)'; x.lineWidth = 2; x.shadowColor = '#ff8a80'; x.shadowBlur = 14; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(sw) * R, cy + Math.sin(sw) * R); x.stroke(); x.shadowBlur = 0; x.restore(); x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 1; for (var k = 1; k !== 6; k++) { x.beginPath(); x.arc(cx, cy, R * k / 6, a0, a1); x.stroke(); } requestAnimationFrame(fr); } requestAnimationFrame(fr); } function ozCover() { if (document.getElementById('ozCov')) return; var c = ozEl('div', 'position:fixed;inset:0;z-index:2147483000;overflow:hidden;background:#0d0405;"],
  ["font:600 17px/1.3 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:#1d1d1f;",
   "font:600 17px/1.3 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:#fff;"],
  ["#ozCov i{position:absolute;inset:0;border-radius:50%;border:2px solid #752b2d;",
   "#ozCov i{display:none;position:absolute;inset:0;border-radius:50%;border:2px solid #752b2d;"],
  ["c.appendChild(st); var e = ozEl(",
   "c.appendChild(st); ozScan(c); var e = ozEl("],
  ["'position:relative;width:64px;height:64px;border-radius:16px;box-shadow:0 6px 20px rgba(117,43,45,.25)'",
   "'position:relative;width:72px;height:72px;border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.55)'"],
  ["background:#EADCDD;overflow:hidden'), pf = ozEl('div', 'height:100%;width:0;background:#752b2d;border-radius:2px'), pt = ozEl('div', 'font-weight:700;font-size:13px;color:#752b2d;",
   "background:rgba(255,255,255,.2);overflow:hidden'), pf = ozEl('div', 'height:100%;width:0;background:#fff;border-radius:2px'), pt = ozEl('div', 'font-weight:700;font-size:13px;color:#fff;"],
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
