// Vercel server function: fetches a calendar subscription link (ICS / webcal) for the app,
// because browsers can't read those links directly (no CORS). It only passes the file
// through: nothing is logged or stored. Same-origin only (no CORS header), so only this
// app's pages can read the answer.
const dns = require('dns').promises;
const net = require('net');

const MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 12000;

// Never let the link point at the server's own network.
function privateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return privateIp(v.slice(7));
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
}

async function checkUrl(raw) {
  let u;
  try { u = new URL(String(raw).trim().replace(/^webcal:/i, 'https:')); } catch { throw Object.assign(new Error('הקישור לא תקין'), { code: 400 }); }
  if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password) throw Object.assign(new Error('רק קישורי https / webcal'), { code: 400 });
  if (u.port && !['80', '443'].includes(u.port)) throw Object.assign(new Error('הקישור לא נתמך'), { code: 400 });
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) || /(^|\.)(localhost|local|internal)$/i.test(host)) throw Object.assign(new Error('הקישור לא נתמך'), { code: 400 });
  const addrs = await dns.lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw Object.assign(new Error('לא מצאתי את השרת של הקישור'), { code: 400 });
  if (addrs.some(a => privateIp(a.address))) throw Object.assign(new Error('הקישור לא נתמך'), { code: 400 });
  return u;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const fail = (code, error) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify({ error })); };
  if (req.method !== 'GET') return fail(405, 'GET only');
  try {
    let url = await checkUrl(req.query && req.query.url);
    let resp;
    // Follow up to 3 redirects, checking every hop.
    for (let hop = 0; ; hop++) {
      resp = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'User-Agent': 'my-degree-calendar/1.0', Accept: 'text/calendar, */*' } });
      if (resp.status >= 300 && resp.status < 400 && resp.headers.get('location')) {
        if (hop >= 3) return fail(502, 'יותר מדי הפניות');
        url = await checkUrl(new URL(resp.headers.get('location'), url).href);
        continue;
      }
      break;
    }
    if (resp.status === 404 || resp.status === 410) return fail(404, 'היומן לא נמצא בקישור הזה. אולי השיתוף שלו בוטל?');
    if (resp.status === 401 || resp.status === 403) return fail(403, 'היומן לא פתוח לקריאה. צריך לסמן אותו כ"יומן ציבורי" ולהעתיק את הקישור מחדש.');
    if (!resp.ok) return fail(502, `השרת של היומן ענה ${resp.status}`);
    const len = +resp.headers.get('content-length') || 0;
    if (len > MAX_BYTES) return fail(413, 'היומן גדול מדי');
    const reader = resp.body.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) { reader.cancel(); return fail(413, 'היומן גדול מדי'); }
      chunks.push(value);
    }
    const text = Buffer.concat(chunks).toString('utf8');
    if (!text.includes('BEGIN:VCALENDAR')) return fail(415, 'בקישור הזה אין יומן (קובץ ICS)');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.end(text);
  } catch (e) {
    if (e.code && typeof e.code === 'number') return fail(e.code, e.message);
    return fail(502, e.name === 'TimeoutError' ? 'השרת של היומן לא ענה בזמן' : 'לא הצלחתי להוריד את היומן');
  }
};
