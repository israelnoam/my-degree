// Local record store + Google Drive (appDataFolder) sync.
//
// Every piece of data is a record keyed "kind:id" with an update timestamp `u`.
// Deletes are kept as tombstones ({del: true}) so they sync too. Merging two
// copies = per-record "newest wins", so edits on different devices never clobber
// each other unless they touch the same record.

const LS_RECORDS = 'pp_records_v1';
const LS_CLIENT_ID = 'pp_google_client_id';
const LS_TOKEN = 'pp_google_token';
const LS_CONNECTED = 'pp_google_connected';
const LS_LAST_SYNC = 'pp_last_sync';
const LS_SILENT_AT = 'pp_silent_auth_at';
const LS_BACKUP_DAY = 'pp_backup_day';
const BACKUP_PREFIX = 'personal-planner-backup-';
const BACKUPS_KEPT = 7;

const BUILT_IN_CLIENT_ID = '473565270507-slu5h6ngt3sb0210vt975lc1d8ru1k4l.apps.googleusercontent.com';
const DRIVE_FILE_NAME = 'personal-planner.json';
const SCOPES = {
  drive: 'https://www.googleapis.com/auth/drive.appdata',
  calendar: 'https://www.googleapis.com/auth/calendar.readonly',
  tasks: 'https://www.googleapis.com/auth/tasks',
};

function lsGet(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch { return fallback; }
}
function lsSet(key, value) {
  try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch {}
}

function uid() {
  if (window.crypto?.randomUUID) return crypto.randomUUID().slice(0, 12);
  return Math.random().toString(36).slice(2, 14);
}

// Fields that are bookkeeping, not data.
const META_FIELDS = new Set(['kind', 'id', 'u', 'fu', 'del']);
const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const Store = {
  recs: {},
  listeners: [],
  maxU: 0,

  // A timestamp that never goes backwards: if this device's clock is behind the
  // newest edit it has seen, a new edit still counts as newer than that one.
  now() {
    this.maxU = Math.max(Date.now(), this.maxU + 1);
    return this.maxU;
  },
  noteTimes(recs) {
    for (const r of Object.values(recs)) this.maxU = Math.max(this.maxU, r.u || 0);
  },

  load() {
    try { this.recs = cleanRecords(JSON.parse(lsGet(LS_RECORDS, '{}'))); } catch { this.recs = {}; }
    this.noteTimes(this.recs);
  },
  persist() {
    lsSet(LS_RECORDS, JSON.stringify(this.recs));
  },
  onChange(fn) { this.listeners.push(fn); },
  emit(fromRemote = false) { this.listeners.forEach(fn => fn(fromRemote)); },

  get(kind, id) {
    const r = this.recs[`${kind}:${id}`];
    return r && !r.del ? r : null;
  },
  list(kind) {
    return Object.values(this.recs).filter(r => r.kind === kind && !r.del);
  },
  // Each field of a record has its own timestamp (fu), so two devices editing
  // different fields of the same record (or different settings) don't clobber
  // each other. Saving values that didn't change does nothing.
  put(kind, id, data) {
    const key = `${kind}:${id}`;
    const prev = this.recs[key] && !this.recs[key].del ? this.recs[key] : null;
    const changed = Object.keys(data).filter(k => !META_FIELDS.has(k) && (!prev || !sameValue(prev[k], data[k])));
    if (prev && !changed.length) return prev;
    const ts = this.now();
    const fu = { ...(prev ? fieldTimes(prev) : {}) };
    for (const k of changed) fu[k] = ts;
    this.recs[key] = { ...(prev || {}), ...data, kind, id, u: ts, fu, del: undefined };
    this.persist();
    this.emit();
    return this.recs[key];
  },
  // Puts records back exactly as they were (undo / restore a backup), as a fresh edit.
  restore(list) {
    const ts = this.now();
    for (const r of list) {
      const fu = Object.fromEntries(Object.keys(r).filter(k => !META_FIELDS.has(k)).map(k => [k, ts]));
      this.recs[`${r.kind}:${r.id}`] = { ...r, u: ts, fu, del: undefined };
    }
    this.persist();
    this.emit();
  },
  remove(kind, id) {
    const key = `${kind}:${id}`;
    if (!this.recs[key]) return;
    // Keep the Google Tasks id on the tombstone so the delete reaches Google too.
    this.recs[key] = { kind, id, u: this.now(), del: true, gid: this.recs[key].gid };
    this.persist();
    this.emit();
  },
  // For sync bookkeeping: writes without triggering another sync round.
  putRaw(kind, id, data) {
    const key = `${kind}:${id}`;
    const prev = this.recs[key] || {};
    const ts = data.u || Date.now();
    const fu = { ...fieldTimes(prev) };
    for (const k of Object.keys(data)) if (!META_FIELDS.has(k) && !sameValue(prev[k], data[k])) fu[k] = ts;
    this.maxU = Math.max(this.maxU, data.u || 0);
    this.recs[key] = { ...prev, ...data, kind, id, fu };
    this.persist();
    this.emit(true);
    return this.recs[key];
  },
  // Seeds only fill gaps and use u=0, so anything already edited anywhere wins.
  seed(kind, id, data) {
    const key = `${kind}:${id}`;
    if (this.recs[key]) return;
    this.recs[key] = { ...data, kind, id, u: 0 };
  },
  replaceAll(recs) {
    this.recs = recs;
    this.noteTimes(recs);
    this.persist();
    this.emit(true);
  },
};

// Records from Drive or an imported file are untrusted: a malformed one must not
// reach the screens (and then sync to every device). Returns a safe copy, or null.
function cleanRecord(key, r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
  if (typeof r.kind !== 'string' || r.id === undefined || key !== `${r.kind}:${r.id}`) return null;
  if (!Number.isFinite(r.u)) return null;
  const limit = Date.now() + 5 * 60_000; // a clock that runs ahead can't win forever
  r = { ...r, u: Math.min(r.u, limit) };
  if (r.fu && typeof r.fu === 'object') r.fu = Object.fromEntries(Object.entries(r.fu).map(([k, t]) => [k, Math.min(+t || 0, limit)]));
  else delete r.fu;
  if (r.del) return { kind: r.kind, id: r.id, u: r.u, del: true, gid: r.gid };
  const c = { ...r };
  if (c.kind === 'course') {
    if (typeof c.code !== 'string' || typeof c.name !== 'string') return null;
    c.sem = Number.isFinite(+c.sem) ? +c.sem : 0;
    c.credits = Number.isFinite(+c.credits) ? +c.credits : 0;
    c.prereqs = Array.isArray(c.prereqs) ? c.prereqs.map(String) : [];
  } else if (c.kind === 'task') {
    c.title = String(c.title ?? '');
  } else if (c.kind === 'slot') {
    c.day = Number.isFinite(+c.day) ? +c.day : 0;
  }
  return c;
}

function cleanRecords(recs) {
  const out = {};
  for (const [key, r] of Object.entries(recs || {})) {
    const c = cleanRecord(key, r);
    if (c) out[key] = c;
  }
  return out;
}

// When each field was last written. Records written before per-field stamps existed
// (or edited without them) count as written, field by field, at the record's own time.
function fieldTimes(r) {
  const fields = Object.keys(r).filter(k => !META_FIELDS.has(k));
  const fu = r.fu || {};
  const stamped = Math.max(0, ...Object.values(fu));
  const trusted = r.fu && stamped >= (r.u || 0);
  return Object.fromEntries(fields.map(k => [k, trusted ? (fu[k] ?? 0) : (r.u || 0)]));
}

const stable = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().map(n => [n, x[n]])) : x);

// Two copies of one record -> one. A delete (or an undelete) is decided by the
// record's time; two live copies are merged field by field, newest field wins.
function mergeRecord(l, r) {
  if (l.del || r.del) return r.u > l.u ? r : l;
  const lt = fieldTimes(l), rt = fieldTimes(r);
  const out = { kind: l.kind, id: l.id }, fu = {};
  for (const k of new Set([...Object.keys(lt), ...Object.keys(rt)])) {
    const inL = k in lt, inR = k in rt;
    let useR;
    if (!inL) useR = true;
    else if (!inR) useR = false;
    else if (rt[k] !== lt[k]) useR = rt[k] > lt[k];
    else useR = stable(r[k]) > stable(l[k]); // tie: same answer on every device
    out[k] = useR ? r[k] : l[k];
    fu[k] = useR ? rt[k] : lt[k];
  }
  out.u = Math.max(l.u, r.u);
  out.fu = fu;
  return out;
}

// Returns { merged, localChanged, remoteChanged }.
function mergeRecords(local, remoteRaw) {
  const remote = cleanRecords(remoteRaw);
  const merged = { ...local };
  let localChanged = false, remoteChanged = false;
  for (const key of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const l = local[key], r = remote[key];
    if (!r) { remoteChanged = true; continue; }
    if (!l) { merged[key] = r; localChanged = true; continue; }
    const m = mergeRecord(l, r);
    merged[key] = m;
    if (stable(m) !== stable(l)) localChanged = true;
    if (stable(m) !== stable(r)) remoteChanged = true;
  }
  return { merged, localChanged, remoteChanged };
}

const Sync = {
  state: 'off', // off | needs-auth | syncing | ok | error | offline
  message: '',
  fileId: null,
  timer: null,
  running: null,
  listeners: [],
  hooks: [],
  hookError: null, // last error from a hook (Google Tasks), shown in settings

  onStatus(fn) { this.listeners.push(fn); },
  setState(state, message = '') {
    this.state = state; this.message = message;
    this.listeners.forEach(fn => fn(state, message));
  },

  // Built into the app so each device only needs the "connect" tap. A Client ID is
  // a public identifier, not a secret; Google only accepts it from this site's address.
  get clientId() { return (lsGet(LS_CLIENT_ID, '') || BUILT_IN_CLIENT_ID).trim(); },
  set clientId(v) { lsSet(LS_CLIENT_ID, v ? v.trim() : null); },
  get connected() { return lsGet(LS_CONNECTED) === '1'; },
  get lastSync() { return Number(lsGet(LS_LAST_SYNC, 0)); },

  token() {
    try {
      const t = JSON.parse(lsGet(LS_TOKEN, 'null'));
      if (t && t.exp > Date.now() + 30_000) return t.access_token;
    } catch {}
    return null;
  },

  // Scopes the current token actually carries (older connections only had Drive).
  hasScope(name) {
    try { return (JSON.parse(lsGet(LS_TOKEN, 'null'))?.scope || '').includes(SCOPES[name]); } catch { return false; }
  },

  redirectUri() { return location.origin + location.pathname; },

  // Full-page redirect (works inside installed PWAs on iOS, where popups don't).
  authorize(silent = false) {
    if (!this.clientId) { this.setState('off', 'חסר Client ID'); return; }
    const stateToken = uid();
    sessionStorage.setItem('pp_oauth_state', stateToken);
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri(),
      response_type: 'token',
      scope: Object.values(SCOPES).join(' '),
      include_granted_scopes: 'true',
      state: stateToken,
    });
    if (silent) params.set('prompt', 'none');
    location.assign('https://accounts.google.com/o/oauth2/v2/auth?' + params);
  },

  // Called once on startup: picks up a token (or error) from the OAuth redirect.
  handleRedirect() {
    if (!location.hash.includes('state=')) return;
    const p = new URLSearchParams(location.hash.slice(1));
    const expected = sessionStorage.getItem('pp_oauth_state');
    history.replaceState(null, '', location.pathname + location.search);
    if (!expected || p.get('state') !== expected) return;
    sessionStorage.removeItem('pp_oauth_state');
    if (p.get('access_token')) {
      lsSet(LS_TOKEN, JSON.stringify({
        access_token: p.get('access_token'),
        exp: Date.now() + Number(p.get('expires_in') || 3600) * 1000,
        scope: p.get('scope') || '',
      }));
      lsSet(LS_CONNECTED, '1');
      return true;
    } else if (p.get('error')) {
      this.setState('needs-auth', p.get('error') === 'access_denied' ? 'ההרשאה בוטלה' : 'נדרש חיבור מחדש');
    }
  },

  disconnect() {
    const t = this.token();
    if (t) fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: t }),
    }).catch(() => {});
    lsSet(LS_TOKEN, null); lsSet(LS_CONNECTED, null);
    this.fileId = null;
    this.setState('off');
  },

  async api(url, opts = {}) {
    const res = await fetch(url, {
      ...opts,
      headers: { Authorization: 'Bearer ' + this.token(), ...(opts.headers || {}) },
    });
    if (res.status === 401) {
      lsSet(LS_TOKEN, null);
      throw Object.assign(new Error('auth'), { auth: true });
    }
    if (!res.ok) {
      const text = await res.text();
      let err = {};
      try { err = JSON.parse(text).error || {}; } catch {}
      // An API that's switched off in Google Cloud: say which one, with the link that turns it on.
      const disabled = (err.details || []).find(d => d.reason === 'SERVICE_DISABLED');
      if (disabled) {
        throw Object.assign(new Error(`${disabled.metadata?.serviceTitle || 'Google API'} כבוי בפרויקט ב-Google Cloud`), {
          status: res.status, enableUrl: disabled.metadata?.activationUrl,
        });
      }
      throw Object.assign(new Error(`Google ${res.status}: ${err.message || text.slice(0, 200)}`), { status: res.status });
    }
    return res;
  },

  // Always asks Drive (a second device may have created its own file in the meantime).
  // The newest file is the one we use; any others get merged in and then removed.
  async findFile() {
    const q = encodeURIComponent(`name='${DRIVE_FILE_NAME}'`);
    const res = await this.api(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc`);
    const { files = [] } = await res.json();
    this.fileId = files[0]?.id || null;
    this.extraIds = files.slice(1).map(f => f.id);
    return this.fileId;
  },

  async modifiedTime(id) {
    const res = await this.api(`https://www.googleapis.com/drive/v3/files/${id}?fields=modifiedTime`);
    return (await res.json()).modifiedTime;
  },

  // Drive's copy (all files, if there are several) and the time it was last written.
  async download() {
    const modified = await this.modifiedTime(this.fileId);
    let recs = (await (await this.api(`https://www.googleapis.com/drive/v3/files/${this.fileId}?alt=media`)).json()).recs || {};
    for (const id of this.extraIds || []) {
      try {
        const more = (await (await this.api(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`)).json()).recs || {};
        recs = mergeRecords(cleanRecords(recs), more).merged;
      } catch (e) { if (e.auth) throw e; }
    }
    return { recs, modified };
  },

  async createFile(name, body) {
    const boundary = 'pp' + uid();
    const meta = JSON.stringify({ name, parents: ['appDataFolder'], mimeType: 'application/json' });
    // multipart/related needs CRLF line breaks, so they're spelled out.
    const multipart =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
    const res = await this.api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
      method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipart,
    });
    return (await res.json()).id;
  },

  async upload(recs) {
    const body = JSON.stringify({ v: 1, savedAt: Date.now(), recs });
    if (this.fileId) {
      await this.api(`https://www.googleapis.com/upload/drive/v3/files/${this.fileId}?uploadType=media`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body,
      });
    } else {
      this.fileId = await this.createFile(DRIVE_FILE_NAME, body);
    }
    // Duplicate files (two devices created one at the same time) were merged in: remove them.
    for (const id of this.extraIds || []) {
      try { await this.api(`https://www.googleapis.com/drive/v3/files/${id}`, { method: 'DELETE' }); } catch (e) { if (e.auth) throw e; }
    }
    this.extraIds = [];
  },

  // Just before writing, check nobody else wrote since we read. If they did, merge
  // their version in first (up to 3 rounds), so their changes aren't overwritten.
  // A write can still collide in the last fraction of a second; the next sync repairs it.
  async mergeLatestBeforeUpload(readAt) {
    for (let i = 0; i < 3; i++) {
      if (!this.fileId) {
        if (!(await this.findFile())) return;
      } else if (await this.modifiedTime(this.fileId) === readAt) return;
      const again = await this.download();
      readAt = again.modified;
      const m = mergeRecords(Store.recs, again.recs);
      if (m.localChanged) Store.replaceAll(m.merged);
    }
  },

  // A copy of Drive's data as it was before today's first sync, kept for a week
  // (the last 7 days), so a bad delete or import can be undone from settings.
  async dailyBackup(recsBefore) {
    const day = new Date().toISOString().slice(0, 10);
    if (lsGet(LS_BACKUP_DAY) === day || !Object.keys(recsBefore).length) return;
    try {
      const files = await this.listBackups();
      if (!files.some(f => f.name === `${BACKUP_PREFIX}${day}.json`)) {
        await this.createFile(`${BACKUP_PREFIX}${day}.json`, JSON.stringify({ v: 1, savedAt: Date.now(), recs: recsBefore }));
      }
      for (const f of files.slice(BACKUPS_KEPT - 1)) await this.api(`https://www.googleapis.com/drive/v3/files/${f.id}`, { method: 'DELETE' });
      lsSet(LS_BACKUP_DAY, day);
    } catch (e) { if (e.auth) throw e; console.warn('backup', e); }
  },

  async listBackups() {
    const q = encodeURIComponent(`name contains '${BACKUP_PREFIX}'`);
    const res = await this.api(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name)&orderBy=name desc&pageSize=50`);
    return (await res.json()).files || [];
  },

  async fetchBackup(id) {
    const res = await this.api(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`);
    return cleanRecords((await res.json()).recs || {});
  },

  async syncNow() {
    if (this.running) return this.running;
    this.running = this._sync().finally(() => { this.running = null; });
    return this.running;
  },

  async _sync() {
    if (!this.clientId || !this.connected) { this.setState('off'); return; }
    if (!this.token()) { this.setState('needs-auth', 'פג תוקף החיבור'); return; }
    if (!navigator.onLine) { this.setState('offline', 'אין חיבור לאינטרנט'); return; }
    this.setState('syncing');
    try {
      let remote = {}, readAt = null;
      if (await this.findFile()) ({ recs: remote, modified: readAt } = await this.download());
      const { merged, localChanged, remoteChanged } = mergeRecords(Store.recs, remote);
      if (localChanged) Store.replaceAll(merged);
      // Extra syncs (Google Tasks) run between pull and push, so every device
      // sees the same Google ids before it creates anything new.
      let hooksChanged = false;
      this.hookError = null;
      for (const hook of this.hooks) {
        try { hooksChanged = (await hook()) || hooksChanged; } catch (e) {
          if (e.auth) throw e;
          console.warn('sync hook', e);
          this.hookError = e;
        }
      }
      if (remoteChanged || hooksChanged || !this.fileId || this.extraIds?.length) {
        await this.mergeLatestBeforeUpload(readAt);
        await this.upload(Store.recs);
      }
      await this.dailyBackup(remote);
      lsSet(LS_LAST_SYNC, String(Date.now()));
      this.setState('ok');
    } catch (e) {
      if (e.auth) this.setState('needs-auth', 'פג תוקף החיבור');
      else if (!navigator.onLine) this.setState('offline', 'אין חיבור לאינטרנט');
      else { this.fileId = null; this.setState('error', e.message); }
    }
  },

  schedule(delay = 1500) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.syncNow(), delay);
  },

  // Google tokens last ~1h. When one has expired, bounce through Google with
  // prompt=none (no UI if you're still signed in), at most once per 5 minutes so
  // a refusal can't cause a redirect loop; otherwise show the reconnect button.
  ensureToken() {
    if (this.token()) return true;
    const lastTry = Number(lsGet(LS_SILENT_AT, 0));
    // Never navigate away while you're in the middle of something (open dialog,
    // or typing in a field); the sync button will ask again later.
    const busy = document.querySelector('dialog[open]') || document.activeElement?.matches?.('input, textarea, select');
    if (busy) { if (this.state !== 'needs-auth') this.setState('needs-auth', 'פג תוקף החיבור'); return false; }
    if (navigator.onLine && Date.now() - lastTry > 5 * 60_000) {
      lsSet(LS_SILENT_AT, String(Date.now()));
      this.authorize(true);
    } else if (this.state !== 'needs-auth') {
      this.setState('needs-auth', 'פג תוקף החיבור');
    }
    return false;
  },

  // Automatic sync runs once a day: the first time the app is opened (or comes
  // back to the front) on a new day. Everything else is on demand: the sync
  // buttons, or "sync after every change" in settings.
  dailyDue() { return !this.lastSync || ymd(new Date(this.lastSync)) !== ymd(new Date()); },

  start() {
    const justAuthorized = this.handleRedirect();
    if (!this.clientId || !this.connected) { this.setState('off'); return; }
    Store.onChange(fromRemote => {
      if (!fromRemote && settings().syncOnEdit && this.token()) this.schedule();
    });
    const daily = () => { if (this.dailyDue() && this.ensureToken()) this.syncNow(); };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') daily(); });
    window.addEventListener('online', daily);
    if (justAuthorized && this.token()) this.syncNow();
    else if (this.dailyDue()) daily();
    else this.setState('ok');
  },

  // Manual "sync now": gets a fresh token first if the hour-long one ran out.
  syncOrAuth() {
    if (this.ensureToken()) return this.syncNow();
    return Promise.resolve();
  },
};
