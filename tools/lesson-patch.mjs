// Разовая правка блока в уроке «Справочник O-RADS US». Первая версия (25.11) добавила в пропуск s, i, r;
// эта — личный ключ ученика t. Запуск: workflow «Правка урока справочника» (DRY=1 — только показать).
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
  // 25.11 вечер: в пропуск — личный ключ ученика (t), чтобы сайт спрашивал школу о доступе напрямую.
  // и ключ продления (rt): по нему сайт сам получает свежий ключ, когда часовой истечёт (ключ продления у Prodamus не меняется).
  ["ozMe.p = !t ? Promise.resolve() :", "ozMe.t = t ? decodeURIComponent(t) : ''; ozMe.rt = decodeURIComponent((document.cookie.match(/student_refresh_token=([^;]+)/) || [])[1] || ''); ozMe.p = !t ? Promise.resolve() :"],
  ["s: ozMe.s || '',", "s: ozMe.s || '', t: ozMe.t || '', rt: ozMe.rt || '',"],
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
