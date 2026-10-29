// Google Calendar (read-only, shown in the timetable) and Google Tasks (two-way).
//
// Built to work alongside Instinct (the WhatsApp assistant), which keeps
// everything in the main calendar and tells categories apart by event color
// (לימודים - חובה, לימודים - אופציונלי, אישי…), and keeps one Google Tasks
// list per course.

const DEFAULT_CALENDARS = ['נועם ישראל', 'לימודים - רשות'];
const TASKS_LIST_TITLE = 'התואר שלי';
const LS_CAL_CACHE = 'pp_cal_cache_v2';
const CAL_API = 'https://www.googleapis.com/calendar/v3';

// Loose text compare for Hebrew names: ignores quotes/geresh, dashes and spacing.
const norm = s => String(s || '').toLowerCase()
  .replace(/["'`״׳׳״]/g, '')
  .replace(/[\s־‐-―-]+/g, ' ').trim();

const STUDY_WORDS = /הרצא|תרגול|תרגיל|סדנ|מעבד|מבחן|בוחן|מועד|הגש|שיעור|קורס|lecture|tutorial|exam|quiz|lab|hw\b|homework/i;

function looksLikeStudy(title) {
  const t = norm(title);
  if (STUDY_WORDS.test(title)) return true;
  return courses().some(c => {
    const n = norm(c.name);
    return (n.length > 3 && t.includes(n)) || t.includes(c.code.replace(/^0+/, ''));
  });
}

// ---------- Calendar ----------
const GCal = {
  calendars: null,   // [{id, summary, color, primary}]
  palette: null,     // event colorId -> hex
  weeks: {},         // weekKey -> [events]
  categories: null,  // scan result: [{key, color, count, samples, study}]
  loading: {},
  fetchedAt: {},
  lastError: null,

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
    const res = await Sync.api(`${CAL_API}/users/me/calendarList?minAccessRole=reader&maxResults=250`);
    const { items = [] } = await res.json();
    this.calendars = items.map(c => ({
      id: c.id, summary: c.summaryOverride || c.summary, color: c.backgroundColor, primary: !!c.primary,
    }));
    return this.calendars;
  },

  async loadPalette() {
    if (this.palette) return this.palette;
    const res = await Sync.api(`${CAL_API}/colors`);
    const { event = {} } = await res.json();
    this.palette = Object.fromEntries(Object.entries(event).map(([id, c]) => [id, c.background]));
    return this.palette;
  },

  // Calendars picked in settings. Until you pick: your main calendar plus any
  // calendar named like the study ones.
  async selectedIds() {
    const chosen = settings().calendarIds;
    if (Array.isArray(chosen) && chosen.length) return chosen;
    const cals = await this.listCalendars();
    const wanted = DEFAULT_CALENDARS.map(norm);
    const ids = cals.filter(c => c.primary || wanted.includes(norm(c.summary))).map(c => c.id);
    if (ids.length) Store.put('meta', 'settings', { calendarIds: ids });
    return ids;
  },

  async fetchRange(from, to) {
    const [ids, cals, palette] = await Promise.all([this.selectedIds(), this.listCalendars(), this.loadPalette()]);
    const lists = await Promise.all(ids.map(async id => {
      const cal = cals.find(c => c.id === id);
      const out = [];
      let pageToken = '';
      do {
        const q = new URLSearchParams({
          timeMin: from.toISOString(), timeMax: to.toISOString(),
          singleEvents: 'true', orderBy: 'startTime', maxResults: '2500',
        });
        if (pageToken) q.set('pageToken', pageToken);
        const res = await Sync.api(`${CAL_API}/calendars/${encodeURIComponent(id)}/events?${q}`);
        const data = await res.json();
        out.push(...(data.items || []));
        pageToken = data.nextPageToken || '';
      } while (pageToken);
      return out.filter(e => e.status !== 'cancelled').map(e => ({
        id: e.id,
        title: e.summary || '(ללא כותרת)',
        location: e.location || '',
        description: e.description || '',
        link: e.htmlLink,
        allDay: !!e.start.date,
        start: e.start.dateTime || e.start.date,
        end: e.end.dateTime || e.end.date,
        calendar: cal?.summary || '',
        // Category = calendar + event color (events without their own color use the calendar's).
        cat: `${id}|${e.colorId || ''}`,
        color: (e.colorId && palette[e.colorId]) || cal?.color || '#4ea1ff',
      }));
    }));
    return lists.flat();
  },

  // Looks at ~10 weeks of events and groups them by color, guessing which
  // groups are study ones. Runs once, then whenever you ask in settings.
  async scanCategories() {
    const from = new Date(); from.setDate(from.getDate() - 21);
    const to = new Date(); to.setDate(to.getDate() + 49);
    const events = await this.fetchRange(from, to);
    const groups = {};
    for (const ev of events) {
      const g = groups[ev.cat] ||= { key: ev.cat, color: ev.color, calendar: ev.calendar, count: 0, studyHits: 0, samples: [] };
      g.count++;
      if (looksLikeStudy(ev.title)) g.studyHits++;
      if (g.samples.length < 4 && !g.samples.includes(ev.title)) g.samples.push(ev.title);
    }
    this.categories = Object.values(groups)
      .map(g => ({ ...g, study: g.studyHits >= 3 || g.studyHits / g.count >= 0.4 }))
      .sort((a, b) => b.count - a.count);
    return this.categories;
  },

  // Which color categories to show. Picked in settings; until then, the study ones.
  async shownCategories() {
    const chosen = settings().calCategories;
    if (Array.isArray(chosen)) return chosen;
    const cats = this.categories || await this.scanCategories();
    const keys = cats.filter(c => c.study).map(c => c.key);
    if (!keys.length) return null; // nothing looks like study yet: show everything rather than nothing
    Store.put('meta', 'settings', { calCategories: keys });
    return keys;
  },

  // Fetches one week (Sunday..Saturday). Calls onUpdate when fresh data arrives.
  async fetchWeek(weekStart, onUpdate, force = false) {
    const key = ymd(weekStart);
    if (!this.ready() || this.loading[key]) return;
    if (!force && Date.now() - (this.fetchedAt[key] || 0) < 60_000) return;
    this.loading[key] = true;
    try {
      const end = new Date(weekStart); end.setDate(end.getDate() + 7);
      await this.shownCategories();
      const events = await this.fetchRange(weekStart, end);
      const changed = JSON.stringify(events) !== JSON.stringify(this.weeks[key]);
      this.weeks[key] = events;
      this.fetchedAt[key] = Date.now();
      const hadError = !!this.lastError;
      this.lastError = null;
      this.saveCache();
      if (changed || hadError) onUpdate?.();
    } catch (e) {
      const isNew = this.lastError?.message !== e.message;
      this.lastError = e;
      this.fetchedAt[key] = Date.now(); // don't hammer Google while it's failing
      if (e.auth) Sync.setState('needs-auth', 'פג תוקף החיבור');
      else if (isNew) onUpdate?.();
    } finally {
      this.loading[key] = false;
    }
  },

  eventsFor(weekStart) {
    const shown = settings().calCategories;
    const all = this.weeks[ymd(weekStart)] || [];
    return Array.isArray(shown) ? all.filter(e => shown.includes(e.cat)) : all;
  },
  allEventsFor(weekStart) { return this.weeks[ymd(weekStart)] || []; },
};

// ---------- Tasks ----------
const TASKS_API = 'https://tasks.googleapis.com/tasks/v1';
const COURSE_PREFIX = '📚 ';

function toGoogleTask(t, inCourseList) {
  const icon = (TASK_TYPES[t.type] || TASK_TYPES.other).icon;
  // In a course's own list the course is obvious; elsewhere note it on top.
  const courseLine = t.course && !inCourseList ? COURSE_PREFIX + courseLabel(t.course) : '';
  const notes = [courseLine, t.notes || ''].filter(Boolean).join('\n');
  const g = { title: `${icon} ${t.title}`, notes, status: t.done ? 'completed' : 'needsAction' };
  // Google Tasks keeps only the date part of a due date.
  g.due = t.due ? `${t.due.slice(0, 10)}T00:00:00.000Z` : null;
  return g;
}

function fromGoogleTask(g, existing = {}, listCourse = '') {
  let title = g.title || '';
  let type = existing.type || '';
  for (const [k, v] of Object.entries(TASK_TYPES)) {
    if (title.startsWith(v.icon)) { type = k; title = title.slice(v.icon.length).trim(); break; }
  }
  if (!type) type = /מבחן|מועד/.test(title) ? 'exam' : /בוחן/.test(title) ? 'quiz' : /גיליון|תרגיל|ש"ב|שיעורי/.test(title) ? 'hw' : /פרויקט|מעבדה|דוח/.test(title) ? 'project' : 'other';
  let notes = g.notes || '';
  let course = listCourse || existing.course || '';
  if (notes.startsWith(COURSE_PREFIX)) {
    const [first, ...rest] = notes.split('\n');
    const name = first.slice(COURSE_PREFIX.length).trim();
    const match = courses().find(c => c.name === name);
    if (match && !listCourse) course = match.code;
    notes = rest.join('\n');
  }
  const date = g.due ? g.due.slice(0, 10) : '';
  // Keep the time we had locally if the date didn't change in Google.
  const due = !date ? '' : (existing.due && existing.due.startsWith(date) ? existing.due : date);
  return { title, type, course, notes, due, done: g.status === 'completed' };
}

// Guess which course a task list belongs to from its title (Instinct names them after courses).
function courseForListTitle(title) {
  const t = norm(title);
  if (!t) return '';
  const all = courses();
  const byCode = all.find(c => t.includes(c.code.replace(/^0+/, '')));
  if (byCode) return byCode.code;
  // Prefer courses you're taking now, then the longest name that fits.
  const fits = all.filter(c => {
    const n = norm(c.name);
    return n.length > 2 && (t.includes(n) || n.includes(t));
  }).sort((a, b) => (b.status === 'active') - (a.status === 'active') || norm(b.name).length - norm(a.name).length);
  return fits[0]?.code || '';
}

const GTasks = {
  lists: null, // last fetched [{id, title}]

  ready() { return Sync.connected && Sync.hasScope('tasks') && settings().tasksSync !== false; },

  async fetchLists() {
    const res = await Sync.api(`${TASKS_API}/users/@me/lists?maxResults=100`);
    this.lists = ((await res.json()).items || []).map(l => ({ id: l.id, title: l.title }));
    return this.lists;
  },

  async ensureDefaultList(lists) {
    const st = settings();
    let list = lists.find(l => l.id === st.tasksListId) || lists.find(l => l.title === TASKS_LIST_TITLE);
    if (!list) {
      const created = await Sync.api(`${TASKS_API}/users/@me/lists`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: TASKS_LIST_TITLE }),
      });
      list = await created.json();
      lists.push({ id: list.id, title: list.title });
    }
    if (list.id !== st.tasksListId) Store.putRaw('meta', 'settings', { ...st, tasksListId: list.id, u: Date.now() });
    return list.id;
  },

  // listId -> course code for every list that syncs. Settings can override the
  // guess per list ('' = don't sync that list).
  courseMap(lists) {
    const overrides = settings().taskListMap || {};
    const map = {};
    for (const l of lists) {
      const code = l.id in overrides ? overrides[l.id] : courseForListTitle(l.title);
      if (code) map[l.id] = code;
    }
    return map;
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
      if (method === 'DELETE' && (e.status === 404 || e.status === 410)) return null;
      throw e;
    }
  },

  // Each app task remembers its Google id (gid), list (glist), the app timestamp
  // at last sync (gU) and Google's `updated` at last sync (gUpd). Whichever side
  // moved since then wins; if both did, the newer edit wins.
  async sync() {
    if (!this.ready()) return false;
    const lists = await this.fetchLists();
    const defaultList = await this.ensureDefaultList(lists);
    const map = this.courseMap(lists);
    const listForCourse = Object.fromEntries(Object.entries(map).map(([id, code]) => [code, id]));
    const synced = [...new Set([defaultList, ...Object.keys(map)])];
    const targetFor = r => listForCourse[r.course] || defaultList;

    const byId = {};
    for (const listId of synced) {
      for (const g of await this.listAll(listId)) byId[g.id] = { g, listId };
    }
    const known = new Set();
    let changed = false;
    const stamp = (id, data) => { const now = Date.now(); Store.putRaw('task', id, { ...data, u: now, gU: now }); changed = true; };
    const create = async r => {
      const listId = targetFor(r);
      const created = await this.send(listId, 'POST', null, toGoogleTask(r, listId in map));
      known.add(created.id);
      stamp(r.id, { gid: created.id, glist: listId, gUpd: created.updated });
    };

    for (const r of Object.values(Store.recs).filter(r => r.kind === 'task')) {
      if (r.gid) known.add(r.gid);
      const glist = r.glist || defaultList; // tasks synced before lists existed lived in the default list
      const found = r.gid ? byId[r.gid] : null;

      if (r.del) {
        if (found && !found.g.deleted) { await this.send(found.listId, 'DELETE', r.gid); changed = true; }
        continue;
      }
      if (!r.gid) { await create(r); continue; }
      if (!synced.includes(glist)) {
        // Its list stopped syncing (changed in settings): give it a home in a synced list.
        await create(r);
        continue;
      }
      const appChanged = r.u > (r.gU || 0);
      if (!found || found.g.deleted) {
        // Deleted in Google. Keep it only if you edited it here since the last sync.
        if (appChanged) await create(r);
        else {
          Store.recs[`task:${r.id}`] = { kind: 'task', id: r.id, u: Date.now(), del: true, gid: r.gid };
          Store.persist(); changed = true;
        }
        continue;
      }
      const { g, listId } = found;
      const googleChanged = g.updated !== r.gUpd;
      if (appChanged && (!googleChanged || r.u >= Date.parse(g.updated))) {
        if (targetFor(r) !== listId) {
          // Course changed here: move it to the new course's list.
          await this.send(listId, 'DELETE', r.gid);
          await create(r);
        } else {
          const updated = await this.send(listId, 'PATCH', r.gid, toGoogleTask(r, listId in map));
          stamp(r.id, { glist: listId, gUpd: updated.updated });
        }
      } else if (googleChanged || r.glist !== listId) {
        stamp(r.id, { ...fromGoogleTask(g, r, map[listId] || ''), glist: listId, gUpd: g.updated });
      }
    }

    // Tasks added directly in Google Tasks (by you or by Instinct).
    for (const { g, listId } of Object.values(byId)) {
      if (known.has(g.id) || g.deleted || !(g.title || '').trim()) continue;
      stamp(uid(), { ...fromGoogleTask(g, {}, map[listId] || ''), gid: g.id, glist: listId, gUpd: g.updated });
    }
    if (changed) Store.emit(true);
    return changed;
  },
};

GCal.loadCache();
// Coming back to the app (e.g. after enabling an API in Google Cloud): retry the calendar.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  GCal.fetchedAt = {};
  GCal.lastError = null;
  if (currentView === 'timetable' || currentView === 'settings') render();
});
Sync.hooks.push(() => GTasks.sync());
