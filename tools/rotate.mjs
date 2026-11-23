// Робот смены ключа справочника O-RADS. Запускается GitHub Actions (см. .github/workflows/rotate.yml).
// 1) Берёт текущий пропуск из урока Prodamus (метка @@ORADS:...@@): ключ, файл, версии.
// 2) Текст справочника: из update.enc (новая версия, зашифрована ТЕКУЩИМ ключом) или из текущего файла.
// 3) Шифрует новым ключом, загружает в «Файлы» Prodamus, вписывает новый пропуск в урок, удаляет старый файл.
// 4) Пишет version.json (c — версия справочника, v — версия ключа).
// Нужен секрет API_TOKEN (токен Admin API школы).
import crypto from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';

const API = 'https://app.xl.ru/api/v1';
const LESSON_ID = 'MsUmf5w010u7GnQxUhiGHg';
const SITE_ID = 'UgLkY7IR4kWkzSY0PJmwtg';
const SCHOOL_ID = 'pLFufPHshk2yzbWIQTb53w';
const TOKEN = process.env.API_TOKEN;
if (!TOKEN) throw new Error('Нет секрета API_TOKEN');
const MARK = /@@ORADS:([A-Za-z0-9_-]*)@@/g;

const b64u = (b) => Buffer.from(b).toString('base64url');
const fromB64u = (s) => Buffer.from(s, 'base64url');

async function api(method, path, { body, headers } = {}) {
  const r = await fetch(API + path, {
    method,
    headers: { Accept: 'application/json', Authorization: 'Bearer ' + TOKEN, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch (e) { throw new Error(`${method} ${path}: ${r.status} ${t.slice(0, 200)}`); }
  if (!r.ok || j.success === false) throw new Error(`${method} ${path}: ${r.status} ${JSON.stringify(j.errors || j).slice(0, 300)}`);
  return j.body;
}

function seal(plain, key) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  return Buffer.concat([iv, c.update(plain), c.final(), c.getAuthTag()]).toString('base64');
}
function open(text, key) {
  const all = Buffer.from(text.trim(), 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', key, all.subarray(0, 12));
  d.setAuthTag(all.subarray(all.length - 16));
  return Buffer.concat([d.update(all.subarray(12, all.length - 16)), d.final()]);
}

async function upload(text) {
  const buf = Buffer.from(text);
  const name = `orads-${Date.now()}.txt`;
  const b = await api('POST', '/file/begin', { headers: {
    'X-Content-Length': String(buf.length), 'X-Chunk-Size': '52428800', 'X-Content-Name': encodeURIComponent(name),
    'X-Content-Type': 'text/plain', 'X-Is-Public': 'true', 'X-Site-Id': SITE_ID, 'X-School-Id': SCHOOL_ID } });
  const id = b.id || (b.file && b.file.id);
  const urls = b.urls || [];
  if (!id || urls.length !== 1) throw new Error('Begin: неожиданный ответ ' + JSON.stringify(b).slice(0, 300));
  const put = await fetch(urls[0], { method: 'PUT', body: buf });
  if (!put.ok) throw new Error('PUT в хранилище: ' + put.status);
  await api('POST', '/file/complete', { body: { id, eTags: [{ eTag: put.headers.get('etag'), partNumber: 1 }] } });
  const info = await api('GET', `/file/${id}/info?fields=${encodeURIComponent('{id,cloudKey,isPublic,state}')}`);
  const f = info.cloudKey ? 'https://con.xl.ru/' + info.cloudKey : null;
  if (!f) throw new Error('Нет cloudKey у файла ' + JSON.stringify(info));
  return { id, f };
}

const lesson = await api('GET', `/course-item/${LESSON_ID}?fields=${encodeURIComponent('{id,designConcurrencyStamp,designSettings,designSettingsPublished,designHTMLPublished,course{schoolId}}')}`);
if (lesson.course && lesson.course.schoolId !== SCHOOL_ID) throw new Error('Урок не из школы «Тимофеева онлайн»');
const m = /@@ORADS:([A-Za-z0-9_-]+)@@/.exec(lesson.designHTMLPublished || '');
if (!m) throw new Error('В уроке нет метки @@ORADS:...@@. Поля урока: ' + JSON.stringify(Object.fromEntries(Object.entries(lesson).map(([k, v]) => [k, typeof v === 'string' ? v.length + ' симв.' : v]))));
const cur = JSON.parse(fromB64u(m[1]).toString('utf8'));
const curKey = Buffer.from(cur.k, 'base64');

let plain, c = cur.c;
if (existsSync('update.enc')) {
  plain = open(readFileSync('update.enc', 'utf8'), curKey);
  c = new Date().toISOString();
  console.log('Новая версия справочника', c);
} else {
  if (!cur.f) throw new Error('Нет текущего файла и нет update.enc');
  const r = await fetch(cur.f, { cache: 'no-store' });
  if (!r.ok) throw new Error('Текущий файл: ' + r.status);
  plain = open(await r.text(), curKey);
}
if (!plain.includes('id="oz"')) throw new Error('Расшифрованный текст не похож на справочник');

const key = crypto.randomBytes(32);
const sealed = seal(plain, key);
const up = await upload(sealed);
// проверка: файл скачивается и расшифровывается
const chk = await fetch(up.f, { cache: 'no-store' });
if (!chk.ok || !open(await chk.text(), key).equals(plain)) throw new Error('Проверка загруженного файла не прошла');

const v = new Date().toISOString();
const next = { k: key.toString('base64'), f: up.f, id: up.id, v, c };
const mark = '@@ORADS:' + b64u(JSON.stringify(next)) + '@@';
const fix = (s) => (s || '').replace(MARK, mark);
await api('PUT', '/course-item', { body: {
  id: LESSON_ID, designConcurrencyStamp: lesson.designConcurrencyStamp,
  designSettings: { value: fix(lesson.designSettings) },
  designSettingsPublished: { value: fix(lesson.designSettingsPublished) },
  designHTMLPublished: { value: fix(lesson.designHTMLPublished) },
  theoryVisible: { value: true },
} });
const after = await api('GET', `/course-item/${LESSON_ID}?fields=${encodeURIComponent('{designHTMLPublished}')}`);
if (!(after.designHTMLPublished || '').includes(mark)) throw new Error('Урок не обновился');

if (cur.id) { try { await api('DELETE', `/file/${cur.id}`); } catch (e) { console.warn('Старый файл не удалён:', e.message); } }
writeFileSync('version.json', JSON.stringify({ c, v }) + '\n');
if (existsSync('update.enc')) unlinkSync('update.enc');
console.log('Готово. Ключ сменён, версия', v);
