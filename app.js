// ---------- helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toString();

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTH_NAMES = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
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
const semName = n => n === 0 ? 'בחירה / לא משובץ' : (SEMESTER_NAMES[n - 1] || `סמסטר ${n}`);

function isComplete(c) { return c && (c.status === 'done' || c.status === 'exempt'); }

function courseState(c) {
  if (c.status === 'done' || c.status === 'exempt' || c.status === 'active') return c.status;
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
  const views = { map: renderMap, tasks: renderTasks, calendar: renderCalendar, timetable: renderTimetable, settings: renderSettings };
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
    <div class="map-layout">
      <section class="panel map-panel">
        <div class="toolbar">
          <div class="legend">
            ${['locked', 'open', 'active', 'done'].map(k => `<span class="lg ${k}"><i></i>${STATUS[k].label}</span>`).join('')}
          </div>
          <button class="btn primary" id="addCourse">＋ הוסף קורס</button>
        </div>
        <p class="hint">לחץ על קורס כדי לסמן סטטוס, ציון ודרישות קדם. מעבר עכבר מדגיש את שרשרת הקדם.</p>
        <div class="semesters">${rows.join('')}</div>
      </section>
      <aside class="panel side-panel">${upcomingPanel()}</aside>
    </div>`;

  $('#addCourse').onclick = () => editCourse(null);
  $$('.course', root).forEach(el => {
    el.onclick = () => editCourse(el.dataset.code);
    el.onmouseenter = () => highlightChain(el.dataset.code, true);
    el.onmouseleave = () => highlightChain(el.dataset.code, false);
  });
  bindTaskList(root);
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
  return `
    <button class="course ${st}" data-code="${esc(c.code)}" type="button">
      <span class="c-name">${esc(c.name)}</span>
      <span class="c-meta">${esc(c.code)} · ${fmt(c.credits)} נק״ז</span>
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
}

function editCourse(code) {
  const c = code ? courseByCode(code) : { code: '', name: '', credits: 3, sem: 0, prereqs: [], status: 'none', grade: null, notes: '' };
  const nSem = settings().semesters || 8;
  const others = courses().filter(x => x.code !== code);
  const dependents = code ? others.filter(x => (x.prereqs || []).includes(code)) : [];
  let prereqs = [...(c.prereqs || [])];

  const statusBtns = [['none', 'רגיל'], ['active', 'בלימוד'], ['done', 'הושלם'], ['exempt', 'פטור']]
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
    </div>
    <div class="field"><span class="field-label">סטטוס</span><div class="seg">${statusBtns}</div></div>
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
      prereqs, notes: fd.get('notes'), type: c.type || 'elective',
    };
    if (data.grade !== null && data.status === 'none') data.status = 'done';
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

// ---------- calendar ----------
let calMonth = new Date(); calMonth.setDate(1);
function renderCalendar(root) {
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const start = new Date(y, m, 1 - new Date(y, m, 1).getDay());
  const today = ymd(new Date());
  const byDay = {};
  tasks().forEach(t => { if (t.due) (byDay[t.due.slice(0, 10)] ||= []).push(t); });

  const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
  const monthTasks = tasks().filter(t => (t.due || '').startsWith(monthKey));
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const key = ymd(d);
    const items = byDay[key] || [];
    cells += `
      <div class="cal-cell ${d.getMonth() !== m ? 'other' : ''} ${key === today ? 'today' : ''}" data-date="${key}">
        <span class="cal-num">${d.getDate()}</span>
        ${items.map(t => `<button type="button" class="cal-item t-${esc(t.type)} ${t.done ? 'done' : ''}" data-id="${esc(t.id)}" title="${esc(t.title)}">${(TASK_TYPES[t.type] || TASK_TYPES.other).icon} ${esc(t.title)}</button>`).join('')}
      </div>`;
  }
  root.innerHTML = `
    <section class="panel">
      <div class="toolbar">
        <h2>📅 ${MONTH_NAMES[m]} ${y}</h2>
        <div class="row">
          <button class="btn" id="calPrev" aria-label="חודש קודם">→</button>
          <button class="btn" id="calToday">היום</button>
          <button class="btn" id="calNext" aria-label="חודש הבא">←</button>
        </div>
      </div>
      <p class="hint">לחץ על יום כדי להוסיף משימה או מבחן.</p>
      <div class="cal-grid">
        ${DAY_NAMES.map(d => `<div class="cal-head">${d}</div>`).join('')}
        ${cells}
      </div>
      ${monthTasks.length ? `<h3>החודש</h3><ul class="task-list">${monthTasks.map(taskItem).join('')}</ul>` : ''}
    </section>`;
  bindTaskList(root);
  $('#calPrev').onclick = () => { calMonth = new Date(y, m - 1, 1); render(); };
  $('#calNext').onclick = () => { calMonth = new Date(y, m + 1, 1); render(); };
  $('#calToday').onclick = () => { calMonth = new Date(); calMonth.setDate(1); render(); };
  $$('.cal-cell', root).forEach(cell => cell.onclick = e => {
    const item = e.target.closest('.cal-item');
    if (item) editTask(item.dataset.id);
    else editTask(null, { due: cell.dataset.date });
  });
}

// ---------- timetable ----------
const TT_START = 8, TT_END = 21, TT_ORIGIN = TT_START * 60 + 30; // rows start at :30, Technion-style
const toMin = s => { const [h, mm] = (s || '0:0').split(':').map(Number); return h * 60 + mm; };
const slots = () => Store.list('slot');

function slotColor(key) {
  let h = 0;
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function renderTimetable(root) {
  const all = slots();
  const days = all.some(s => +s.day === 5) ? 6 : 5;
  const hours = [];
  for (let h = TT_START; h < TT_END; h++) hours.push(h);
  const total = (TT_END - TT_START) * 60;
  const todayIdx = new Date().getDay();

  const cols = Array.from({ length: days }, (_, d) => {
    const items = all.filter(s => +s.day === d).map(s => {
      const top = (toMin(s.start) - TT_ORIGIN) / total * 100;
      const height = (toMin(s.end) - toMin(s.start)) / total * 100;
      const title = s.course ? courseLabel(s.course) : s.title;
      return `<button type="button" class="slot" data-id="${esc(s.id)}" style="top:${top}%;height:${height}%;--h:${slotColor(s.course || s.title)}">
        <b>${esc(title)}</b><small>${esc(s.stype)} · <span dir="ltr">${esc(s.start)}–${esc(s.end)}</span></small>${s.room ? `<small>${esc(s.room)}</small>` : ''}
      </button>`;
    }).join('');
    return `<div class="tt-col ${d === todayIdx ? 'today' : ''}" data-day="${d}"><div class="tt-head">${DAY_NAMES[d]}</div><div class="tt-body">${hours.map(() => '<div class="tt-hour"></div>').join('')}${items}</div></div>`;
  }).join('');

  const todays = all.filter(s => +s.day === todayIdx).sort((a, b) => toMin(a.start) - toMin(b.start));

  root.innerHTML = `
    <section class="panel">
      <div class="toolbar">
        <h2>🕒 מערכת שעות</h2>
        <button class="btn primary" id="addSlot">＋ הוסף שיעור</button>
      </div>
      ${todays.length ? `<div class="today-strip"><b>היום:</b> ${todays.map(s => `<span class="chip">${esc(s.start)} ${esc(s.course ? courseLabel(s.course) : s.title)} · ${esc(s.stype)}</span>`).join('')}</div>` : ''}
      <div class="tt-scroll">
        <div class="tt" style="--days:${days}">
          <div class="tt-times"><div class="tt-head"></div><div class="tt-body">${hours.map(h => `<div class="tt-hour"><span>${String(h).padStart(2, '0')}:30</span></div>`).join('')}</div></div>
          ${cols}
        </div>
      </div>
      <p class="hint">לחץ על משבצת ריקה כדי להוסיף שיעור ביום הזה.</p>
    </section>`;

  $('#addSlot').onclick = () => editSlot(null);
  $$('.slot', root).forEach(el => el.onclick = e => { e.stopPropagation(); editSlot(el.dataset.id); });
  $$('.tt-col .tt-body', root).forEach(body => body.onclick = e => {
    const rect = body.getBoundingClientRect();
    const mins = TT_ORIGIN + Math.floor(((e.clientY - rect.top) / rect.height) * total / 60) * 60;
    const hh = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    editSlot(null, { day: +body.parentElement.dataset.day, start: hh(mins), end: hh(mins + 120) });
  });
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
      <label>Google OAuth Client ID
        <input id="clientId" dir="ltr" placeholder="xxxxxxxx.apps.googleusercontent.com" value="${esc(Sync.clientId)}">
      </label>
      <div class="row wrap">
        ${Sync.connected
          ? `<button class="btn primary" id="syncNow">🔄 סנכרן עכשיו</button><button class="btn" id="reconnect">התחבר מחדש</button><button class="btn danger" id="disconnect">התנתק</button>`
          : `<button class="btn primary" id="connect">🔗 התחבר ל-Google</button>`}
      </div>
      ${!isHttps ? '<p class="warn">⚠️ הסנכרון עובד רק כשהאפליקציה מוגשת מכתובת https (למשל GitHub Pages).</p>' : ''}
      <details>
        <summary>איך משיגים Client ID? (חד פעמי, 5 דקות)</summary>
        <ol class="howto">
          <li>היכנס ל-<a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener">Google Cloud Console</a> וצור פרויקט חדש.</li>
          <li>תחת <b>APIs &amp; Services → Library</b> הפעל את <b>Google Drive API</b>.</li>
          <li>תחת <b>OAuth consent screen</b>: בחר External, מלא שם ומייל, והוסף את עצמך ב-<b>Test users</b>. אחרי זה לחץ <b>Publish app</b> כדי שהחיבור לא יפוג כל 7 ימים.</li>
          <li>תחת <b>Credentials → Create credentials → OAuth client ID</b>: בחר <b>Web application</b>.</li>
          <li>ב-<b>Authorized JavaScript origins</b> הוסף: <code dir="ltr">${esc(location.origin)}</code></li>
          <li>ב-<b>Authorized redirect URIs</b> הוסף: <code dir="ltr">${esc(Sync.redirectUri())}</code></li>
          <li>העתק את ה-Client ID לכאן ולחץ "התחבר". חזור על החיבור פעם אחת בכל מכשיר.</li>
        </ol>
      </details>
    </section>

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
        <label class="btn file-btn">⬆️ ייבוא מקובץ<input type="file" id="importFile" accept="application/json,.json" hidden></label>
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
  $('#importFile').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.recs) throw new Error();
      if (!confirm('לייבא את הגיבוי? רשומות חדשות יותר בגיבוי יחליפו את הקיימות.')) return;
      // Bump timestamps so the imported state wins everywhere after the next sync.
      const now = Date.now();
      const bumped = Object.fromEntries(Object.entries(data.recs).map(([k, r]) => [k, { ...r, u: now }]));
      Store.replaceAll({ ...Store.recs, ...bumped });
      Sync.schedule(100);
      toast('הגיבוי יובא');
    } catch { alert('קובץ לא תקין'); }
  };
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

// ---------- boot ----------
Store.load();
seedData();
Store.onChange(() => render());
Sync.onStatus(state => {
  renderSyncBtn(state);
  if (currentView === 'settings' && document.activeElement?.id !== 'clientId') render();
});
try { currentView = localStorage.getItem('pp_view') || 'map'; } catch {}
go(currentView);
Sync.start();
renderSyncBtn(Sync.state);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
