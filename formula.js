// 📐 Formula-sheet generator (נוסחאון).
// A sheet is data: sections → blocks (formula, definition, steps, callout, figure, table…).
// The app lays the blocks out on A4 pages in columns, in a theme (only "standard" for now),
// shrinking or growing the font so the sheet fills exactly the number of pages you allow.
// Sheets are records of kind "sheet", so they sync through Google Drive like everything else.

const KATEX_CSS = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
const KATEX_JS = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
const FS_FONT_CSS = 'https://fonts.googleapis.com/css2?family=David+Libre:wght@400;500;700&display=swap';

const FS_PROFILES = {
  figures: '🖼️ איורים ושרטוטים',
  derivations: '∂ פיתוחים ונוסחאות',
  procedures: '🪜 סד״פ ושיטות פתרון',
  tables: '▦ טבלאות והשוואות',
  proofs: '📜 משפטים והוכחות',
  code: '💻 אלגוריתמים וקוד',
};
const FS_SOURCES = [
  ['exams', '📝 מבחנים קודמים', 'הכי חשוב: מה שחוזר במבחנים מקבל עדיפות ומקום'],
  ['material', '📚 חומרי הקורס', 'סילבוס, דפי נוסחאות רשמיים, ספר הקורס'],
  ['summaries', '✍️ הסיכומים שלך', ''],
  ['slides', '🎓 שקפי הרצאות', ''],
  ['tutorials', '🧮 תרגולים', ''],
  ['hw', '📘 שיעורי בית', ''],
];
const FS_BLOCKS = {
  h: ['כותרת משנה', [['md', 'text', 'כותרת']]],
  kv: ['הגדרה: נוסחה', [['label', 'text', 'תווית (מודגשת)'], ['tex', 'tex', 'נוסחה (LaTeX)'], ['note', 'md', 'הערה אחרי הנוסחה']]],
  eq: ['נוסחה ממורכזת', [['tex', 'tex', 'נוסחה (LaTeX)']]],
  text: ['פסקה', [['md', 'md', 'טקסט (**מודגש**, $נוסחה$)']]],
  list: ['רשימה', [['items', 'lines', 'שורה לכל פריט'], ['style', 'select:square,bullet,num', 'סגנון']]],
  steps: ['סדר פעולות (סד״פ)', [['title', 'text', 'כותרת'], ['items', 'lines', 'שלב בכל שורה (**שם השלב:** הסבר)']]],
  callout: ['תיבת דגש / מלכודות', [['variant', 'select:tip,trap,note', 'סוג (tip=דגש אדום, trap=קיר הבושה, note=כחול)'], ['title', 'text', 'כותרת'], ['items', 'lines', 'נקודות (שורה לכל אחת)'], ['md', 'md', 'או טקסט חופשי']]],
  example: ['דוגמת בזק', [['label', 'text', 'תווית'], ['md', 'md', 'הדוגמה ($...$ עם \\Rightarrow)']]],
  figure: ['איור (SVG)', [['svg', 'code', 'קוד SVG'], ['caption', 'text', 'כיתוב'], ['width', 'number', 'רוחב (% מהעמודה)']]],
  table: ['טבלה', [['head', 'row', 'כותרות (מופרדות ב- | )'], ['rows', 'rows', 'שורה לכל שורה, תאים מופרדים ב- | ']]],
  symbols: ['טבלת סימנים ויחידות', [['rows', 'rows', 'סימן | משמעות | יחידות (שורה לכל סימן)']]],
};

let fsOpenId = null;
let fsSelSection = null;
let fsLayoutToken = 0;

const fsSheets = () => Store.list('sheet').sort((a, b) => (b.u || 0) - (a.u || 0));
const fsSheet = () => (fsOpenId ? Store.get('sheet', fsOpenId) : null);
const fsId = () => Math.random().toString(36).slice(2, 9);

function loadCss(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = href;
  document.head.appendChild(l);
}
async function loadKatex() {
  loadCss(KATEX_CSS); loadCss(FS_FONT_CSS);
  if (!window.katex) await loadScript(KATEX_JS);
  return window.katex;
}

// ---------- rendering blocks ----------
function fsTex(tex, display = false) {
  try { return katex.renderToString(String(tex || ''), { displayMode: display, throwOnError: false, output: 'html', strict: 'ignore' }); }
  catch { return `<code>${esc(tex)}</code>`; }
}
// Markdown-ish: **bold**, $inline$, $$display$$, line breaks.
function fsMd(s) {
  const out = [];
  let last = 0;
  const src = String(s || '');
  for (const m of src.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g)) {
    out.push(fsText(src.slice(last, m.index)));
    out.push(m[1] != null ? fsTex(m[1], true) : `<span class="fm">${fsTex(m[2])}</span>`);
    last = m.index + m[0].length;
  }
  out.push(fsText(src.slice(last)));
  return out.join('');
}
const fsText = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');

function fsSvg(svg) {
  // Strict XML first; if that fails (a duplicate attribute, a stray &), the lenient HTML parser.
  let root = new DOMParser().parseFromString(String(svg || ''), 'image/svg+xml').documentElement;
  if (!root || root.nodeName !== 'svg' || root.querySelector('parsererror')) root = new DOMParser().parseFromString(String(svg || ''), 'text/html').querySelector('svg');
  if (!root) return '<div class="fb-badsvg">⚠️ SVG לא תקין</div>';
  root.querySelectorAll('script, foreignObject, iframe').forEach(n => n.remove());
  for (const el of [root, ...root.querySelectorAll('*')]) {
    for (const a of [...el.attributes]) if (/^on/i.test(a.name) || /javascript:/i.test(a.value)) el.removeAttribute(a.name);
  }
  return new XMLSerializer().serializeToString(root);
}
const fsCell = c => (/^\s*<svg/i.test(c) ? fsSvg(c) : fsMd(c));

function fsBlockHtml(b) {
  switch (b.t) {
    case 'h': return `<div class="fb-h">${fsMd(b.md)}</div>`;
    case 'kv': return `<div class="fb-kv"><b>${fsMd(b.label)}${b.label ? ':' : ''}</b> <span class="fm">${fsTex(b.tex)}</span>${b.note ? ` <span>${fsMd(b.note)}</span>` : ''}</div>`;
    case 'eq': return `<div class="fb-eq">${fsTex(b.tex, true)}</div>`;
    case 'text': return `<div class="fb-text">${fsMd(b.md)}</div>`;
    case 'list': {
      const tag = b.style === 'num' ? 'ol' : 'ul';
      return `<${tag} class="fb-list ${esc(b.style || 'square')}">${(b.items || []).map(i => `<li>${fsMd(i)}</li>`).join('')}</${tag}>`;
    }
    case 'steps': return `<div class="fb-steps">${b.title ? `<b>${fsMd(b.title)}</b>` : ''}<ol>${(b.items || []).map(i => `<li>${fsMd(i)}</li>`).join('')}</ol></div>`;
    case 'callout': {
      const v = ['tip', 'trap', 'note'].includes(b.variant) ? b.variant : 'tip';
      const title = b.title || (v === 'trap' ? 'קיר הבושה - מלכודות קריטיות:' : v === 'tip' ? 'דגש:' : '');
      return `<div class="fb-callout ${v}">${title ? `<div class="fb-ct">${v === 'trap' ? '<span class="bang">!</span> ' : ''}${fsMd(title)}</div>` : ''}
        <div class="fb-cb">${b.items?.length ? `<ul>${b.items.map(i => `<li>${fsMd(i)}</li>`).join('')}</ul>` : ''}${b.md ? fsMd(b.md) : ''}</div></div>`;
    }
    case 'example': return `<div class="fb-example"><b>${fsMd(b.label || 'דוגמת בזק')}:</b> ${fsMd(b.md)}</div>`;
    case 'figure': return `<figure class="fb-fig" style="--w:${Math.max(20, Math.min(100, +b.width || 90))}%">${fsSvg(b.svg)}${b.caption ? `<figcaption>${fsMd(b.caption)}</figcaption>` : ''}</figure>`;
    case 'table': return `<table class="fb-table">${b.head?.length ? `<thead><tr>${b.head.map(h => `<th>${fsMd(h)}</th>`).join('')}</tr></thead>` : ''}
      <tbody>${(b.rows || []).map(r => `<tr>${r.map(c => `<td>${fsCell(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    case 'symbols': return `<table class="fb-table fb-sym"><thead><tr><th>סימן</th><th>משמעות</th><th>יחידות</th></tr></thead>
      <tbody>${(b.rows || []).map(([s, m, u]) => `<tr><td>${fsTex(s)}</td><td>${fsMd(m)}</td><td>${u ? fsTex(u) : ''}</td></tr>`).join('')}</tbody></table>`;
    default: return `<div class="fb-text">${fsMd(b.md || '')}</div>`;
  }
}

// ---------- layout: blocks → columns → A4 pages ----------
const FS_PAGE = { w: 794, h: 1122, padX: 30, padTop: 28, padBottom: 22, foot: 20, gap: 16, base: 10.6 };

function fsGeometry(cols) {
  const colW = (FS_PAGE.w - 2 * FS_PAGE.padX - (cols - 1) * FS_PAGE.gap) / cols;
  const colH = FS_PAGE.h - FS_PAGE.padTop - FS_PAGE.padBottom - FS_PAGE.foot;
  return { colW, colH };
}

// Units are what can't be split: a block, or a section title together with its first block.
function fsUnits(sheet) {
  const units = [];
  (sheet.sections || []).forEach((s, si) => {
    if (s.hidden) return;
    const blocks = (s.blocks || []).map((b, bi) => ({ b, bi })).filter(x => !x.b.hidden);
    const title = `<h3 class="fs-sec" data-sec="${si}">${fsMd(s.title)}</h3>`;
    if (!blocks.length) { units.push({ html: title, si, bi: -1 }); return; }
    blocks.forEach(({ b, bi }, k) => units.push({ html: (k === 0 ? title : '') + `<div class="fs-blk" data-sec="${si}" data-blk="${bi}">${fsBlockHtml(b)}</div>`, si, bi }));
  });
  return units;
}

function fsPack(heights, colH) {
  const cols = [[]];
  let h = 0;
  heights.forEach((uh, i) => {
    if (h + uh > colH && cols[cols.length - 1].length) { cols.push([]); h = 0; }
    cols[cols.length - 1].push(i);
    h += uh;
  });
  return cols;
}

async function fsLayout(sheet, host) {
  const token = ++fsLayoutToken;
  await loadKatex();
  await document.fonts?.ready;
  if (token !== fsLayoutToken) return null;
  const cols = Math.max(1, Math.min(4, +sheet.cols || 3));
  const target = Math.max(1, +sheet.pages || 2);
  const { colW, colH } = fsGeometry(cols);
  const units = fsUnits(sheet);

  const measure = document.createElement('div');
  measure.className = `fs-theme-${sheet.theme || 'standard'} fs-measure`;
  measure.style.width = colW + 'px';
  measure.innerHTML = units.map(u => `<div class="fs-unit">${u.html}</div>`).join('');
  document.body.appendChild(measure);
  const nodes = [...measure.children];
  // A formula wider than its column is shrunk just enough to fit (never below half size).
  const wide = $$('.katex-display > .katex, .fm', measure);
  const fitWide = () => {
    wide.forEach(el => { el.style.fontSize = ''; });
    for (const el of wide) {
      const box = el.closest('td') || el.closest('.fb-callout') || el.closest('.fs-unit');
      const avail = box.clientWidth - (box.tagName === 'TD' ? 6 : box.classList.contains('fb-callout') ? 16 : 0);
      const w = Math.max(el.getBoundingClientRect().width, el.scrollWidth); // display math is a full-width block
      if (w > avail) el.style.fontSize = (el.classList.contains('fm') ? 1 : 1.08) * Math.max(0.5, avail / w) + 'em';
    }
  };
  const heightsAt = scale => {
    measure.style.fontSize = (FS_PAGE.base * scale) + 'px';
    fitWide();
    return nodes.map(n => n.getBoundingClientRect().height);
  };

  // Auto-fit: the biggest font that still fits in the pages you allow.
  let scale = Math.max(0.6, Math.min(1.3, +sheet.scale || 1));
  let packed;
  if (sheet.autofit !== false) {
    const tries = [1.2, 1.15, 1.1, 1.06, 1.03, 1, 0.97, 0.94, 0.91, 0.88, 0.85, 0.82, 0.79, 0.76, 0.73, 0.7, 0.67, 0.64];
    for (const s of tries) {
      packed = fsPack(heightsAt(s), colH);
      scale = s;
      if (Math.ceil(packed.length / cols) <= target) break;
    }
  } else packed = fsPack(heightsAt(scale), colH);
  measure.style.fontSize = (FS_PAGE.base * scale) + 'px';

  const nPages = Math.max(1, Math.ceil(packed.length / cols));
  const footer = sheet.footer || sheet.title || '';
  const pages = [];
  for (let p = 0; p < nPages; p++) {
    const page = document.createElement('div');
    page.className = `fs-page fs-theme-${sheet.theme || 'standard'}${p >= target ? ' over' : ''}`;
    page.style.fontSize = (FS_PAGE.base * scale) + 'px';
    page.style.setProperty('--cols', cols);
    const row = document.createElement('div');
    row.className = 'fs-cols';
    for (let c = 0; c < cols; c++) {
      const col = document.createElement('div');
      col.className = 'fs-col';
      col.style.width = colW + 'px';
      for (const i of packed[p * cols + c] || []) {
        const n = nodes[i];
        n.dataset.si = units[i].si;
        col.appendChild(n);
      }
      row.appendChild(col);
    }
    page.appendChild(row);
    const foot = document.createElement('div');
    foot.className = 'fs-foot';
    foot.textContent = `${footer}${nPages > 1 ? `  ·  ${p + 1}/${nPages}` : ''}`;
    page.appendChild(foot);
    pages.push(page);
  }
  measure.remove();
  if (token !== fsLayoutToken) return null;
  host.replaceChildren(...pages);
  return { pages: nPages, target, scale, cols };
}

// ---------- screens ----------
function renderFormula(root) {
  const sheet = fsSheet();
  if (!sheet) { fsOpenId = null; renderSheetList(root); }
  else renderSheetEditor(root, sheet);
  $('#fsTour', root).onclick = () => appTour(FS_TOUR, 'pp_tour_fs');
  maybeAppTour(FS_TOUR, 'pp_tour_fs');
}

function renderSheetList(root) {
  const list = fsSheets();
  root.innerHTML = `
    <section class="panel">
      <div class="toolbar">
        <div><h2>📐 מחולל נוסחאונים</h2><p class="muted">נוסחאון לכל קורס, בסגנון שלך: בוחרים כמה עמודים, מה חשוב, ומאיזה חומר. אחר כך עורכים (גם עם AI) ומייצאים ל-PDF.</p></div>
        <div class="row wrap">
          <button class="btn" type="button" id="fsTour">🎓 מדריך</button>
          <button class="btn" type="button" data-go="tools">← לכלים</button>
          <button class="btn" type="button" id="fsImport">📥 ייבוא JSON</button>
          <button class="btn primary" type="button" id="fsNew">＋ נוסחאון חדש</button>
        </div>
      </div>
      ${list.length ? `<div class="fs-list">${list.map(s => `
        <button type="button" class="fs-item" data-open="${esc(s.id)}">
          <span class="fs-thumb">📐</span>
          <span><b>${esc(s.title || 'נוסחאון')}</b><small class="muted">${esc(courseLabel(s.course) || '')} · ${(s.sections || []).length} פרקים · ${s.pages || 2} עמ׳</small>
          <span class="chips">${(s.profile || []).map(p => `<span class="chip">${FS_PROFILES[p] || p}</span>`).join('')}</span></span>
        </button>`).join('')}</div>`
      : `<div class="fs-empty"><p>עוד אין נוסחאונים.</p><p class="muted">אפשר להתחיל מנוסחאון חדש, או לפתוח את הדוגמה (מכניקת מוצקים 1, בנויה מחדש מהנוסחאון שלך) כדי לראות איך זה עובד.</p></div>`}
      ${typeof FS_SAMPLE_SOLIDS !== 'undefined' ? `<div class="actions" style="justify-content:flex-start"><button class="btn" type="button" id="fsSample">📄 פתח דוגמה: מכניקת מוצקים 1</button></div>` : ''}
    </section>`;
  $('#fsNew', root).onclick = () => fsNewSheet();
  $('#fsImport', root).onclick = () => fsImportJson();
  $$('[data-open]', root).forEach(b => b.onclick = () => { fsOpenId = b.dataset.open; render(); });
  if ($('#fsSample', root)) $('#fsSample', root).onclick = () => {
    const id = uid();
    Store.put('sheet', id, structuredClone(FS_SAMPLE_SOLIDS));
    fsOpenId = id; render();
  };
}

function renderSheetEditor(root, sheet) {
  const secs = sheet.sections || [];
  const cov = sheet.coverage || [];
  root.innerHTML = `
    <section class="panel fs-editor">
      <div class="toolbar fs-bar">
        <div class="row wrap">
          <button class="btn" type="button" id="fsBack">← כל הנוסחאונים</button>
          <input id="fsTitle" class="fs-title-in" value="${esc(sheet.title || '')}" placeholder="שם הנוסחאון">
        </div>
        <div class="row wrap">
          <label class="fs-mini">עמודים <input id="fsPages" type="number" min="1" max="12" value="${+sheet.pages || 2}"></label>
          <label class="fs-mini">עמודות <select id="fsCols">${[2, 3, 4].map(n => `<option ${(+sheet.cols || 3) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label class="fs-mini"><input type="checkbox" id="fsAuto" ${sheet.autofit !== false ? 'checked' : ''}> התאמה אוטומטית</label>
          ${sheet.autofit === false ? `<label class="fs-mini">גודל <input id="fsScale" type="range" min="0.6" max="1.3" step="0.01" value="${+sheet.scale || 1}"></label>` : ''}
          <button class="btn" type="button" id="fsAi">✨ עזרה מ-AI</button>
          <button class="btn primary" type="button" id="fsPrint">🖨️ PDF</button>
          <button class="btn" type="button" id="fsMore" title="עוד">⋯</button>
          <button class="btn" type="button" id="fsTour" title="מדריך">🎓</button>
        </div>
      </div>
      <div class="fs-status" id="fsStatus"><span class="muted">מסדר את העמודים…</span></div>
      <div class="fs-layout">
        <aside class="fs-side">
          <div class="fs-box">
            <div class="fs-box-h"><b>🧭 אופי הקורס</b><button class="btn small" type="button" id="fsProfile">שנה</button></div>
            <div class="chips">${(sheet.profile || []).map(p => `<span class="chip">${FS_PROFILES[p] || esc(p)}</span>`).join('') || '<span class="muted">לא הוגדר</span>'}</div>
            ${sheet.brief?.emphasis ? `<p class="muted small">🎯 ${esc(sheet.brief.emphasis)}</p>` : ''}
          </div>
          <div class="fs-box">
            <div class="fs-box-h"><b>📑 פרקים</b><button class="btn small" type="button" id="fsAddSec">＋ פרק</button></div>
            <ol class="fs-outline">${secs.map((s, i) => `
              <li class="${s.hidden ? 'off' : ''} ${fsSelSection === i ? 'sel' : ''}" data-osec="${i}">
                <span class="fs-oname" data-gosec="${i}">${esc(s.title)} <small class="muted">${(s.blocks || []).length}</small></span>
                <span class="fs-oacts">
                  <button type="button" data-addblk="${i}" title="הוסף בלוק">＋</button>
                  <button type="button" data-secup="${i}" title="למעלה">▲</button>
                  <button type="button" data-secdn="${i}" title="למטה">▼</button>
                  <button type="button" data-sechide="${i}" title="${s.hidden ? 'הצג' : 'הסתר'}">${s.hidden ? '👁️' : '🙈'}</button>
                  <button type="button" data-secedit="${i}" title="שנה שם / מחק">✏️</button>
                </span>
              </li>`).join('')}</ol>
            <p class="muted small">לחץ על כל חלק בעמוד כדי לערוך אותו.</p>
          </div>
          <div class="fs-box">
            <div class="fs-box-h"><b>✅ כיסוי החומר</b>${cov.length ? `<small class="muted">${cov.filter(c => c.status === 'in').length}/${cov.length}</small>` : ''}</div>
            ${cov.length ? `<ul class="fs-cov">${cov.map(c => `<li class="${esc(c.status)}"><span>${c.status === 'in' ? '✅' : c.status === 'partial' ? '🟡' : '❌'}</span> ${esc(c.topic)}${c.note ? `<small class="muted"> · ${esc(c.note)}</small>` : ''}</li>`).join('')}</ul>`
              : '<p class="muted small">כשהנוסחאון נוצר מהסילבוס, כאן תראה אילו נושאים מכוסים ומה חסר.</p>'}
          </div>
        </aside>
        <div class="fs-preview" id="fsPreview"><div class="fs-pages" id="fsSheet"></div></div>
      </div>
    </section>`;

  const save = patch => Store.put('sheet', sheet.id, patch);
  $('#fsBack', root).onclick = () => { fsOpenId = null; render(); };
  $('#fsTitle', root).onchange = e => save({ title: e.target.value.trim() });
  $('#fsPages', root).onchange = e => save({ pages: Math.max(1, Math.min(12, +e.target.value || 2)) });
  $('#fsCols', root).onchange = e => save({ cols: +e.target.value });
  $('#fsAuto', root).onchange = e => save({ autofit: e.target.checked });
  if ($('#fsScale', root)) $('#fsScale', root).onchange = e => save({ scale: +e.target.value });
  $('#fsPrint', root).onclick = fsPrint;
  $('#fsAi', root).onclick = () => fsAiDialog(sheet);
  $('#fsMore', root).onclick = () => fsMoreDialog(sheet);
  $('#fsProfile', root).onclick = () => fsProfileDialog(sheet);
  $('#fsAddSec', root).onclick = () => {
    const title = prompt('שם הפרק החדש:');
    if (title) save({ sections: [...secs, { id: fsId(), title, blocks: [] }] });
  };
  const moveSec = (i, d) => { const j = i + d; if (j < 0 || j >= secs.length) return; const a = [...secs]; [a[i], a[j]] = [a[j], a[i]]; save({ sections: a }); };
  $$('[data-secup]', root).forEach(b => b.onclick = () => moveSec(+b.dataset.secup, -1));
  $$('[data-secdn]', root).forEach(b => b.onclick = () => moveSec(+b.dataset.secdn, 1));
  $$('[data-sechide]', root).forEach(b => b.onclick = () => { const i = +b.dataset.sechide; save({ sections: secs.map((s, k) => k === i ? { ...s, hidden: !s.hidden } : s) }); });
  $$('[data-secedit]', root).forEach(b => b.onclick = () => fsSectionDialog(sheet, +b.dataset.secedit));
  $$('[data-addblk]', root).forEach(b => b.onclick = () => fsAddBlockDialog(sheet, +b.dataset.addblk));
  $$('[data-gosec]', root).forEach(b => b.onclick = () => {
    fsSelSection = +b.dataset.gosec;
    $$('.fs-outline li', root).forEach(li => li.classList.toggle('sel', +li.dataset.osec === fsSelSection));
    const el = $(`#fsSheet .fs-sec[data-sec="${fsSelSection}"]`) || $(`#fsSheet .fs-blk[data-sec="${fsSelSection}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    fsHighlightSection();
  });

  const pagesHost = $("#fsSheet", root);
  pagesHost.onclick = e => {
    const blk = e.target.closest('.fs-blk');
    if (blk) return fsBlockDialog(sheet, +blk.dataset.sec, +blk.dataset.blk);
    const sec = e.target.closest('.fs-sec');
    if (sec) fsSectionDialog(sheet, +sec.dataset.sec);
  };
  fsLayout(sheet, pagesHost).then(info => {
    if (!info) return;
    fsFitPreview();
    fsHighlightSection();
    const st = $('#fsStatus');
    if (!st) return;
    const over = info.pages > info.target;
    st.innerHTML = `<span class="${over ? 'bad' : 'ok'}">${over ? '⚠️' : '✓'} ${info.pages} ${info.pages === 1 ? 'עמוד' : 'עמודים'} מתוך ${info.target}</span>
      <span class="muted">· גודל גופן ${Math.round(info.scale * 100)}%${sheet.autofit !== false ? ' (אוטומטי)' : ''}</span>
      ${over ? `<span class="muted">· חורג. הסתר בלוקים, קצר, או בקש מ-AI "לקצר כדי שייכנס ל-${info.target} עמודים".</span>` : ''}`;
  });
}

function fsHighlightSection() {
  $$('#fsSheet .sel-sec').forEach(n => n.classList.remove('sel-sec'));
  if (fsSelSection == null) return;
  $$(`#fsSheet .fs-unit[data-si="${fsSelSection}"]`).forEach(n => n.classList.add('sel-sec'));
}

function fsFitPreview() {
  const wrap = $('#fsPreview'), pages = $("#fsSheet");
  if (!wrap || !pages) return;
  const z = Math.min(1.15, (wrap.clientWidth - 8) / FS_PAGE.w);
  pages.style.zoom = z;
}
window.addEventListener('resize', () => { if (currentView === 'formula') fsFitPreview(); });

// ---------- editing ----------
function fsPutSections(sheet, sections) { Store.put('sheet', sheet.id, { sections }); }

function fsFieldHtml([key, kind, label], b) {
  const v = b[key];
  if (kind.startsWith('select:')) {
    const opts = kind.slice(7).split(',');
    return `<label class="field"><span class="field-label">${esc(label)}</span><select name="${key}">${opts.map(o => `<option ${v === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
  }
  let text = v ?? '';
  if (kind === 'lines') text = (v || []).join('\n');
  if (kind === 'row') text = (v || []).join(' | ');
  if (kind === 'rows') text = (v || []).map(r => r.join(' | ')).join('\n');
  if (kind === 'number') return `<label class="field"><span class="field-label">${esc(label)}</span><input name="${key}" type="number" value="${esc(text)}" style="width:100px"></label>`;
  if (kind === 'text') return `<label class="field"><span class="field-label">${esc(label)}</span><input name="${key}" value="${esc(text)}"></label>`;
  const rows = kind === 'code' ? 8 : kind === 'tex' ? 2 : 3;
  const ltr = ['tex', 'code'].includes(kind) ? ' dir="ltr" class="mono"' : '';
  return `<label class="field"><span class="field-label">${esc(label)}</span><textarea name="${key}" rows="${rows}"${ltr}>${esc(text)}</textarea></label>`;
}

function fsReadFields(form, t) {
  const b = { t };
  for (const [key, kind] of FS_BLOCKS[t][1]) {
    const el = form.elements[key];
    if (!el) continue;
    const v = el.value;
    if (kind === 'lines') b[key] = v.split('\n').map(s => s.trim()).filter(Boolean);
    else if (kind === 'row') b[key] = v.split('|').map(s => s.trim()).filter((s, i, a) => s || a.length > 1);
    else if (kind === 'rows') b[key] = v.split('\n').filter(s => s.trim()).map(r => r.split('|').map(s => s.trim()));
    else if (kind === 'number') b[key] = v === '' ? undefined : +v;
    else b[key] = v;
  }
  for (const k of Object.keys(b)) if (b[k] === '' || b[k] === undefined || (Array.isArray(b[k]) && !b[k].length)) delete b[k];
  return b;
}

function fsBlockDialog(sheet, si, bi, fresh) {
  const secs = structuredClone(sheet.sections || []);
  const sec = secs[si];
  const b = fresh || sec?.blocks?.[bi];
  if (!b) return;
  const t = FS_BLOCKS[b.t] ? b.t : 'text';
  openModal(`
    <h2>✏️ ${FS_BLOCKS[t][0]} <small class="muted">· ${esc(sec.title)}</small></h2>
    <div class="fs-edit-grid">
      <div>${FS_BLOCKS[t][1].map(f => fsFieldHtml(f, b)).join('')}</div>
      <div><span class="field-label">תצוגה מקדימה</span><div class="fs-theme-standard fs-live" id="fsLive"></div></div>
    </div>
    <div class="fs-ai-row">
      <input id="fsBlockAi" placeholder="✨ בקש מ-AI: למשל &quot;הוסף את המקרה של חתך דק דופן&quot; או &quot;צייר איור של קורה רתומה&quot;">
      <button class="btn" type="button" id="fsBlockAiGo">✨ שנה</button>
    </div>
    <p class="muted small" id="fsBlockAiMsg"></p>
    <div class="actions">
      ${fresh ? '' : `<button class="btn danger" value="delete" formnovalidate>מחק</button>
      <button class="btn" value="hide" formnovalidate>${b.hidden ? '👁️ הצג' : '🙈 הסתר'}</button>
      <button class="btn" value="dup" formnovalidate>שכפל</button>
      <button class="btn" value="up" formnovalidate>▲</button>
      <button class="btn" value="down" formnovalidate>▼</button>`}
      <button class="btn" value="cancel" formnovalidate>ביטול</button>
      <button class="btn primary" value="save">שמור</button>
    </div>`, (action, fd) => {
    const form = $('#modalForm');
    const nb = { ...fsReadFields(form, t), ...(b.hidden ? { hidden: true } : {}) };
    const blocks = sec.blocks || (sec.blocks = []);
    if (fresh) { if (action === 'save') blocks.push(nb); else return; }
    else if (action === 'delete') blocks.splice(bi, 1);
    else if (action === 'hide') blocks[bi] = { ...nb, hidden: !b.hidden };
    else if (action === 'dup') blocks.splice(bi + 1, 0, structuredClone(nb));
    else if (action === 'up' && bi > 0) { blocks[bi] = nb; [blocks[bi - 1], blocks[bi]] = [blocks[bi], blocks[bi - 1]]; }
    else if (action === 'down' && bi < blocks.length - 1) { blocks[bi] = nb; [blocks[bi + 1], blocks[bi]] = [blocks[bi], blocks[bi + 1]]; }
    else if (action === 'save') blocks[bi] = nb;
    else return;
    fsPutSections(sheet, secs);
  }, form => {
    const live = () => { try { $('#fsLive', form).innerHTML = fsBlockHtml(fsReadFields(form, t)); } catch {} };
    loadKatex().then(live);
    form.addEventListener('input', live);
    $('#fsBlockAiGo', form).onclick = async () => {
      const ask = $('#fsBlockAi', form).value.trim();
      if (!ask) return;
      const msg = $('#fsBlockAiMsg', form);
      msg.textContent = '✨ חושב…';
      try {
        const out = await fsAiCall(`Edit ONE block of the formula sheet "${sheet.title}" (course: ${courseLabel(sheet.course) || ''}, section: "${sec.title}").
Current block JSON:\n${JSON.stringify(fsReadFields(form, t))}\n\nThe student asks: ${ask}\n\nReturn {"blocks":[...]} with the replacement block(s) (usually one block of the same type "${t}").`, FS_BLOCKS_SCHEMA);
        const nb = out.blocks?.[0];
        if (!nb) throw new Error('לא התקבל בלוק');
        if (nb.t !== t) { msg.textContent = `ה-AI הציע בלוק מסוג אחר (${FS_BLOCKS[nb.t]?.[0] || nb.t}). הוא נוסף אחרי הבלוק הזה.`; sec.blocks.splice(bi + 1, 0, ...out.blocks); fsPutSections(sheet, secs); return; }
        for (const [key, kind] of FS_BLOCKS[t][1]) {
          const el = form.elements[key]; if (!el) continue;
          const v = nb[key];
          el.value = kind === 'lines' ? (v || []).join('\n') : kind === 'row' ? (v || []).join(' | ') : kind === 'rows' ? (v || []).map(r => r.join(' | ')).join('\n') : (v ?? '');
        }
        live();
        msg.textContent = '✓ עודכן. בדוק בתצוגה ולחץ שמור.';
      } catch (e) { msg.innerHTML = aiErrorHtml(e); }
    };
  });
  fsWide();
}

function fsAddBlockDialog(sheet, si) {
  openModal(`<h2>＋ בלוק חדש</h2><div class="fs-types">${Object.entries(FS_BLOCKS).map(([t, [l]]) => `<button class="btn" type="button" data-t="${t}">${l}</button>`).join('')}</div>
    <div class="actions"><button class="btn" value="cancel">ביטול</button></div>`, () => {}, form => {
    $$('[data-t]', form).forEach(b => b.onclick = () => {
      $('#modal').close();
      const t = b.dataset.t;
      const fresh = { t, ...(t === 'callout' ? { variant: 'tip' } : {}), ...(t === 'steps' ? { title: 'סדר פעולות (סד״פ):' } : {}), ...(t === 'list' ? { style: 'square' } : {}) };
      fsBlockDialog(sheet, si, -1, fresh);
    });
  });
}

function fsSectionDialog(sheet, si) {
  const secs = structuredClone(sheet.sections || []);
  const s = secs[si];
  if (!s) return;
  openModal(`<h2>📑 פרק</h2>
    <label class="field"><span class="field-label">שם הפרק</span><input name="title" value="${esc(s.title)}"></label>
    <div class="actions"><button class="btn danger" value="delete" formnovalidate>מחק פרק</button>
    <button class="btn" value="cancel" formnovalidate>ביטול</button><button class="btn primary" value="save">שמור</button></div>`, (action, fd) => {
    if (action === 'delete') { if (!confirm(`למחוק את "${s.title}" עם ${(s.blocks || []).length} הבלוקים שבו?`)) return false; secs.splice(si, 1); }
    else if (action === 'save') s.title = String(fd.get('title')).trim() || s.title;
    else return;
    fsPutSections(sheet, secs);
  });
}

function fsProfileDialog(sheet) {
  const cur = sheet.profile || [];
  openModal(`<h2>🧭 אופי הקורס</h2>
    <p class="muted">קובע מה הנוסחאון ידגיש: בקורס כמו מכניקת מוצקים איורים הם חלק מהעניין, במד״ר הם מיותרים.</p>
    <div class="fs-checks">${Object.entries(FS_PROFILES).map(([k, l]) => `<label class="chip"><input type="checkbox" name="p" value="${k}" ${cur.includes(k) ? 'checked' : ''}> ${l}</label>`).join('')}</div>
    <div class="actions"><button class="btn" value="cancel" formnovalidate>ביטול</button><button class="btn primary" value="save">שמור</button></div>`, (action, fd) => {
    if (action === 'save') Store.put('sheet', sheet.id, { profile: fd.getAll('p') });
  });
}

function fsMoreDialog(sheet) {
  openModal(`<h2>⋯ עוד</h2>
    <div class="fs-more">
      <button class="btn" type="button" id="fmExport">💾 ייצוא JSON (גיבוי / שליחה ל-Claude)</button>
      <button class="btn" type="button" id="fmImport">📥 החלף בתוכן מ-JSON</button>
      <button class="btn" type="button" id="fmBrief">📋 העתק בריף ליצירה עם Claude</button>
      <label class="field"><span class="field-label">כותרת תחתונה</span><input id="fmFooter" value="${esc(sheet.footer || '')}" placeholder="${esc(sheet.title || '')}"></label>
      <button class="btn danger" type="button" id="fmDelete">🗑️ מחק נוסחאון</button>
    </div>
    <div class="actions"><button class="btn" value="cancel">סגור</button></div>`, () => {}, form => {
    $('#fmExport', form).onclick = () => fsDownload(`${sheet.title || 'נוסחאון'}.json`, JSON.stringify(fsExportable(sheet), null, 1));
    $('#fmImport', form).onclick = () => { $('#modal').close(); fsImportJson(sheet.id); };
    $('#fmBrief', form).onclick = async () => { await navigator.clipboard.writeText(fsBriefPrompt(sheet)); toast('הבריף הועתק. הדבק אותו ל-Claude יחד עם קבצי הקורס.'); };
    $('#fmFooter', form).onchange = e => Store.put('sheet', sheet.id, { footer: e.target.value.trim() });
    $('#fmDelete', form).onclick = () => {
      if (!confirm(`למחוק את "${sheet.title}"?`)) return;
      Store.remove('sheet', sheet.id); fsOpenId = null; $('#modal').close(); render();
    };
  });
}

const fsExportable = s => { const { id, kind, u, fu, gid, del, ...rest } = s; return rest; };
function fsDownload(name, text, type = 'application/json') {
  saveFile(new Blob([text], { type }), name);
}

function fsImportJson(intoId) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json,application/json';
  input.onchange = async () => {
    try {
      const data = JSON.parse(await input.files[0].text());
      if (!Array.isArray(data.sections)) throw new Error('אין בקובץ "sections"');
      const id = intoId || uid();
      const prev = intoId ? Store.get('sheet', intoId) : null;
      Store.put('sheet', id, { pages: 2, cols: 3, theme: 'standard', ...(prev ? fsExportable(prev) : {}), ...data });
      fsOpenId = id; if (currentView !== 'formula') go('formula'); else render();
      toast('הנוסחאון יובא');
    } catch (e) { toast('הייבוא נכשל: ' + e.message); }
  };
  input.click();
}

// ---------- print / PDF ----------
function fsPrint() {
  const pages = $$('#fsSheet .fs-page');
  if (!pages.length) return;
  const holder = document.createElement('div');
  holder.id = 'fsPrintRoot';
  pages.forEach(p => { const c = p.cloneNode(true); c.classList.remove('over'); holder.appendChild(c); });
  holder.querySelectorAll('.sel-sec').forEach(n => n.classList.remove('sel-sec'));
  document.body.appendChild(holder);
  document.body.classList.add('printing-fs');
  const prevTitle = document.title;
  document.title = fsSheet()?.title || 'נוסחאון';
  const done = () => { document.body.classList.remove('printing-fs'); holder.remove(); document.title = prevTitle; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
  setTimeout(done, 1500);
}

// ---------- new sheet: the brief ----------
function fsGuessProfile(name) {
  const n = String(name || '');
  if (/מוצקים|סטטיקה|דינמיקה|תכן|זרימה|מכני|פיזיקה|חוזק|רובוט|תנודות|מעבר חום/.test(n)) return ['figures', 'derivations', 'procedures'];
  if (/מד["״]?ר|מד["״]?ח|משוואות|חדו|אלגברה|אינפי|הסתברות|סטטיסטיקה/.test(n)) return ['derivations', 'procedures', 'proofs'];
  if (/תרמו/.test(n)) return ['derivations', 'tables', 'procedures'];
  if (/מחשב|פייתון|חישוב|תכנות|אלגוריתם/.test(n)) return ['code', 'procedures', 'tables'];
  if (/כימיה|חומרים/.test(n)) return ['tables', 'derivations', 'figures'];
  return ['derivations', 'procedures'];
}

function fsNewSheet(courseCode) {
  const list = courses();
  const active = list.filter(c => c.status === 'active');
  const opt = c => `<option value="${esc(c.code)}" ${c.code === courseCode ? 'selected' : ''}>${esc(c.name)} (${esc(c.code)})</option>`;
  const hasKey = !!claudeKey();
  openModal(`
    <h2>📐 נוסחאון חדש</h2>
    <p class="muted">כמה שאלות קצרות, כדי שהנוסחאון יתאים בדיוק לקורס ולמבחן.</p>
    <div class="grid2">
      <label class="field full"><span class="field-label">קורס</span><select name="course" id="fsCourse">
        ${active.length ? `<optgroup label="בלימוד">${active.map(opt).join('')}</optgroup>` : ''}
        <optgroup label="כל הקורסים">${list.filter(c => c.status !== 'active').map(opt).join('')}</optgroup></select></label>
      <label class="field"><span class="field-label">כמה עמודים מותר במבחן?</span><input name="pages" type="number" min="1" max="12" value="2"></label>
      <label class="field"><span class="field-label">עמודות בעמוד</span><select name="cols"><option>2</option><option selected>3</option><option>4</option></select></label>
    </div>
    <div class="field"><span class="field-label">🧭 אופי הקורס (נבחר לפי שם הקורס, אפשר לשנות)</span><div class="fs-checks" id="fsProf"></div></div>
    <label class="field"><span class="field-label">🎯 על מה לשים דגש? (נושאים, סוגי שאלות, מה המרצה אוהב)</span><textarea name="emphasis" rows="2" placeholder="למשל: עבודה וירטואלית ומסבכים מופיעים בכל מבחן; חשוב לי סד״פ לכל סוג שאלה"></textarea></label>
    <label class="field"><span class="field-label">🚫 מה לא צריך? (מה כבר בראש, מה לא במבחן)</span><textarea name="skip" rows="2" placeholder="למשל: בלי טריגונומטריה בסיסית; פרק 9 לא למבחן"></textarea></label>
    <label class="field"><span class="field-label">📌 כללי המבחן ודברים נוספים</span><textarea name="rules" rows="2" placeholder="למשל: דף דו-צדדי, מודפס בצבע; מותר מחשבון"></textarea></label>
    <div class="field"><span class="field-label">📂 חומרים (לפי סדר העדיפות). קבצי PDF נקראים במכשיר בלבד.</span>
      <div class="fs-sources">${FS_SOURCES.map(([k, l, d]) => `<label class="fs-src"><span>${l}${d ? `<small class="muted">${d}</small>` : ''}</span><input type="file" name="src_${k}" multiple accept=".pdf,.docx,.txt,.md,.tex"></label>`).join('')}
        <label class="fs-src"><span>💡 נוסחאון קיים לדוגמה והשראה<small class="muted">הסגנון והמבנה שלו ילמדו</small></span><input type="file" name="src_inspire" multiple accept=".pdf,.docx,.txt,.md,.tex,.json"></label>
        <label class="fs-src" id="fsPangeaRow"><span>💧 סיכומי פנגייה לקורס<small class="muted" id="fsPangeaNote">בודק…</small></span><input type="checkbox" name="pangea" id="fsPangea" disabled></label>
      </div>
      <p class="muted small">☁️ בקרוב: חיבור לתיקיית הקורס ב-Google Drive (בוחרים תיקייה, והאפליקציה רואה רק אותה).</p>
    </div>
    <div class="actions">
      <button class="btn" value="cancel" formnovalidate>ביטול</button>
      <button class="btn" value="draft" title="יוצר נוסחאון ריק עם הבריף, ומעתיק את הבריף כדי לשלוח ל-Claude עם החומרים">📋 טיוטה + בריף ל-Claude</button>
      <button class="btn primary" value="ai" ${hasKey ? '' : 'disabled title="צריך מפתח API בהגדרות AI (בלשונית קו״ח)"'}>✨ צור עם AI</button>
    </div>`, (action, fd) => {
    const code = fd.get('course');
    const c = courseByCode(code);
    const brief = { emphasis: String(fd.get('emphasis') || '').trim(), skip: String(fd.get('skip') || '').trim(), rules: String(fd.get('rules') || '').trim() };
    const sheet = {
      title: `נוסחאון ${c?.name || ''}`.trim(), course: code, pages: Math.max(1, +fd.get('pages') || 2), cols: +fd.get('cols') || 3,
      theme: 'standard', autofit: true, profile: fd.getAll('p'), brief, sections: [], coverage: [],
      footer: `${c?.name || ''} · ${new Date().getFullYear()}`,
    };
    const id = uid();
    if (action === 'draft') {
      Store.put('sheet', id, sheet);
      navigator.clipboard?.writeText(fsBriefPrompt(sheet)).then(() => toast('נוצרה טיוטה והבריף הועתק. שלח אותו ל-Claude יחד עם החומרים, ואז "ייבוא JSON".'));
      fsOpenId = id; go('formula');
      return;
    }
    if (action !== 'ai') return;
    const files = {};
    for (const [k] of [...FS_SOURCES, ['inspire']]) files[k] = fd.getAll('src_' + k).filter(f => f && f.size);
    Store.put('sheet', id, sheet);
    fsOpenId = id; go('formula');
    fsGenerate(id, files, !!fd.get('pangea'));
  }, form => {
    const sel = $('#fsCourse', form);
    const drawProf = () => {
      const guess = fsGuessProfile(courseLabel(sel.value));
      $('#fsProf', form).innerHTML = Object.entries(FS_PROFILES).map(([k, l]) => `<label class="chip"><input type="checkbox" name="p" value="${k}" ${guess.includes(k) ? 'checked' : ''}> ${l}</label>`).join('');
      const note = $('#fsPangeaNote', form), box = $('#fsPangea', form);
      Pangea.load().then(() => {
        const pg = Pangea.course(sel.value);
        note.textContent = pg ? `${pg.pages.length} דפים נמצאו` : 'אין סיכומים לקורס הזה';
        box.disabled = !pg; box.checked = !!pg;
      }).catch(() => { note.textContent = 'לא זמין כרגע'; });
    };
    sel.onchange = drawProf;
    drawProf();
  });
  fsWide();
}

// ---------- AI ----------
const FS_STYLE_GUIDE = `STYLE (the student's own standard theme, learned from their sheets):
- Hebrew prose, right-to-left. Math ONLY in LaTeX (KaTeX subset). Only symbols/variables/units are English or Greek.
- One section per topic, titled briefly (e.g. "מאמץ, עיבור וקשרי הזזה"). Inside a section, use sub-headings (t:"h") for sub-topics.
- Definitions and named formulas as "kv" rows: bold Hebrew label + formula (e.g. label "חוק הוק", tex "\\sigma = E\\cdot\\epsilon").
- Important/general formulas as centered "eq".
- For every type of exam question: a "steps" block titled "סדר פעולות (סד״פ):" with items like "**נרמול וזיהוי:** ...".
- Short worked chain as "example" labelled "דוגמת בזק" using \\Rightarrow.
- Traps students fall into: "callout" variant "trap" (titled "קיר הבושה - מלכודות קריטיות:"). Key emphasis: variant "tip" (title "דגש: ...").
- Tables for comparisons/cases (beam load cases, integral tables, Laplace pairs…). A "symbols" table when a topic has many variables.
- Dense, exam-ready, no fluff. Vectors underlined (\\underline{r}) when the course does so.
FIGURES (only when the course profile includes "figures"): draw your own clean SVG (viewBox, ~240x150), white background, black 1.2px lines, blue #1d4ed8 for geometry/vectors, red #dc2626 for forces/loads, labels as <text> with font-family="KaTeX_Math, serif" font-style="italic". Model them on the diagrams in the course material (free-body diagrams, beams, supports, Mohr's circle, cross-sections). No figures for courses without "figures".`;

const FS_BLOCK_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['t'],
  properties: {
    t: { type: 'string', enum: Object.keys(FS_BLOCKS) },
    md: { type: 'string' }, label: { type: 'string' }, tex: { type: 'string' }, note: { type: 'string' },
    title: { type: 'string' }, variant: { type: 'string', enum: ['tip', 'trap', 'note'] }, style: { type: 'string', enum: ['square', 'bullet', 'num'] },
    items: { type: 'array', items: { type: 'string' } }, svg: { type: 'string' }, caption: { type: 'string' }, width: { type: 'number' },
    head: { type: 'array', items: { type: 'string' } }, rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
  },
};
const FS_BLOCKS_SCHEMA = { type: 'object', additionalProperties: false, required: ['blocks'], properties: { blocks: { type: 'array', items: FS_BLOCK_SCHEMA } } };
const FS_SECTIONS_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['sections'],
  properties: { sections: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['title', 'blocks'], properties: { title: { type: 'string' }, blocks: { type: 'array', items: FS_BLOCK_SCHEMA } } } } },
};
const FS_SHEET_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['title', 'profile', 'sections', 'coverage'],
  properties: {
    title: { type: 'string' },
    profile: { type: 'array', items: { type: 'string', enum: Object.keys(FS_PROFILES) } },
    sections: FS_SECTIONS_SCHEMA.properties.sections,
    coverage: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['topic', 'status'], properties: { topic: { type: 'string' }, status: { type: 'string', enum: ['in', 'partial', 'missing'] }, note: { type: 'string' } } } },
  },
};

const FS_SYSTEM = `You build exam formula sheets (נוסחאון) for Technion students, as structured JSON that an app lays out on A4 pages.
${FS_STYLE_GUIDE}
The sheet must be specific to THIS course: its notation, its typical exam questions, its traps. Prioritise what past exams actually need.`;

function fsBriefPrompt(sheet) {
  const c = courseByCode(sheet.course);
  return `${FS_SYSTEM}

TASK: Build the formula sheet for the course "${c?.name || sheet.course}" (${sheet.course}).
- Space: ${sheet.pages} A4 page(s), ${sheet.cols} columns each, ~10.5px font (roughly ${sheet.pages * sheet.cols * 55} short lines in total). Fill it, don't overflow.
- Course profile: ${(sheet.profile || []).map(p => FS_PROFILES[p]).join(', ') || 'decide'}.
- Emphasise: ${sheet.brief?.emphasis || '-'}
- Leave out: ${sheet.brief?.skip || '-'}
- Exam rules / notes: ${sheet.brief?.rules || '-'}
- Source priority: past exams > course material (syllabus, official sheets) > the student's summaries > lecture slides > tutorials > homework. An attached existing formula sheet is for style and inspiration.
- Also return "coverage": every syllabus topic with status in / partial / missing (and a short note), so gaps are visible.

OUTPUT: one JSON object: {"title", "profile":[${Object.keys(FS_PROFILES).map(k => `"${k}"`).join('|')}], "sections":[{"title","blocks":[...]}], "coverage":[{"topic","status","note"}]}
Block types (field "t"): ${Object.entries(FS_BLOCKS).map(([t, [l, f]]) => `${t} (${l}: ${f.map(x => x[0]).join(', ')})`).join('; ')}.
"rows" is an array of arrays of strings; table cells may hold an inline <svg>.`;
}

async function fsAiCall(prompt, schema, maxTokens = 16000) {
  const client = await claudeClient();
  const stream = client.beta.messages.stream({
    model: CV_MODEL,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
    system: FS_SYSTEM,
    // prompt: text, or content blocks (text + PDF documents for scanned material)
    messages: [{ role: 'user', content: prompt }],
  });
  const response = await stream.finalMessage();
  if (response.stop_reason === 'refusal') throw new Error('הבקשה נדחתה');
  if (response.stop_reason === 'max_tokens') throw new Error('התשובה נחתכה (ארוכה מדי). נסה בקשה מצומצמת יותר.');
  return JSON.parse(response.content.filter(b => b.type === 'text').map(b => b.text).join(''));
}

function fsAiDialog(sheet) {
  const secs = sheet.sections || [];
  const ideas = [`קצר כדי שייכנס ל-${sheet.pages || 2} עמודים`, 'הוסף טבלת סימנים ויחידות', 'הוסף "קיר הבושה" לכל פרק חשוב', 'הוסף סד״פ לכל סוג שאלה במבחן', 'בדוק שהנוסחאות נכונות ותקן טעויות'];
  openModal(`<h2>✨ עזרה מ-AI</h2>
    <p class="muted">כתוב מה לשנות. ה-AI מקבל את הנוסחאון (או פרק אחד) ומחזיר גרסה מתוקנת; אפשר לבטל.</p>
    <label class="field"><span class="field-label">על מה לעבוד?</span><select name="scope"><option value="all">כל הנוסחאון</option>${secs.map((s, i) => `<option value="${i}" ${fsSelSection === i ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}</select></label>
    <label class="field"><span class="field-label">הבקשה</span><textarea name="ask" rows="3" required></textarea></label>
    <div class="chips">${ideas.map(i => `<button type="button" class="chip" data-idea="${esc(i)}">${esc(i)}</button>`).join('')}</div>
    ${claudeKey() ? '' : '<p class="bad small">צריך מפתח API של Anthropic (בלשונית קו״ח ← הגדרות AI). בלי מפתח: "⋯ ← ייצוא JSON", שלח ל-Claude, ו"החלף בתוכן מ-JSON".</p>'}
    <p class="muted small" id="fsAiMsg"></p>
    <div class="actions"><button class="btn" value="cancel" formnovalidate>סגור</button><button class="btn primary" value="go" ${claudeKey() ? '' : 'disabled'}>✨ בצע</button></div>`, (action, fd) => {
    if (action !== 'go') return;
    const ask = String(fd.get('ask') || '').trim(), scope = fd.get('scope');
    if (!ask) return false;
    const msg = $('#fsAiMsg');
    msg.textContent = '✨ עובד על זה… (יכול לקחת דקה)';
    $$('#modalForm button').forEach(b => b.disabled = true);
    const part = scope === 'all' ? secs : [secs[+scope]];
    fsAiCall(`Formula sheet "${sheet.title}" (course: ${courseLabel(sheet.course)}, ${sheet.pages} pages × ${sheet.cols} columns, profile: ${(sheet.profile || []).join(', ')}).
${scope === 'all' ? 'The whole sheet' : 'One section of it'}:\n${JSON.stringify({ sections: part })}\n\nThe student asks: ${ask}\n\nReturn {"sections":[...]} replacing ${scope === 'all' ? 'all sections' : 'that one section (you may return more than one if splitting makes sense)'}.`, FS_SECTIONS_SCHEMA, 32000)
      .then(out => {
        const before = structuredClone(secs);
        const next = scope === 'all' ? out.sections : [...secs.slice(0, +scope), ...out.sections, ...secs.slice(+scope + 1)];
        fsPutSections(sheet, next.map(s => ({ id: fsId(), ...s })));
        $('#modal').close();
        toast('✨ עודכן', () => fsPutSections(sheet, before));
      })
      .catch(e => { msg.innerHTML = aiErrorHtml(e); $$('#modalForm button').forEach(b => b.disabled = false); });
    return false;
  }, form => {
    $$('[data-idea]', form).forEach(b => b.onclick = () => { form.elements.ask.value = b.dataset.idea; });
  });
}

// Full generation from the brief and the files (text is read on the device).
async function fsGenerate(id, files, usePangea) {
  const setStatus = html => { const st = $('#fsStatus'); if (st && fsOpenId === id) st.innerHTML = html; };
  try {
    const sheet = Store.get('sheet', id);
    const parts = [];
    // Scanned or handwritten PDFs have almost no text: Claude reads those as documents (it sees
    // the pages). They are attached in priority order (past exams first) up to the request limits.
    const docs = [], skipped = [];
    let docPages = 0, docBytes = 0;
    const budget = { exams: 120000, material: 80000, summaries: 60000, slides: 60000, tutorials: 40000, hw: 30000, inspire: 30000, pangea: 60000 };
    for (const [k, l] of [...FS_SOURCES, ['inspire', 'existing formula sheet (style/inspiration only)']]) {
      let text = '';
      for (const f of files[k] || []) {
        setStatus(`<span class="muted">📖 קורא ${esc(f.name)}…</span>`);
        if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') {
          const { text: t, pages } = await fsPdfText(f);
          if (t.replace(/\s/g, '').length < pages * 150) { // mostly scans
            if (docPages + pages <= 90 && docBytes + f.size <= 22e6) {
              docPages += pages; docBytes += f.size;
              docs.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: await fsBase64(f) }, title: f.name, context: `source kind: ${k} (${l})` });
              text += `\n--- ${f.name}: scanned, attached as a document ---\n`;
            } else skipped.push(f.name);
            continue;
          }
          text += `\n--- ${f.name} ---\n${t}`;
        } else text += `\n--- ${f.name} ---\n` + (/\.json$/i.test(f.name) ? await f.text() : await fileToText(f));
      }
      if (text.trim()) parts.push(`<source kind="${k}" label="${esc(l)}">\n${text.slice(0, budget[k])}\n</source>`);
    }
    if (skipped.length) parts.push(`(Not attached, over the size limit: ${skipped.join(', ')})`);
    if (usePangea) {
      const pg = Pangea.course(sheet.course);
      let text = '';
      for (const [i, p] of (pg?.pages || []).entries()) {
        setStatus(`<span class="muted">💧 קורא את פנגייה ${i + 1}/${pg.pages.length}…</span>`);
        try { text += `\n--- ${p.title} ---\n` + await Pangea.pageText(p.url); } catch {}
      }
      if (text.trim()) parts.push(`<source kind="summaries" label="Pangea student summaries">\n${text.slice(0, budget.pangea)}\n</source>`);
    }
    setStatus('<span class="muted">✨ Claude בונה את הנוסחאון… (בדרך כלל 1-3 דקות)</span>');
    const prompt = `${fsBriefPrompt(sheet)}\n\nSOURCES:\n${parts.join('\n\n') || '(no files: use your knowledge of the standard Technion syllabus for this course)'}`;
    const out = await fsAiCall(docs.length ? [...docs, { type: 'text', text: prompt }] : prompt, FS_SHEET_SCHEMA, 48000);
    if (skipped.length) toast(`לא נשלחו (גדולים מדי): ${skipped.join(', ')}`);
    Store.put('sheet', id, { title: out.title || sheet.title, profile: out.profile?.length ? out.profile : sheet.profile, sections: out.sections.map(s => ({ id: fsId(), ...s })), coverage: out.coverage || [] });
    toast('✨ הנוסחאון מוכן');
  } catch (e) {
    console.error(e);
    setStatus(`<span class="bad">היצירה נכשלה: ${aiErrorHtml(e)}</span>`);
  }
}

// Text of a PDF and its page count (to tell typed files from scans).
async function fsPdfText(file) {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
  let text = '';
  for (let p = 1; p <= doc.numPages; p++) text += (await (await doc.getPage(p)).getTextContent()).items.map(i => i.str).join(' ') + '\n';
  return { text, pages: doc.numPages };
}
const fsBase64 = file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });

// Wider dialog for the editors; back to normal when it closes.
function fsWide() {
  const dlg = $('#modal');
  dlg.classList.add('wide');
  // A late "close" from the dialog before this one must not shrink this one.
  dlg.addEventListener('close', () => { if (!dlg.open) dlg.classList.remove('wide'); }, { once: true });
}
