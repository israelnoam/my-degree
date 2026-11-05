// "הוסף מערכת מומלצת": recommended semester plans.
// - Built in: Mechanical Engineering (the seed curriculum).
// - From a faculty booklet PDF: Claude reads it and returns each track's semester plan (needs an AI key).
// - From a plan file: someone exports their plan (or their own course order) and shares the file.
// Applying a plan never touches courses you've finished, are taking, or wrote notes on.

const PLAN_FILE_TYPE = 'degree-plan';
const PDF_LIB_URL = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
const PLAN_PDF_MAX_PAGES = 100;

const BUILT_IN_PLANS = [{
  id: 'me-5786',
  name: 'הנדסת מכונות · תוכנית מומלצת תשפ״ו',
  faculty: 'הנדסת מכונות',
  year: '2025-2026',
  totalCredits: DEGREE_TOTAL_CREDITS,
  semesters: SEMESTER_NAMES.length,
  builtIn: true,
  courses: SEED_COURSES.map(([sem, code, name, credits, prereqs, type]) => ({ sem, code, name, credits, prereqs, type })),
}];

const savedPlans = () => (Store.get('meta', 'plans')?.items || []).filter(p => p && Array.isArray(p.courses));
const allPlans = () => [...BUILT_IN_PLANS, ...savedPlans()];
const planById = id => allPlans().find(p => p.id === id);

function savePlan(plan) {
  const items = savedPlans().filter(p => p.id !== plan.id);
  Store.put('meta', 'plans', { items: [...items, plan] });
  Sync.schedule(500);
}

// Codes from booklets are often 8 digits (01040041); the app uses the 6-digit form (104041).
function planCode(code) {
  const d = String(code || '').replace(/\D/g, '');
  if (d.length === 8) return oldCourseCode(d);
  return d ? d.padStart(6, '0') : '';
}

const PLAN_TYPES = ['mandatory', 'elective', 'project', 'sports'];

// Make any plan (built in, from a file, from AI) safe and consistent.
function cleanPlan(p) {
  const courses = (p.courses || []).map(c => ({
    sem: Math.max(0, Math.min(12, Math.round(+c.sem || 0))),
    code: planCode(c.code),
    name: String(c.name || '').trim().slice(0, 120),
    credits: Math.max(0, +c.credits || 0),
    prereqs: (Array.isArray(c.prereqs) ? c.prereqs : []).map(planCode).filter(Boolean),
    type: PLAN_TYPES.includes(c.type) ? c.type : 'mandatory',
  })).filter(c => c.code && c.name);
  const unique = [...new Map(courses.map(c => [c.code, c])).values()];
  return {
    id: String(p.id || uid()),
    name: String(p.name || 'תוכנית לימודים').trim().slice(0, 120),
    faculty: String(p.faculty || '').trim().slice(0, 80),
    year: String(p.year || '').trim().slice(0, 20),
    totalCredits: +p.totalCredits > 0 ? +p.totalCredits : unique.reduce((a, c) => a + c.credits, 0),
    semesters: Math.max(1, Math.min(12, Math.round(+p.semesters || Math.max(...unique.map(c => c.sem), 8)))),
    builtIn: !!p.builtIn,
    courses: unique,
  };
}

// A course you've already made progress on stays exactly as it is.
const courseKept = c => c.grade != null || ['done', 'exempt', 'binary', 'active'].includes(c.status) || !!(c.notes || '').trim();

// What applying would change, without changing anything yet.
function planDiff(plan) {
  const codes = new Set(plan.courses.map(c => c.code));
  const add = [], move = [], same = [];
  for (const pc of plan.courses) {
    const ex = courseByCode(pc.code);
    if (!ex) add.push(pc);
    else if (courseKept(ex)) same.push(pc);
    else if (ex.sem !== pc.sem) move.push(pc);
    else same.push(pc);
  }
  // Mandatory courses from the old plan that you haven't started and aren't in the new one.
  const remove = courses().filter(c => !codes.has(c.code) && !courseKept(c) && c.type !== 'elective');
  return { add, move, same, remove };
}

function applyDegreePlan(plan) {
  const before = snapshot([...Object.keys(Store.recs).filter(k => k.startsWith('course:')), 'meta:settings']);
  const { remove, add } = planDiff(plan);
  for (const c of remove) Store.remove('course', c.code);
  for (const pc of plan.courses) {
    const ex = courseByCode(pc.code);
    if (ex && courseKept(ex)) {
      // Keep where and how you took it; just fill in prerequisites it didn't have.
      if (!(ex.prereqs || []).length && pc.prereqs.length) Store.put('course', pc.code, { prereqs: pc.prereqs });
      continue;
    }
    Store.put('course', pc.code, {
      ...(ex || {}),
      code: pc.code, name: pc.name, credits: pc.credits, sem: pc.sem, prereqs: pc.prereqs, type: pc.type,
      status: ex?.status || 'none', grade: ex?.grade ?? null, notes: ex?.notes || '',
    });
  }
  Store.put('meta', 'settings', {
    planId: plan.id, planName: plan.name, totalCredits: plan.totalCredits,
    semesters: Math.max(plan.semesters, ...courses().filter(c => c.sem < 100).map(c => c.sem || 0)),
  });
  Sync.schedule(300);
  toast(`התוכנית "${plan.name}" נטענה`, () => {
    add.forEach(c => Store.remove('course', c.code)); // courses the plan added
    Store.restore(before);
    Sync.schedule(300);
  });
}

// ---------- files ----------
function downloadJson(obj, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function exportPlan(plan) {
  const { builtIn, ...rest } = plan;
  downloadJson({ type: PLAN_FILE_TYPE, v: 1, plan: rest }, `${plan.name.replace(/[\\/:*?"<>|]+/g, ' ').trim()}.json`);
}

// Your own course order as a plan: courses and semesters only, never grades, statuses or notes.
function myOrderAsPlan() {
  const st = settings();
  return cleanPlan({
    id: uid(),
    name: `הסדר של ${st.planName ? st.planName.split('·')[0].trim() : 'התוכנית שלי'} · ${ymd(new Date())}`,
    faculty: planById(st.planId)?.faculty || '',
    totalCredits: st.totalCredits, semesters: st.semesters,
    courses: courses().filter(c => c.sem && c.sem < 100).map(c => ({ sem: c.sem, code: c.code, name: c.name, credits: c.credits, prereqs: c.prereqs, type: c.type })),
  });
}

async function importPlanFile(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { throw new Error('הקובץ לא נקרא. זה קובץ תוכנית (JSON) שיוצא מהאפליקציה?'); }
  if (data?.type !== PLAN_FILE_TYPE || !data.plan) throw new Error('זה לא קובץ תוכנית לימודים של האפליקציה.');
  const plan = cleanPlan({ ...data.plan, id: uid(), builtIn: false });
  if (!plan.courses.length) throw new Error('אין קורסים בקובץ.');
  return plan;
}

// ---------- from a faculty booklet (AI) ----------
const PLAN_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['tracks'],
  properties: {
    tracks: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['name', 'faculty', 'year', 'totalCredits', 'semesters', 'courses'],
        properties: {
          name: { type: 'string' }, faculty: { type: 'string' }, year: { type: 'string' },
          totalCredits: { type: 'number' }, semesters: { type: 'integer' },
          courses: {
            type: 'array',
            items: {
              type: 'object', additionalProperties: false,
              required: ['sem', 'code', 'name', 'credits', 'prereqs', 'type'],
              properties: {
                sem: { type: 'integer' }, code: { type: 'string' }, name: { type: 'string' },
                credits: { type: 'number' }, prereqs: { type: 'array', items: { type: 'string' } },
                type: { type: 'string', enum: PLAN_TYPES },
              },
            },
          },
        },
      },
    },
  },
};

const PLAN_SYSTEM = `You read Technion faculty study booklets (קטלוג / חוברת תוכנית לימודים) and extract the recommended semester-by-semester plan ("תוכנית לימודים מומלצת") of every track (מסלול) in the document.
Rules:
- Only courses that the booklet places in a specific semester of the recommended plan. sem = the semester number in the plan (1 = first winter, 2 = first spring, ...).
- code: the course number exactly as printed (6 or 8 digits). name: the Hebrew name as printed. credits: נקודות (נק״ז).
- prereqs: course numbers listed as מקצועות קדם for that course, only if the booklet lists them; otherwise [].
- type: "mandatory" for required courses, "elective" for a placeholder like "קורס בחירה", "project" for projects, "sports" for physical education.
- totalCredits: the total credits of the degree for that track, as stated. semesters: the number of semesters in the plan.
- faculty: the faculty name in Hebrew. year: the academic year of the booklet, like "2026-2027". name: a short Hebrew name like "הנדסת מכונות · מסלול כללי · תשפ״ז".
- Never invent courses, numbers or credits. If something is unreadable, leave that course out.`;

function loadPdfLib() {
  if (window.PDFLib) return Promise.resolve(window.PDFLib);
  return loadScript(PDF_LIB_URL).then(() => window.PDFLib);
}

// "5-20, 31" -> [5..20, 31] (1-based, within 1..max).
function parsePages(text, max) {
  const out = new Set();
  for (const part of String(text || '').split(/[,\s]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error(`לא הבנתי את העמודים "${part}". כתוב למשל 5-20`);
    const a = +m[1], b = +(m[2] || m[1]);
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) if (i >= 1 && i <= max) out.add(i);
  }
  return [...out].sort((a, b) => a - b);
}

async function bookletPdfBase64(file, pagesText) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdfjs = await loadPdfJs();
  const total = (await pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false }).promise).numPages;
  let pages = pagesText.trim() ? parsePages(pagesText, total) : null;
  if (!pages && total > PLAN_PDF_MAX_PAGES) throw new Error(`לחוברת יש ${total} עמודים. כתוב אילו עמודים מכילים את התוכנית המומלצת (עד ${PLAN_PDF_MAX_PAGES}), למשל 5-30.`);
  if (pages && !pages.length) throw new Error('העמודים שכתבת לא קיימים בקובץ.');
  if (pages && pages.length > PLAN_PDF_MAX_PAGES) throw new Error(`אפשר עד ${PLAN_PDF_MAX_PAGES} עמודים בפעם אחת.`);
  let out = bytes;
  if (pages && pages.length < total) {
    const { PDFDocument } = await loadPdfLib();
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const doc = await PDFDocument.create();
    (await doc.copyPages(src, pages.map(p => p - 1))).forEach(p => doc.addPage(p));
    out = await doc.save();
  }
  let bin = '';
  for (let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode.apply(null, out.subarray(i, i + 0x8000));
  return { data: btoa(bin), pages: pages ? pages.length : total };
}

async function plansFromBooklet(file, pagesText) {
  const { data } = await bookletPdfBase64(file, pagesText);
  const client = await claudeClient();
  const msg = await client.beta.messages.stream({
    model: CV_MODEL,
    max_tokens: 32000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: PLAN_SCHEMA } },
    system: PLAN_SYSTEM,
    messages: [{ role: 'user', content: [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } },
      { type: 'text', text: 'Extract the recommended semester plan of every track in this booklet.' },
    ] }],
  }).finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('הבקשה נדחתה על ידי Claude');
  if (msg.stop_reason === 'max_tokens') throw new Error('התשובה נחתכה. בחר פחות עמודים (רק עמודי התוכנית המומלצת) ונסה שוב.');
  const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const tracks = (JSON.parse(text).tracks || []).map(t => cleanPlan({ ...t, id: uid() })).filter(t => t.courses.length);
  if (!tracks.length) throw new Error('לא מצאתי תוכנית מומלצת בעמודים האלה. בדוק שבחרת את העמודים עם הטבלאות לפי סמסטר.');
  return tracks;
}

// ---------- UI ----------
function planCard(p, current) {
  const credits = p.courses.reduce((a, c) => a + c.credits, 0);
  return `<div class="plan-card ${current ? 'on' : ''}">
    <div><b>${esc(p.name)}</b>${current ? ' <span class="badge">התוכנית שלך</span>' : ''}${p.builtIn ? ' <span class="badge">מובנית</span>' : ''}
      <br><small class="muted">${p.courses.length} קורסים · ${fmt(credits)} נק״ז בתוכנית · ${p.semesters} סמסטרים${p.totalCredits ? ` · ${fmt(p.totalCredits)} נק״ז לתואר` : ''}</small></div>
    <div class="row wrap">
      <button type="button" class="btn small primary" data-planuse="${esc(p.id)}">בחר</button>
      <button type="button" class="btn small" data-planexp="${esc(p.id)}" title="שמור כקובץ כדי לשתף">⬇️ קובץ</button>
      ${p.builtIn ? '' : `<button type="button" class="btn small danger" data-plandel="${esc(p.id)}">מחק</button>`}
    </div>
  </div>`;
}

function openPlanPicker() {
  const st = settings();
  openModal(`
    <h2>📚 הוסף מערכת מומלצת</h2>
    <p class="muted">בחר את התוכנית המומלצת של המסלול שלך. הקורסים שלה ייכנסו לסמסטרים במפה. קורסים שכבר עשית, לוקח עכשיו או כתבת עליהם הערה לא ישתנו, וגם קורסי בחירה שהוספת נשארים.</p>
    <div class="plan-list">${allPlans().map(p => planCard(p, p.id === st.planId)).join('')}</div>

    <details class="install-step"><summary>📄 מחוברת הפקולטה (PDF) בעזרת AI</summary>
      <p class="muted">כל פקולטה מפרסמת חוברת עם התוכנית המומלצת לכל מסלול, ולפעמים היא משתנה משנה לשנה. העלה את החוברת של <b>השנה שבה התחלת</b>, ו-Claude יבנה ממנה את התוכנית (לכל מסלול שבחוברת). צריך מפתח AI; זה עולה בדרך כלל פחות מדולר.</p>
      <label>קובץ החוברת (PDF)<input type="file" id="planPdf" accept="application/pdf,.pdf"></label>
      <label>עמודים (לא חובה; חובה בחוברת ארוכה מ-${PLAN_PDF_MAX_PAGES} עמודים)<input id="planPages" dir="ltr" placeholder="5-30"></label>
      <div class="row wrap"><button type="button" class="btn primary" id="planAi">🤖 בנה תוכנית מהחוברת</button>
      ${claudeKey() ? '' : '<button type="button" class="btn" id="planKey">🔑 הגדר מפתח AI</button>'}</div>
      <p id="planAiMsg" class="muted"></p>
    </details>

    <details class="install-step"><summary>📁 מקובץ תוכנית ששיתפו איתך</summary>
      <p class="muted">חבר מאותו מסלול יכול ללחוץ "⬇️ קובץ" ליד תוכנית (או "שמור את הסדר שלי") ולשלוח לך את הקובץ.</p>
      <input type="file" id="planFile" accept="application/json,.json">
    </details>

    <details class="install-step"><summary>✍️ הסדר שלי</summary>
      <p class="muted">לוקח את הקורסים בסדר אחר מהמומלץ? סדר אותם במפה (גרירה או "סמסטר" בכל קורס), ואז שמור את הסדר כתוכנית כדי לשתף או לחזור אליה. נשמרים רק קורסים וסמסטרים, בלי ציונים.</p>
      <div class="row wrap">
        <button type="button" class="btn" id="planSaveMine">💾 שמור את הסדר שלי כתוכנית</button>
        <button type="button" class="btn" id="planKeepMine">✓ הסדר הנוכחי הוא התוכנית שלי</button>
      </div>
    </details>
    <div class="actions"><button class="btn" value="cancel">סגור</button></div>`,
  () => {}, form => bindPlanPicker(form));
}

function bindPlanPicker(form) {
  const reopen = () => { $('#modal').close(); openPlanPicker(); };
  $$('[data-planuse]', form).forEach(b => b.onclick = () => previewPlan(planById(b.dataset.planuse)));
  $$('[data-planexp]', form).forEach(b => b.onclick = () => exportPlan(planById(b.dataset.planexp)));
  $$('[data-plandel]', form).forEach(b => b.onclick = () => {
    const p = planById(b.dataset.plandel);
    if (!p || !confirm(`למחוק את "${p.name}" מהרשימה? (הקורסים במפה לא יימחקו)`)) return;
    Store.put('meta', 'plans', { items: savedPlans().filter(x => x.id !== p.id) });
    Sync.schedule(500);
    reopen();
  });
  $('#planKey', form)?.addEventListener('click', () => { $('#modal').close(); openAdvisor(); });
  $('#planFile', form).onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const plan = await importPlanFile(file);
      savePlan(plan);
      previewPlan(plan);
    } catch (err) { alert(err.message); }
  };
  $('#planSaveMine', form).onclick = () => {
    const name = prompt('שם לתוכנית:', myOrderAsPlan().name);
    if (!name) return;
    const plan = { ...myOrderAsPlan(), name: name.trim() };
    savePlan(plan);
    Store.put('meta', 'settings', { planId: plan.id, planName: plan.name });
    exportPlan(plan);
    toast('נשמר. הקובץ ירד, ואפשר לשלוח אותו לחבר');
    reopen();
  };
  $('#planKeepMine', form).onclick = () => {
    Store.put('meta', 'settings', { planId: 'mine', planName: 'הסדר שלי' });
    $('#modal').close();
    toast('מעולה: התוכנית שלך היא הסדר שבמפה');
  };
  $('#planAi', form).onclick = async () => {
    const file = $('#planPdf', form).files[0];
    const msg = $('#planAiMsg', form), btn = $('#planAi', form);
    if (!file) return alert('בחר קודם את קובץ החוברת');
    if (!claudeKey()) return alert('צריך מפתח AI: לחץ "הגדר מפתח AI"');
    btn.disabled = true;
    msg.textContent = '⏳ Claude קורא את החוברת… זה לוקח בדרך כלל דקה-שתיים. אפשר להמשיך להשתמש באפליקציה, רק אל תסגור את החלון הזה.';
    try {
      const tracks = await plansFromBooklet(file, $('#planPages', form).value);
      tracks.forEach(savePlan);
      toast(`נמצאו ${tracks.length} מסלולים בחוברת`);
      if (tracks.length === 1) previewPlan(tracks[0]);
      else reopen();
    } catch (e) {
      btn.disabled = false;
      msg.innerHTML = e.status || e.error ? aiErrorHtml(e) : `<span class="warn">⚠️ ${esc(e.message || e)}</span>`;
    }
  };
}

function previewPlan(plan) {
  if (!plan) return;
  const { add, move, same, remove } = planDiff(plan);
  const sems = [...new Set(plan.courses.map(c => c.sem))].sort((a, b) => a - b);
  const mark = pc => add.includes(pc) ? ' <span class="badge">חדש</span>' : move.includes(pc) ? ' <span class="badge">יזוז</span>' : '';
  openModal(`
    <h2>📚 ${esc(plan.name)}</h2>
    <p>${add.length} קורסים חדשים · ${move.length} יזוזו לסמסטר אחר · ${same.length} בלי שינוי${remove.length ? ` · ${remove.length} יוסרו` : ''}</p>
    ${remove.length ? `<p class="muted">יוסרו (קורסי חובה מהתוכנית הקודמת שעוד לא התחלת ואינם בתוכנית הזו): ${remove.map(c => esc(c.name)).join(', ')}</p>` : ''}
    <div class="import-list">${sems.map(s => `
      <div class="plan-sem"><b>${s ? esc(semName(s)) : 'בחירה / לא משובץ'}</b>
        ${plan.courses.filter(c => c.sem === s).map(c => `<div class="import-row"><span>${esc(c.name)}${mark(c)}<br><small class="muted">${esc(c.code)}</small></span><span>${fmt(c.credits)}</span></div>`).join('')}
      </div>`).join('')}</div>
    <p class="muted">אפשר לבטל מיד אחרי. כדאי לבדוק מול חוברת הפקולטה: התוכנית המומלצת היא המלצה, וקורסים זזים בין שנים.</p>
    <div class="actions"><button class="btn" value="back">חזרה</button><button class="btn primary" value="ok">טען את התוכנית</button></div>`,
  action => {
    if (action === 'ok') { applyDegreePlan(plan); return; }
    setTimeout(openPlanPicker, 0);
  });
}
