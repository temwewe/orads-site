// Разовая правка урока «Справочник O-RADS US»: старая копия справочника под блоком перехода
// заменяется маленьким загрузчиком. Он берёт из метки @@ORADS:…@@ ключ и адрес зашифрованного файла,
// скачивает актуальный справочник и показывает его прямо в уроке. Робот смены ключа обновляет метку
// во всём уроке (регэксп с флагом g), поэтому копия в уроке всегда совпадает с приложением.
// DRY=1 — только показать, что будет заменено. Проверяет школу «Тимофеева онлайн».
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

const LOADER = `<div id="ozLc"><div id="ozLcMsg" style="padding:18px 0;color:#6e6e73;font:15px/1.4 -apple-system,system-ui,sans-serif">Загружаем справочник…</div></div>
<script>
(function () {
  // Копия справочника в уроке: скачиваем актуальный зашифрованный файл и показываем здесь. Метку обновляет робот.
  var P = '${mark}';
  if (/[?&#]app=1/.test(location.href)) return; // урок сейчас уводит в приложение
  var box = document.getElementById('ozLc'), msg = document.getElementById('ozLcMsg');
  function u8(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  try {
    var m = /@@ORADS:([A-Za-z0-9_-]+)@@/.exec(P), s = m[1].replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    var p = JSON.parse(new TextDecoder().decode(u8(s)));
  } catch (e) { msg.textContent = 'Справочник временно недоступен.'; return; }
  if (!p.f || !p.k) { msg.textContent = 'Справочник временно недоступен.'; return; }
  fetch(p.f, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (t) {
    var all = u8(t.trim());
    return crypto.subtle.importKey('raw', u8(p.k), 'AES-GCM', false, ['decrypt']).then(function (key) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12) }, key, all.slice(12));
    });
  }).then(function (buf) {
    box.innerHTML = new TextDecoder().decode(buf);
    box.querySelectorAll('script').forEach(function (o) {
      var n = document.createElement('script');
      for (var i = 0; i < o.attributes.length; i++) n.setAttribute(o.attributes[i].name, o.attributes[i].value);
      n.textContent = o.textContent; o.replaceWith(n);
    });
  }).catch(function () { msg.textContent = 'Справочник не загрузился. Обновите страницу.'; });
})();
</script>`;

// Где старая копия: от '<div id="oz">' до конца содержимого EZHtml.
function cut(html, label) {
  const a = html.indexOf('<div id="oz">');
  if (a < 0) throw new Error(label + ': не нашёл начало старой копии');
  if (html.indexOf('<div id="oz">', a + 1) >= 0) throw new Error(label + ': начало старой копии встречается дважды');
  return a;
}
function walk(node, fn) { if (!node || typeof node !== 'object') return; fn(node); for (const v of Object.values(node)) if (v && typeof v === 'object') walk(v, fn); }
const out = {};
let elContent = null;
for (const f of ['designSettings', 'designSettingsPublished']) {
  const tree = JSON.parse(L[f]);
  let hit = 0;
  walk(tree, (n) => {
    if (n.id !== EL) return;
    const key = ['html', 'content', 'code'].find((k) => typeof n[k] === 'string');
    if (!key) throw new Error(f + ': у элемента нет строки html/content/code, ключи: ' + Object.keys(n).join(','));
    const s = n[key], a = cut(s, f);
    console.log(`${f}: элемент ${EL}, поле ${key}, длина ${s.length}, старая копия с ${a} (${s.length - a} симв.)`);
    n[key] = s.slice(0, a) + LOADER; hit++;
    if (f === 'designSettingsPublished') elContent = { before: s, after: n[key] };
  });
  if (hit !== 1) throw new Error(f + ': элемент найден ' + hit + ' раз');
  out[f] = JSON.stringify(tree);
}
// Опубликованный HTML: содержимое элемента в нём должно совпадать с полем дерева.
const H = L.designHTMLPublished, at = H.indexOf(elContent.before);
if (at < 0) throw new Error('designHTMLPublished: содержимое элемента не совпало с деревом — ничего не сохраняю');
out.designHTMLPublished = H.slice(0, at) + elContent.after + H.slice(at + elContent.before.length);
console.log(`designHTMLPublished: было ${H.length}, станет ${out.designHTMLPublished.length}`);
console.log('Хвост после старой копии в HTML:', JSON.stringify(H.slice(at + elContent.before.length, at + elContent.before.length + 80)));
if (process.env.DRY) { console.log('DRY: ничего не сохранено'); process.exit(0); }
await api('PUT', '/course-item', { id: LESSON_ID, designConcurrencyStamp: L.designConcurrencyStamp,
  designSettings: { value: out.designSettings }, designSettingsPublished: { value: out.designSettingsPublished },
  designHTMLPublished: { value: out.designHTMLPublished }, theoryVisible: { value: true } });
const after = await api('GET', `/course-item/${LESSON_ID}?fields=${encodeURIComponent('{designHTMLPublished}')}`);
if ((after.designHTMLPublished || '') !== out.designHTMLPublished) throw new Error('Урок сохранился не так, как ожидалось');
console.log('Урок обновлён');
