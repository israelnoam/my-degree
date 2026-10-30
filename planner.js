// תכנון תואר: degree requirements, a semester-by-semester plan, the elective
// catalogue (lists א–ה), opportunities, and reserve-duty benefits.

const ELECTIVE_BY_CODE = Object.fromEntries(ELECTIVES.map(([code, name, credits, list]) => [code, { code, name, credits, list }]));
const SOCIAL_CODES = ['03200101', '03200102', '320101', '320102'];
// Extended variants: the extra credits count as faculty electives.
const VARIANT_BASE = { 114075: 3.5, 114071: 2.5, 114077: 2.5, 114078: 3.5 };

function courseCat(c) {
  if (c.list) return c.list;
  if (ELECTIVE_BY_CODE[c.code]) return ELECTIVE_BY_CODE[c.code].list; // incl. מתודולוגיות פיתוח (list ה׳)
  if (SOCIAL_CODES.includes(c.code)) return 'general';
  if (c.type === 'project') return 'project';
  if (c.type === 'sports') return 'sports';
  if (c.type === 'mandatory') return 'mandatory';
  return 'E';
}

// done = completed (incl. exempt/binary), now = studying, plan = placed in a future semester.
function courseStage(c) {
  if (isComplete(c)) return 'done';
  if (c.status === 'active') return 'now';
  return c.sem ? 'plan' : null;
}

function degreeProgress() {
  const buckets = {};
  const add = (cat, stage, credits, code) => {
    const b = buckets[cat] ||= { done: 0, now: 0, plan: 0, courses: { done: [], now: [], plan: [] } };
    b[stage] += credits;
    if (code) b.courses[stage].push(code);
  };
  for (const c of courses()) {
    const stage = courseStage(c);
    if (!stage) continue;
    let credits = +c.credits || 0;
    let cat = courseCat(c);
    if (cat === 'mandatory' && VARIANT_BASE[c.code] && credits > VARIANT_BASE[c.code]) {
      add('E', stage, credits - VARIANT_BASE[c.code]);
      credits = VARIANT_BASE[c.code];
    }
    add(cat, stage, credits, c.code);
  }
  const get = k => buckets[k] || { done: 0, now: 0, plan: 0, courses: { done: [], now: [], plan: [] } };
  const sum = (keys, stage) => keys.reduce((a, k) => a + get(k)[stage], 0);
  const elec = ['A', 'B', 'C', 'D', 'E'];
  const all = stage => Object.values(buckets).reduce((a, b) => a + b[stage], 0);
  return { get, sum, elec, all };
}

// ---------- requirement cards ----------
function reqBar(label, need, done, now, plan, extra = '') {
  const pct = v => Math.min(100, (v / need) * 100);
  const ok = done >= need;
  return `<div class="req ${ok ? 'ok' : ''}">
    <div class="req-top"><b>${label}</b><span>${fmt(done)}${now ? ` <small>+${fmt(now)} עכשיו</small>` : ''}${plan ? ` <small>+${fmt(plan)} מתוכנן</small>` : ''} / ${fmt(need)}</span></div>
    <div class="req-bar"><i class="d" style="width:${pct(done)}%"></i><i class="n" style="width:${Math.max(0, pct(done + now) - pct(done))}%"></i><i class="p" style="width:${Math.max(0, pct(done + now + plan) - pct(done + now))}%"></i></div>
    ${extra}
  </div>`;
}

function countRule(list, min, p) {
  const b = p.get(list);
  const d = b.courses.done.length, n = b.courses.now.length, pl = b.courses.plan.length;
  const state = d >= min ? 'ok' : d + n + pl >= min ? 'plan' : 'miss';
  return `<span class="rule ${state}">${LISTS[list].short}: ${d}${n + pl ? `+${n + pl}` : ''}/${min} קורסים</span>`;
}

function requirementsHtml() {
  const p = degreeProgress();
  const R = DEGREE_RULES;
  const elecDone = p.sum(p.elec, 'done'), elecNow = p.sum(p.elec, 'now'), elecPlan = p.sum(p.elec, 'plan');
  const bcd = ['B', 'C', 'D'];
  const rules = Object.entries(R.minCourses).map(([l, m]) => countRule(l, m, p)).join('');
  const bcdDone = p.sum(bcd, 'done'), bcdAll = bcdDone + p.sum(bcd, 'now') + p.sum(bcd, 'plan');
  return `
    <div class="req-grid">
      ${reqBar('🎓 סה״כ לתואר', R.total, p.all('done'), p.all('now'), p.all('plan'))}
      ${reqBar('📘 חובה פקולטית', R.mandatory, p.get('mandatory').done, p.get('mandatory').now, p.get('mandatory').plan)}
      ${reqBar('🧩 בחירה מתקדמת (א׳–ה׳)', R.electives, elecDone, elecNow, elecPlan,
        `<div class="rules">${rules}<span class="rule ${bcdDone >= R.minBCD ? 'ok' : bcdAll >= R.minBCD ? 'plan' : 'miss'}">ב׳+ג׳+ד׳: ${fmt(bcdDone)}/${R.minBCD} נק״ז</span></div>`)}
      ${reqBar('🛠️ פרויקט גמר', R.project, p.get('project').done, p.get('project').now, p.get('project').plan)}
      ${reqBar('🎭 מל״ג', R.malag, p.get('malag').done, p.get('malag').now, p.get('malag').plan)}
      ${reqBar('🌐 כלל טכניונית', R.general, p.get('general').done, p.get('general').now, p.get('general').plan)}
      ${reqBar('🏃 חינוך גופני', R.sports, p.get('sports').done, p.get('sports').now, p.get('sports').plan)}
    </div>
    <p class="hint">מלא = הושלם · מקווקו = בלימוד עכשיו · בהיר = מתוכנן. תוספת הניקוד של פיסיקה מורחבת נספרת כבחירה פקולטית.</p>`;
}

// ---------- semester columns ----------
function semesterColumns() {
  const list = courses();
  const now = currentSemesterNumber();
  const cols = [];
  for (const s of semIds()) {
    const sl = list.filter(c => c.sem === s);
    const credits = sl.reduce((a, c) => a + (+c.credits || 0), 0);
    const load = credits >= 24 ? 'heavy' : credits >= 20 ? 'mid' : 'light';
    cols.push(`<div class="pcol ${s === now ? 'now' : ''} ${s < now ? 'past' : ''}">
      <div class="pcol-head"><b>${s > 100 ? 'קיץ' : `סמסטר ${s}`}</b><small>${semesterYearLabel(s)}${s === now ? ' · עכשיו' : ''}</small>
        <span class="load ${load}">${fmt(credits)} נק״ז</span></div>
      <div class="pcol-list">${sl.map(planChip).join('') || '<p class="muted">ריק</p>'}</div>
      <button class="btn small" data-addsem="${s}">＋ קורס</button>
    </div>`);
  }
  const loose = list.filter(c => !c.sem);
  return `<div class="pcols">${cols.join('')}</div>
    ${loose.length ? `<p class="muted">לא משובצים: ${loose.map(c => `<button class="chip" data-code="${esc(c.code)}">${esc(c.name)}</button>`).join(' ')}</p>` : ''}`;
}

function planChip(c) {
  const st = courseState(c);
  const cat = courseCat(c);
  const badge = LISTS[cat] ? `<span class="lbadge" style="--lc:${LISTS[cat].color}">${LISTS[cat].short}</span>` : '';
  const rec = RECOMMENDED_SEM[c.code];
  const warn = !isComplete(c) && rec && c.sem && c.sem !== rec ? `<small class="rec">מומלץ בסמסטר ${rec}</small>` : '';
  const grade = c.status === 'done' && c.grade != null ? `<span class="grade">${c.grade}</span>` : c.status === 'binary' ? '<span class="grade bin">עובר</span>' : '';
  return `<button class="pchip ${st}" data-code="${esc(c.code)}">
    <span class="pc-name">${esc(c.name)}</span>
    <span class="pc-meta">${badge}${fmt(c.credits)} נק״ז ${grade}</span>${warn}
  </button>`;
}

// ---------- elective catalogue ----------
let catFilter = 'all', catQuery = '', catOnlyOpen = false;

function catalogItems() {
  const inPlan = new Set(courses().map(c => c.code));
  const check = doneCode8Check();
  return ELECTIVES.map(([code, name, credits, list]) => {
    const cf = CF.find(code);
    const pre = cf ? evalPrereqs(cf.course.general['מקצועות קדם'], check) : null;
    return { code, name, credits, list, planned: inPlan.has(code), course: courseByCode(code), offered: CF.offeredIn(code), prereqOk: pre ? pre.ok : null };
  });
}

function catalogHtml() {
  const items = catalogItems().filter(i =>
    (catFilter === 'all' || i.list === catFilter) &&
    (!catOnlyOpen || i.prereqOk) &&
    (!catQuery || norm(i.name).includes(norm(catQuery)) || i.code.includes(catQuery)));
  const cfLoaded = Object.keys(CF.data).length > 0;
  const filters = [['all', 'הכל'], ...Object.entries(LISTS).filter(([k]) => 'ABCDE'.includes(k) || k === 'project').map(([k, v]) => [k, v.short])];
  return `
    <div class="cat-tools">
      <div class="seg small">${filters.map(([k, l]) => `<button data-cat="${k}" class="${catFilter === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <label class="check"><input type="checkbox" id="catOpen" ${catOnlyOpen ? 'checked' : ''} ${cfLoaded ? '' : 'disabled'}> רק מה שאפשר לקחת עכשיו (דרישות קדם מולאו)</label>
      <input id="catSearch" placeholder="🔍 חיפוש לפי שם או מספר" value="${esc(catQuery)}">
    </div>
    ${cfLoaded ? '' : '<p class="muted">טוען מ-CheeseFork מתי כל קורס נפתח ומה דרישות הקדם…</p>'}
    <div class="cat-list">${items.map(i => `
      <div class="cat-item ${i.planned ? 'planned' : ''}">
        <div class="ci-main">
          <b>${esc(i.name)}</b>
          <small class="muted">${esc(i.code)} · ${fmt(i.credits)} נק״ז · <span class="lbadge" style="--lc:${LISTS[i.list].color}">${LISTS[i.list].short}</span>
            ${i.offered.length ? ` · נפתח: ${i.offered.sort().map(cfKeyLabel).join(', ')}` : cfLoaded ? ' · לא נפתח לאחרונה' : ''}
            ${i.prereqOk === true ? ' · <span class="ok-t">✓ דרישות קדם</span>' : i.prereqOk === false ? ' · <span class="bad-t">חסרות דרישות קדם</span>' : ''}</small>
        </div>
        ${i.planned ? `<button class="btn small" data-code="${esc(i.code)}">${i.course?.sem ? `סמסטר ${i.course.sem}` : 'בתוכנית'}</button>`
          : `<button class="btn small primary" data-addcat="${esc(i.code)}">＋ לתוכנית</button>`}
      </div>`).join('') || '<p class="empty">לא נמצאו קורסים.</p>'}</div>`;
}

function addToPlan(code, sem) {
  const e = ELECTIVE_BY_CODE[code];
  const nSem = settings().semesters || 8;
  const now = currentSemesterNumber();
  const pick = sem ? Promise.resolve(sem) : new Promise(resolve => openModal(`
    <h2>＋ ${esc(e.name)}</h2>
    <p class="muted">${esc(code)} · ${fmt(e.credits)} נק״ז · רשימה ${LISTS[e.list].short}</p>
    <label>באיזה סמסטר?<select name="sem">${semIds().filter(s => (s > 100 ? s - 100 : s) >= now)
      .map(s => `<option value="${s}">${s > 100 ? 'קיץ' : `סמסטר ${s}`} · ${semesterYearLabel(s)}</option>`).join('')}</select></label>
    <div class="actions"><span class="spacer"></span><button class="btn" value="cancel" formnovalidate>ביטול</button><button class="btn primary" value="save">הוסף</button></div>`,
    (a, fd) => resolve(+fd.get('sem'))));
  pick.then(s => {
    Store.put('course', code, { code, name: e.name, credits: e.credits, sem: s, list: e.list, type: 'elective', prereqs: [], status: s === now ? 'active' : 'none', grade: null, notes: '' });
    toast(`נוסף לסמסטר ${s}`);
  });
}

// ---------- opportunities ----------
function opportunitiesHtml() {
  const s = computeStats();
  return OPPORTUNITIES.map(o => {
    let elig = '';
    if (o.eligibility) {
      const okG = s.gpa !== null && s.gpa >= o.eligibility.gpa, okC = s.doneCredits >= o.eligibility.credits;
      elig = `<div class="elig ${okG && okC ? 'ok' : ''}">${okG && okC ? '✅ אתה עומד בתנאי הסף' : '⏳ עוד לא'}:
        ממוצע ${s.gpa === null ? '—' : fmt(s.gpa, 1)}/${o.eligibility.gpa} ${okG ? '✓' : '✗'} · נק״ז ${fmt(s.doneCredits)}/${o.eligibility.credits} ${okC ? '✓' : '✗'}</div>`;
    }
    const course = o.course && ELECTIVE_BY_CODE[o.course];
    return `<div class="opp">
      <h3>${o.icon} ${esc(o.title)}</h3>
      <p>${esc(o.text)}</p>
      ${elig}
      ${o.tracks ? `<details><summary>התוכניות</summary><ul class="howto">${o.tracks.map(t => `<li>${esc(t)}</li>`).join('')}</ul></details>` : ''}
      <div class="link-row">
        ${o.links.map(([l, u]) => `<a class="btn small" href="${esc(u)}" target="_blank" rel="noopener">${esc(l)}</a>`).join('')}
        ${course ? (courseByCode(o.course) ? `<button class="btn small" data-code="${o.course}">בתוכנית ✓</button>` : `<button class="btn small primary" data-addcat="${o.course}">＋ הקורס לתוכנית</button>`) : ''}
      </div>
    </div>`;
  }).join('');
}

// ---------- reserve duty ----------
function reserveGroups() { return settings().reserve || {}; }

function binaryQuota() {
  const groups = reserveGroups();
  const nSem = settings().semesters || 8;
  const years = [];
  for (let y = 1; y <= Math.ceil(nSem / 2); y++) {
    const g = Math.max(+groups[2 * y - 1] || 0, +groups[2 * y] || 0);
    const allowed = RESERVE.binaryPerYear[g] || 0;
    const used = courses().filter(c => c.status === 'binary' && Math.ceil(((c.sem > 100 ? c.sem - 100 : c.sem) || 0) / 2) === y);
    if (allowed || used.length) years.push({ y, group: g, allowed, used });
  }
  const usedAll = courses().filter(c => c.status === 'binary');
  const usedCredits = usedAll.reduce((a, c) => a + (+c.credits || 0), 0);
  return { years, usedAll, usedCredits, maxCredits: DEGREE_RULES.total * RESERVE.binaryMaxShare };
}

// How your average changes if a course's grade is taken out of it.
function gpaWithout(codes) {
  let sum = 0, cr = 0;
  for (const c of courses()) {
    if (c.status !== 'done' || c.grade == null || codes.includes(c.code)) continue;
    sum += c.grade * c.credits; cr += +c.credits;
  }
  return cr ? sum / cr : null;
}

function binarySuggestions(year) {
  const base = computeStats().gpa;
  return courses()
    .filter(c => c.status === 'done' && c.grade != null && c.grade >= RESERVE.binaryMinGrade && Math.ceil((c.sem > 100 ? c.sem - 100 : c.sem) / 2) === year)
    .map(c => ({ c, gpa: gpaWithout([c.code]), gain: gpaWithout([c.code]) - base }))
    .sort((a, b) => b.gain - a.gain);
}

function reserveHtml() {
  const groups = reserveGroups();
  const now = currentSemesterNumber();
  const q = binaryQuota();
  const sems = Array.from({ length: Math.max(now, 2) }, (_, i) => i + 1);
  const maxGroup = Math.max(0, ...Object.values(groups).map(Number));
  return `
    <div class="res-groups">${sems.map(s => `<label>סמסטר ${s} · ${semesterYearLabel(s)}
      <select data-resgroup="${s}">${[0, 1, 2, 3].map(g => `<option value="${g}" ${+(groups[s] || 0) === g ? 'selected' : ''}>${g ? `קבוצה ${g}` : 'לא שירתתי'}</option>`).join('')}</select></label>`).join('')}
    </div>
    <details><summary>איך נקבעת הקבוצה?</summary><ul class="howto">${Object.entries(RESERVE.groups).map(([g, t]) => `<li><b>קבוצה ${g}:</b> ${t}</li>`).join('')}</ul></details>

    <h3>🎖️ עוברים בינאריים</h3>
    ${q.years.length ? q.years.map(y => {
      const sugg = binarySuggestions(y.y).filter(s => s.c.status !== 'binary');
      const left = y.allowed - y.used.length;
      return `<div class="bin-year">
        <div class="req-top"><b>שנה ${y.y} (סמסטרים ${2 * y.y - 1}–${2 * y.y}) · קבוצה ${y.group}</b><span>${y.used.length}/${y.allowed} נוצלו</span></div>
        ${y.used.length ? `<div class="chips">${y.used.map(c => `<span class="chip ok">${esc(c.name)} <button type="button" data-unbinary="${esc(c.code)}" title="בטל">×</button></span>`).join('')}</div>` : ''}
        ${left > 0 ? `<p class="muted">נשארו ${left}. ההמרה מוציאה את הציון מהממוצע, והנק״ז נשארות. כדאי להמיר את הקורסים שמעלים את הממוצע הכי הרבה:</p>
          <div class="bin-list">${sugg.slice(0, 8).map(s => `<div class="bin-row">
            <span><b>${esc(s.c.name)}</b> <small class="muted">ציון ${s.c.grade} · ${fmt(s.c.credits)} נק״ז</small></span>
            <span class="${s.gain > 0 ? 'ok-t' : 'bad-t'}">${s.gain > 0 ? '▲' : '▼'} ממוצע ${fmt(s.gpa, 2)} (${s.gain > 0 ? '+' : ''}${fmt(s.gain, 2)})</span>
            <button class="btn small" data-binary="${esc(s.c.code)}">סמן כעובר</button></div>`).join('') || '<p class="muted">אין קורסים עם ציון 55+ בשנה הזו.</p>'}</div>` : ''}
      </div>`;
    }).join('') : '<p class="muted">בחר קבוצת מילואים לסמסטרים שבהם שירתת כדי לראות כמה עוברים בינאריים מגיעים לך.</p>'}
    <p class="muted">מגבלות: עד ${RESERVE.binaryMaxDegree} קורסים בכל התואר (נוצלו ${q.usedAll.length}) ועד 10% מנק״ז התואר (${fmt(q.usedCredits)}/${fmt(q.maxCredits)}). ציון סופי ${RESERVE.binaryMinGrade}+. ההמרה עצמה מוגשת במערכת הטכניון ואינה הפיכה; כאן היא רק מחושבת בממוצע.</p>

    <h3>📜 הזכויות שלך${maxGroup ? ` (קבוצה ${maxGroup})` : ''}</h3>
    <ul class="howto rights">
      <li><b>מועד מיוחד</b> לכל מבחן שהחמצת בגלל שירות (גם בבחנים), אם שירתת ביום המבחן, 3+ ימים בשבוע שלפניו, 10 ימים רצופים / 14 מצטברים בסמסטר, או 10 ימים בתקופת המבחנים.</li>
      <li><b>25% תוספת זמן</b>${maxGroup >= 2 ? ' בשני מועדי הבחינה בסמסטר' : ' במבחן הראשון בכל קורס (לפי ימי השירות)'}.</li>
      ${maxGroup >= 2 ? '<li><b>הערכה חלופית / מבחן מותאם</b> בשיקול המרצה.</li>' : ''}
      <li><b>הארכת הגשות</b> לפחות במספר ימי השירות (אם השירות היה בשבועיים שלפני ההגשה). שירות של 14+ ימים: מטלה חלופית או הפחתה יחסית במספר המטלות.</li>
      ${maxGroup ? `<li><b>פטור מנק״ז:</b> עד ${RESERVE.creditExemption[maxGroup]} נק״ז (בחירה/כלליים; תקרה כוללת 10). ${maxGroup >= 2 ? 'בקשה דרך רכז/ת המילואים בפקולטה.' : 'בקשה ללימודי הסמכה.'}</li>` : ''}
      ${RESERVE.extensions[maxGroup] ? `<li><b>הארכת לימודים:</b> ${RESERVE.extensions[maxGroup]}.</li>` : ''}
      <li><b>2 נק״ז פעילות חברתית</b> על 14+ ימי מילואים בשנה (עד 2 בתואר).</li>
      <li><b>סמסטר קיץ:</b> פטור משכר לימוד לקורס אחד עם 22+ ימי שירות בשנה, ולשני קורסים עם 30+.</li>
      <li><b>תמיכה:</b> חונכות ושיעורי עזר דרך המרכז לייעוץ, חדרי לימוד, שירות פסיכולוגי ומענקים בדיקנאט. מתווה 300+ למי ששירת מעל 300 ימים מ-7.10.23.</li>
    </ul>
    <p class="muted">תשפ״ז: המתווה המלא לשנה הזו עוד לא פורסם. רכזת מילואים: <a href="mailto:${RESERVE.email}">${RESERVE.email}</a></p>
    <div class="link-row">${RESERVE.links.map(([l, u]) => `<a class="btn small" href="${esc(u)}" target="_blank" rel="noopener">${esc(l)}</a>`).join('')}</div>`;
}

// ---------- the page ----------
let plannerTab = 'plan';
function renderPlanner(root) {
  const tabs = [['plan', '🗓️ התוכנית'], ['catalog', '🧩 קורסי בחירה'], ['opps', '🚀 הזדמנויות'], ['reserve', '🎖️ מילואים']];
  root.innerHTML = `
    <section class="panel">
      <div class="toolbar"><h2>🎯 תכנון תואר</h2>
        <div class="seg small">${tabs.map(([k, l]) => `<button data-ptab="${k}" class="${plannerTab === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      ${requirementsHtml()}
    </section>
    <section class="panel">
      ${plannerTab === 'plan' ? semesterColumns()
        : plannerTab === 'catalog' ? catalogHtml()
        : plannerTab === 'opps' ? `<div class="opps">${opportunitiesHtml()}</div>`
        : reserveHtml()}
    </section>`;

  $$('[data-ptab]', root).forEach(b => b.onclick = () => { plannerTab = b.dataset.ptab; render(); });
  $$('[data-code]', root).forEach(b => b.onclick = () => editCourse(b.dataset.code));
  $$('[data-addcat]', root).forEach(b => b.onclick = () => addToPlan(b.dataset.addcat));
  $$('[data-addsem]', root).forEach(b => b.onclick = () => { catFilter = 'all'; plannerTab = 'catalog'; render(); toast(`בחר קורס – הוא ייכנס לסמסטר לבחירתך`); });
  $$('[data-cat]', root).forEach(b => b.onclick = () => { catFilter = b.dataset.cat; render(); });
  const search = $('#catSearch', root);
  if (search) search.oninput = () => { catQuery = search.value; const pos = search.selectionStart; render(); const s2 = $('#catSearch'); s2.focus(); s2.setSelectionRange(pos, pos); };
  const open = $('#catOpen', root);
  if (open) open.onchange = () => { catOnlyOpen = open.checked; render(); };
  $$('[data-resgroup]', root).forEach(sel => sel.onchange = () =>
    Store.put('meta', 'settings', { reserve: { ...reserveGroups(), [sel.dataset.resgroup]: +sel.value } }));
  $$('[data-binary]', root).forEach(b => b.onclick = () => {
    const c = courseByCode(b.dataset.binary);
    const q = binaryQuota();
    if (q.usedAll.length >= RESERVE.binaryMaxDegree) return alert(`הגעת למקסימום של ${RESERVE.binaryMaxDegree} עוברים בינאריים בתואר`);
    if (q.usedCredits + (+c.credits) > q.maxCredits) return alert('זה יעבור את תקרת 10% מנק״ז התואר');
    Store.put('course', c.code, { status: 'binary' });
    toast(`${c.name} סומן כעובר בינארי`);
  });
  $$('[data-unbinary]', root).forEach(b => b.onclick = () => Store.put('course', b.dataset.unbinary, { status: 'done' }));

  // Load CheeseFork once; if it fails (offline, site down) wait 5 minutes before
  // trying again, otherwise every re-render would retry and freeze the page.
  const cfRetryOk = Date.now() - (renderPlanner.cfTriedAt || 0) > 5 * 60_000;
  if ((plannerTab === 'catalog' || plannerTab === 'plan') && !Object.keys(CF.data).length && !renderPlanner.loading && cfRetryOk) {
    renderPlanner.loading = true;
    renderPlanner.cfTriedAt = Date.now();
    CF.loadRecent().finally(() => {
      renderPlanner.loading = false;
      if (currentView === 'planner' && Object.keys(CF.data).length) render();
    });
  }
}

// ---------- one-time updates to your data ----------
// Each runs once (recorded in synced settings), after the latest data is pulled from Drive.
const MIGRATIONS = {
  // You take the extended Physics 2 (2ממ׳, 5 credits).
  physics2mm() {
    const old = courseByCode('114052');
    if (courseByCode('114075') || !old || isComplete(old)) return;
    Store.put('course', '114075', { ...old, code: '114075', id: '114075', name: 'פיסיקה 2ממ׳', credits: 5, variantOf: '114052' });
    Store.remove('course', '114052');
    courses().filter(c => (c.prereqs || []).includes('114052'))
      .forEach(c => Store.put('course', c.code, { prereqs: c.prereqs.map(p => p === '114052' ? '114075' : p) }));
  },
  // Winter תשפ״ז registration.
  semester3() {
    for (const code of ['034053', '034035', '034056', '104228', '114075']) {
      const c = courseByCode(code);
      if (c && c.status === 'none') Store.put('course', code, { status: 'active', sem: 3 });
    }
    // Not taking PE this semester: move the placeholder for the 2nd PE credit on.
    const pe = courseByCode('03940805');
    if (pe && pe.status === 'none' && pe.sem === 3) Store.put('course', '03940805', { sem: 4 });
    if (!courseByCode('036714')) {
      Store.put('course', '036714', { code: '036714', name: 'נושאים נבחרים ב-Generative AI', credits: 2, sem: 3, list: 'E', type: 'elective', prereqs: [], status: 'active', grade: null, notes: '' });
    }
  },
  english() {
    if (!courseByCode('324033')) {
      Store.put('course', '324033', { code: '324033', name: 'אנגלית טכנית – מתקדמים ב׳', credits: 3, sem: 4, type: 'mandatory', prereqs: [], status: 'none', grade: null, notes: 'חובה – עוד לא נלקח (פטור רק ממתקדמים א׳)' });
    }
  },
  reserve() {
    const st = settings();
    if (!st.reserve) Store.put('meta', 'settings', { reserve: { 1: 3, 2: 3, 3: 0 } });
    if (!st.startYear) Store.put('meta', 'settings', { startYear: 2025 });
  },
};

function runMigrations() {
  const done = new Set(settings().migrations || []);
  const todo = Object.keys(MIGRATIONS).filter(k => !done.has(k));
  if (!todo.length) return false;
  for (const k of todo) { try { MIGRATIONS[k](); } catch (e) { console.warn('migration', k, e); } }
  Store.put('meta', 'settings', { migrations: [...done, ...todo] });
  return true;
}
