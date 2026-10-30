// ---------- helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toString();

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const TASK_TYPES = {
  hw: { label: 'שיעורי בית', icon: '📘' },
  exam: { label: 'מבחן', icon: '🎯' },
  quiz: { label: 'בוחן', icon: '✏️' },
  project: { label: 'פרויקט / מעבדה', icon: '🛠️' },
  other: { label: 'אחר', icon: '📌' },
};
const SLOT_TYPES = ['הרצאה', 'תרגול', 'מעבדה', 'סדנה', 'אחר'];
const STATUS = {
  locked: { label: 'נעול', icon: '🔒' },
  open: { label: 'פתוח לרישום', icon: '🔓' },
  active: { label: 'בלימוד', icon: '📖' },
  done: { label: 'הושלם', icon: '✅' },
  exempt: { label: 'פטור', icon: '🎫' },
  binary: { label: 'עובר בינארי', icon: '🎖️' },
};

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
}

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------- data access ----------
function seedData() {
  SEED_COURSES.forEach(([sem, code, name, credits, prereqs, type]) =>
    Store.seed('course', code, { code, name, credits, sem, prereqs, type, status: 'none', grade: null, notes: '' }));
  Store.seed('meta', 'settings', { totalCredits: DEGREE_TOTAL_CREDITS, semesters: SEMESTER_NAMES.length });
  Store.persist();
}

const settings = () => Store.get('meta', 'settings') || { totalCredits: DEGREE_TOTAL_CREDITS, semesters: 8 };
const courses = () => Store.list('course').sort((a, b) => (a.sem - b.sem) || a.code.localeCompare(b.code));
const courseByCode = code => Store.get('course', code);
const courseLabel = code => { const c = courseByCode(code); return c ? c.name : code || ''; };
const semName = n => n === 0 ? 'בחירה / לא משובץ' : `${SEMESTER_NAMES[n - 1] || `סמסטר ${n}`} · ${semesterYearLabel(n)}`;

// Binary pass (reserve duty): credits count toward the degree, the grade stays out of the average.
function isComplete(c) { return c && (c.status === 'done' || c.status === 'exempt' || c.status === 'binary'); }

function courseState(c) {
  if (['done', 'exempt', 'binary', 'active'].includes(c.status)) return c.status;
  const prereqs = (c.prereqs || []).map(courseByCode).filter(Boolean);
  return prereqs.every(isComplete) ? 'open' : 'locked';
}

function computeStats() {
  const list = courses();
  let gradeSum = 0, gradeCredits = 0, doneCredits = 0, doneCount = 0, activeCredits = 0;
  for (const c of list) {
    if (isComplete(c)) { doneCredits += +c.credits || 0; doneCount++; }
    if (c.status === 'active') activeCredits += +c.credits || 0;
    if (c.status === 'done' && c.grade !== null && c.grade !== '' && !isNaN(c.grade)) {
      gradeSum += c.grade * c.credits; gradeCredits += +c.credits;
    }
  }
  return {
    gpa: gradeCredits ? gradeSum / gradeCredits : null,
    doneCredits, doneCount, activeCredits,
    total: +settings().totalCredits || DEGREE_TOTAL_CREDITS,
  };
}

// ---------- header ----------
$('#stats').addEventListener('click', () => go('performance'));
function renderStats() {
  const s = computeStats();
  const pct = Math.min(100, (s.doneCredits / s.total) * 100);
  $('#stats').innerHTML = `
    <div class="stat"><b>${s.gpa === null ? '—' : fmt(s.gpa, 2)}</b><small>ממוצע</small></div>
    <div class="stat progress">
      <div class="bar"><i style="width:${pct}%"></i></div>
      <small><b>${fmt(s.doneCredits)}</b> / ${fmt(s.total)} נק״ז · ${fmt(pct, 0)}%</small>
    </div>
    <div class="stat hide-sm"><b>${s.doneCount}</b><small>קורסים הושלמו</small></div>
    <div class="stat hide-sm"><b>${fmt(s.activeCredits)}</b><small>נק״ז בלימוד</small></div>`;
}

const SYNC_LABELS = {
  off: 'לא מסונכרן', 'needs-auth': 'התחבר מחדש', syncing: 'מסנכרן…',
  ok: 'מסונכרן', error: 'שגיאת סנכרון', offline: 'לא מקוון',
};
function renderSyncBtn(state) {
  const b = $('#syncBtn');
  b.dataset.state = state;
  $('.label', b).textContent = SYNC_LABELS[state] || state;
  b.title = Sync.message || 'סנכרון עם Google Drive';
}
$('#syncBtn').addEventListener('click', () => {
  if (!Sync.clientId) return go('settings');
  if (Sync.state === 'needs-auth' || !Sync.connected) return Sync.authorize();
  Sync.syncNow();
});

// One card, one button: shown at the top of the map until Google is fully connected.
function connectCard() {
  if (!Sync.connected) {
    return `<section class="panel connect-card">
      <div><h2>☁️ חבר את חשבון Google</h2>
      <p class="muted">לחיצה אחת בכל מכשיר, והציונים, המשימות ומערכת השעות יהיו זהים במחשב, באייפד ובטלפון. גם היומן ו-Google Tasks (כולל מה ש-Instinct מוסיף) יופיעו כאן.</p></div>
      <button class="btn primary big" id="connectNow">התחבר עם Google</button>
    </section>`;
  }
  if (Sync.token() && (!Sync.hasScope('calendar') || !Sync.hasScope('tasks'))) {
    return `<section class="panel connect-card">
      <div><h2>📅 עוד צעד אחד</h2>
      <p class="muted">אשר לאפליקציה לקרוא את היומן ולסנכרן את Google Tasks.</p></div>
      <button class="btn primary big" id="connectNow">אשר גישה</button>
    </section>`;
  }
  return '';
}
function connectGoogle() {
  if (!Sync.clientId) return go('settings');
  Sync.authorize();
}
function bindConnectCard(root) {
  $('#connectNow', root)?.addEventListener('click', connectGoogle);
}

// Status line + button at the top of the tasks page (Google Tasks) and timetable (Google Calendar).
function googleBar(kind) {
  const name = kind === 'tasks' ? 'Google Tasks' : 'Google Calendar';
  const icon = kind === 'tasks' ? '✅' : '📅';
  if (!Sync.connected) {
    return `<div class="gbar"><span>${icon} ${name}: <b>לא מחובר</b></span><button class="btn primary" data-gbar="connect">התחבר עם Google</button></div>`;
  }
  if (!Sync.hasScope(kind)) {
    return `<div class="gbar"><span>${icon} ${name}: <b>צריך אישור</b></span><button class="btn primary" data-gbar="connect">אשר גישה</button></div>`;
  }
  const busy = kind === 'tasks' ? Sync.state === 'syncing' : GCal.loading[ymd(ttWeek)];
  const when = kind === 'tasks' ? Sync.lastSync : GCal.fetchedAt[ymd(ttWeek)];
  const ok = kind === 'tasks' ? !Sync.hookError : !GCal.lastError;
  const status = busy ? 'מסנכרן…' : !ok ? 'יש בעיה (פרטים למטה)'
    : when ? `מסונכרן · ${new Date(when).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}` : 'מתחבר…';
  return `<div class="gbar ${ok ? 'ok' : 'bad'}"><span>${icon} ${name}: <b>${status}</b></span>
    <button class="btn" data-gbar="sync" ${busy ? 'disabled' : ''}>🔄 ${kind === 'tasks' ? 'סנכרן' : 'רענן'}</button></div>`;
}
function bindGoogleBar(root) {
  $$('[data-gbar]', root).forEach(b => b.onclick = () => {
    if (b.dataset.gbar === 'connect') return connectGoogle();
    b.disabled = true;
    if (currentView === 'tasks') {
      Sync.hookError = null;
      Sync.syncNow().then(() => render());
    } else {
      GCal.lastError = null;
      GCal.fetchWeek(ttWeek, () => render(), true).then(() => render());
      render();
    }
  });
}

// ---------- routing ----------
let currentView = 'map';
function go(view) {
  currentView = view;
  try { localStorage.setItem('pp_view', view); } catch {}
  $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  render();
  window.scrollTo(0, 0);
}
$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('button[data-view]');
  if (b) go(b.dataset.view);
});

function render() {
  renderStats();
  const views = { map: renderMap, planner: renderPlanner, performance: renderPerformance, tasks: renderTasks, timetable: renderTimetable, settings: renderSettings };
  (views[currentView] || renderMap)($('#view'));
}

// ---------- modal ----------
function openModal(html, onSubmit, onReady) {
  const dlg = $('#modal'), form = $('#modalForm');
  form.innerHTML = html;
  form.onsubmit = e => {
    const action = e.submitter?.value;
    if (action === 'cancel') return;
    if (onSubmit(action, new FormData(form)) === false) e.preventDefault();
  };
  onReady?.(form);
  dlg.showModal();
}
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') e.target.close(); });

// ---------- view: curriculum map ----------
function renderMap(root) {
  const list = courses();
  const nSem = Math.max(settings().semesters || 8, ...list.map(c => c.sem));
  const bySem = Array.from({ length: nSem + 1 }, () => []);
  list.forEach(c => bySem[Math.max(0, Math.min(nSem, c.sem || 0))].push(c));

  const rows = [];
  for (let s = 1; s <= nSem; s++) rows.push(semesterRow(s, bySem[s]));
  if (bySem[0].length) rows.push(semesterRow(0, bySem[0]));

  root.innerHTML = `
    ${connectCard()}
    <div class="map-layout">
      <section class="panel map-panel">
        <div class="toolbar">
          <div class="legend">
            ${['locked', 'open', 'active', 'done'].map(k => `<span class="lg ${k}"><i></i>${STATUS[k].label}</span>`).join('')}
          </div>
          <div class="row wrap">
            <button class="btn" id="gradeSheetBtn">📄 ייבוא גיליון ציונים</button>
            <button class="btn primary" id="addCourse">＋ הוסף קורס</button>
          </div>
        </div>
        <p class="hint">הקווים מחברים כל קורס לדרישות הקדם שלו. לחץ על קורס לפרטים, ציון ו-CheeseFork; מעבר עכבר מדגיש את השרשרת.</p>
        <div class="semesters"><svg class="pq-lines" aria-hidden="true"></svg>${rows.join('')}</div>
      </section>
      <aside class="panel side-panel">${upcomingPanel()}</aside>
    </div>`;

  $('#addCourse').onclick = () => editCourse(null);
  $('#gradeSheetBtn').onclick = () => $('#gradeFile').click();
  bindConnectCard(root);
  $$('.course', root).forEach(el => {
    el.onclick = () => editCourse(el.dataset.code);
    el.onmouseenter = () => highlightChain(el.dataset.code, true);
    el.onmouseleave = () => highlightChain(el.dataset.code, false);
  });
  bindTaskList(root);
  drawPrereqLines();
  if (!renderMap.observer) {
    renderMap.observer = new ResizeObserver(() => { if (currentView === 'map') drawPrereqLines(); });
  }
  renderMap.observer.disconnect();
  renderMap.observer.observe($('.semesters', root));
}

// Curved lines from each prerequisite (bottom of its card) to the course it unlocks (top).
function drawPrereqLines() {
  const wrap = $('.semesters');
  const svg = $('.pq-lines', wrap);
  if (!wrap || !svg) return;
  const box = wrap.getBoundingClientRect();
  svg.setAttribute('width', wrap.scrollWidth);
  svg.setAttribute('height', wrap.scrollHeight);
  const cards = Object.fromEntries($$('.course', wrap).map(el => [el.dataset.code, el]));
  const paths = [];
  for (const c of courses()) {
    const to = cards[c.code];
    if (!to) continue;
    for (const p of c.prereqs || []) {
      const from = cards[p];
      if (!from) continue;
      const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      const x1 = a.left + a.width / 2 - box.left, y1 = a.bottom - box.top;
      const x2 = b.left + b.width / 2 - box.left, y2 = b.top - box.top;
      if (y2 <= y1) continue; // same row
      const dy = Math.max(24, (y2 - y1) / 2);
      const done = isComplete(courseByCode(p)) ? 'met' : '';
      paths.push(`<path class="ln ${done}" data-from="${esc(p)}" data-to="${esc(c.code)}" d="M${x1},${y1} C${x1},${y1 + dy} ${x2},${y2 - dy} ${x2},${y2}"/>`);
    }
  }
  svg.innerHTML = paths.join('');
}

function semesterRow(s, list) {
  const credits = list.reduce((a, c) => a + (+c.credits || 0), 0);
  const graded = list.filter(c => c.status === 'done' && c.grade !== null && c.grade !== '');
  const gc = graded.reduce((a, c) => a + +c.credits, 0);
  const avg = gc ? graded.reduce((a, c) => a + c.grade * c.credits, 0) / gc : null;
  return `
    <div class="sem-row">
      <div class="sem-label">
        <b>${esc(semName(s))}</b>
        <small>${fmt(credits)} נק״ז${avg !== null ? ` · ממוצע ${fmt(avg, 1)}` : ''}</small>
      </div>
      <div class="sem-courses">
        ${list.map(courseCard).join('') || '<div class="empty-sem">אין קורסים</div>'}
      </div>
    </div>`;
}

function courseCard(c) {
  const st = courseState(c);
  const grade = c.status === 'done' && c.grade !== null && c.grade !== '' ? `<span class="grade">${esc(c.grade)}</span>` : '';
  const cat = courseCat(c);
  const badge = LISTS[cat] ? `<span class="lbadge" style="--lc:${LISTS[cat].color}">${LISTS[cat].short}</span>` : '';
  return `
    <button class="course ${st}" data-code="${esc(c.code)}" type="button">
      <span class="c-name">${esc(c.name)}</span>
      <span class="c-meta">${badge}${esc(c.code)} · ${fmt(c.credits)} נק״ז</span>
      <span class="c-status">${STATUS[st].icon} ${STATUS[st].label}${grade}</span>
    </button>`;
}

function highlightChain(code, on) {
  const all = courses();
  const pre = new Set(), post = new Set();
  const walkPre = c => (courseByCode(c)?.prereqs || []).forEach(p => { if (!pre.has(p)) { pre.add(p); walkPre(p); } });
  const walkPost = c => all.filter(x => (x.prereqs || []).includes(c)).forEach(x => { if (!post.has(x.code)) { post.add(x.code); walkPost(x.code); } });
  walkPre(code); walkPost(code);
  $('.semesters')?.classList.toggle('focusing', on);
  $$('.course').forEach(el => {
    const k = el.dataset.code;
    el.classList.toggle('hl-self', on && k === code);
    el.classList.toggle('hl-pre', on && pre.has(k));
    el.classList.toggle('hl-post', on && post.has(k));
  });
  const chain = new Set([code, ...pre, ...post]);
  $$('.pq-lines .ln').forEach(l => l.classList.toggle('hl', on && chain.has(l.dataset.from) && chain.has(l.dataset.to)));
}

function editCourse(code) {
  const c = code ? courseByCode(code) : { code: '', name: '', credits: 3, sem: 0, prereqs: [], status: 'none', grade: null, notes: '' };
  const nSem = settings().semesters || 8;
  const others = courses().filter(x => x.code !== code);
  const dependents = code ? others.filter(x => (x.prereqs || []).includes(code)) : [];
  let prereqs = [...(c.prereqs || [])];

  const statusBtns = [['none', 'רגיל'], ['active', 'בלימוד'], ['done', 'הושלם'], ['binary', 'עובר בינארי'], ['exempt', 'פטור']]
    .map(([v, l]) => `<label class="seg-opt"><input type="radio" name="status" value="${v}" ${c.status === v ? 'checked' : ''}><span>${l}</span></label>`).join('');

  openModal(`
    <h2>${code ? 'עריכת קורס' : 'קורס חדש'}</h2>
    <div class="grid2">
      <label class="full">שם הקורס<input name="name" required value="${esc(c.name)}"></label>
      <label>מספר קורס<input name="code" required inputmode="numeric" value="${esc(c.code)}" ${code ? 'readonly' : ''}></label>
      <label>נק״ז<input name="credits" type="number" step="0.5" min="0" value="${esc(c.credits)}"></label>
      <label>סמסטר<select name="sem">
        ${Array.from({ length: nSem }, (_, i) => `<option value="${i + 1}" ${c.sem === i + 1 ? 'selected' : ''}>${esc(semName(i + 1))}</option>`).join('')}
        <option value="0" ${!c.sem ? 'selected' : ''}>${semName(0)}</option>
      </select></label>
      <label>ציון<input name="grade" type="number" min="0" max="100" inputmode="numeric" value="${c.grade ?? ''}" placeholder="—"></label>
      <label class="full">קטגוריה<select name="list">
        <option value="mandatory" ${courseCat(c) === 'mandatory' ? 'selected' : ''}>חובה</option>
        ${Object.entries(LISTS).map(([k, v]) => `<option value="${k}" ${courseCat(c) === k ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}
      </select></label>
    </div>
    <div class="field"><span class="field-label">סטטוס</span><div class="seg wrap">${statusBtns}</div>
      <small class="muted">עובר בינארי (מילואים): הנק״ז נספרות, הציון לא נכנס לממוצע. נדרש ציון 55+.</small></div>
    ${code ? courseLinks(c) : ''}
    ${code && !isComplete(c) ? `<details class="calc"><summary>🎯 מחשבון יעד למבחן</summary>
      <div class="grid3">
        <label>ציון יעד בקורס<input id="cTarget" type="number" min="0" max="100" value="85"></label>
        <label>משקל המבחן %<input id="cWeight" type="number" min="1" max="100" value="70"></label>
        <label>ציון שאר הרכיבים<input id="cRest" type="number" min="0" max="100" value="90"></label>
      </div><p id="cOut" class="calc-out"></p></details>` : ''}
    ${code ? cheeseForkSection(code) : ''}
    <div class="field">
      <span class="field-label">דרישות קדם</span>
      <div class="chips" id="prereqChips"></div>
      <select id="prereqAdd"><option value="">＋ הוסף דרישת קדם…</option>
        ${others.map(o => `<option value="${esc(o.code)}">${esc(o.name)} (${esc(o.code)})</option>`).join('')}
      </select>
    </div>
    ${dependents.length ? `<div class="field"><span class="field-label">נדרש עבור</span><div class="chips">${dependents.map(d => `<span class="chip ghost">${esc(d.name)}</span>`).join('')}</div></div>` : ''}
    <label class="full">הערות<textarea name="notes" rows="2">${esc(c.notes)}</textarea></label>
    <div class="actions">
      ${code ? '<button class="btn danger" value="delete" formnovalidate>מחק</button><button class="btn" value="task" formnovalidate>＋ משימה</button>' : ''}
      <span class="spacer"></span>
      <button class="btn" value="cancel" formnovalidate>ביטול</button>
      <button class="btn primary" value="save">שמור</button>
    </div>`,
  (action, fd) => {
    if (action === 'delete') {
      if (!confirm(`למחוק את "${c.name}"?`)) return false;
      Store.remove('course', code);
      courses().filter(x => (x.prereqs || []).includes(code))
        .forEach(x => Store.put('course', x.code, { prereqs: x.prereqs.filter(p => p !== code) }));
      toast('הקורס נמחק');
      return;
    }
    const newCode = (fd.get('code') || '').trim();
    if (!code && courseByCode(newCode)) { alert('קורס עם המספר הזה כבר קיים'); return false; }
    const g = fd.get('grade');
    const data = {
      code: newCode, name: fd.get('name').trim(), credits: +fd.get('credits') || 0, sem: +fd.get('sem'),
      status: fd.get('status') || 'none', grade: g === '' ? null : Math.max(0, Math.min(100, +g)),
      prereqs, notes: fd.get('notes'), type: fd.get('list') === 'mandatory' ? 'mandatory' : (c.type === 'mandatory' ? 'elective' : c.type || 'elective'),
      list: fd.get('list') === 'mandatory' ? null : fd.get('list'),
    };
    if (data.grade !== null && data.status === 'none') data.status = 'done';
    if (data.status === 'binary' && (data.grade === null || data.grade < RESERVE.binaryMinGrade)) {
      alert(`עובר בינארי דורש ציון סופי ${RESERVE.binaryMinGrade} ומעלה. הזן את הציון.`);
      return false;
    }
    Store.put('course', newCode, data);
    if (action === 'task') setTimeout(() => editTask(null, { course: newCode }), 50);
    else toast('נשמר');
  },
  form => {
    const drawChips = () => {
      $('#prereqChips', form).innerHTML = prereqs.length
        ? prereqs.map(p => {
          const pc = courseByCode(p);
          return `<span class="chip ${isComplete(pc) ? 'ok' : ''}">${esc(courseLabel(p))}<button type="button" data-rm="${esc(p)}" aria-label="הסר">×</button></span>`;
        }).join('')
        : '<span class="muted">אין</span>';
    };
    drawChips();
    $('#prereqChips', form).onclick = e => {
      const rm = e.target.dataset.rm;
      if (rm) { prereqs = prereqs.filter(p => p !== rm); drawChips(); }
    };
    $('#prereqAdd', form).onchange = e => {
      const v = e.target.value;
      if (v && !prereqs.includes(v)) prereqs.push(v);
      e.target.value = ''; drawChips();
    };
    if (code && c.status === 'none') {
      const g = $('[name=grade]', form);
      g.oninput = () => { if (g.value !== '') $('[name=status][value=done]', form).checked = true; };
    }
    const calc = () => {
      const t = +$('#cTarget', form).value, w = +$('#cWeight', form).value / 100, r = +$('#cRest', form).value;
      const need = (t - r * (1 - w)) / w;
      $('#cOut', form).textContent = need > 100 ? `צריך ${Math.ceil(need)} במבחן – לא אפשרי עם הרכיבים האלה`
        : need <= 55 ? 'מספיק לעבור את המבחן (55) כדי להגיע ליעד' : `צריך לפחות ${Math.ceil(need)} במבחן`;
    };
    if ($('#cTarget', form)) { $$('.calc input', form).forEach(i => i.oninput = calc); calc(); }
    if (code) fillCheeseFork(form, code);
  });
}

// ---------- tasks ----------
const tasks = () => Store.list('task').sort((a, b) => (a.done - b.done) || (a.due || '9999').localeCompare(b.due || '9999'));

function dueText(t) {
  if (!t.due) return '';
  const due = new Date(t.due.length === 10 ? t.due + 'T23:59' : t.due);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due); dueDay.setHours(0, 0, 0, 0);
  const days = Math.round((dueDay - today) / 86_400_000);
  const dateStr = due.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' }) +
    (t.due.length > 10 ? ' ' + due.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '');
  let rel = '';
  if (!t.done) {
    if (due < Date.now()) rel = 'עבר המועד';
    else if (days <= 0) rel = 'היום';
    else if (days === 1) rel = 'מחר';
    else rel = `בעוד ${days} ימים`;
  }
  return { dateStr, rel, overdue: !t.done && due < Date.now(), soon: !t.done && days <= 2 };
}

function taskItem(t) {
  const d = dueText(t);
  const type = TASK_TYPES[t.type] || TASK_TYPES.other;
  return `
    <li class="task ${t.done ? 'done' : ''} ${d.overdue ? 'overdue' : d.soon ? 'soon' : ''}" data-id="${esc(t.id)}">
      <input type="checkbox" class="t-check" ${t.done ? 'checked' : ''} aria-label="בוצע">
      <div class="t-body">
        <div class="t-title">${type.icon} ${esc(t.title)}</div>
        <div class="t-meta">${t.course ? `<span>${esc(courseLabel(t.course))}</span>` : ''}${d ? `<span>${d.dateStr}</span>` : ''}</div>
      </div>
      ${d.rel ? `<span class="t-rel">${d.rel}</span>` : ''}
    </li>`;
}

function bindTaskList(root) {
  $$('.task', root).forEach(li => {
    const id = li.dataset.id;
    $('.t-check', li).onclick = e => { e.stopPropagation(); Store.put('task', id, { done: e.target.checked }); };
    li.onclick = () => editTask(id);
  });
}

function upcomingPanel() {
  const now = Date.now(), week = now + 14 * 86_400_000;
  const up = tasks().filter(t => !t.done && t.due && new Date(t.due).getTime() < week);
  const active = courses().filter(c => c.status === 'active');
  return `
    <h3>⏰ בשבועיים הקרובים</h3>
    ${up.length ? `<ul class="task-list compact">${up.map(taskItem).join('')}</ul>` : '<p class="muted">אין משימות קרובות 🎉</p>'}
    <h3>📖 בלימוד עכשיו</h3>
    ${active.length ? `<div class="chips">${active.map(c => `<span class="chip">${esc(c.name)}</span>`).join('')}</div>` : '<p class="muted">סמן קורסים כ"בלימוד" כדי לראות אותם כאן.</p>'}`;
}

let taskFilter = 'open', taskType = 'all', taskCourse = 'all';
function renderTasks(root) {
  let list = tasks();
  if (taskFilter === 'open') list = list.filter(t => !t.done);
  if (taskFilter === 'done') list = list.filter(t => t.done);
  if (taskType !== 'all') list = list.filter(t => t.type === taskType);
  if (taskCourse !== 'all') list = list.filter(t => t.course === taskCourse);
  const usedCourses = [...new Set(tasks().map(t => t.course).filter(Boolean))];

  root.innerHTML = `
    <section class="panel">
      <div class="toolbar">
        <h2>📝 משימות ומבחנים</h2>
        <button class="btn primary" id="addTask">＋ משימה חדשה</button>
      </div>
      ${googleBar('tasks')}
      ${Sync.hookError ? errorNote('הסנכרון עם Google Tasks לא עובד', Sync.hookError) : ''}
      <div class="filters">
        <div class="seg small">
          ${[['open', 'פתוחות'], ['done', 'בוצעו'], ['all', 'הכל']].map(([v, l]) => `<button data-f="${v}" class="${taskFilter === v ? 'on' : ''}">${l}</button>`).join('')}
        </div>
        <select id="fType"><option value="all">כל הסוגים</option>${Object.entries(TASK_TYPES).map(([k, v]) => `<option value="${k}" ${taskType === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select>
        <select id="fCourse"><option value="all">כל הקורסים</option>${usedCourses.map(c => `<option value="${esc(c)}" ${taskCourse === c ? 'selected' : ''}>${esc(courseLabel(c))}</option>`).join('')}</select>
      </div>
      ${list.length ? `<ul class="task-list">${list.map(taskItem).join('')}</ul>` : '<p class="empty">אין משימות כאן.</p>'}
    </section>`;
  $('#addTask').onclick = () => editTask(null);
  bindGoogleBar(root);
  $$('[data-f]', root).forEach(b => b.onclick = () => { taskFilter = b.dataset.f; render(); });
  $('#fType').onchange = e => { taskType = e.target.value; render(); };
  $('#fCourse').onchange = e => { taskCourse = e.target.value; render(); };
  bindTaskList(root);
}

function courseOptions(selected) {
  const list = courses();
  const active = list.filter(c => c.status === 'active');
  const opt = c => `<option value="${esc(c.code)}" ${selected === c.code ? 'selected' : ''}>${esc(c.name)}</option>`;
  return `<option value="">— ללא —</option>
    ${active.length ? `<optgroup label="בלימוד">${active.map(opt).join('')}</optgroup>` : ''}
    <optgroup label="כל הקורסים">${list.filter(c => c.status !== 'active').map(opt).join('')}</optgroup>`;
}

function editTask(id, defaults = {}) {
  const t = id ? Store.get('task', id) : { title: '', type: 'hw', course: '', due: '', done: false, notes: '', ...defaults };
  openModal(`
    <h2>${id ? 'עריכת משימה' : 'משימה חדשה'}</h2>
    <div class="grid2">
      <label class="full">כותרת<input name="title" required value="${esc(t.title)}" placeholder="למשל: גיליון 3"></label>
      <label>סוג<select name="type">${Object.entries(TASK_TYPES).map(([k, v]) => `<option value="${k}" ${t.type === k ? 'selected' : ''}>${v.icon} ${v.label}</option>`).join('')}</select></label>
      <label>קורס<select name="course">${courseOptions(t.course)}</select></label>
      <label>תאריך<input name="date" type="date" value="${esc((t.due || '').slice(0, 10))}"></label>
      <label>שעה<input name="time" type="time" value="${esc((t.due || '').slice(11, 16))}"></label>
    </div>
    <label class="full">הערות<textarea name="notes" rows="2">${esc(t.notes)}</textarea></label>
    <label class="check"><input type="checkbox" name="done" ${t.done ? 'checked' : ''}> בוצע</label>
    <div class="actions">
      ${id ? '<button class="btn danger" value="delete" formnovalidate>מחק</button>' : ''}
      <span class="spacer"></span>
      <button class="btn" value="cancel" formnovalidate>ביטול</button>
      <button class="btn primary" value="save">שמור</button>
    </div>`,
  (action, fd) => {
    if (action === 'delete') { Store.remove('task', id); toast('המשימה נמחקה'); return; }
    const date = fd.get('date'), time = fd.get('time');
    Store.put('task', id || uid(), {
      title: fd.get('title').trim(), type: fd.get('type'), course: fd.get('course'),
      due: date ? (time ? `${date}T${time}` : date) : '', notes: fd.get('notes'), done: fd.get('done') === 'on',
    });
    toast('נשמר');
  });
}

// ---------- timetable (weekly, with Google Calendar events) ----------
const toMin = s => { const [h, mm] = (s || '0:0').split(':').map(Number); return h * 60 + mm; };
const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const slots = () => Store.list('slot');
const HOUR_PX = 52;

function slotColor(key) {
  let h = 0;
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function startOfWeek(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay());
  return x;
}
let ttWeek = startOfWeek(new Date());

// Side-by-side layout for overlapping items in one day column.
function layoutLanes(items) {
  items.sort((a, b) => a.s - b.s || b.e - a.e);
  let group = [], groupEnd = -1;
  const flush = () => {
    const lanes = [];
    for (const it of group) {
      let lane = lanes.findIndex(end => end <= it.s);
      if (lane === -1) { lane = lanes.length; lanes.push(0); }
      lanes[lane] = it.e; it.lane = lane;
    }
    group.forEach(it => { it.lanes = lanes.length; });
    group = [];
  };
  for (const it of items) {
    if (it.s >= groupEnd) { flush(); groupEnd = -1; }
    group.push(it); groupEnd = Math.max(groupEnd, it.e);
  }
  flush();
  return items;
}

function renderTimetable(root) {
  const weekStart = ttWeek;
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const isThisWeek = ymd(weekStart) === ymd(startOfWeek(new Date()));
  const todayKey = ymd(new Date());
  const dates = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });

  // Weekly class slots + this week's calendar events, normalised to {day, s, e}.
  const items = slots().map(s => ({
    kind: 'slot', id: s.id, day: +s.day, s: toMin(s.start), e: toMin(s.end),
    title: s.course ? courseLabel(s.course) : s.title, sub: s.stype, place: s.room, hue: slotColor(s.course || s.title),
  }));
  const allDay = Array.from({ length: 7 }, () => []);
  for (const ev of GCal.eventsFor(weekStart)) {
    if (ev.allDay) {
      dates.forEach((d, i) => { const k = ymd(d); if (k >= ev.start.slice(0, 10) && k < ev.end.slice(0, 10)) allDay[i].push(ev); });
      continue;
    }
    const st = new Date(ev.start), en = new Date(ev.end);
    const day = ymd(startOfWeek(st)) === ymd(weekStart) ? st.getDay() : -1;
    if (day < 0) continue;
    const endMin = ymd(en) === ymd(st) ? en.getHours() * 60 + en.getMinutes() : 24 * 60;
    items.push({
      kind: 'event', id: ev.id, day, s: st.getHours() * 60 + st.getMinutes(), e: Math.max(endMin, st.getHours() * 60 + st.getMinutes() + 15),
      title: ev.title, sub: ev.calendar, place: ev.location, color: ev.color,
    });
  }

  const allDayH = Math.max(0, ...allDay.map(a => a.length)) * 24;
  const used = new Set(items.map(i => i.day).concat(allDay.flatMap((a, i) => a.length ? [i] : [])));
  const days = used.has(6) ? 7 : used.has(5) ? 6 : 5;
  const startMin = Math.min(8 * 60 + 30, ...items.map(i => Math.floor((i.s - 30) / 60) * 60 + 30));
  const endMin = Math.max(21 * 60 + 30, ...items.map(i => i.e));
  const hours = [];
  for (let m = startMin; m < endMin; m += 60) hours.push(m);
  const total = hours.length * 60;

  const cols = dates.slice(0, days).map((d, di) => {
    const dayItems = layoutLanes(items.filter(i => i.day === di));
    const blocks = dayItems.map(it => {
      const pos = `top:${(it.s - startMin) / total * 100}%;height:${(it.e - it.s) / total * 100}%;` +
        `width:calc(${100 / it.lanes}% - 6px);inset-inline-start:calc(${(100 / it.lanes) * it.lane}% + 3px);`;
      const style = it.kind === 'slot' ? `--h:${it.hue}` : `--ev:${esc(it.color)}`;
      return `<button type="button" class="slot ${it.kind}" data-kind="${it.kind}" data-id="${esc(it.id)}" style="${pos}${style}">
        <b>${esc(it.title)}</b><small>${esc(it.sub)} · <span dir="ltr">${hhmm(it.s)}–${hhmm(it.e)}</span></small>${it.place ? `<small>${esc(it.place)}</small>` : ''}
      </button>`;
    }).join('');
    const key = ymd(d);
    return `<div class="tt-col ${key === todayKey ? 'today' : ''}" data-day="${di}">
      <div class="tt-head">${DAY_NAMES[di]}<small>${d.getDate()}.${d.getMonth() + 1}</small></div>
      <div class="tt-allday" style="height:${allDayH}px">${allDay[di].map(ev => `<button type="button" class="allday" data-kind="event" data-id="${esc(ev.id)}" style="--ev:${esc(ev.color)}">${esc(ev.title)}</button>`).join('')}</div>
      <div class="tt-body" style="height:${hours.length * HOUR_PX}px">${hours.map(() => '<div class="tt-hour"></div>').join('')}${blocks}</div>
    </div>`;
  }).join('');

  const todayIdx = isThisWeek ? new Date().getDay() : -1;
  const todays = items.filter(i => i.day === todayIdx).sort((a, b) => a.s - b.s);
  const calNote = googleBar('calendar') +
    (Sync.connected && Sync.hasScope('calendar') && GCal.lastError ? errorNote('לא הצלחתי לטעון את היומן', GCal.lastError) : '');

  root.innerHTML = `
    <section class="panel">
      <div class="toolbar">
        <h2>🕒 מערכת שעות</h2>
        <div class="row wrap">
          <button class="btn" id="wkPrev" aria-label="שבוע קודם">→</button>
          <button class="btn ${isThisWeek ? 'on' : ''}" id="wkToday">השבוע</button>
          <button class="btn" id="wkNext" aria-label="שבוע הבא">←</button>
          <span class="muted">${weekStart.getDate()}.${weekStart.getMonth() + 1} – ${weekEnd.getDate()}.${weekEnd.getMonth() + 1}</span>
          <button class="btn primary" id="addSlot">＋ הוסף שיעור</button>
        </div>
      </div>
      ${calNote}
      ${todays.length ? `<div class="today-strip"><b>היום:</b> ${todays.map(i => `<span class="chip"><span dir="ltr">${hhmm(i.s)}</span> ${esc(i.title)}</span>`).join('')}</div>` : ''}
      <div class="tt-scroll">
        <div class="tt" style="--days:${days}">
          <div class="tt-times"><div class="tt-head"></div><div class="tt-allday" style="height:${allDayH}px"></div><div class="tt-body">${hours.map(m => `<div class="tt-hour"><span>${hhmm(m)}</span></div>`).join('')}</div></div>
          ${cols}
        </div>
      </div>
      <p class="hint">שיעורים שהוספת כאן חוזרים כל שבוע. אירועים מ-Google Calendar מוצגים בצבע של היומן שלהם. לחץ על משבצת ריקה כדי להוסיף שיעור.</p>
    </section>`;

  $('#wkPrev').onclick = () => { ttWeek = new Date(weekStart); ttWeek.setDate(ttWeek.getDate() - 7); render(); };
  $('#wkNext').onclick = () => { ttWeek = new Date(weekStart); ttWeek.setDate(ttWeek.getDate() + 7); render(); };
  $('#wkToday').onclick = () => { ttWeek = startOfWeek(new Date()); render(); };
  $('#addSlot').onclick = () => editSlot(null);
  bindGoogleBar(root);
  $$('[data-kind]', root).forEach(el => el.onclick = e => {
    e.stopPropagation();
    if (el.dataset.kind === 'slot') editSlot(el.dataset.id);
    else showEvent(GCal.eventsFor(weekStart).find(ev => ev.id === el.dataset.id));
  });
  $$('.tt-col .tt-body', root).forEach(body => body.onclick = e => {
    const rect = body.getBoundingClientRect();
    const mins = startMin + Math.floor(((e.clientY - rect.top) / rect.height) * total / 60) * 60;
    editSlot(null, { day: +body.parentElement.dataset.day, start: hhmm(mins), end: hhmm(mins + 120) });
  });

  GCal.fetchWeek(weekStart, () => { if (currentView === 'timetable' && ttWeek === weekStart) render(); });
}

function showEvent(ev) {
  if (!ev) return;
  const fmtT = s => new Date(s).toLocaleString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
  openModal(`
    <h2>${esc(ev.title)}</h2>
    <p class="muted"><span class="ev-dot" style="--ev:${esc(ev.color)}"></span> ${esc(ev.calendar)}</p>
    <p>${ev.allDay ? 'כל היום' : `${fmtT(ev.start)} – ${new Date(ev.end).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`}</p>
    ${ev.location ? `<p>📍 ${esc(ev.location)}</p>` : ''}
    ${ev.description ? `<p class="ev-desc">${esc(ev.description.replace(/<[^>]+>/g, ' '))}</p>` : ''}
    <div class="actions">
      <a class="btn" href="${esc(ev.link)}" target="_blank" rel="noopener">פתח ב-Google Calendar</a>
      <span class="spacer"></span>
      <button class="btn primary" value="cancel">סגור</button>
    </div>`, () => {});
}

function editSlot(id, defaults = {}) {
  const s = id ? Store.get('slot', id) : { course: '', title: '', stype: 'הרצאה', day: 0, start: '08:30', end: '10:30', room: '', ...defaults };
  openModal(`
    <h2>${id ? 'עריכת שיעור' : 'שיעור חדש'}</h2>
    <div class="grid2">
      <label class="full">קורס<select name="course">${courseOptions(s.course)}</select></label>
      <label class="full">או כותרת חופשית<input name="title" value="${esc(s.title)}" placeholder="למשל: שעת קבלה"></label>
      <label>סוג<select name="stype">${SLOT_TYPES.map(k => `<option ${s.stype === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
      <label>יום<select name="day">${DAY_NAMES.slice(0, 6).map((d, i) => `<option value="${i}" ${+s.day === i ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
      <label>התחלה<input name="start" type="time" step="900" required value="${esc(s.start)}"></label>
      <label>סיום<input name="end" type="time" step="900" required value="${esc(s.end)}"></label>
      <label class="full">מיקום<input name="room" value="${esc(s.room)}" placeholder="למשל: דן קאהן 1"></label>
    </div>
    <div class="actions">
      ${id ? '<button class="btn danger" value="delete" formnovalidate>מחק</button>' : ''}
      <span class="spacer"></span>
      <button class="btn" value="cancel" formnovalidate>ביטול</button>
      <button class="btn primary" value="save">שמור</button>
    </div>`,
  (action, fd) => {
    if (action === 'delete') { Store.remove('slot', id); return; }
    if (!fd.get('course') && !fd.get('title').trim()) { alert('בחר קורס או כתוב כותרת'); return false; }
    if (toMin(fd.get('end')) <= toMin(fd.get('start'))) { alert('שעת הסיום חייבת להיות אחרי ההתחלה'); return false; }
    Store.put('slot', id || uid(), {
      course: fd.get('course'), title: fd.get('title').trim(), stype: fd.get('stype'), day: +fd.get('day'),
      start: fd.get('start'), end: fd.get('end'), room: fd.get('room').trim(),
    });
  });
}

// ---------- settings ----------
// A Google error, with a one-click fix when it's an API that is switched off.
function errorNote(what, e) {
  if (e.enableUrl) {
    return `<div class="warn-box">
      <p><b>⚠️ ${esc(what)}:</b> ${esc(e.message)}.</p>
      <p class="muted">לחץ על הכפתור, ובדף שנפתח לחץ <b>Enable</b>. אחרי דקה-שתיים חזור לכאן.</p>
      <a class="btn primary" href="${esc(e.enableUrl)}" target="_blank" rel="noopener">הפעל ב-Google Cloud</a>
    </div>`;
  }
  return `<p class="warn">⚠️ ${esc(what)}: ${esc(e.message || e)}</p>`;
}

function googleSection(st) {
  const missing = ['calendar', 'tasks'].filter(s => !Sync.hasScope(s));
  if (missing.length && Sync.token()) {
    return `
    <section class="panel narrow">
      <h2>📅 Google Calendar ו-Google Tasks</h2>
      <p>כדי להציג את היומן במערכת השעות ולסנכרן משימות, צריך לאשר הרשאות חדשות פעם אחת.</p>
      <p class="muted">לפני כן ודא שב-Google Cloud Console הפעלת את <b>Google Calendar API</b> ואת <b>Google Tasks API</b> (APIs &amp; Services → Library).</p>
      <button class="btn primary" id="grantMore">🔓 אשר גישה ליומן ולמשימות</button>
    </section>`;
  }
  const cals = GCal.calendars;
  const chosen = Array.isArray(st.calendarIds) ? st.calendarIds : [];
  const cats = GCal.categories;
  const shown = st.calCategories;
  const multiCal = chosen.length > 1;
  const lists = GTasks.lists;
  const listMap = lists ? GTasks.courseMap(lists) : {};
  const overrides = st.taskListMap || {};
  const courseOpts = sel => `<option value="">— לא לסנכרן —</option>` +
    courses().map(c => `<option value="${esc(c.code)}" ${sel === c.code ? 'selected' : ''}>${esc(c.name)}</option>`).join('');

  return `
    <section class="panel narrow">
      <h2>📅 היומן במערכת השעות</h2>
      <p class="muted">מערכת השעות מציגה אירועים מהיומנים המסומנים, רק מהקטגוריות (צבעים) שבחרת. קריאה בלבד.</p>
      ${GCal.lastError ? errorNote('לא הצלחתי לטעון את היומן', GCal.lastError) : ''}
      <h3>יומנים</h3>
      ${cals ? `<div class="cal-picks">${cals.map(c => `
        <label class="check"><input type="checkbox" class="calPick" value="${esc(c.id)}" ${chosen.includes(c.id) ? 'checked' : ''}>
        <span class="ev-dot" style="--ev:${esc(c.color)}"></span>${esc(c.summary)}${c.primary ? ' <small class="muted">(ראשי)</small>' : ''}</label>`).join('')}</div>`
        : `<p class="muted">טוען יומנים…</p>`}
      <h3>קטגוריות לפי צבע</h3>
      <p class="muted">Instinct צובע כל אירוע לפי הקטגוריה שלו. סמן את צבעי הלימודים.</p>
      ${cats ? (cats.length ? `<div class="cat-picks">${cats.map(c => `
        <label class="cat-pick"><input type="checkbox" class="catPick" value="${esc(c.key)}" ${(Array.isArray(shown) ? shown.includes(c.key) : c.study) ? 'checked' : ''}>
          <span class="ev-dot big" style="--ev:${esc(c.color)}"></span>
          <span class="cat-info"><b>${c.count} אירועים${multiCal ? ` · ${esc(c.calendar)}` : ''}${c.study ? ' <span class="badge">📚 נראה כמו לימודים</span>' : ''}</b>
          <small>${c.samples.map(esc).join(' · ')}</small></span>
        </label>`).join('')}</div>` : '<p class="muted">אין אירועים ב-10 השבועות הקרובים ביומנים שנבחרו.</p>')
        : (cals ? '<p class="muted">סורק את היומן…</p>' : '')}
      ${cats ? '<button class="btn" id="rescanCats">🔄 סרוק שוב</button>' : ''}
    </section>

    <section class="panel narrow">
      <h2>✅ Google Tasks</h2>
      <label class="check"><input type="checkbox" id="tasksSync" ${st.tasksSync !== false ? 'checked' : ''}> סנכרון דו-כיווני של המשימות עם Google Tasks</label>
      <p class="muted">כל רשימה ב-Google Tasks שמשויכת לקורס (כמו הרשימות ש-Instinct יצר) מסתנכרנת עם המשימות של אותו קורס. משימות בלי קורס נכנסות לרשימה "${esc(TASKS_LIST_TITLE)}". Google Tasks שומר רק תאריך, בלי שעה.</p>
      ${Sync.hookError ? errorNote('סנכרון המשימות נכשל', Sync.hookError) : ''}
      ${lists ? `<div class="list-map">${lists.map(l => l.id === st.tasksListId
        ? `<div class="list-row"><span>📋 ${esc(l.title)}</span><small class="muted">משימות בלי קורס</small></div>`
        : `<div class="list-row"><span>📋 ${esc(l.title)}</span>
            <select class="listPick" data-list="${esc(l.id)}">${courseOpts(l.id in overrides ? overrides[l.id] : (listMap[l.id] || ''))}</select></div>`).join('')}</div>`
        : (Sync.hasScope('tasks') && st.tasksSync !== false && !Sync.hookError ? '<p class="muted">טוען רשימות…</p>' : '')}
    </section>`;
}

let googleSettingsLoading = false;
function bindGoogleSection(root) {
  $('#grantMore', root)?.addEventListener('click', () => Sync.authorize());

  // Load calendars, color categories and task lists once per visit.
  const needCal = Sync.hasScope('calendar') && (!GCal.calendars || !GCal.categories) && !GCal.lastError;
  const needLists = Sync.hasScope('tasks') && settings().tasksSync !== false && !GTasks.lists && !Sync.hookError;
  if (Sync.connected && Sync.token() && (needCal || needLists) && !googleSettingsLoading) {
    googleSettingsLoading = true;
    const rerender = () => { if (currentView === 'settings') render(); };
    const jobs = [];
    if (needCal) jobs.push(GCal.listCalendars().then(() => GCal.selectedIds()).then(rerender).then(() => GCal.scanCategories()).catch(e => { GCal.lastError = e; }));
    if (needLists) jobs.push(GTasks.fetchLists().catch(e => { Sync.hookError = e; }));
    Promise.all(jobs).finally(() => { googleSettingsLoading = false; rerender(); });
  }

  const resetCalendar = () => { GCal.weeks = {}; GCal.fetchedAt = {}; };
  $$('.calPick', root).forEach(cb => cb.onchange = () => {
    Store.put('meta', 'settings', { calendarIds: $$('.calPick:checked', root).map(x => x.value) });
    GCal.categories = null; resetCalendar();
    render();
  });
  $$('.catPick', root).forEach(cb => cb.onchange = () => {
    Store.put('meta', 'settings', { calCategories: $$('.catPick:checked', root).map(x => x.value) });
  });
  $('#rescanCats', root)?.addEventListener('click', () => { GCal.categories = null; resetCalendar(); render(); });
  $$('.listPick', root).forEach(sel => sel.onchange = () => {
    Store.put('meta', 'settings', { taskListMap: { ...(settings().taskListMap || {}), [sel.dataset.list]: sel.value } });
    Sync.schedule(100);
  });
  const ts = $('#tasksSync', root);
  if (ts) ts.onchange = () => { Store.put('meta', 'settings', { tasksSync: ts.checked }); if (ts.checked) Sync.schedule(100); };
}

function renderSettings(root) {
  const last = Sync.lastSync ? new Date(Sync.lastSync).toLocaleString('he-IL') : 'אף פעם';
  const st = settings();
  const isHttps = location.protocol === 'https:' || location.hostname === 'localhost';
  root.innerHTML = `
    <section class="panel narrow">
      <h2>☁️ סנכרון עם Google</h2>
      <p class="muted">הנתונים נשמרים בתיקייה מוסתרת בגוגל דרייב שלך (רק האפליקציה הזו רואה אותה), ומסתנכרנים בין המחשב, האייפד והטלפון.</p>
      <div class="sync-status" data-state="${Sync.state}">
        <span class="dot"></span><b>${SYNC_LABELS[Sync.state]}</b>
        <small>סנכרון אחרון: ${last}${Sync.message && Sync.state !== 'ok' ? ` · ${esc(Sync.message)}` : ''}</small>
      </div>
      <div class="row wrap">
        ${Sync.connected
          ? `<button class="btn primary" id="syncNow">🔄 סנכרן עכשיו</button><button class="btn" id="reconnect">התחבר מחדש</button><button class="btn danger" id="disconnect">התנתק</button>`
          : `<button class="btn primary big" id="connect">התחבר עם Google</button>`}
      </div>
      ${!isHttps ? '<p class="warn">⚠️ הסנכרון עובד רק כשהאפליקציה מוגשת מכתובת https (למשל GitHub Pages).</p>' : ''}
      <details ${Sync.clientId ? '' : 'open'}>
        <summary>מתקדם: Client ID</summary>
        <label>Google OAuth Client ID
          <input id="clientId" dir="ltr" placeholder="xxxxxxxx.apps.googleusercontent.com" value="${esc(Sync.clientId)}">
        </label>
        <ol class="howto">
          <li>היכנס ל-<a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener">Google Cloud Console</a> וצור פרויקט חדש.</li>
          <li>תחת <b>APIs &amp; Services → Library</b> הפעל את <b>Google Drive API</b>, <b>Google Calendar API</b> ו-<b>Google Tasks API</b>.</li>
          <li>תחת <b>OAuth consent screen</b>: בחר External, מלא שם ומייל, והוסף את עצמך ב-<b>Test users</b>. אחרי זה לחץ <b>Publish app</b> כדי שהחיבור לא יפוג כל 7 ימים.</li>
          <li>תחת <b>Credentials → Create credentials → OAuth client ID</b>: בחר <b>Web application</b>.</li>
          <li>ב-<b>Authorized JavaScript origins</b> הוסף: <code dir="ltr">${esc(location.origin)}</code></li>
          <li>ב-<b>Authorized redirect URIs</b> הוסף: <code dir="ltr">${esc(Sync.redirectUri())}</code></li>
          <li>העתק את ה-Client ID לכאן ולחץ "התחבר". חזור על החיבור פעם אחת בכל מכשיר.</li>
        </ol>
      </details>
    </section>

    ${Sync.connected ? googleSection(st) : ''}

    <section class="panel narrow">
      <h2>🎓 התואר</h2>
      <div class="grid2">
        <label>סה״כ נק״ז לתואר<input id="totalCredits" type="number" step="0.5" value="${esc(st.totalCredits)}"></label>
        <label>מספר סמסטרים<input id="nSem" type="number" min="1" max="12" value="${esc(st.semesters)}"></label>
      </div>
    </section>

    <section class="panel narrow">
      <h2>💾 גיבוי</h2>
      <div class="row wrap">
        <button class="btn" id="exportBtn">⬇️ ייצוא לקובץ</button>
        <button class="btn" id="importBtn">⬆️ ייבוא מקובץ</button>
        <button class="btn danger" id="resetCurriculum">אפס תוכנית לימודים</button>
      </div>
      <p class="muted">איפוס מחזיר את רשימת הקורסים לתוכנית ברירת המחדל (הציונים והסטטוסים יימחקו). משימות ומערכת שעות לא נפגעות.</p>
    </section>

    <section class="panel narrow">
      <h2>📲 התקנה כאפליקציה</h2>
      <ul class="howto">
        <li><b>מחשב (Chrome / Edge):</b> אייקון ההתקנה בשורת הכתובת, או תפריט ← "התקן אפליקציה".</li>
        <li><b>אייפון / אייפד (Safari):</b> כפתור השיתוף ← "הוסף למסך הבית".</li>
        <li><b>אנדרואיד (Chrome):</b> תפריט ⋮ ← "התקן אפליקציה".</li>
      </ul>
    </section>`;

  const saveClientId = () => { Sync.clientId = $('#clientId').value; };
  $('#clientId').onchange = saveClientId;
  bindGoogleSection(root);
  $('#connect')?.addEventListener('click', () => {
    saveClientId();
    if (!Sync.clientId) return alert('הדבק קודם Client ID');
    Sync.authorize();
  });
  $('#reconnect')?.addEventListener('click', () => { saveClientId(); Sync.authorize(); });
  $('#syncNow')?.addEventListener('click', () => Sync.syncNow().then(() => render()));
  $('#disconnect')?.addEventListener('click', () => { if (confirm('לנתק את הסנכרון במכשיר הזה? הנתונים המקומיים יישארו.')) { Sync.disconnect(); render(); } });
  $('#totalCredits').onchange = e => Store.put('meta', 'settings', { totalCredits: +e.target.value || DEGREE_TOTAL_CREDITS });
  $('#nSem').onchange = e => Store.put('meta', 'settings', { semesters: Math.max(1, Math.min(12, +e.target.value || 8)) });

  $('#exportBtn').onclick = () => {
    const blob = new Blob([JSON.stringify({ v: 1, exportedAt: new Date().toISOString(), recs: Store.recs }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `planner-backup-${ymd(new Date())}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#importBtn').onclick = () => $('#importFile').click();
  $('#resetCurriculum').onclick = () => {
    if (!confirm('לאפס את כל הקורסים לתוכנית ברירת המחדל?')) return;
    courses().forEach(c => Store.remove('course', c.code));
    const now = Date.now();
    SEED_COURSES.forEach(([sem, code, name, credits, prereqs, type]) => {
      Store.recs[`course:${code}`] = { kind: 'course', id: code, code, name, credits, sem, prereqs, type, status: 'none', grade: null, notes: '', u: now + 1 };
    });
    Store.persist(); Store.emit();
    toast('התוכנית אופסה');
  };
}

// The file input lives outside #view so a re-render while the picker is open
// can't throw away the chosen file. No `accept` filter: iOS greys out .json files with one.
async function importBackup(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  let data;
  try {
    data = JSON.parse(await file.text());
    if (!data || typeof data.recs !== 'object') throw new Error();
  } catch { alert('הקובץ הזה לא גיבוי של האפליקציה'); return; }
  const n = Object.keys(data.recs).length;
  if (!confirm(`לייבא ${n} רשומות מהקובץ? הן יחליפו את הקיימות.`)) return;
  // Bump timestamps so the imported state wins everywhere after the next sync.
  const now = Date.now();
  const bumped = Object.fromEntries(Object.entries(data.recs).map(([k, r]) => [k, { ...r, u: now }]));
  Store.replaceAll({ ...Store.recs, ...bumped });
  Sync.schedule(100);
  toast(`יובאו ${n} רשומות`);
}

// ---------- boot ----------
// Runs after every script (including google.js) has loaded.
window.addEventListener('DOMContentLoaded', () => {
  Store.load();
  seedData();
  // Data updates run after Drive's copy is pulled in (a sync hook), or right away when not syncing.
  Sync.hooks.unshift(async () => runMigrations());
  if (!Sync.connected) runMigrations();
  Store.onChange(() => render());
  $('#importFile').onchange = importBackup;
  $('#gradeFile').onchange = importGradeSheet;
  let shownTaskError = null;
  Sync.onStatus(state => {
    renderSyncBtn(state);
    if (currentView === 'settings' && document.activeElement?.id !== 'clientId') render();
    // Show (or clear) a Google Tasks problem on the tasks page once a sync finishes.
    if (currentView === 'tasks' && state !== 'syncing' && (Sync.hookError?.message !== shownTaskError || $('[data-gbar="sync"][disabled]'))) render();
    if (state !== 'syncing') shownTaskError = Sync.hookError?.message;
  });
  try { currentView = localStorage.getItem('pp_view') || 'map'; } catch {}
  if (!$(`#tabs [data-view="${currentView}"]`)) currentView = 'map';
  go(currentView);
  Sync.start();
  renderSyncBtn(Sync.state);
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
