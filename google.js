// Google Calendar (read-only, shown in the timetable) and Google Tasks (two-way).

const DEFAULT_CALENDARS = ['נועם ישראל', 'לימודים - רשות'];
const TASKS_LIST_TITLE = 'התואר שלי';
const LS_CAL_CACHE = 'pp_cal_cache_v1';

const norm = s => String(s || '').replace(/[\s־‐-―-]+/g, ' ').trim();

// ---------- Calendar ----------
const GCal = {
  calendars: null,   // [{id, summary, color}]
  weeks: {},         // weekKey -> [events]
  loading: {},
  fetchedAt: {},
  lastError: '',

  ready() { return Sync.connected && Sync.hasScope('calendar') && !!Sync.token(); },

  loadCache() {
    try { this.weeks = JSON.parse(lsGet(LS_CAL_CACHE, '{}')) || {}; } catch { this.weeks = {}; }
  },
  saveCache() {
    // Keep the 8 most recently fetched weeks for offline use.
    const keys = Object.keys(this.weeks).sort().slice(-8);
    lsSet(LS_CAL_CACHE, JSON.stringify(Object.fromEntries(keys.map(k => [k, this.weeks[k]]))));
  },

  async listCalendars(force = false) {
    if (this.calendars && !force) return this.calendars;
    const res = await Sync.api('https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader&maxResults=250');
    const { items = [] } = await res.json();
    this.calendars = items.map(c => ({ id: c.id, summary: c.summaryOverride || c.summary, color: c.backgroundColor, primary: !!c.primary }));
    return this.calendars;
  },

  // Calendars picked in settings; until you pick, the two study calendars by name.
  async selectedIds() {
    const chosen = settings().calendarIds;
    if (Array.isArray(chosen)) return chosen;
    const cals = await this.listCalendars();
    const wanted = DEFAULT_CALENDARS.map(norm);
    const ids = cals.filter(c => wanted.includes(norm(c.summary))).map(c => c.id);
    if (ids.length) Store.put('meta', 'settings', { calendarIds: ids });
    return ids;
  },

  // Fetches one week (Sunday..Saturday). Calls onUpdate when fresh data arrives.
  async fetchWeek(weekStart, onUpdate, force = false) {
    const key = ymd(weekStart);
    if (!this.ready() || this.loading[key]) return;
    if (!force && Date.now() - (this.fetchedAt[key] || 0) < 60_000) return;
    this.loading[key] = true;
    try {
      const ids = await this.selectedIds();
      const cals = await this.listCalendars();
      const end = new Date(weekStart); end.setDate(end.getDate() + 7);
      const lists = await Promise.all(ids.map(async id => {
        const cal = cals.find(c => c.id === id);
        const q = new URLSearchParams({
          timeMin: weekStart.toISOString(), timeMax: end.toISOString(),
          singleEvents: 'true', orderBy: 'startTime', maxResults: '250',
        });
        const res = await Sync.api(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id)}/events?${q}`);
        const { items = [] } = await res.json();
        return items.filter(e => e.status !== 'cancelled').map(e => ({
          id: e.id,
          title: e.summary || '(ללא כותרת)',
          location: e.location || '',
          description: e.description || '',
          link: e.htmlLink,
          allDay: !!e.start.date,
          start: e.start.dateTime || e.start.date,
          end: e.end.dateTime || e.end.date,
          calendar: cal?.summary || '',
          color: cal?.color || '#4ea1ff',
        }));
      }));
      const events = lists.flat();
      const changed = JSON.stringify(events) !== JSON.stringify(this.weeks[key]);
      this.weeks[key] = events;
      this.fetchedAt[key] = Date.now();
      this.lastError = '';
      this.saveCache();
      if (changed) onUpdate?.();
    } catch (e) {
      this.lastError = e.message;
      if (e.auth) Sync.setState('needs-auth', 'פג תוקף החיבור');
    } finally {
      this.loading[key] = false;
    }
  },

  eventsFor(weekStart) { return this.weeks[ymd(weekStart)] || []; },
};

// ---------- Tasks ----------
const TASKS_API = 'https://tasks.googleapis.com/tasks/v1';
const COURSE_PREFIX = '📚 ';

function toGoogleTask(t) {
  const icon = (TASK_TYPES[t.type] || TASK_TYPES.other).icon;
  const notes = [t.course ? COURSE_PREFIX + courseLabel(t.course) : '', t.notes || ''].filter(Boolean).join('\n');
  const g = { title: `${icon} ${t.title}`, notes, status: t.done ? 'completed' : 'needsAction' };
  // Google Tasks keeps only the date part of a due date.
  g.due = t.due ? `${t.due.slice(0, 10)}T00:00:00.000Z` : null;
  return g;
}

function fromGoogleTask(g, existing = {}) {
  let title = g.title || '';
  let type = existing.type || 'other';
  for (const [k, v] of Object.entries(TASK_TYPES)) {
    if (title.startsWith(v.icon)) { type = k; title = title.slice(v.icon.length).trim(); break; }
  }
  let notes = g.notes || '';
  let course = existing.course || '';
  if (notes.startsWith(COURSE_PREFIX)) {
    const [first, ...rest] = notes.split('\n');
    const name = first.slice(COURSE_PREFIX.length).trim();
    const match = courses().find(c => c.name === name);
    course = match ? match.code : course;
    notes = rest.join('\n');
  }
  const date = g.due ? g.due.slice(0, 10) : '';
  // Keep the time we had locally if the date didn't change in Google.
  const due = !date ? '' : (existing.due && existing.due.startsWith(date) ? existing.due : date);
  return { title, type, course, notes, due, done: g.status === 'completed' };
}

const GTasks = {
  ready() { return Sync.connected && Sync.hasScope('tasks') && settings().tasksSync !== false; },

  async ensureList() {
    const st = settings();
    const res = await Sync.api(`${TASKS_API}/users/@me/lists?maxResults=100`);
    const { items = [] } = await res.json();
    let list = items.find(l => l.id === st.tasksListId) || items.find(l => l.title === TASKS_LIST_TITLE);
    if (!list) {
      const created = await Sync.api(`${TASKS_API}/users/@me/lists`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: TASKS_LIST_TITLE }),
      });
      list = await created.json();
    }
    if (list.id !== st.tasksListId) Store.putRaw('meta', 'settings', { ...st, tasksListId: list.id, u: Date.now() });
    return list.id;
  },

  async listAll(listId) {
    const all = [];
    let pageToken = '';
    do {
      const q = new URLSearchParams({ showCompleted: 'true', showHidden: 'true', showDeleted: 'true', maxResults: '100' });
      if (pageToken) q.set('pageToken', pageToken);
      const res = await Sync.api(`${TASKS_API}/lists/${listId}/tasks?${q}`);
      const data = await res.json();
      all.push(...(data.items || []));
      pageToken = data.nextPageToken || '';
    } while (pageToken);
    return all;
  },

  async send(listId, method, gid, body) {
    const url = `${TASKS_API}/lists/${listId}/tasks${gid ? '/' + gid : ''}`;
    try {
      const res = await Sync.api(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
      });
      return method === 'DELETE' ? null : res.json();
    } catch (e) {
      if (method === 'DELETE' && /\b(404|410)\b/.test(e.message)) return null;
      throw e;
    }
  },

  // Each app task remembers its Google id (gid), the app timestamp at last sync
  // (gU) and Google's `updated` at last sync (gUpd). Whichever side moved since
  // then wins; if both did, the newer edit wins.
  async sync() {
    if (!this.ready()) return false;
    const listId = await this.ensureList();
    const gtasks = await this.listAll(listId);
    const byId = Object.fromEntries(gtasks.map(g => [g.id, g]));
    const known = new Set();
    let changed = false;
    const stamp = (id, data) => { const now = Date.now(); Store.putRaw('task', id, { ...data, u: now, gU: now }); changed = true; };

    for (const r of Object.values(Store.recs).filter(r => r.kind === 'task')) {
      if (r.gid) known.add(r.gid);
      const g = r.gid ? byId[r.gid] : null;

      if (r.del) {
        if (g && !g.deleted) { await this.send(listId, 'DELETE', r.gid); changed = true; }
        continue;
      }
      if (!r.gid) {
        const created = await this.send(listId, 'POST', null, toGoogleTask(r));
        known.add(created.id);
        stamp(r.id, { gid: created.id, gUpd: created.updated });
        continue;
      }
      const appChanged = r.u > (r.gU || 0);
      if (!g || g.deleted) {
        // Deleted in Google. Keep it only if you edited it here since the last sync.
        if (appChanged) {
          const created = await this.send(listId, 'POST', null, toGoogleTask(r));
          known.add(created.id);
          stamp(r.id, { gid: created.id, gUpd: created.updated });
        } else {
          Store.recs[`task:${r.id}`] = { kind: 'task', id: r.id, u: Date.now(), del: true, gid: r.gid };
          Store.persist(); changed = true;
        }
        continue;
      }
      const googleChanged = g.updated !== r.gUpd;
      if (appChanged && (!googleChanged || r.u >= Date.parse(g.updated))) {
        const updated = await this.send(listId, 'PATCH', r.gid, toGoogleTask(r));
        stamp(r.id, { gUpd: updated.updated });
      } else if (googleChanged) {
        stamp(r.id, { ...fromGoogleTask(g, r), gUpd: g.updated });
      }
    }

    // Tasks you added directly in Google Tasks.
    for (const g of gtasks) {
      if (known.has(g.id) || g.deleted || !(g.title || '').trim()) continue;
      stamp(uid(), { ...fromGoogleTask(g), gid: g.id, gUpd: g.updated });
    }
    if (changed) Store.emit(true);
    return changed;
  },
};

GCal.loadCache();
Sync.hooks.push(() => GTasks.sync());
