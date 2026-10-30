// CheeseFork course data (public, published per semester by cheesefork.cf):
// exam dates, syllabus, real prerequisites, lecturers and lecture/tutorial groups.

const CF_BASE = 'https://sap.cheesefork.cf';

// App semester n → CheeseFork file. Semester 1 is the winter of settings().startYear.
function cfSemesterKey(n) {
  const start = settings().startYear || 2025;
  if (n > 100) return `${start + Math.floor((n - 101) / 2)}_202`;
  return `${start + Math.floor((n - 1) / 2)}_${n % 2 ? 200 : 201}`;
}
function currentSemesterNumber(date = new Date()) {
  const start = settings().startYear || 2025;
  const m = date.getMonth() + 1, y = date.getFullYear();
  // Winter runs ~late Oct to March, spring ~late March to August (summer counts with spring).
  const winterYear = m >= 10 ? y : y - 1;
  const isWinter = m >= 10 || m <= 3;
  return isWinter ? (winterYear - start) * 2 + 1 : (y - 1 - start) * 2 + 2;
}

const HEB_YEARS = { 2023: 'תשפ״ד', 2024: 'תשפ״ה', 2025: 'תשפ״ו', 2026: 'תשפ״ז', 2027: 'תשפ״ח', 2028: 'תשפ״ט', 2029: 'תש״צ', 2030: 'תשצ״א' };
function semesterYearLabel(n) {
  if (n > 100) return `קיץ ${HEB_YEARS[(settings().startYear || 2025) + Math.floor((n - 101) / 2)] || ''}`.trim();
  const year = (settings().startYear || 2025) + Math.floor((n - 1) / 2);
  return `${n % 2 ? 'חורף' : 'אביב'} ${HEB_YEARS[year] || year}`;
}

const CF = {
  data: {},     // key -> Map(code8 -> course)
  loading: {},

  load(key) {
    if (this.data[key]) return Promise.resolve(this.data[key]);
    if (this.loading[key]) return this.loading[key];
    // Each file assigns a global; load one at a time so they don't overwrite each other.
    const prev = CF._chain || Promise.resolve();
    this.loading[key] = CF._chain = prev.catch(() => {}).then(() => new Promise((resolve, reject) => {
      delete window.courses_from_rishum;
      const s = document.createElement('script');
      s.src = `${CF_BASE}/courses_${key}.min.js`;
      s.onload = () => {
        const list = window.courses_from_rishum || [];
        const map = new Map(list.map(c => [c.general['מספר מקצוע'], c]));
        this.data[key] = map;
        s.remove();
        resolve(map);
      };
      s.onerror = () => { s.remove(); delete this.loading[key]; reject(new Error('אין נתוני CheeseFork לסמסטר הזה')); };
      document.head.appendChild(s);
    }));
    return this.loading[key];
  },

  // The current semester, plus the same season last year (shows what usually opens when).
  async loadRecent() {
    const now = currentSemesterNumber();
    const keys = [cfSemesterKey(now), cfSemesterKey(now - 1), cfSemesterKey(now - 2)].filter((k, i, a) => a.indexOf(k) === i);
    const out = {};
    for (const k of keys) { try { out[k] = await this.load(k); } catch {} }
    return out;
  },

  find(code) {
    const c8 = toCode8(code);
    for (const key of Object.keys(this.data).sort().reverse()) {
      const c = this.data[key].get(c8);
      if (c) return { key, course: c };
    }
    return null;
  },

  offeredIn(code) {
    const c8 = toCode8(code);
    return Object.keys(this.data).filter(k => this.data[k].has(c8));
  },
};

// 104041 -> 01040041, 034053 -> 00340053; 8-digit codes stay.
function toCode8(code) {
  code = String(code);
  return code.length === 6 ? `0${code.slice(0, 3)}0${code.slice(3)}` : code;
}
function appCodeFor(code8) {
  const old = typeof oldCourseCode === 'function' ? oldCourseCode(code8) : code8;
  return courseByCode(code8) ? code8 : old;
}
function cfKeyLabel(key) {
  const [y, s] = key.split('_');
  return `${s === '200' ? 'חורף' : s === '201' ? 'אביב' : 'קיץ'} ${HEB_YEARS[y] || y}`;
}

// "(A ו-B) או (C ו-D)" evaluated against what you've completed.
function evalPrereqs(expr, isDone) {
  if (!expr || !expr.trim()) return { ok: true, codes: [] };
  const tokens = expr.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').replace(/ו-/g, ' AND ').replace(/(^|\s)או(?=\s)/g, ' OR ').split(/\s+/).filter(Boolean);
  let i = 0;
  const codes = [];
  const factor = () => {
    const t = tokens[i++];
    if (t === '(') { const v = orExpr(); i++; return v; }
    codes.push(t);
    return isDone(t);
  };
  const andExpr = () => { let v = factor(); while (tokens[i] === 'AND') { i++; v = factor() && v; } return v; };
  const orExpr = () => { let v = andExpr(); while (tokens[i] === 'OR') { i++; v = andExpr() || v; } return v; };
  try { return { ok: orExpr(), codes: [...new Set(codes)] }; } catch { return { ok: true, codes }; }
}

function doneCode8Check() {
  const done = new Set(courses().filter(isComplete).map(c => toCode8(c.code)));
  // A course variant (פיסיקה 2ממ׳) also covers its regular version.
  courses().filter(c => isComplete(c) && c.variantOf).forEach(c => done.add(toCode8(c.variantOf)));
  return code8 => done.has(code8);
}

function prereqHtml(expr) {
  if (!expr) return '<span class="muted">אין</span>';
  const check = doneCode8Check();
  return esc(expr).replace(/\d{8}/g, code8 => {
    const app = appCodeFor(code8);
    const name = courseByCode(app)?.name || CF.find(code8)?.course.general['שם מקצוע'] || code8;
    return `<span class="pq ${check(code8) ? 'ok' : ''}" title="${code8}">${esc(name)}</span>`;
  }).replace(/ ו-/g, ' + ');
}

// Course-card section; fills itself in once the data arrives.
function cheeseForkSection(code) {
  return `<div class="cf-box" id="cfBox" data-code="${esc(code)}"><p class="muted">טוען נתונים מ-CheeseFork…</p></div>`;
}

async function fillCheeseFork(form, code) {
  const box = $('#cfBox', form);
  if (!box) return;
  await CF.loadRecent();
  const hit = CF.find(code);
  if (!box.isConnected) return;
  if (!hit) {
    box.innerHTML = `<p class="muted">הקורס לא מופיע ב-CheeseFork בסמסטרים האחרונים.</p>`;
    return;
  }
  const g = hit.course.general;
  const groups = {};
  for (const s of hit.course.schedule || []) (groups[`${s['סוג']} ${s['קבוצה']}`] ||= []).push(s);
  const offered = CF.offeredIn(code).sort().map(cfKeyLabel).join(', ');
  const exams = [['מועד א׳', g['מועד א']], ['מועד ב׳', g['מועד ב']]].filter(e => e[1]);
  box.innerHTML = `
    <div class="cf-head"><b>🧀 CheeseFork · ${esc(cfKeyLabel(hit.key))}</b><small class="muted">נפתח ב: ${esc(offered)}</small></div>
    ${exams.length ? `<div class="cf-exams">${exams.map(([l, d]) => `<span class="chip">🎯 ${l}: ${esc(d.replace(/-/g, '.'))}</span>`).join('')}
      <button type="button" class="btn" id="cfExamTasks">＋ הוסף מועדים למשימות</button></div>` : ''}
    <div class="field"><span class="field-label">דרישות קדם (מהטכניון)</span><div class="pq-line">${prereqHtml(g['מקצועות קדם'])}</div></div>
    ${g['מקצועות צמודים'] ? `<div class="field"><span class="field-label">מקצועות צמודים</span><div class="pq-line">${prereqHtml(g['מקצועות צמודים'])}</div></div>` : ''}
    ${g['אחראים'] ? `<p class="muted">אחראי: ${esc(g['אחראים'])}</p>` : ''}
    ${g['סילבוס'] ? `<details open><summary>📖 סילבוס</summary><p class="cf-syl">${esc(g['סילבוס'])}</p></details>` : ''}
    ${Object.keys(groups).length ? `<details><summary>קבוצות ושעות (${Object.keys(groups).length})</summary><div class="cf-groups">
      ${Object.entries(groups).map(([name, rows]) => `<div class="cf-group">
        <div><b>${esc(name)}</b> · ${rows.map(r => `${esc(r['יום'])} <span dir="ltr">${esc(r['שעה'])}</span>${r['בניין'] ? ` · ${esc(r['בניין'])} ${esc(r['חדר'] || '')}` : ''}`).join(' | ')}
        <br><small class="muted">${esc([...new Set(rows.map(r => r['מרצה/מתרגל']).filter(Boolean))].join(', '))}</small></div>
        <button type="button" class="btn" data-cfgroup="${esc(name)}">＋ למערכת</button>
      </div>`).join('')}</div></details>` : ''}
    ${g['הערות'] ? `<p class="muted cf-note">${esc(g['הערות'])}</p>` : ''}`;

  $('#cfExamTasks', box)?.addEventListener('click', () => {
    let added = 0;
    for (const [label, d] of exams) {
      const [dd, mm, yy] = d.split('-');
      const due = `${yy}-${mm}-${dd}`;
      const exists = Store.list('task').some(t => t.course === code && t.type === 'exam' && (t.due || '').startsWith(due));
      if (!exists) { Store.put('task', uid(), { title: `${label} – ${courseLabel(code) || g['שם מקצוע']}`, type: 'exam', course: code, due, done: false, notes: '' }); added++; }
    }
    toast(added ? `נוספו ${added} מועדים למשימות` : 'המועדים כבר במשימות');
  });
  $$('[data-cfgroup]', box).forEach(b => b.onclick = () => {
    const rows = groups[b.dataset.cfgroup];
    const dayIdx = { 'ראשון': 0, 'שני': 1, 'שלישי': 2, 'רביעי': 3, 'חמישי': 4, 'שישי': 5 };
    let added = 0;
    for (const r of rows) {
      const [start, end] = String(r['שעה']).split('-').map(s => s.trim().padStart(5, '0'));
      const day = dayIdx[r['יום']];
      if (day === undefined || !start || !end) continue;
      const dup = slots().some(s => s.course === code && +s.day === day && s.start === start);
      if (dup) continue;
      Store.put('slot', uid(), { course: code, title: '', stype: r['סוג'] || 'הרצאה', day, start, end, room: [r['בניין'], r['חדר']].filter(Boolean).join(' ') });
      added++;
    }
    toast(added ? `נוסף למערכת השעות (${added})` : 'כבר במערכת');
  });
}

// Quick links shown in every course card.
function courseLinks(c) {
  const c8 = toCode8(c.code);
  const q = encodeURIComponent(c.name || c.code);
  const links = [
    ['🧀 CheeseFork', `https://cheesefork.cf/course/${c.code}`],
    ['📚 Moodle', `https://moodle26.technion.ac.il/course/search.php?search=${c8}`],
    ['🎬 Panopto', `https://panoptotech.cloud.panopto.eu/Panopto/Pages/Sessions/List.aspx#query=%22${encodeURIComponent(c.name || c8)}%22`],
    ['🏛️ קטלוג הטכניון', `https://students.technion.ac.il/local/technionsearch/course/${c8}`],
    ['📁 תיקייה בדרייב', `https://drive.google.com/drive/search?q=${q}`],
  ];
  return `<div class="link-row">${links.map(([l, u]) => `<a class="btn small" href="${esc(u)}" target="_blank" rel="noopener">${l}</a>`).join('')}</div>`;
}
