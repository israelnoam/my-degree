// Reads the Technion grade sheet PDF (גיליון ציונים) right in the browser and
// fills in the curriculum map: grades, exemptions and the semester of each course.

// pdf.js 3.11.174 is served from this site (vendor/), so it works offline and no CDN can change it.
const PDFJS_URL = 'vendor/pdf.min.js';
const PDFJS_WORKER = 'vendor/pdf.worker.min.js';
const SEASONS = { 'חורף': 0, 'אביב': 1, 'קיץ': 2 };

function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PDFJS_URL;
    s.onload = () => { pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; resolve(pdfjsLib); };
    s.onerror = () => reject(new Error('לא הצלחתי לטעון את קורא ה-PDF (צריך אינטרנט)'));
    document.head.appendChild(s);
  });
}

// Text of every row in the PDF, cells right-to-left.
async function pdfRows(file) {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
  const rows = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const { items } = await (await doc.getPage(p)).getTextContent();
    const byY = {};
    for (const it of items) {
      if (!it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 3);
      (byY[y] ||= []).push([it.transform[4], it.str.trim()]);
    }
    Object.keys(byY).map(Number).sort((a, b) => b - a)
      .forEach(y => rows.push(byY[y].sort((a, b) => b[0] - a[0]).map(c => c[1])));
  }
  return rows;
}

// Technion moved to 8-digit numbers: 01040041 is the old 104041.
function oldCourseCode(code8) {
  return /^0\d{3}0\d{3}$/.test(code8) ? code8.slice(1, 4) + code8.slice(5) : code8;
}

function parseGradeSheet(rows) {
  const out = [];
  let summary = null;
  for (const cells of rows) {
    const line = cells.join(' ');
    const sum = line.match(/וצבר\s+([\d.]+)\s+נקודות.*?([\d.]+)\s*$/);
    if (sum) summary = { credits: +sum[1], gpa: +sum[2] };
    const codeIdx = cells.findIndex(c => /^\d{8}$/.test(c));
    const sem = line.match(/(\d{4})-(\d{4})\s*(חורף|אביב|קיץ)/);
    if (codeIdx < 0 || !sem) continue;
    // After the code: name, credits, grade, then the semester. Read from the end,
    // since names can end in a number ("פיסיקה 1").
    const rest = cells.slice(codeIdx + 1).filter(c => !/\d{4}-\d{4}/.test(c) && !/^(חורף|אביב|קיץ|תש)/.test(c));
    const isNum = c => /^\d+(\.\d+)?$/.test(c);
    let creditsIdx;
    if (rest.length >= 3 && isNum(rest.at(-1)) && isNum(rest.at(-2))) creditsIdx = rest.length - 2; // numeric grade
    else { creditsIdx = rest.length - 1; while (creditsIdx > 0 && !isNum(rest[creditsIdx])) creditsIdx--; } // פטור / עובר
    if (creditsIdx < 1) continue;
    const gradeText = rest.slice(creditsIdx + 1).join(' ').trim();
    out.push({
      code8: cells[codeIdx],
      name: rest.slice(0, creditsIdx).join(' '),
      credits: +rest[creditsIdx],
      grade: /^\d{1,3}$/.test(gradeText) ? +gradeText : null,
      gradeText,
      year: +sem[1],
      season: sem[3],
    });
  }
  return { courses: out, summary };
}

function semesterNumber(entry, firstYear) {
  // Winter of the first year is semester 1, its spring is 2; summer counts with spring.
  return (entry.year - firstYear) * 2 + (entry.season === 'חורף' ? 1 : 2);
}

// What importing would change, without changing anything yet.
function planGradeImport(parsed) {
  const counted = parsed.courses.filter(c => c.credits > 0);
  const firstYear = Math.min(...counted.map(c => c.year));
  return counted.map(c => {
    const old = oldCourseCode(c.code8);
    const existing = courseByCode(c.code8) || courseByCode(old);
    const exempt = /פטור/.test(c.gradeText);
    return {
      ...c,
      appCode: existing ? existing.code : old,
      existing,
      status: exempt ? 'exempt' : 'done',
      sem: semesterNumber(c, firstYear),
    };
  });
}

function applyGradeImport(plan) {
  for (const c of plan) {
    const base = c.existing || { code: c.appCode, name: c.name, credits: c.credits, prereqs: [], type: 'elective', notes: '' };
    // A binary pass you already marked stays one; the sheet still shows the numeric grade.
    const status = c.existing?.status === 'binary' && c.status === 'done' ? 'binary' : c.status;
    Store.put('course', c.appCode, {
      ...base, credits: c.credits, sem: c.sem, status, grade: c.status === 'done' ? c.grade : null,
    });
  }
  Sync.schedule(200);
}

async function importGradeSheet(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  toast('קורא את הגיליון…');
  let parsed;
  try {
    parsed = parseGradeSheet(await pdfRows(file));
  } catch (err) {
    alert(err.message || 'לא הצלחתי לקרוא את הקובץ');
    return;
  }
  if (!parsed.courses.length) { alert('לא מצאתי קורסים בקובץ. זה גיליון הציונים מהטכניון?'); return; }
  const plan = planGradeImport(parsed);
  const graded = plan.filter(c => c.grade !== null);
  const gc = graded.reduce((a, c) => a + c.credits, 0);
  const gpa = gc ? graded.reduce((a, c) => a + c.grade * c.credits, 0) / gc : null;
  const credits = plan.reduce((a, c) => a + c.credits, 0);

  openModal(`
    <h2>📄 גיליון ציונים</h2>
    <p>מצאתי <b>${plan.length}</b> קורסים · <b>${fmt(credits)}</b> נק״ז${gpa !== null ? ` · ממוצע <b>${fmt(gpa, 1)}</b>` : ''}${parsed.summary ? ` <span class="muted">(בגיליון: ${fmt(parsed.summary.credits)} נק״ז, ממוצע ${parsed.summary.gpa})</span>` : ''}</p>
    <div class="import-list">
      ${plan.map(c => `<div class="import-row">
        <span><b>${esc(c.existing ? c.existing.name : c.name)}</b>${c.existing ? '' : ' <span class="badge">חדש</span>'}<br><small class="muted">${esc(semName(c.sem))} · ${fmt(c.credits)} נק״ז</small></span>
        <span class="import-grade">${c.status === 'exempt' ? 'פטור' : (c.grade ?? esc(c.gradeText))}</span>
      </div>`).join('')}
    </div>
    <p class="muted">קורסים בלי נק״ז (השלמות, אנגלית, עברית) לא נכנסים. הציונים יחליפו את מה שמופיע עכשיו במפה.</p>
    <div class="actions">
      <span class="spacer"></span>
      <button class="btn" value="cancel" formnovalidate>ביטול</button>
      <button class="btn primary" value="save">הכנס למפה</button>
    </div>`,
  () => { applyGradeImport(plan); toast(`${plan.length} קורסים עודכנו`); go('map'); });
}
