// 📓 Notability notebooks, read from Notability's auto-backup folder in Google Drive.
//
// Notability has no API. Its Auto-Backup writes each note as a PDF to Drive, as
// Notability / <semester> / <course> / <sub-folder…> / note.pdf, after you edit a note and go
// back to the library. This file reads that tree (names, dates, thumbnails: never the content),
// links each course folder to a course once, and keeps the backup tidy:
//  • the same note twice in one folder (an edit saved as a new file): the older copy goes to
//    the Drive trash;
//  • notes you deleted in Notability stay in the backup. A "deleted notes check" finds them,
//    and 15 days later the app asks whether to move them to the Drive trash too.
// Both clean-ups use the Drive trash (30 days to restore) and need full Drive access, which is
// asked for only the first time.

const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const NB_FOLDER = 'application/vnd.google-apps.folder';
const LS_NB = 'pp_nb_tree_v1';
const LS_NB_SWEEP = 'pp_nb_sweep';
const LS_NB_NOTIFIED = 'pp_nb_notified';
const NB_GRACE_DAYS = 15;
const NB_STALE_MS = 10 * 60_000;

const NB = {
  tree: null,      // { at, roots: [id], folders: {id: {id, name, parent}}, files: [...] }
  loading: null,
  error: null,
  lastCleanup: 0,  // how many old copies the last scan moved to the trash

  canRead() { return Sync.connected && (Sync.hasScope('notes') || Sync.hasScope('driveWrite')); },
  canWrite() { return Sync.hasScope('driveWrite'); },

  loadCache() {
    if (this.tree) return this.tree;
    try { this.tree = JSON.parse(lsGet(LS_NB, 'null')); } catch { this.tree = null; }
    return this.tree;
  },
  saveCache() { lsSet(LS_NB, JSON.stringify(this.tree)); },

  async listAll(q, fields) {
    const out = [];
    let page = '';
    do {
      const url = `${DRIVE_FILES}?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(`nextPageToken,files(${fields})`)}&pageSize=1000${page ? '&pageToken=' + page : ''}`;
      const data = await (await Sync.api(url)).json();
      out.push(...(data.files || []));
      page = data.nextPageToken || '';
    } while (page);
    return out;
  },

  // Reads the whole backup tree: one request per ~30 folders, so a few seconds at most.
  // interactive: you pressed refresh, so an expired token may bounce through Google to renew.
  async scan(interactive = false) {
    if (this.loading) return this.loading;
    if (!this.canRead() || !(interactive ? Sync.ensureToken() : Sync.token())) return this.tree;
    this.loading = (async () => {
      try {
        const roots = await this.listAll(`name = 'Notability' and mimeType = '${NB_FOLDER}' and 'root' in parents and trashed = false`, 'id,name');
        const folders = {}, files = [];
        let queue = roots.map(r => r.id);
        for (const r of roots) folders[r.id] = { id: r.id, name: r.name, parent: null };
        while (queue.length) {
          const batch = queue.splice(0, 30);
          const q = `(${batch.map(id => `'${id}' in parents`).join(' or ')}) and trashed = false`;
          const items = await this.listAll(q, 'id,name,mimeType,parents,modifiedTime,createdTime,size,thumbnailLink,webViewLink');
          for (const it of items) {
            const parent = (it.parents || []).find(p => batch.includes(p)) || it.parents?.[0];
            if (it.mimeType === NB_FOLDER) { folders[it.id] = { id: it.id, name: it.name, parent }; queue.push(it.id); }
            else files.push({ id: it.id, name: it.name, parent, mod: it.modifiedTime, created: it.createdTime, size: +it.size || 0, thumb: it.thumbnailLink || '', link: it.webViewLink || '' });
          }
        }
        this.tree = { at: Date.now(), roots: roots.map(r => r.id), folders, files };
        this.error = null;
        await this.housekeep();
        this.saveCache();
      } catch (e) {
        this.error = e;
        if (e.auth) Sync.setState('needs-auth', 'פג תוקף החיבור');
      } finally {
        this.loading = null;
      }
      return this.tree;
    })();
    return this.loading;
  },
  refreshIfStale(onDone) {
    this.loadCache();
    if (!this.canRead() || this.loading || this.error) return;
    if (this.tree && Date.now() - this.tree.at < NB_STALE_MS) return;
    this.scan().then(onDone);
  },

  // ---------- duplicates: the same note name twice in one folder ----------
  duplicates() {
    const groups = {};
    for (const f of this.tree?.files || []) (groups[f.parent + '\n' + f.name] ||= []).push(f);
    return Object.values(groups).filter(g => g.length > 1)
      .flatMap(g => g.sort((a, b) => b.mod.localeCompare(a.mod)).slice(1));
  },

  async trash(ids) {
    for (const id of ids) {
      await Sync.api(`${DRIVE_FILES}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) });
      this.tree.files = this.tree.files.filter(f => f.id !== id);
    }
    this.saveCache();
  },

  // After every scan: trash older copies (when allowed), and forget "deleted" marks on notes
  // that were backed up again since (so they weren't deleted after all).
  async housekeep() {
    const dupes = this.duplicates();
    this.lastCleanup = 0;
    if (dupes.length && this.canWrite()) {
      try { await this.trash(dupes.map(f => f.id)); this.lastCleanup = dupes.length; } catch (e) { if (e.auth) throw e; }
    }
    const byId = Object.fromEntries(this.tree.files.map(f => [f.id, f]));
    for (const g of Store.list('nbgone')) {
      const f = byId[g.id];
      if (!f || Date.parse(f.mod) > g.at) Store.remove('nbgone', g.id);
    }
    nbNotify();
  },

  // ---------- where a file belongs ----------
  depth(id) { let d = 0; for (let f = this.tree.folders[id]; f?.parent; f = this.tree.folders[f.parent]) d++; return d; },
  path(id) { const out = []; for (let f = this.tree.folders[id]; f?.parent; f = this.tree.folders[f.parent]) out.unshift(f.name); return out; },

  // Folders that stand for one course: inside a semester folder, or a top folder with no sub-folders.
  courseFolders() {
    const t = this.tree;
    if (!t) return [];
    const kids = {};
    for (const f of Object.values(t.folders)) if (f.parent) (kids[f.parent] ||= []).push(f);
    const out = [];
    for (const top of Object.values(t.folders).filter(f => t.roots.includes(f.parent))) {
      if (kids[top.id]?.length) out.push(...kids[top.id].map(f => ({ ...f, group: top.name })));
      else out.push({ ...top, group: '' });
    }
    return out;
  },
  // The course a folder (or a file's folder) belongs to, from the nearest linked folder above it.
  courseOf(folderId) {
    for (let f = this.tree?.folders[folderId]; f; f = this.tree.folders[f.parent]) {
      const m = Store.get('nbmap', f.id);
      if (m) return m.course ? { code: m.course, folder: f.id } : null;
    }
    return null;
  },
  notesFor(code) {
    if (!this.tree) return [];
    const dupes = new Set(this.duplicates().map(f => f.id));
    return this.tree.files.filter(f => !dupes.has(f.id)).flatMap(f => {
      const c = this.courseOf(f.parent);
      if (!c || c.code !== code) return [];
      const base = this.path(c.folder).length;
      return [{ ...f, cat: this.path(f.parent).slice(base).join(' / ') }];
    });
  },
  countFor(code) { return this.notesFor(code).length; },
  filesUnder(folderId) {
    const inside = id => { for (let f = this.tree.folders[id]; f; f = this.tree.folders[f.parent]) if (f.id === folderId) return true; return false; };
    return this.tree.files.filter(f => inside(f.parent));
  },
};

// ---------- matching folder names to courses ----------
// Folder names are free text: "חדוא 2", "מד״ר ח", "PHY1", "מוצקים 1". Tries, in order:
// Pangea's short course names (PHY1), Hebrew initials (חדו״א = חשבון דיפרנציאלי ואינטגרלי),
// and shared words; numbers in the folder name must appear in the course name.
function nbWords(s) {
  return norm(s).replace(/[’‘]/g, '').replace(/פיסיק/g, 'פיזיק').replace(/(\d+)/g, ' $1 ').split(/\s+/).filter(Boolean);
}
// Short English folder names (PHY1, CAL2…) and the Hebrew word they stand for.
const NB_SHORT = { PHY: 'פיזיקה', CAL: 'חדוא', ALG: 'אלגברה', CHY: 'כימיה', CHM: 'כימיה', GCH: 'כימיה', PYT: 'פייתון', IPY: 'פייתון', SLD: 'מוצקים', DYN: 'דינמיקה', STA: 'סטטיקה', THR: 'תרמודינמיקה', ODE: 'מדר', PDE: 'מדח' };
function nbInitials(name) {
  // A word starting with ו ("and") gives ו plus its next letter: ואינטגרלי → וא.
  return nbWords(name).filter(w => !/^\d+$/.test(w)).map(w => w[0] === 'ו' && w.length > 2 ? w.slice(0, 2) : w[0]).join('');
}
function nbSuggest(folderName) {
  const short = folderName.trim().toUpperCase();
  const m = /^([A-Z]{2,4})(\d)$/.exec(short);
  if (m) {
    const hit = Pangea.index && courses().find(c => Pangea.course(c.code)?.folder.toUpperCase().endsWith('/' + short));
    if (hit) return hit.code;
    // Pangea knows the name but the course number differs (another track): match by its title.
    const pg = Pangea.index && Object.values(Pangea.index).find(e => e.folder.toUpperCase().endsWith('/' + short));
    const viaTitle = pg && nbSuggest(pg.title.replace(/\d{6,8}/g, ''));
    if (viaTitle) return viaTitle;
    // PYT1 = "פייתון 1", or just "פייתון" when the course name has no number.
    const word = NB_SHORT[m[1]];
    return word ? nbSuggest(`${word} ${m[2]}`) || nbSuggest(word) : '';
  }
  const words = nbWords(folderName);
  const nums = words.filter(w => /^\d+$/.test(w));
  let terms = words.filter(w => !/^\d+$/.test(w) && w.length > 1);
  // Track letters ("2ממ", "ח", "מ׳") are noise next to a real name.
  if (terms.some(w => w.length > 2)) terms = terms.filter(w => w.length > 2);
  if (!terms.length) return '';
  let best = '', bestScore = 0;
  for (const c of courses()) {
    const cw = nbWords(c.name), ini = nbInitials(c.name);
    const cnums = cw.filter(w => /^\d+$/.test(w));
    const hit = t => cw.some(w => w === t || (t.length > 2 && w.startsWith(t)) || (t.length > 3 && w.includes(t)) || (w.length > 3 && t.startsWith(w)))
      || (t.length > 1 && ini.startsWith(t));
    let score = terms.filter(hit).length / terms.length;
    if (nums.length) score *= nums.every(n => cnums.includes(n)) ? 1.1 : 0.3;
    else if (cnums.length) score *= 0.95; // "מוצקים" fits "מוצקים 1" a little less than an exact name
    if (score > bestScore) { best = c.code; bestScore = score; }
  }
  return bestScore >= 0.6 ? best : '';
}

// ---------- the Tools section ----------
function nbSectionHtml() {
  const t = NB.loadCache();
  if (!Sync.connected || !NB.canRead()) {
    return `<div class="nb-box"><p class="muted">המחברות מגיעות מהגיבוי האוטומטי של Notability ל-Google Drive (תיקיית <b>Notability</b>).
      ${Sync.connected ? 'צריך אישור אחד לקריאת שמות הקבצים והתיקיות בדרייב (לא את התוכן שלהם).' : 'צריך קודם להתחבר ל-Google.'}</p>
      <button class="btn primary" type="button" id="nbConnect">${Sync.connected ? '🔓 אשר גישה למחברות' : 'התחבר עם Google'}</button></div>`;
  }
  if (!t) return `<div class="nb-box"><p class="muted">${NB.error ? '' : 'טוען את המחברות מהדרייב…'}</p>${NB.error ? errorNote('לא הצלחתי לקרוא את תיקיית Notability', NB.error) : ''}</div>`;
  if (!t.roots.length) return `<div class="nb-box"><p class="muted">לא מצאתי בדרייב תיקייה בשם Notability. ב-Notability: הגדרות ← Auto-Backup ← Google Drive, ואז רענן.</p><button class="btn" type="button" id="nbRefresh">🔄 רענן</button></div>`;

  const folders = NB.courseFolders();
  const unlinked = folders.filter(f => !Store.get('nbmap', f.id)).length;
  const linked = [...new Set(folders.map(f => Store.get('nbmap', f.id)?.course).filter(Boolean))]
    .map(code => ({ code, name: courseLabel(code), n: NB.countFor(code) })).sort((a, b) => a.name.localeCompare(b.name, 'he'));
  const dupes = NB.duplicates().length;
  const due = nbDue();
  const when = new Date(t.at).toLocaleString(LOCALE, { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
  const sweep = Number(lsGet(LS_NB_SWEEP, 0));
  return `<div class="nb-box">
    <div class="row wrap nb-head">
      <span class="muted">${t.files.length} מחברות · ${linked.length} קורסים · עודכן ${when}${NB.loading ? ' · מרענן…' : ''}</span>
      <span class="row wrap">
        <button class="btn small" type="button" id="nbRefresh" ${NB.loading ? 'disabled' : ''}>🔄 רענן</button>
        <button class="btn small ${unlinked ? 'primary' : ''}" type="button" id="nbMap">🔗 שיוך לקורסים${unlinked ? ` (${unlinked} חדשות)` : ''}</button>
        <button class="btn small" type="button" id="nbSweep">${sweep ? '⏳ בדיקת מחיקות פתוחה' : '🧹 בדיקת מחברות שנמחקו'}</button>
        <a class="btn small" href="https://drive.google.com/drive/folders/${esc(t.roots[0])}" target="_blank" rel="noopener">↗ בדרייב</a>
      </span>
    </div>
    ${NB.error ? errorNote('הרענון האחרון נכשל', NB.error) : ''}
    ${due.length ? `<div class="nb-alert"><span>🗑️ <b>${due.length}</b> מחברות נמחקו ב-Notability לפני ${NB_GRACE_DAYS}+ ימים ועדיין בדרייב.</span><button class="btn small primary" type="button" id="nbDue">לטפל</button></div>` : ''}
    ${dupes ? `<div class="nb-alert"><span>📑 <b>${dupes}</b> עותקים ישנים של מחברות שנשמרו מחדש. ${NB.canWrite() ? '' : 'כדי להעביר אותם לסל של הדרייב צריך אישור לגישה מלאה לדרייב (פעם אחת).'}</span>
      <button class="btn small primary" type="button" id="nbDupes">${NB.canWrite() ? 'העבר לסל' : '🔓 אשר ונקה'}</button></div>` : ''}
    ${NB.lastCleanup ? `<p class="muted small">🧹 ${NB.lastCleanup} עותקים ישנים הועברו לסל של הדרייב ברענון האחרון.</p>` : ''}
    ${linked.length ? `<div class="nb-courses">${linked.map(c => `<button type="button" class="btn small" data-nbopen="${esc(c.code)}">📓 ${esc(c.name)} <small>${c.n}</small></button>`).join('')}</div>`
      : '<p class="muted">עוד לא שויכו תיקיות לקורסים. לחץ על "שיוך לקורסים": האפליקציה מציעה התאמה לכל תיקייה, ואתה מאשר.</p>'}
  </div>`;
}

function bindNbSection(root) {
  $('#nbConnect', root)?.addEventListener('click', () => Sync.connected ? Sync.authorize() : connectGoogle());
  $('#nbRefresh', root)?.addEventListener('click', () => { NB.error = null; NB.scan(true).then(() => render()); render(); });
  $('#nbMap', root)?.addEventListener('click', nbMapDialog);
  $('#nbSweep', root)?.addEventListener('click', nbSweepDialog);
  $('#nbDue', root)?.addEventListener('click', nbDueDialog);
  $('#nbDupes', root)?.addEventListener('click', async () => {
    if (!NB.canWrite()) return nbAskWrite();
    try { const n = NB.duplicates().length; await NB.trash(NB.duplicates().map(f => f.id)); toast(`${n} עותקים ישנים הועברו לסל של הדרייב`); }
    catch (e) { toast('לא הצלחתי להעביר לסל: ' + e.message); }
    render();
  });
  $$('[data-nbopen]', root).forEach(b => b.onclick = () => nbCourseDialog(b.dataset.nbopen));
  NB.refreshIfStale(() => { if (currentView === 'tools') render(); });
}

function nbAskWrite() {
  if (!confirm('כדי להעביר קבצים לסל של הדרייב, Google צריך לאשר לאפליקציה גישה מלאה לדרייב (פעם אחת, בכל מכשיר).\nהאפליקציה משתמשת בה רק לקבצים בתיקיית Notability, ורק אחרי שאישרת. ממשיכים?')) return;
  Sync.authorize(false, ['driveWrite']);
}

// ---------- link folders to courses ----------
function nbMapDialog() {
  const folders = NB.courseFolders();
  const groups = {};
  for (const f of folders) (groups[f.group] ||= []).push(f);
  const opts = sel => `<option value="">— לא קורס —</option>` +
    courses().map(c => `<option value="${esc(c.code)}" ${sel === c.code ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  openModal(`
    <h2>🔗 שיוך תיקיות Notability לקורסים</h2>
    <p class="muted">כל תיקייה משויכת פעם אחת. <span class="nb-sug">מוצע</span> = התאמה אוטומטית לפי השם, שעוד לא אישרת. השיוך נשמר לפי התיקייה עצמה, כך ששינוי שם ב-Notability לא שובר אותו.</p>
    <div class="nb-map">
      ${Object.entries(groups).map(([g, list]) => `${g ? `<h4>${esc(g)}</h4>` : ''}${list.map(f => {
        const saved = Store.get('nbmap', f.id);
        const pick = saved ? saved.course : nbSuggest(f.name);
        return `<label class="nb-map-row"><span>📁 ${esc(f.name)} <small class="muted">${NB.filesUnder(f.id).length}</small>${!saved && pick ? ' <span class="nb-sug">מוצע</span>' : ''}</span>
          <select name="${esc(f.id)}">${opts(pick)}</select></label>`;
      }).join('')}`).join('')}
    </div>
    <div class="actions"><button class="btn" value="cancel" formnovalidate>ביטול</button><button class="btn primary" value="save">שמור הכול</button></div>`,
  (action, fd) => {
    if (action !== 'save') return;
    for (const f of folders) Store.put('nbmap', f.id, { course: String(fd.get(f.id) || ''), name: f.name });
    toast('השיוך נשמר');
    render();
  });
}

// ---------- one course's notebooks ----------
function nbCourseDialog(code) {
  nbFilesDialog(`📓 ${esc(courseLabel(code))} <small class="muted">${NB.notesFor(code).length} מחברות</small>`, NB.notesFor(code),
    'נפתח בצפיין של Google Drive. מתעדכן אחרי שעורכים מחברת וחוזרים לספרייה ב-Notability (ורענון כאן).',
    'אין מחברות בתיקיות שמשויכות לקורס הזה.');
}

// A searchable list of Drive files grouped by sub-folder (f.cat), newest first.
function nbFilesDialog(heading, files, hint, empty, extra = '', onReady) {
  const list = [...files].sort((a, b) => b.mod.localeCompare(a.mod));
  const cats = {};
  for (const f of list) (cats[f.cat || 'כללי'] ||= []).push(f);
  const size = n => !n ? '' : ' · ' + (n > 1e6 ? `${(n / 1e6).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1e3))}KB`);
  const row = f => `<a class="nb-note" href="${esc(f.link)}" target="_blank" rel="noopener" data-name="${esc(norm(f.name))}">
      <span class="nb-thumb">${f.thumb ? `<img loading="lazy" referrerpolicy="no-referrer" src="${esc(f.thumb)}" alt="">` : ''}📄</span>
      <span class="nb-meta"><b>${esc(f.name.replace(/\.pdf$/i, ''))}</b><small class="muted">עודכן ${esc(new Date(f.mod).toLocaleDateString(LOCALE, { day: 'numeric', month: 'numeric', year: '2-digit' }))}${size(f.size)}</small></span>
    </a>`;
  openWide(`
    <h2>${heading}</h2>
    ${extra}
    <input type="search" id="nbFilter" placeholder="🔍 חיפוש לפי שם…" style="width:100%;margin:6px 0 4px">
    <p class="muted small">${hint}</p>
    ${Object.entries(cats).sort(([a], [b]) => a === 'כללי' ? -1 : b === 'כללי' ? 1 : a.localeCompare(b, 'he')).map(([cat, files]) =>
      `<details class="nb-cat" open><summary><b>${esc(cat)}</b> <small class="muted">${files.length}</small></summary><div class="nb-grid">${files.map(row).join('')}</div></details>`).join('')
      || `<p class="muted">${empty}</p>`}
    ${closeBtn}`, form => {
    onReady?.(form);
    $$('.nb-thumb img', form).forEach(img => { img.onload = () => img.parentNode.classList.add('has-img'); img.onerror = () => img.remove(); });
    const filter = $('#nbFilter', form);
    filter.oninput = () => {
      const q = norm(filter.value);
      $$('.nb-note', form).forEach(a => { a.hidden = q && !a.dataset.name.includes(q); });
      $$('.nb-cat', form).forEach(d => { d.hidden = !$$('.nb-note:not([hidden])', d).length; });
    };
  });
}

// ---------- each course's own Drive folder (materials, homework, exams…) ----------
// Linked once per course (saved on the course, so it syncs to every device). Opening it reads
// the folder and its sub-folders again when the saved copy is over 10 minutes old.
const LS_CDRIVE = 'pp_cdrive_v1';
const CDrive = {
  cache: null,  // { code: { at, folder, files: [...] } }
  loading: {},
  load() { if (!this.cache) { try { this.cache = JSON.parse(lsGet(LS_CDRIVE, '{}')) || {}; } catch { this.cache = {}; } } return this.cache; },
  save() { lsSet(LS_CDRIVE, JSON.stringify(this.cache)); },
  // Accepts a Drive folder link (…/folders/<id>, ?id=<id>) or a bare id.
  parse(s) {
    s = String(s || '').trim();
    const m = s.match(/folders\/([\w-]{10,})/) || s.match(/[?&]id=([\w-]{10,})/) || s.match(/^([\w-]{20,})$/);
    return m ? m[1] : '';
  },
  entry(code) { const c = courseByCode(code), e = this.load()[code]; return c?.drive && e?.folder === c.drive ? e : null; },
  count(code) { return this.entry(code)?.files.length || 0; },

  async scan(code, interactive = false) {
    const c = courseByCode(code);
    if (!c?.drive || !NB.canRead() || !(interactive ? Sync.ensureToken() : Sync.token())) return;
    if (this.loading[code]) return this.loading[code];
    this.loading[code] = (async () => {
      const names = { [c.drive]: [] }, files = [];
      let queue = [c.drive];
      while (queue.length) {
        const batch = queue.splice(0, 30);
        const q = `(${batch.map(id => `'${id}' in parents`).join(' or ')}) and trashed = false`;
        for (const it of await NB.listAll(q, 'id,name,mimeType,parents,modifiedTime,size,thumbnailLink,webViewLink')) {
          const parent = (it.parents || []).find(p => batch.includes(p));
          if (it.mimeType === NB_FOLDER) { names[it.id] = [...names[parent], it.name]; queue.push(it.id); }
          else files.push({ id: it.id, name: it.name, mod: it.modifiedTime, size: +it.size || 0, thumb: it.thumbnailLink || '', link: it.webViewLink || '', cat: names[parent].join(' / ') });
        }
      }
      this.load()[code] = { at: Date.now(), folder: c.drive, files };
      this.save();
    })().finally(() => { delete this.loading[code]; });
    return this.loading[code];
  },
  refreshIfStale(code, onDone) {
    const e = this.entry(code);
    if (courseByCode(code)?.drive && (!e || Date.now() - e.at > NB_STALE_MS) && !this.loading[code]) this.scan(code).then(onDone, () => {});
  },

  // Folders in your Drive whose name looks like this course (by name or number), Notability's left out.
  async suggest(c) {
    const word = nbWords(c.name).find(w => w.length > 2 && !/^\d+$/.test(w)) || c.name;
    const digits = String(c.code).replace(/^0+/, '');
    const q = `mimeType = '${NB_FOLDER}' and trashed = false and (name contains '${word.replace(/'/g, "\\'")}' or name contains '${digits}')`;
    const found = await NB.listAll(q, 'id,name,modifiedTime');
    const inNotability = new Set(Object.keys(NB.loadCache()?.folders || {}));
    return found.filter(f => !inNotability.has(f.id) && (nbSuggest(f.name) === c.code || f.name.includes(digits)))
      .sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime)).slice(0, 6);
  },
};

function cdriveButtons(c) {
  if (!c.drive) return `<button type="button" class="btn small" data-cdset="${esc(c.code)}" title="קשר לקורס תיקייה מה-Google Drive שלך (חומרים, תרגילים, מבחנים)">📁 תיקיית Drive</button>`;
  const n = CDrive.count(c.code);
  return `<button type="button" class="btn small" data-cdopen="${esc(c.code)}" title="הקבצים בתיקיית הדרייב של הקורס">📁 Drive${n ? ` (${n})` : ''}</button>`;
}
function bindCdrive(root) {
  $$('[data-cdset]', root).forEach(b => b.onclick = () => cdriveLinkDialog(b.dataset.cdset));
  $$('[data-cdopen]', root).forEach(b => b.onclick = () => cdriveDialog(b.dataset.cdopen));
  // Keep the counts fresh for the courses on screen.
  for (const b of $$('[data-cdopen]', root)) CDrive.refreshIfStale(b.dataset.cdopen, () => { if (currentView === 'tools') render(); });
}

function cdriveNeedsAccess() {
  if (NB.canRead()) return false;
  if (confirm('כדי לקרוא את תיקיות הדרייב, Google צריך לאשר לאפליקציה לראות שמות של קבצים ותיקיות (לא את התוכן שלהם). להמשיך?')) Sync.connected ? Sync.authorize() : connectGoogle();
  return true;
}

function cdriveLinkDialog(code) {
  const c = courseByCode(code);
  if (!c || cdriveNeedsAccess()) return;
  openModal(`
    <h2>📁 תיקיית Drive · ${esc(c.name)}</h2>
    <p class="muted">תיקייה מה-Google Drive שלך עם החומרים של הקורס. הקבצים שלה (כולל תתי-תיקיות) יופיעו כאן ויתעדכנו לבד. קריאה בלבד: שום דבר לא משתנה בדרייב.</p>
    <div id="cdSug" class="nb-map"><p class="muted small">מחפש בדרייב תיקיות שמתאימות לקורס…</p></div>
    <label class="field"><span class="field-label">או הדבק קישור לתיקייה</span><input name="url" dir="ltr" value="${c.drive ? `https://drive.google.com/drive/folders/${esc(c.drive)}` : ''}" placeholder="https://drive.google.com/drive/folders/…"></label>
    <p class="bad small" id="cdErr"></p>
    <div class="actions">
      ${c.drive ? '<button class="btn danger" value="remove" formnovalidate>נתק תיקייה</button>' : ''}
      <button class="btn" value="cancel" formnovalidate>ביטול</button>
      <button class="btn primary" value="save">שמור</button>
    </div>`, (action, fd) => {
    if (action === 'remove') { Store.put('course', code, { drive: '' }); render(); return; }
    if (action !== 'save') return;
    const id = String(fd.get('pick') || '') || CDrive.parse(fd.get('url'));
    if (!id) { $('#cdErr').textContent = 'בחר תיקייה מהרשימה או הדבק קישור לתיקייה בדרייב (…/folders/…).'; return false; }
    Store.put('course', code, { drive: id });
    CDrive.scan(code, true).then(() => { toast('התיקייה קושרה לקורס'); render(); }).catch(e => toast('לא הצלחתי לקרוא את התיקייה: ' + e.message));
  }, form => {
    CDrive.suggest(c).then(list => {
      const box = $('#cdSug', form);
      if (!box) return;
      box.innerHTML = list.length ? `<h4>נמצאו בדרייב</h4>${list.map((f, i) => `<label class="check nb-map-row"><input type="radio" name="pick" value="${esc(f.id)}" ${f.id === c.drive || (!c.drive && i === 0) ? 'checked' : ''}>
          <span>📁 ${esc(f.name)} <small class="muted">עודכן ${esc(new Date(f.modifiedTime).toLocaleDateString(LOCALE))}</small></span>
          <a class="btn small" href="https://drive.google.com/drive/folders/${esc(f.id)}" target="_blank" rel="noopener">↗</a></label>`).join('')}
          <label class="check nb-map-row"><input type="radio" name="pick" value=""> <span>אף אחת מאלה (הקישור למטה)</span></label>`
        : '<p class="muted small">לא מצאתי תיקייה עם שם הקורס או המספר שלו. הדבק קישור למטה.</p>';
    }).catch(e => { const box = $('#cdSug', form); if (box) box.innerHTML = `<p class="bad small">החיפוש בדרייב נכשל: ${esc(e.message)}</p>`; });
  });
}

function cdriveDialog(code) {
  const c = courseByCode(code);
  if (!c?.drive || cdriveNeedsAccess()) return;
  const e = CDrive.entry(code);
  const when = e ? new Date(e.at).toLocaleString(LOCALE, { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  nbFilesDialog(`📁 ${esc(c.name)} <small class="muted">${e ? e.files.length + ' קבצים' : 'טוען…'}</small>`, e?.files || [],
    `נפתח בצפיין של Google Drive.${when ? ` עודכן ${when}.` : ''}`, e ? 'התיקייה ריקה.' : 'קורא את התיקייה מהדרייב…',
    `<div class="row wrap"><button type="button" class="btn small" id="cdRefresh">🔄 רענן</button>
      <a class="btn small" href="https://drive.google.com/drive/folders/${esc(c.drive)}" target="_blank" rel="noopener">↗ פתח בדרייב</a>
      <button type="button" class="btn small" id="cdChange">⚙️ החלף תיקייה</button></div>`,
    form => {
      const again = () => { if ($('#modal').open && $('#cdRefresh')) { $('#modal').close(); cdriveDialog(code); } };
      $('#cdRefresh', form).onclick = () => { $('#cdRefresh', form).disabled = true; CDrive.scan(code, true).then(() => { again(); render(); }, err => toast('הרענון נכשל: ' + err.message)); };
      $('#cdChange', form).onclick = () => { $('#modal').close(); setTimeout(() => cdriveLinkDialog(code), 30); };
      if (!e || Date.now() - e.at > NB_STALE_MS) CDrive.scan(code).then(() => { again(); render(); }, () => {});
    });
}

// ---------- notes deleted in Notability ----------
// The backup never says a note was deleted: its last copy just stays. But when you change the
// Auto-Backup settings, Notability backs up every note again. So: note the time, have Notability
// back everything up, and whatever wasn't written since is a note that no longer exists there.
function nbSweepDialog() {
  const started = Number(lsGet(LS_NB_SWEEP, 0));
  if (!started) {
    openModal(`
      <h2>🧹 בדיקת מחברות שנמחקו</h2>
      <p class="muted">מחברת שמחקת ב-Notability נשארת בגיבוי בדרייב. הבדיקה מוצאת אותן כך:</p>
      <ol class="muted"><li>לחץ "התחל" כאן.</li>
        <li>ב-Notability: הגדרות ← Auto-Backup ← שנה את <b>File Format</b> והחזר אותו ל-PDF (או כבה והדלק). זה מגבה מחדש את כל המחברות.</li>
        <li>חכה שהגיבוי יסתיים (בתיקייה בדרייב לא נוספים יותר קבצים), וחזור לכאן ללחוץ "הגיבוי הסתיים".</li></ol>
      <p class="muted">מחברות שלא גובו מחדש יסומנו כמחוקות. אחרי ${NB_GRACE_DAYS} ימים תקבל התראה ותחליט אם להעביר אותן לסל של הדרייב. אם בינתיים המחברת תגובה שוב, הסימון יורד ממנה.</p>
      <div class="actions"><button class="btn" value="cancel" formnovalidate>ביטול</button><button class="btn primary" value="start">התחל</button></div>`,
    action => { if (action === 'start') { lsSet(LS_NB_SWEEP, String(Date.now())); render(); } });
    return;
  }
  openModal(`
    <h2>⏳ בדיקת מחיקות פתוחה</h2>
    <p class="muted">התחלת ב-${esc(new Date(started).toLocaleString(LOCALE))}. אחרי שהגיבוי המלא ב-Notability הסתיים, לחץ "הגיבוי הסתיים".</p>
    <p class="bad small" id="nbSweepErr"></p>
    <div class="actions"><button class="btn danger" value="abort" formnovalidate>בטל בדיקה</button><button class="btn" value="cancel" formnovalidate>אחר כך</button><button class="btn primary" value="finish">הגיבוי הסתיים</button></div>`,
  action => {
    if (action === 'abort') { lsSet(LS_NB_SWEEP, null); render(); return; }
    if (action !== 'finish') return;
    nbFinishSweep(started).then(msg => { $('#nbSweepErr') && ($('#nbSweepErr').textContent = msg || ''); if (!msg) { $('#modal').close(); render(); } });
    return false;
  });
}
async function nbFinishSweep(started) {
  await NB.scan(true);
  if (!NB.tree || NB.error) return 'לא הצלחתי לקרוא את הדרייב. נסה שוב.';
  const dupes = new Set(NB.duplicates().map(f => f.id));
  const files = NB.tree.files.filter(f => !dupes.has(f.id));
  const stale = files.filter(f => Date.parse(f.mod) < started);
  // Safety: if most notes weren't re-written, the full backup didn't run (yet). Mark nothing.
  if (!files.length || stale.length > files.length / 2) {
    return `רק ${files.length - stale.length} מתוך ${files.length} מחברות גובו מאז שהתחלת, כך שנראה שהגיבוי המלא עוד לא רץ או לא הסתיים. לא סימנתי כלום. חכה עוד קצת ונסה שוב.`;
  }
  const now = Date.now();
  for (const f of stale) {
    if (Store.get('nbgone', f.id)) continue;
    Store.put('nbgone', f.id, { name: f.name, path: NB.path(f.parent).join(' / '), at: now });
  }
  lsSet(LS_NB_SWEEP, null);
  toast(stale.length ? `${stale.length} מחברות סומנו כמחוקות. תקבל תזכורת בעוד ${NB_GRACE_DAYS} ימים.` : 'לא נמצאו מחברות שנמחקו ✓');
  return '';
}

// Deleted notes whose 15 days are up, still in the backup, and not marked "keep".
function nbDue() {
  NB.loadCache();
  const exists = new Set((NB.tree?.files || []).map(f => f.id));
  const limit = Date.now() - NB_GRACE_DAYS * MS_DAY;
  return Store.list('nbgone').filter(g => !g.keep && g.at <= limit && exists.has(g.id));
}

function nbDueDialog() {
  const due = nbDue();
  if (!due.length) return toast('אין מחברות שמחכות להחלטה');
  openModal(`
    <h2>🗑️ מחברות שנמחקו ב-Notability</h2>
    <p class="muted">הן נמחקו ב-Notability לפני ${NB_GRACE_DAYS} ימים ויותר, אבל הגיבוי שלהן עדיין בדרייב. מה שתסמן יעבור לסל של הדרייב (אפשר לשחזר משם 30 יום). מה שלא תסמן יישאר, ולא תישאל עליו שוב.</p>
    <div class="nb-map">${due.map(g => `<label class="check nb-map-row"><input type="checkbox" name="del" value="${esc(g.id)}" checked>
      <span>📄 ${esc(g.name)} <small class="muted">${esc(g.path)}</small></span></label>`).join('')}</div>
    ${NB.canWrite() ? '' : '<p class="muted small">🔓 בפעם הראשונה Google יבקש לאשר גישה מלאה לדרייב. אחרי האישור, פתח שוב את החלון הזה.</p>'}
    <div class="actions"><button class="btn" value="cancel" formnovalidate>אחר כך</button><button class="btn primary" value="apply">העבר את המסומנות לסל</button></div>`,
  (action, fd) => {
    if (action !== 'apply') return;
    if (!NB.canWrite()) { nbAskWrite(); return; }
    const chosen = new Set(fd.getAll('del'));
    (async () => {
      try {
        await NB.trash([...chosen]);
        for (const g of due) chosen.has(g.id) ? Store.remove('nbgone', g.id) : Store.put('nbgone', g.id, { keep: true });
        toast(`${chosen.size} מחברות הועברו לסל של הדרייב`);
      } catch (e) { toast('לא הצלחתי להעביר לסל: ' + e.message); }
      render(); updateBell();
    })();
  });
}

// A device notification once a day while something waits (when notifications are on).
function nbNotify() {
  const due = nbDue();
  if (typeof updateBell === 'function') updateBell();
  if (!due.length || lsGet(LS_NB_NOTIFIED) === ymd(new Date())) return;
  if (lsGet(NOTIF_LS) !== '1' || window.Notification?.permission !== 'granted') return;
  lsSet(LS_NB_NOTIFIED, ymd(new Date()));
  new Notification('🗑️ מחברות שנמחקו ב-Notability', { body: `${due.length} מחברות עדיין בדרייב. למחוק גם משם?`, icon: 'icons/icon-192.png' });
}

// Check in the background once the app is up, so the reminder comes even if you never open Tools.
window.addEventListener('load', () => setTimeout(() => NB.refreshIfStale(() => { if (currentView === 'tools') render(); }), 4000));
