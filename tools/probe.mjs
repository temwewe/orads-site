// Временная проверка доступа токена к полям урока (печатает только длины).
const API = 'https://app.xl.ru/api/v1', T = process.env.API_TOKEN, ID = 'MsUmf5w010u7GnQxUhiGHg';
for (const q of ['', '?fields=', '?fields=' + encodeURIComponent('{designHTMLPublished}'), '?fields=' + encodeURIComponent('{id,title,comment,designConcurrencyStamp}')]) {
  const r = await fetch(API + '/course-item/' + ID + q, { headers: { Accept: 'application/json', Authorization: 'Bearer ' + T } });
  const j = await r.json().catch(() => ({}));
  const b = j.body || {};
  console.log(q || '(no fields)', r.status, JSON.stringify(Object.fromEntries(Object.entries(b).map(([k, v]) => [k, typeof v === 'string' ? v.length : (v && typeof v === 'object' ? 'obj' : v)]))), JSON.stringify(j.errors || []).slice(0, 200));
}
const me = await fetch(API + '/authorization/me?fields=' + encodeURIComponent('{id,role,school{id}}'), { headers: { Accept: 'application/json', Authorization: 'Bearer ' + T } });
console.log('me', me.status, (await me.text()).slice(0, 300));
