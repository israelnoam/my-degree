// 🧰 Tools tab: Technion sites (pin / hide / search / your own links), links for each
// course you're taking, the Pangea (פנגייה) summaries, and "my apps" (the formula sheet).

const TOOL_LINKS = [
  // [id, group, title, description, url, emoji, brand colour, own logo file (optional)]
  ['moodle', 'study', 'Moodle', 'אתרי הקורסים: חומרים, הגשות והודעות', 'https://moodle26.technion.ac.il', '📚', '#f98012', 'icons/logos/moodle.png'],
  ['panopto', 'study', 'Panopto', 'הקלטות הרצאות ותרגולים', 'https://panoptotech.cloud.panopto.eu', '🎬', '#36b37e'],
  ['cheesefork', 'study', 'CheeseFork', 'בניית מערכת שעות, מועדי בחינות וחוות דעת', 'https://cheesefork.cf', '🧀', '#f2c94c'],
  ['pangea', 'study', 'פנגייה', 'סיכומים ודפי נוסחאות של סטודנטים, לפי קורס', 'https://idofangbentov.uk', '💧', '#3b82f6'],
  ['zoom', 'study', 'Zoom טכניון', 'שיעורים ושעות קבלה בזום', 'https://technion.zoom.us', '🎥', '#2d8cff'],
  ['library', 'study', 'הספרייה המרכזית', 'מאגרים, ספרים ובחינות קודמות', 'https://library.technion.ac.il/he/', '🏛️', '#7c5cff'],
  ['bookme', 'study', 'BookMe', 'הזמנת חדרי לימוד בקמפוס', 'https://bookme.technion.ac.il/booked/Web/calendar.php', '🚪', '#14b8a6'],

  ['grades', 'admin', 'ציונים', 'ציונים, סריקות מבחנים וערעורים', 'https://grades.technion.ac.il', '💯', '#ef4444'],
  ['sap', 'admin', 'SAP · שירותים לסטודנט', 'אישורים, תדפיס ציונים וכרטיס נבחן', 'https://portalex.technion.ac.il/irj/portal/external', '🧾', '#0a6ed1'],
  ['catalog', 'admin', 'קטלוג הקורסים', 'סילבוס, דרישות קדם ונקודות של כל קורס', 'https://students.technion.ac.il', '🔎', '#64748b'],
  ['ugportal', 'admin', 'לימודי הסמכה', 'רישום לקורסים, נהלים, בקשות וטפסים', 'https://ugportal.technion.ac.il', '📝', '#0f766e'],
  ['calendar', 'admin', 'לוח שנה אקדמי', 'תחילת סמסטר, חופשות ותקופות בחינות', 'https://calendars.technion.ac.il', '🗓️', '#a855f7'],
  ['faculty', 'admin', 'הפקולטה להנדסת מכונות', 'אתר הפקולטה: מזכירות, תוכניות לימודים והודעות', 'https://meeng.technion.ac.il', '⚙️', '#1e3a8a'],

  ['mail', 'campus', 'דואר טכניון', 'תיבת הדואר של הקמפוס (Outlook)', 'https://outlook.office.com/mail', '✉️', '#0078d4'],
  ['software', 'campus', 'תוכנות לסטודנטים', 'MATLAB, SolidWorks, Office ועוד, בחינם', 'https://cis.technion.ac.il/software/', '💿', '#475569'],
  ['map', 'campus', 'מפת הקמפוס', 'מציאת בניינים וחדרים', 'https://experience.arcgis.com/experience/27fc08af23f646b396852c7b5b287e69/', '🗺️', '#16a34a'],
  ['phonebook', 'campus', 'ספר טלפונים', 'אנשי סגל ויחידות', 'https://my.technion.ac.il/phonebook', '☎️', '#78716c'],
  ['sport', 'campus', 'מרכז הספורט', 'מנוי, חוגים ושעות פתיחה', 'https://www.sport-tc.com/', '🏋️', '#ea580c'],
  ['asat', 'campus', 'אגודת הסטודנטים', 'זכויות סטודנטים, מלגות ואירועים', 'https://www.asat.org.il/', '🤝', '#db2777'],

  ['atidim-career', 'career', 'קריירה · עתידים', 'הפלטפורמה של רכזת הקריירה: מדריך, דגשים לקו״ח וראיונות', 'https://careeratidim2.netlify.app', '🚀', '#0284c7'],
  ['gitready', 'career', 'GitReady', 'סידור הפרויקטים שלך ב-GitHub לתיק עבודות', 'https://gitready-alpha.vercel.app/', '🐙', '#24292f'],
];
const TOOL_GROUPS = { pinned: '📌 מוצמדים', study: '📖 לימודים', admin: '🧾 מנהלה וציונים', campus: '🏫 קמפוס ושירותים', career: '💼 קריירה', mine: '⭐ הקישורים שלי' };

let toolsQuery = '';
let toolsShowHidden = false;

const toolsPrefs = () => ({ pinned: settings().toolsPinned || [], hidden: settings().toolsHidden || [] });
const customLinks = () => Store.list('link').sort((a, b) => (a.u || 0) - (b.u || 0));
function allToolLinks() {
  const base = TOOL_LINKS.map(([id, group, title, desc, url, emoji, color, logo]) => ({ id, group, title, desc, url, emoji, color, logo }));
  return base.concat(customLinks().map(l => ({ id: 'my:' + l.id, rid: l.id, group: 'mine', title: l.title, desc: l.desc || '', url: l.url, emoji: l.emoji || '🔗', color: '#64748b' })));
}

// My learning app: the live site, and its source folder on the PC. A web page can't open a
// local folder (browsers block file:// links), so the folder opens in VS Code or by its copied path.
const LEARNING_APP = {
  url: 'https://noam-learning-app.israelnoam2001.workers.dev/',
  folder: 'C:\\Users\\israe\\learning-app',
  vscode: 'vscode://file/C:/Users/israe/learning-app',
};

function toolLogo(l) {
  // The site's own icon is the most recognisable; the emoji tile shows if it can't load.
  let host = '';
  try { host = new URL(l.url).hostname; } catch {}
  const src = l.logo || (host ? `https://www.google.com/s2/favicons?domain=${host}&sz=64` : '');
  return `<span class="tl-logo" style="--brand:${esc(l.color)}"><span class="tl-emoji">${esc(l.emoji)}</span>${src ? `<img src="${esc(src)}" alt="">` : ''}</span>`;
}
// Google answers unknown sites with a 16px globe: keep the emoji then. (No inline handlers: CSP.)
function bindToolLogos(root) {
  $$('.tl-logo img', root).forEach(img => {
    const done = () => { if (img.naturalWidth > 16) img.parentNode.classList.add('has-img'); else img.remove(); };
    if (img.complete) done(); else { img.onload = done; img.onerror = () => img.remove(); }
  });
}

function toolCard(l, prefs) {
  const pinned = prefs.pinned.includes(l.id), hidden = prefs.hidden.includes(l.id);
  return `<div class="tl-card ${hidden ? 'is-hidden' : ''}" style="--brand:${esc(l.color)}">
    <a class="tl-main" href="${esc(l.url)}" target="_blank" rel="noopener">
      ${toolLogo(l)}
      <span class="tl-text"><b>${esc(l.title)}</b><small>${esc(l.desc)}</small></span>
    </a>
    <div class="tl-acts">
      <button type="button" class="${pinned ? 'on' : ''}" data-tpin="${esc(l.id)}" title="${pinned ? 'בטל הצמדה' : 'הצמד למעלה'}">📌</button>
      <button type="button" data-thide="${esc(l.id)}" title="${hidden ? 'הצג שוב' : 'הסתר'}">${hidden ? '👁️' : '🙈'}</button>
      ${l.rid ? `<button type="button" data-tedit="${esc(l.rid)}" title="ערוך">✏️</button>` : ''}
    </div>
  </div>`;
}

function toolsMatch(...parts) {
  const q = toolsQuery.trim().toLowerCase();
  return !q || parts.some(p => String(p || '').toLowerCase().includes(q));
}

function renderTools(root) {
  const prefs = toolsPrefs();
  const links = allToolLinks().filter(l => toolsMatch(l.title, l.desc, l.url));
  const visible = l => toolsShowHidden || !prefs.hidden.includes(l.id);
  const hiddenCount = prefs.hidden.length;
  const section = (key, list) => list.length ? `<h3 class="tl-group">${TOOL_GROUPS[key]}</h3><div class="tl-grid">${list.map(l => toolCard(l, prefs)).join('')}</div>` : '';
  const pinned = prefs.pinned.map(id => links.find(l => l.id === id)).filter(Boolean).filter(visible);
  const byGroup = g => links.filter(l => l.group === g && !prefs.pinned.includes(l.id) && visible(l));

  const active = courses().filter(c => c.status === 'active' && toolsMatch(c.name, c.code));
  root.innerHTML = `
    <section class="panel tools-panel">
      <div class="toolbar">
        <div><h2>🧰 כלים</h2><p class="muted">כל אתרי הטכניון במקום אחד, קישורים לכל קורס, והאפליקציות שלך.</p></div>
        <div class="row wrap">
          <input id="toolsSearch" type="search" placeholder="🔍 חיפוש אתר או קורס…" value="${esc(toolsQuery)}" style="width:220px">
          <button class="btn" id="toolsAdd" type="button">＋ קישור משלי</button>
          ${hiddenCount ? `<button class="btn ${toolsShowHidden ? 'on' : ''}" id="toolsHidden" type="button">${toolsShowHidden ? 'הסתר מוסתרים' : `הצג מוסתרים (${hiddenCount})`}</button>` : ''}
        </div>
      </div>

      <h3 class="tl-group">🧪 האפליקציות שלי</h3>
      <div class="tl-grid">
        <button type="button" class="tl-card tl-app" data-go="formula" style="--brand:#1d4ed8">
          <span class="tl-main"><span class="tl-logo has-emoji" style="--brand:#1d4ed8"><span class="tl-emoji">📐</span></span>
          <span class="tl-text"><b>מחולל נוסחאונים</b><small>נוסחאון מותאם לקורס, ב-LaTeX ובסגנון שלך. עריכה עם AI וייצוא ל-PDF.</small></span></span>
          <span class="tl-badge">${Store.list('sheet').length || 'חדש'}</span>
        </button>
        <button type="button" class="tl-card tl-app" data-go="cv" style="--brand:#0f766e">
          <span class="tl-main"><span class="tl-logo" style="--brand:#0f766e"><span class="tl-emoji">📄</span></span>
          <span class="tl-text"><b>מחולל קורות חיים</b><small>פרופיל אחד וגרסה מותאמת לכל משרה, עם AI. ייבוא קו״ח קיים והשכלה מהתואר.</small></span></span>
        </button>
        <div class="tl-card tl-app" style="--brand:#7c3aed">
          <a class="tl-main" href="${LEARNING_APP.url}" target="_blank" rel="noopener">
            <span class="tl-logo has-img" style="--brand:#7c3aed"><img src="icons/logos/learning-app.svg" alt=""></span>
            <span class="tl-text"><b>אפליקציית הלמידה שלי</b><small>נפתחת בלשונית חדשה. התיקייה במחשב: <span dir="ltr" translate="no">${esc(LEARNING_APP.folder)}</span></small></span>
          </a>
          <div class="tl-app-acts">
            <a class="btn small" href="${LEARNING_APP.vscode}" title="פותח את תיקיית הפרויקט ב-VS Code (במחשב הזה)">💻 VS Code</a>
            <button class="btn small" type="button" id="copyLearnPath" title="מעתיק את נתיב התיקייה, להדבקה בסייר הקבצים">📁 העתק נתיב</button>
          </div>
        </div>
      </div>

      ${pinned.length ? section('pinned', pinned) : ''}

      <h3 class="tl-group">📖 הקורסים שלי הסמסטר</h3>
      ${active.length ? `<div class="tl-courses">${active.map(courseToolsRow).join('')}</div>`
        : `<p class="muted">${toolsQuery ? 'אין קורס בלימוד שמתאים לחיפוש.' : 'סמן קורסים כ"בלימוד" במפת הקורסים, והקישורים שלהם (Moodle, Panopto, CheeseFork, פנגייה) יופיעו כאן.'}</p>`}

      <h3 class="tl-group">📓 מחברות Notability</h3>
      ${nbSectionHtml()}

      ${['study', 'admin', 'campus', 'career', 'mine'].map(g => section(g, byGroup(g))).join('')}
      ${!links.length ? '<p class="muted">לא נמצאו אתרים שמתאימים לחיפוש.</p>' : ''}
    </section>`;

  bindToolLogos(root);
  const search = $('#toolsSearch', root);
  search.oninput = () => { toolsQuery = search.value; const pos = search.selectionStart; render(); const s = $('#toolsSearch'); s.focus(); s.setSelectionRange(pos, pos); };
  $('#toolsAdd', root).onclick = () => editCustomLink();
  $('#copyLearnPath', root).onclick = () => navigator.clipboard.writeText(LEARNING_APP.folder)
    .then(() => toast('הנתיב הועתק. הדבק בשורת הכתובת של סייר הקבצים (Win+E)'))
    .catch(() => prompt('נתיב התיקייה:', LEARNING_APP.folder));
  if ($('#toolsHidden', root)) $('#toolsHidden', root).onclick = () => { toolsShowHidden = !toolsShowHidden; render(); };
  $$('[data-tpin]', root).forEach(b => b.onclick = () => toggleToolPref('toolsPinned', b.dataset.tpin));
  $$('[data-thide]', root).forEach(b => b.onclick = () => toggleToolPref('toolsHidden', b.dataset.thide));
  $$('[data-tedit]', root).forEach(b => b.onclick = () => editCustomLink(b.dataset.tedit));
  $$('[data-pzip]', root).forEach(b => b.onclick = () => pangeaZip(b.dataset.pzip, b));
  bindPanopto(root);
  bindNbSection(root);
  bindCdrive(root);
  $$('[data-opensheet]', root).forEach(b => b.onclick = () => { fsOpenId = b.dataset.opensheet; go('formula'); });
  $$('[data-newsheet]', root).forEach(b => b.onclick = () => { go('formula'); fsNewSheet(b.dataset.newsheet); });

  // Fill in the Pangea links once the site's index arrives.
  if (active.length && !Pangea.index) Pangea.load().then(() => { if (currentView === 'tools') render(); }).catch(() => {});
}

function toggleToolPref(key, id) {
  const list = settings()[key] || [];
  Store.put('meta', 'settings', { [key]: list.includes(id) ? list.filter(x => x !== id) : [...list, id] });
  render();
}

function editCustomLink(rid) {
  const l = rid ? Store.get('link', rid) : null;
  openModal(`
    <h2>${l ? '✏️ עריכת קישור' : '＋ קישור משלי'}</h2>
    <label class="field"><span class="field-label">שם</span><input name="title" required value="${esc(l?.title || '')}" placeholder="למשל: קבוצת הלימוד בדרייב"></label>
    <label class="field"><span class="field-label">כתובת</span><input name="url" type="url" required dir="ltr" value="${esc(l?.url || '')}" placeholder="https://"></label>
    <label class="field"><span class="field-label">תיאור קצר (לא חובה)</span><input name="desc" value="${esc(l?.desc || '')}"></label>
    <label class="field"><span class="field-label">אימוג׳י (אם אין לוגו)</span><input name="emoji" value="${esc(l?.emoji || '🔗')}" style="width:80px"></label>
    <div class="actions">
      ${l ? '<button class="btn danger" value="delete" formnovalidate>מחק</button>' : ''}
      <button class="btn" value="cancel" formnovalidate>ביטול</button>
      <button class="btn primary" value="save">שמור</button>
    </div>`, (action, fd) => {
    const id = rid || uid();
    if (action === 'delete') { Store.remove?.('link', id); render(); return; }
    let url = String(fd.get('url') || '').trim();
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    Store.put('link', id, { title: String(fd.get('title')).trim(), url, desc: String(fd.get('desc') || '').trim(), emoji: String(fd.get('emoji') || '🔗').trim() });
    render();
  });
}

// One row per course you're taking: the course's own pages on each site.
function courseToolsRow(c) {
  const c8 = toCode8(c.code);
  const pg = Pangea.course(c.code);
  const sheet = Store.list('sheet').find(s => s.course === c.code);
  const links = [
    ['<img class="btn-logo" src="icons/logos/moodle.png" alt=""> Moodle', `https://moodle26.technion.ac.il/course/search.php?search=${c8}`],
    [`🎬 Panopto${c.panopto ? ' 📁' : ''}`, panoptoUrl(c)],
    ['🧀 CheeseFork', `https://cheesefork.cf/course/${c.code}`],
    ['🔎 קטלוג', `https://students.technion.ac.il/local/technionsearch/course/${c8}`],
  ];
  return `<div class="tl-course">
    <div class="tl-cname"><b>${esc(c.name)}</b> <small class="muted" dir="ltr">${esc(c.code)}</small></div>
    <div class="link-row">
      ${links.map(([l, u]) => `<a class="btn small" href="${esc(u)}" target="_blank" rel="noopener">${l}</a>`).join('')}
      <form class="tl-psearch" data-psearch="${esc(c.code)}" title="${c.panopto ? 'חיפוש בהקלטות של הקורס: גם במה שנאמר (כתוביות) ובשקפים' : 'חיפוש ב-Panopto לפי שם הקורס. לחיפוש בתוך תיקיית הקורס, קבע תיקייה (⚙️)'}">
        <input type="search" placeholder="🔎 חיפוש בהקלטות…" aria-label="חיפוש בהקלטות של ${esc(c.name)}">
        <button type="button" class="btn small" data-pfolder="${esc(c.code)}" title="${c.panopto ? 'תיקיית Panopto של הקורס (שינוי / הסרה)' : 'קבע את תיקיית Panopto של הקורס (לא חובה)'}">⚙️</button>
      </form>
      ${pg ? `<a class="btn small" href="${esc(pg.root)}" target="_blank" rel="noopener" title="${pg.pages.length} דפי סיכום">💧 פנגייה</a>
              <button type="button" class="btn small" data-pzip="${esc(c.code)}" title="מוריד את כל ${pg.pages.length} הדפים של הקורס, כל דף כ-PDF, בקובץ ZIP אחד">⬇️ ZIP (${pg.pages.length})</button>`
        : Pangea.index ? '' : '<span class="muted small">💧 בודק בפנגייה…</span>'}
      ${NB.countFor(c.code) ? `<button type="button" class="btn small" data-nbopen="${esc(c.code)}">📓 מחברות (${NB.countFor(c.code)})</button>` : ''}
      ${cdriveButtons(c)}
      ${sheet ? `<button type="button" class="btn small" data-opensheet="${esc(sheet.id)}">📐 הנוסחאון</button>`
        : `<button type="button" class="btn small" data-newsheet="${esc(c.code)}">📐 נוסחאון חדש</button>`}
    </div>
  </div>`;
}

// ---------- Panopto: optional folder per course, and search ----------
// With a folder, the button opens the course's recordings and the search runs inside them
// (Panopto searches what was said, via captions, and the slides). Without one, it searches by name.
const PANOPTO_LIST = 'https://panoptotech.cloud.panopto.eu/Panopto/Pages/Sessions/List.aspx';
function panoptoFolderId(url) {
  const m = decodeURIComponent(String(url || '')).match(/folderID="?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return m ? m[1] : '';
}
function panoptoUrl(c, query = '') {
  const id = c.panopto ? panoptoFolderId(c.panopto) : '';
  const q = query || (id ? '' : c.name || toCode8(c.code));
  const parts = [id && `folderID=%22${id}%22`, q && `query=%22${encodeURIComponent(q)}%22`].filter(Boolean);
  return `${PANOPTO_LIST}#${parts.join('&')}`;
}
function bindPanopto(root) {
  $$('[data-psearch]', root).forEach(f => f.onsubmit = e => {
    e.preventDefault();
    const c = courseByCode(f.dataset.psearch), q = $('input', f).value.trim();
    if (!c || !q) return;
    // Without a folder, add the course name so results stay in this course.
    window.open(panoptoUrl(c, c.panopto ? q : `${c.name} ${q}`), '_blank', 'noopener');
  });
  $$('[data-pfolder]', root).forEach(b => b.onclick = () => panoptoFolderDialog(b.dataset.pfolder));
}
function panoptoFolderDialog(code) {
  const c = courseByCode(code);
  if (!c) return;
  openModal(`
    <h2>🎬 תיקיית Panopto · ${esc(c.name)}</h2>
    <p class="muted">לא חובה. עם תיקייה, כפתור Panopto פותח ישר את ההקלטות של הקורס, והחיפוש מחפש רק בהן (גם במה שנאמר בהרצאה ובשקפים).</p>
    <ol class="muted small"><li>פתח את הקורס ב-Panopto (או את קישור ההקלטות במודל).</li><li>העתק את הכתובת מהדפדפן (יש בה <span dir="ltr">folderID</span>).</li><li>הדבק כאן.</li></ol>
    <label class="field"><span class="field-label">קישור לתיקייה</span><input name="url" dir="ltr" value="${esc(c.panopto || '')}" placeholder="${PANOPTO_LIST}#folderID=…"></label>
    <p class="bad small" id="pfErr"></p>
    <div class="actions">
      ${c.panopto ? '<button class="btn danger" value="remove" formnovalidate>הסר תיקייה</button>' : ''}
      <a class="btn" href="${esc(panoptoUrl({ ...c, panopto: '' }))}" target="_blank" rel="noopener">מצא ב-Panopto ↗</a>
      <button class="btn" value="cancel" formnovalidate>ביטול</button>
      <button class="btn primary" value="save">שמור</button>
    </div>`, (action, fd) => {
    if (action === 'remove') { Store.put('course', code, { panopto: '' }); render(); return; }
    if (action !== 'save') return;
    const url = String(fd.get('url') || '').trim();
    if (url && !panoptoFolderId(url)) { $('#pfErr').textContent = 'לא מצאתי בקישור מזהה תיקייה (folderID). העתק את הכתובת כשתיקיית הקורס פתוחה ב-Panopto.'; return false; }
    Store.put('course', code, { panopto: url });
    render();
  });
}

// ---------- Pangea (פנגייה): student summaries, one folder per course ----------
// The site is static (Quartz on GitHub Pages) and allows cross-site reads, so its sitemap
// tells us which pages belong to which course. Each course has a root page whose name holds
// the course number, e.g. Technion/SLD1/SLD1_000-034028-מכניקת-מוצקים-1.
const PANGEA_SITE = 'https://idofangbentov.uk';
const LS_PANGEA = 'pp_pangea_v1';
const Pangea = {
  index: null, // { code6: { folder, root, title, pages: [{slug, url, title}] } }
  loading: null,

  async load() {
    if (this.index) return this.index;
    try {
      const cached = JSON.parse(lsGet(LS_PANGEA, 'null'));
      if (cached && Date.now() - cached.at < 3 * 86400e3) return (this.index = cached.index);
    } catch {}
    this.loading ||= (async () => {
      const xml = await (await fetch(`${PANGEA_SITE}/sitemap.xml`)).text();
      const slugs = [...xml.matchAll(/<loc>[^<]*?\/((?:Technion)\/[^<]+)<\/loc>/g)].map(m => decodeURIComponent(m[1]));
      const folders = {};
      for (const s of slugs) { const f = s.split('/').slice(0, 2).join('/'); (folders[f] ||= []).push(s); }
      const index = {};
      for (const [folder, list] of Object.entries(folders)) {
        list.sort();
        const root = list.find(s => /_000-/.test(s)) || list[0];
        const num = (root.match(/\d{6,8}/) || [])[0];
        if (!num) continue;
        const pageOf = s => ({ slug: s, url: `${PANGEA_SITE}/${s.split('/').map(encodeURIComponent).join('/')}`, title: s.split('/').pop().replace(/^[A-Z]+\d_\d{3}-/, '').replace(/-/g, ' ') });
        index[oldCourseCode(num.length === 8 ? num : toCode8(num))] = { folder, root: pageOf(root).url, title: pageOf(root).title, pages: list.map(pageOf) };
      }
      lsSet(LS_PANGEA, JSON.stringify({ at: Date.now(), index }));
      return (this.index = index);
    })();
    return this.loading;
  },
  course(code) { return this.index?.[oldCourseCode(toCode8(code))] || null; },

  // The text of one page (for the formula-sheet generator).
  async pageText(url) {
    const html = await (await fetch(url)).text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.querySelector('article')?.innerText || doc.querySelector('article')?.textContent || '').trim();
  },
};

const JSZIP_URL = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
const JSPDF_URL = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
const HTML2CANVAS_URL = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';

// Every page of a course → one PDF each → one ZIP. Pages are drawn in a hidden frame with
// the site's own styles, so the PDFs look like the site.
async function pangeaZip(code, btn) {
  const pg = Pangea.course(code);
  if (!pg) return;
  const zipName = `פנגייה - ${courseLabel(code) || code}.zip`;
  // Ask where to save now, while the click still counts; the ZIP takes a while to build.
  let target;
  try { target = await pickSaveTarget(zipName, 'application/zip'); } catch { return; }
  const label = btn.textContent;
  btn.disabled = true;
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:820px;height:1200px;border:0';
  document.body.appendChild(frame);
  try {
    await Promise.all([loadScript(JSZIP_URL), loadScript(JSPDF_URL), loadScript(HTML2CANVAS_URL)]);
    const zip = new JSZip();
    for (let i = 0; i < pg.pages.length; i++) {
      const p = pg.pages[i];
      btn.textContent = `⏳ ${i + 1}/${pg.pages.length}`;
      const html = await (await fetch(p.url)).text();
      const src = new DOMParser().parseFromString(html, 'text/html');
      // The app's CSP (base-uri 'self') also applies inside the frame, so <base> is ignored:
      // make the page's links, styles and images absolute instead.
      for (const [sel, attr] of [['link[href]', 'href'], ['img[src]', 'src'], ['a[href]', 'href'], ['source[src]', 'src']]) {
        src.querySelectorAll(sel).forEach(n => { try { n.setAttribute(attr, new URL(n.getAttribute(attr), p.url).href); } catch {} });
      }
      src.querySelectorAll('img').forEach(n => { ['loading', 'srcset', 'width', 'height'].forEach(a => n.removeAttribute(a)); });
      // Embedded videos can't be drawn into a PDF: leave their link instead.
      src.querySelectorAll('article iframe').forEach(f => {
        const url = (f.getAttribute('src') || '').replace('youtube.com/embed/', 'youtube.com/watch?v=');
        const a = src.createElement('p');
        a.innerHTML = `▶️ סרטון: <a href="${esc(url)}">${esc(url)}</a>`;
        f.replaceWith(a);
      });
      const article = src.querySelector('article');
      const head = [...src.querySelectorAll('link[rel="stylesheet"], style')].map(n => n.outerHTML).join('');
      const title = src.querySelector('h1.article-title')?.outerHTML || `<h1>${esc(p.title)}</h1>`;
      frame.srcdoc = `<!doctype html><html lang="he" dir="rtl" saved-theme="light"><head>${head}
        <style>body{background:#fff;margin:0;padding:28px 34px;width:752px}article{max-width:none}*{content-visibility:visible!important}article img{max-width:100%!important;mix-blend-mode:normal!important}</style></head>
        <body><div class="center">${title}${article ? article.outerHTML : ''}</div></body></html>`;
      await new Promise(r => { frame.onload = r; });
      const fdoc = frame.contentDocument;
      await Promise.race([
        Promise.all([...fdoc.images].map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; }))),
        new Promise(r => setTimeout(r, 15000)),
      ]);
      await fdoc.fonts?.ready;
      await new Promise(r => setTimeout(r, 300));
      // Canvases stop at ~32k px, so very long pages are drawn at a lower resolution.
      const scale = Math.min(2, 32000 / Math.max(1, fdoc.body.scrollHeight));
      const canvas = await html2canvas(fdoc.body, { scale, useCORS: true, imageTimeout: 0, backgroundColor: '#fff', windowWidth: 820 });
      zip.file(`${String(i).padStart(2, '0')} ${p.title.replace(/[\\/:*?"<>|]/g, '')}.pdf`, canvasToPdf(canvas));
    }
    btn.textContent = '⏳ אורז…';
    const blob = await zip.generateAsync({ type: 'blob' });
    await writeSaveTarget(target, blob, zipName);
    toast(`נשמרו ${pg.pages.length} דפים${target ? '' : ' (בתיקיית ההורדות)'}`);
  } catch (e) {
    console.error(e);
    toast('ההורדה נכשלה: ' + (e.message || e));
  } finally {
    frame.remove();
    btn.disabled = false;
    btn.textContent = label;
  }
}

// A tall canvas → A4 pages.
function canvasToPdf(canvas) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
  const sliceH = Math.floor(canvas.width * ph / pw);
  for (let y = 0, n = 0; y < canvas.height; y += sliceH, n++) {
    const part = document.createElement('canvas');
    part.width = canvas.width;
    part.height = Math.min(sliceH, canvas.height - y);
    part.getContext('2d').drawImage(canvas, 0, -y);
    if (n) pdf.addPage();
    pdf.addImage(part.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, pw, part.height * pw / part.width);
  }
  return pdf.output('arraybuffer');
}

// ---------- short tours for the apps (same engine as the main tour, in tour.js) ----------
const fsShowList = () => { if (fsOpenId) { fsOpenId = null; render(); } };
const fsShowEditor = () => { if (!fsSheet() && fsSheets()[0]) { fsOpenId = fsSheets()[0].id; render(); } };
const FS_TOUR = [
  { view: 'formula', run: fsShowList, title: '📐 מחולל הנוסחאונים', text: 'נוסחאון לכל קורס, בסגנון שלך: עונים על כמה שאלות, מצרפים חומרים, ומקבלים נוסחאון שמתאים בדיוק למספר העמודים שמותר במבחן. דקה אחת של הסבר.' },
  { view: 'formula', run: fsShowList, sel: '#fsNew', title: '＋ נוסחאון חדש', text: 'שואל כמה עמודים מותר, מה אופי הקורס (איורים? פיתוחים? סד״פ?), על מה לשים דגש ומה לדלג. מצרפים חומרים לפי סדר העדיפות: מבחנים קודמים, חומרי הקורס, סיכומים, שקפים, תרגולים ושיעורי בית, וגם נוסחאון קיים להשראה. אפשר לצרף גם את סיכומי פנגייה של הקורס.' },
  { view: 'formula', run: fsShowList, sel: '#fsNew', title: '✨ שתי דרכים ליצור', text: '"צור עם AI" בונה את הנוסחאון כאן (צריך מפתח API, כמו בקו״ח). "טיוטה + בריף ל-Claude" מעתיק בריף מוכן: שולחים אותו ל-Claude עם החומרים, ואז "ייבוא JSON".' },
  { view: 'formula', run: fsShowEditor, sel: '#fsSheet', title: '📄 העמודים', text: 'כך הנוסחאון ייראה מודפס. לחיצה על כל חלק (נוסחה, טבלה, איור, תיבת דגש) פותחת עריכה עם תצוגה מקדימה, ושם אפשר גם לבקש מ-AI לשנות רק אותו.' },
  { view: 'formula', run: fsShowEditor, sel: '#fsPages', parent: true, title: '📏 גודל ועמודים', text: 'כמה עמודים מותר ובכמה עמודות. "התאמה אוטומטית" בוחרת את הגופן הגדול ביותר שעדיין נכנס; אם חורגים, העמוד העודף מסומן באדום.' },
  { view: 'formula', run: fsShowEditor, sel: '.fs-outline', title: '📑 פרקים', text: 'סדר הפרקים, הסתרה (בלי למחוק), שינוי שם, והוספת בלוק חדש לפרק: נוסחה, סד״פ, דוגמת בזק, קיר הבושה, טבלה, טבלת סימנים או איור.' },
  { view: 'formula', run: fsShowEditor, sel: '.fs-side .fs-box:first-child', title: '🧭 אופי הקורס', text: 'קובע מה הנוסחאון ידגיש: בקורס כמו מוצקים איורים הם חלק מהעניין, במד״ר הם מיותרים.' },
  { view: 'formula', run: fsShowEditor, sel: '.fs-side .fs-box:last-child', title: '✅ כיסוי החומר', text: 'כל נושא בסילבוס: מכוסה, חלקי או חסר. ככה רואים מיד אם פרק שלם נשכח.' },
  { view: 'formula', run: fsShowEditor, sel: '#fsAi', title: '✨ עזרה מ-AI', text: 'בקשה חופשית על כל הנוסחאון או על פרק: "קצר שייכנס ל-2 עמודים", "הוסף סד״פ לכל סוג שאלה", "בדוק שהנוסחאות נכונות". תמיד אפשר לבטל.' },
  { view: 'formula', run: fsShowEditor, sel: '#fsPrint', title: '🖨️ PDF', text: 'פותח הדפסה בגודל A4 ובצבע מלא. בחר "שמור כ-PDF" כדי לשמור או לשתף עם חברים.' },
  { view: 'formula', run: fsShowEditor, sel: '#fsMore', title: '⋯ עוד', text: 'גיבוי כ-JSON, החלפת התוכן מ-JSON, העתקת הבריף, כותרת תחתונה ומחיקה.' },
  { title: '🎉 זהו!', text: 'את המדריך אפשר לפתוח שוב בכפתור "🎓 מדריך" בראש המסך.' },
];
const CV_TOUR = [
  { view: 'cv', run: () => { cvTab = 'profile'; render(); }, title: '📄 מחולל קורות החיים', text: 'פרופיל אחד עם כל מה שעשית, וממנו גרסה מותאמת לכל משרה. הכול מסתנכרן ל-Google Drive.' },
  { view: 'cv', sel: '#cvImport', title: '📥 ייבוא קו״ח קיים', text: 'טוען קובץ PDF או Word, מזהה את החלקים (השכלה, ניסיון, פרויקטים…) ומראה לך מה נמצא לפני שהוא נשמר.' },
  { view: 'cv', sel: '#cvFromDegree', title: '🎓 השכלה מהתואר', text: 'ממלא את ההשכלה מהאפליקציה: יתרת הסמסטרים, הממוצע, הציונים בקורסים הכבדים והכלים שלמדת.' },
  { view: 'cv', run: () => { cvTab = 'profile'; render(); }, sel: '#cvBody', title: '👤 הפרופיל שלי', text: 'כל החלקים של קורות החיים, עם דגש קצר בכל חלק לפי ההנחיות של עתידים. "✍️ בנה תקציר" כותב טיוטה לתקציר.' },
  { view: 'cv', run: () => { cvTab = 'profile'; render(); }, sel: '#cvChecks', title: '🩺 בדיקת קו״ח', text: 'בודקת את קורות החיים מול הדגשים: פרטי קשר, תקציר, השכלה, אימפקט בעבודה, אורך של עמוד אחד, ואין אייקונים או עברית בגרסה באנגלית.' },
  { view: 'cv', run: () => { cvTab = 'target'; render(); }, sel: '#cvBody', title: '🎯 התאמה למשרה', text: 'מדביקים מודעת דרושים, והגרסה מסתדרת לפי מילות המפתח שבה, או עם AI שכותב אותה מחדש. מודעה באנגלית עוברת אוטומטית לקו״ח באנגלית. ב"הגשה ותהליך" רושמים איש קשר בחברה ואת שלבי הראיונות.' },
  { view: 'cv', run: () => { cvTab = 'tips'; render(); }, sel: '#cvBody', title: '💡 דגשים וראיונות', text: 'הדגשים של רכזת הקריירה בעתידים: מבנה קו״ח, הגשה דרך עובד בחברה, איך לענות על "למה עזבת" ומה ללבוש.' },
  { view: 'cv', run: () => { cvTab = 'ai'; render(); }, sel: '#cvBody', title: '🤖 הגדרות AI', text: 'מפתח API של Anthropic (נשמר רק במכשיר הזה). אותו מפתח משמש גם את יועץ התואר ואת מחולל הנוסחאונים.' },
  { run: () => { cvTab = 'profile'; render(); }, title: '🎉 זהו!', text: 'את המדריך אפשר לפתוח שוב בכפתור "🎓 מדריך" בראש המסך.' },
];
const appTour = (steps, key) => startTour(0, steps, key);
// First visit to an app on this device: its tour starts by itself.
function maybeAppTour(steps, key) {
  if (lsGet(key) || (typeof tour !== 'undefined' && tour) || document.querySelector('dialog[open]')) return;
  setTimeout(() => { if (!lsGet(key) && !tour) startTour(0, steps, key); }, 600);
}
