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

const Store = {
  recs: {},
  listeners: [],

  load() {
    try { this.recs = JSON.parse(lsGet(LS_RECORDS, '{}')) || {}; } catch { this.recs = {}; }
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
  put(kind, id, data) {
    const key = `${kind}:${id}`;
    const prev = this.recs[key] && !this.recs[key].del ? this.recs[key] : {};
    this.recs[key] = { ...prev, ...data, kind, id, u: Date.now(), del: undefined };
    this.persist();
    this.emit();
    return this.recs[key];
  },
  remove(kind, id) {
    const key = `${kind}:${id}`;
    if (!this.recs[key]) return;
    // Keep the Google Tasks id on the tombstone so the delete reaches Google too.
    this.recs[key] = { kind, id, u: Date.now(), del: true, gid: this.recs[key].gid };
    this.persist();
    this.emit();
  },
  // For sync bookkeeping: writes without triggering another sync round.
  putRaw(kind, id, data) {
    const key = `${kind}:${id}`;
    this.recs[key] = { ...(this.recs[key] || {}), ...data, kind, id };
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
    this.persist();
    this.emit(true);
  },
};

// Returns { merged, localChanged, remoteChanged }.
function mergeRecords(local, remote) {
  const merged = { ...local };
  let localChanged = false, remoteChanged = false;
  for (const [key, r] of Object.entries(remote)) {
    const l = local[key];
    if (!l || r.u > l.u) { merged[key] = r; localChanged = true; }
  }
  for (const [key, l] of Object.entries(local)) {
    const r = remote[key];
    if (!r || l.u > r.u) remoteChanged = true;
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

  get clientId() { return (lsGet(LS_CLIENT_ID, '') || '').trim(); },
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
    } else if (p.get('error')) {
      this.setState('needs-auth', p.get('error') === 'access_denied' ? 'ההרשאה בוטלה' : 'נדרש חיבור מחדש');
    }
  },

  disconnect() {
    const t = this.token();
    if (t) fetch('https://oauth2.googleapis.com/revoke?token=' + t, { method: 'POST' }).catch(() => {});
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

  async findFile() {
    if (this.fileId) return this.fileId;
    const q = encodeURIComponent(`name='${DRIVE_FILE_NAME}'`);
    const res = await this.api(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc`);
    const { files } = await res.json();
    this.fileId = files?.[0]?.id || null;
    return this.fileId;
  },

  async upload(recs) {
    const body = JSON.stringify({ v: 1, savedAt: Date.now(), recs });
    if (this.fileId) {
      await this.api(`https://www.googleapis.com/upload/drive/v3/files/${this.fileId}?uploadType=media`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body,
      });
      return;
    }
    const boundary = 'pp' + uid();
    const meta = JSON.stringify({ name: DRIVE_FILE_NAME, parents: ['appDataFolder'], mimeType: 'application/json' });
    const multipart =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
    const res = await this.api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
      method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipart,
    });
    this.fileId = (await res.json()).id;
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
      let remote = {};
      if (await this.findFile()) {
        const res = await this.api(`https://www.googleapis.com/drive/v3/files/${this.fileId}?alt=media`);
        remote = (await res.json()).recs || {};
      }
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
      if (remoteChanged || hooksChanged || !this.fileId) await this.upload(Store.recs);
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
    if (navigator.onLine && Date.now() - lastTry > 5 * 60_000) {
      lsSet(LS_SILENT_AT, String(Date.now()));
      this.authorize(true);
    } else if (this.state !== 'needs-auth') {
      this.setState('needs-auth', 'פג תוקף החיבור');
    }
    return false;
  },

  start() {
    this.handleRedirect();
    if (!this.clientId || !this.connected) { this.setState('off'); return; }
    Store.onChange(fromRemote => { if (!fromRemote && this.token()) this.schedule(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.ensureToken()) this.syncNow();
    });
    window.addEventListener('online', () => this.syncNow());
    setInterval(() => { if (document.visibilityState === 'visible' && this.token()) this.syncNow(); }, 60_000);
    if (this.ensureToken()) this.syncNow();
  },
};
