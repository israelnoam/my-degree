// Calendars added by link (ICS / webcal): Apple iCloud, Outlook, Google's secret address, any other.
// The browser can't fetch those links itself (no CORS), so they go through /api/ics on our own
// server, which only passes the file through and stores nothing. Read-only, like Google Calendar.

const ICS_PROXY = 'api/ics';
const ICS_TTL = 15 * 60 * 1000; // re-download a feed at most every 15 minutes
const icsFeeds = () => (settings().icsFeeds || []).filter(f => f && f.url);
const icsAvailable = () => !/github\.io$/.test(location.hostname) && location.protocol !== 'file:';

const IcsCache = {}; // feed id -> { at, events }

// ---------- parsing ----------
function icsUnescape(s) {
  return String(s || '').replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
}

// One line per property, with its parameters: { name, params: {TZID: ...}, value }.
function icsLines(text) {
  const raw = String(text).replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  return raw.filter(Boolean).map(line => {
    // The value starts at the first ':' that isn't inside a quoted parameter.
    let i = 0, q = false;
    for (; i < line.length; i++) { const ch = line[i]; if (ch === '"') q = !q; else if (ch === ':' && !q) break; }
    const head = line.slice(0, i), value = line.slice(i + 1);
    const [name, ...ps] = head.split(';');
    const params = {};
    for (const p of ps) { const k = p.indexOf('='); if (k > 0) params[p.slice(0, k).toUpperCase()] = p.slice(k + 1).replace(/^"|"$/g, ''); }
    return { name: name.toUpperCase(), params, value };
  });
}

// "20261104T083000" (+ optional Z) or "20261104" -> wall-clock parts.
function icsParts(value, params = {}) {
  const m = String(value).match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/);
  if (!m) return null;
  return {
    y: +m[1], mo: +m[2], d: +m[3], h: +(m[4] || 0), mi: +(m[5] || 0), s: +(m[6] || 0),
    allDay: params.VALUE === 'DATE' || !m[4], utc: !!m[7], tz: params.TZID || '',
  };
}

// Offset (ms) of a time zone at a given instant, via Intl. Unknown zones fall back to this device's zone.
function tzOffset(tz, ms) {
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const p = Object.fromEntries(f.formatToParts(new Date(ms)).map(x => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000;
  } catch { return null; }
}

// Wall-clock parts -> Date (the real instant).
function icsDate(p) {
  if (p.utc) return new Date(Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s));
  if (p.allDay || !p.tz) return new Date(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
  const guess = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
  const off = tzOffset(p.tz, guess);
  if (off === null) return new Date(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
  const first = guess - off;
  const off2 = tzOffset(p.tz, first);
  return new Date(guess - (off2 ?? off));
}

function parseIcs(text) {
  const events = [];
  let ev = null, depth = 0;
  for (const l of icsLines(text)) {
    if (l.name === 'BEGIN') {
      if (l.value === 'VEVENT' && !ev) { ev = { exdates: [] }; depth = 0; }
      else if (ev) depth++;
      continue;
    }
    if (l.name === 'END') {
      if (ev && depth) { depth--; continue; }
      if (l.value === 'VEVENT' && ev) { if (ev.start) events.push(ev); ev = null; }
      continue;
    }
    if (!ev || depth) continue; // skip alarms inside the event
    switch (l.name) {
      case 'UID': ev.uid = l.value; break;
      case 'SUMMARY': ev.title = icsUnescape(l.value); break;
      case 'LOCATION': ev.location = icsUnescape(l.value); break;
      case 'DESCRIPTION': ev.description = icsUnescape(l.value); break;
      case 'STATUS': ev.status = l.value.toUpperCase(); break;
      case 'DTSTART': ev.start = icsParts(l.value, l.params); break;
      case 'DTEND': ev.end = icsParts(l.value, l.params); break;
      case 'DURATION': ev.duration = l.value; break;
      case 'RRULE': ev.rrule = Object.fromEntries(l.value.split(';').map(kv => kv.split('=')).map(([k, v]) => [k.toUpperCase(), v])); break;
      case 'EXDATE': for (const v of l.value.split(',')) { const p = icsParts(v, l.params); if (p) ev.exdates.push(icsDate({ ...p, tz: p.tz || ev.start?.tz || '' }).getTime()); } break;
      case 'RECURRENCE-ID': ev.recurrenceId = icsParts(l.value, l.params); break;
    }
  }
  return events;
}

// "PT1H30M", "P1D" -> ms
function icsDuration(s) {
  const m = String(s || '').match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return 0;
  return (((+m[2] || 0) * 7 + (+m[3] || 0)) * 86400 + (+m[4] || 0) * 3600 + (+m[5] || 0) * 60 + (+m[6] || 0)) * 1000;
}

const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// Every start (wall-clock parts) of a repeating event that could touch [from, to).
// Handles the common rules: DAILY / WEEKLY (with BYDAY) / MONTHLY / YEARLY, INTERVAL, COUNT, UNTIL.
function icsOccurrences(ev, from, to, lengthMs) {
  const s = ev.start, r = ev.rrule;
  if (!r) return [s];
  const freq = r.FREQ, interval = Math.max(1, +r.INTERVAL || 1);
  const count = r.COUNT ? +r.COUNT : Infinity;
  const until = r.UNTIL ? icsDate({ ...icsParts(r.UNTIL), tz: s.tz }).getTime() : Infinity;
  const days = (r.BYDAY || '').split(',').map(d => ICS_DAYS.indexOf(d.slice(-2))).filter(d => d >= 0);
  // Walk wall-clock dates in UTC arithmetic (no DST surprises), convert each start at the end.
  const base = Date.UTC(s.y, s.mo - 1, s.d);
  const out = [];
  let n = 0;
  const push = t => {
    const d = new Date(t);
    const p = { ...s, y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate() };
    const at = icsDate(p).getTime();
    if (at > until) return false;
    n++;
    if (at + lengthMs > from && at < to) out.push(p);
    return n < count && at < to;
  };
  const DAY = 86400000;
  for (let step = 0; step < 5000; step++) {
    if (freq === 'DAILY') { if (!push(base + step * interval * DAY)) break; }
    else if (freq === 'WEEKLY') {
      const weekStart = base - new Date(base).getUTCDay() * DAY + step * interval * 7 * DAY;
      const list = days.length ? days : [new Date(base).getUTCDay()];
      let go = true;
      for (const wd of [...list].sort()) {
        const t = weekStart + wd * DAY;
        if (t < base) continue;
        if (!push(t)) { go = false; break; }
      }
      if (!go) break;
    } else if (freq === 'MONTHLY') {
      const d = new Date(Date.UTC(s.y, s.mo - 1 + step * interval, s.d));
      if (d.getUTCDate() !== s.d) continue; // the 31st in a short month
      if (!push(d.getTime())) break;
    } else if (freq === 'YEARLY') {
      if (!push(Date.UTC(s.y + step * interval, s.mo - 1, s.d))) break;
    } else return [s];
  }
  return out;
}

// Events of one feed inside [from, to), in the same shape as Google Calendar events.
function icsExpand(feed, events, from, to) {
  const f = from.getTime(), t = to.getTime();
  // Moved/edited single occurrences replace the matching occurrence of the series.
  const moved = new Set(events.filter(e => e.recurrenceId).map(e => `${e.uid}|${icsDate({ ...e.recurrenceId, tz: e.recurrenceId.tz || e.start.tz }).getTime()}`));
  const out = [];
  for (const ev of events) {
    if (ev.status === 'CANCELLED') continue;
    const start0 = icsDate(ev.start).getTime();
    const end0 = ev.end ? icsDate(ev.end).getTime() : start0 + (ev.duration ? icsDuration(ev.duration) : (ev.start.allDay ? 86400000 : 3600000));
    const length = Math.max(0, end0 - start0);
    for (const p of icsOccurrences(ev, f, t, length)) {
      const at = icsDate(p).getTime();
      if (ev.rrule && (ev.exdates.includes(at) || moved.has(`${ev.uid}|${at}`))) continue;
      if (at + length <= f || at >= t) continue;
      const allDay = !!ev.start.allDay;
      const day = d => ymd(d);
      out.push({
        id: `ics-${feed.id}-${ev.uid || ''}-${at}`,
        title: ev.title || '(ללא כותרת)',
        location: ev.location || '',
        description: ev.description || '',
        link: '',
        allDay,
        start: allDay ? day(new Date(at)) : new Date(at).toISOString(),
        end: allDay ? day(new Date(at + Math.max(length, 86400000))) : new Date(at + length).toISOString(),
        calendar: feed.name,
        cat: `ics:${feed.id}|`,
        color: feed.color || '#8b7cf6',
      });
    }
  }
  return out;
}

async function icsDownload(feed, force = false) {
  const c = IcsCache[feed.id];
  if (!force && c && Date.now() - c.at < ICS_TTL) return c.events;
  const res = await fetch(`${ICS_PROXY}?url=${encodeURIComponent(feed.url)}`, { cache: 'no-store' });
  if (!res.ok) {
    let msg = '';
    try { msg = (await res.json()).error; } catch {}
    throw new Error(msg || `לא הצלחתי להוריד את היומן "${feed.name}" (${res.status})`);
  }
  const events = parseIcs(await res.text());
  IcsCache[feed.id] = { at: Date.now(), events };
  return events;
}

async function icsFetchRange(from, to, force = false) {
  if (!icsAvailable()) return [];
  const lists = await Promise.all(icsFeeds().map(async feed => icsExpand(feed, await icsDownload(feed, force), from, to)));
  return lists.flat();
}

// ---------- settings UI ----------
const ICS_COLORS = ['#8b7cf6', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899'];

function icsSection() {
  const feeds = icsFeeds();
  return `
    <details class="set-sub" id="icsSection"><summary>🔗 יומנים לפי קישור (Apple, Outlook ועוד)${feeds.length ? ` <small class="muted">· ${feeds.length}</small>` : ''}</summary>
      <p class="muted">כל יומן שיש לו קישור מנוי (ICS / webcal) מופיע במערכת השעות, לקריאה בלבד. מתעדכן כל רבע שעה כשהאפליקציה פתוחה.</p>
      ${icsAvailable() ? '' : '<p class="warn">⚠️ יומנים לפי קישור עובדים רק בכתובת החדשה של האפליקציה (Vercel).</p>'}
      ${feeds.length ? `<div class="list-map">${feeds.map(f => `
        <div class="list-row"><span><span class="ev-dot" style="--ev:${esc(f.color)}"></span> ${esc(f.name)}</span>
          <button class="btn small danger" data-icsdel="${esc(f.id)}">הסר</button></div>`).join('')}</div>` : ''}
      <label>שם היומן<input id="icsName" placeholder="למשל: יומן אייפון"></label>
      <label>קישור (מתחיל ב-webcal:// או https://)<input id="icsUrl" dir="ltr" autocomplete="off" placeholder="webcal://p01-caldav.icloud.com/published/2/…"></label>
      <button class="btn primary" id="icsAdd">＋ הוסף יומן</button>
      <details class="install-step"><summary>🍎 איך מוצאים את הקישור ביומן של אפל?</summary>
        <ol class="howto">
          <li>ב-iCloud.com ← לוח שנה (או באפליקציית לוח שנה במק): לחץ על סמל השיתוף ליד היומן.</li>
          <li>סמן <b>"יומן ציבורי"</b> (Public Calendar) והעתק את הקישור.</li>
          <li>הדבק כאן. הקישור פרטי לך: כל מי שיש לו אותו יכול לראות את היומן, אז אל תשתף אותו.</li>
        </ol>
      </details>
      <details class="install-step"><summary>📧 Outlook / Google</summary>
        <ol class="howto">
          <li><b>Outlook:</b> הגדרות ← לוח שנה ← יומנים משותפים ← פרסם יומן ← העתק את קישור ה-ICS.</li>
          <li><b>Google:</b> עדיף להתחבר עם Google (יש כפתור למעלה). אפשר גם: הגדרות היומן ← "כתובת סודית בפורמט iCal".</li>
        </ol>
      </details>
    </details>`;
}

function bindIcsSection(root) {
  const reset = () => { GCal.weeks = {}; GCal.fetchedAt = {}; for (const k in IcsCache) delete IcsCache[k]; };
  $('#icsAdd', root)?.addEventListener('click', async () => {
    const name = $('#icsName', root).value.trim() || 'יומן';
    const url = $('#icsUrl', root).value.trim().replace(/^webcal:/i, 'https:');
    if (!/^https?:\/\/[^\s]+$/i.test(url)) return alert('הקישור צריך להתחיל ב-webcal:// או https://');
    const feeds = icsFeeds();
    const feed = { id: uid(), name, url, color: ICS_COLORS[feeds.length % ICS_COLORS.length] };
    const btn = $('#icsAdd', root);
    btn.disabled = true; btn.textContent = 'בודק את הקישור…';
    try {
      const events = await icsDownload(feed, true);
      Store.put('meta', 'settings', { icsFeeds: [...feeds, feed] });
      Sync.schedule(500);
      reset();
      toast(`היומן "${name}" נוסף (${events.length} אירועים)`);
      render();
    } catch (e) {
      alert(e.message || 'לא הצלחתי לקרוא את היומן מהקישור');
      btn.disabled = false; btn.textContent = '＋ הוסף יומן';
    }
  });
  $$('[data-icsdel]', root).forEach(b => b.onclick = () => {
    const before = icsFeeds();
    const gone = before.find(f => f.id === b.dataset.icsdel);
    Store.put('meta', 'settings', { icsFeeds: before.filter(f => f.id !== b.dataset.icsdel) });
    reset(); Sync.schedule(500); render();
    toast(`היומן "${gone?.name || ''}" הוסר`, () => { Store.put('meta', 'settings', { icsFeeds: before }); reset(); render(); });
  });
}
