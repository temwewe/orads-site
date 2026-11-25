// Робот «кто сейчас с подпиской». Запускается GitHub Actions каждые 10 минут (см. .github/workflows/access.yml).
// 1) Берёт из Prodamus всех учеников, у кого есть запись в курсе «Справочник O-RADS» (кто хоть раз открывал урок).
// 2) Для каждого проверяет, есть ли сейчас активный доступ к курсу (лицензия isActive: курс, продукт-подписка или «все курсы»).
// 3) Пишет access.json: t — время проверки, h — первые 16 символов sha256("orads:" + номер ученика). Почт и имён в файле нет.
// Сайт при открытии с интернетом ищет себя в этом списке; нет в свежем списке → справочник стирается.
// Нужен секрет API_TOKEN (токен Admin API школы с правом читать учеников).
import crypto from 'node:crypto';
import { writeFileSync } from 'node:fs';

const API = 'https://app.xl.ru/api/v1';
const COURSE_ID = 'LqhAwp_RekiGv7zVA6hW7A';
const SCHOOL_ID = 'pLFufPHshk2yzbWIQTb53w';
const SITE = 'https://orads.timofeeva-online.ru/access.json';
const TOKEN = process.env.API_TOKEN;
if (!TOKEN) throw new Error('Нет секрета API_TOKEN');

async function get(path, params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) (Array.isArray(v) ? v : [v]).forEach((x) => q.append(k, String(x)));
  const r = await fetch(`${API}${path}?${q}`, { headers: { Accept: 'application/json', Authorization: 'Bearer ' + TOKEN } });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch (e) { throw new Error(`GET ${path}: ${r.status} ${t.slice(0, 200)}`); }
  if (!r.ok || j.success === false) throw new Error(`GET ${path}: ${r.status} ${JSON.stringify(j.errors || j).slice(0, 300)}`);
  return j.body;
}
const hash = (id) => crypto.createHash('sha256').update('orads:' + id).digest('hex').slice(0, 16);

// 1) Кандидаты
const ids = new Set();
for (let skip = 0; ; skip += 500) {
  const b = await get('/student-course', { courseId: COURSE_ID, take: 500, skip, fields: '{studentId, schoolId}' });
  const items = b.items || [];
  for (const it of items) {
    if (it.schoolId && it.schoolId !== SCHOOL_ID) throw new Error('Чужая школа в ответе: ' + it.schoolId);
    if (it.studentId) ids.add(it.studentId);
  }
  if (items.length < 500) break;
}

// 2) Активный доступ
const filter = JSON.stringify({ containsCourseId: COURSE_ID });
const fields = `{id, studentCourseAccesses(filter: ${JSON.stringify(filter)}){isActive}}`;
const active = [];
const all = [...ids];
for (let i = 0; i < all.length; i += 50) {
  const part = all.slice(i, i + 50);
  const b = await get('/student', { ids: part, take: 50, fields });
  const got = b.items || [];
  if (got.length !== part.length) console.log(`Внимание: запросил ${part.length}, получил ${got.length}`);
  for (const s of got) if ((s.studentCourseAccesses || []).some((l) => l.isActive)) active.push(s.id);
}

// 3) Защита от сбоя: если список резко сократился, не выкладываем (запуск вручную с FORCE=1 — выложить всё равно).
let prev = null;
try { const r = await fetch(SITE + '?t=' + Date.now()); if (r.ok) prev = await r.json(); } catch (e) {}
const prevN = prev && Array.isArray(prev.h) ? prev.h.length : 0;
if (!process.env.FORCE && prevN >= 4 && active.length < prevN / 2) {
  throw new Error(`Список сократился с ${prevN} до ${active.length} — похоже на сбой, не выкладываю. Если это правда, запустите вручную с force.`);
}

const out = { t: new Date().toISOString(), h: active.map(hash).sort() };
writeFileSync('access.json', JSON.stringify(out));
console.log(`Учеников в курсе: ${ids.size}, с активной подпиской: ${active.length} (было ${prevN}).`);
