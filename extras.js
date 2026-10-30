// Tools modelled on Semestero ME: command palette, course comparator, semester manager (with summer
// semesters), notifications drawer, rights FAQ, exam calendar, timetable generator and map export.
// Everything here is added on top of the other views; the header gets 🔍 🔔 🧰 buttons.

const DAY_IDX = { 'ראשון': 0, 'שני': 1, 'שלישי': 2, 'רביעי': 3, 'חמישי': 4, 'שישי': 5 };
const MS_DAY = 86400000;

// A wide, closable dialog built on the shared #modal.
function openWide(html, onReady) {
  const dlg = $('#modal');
  openModal(html, () => {}, onReady);
  dlg.classList.add('wide');
  dlg.addEventListener('close', () => dlg.classList.remove('wide'), { once: true });
}
const closeBtn = '<div class="actions"><span class="spacer"></span><button class="btn" value="cancel" formnovalidate>סגור</button></div>';

// ---------- CheeseFork helpers ----------
function parseCfDate(s) {
  const m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(String(s || '').trim());
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
}
const fmtDate = d => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
const daysBetween = (a, b) => Math.round((b - a) / MS_DAY);

// The course as published for the current semester (falls back to the newest data we have).
async function cfCourse(code) {
  try { await CF.load(cfSemesterKey(currentSemesterNumber())); } catch {}
  await CF.loadRecent();
  const cur = CF.data[cfSemesterKey(currentSemesterNumber())]?.get(toCode8(code));
  return cur || CF.find(code)?.course || null;
}

// {type: {group: [{day, s, e, room, who}]}}
function cfGroups(course) {
  const out = {};
  for (const r of course?.schedule || []) {
    const [a, b] = String(r['שעה']).split('-').map(x => x.trim());
    const day = DAY_IDX[r['יום']];
    if (day === undefined || !a || !b) continue;
    ((out[r['סוג']] ||= {})[r['קבוצה']] ||= []).push({
      day, s: toMin(a), e: toMin(b), start: a.padStart(5, '0'), end: b.padStart(5, '0'),
      room: [r['בניין'], r['חדר']].filter(Boolean).join(' '), who: r['מרצה/מתרגל'] || '',
    });
  }
  return out;
}
const clash = (A, B) => A.some(a => B.some(b => a.day === b.day && a.s < b.e && b.s < a.e));

// ---------- semester manager ----------
function openSemesterManager() {
  const st = settings();
  const ids = semIds();
  const n = Math.max(st.semesters || 8, ...courses().map(c => (c.sem > 100 ? 0 : c.sem) || 0));
  const count = id => courses().filter(c => c.sem === id).length;
  const summers = new Set(ids.filter(i => i > 100).map(i => i - 100));
  openWide(`
    <h2>🗓️ ניהול סמסטרים</h2>
    <p class="muted">הוסף סמסטרים לתוכנית (עד 14) או סמסטר קיץ אחרי כל סמסטר אביב. אפשר להסיר רק סמסטר ריק.</p>
    <div class="sem-mgr">
      ${ids.map(id => `<div class="sem-mgr-row ${id > 100 ? 'summer' : ''}">
        <b>${id > 100 ? '☀️ קיץ' : `סמסטר ${id}`}</b><span class="muted">${esc(semesterYearLabel(id))}</span>
        <span>${count(id)} קורסים</span></div>`).join('')}
    </div>
    <div class="seg wrap" style="margin-top:12px">
      <button class="btn" type="button" id="smAdd" ${n >= 14 ? 'disabled' : ''}>➕ הוסף סמסטר</button>
      <button class="btn" type="button" id="smRem" ${n <= 1 || count(n) ? 'disabled' : ''}>➖ הסר את סמסטר ${n}</button>
    </div>
    <h3 style="margin-top:16px">☀️ סמסטרי קיץ</h3>
    <div class="chips">${Array.from({ length: Math.floor(n / 2) }, (_, i) => (i + 1) * 2).map(s => {
      const on = summers.has(s), locked = on && count(100 + s) > 0;
      return `<label class="chip"><input type="checkbox" data-summer="${s}" ${on ? 'checked' : ''} ${locked ? 'disabled' : ''}>
        אחרי סמסטר ${s}${locked ? ' (יש קורסים)' : ''}</label>`;
    }).join('') || '<span class="muted">אין עדיין סמסטר אביב בתוכנית.</span>'}</div>
    ${closeBtn}`, form => {
    const reopen = () => { $('#modal').close(); setTimeout(openSemesterManager, 30); };
    $('#smAdd', form).onclick = () => { Store.put('meta', 'settings', { semesters: n + 1 }); reopen(); };
    $('#smRem', form).onclick = () => { Store.put('meta', 'settings', { semesters: n - 1, summers: (st.summers || []).filter(s => s <= n - 1) }); reopen(); };
    $$('[data-summer]', form).forEach(cb => cb.onchange = () => {
      const s = +cb.dataset.summer, cur = new Set(st.summers || []);
      cb.checked ? cur.add(s) : cur.delete(s);
      Store.put('meta', 'settings', { summers: [...cur] });
      reopen();
    });
  });
}

// ---------- course comparator ----------
let cmpPick = ['', '', ''];

function comparablePool() {
  const inPlan = courses().map(c => ({ code: c.code, name: c.name, credits: c.credits, list: courseCat(c), plan: true }));
  const have = new Set(inPlan.map(c => c.code));
  const rest = ELECTIVES.filter(e => !have.has(e[0])).map(([code, name, credits, list]) => ({ code, name, credits, list, plan: false }));
  return [...inPlan, ...rest];
}

async function openComparator(preset) {
  if (preset) cmpPick = [preset, ...cmpPick.filter(c => c && c !== preset)].concat(['', '', '']).slice(0, 3);
  const pool = comparablePool();
  const info = await Promise.all(cmpPick.map(async c => {
    if (!c) return null;
    const crs = await cfCourse(c);
    return { code: c, pool: pool.find(p => p.code === c), cf: crs, g: crs?.general || {}, groups: cfGroups(crs) };
  }));
  const opt = sel => `<option value="">— בחר קורס —</option>
    <optgroup label="בתוכנית שלי">${pool.filter(p => p.plan).map(p => `<option value="${esc(p.code)}" ${p.code === sel ? 'selected' : ''}>${esc(p.name)} (${esc(p.code)})</option>`).join('')}</optgroup>
    <optgroup label="קורסי בחירה">${pool.filter(p => !p.plan).map(p => `<option value="${esc(p.code)}" ${p.code === sel ? 'selected' : ''}>${esc(p.name)} (${esc(p.code)})</option>`).join('')}</optgroup>`;
  const chosen = info.filter(Boolean);
  const check = doneCode8Check();
  const examOf = (i, k) => parseCfDate(i.g[k]);
  const row = (label, fn) => `<tr><th>${label}</th>${info.map(i => `<td>${i ? fn(i) : ''}</td>`).join('')}</tr>`;

  // Conflicts between the chosen courses: same exam day, or no lecture-group pair without overlap.
  const notes = [];
  for (let a = 0; a < chosen.length; a++) for (let b = a + 1; b < chosen.length; b++) {
    const A = chosen[a], B = chosen[b];
    for (const [k, l] of [['מועד א', 'מועד א׳'], ['מועד ב', 'מועד ב׳']]) {
      const da = examOf(A, k), db = examOf(B, k);
      if (da && db && +da === +db) notes.push(`⚠️ ${l}: ${A.pool?.name} ו-${B.pool?.name} באותו יום (${fmtDate(da)})`);
      else if (da && db && Math.abs(daysBetween(da, db)) <= 1) notes.push(`⚠️ ${l}: ${A.pool?.name} ו-${B.pool?.name} ברצף של יום אחד`);
    }
    const typesA = Object.keys(A.groups), typesB = Object.keys(B.groups);
    if (typesA.length && typesB.length) {
      const allA = Object.values(A.groups).flatMap(t => Object.values(t)), allB = Object.values(B.groups).flatMap(t => Object.values(t));
      const lecA = Object.values(A.groups['הרצאה'] || {}), lecB = Object.values(B.groups['הרצאה'] || {});
      const free = lecA.length && lecB.length ? lecA.some(x => lecB.some(y => !clash(x, y))) : allA.some(x => allB.some(y => !clash(x, y)));
      notes.push(free ? `✅ ${A.pool?.name} + ${B.pool?.name}: אפשר לשלב בלי התנגשות בהרצאות` : `❌ ${A.pool?.name} + ${B.pool?.name}: כל קבוצות ההרצאה מתנגשות`);
    }
  }

  openWide(`
    <h2>⚖️ השוואת קורסים</h2>
    <p class="muted">בחר עד שלושה קורסים ליד זה. הנתונים מ-CheeseFork לסמסטר הנוכחי (או האחרון שפורסם).</p>
    <div class="cmp-pick">${cmpPick.map((s, i) => `<select data-cmp="${i}">${opt(s)}</select>`).join('')}</div>
    ${chosen.length ? `<div class="tbl-wrap"><table class="cmp">
      ${row('קורס', i => `<b>${esc(i.pool?.name || i.code)}</b><br><small class="muted">${esc(i.code)}</small>`)}
      ${row('נק״ז', i => fmt(i.pool?.credits ?? 0))}
      ${row('קטגוריה', i => { const l = LISTS[i.pool?.list]; return l ? `<span class="lbadge" style="--lc:${l.color}">${esc(l.name)}</span>` : 'חובה'; })}
      ${row('בתוכנית', i => { const c = courseByCode(i.code); return c ? `${STATUS[courseState(c)].icon} ${STATUS[courseState(c)].label}${c.sem ? ` · ${esc(semName(c.sem))}` : ''}` : 'לא'; })}
      ${row('נפתח', i => CF.offeredIn(i.code).sort().map(cfKeyLabel).map(esc).join(', ') || '<span class="muted">לא נמצא</span>')}
      ${row('דרישות קדם', i => { const ok = evalPrereqs(i.g['מקצועות קדם'], check).ok; return `${prereqHtml(i.g['מקצועות קדם'])}${i.g['מקצועות קדם'] ? `<br>${ok ? '<span class="ok-t">✓ מולאו</span>' : '<span class="bad-t">חסרות</span>'}` : ''}`; })}
      ${row('מועד א׳', i => i.g['מועד א'] ? esc(i.g['מועד א'].replace(/-/g, '.')) : '<span class="muted">—</span>')}
      ${row('מועד ב׳', i => i.g['מועד ב'] ? esc(i.g['מועד ב'].replace(/-/g, '.')) : '<span class="muted">—</span>')}
      ${row('אחראי', i => esc(i.g['אחראים'] || '—'))}
      ${row('קבוצות', i => Object.entries(i.groups).map(([t, gs]) => `${esc(t)}: ${Object.keys(gs).length}`).join('<br>') || '<span class="muted">—</span>')}
      ${row('סילבוס', i => i.g['סילבוס'] ? `<small>${esc(String(i.g['סילבוס']).slice(0, 260))}…</small>` : '<span class="muted">—</span>')}
    </table></div>` : '<p class="empty">בחר קורס כדי להתחיל.</p>'}
    ${notes.length ? `<div class="cmp-notes">${notes.map(n => `<p>${n}</p>`).join('')}</div>` : ''}
    ${closeBtn}`, form => {
    $$('[data-cmp]', form).forEach(sel => sel.onchange = () => {
      cmpPick[+sel.dataset.cmp] = sel.value;
      $('#modal').close();
      setTimeout(openComparator, 30);
    });
  });
}

// ---------- exam calendar ----------
async function openExamCalendar() {
  const cur = currentSemesterNumber();
  const mine = courses().filter(c => c.status === 'active' || (c.sem === cur && !isComplete(c)));
  const found = [];
  for (const c of mine) {
    const crs = await cfCourse(c.code);
    for (const [k, label] of [['מועד א', 'א׳'], ['מועד ב', 'ב׳']]) {
      const d = parseCfDate(crs?.general?.[k]);
      if (d) found.push({ code: c.code, name: c.name, moed: label, date: d });
    }
  }
  // Exam tasks you added by hand count too.
  for (const t of Store.list('task').filter(t => t.type === 'exam' && t.due && !t.done)) {
    const d = new Date(t.due.slice(0, 10) + 'T00:00');
    if (!found.some(f => f.code === t.course && +f.date === +d)) found.push({ code: t.course, name: t.course ? courseLabel(t.course) : t.title, moed: '', date: d, manual: true });
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const section = (title, list) => {
    list.sort((a, b) => a.date - b.date);
    if (!list.length) return `<h3>${title}</h3><p class="muted">אין מועדים.</p>`;
    return `<h3>${title}</h3><div class="exam-list">${list.map((e, i) => {
      const gap = i ? daysBetween(list[i - 1].date, e.date) : null;
      const left = daysBetween(today, e.date);
      return `${gap !== null ? `<div class="gap ${gap <= 2 ? 'tight' : gap <= 4 ? 'mid' : 'ok'}"><span>${gap === 0 ? 'באותו יום!' : `${gap} ימים`}</span></div>` : ''}
        <div class="exam-row ${left < 0 ? 'past' : ''}"><b>${fmtDate(e.date)}</b><span>${DAY_NAMES[e.date.getDay()]}</span>
          <span class="grow">${esc(e.name)}${e.moed ? ` <small class="muted">מועד ${e.moed}</small>` : ''}</span>
          <small class="muted">${left < 0 ? 'עבר' : left === 0 ? 'היום' : `בעוד ${left} ימים`}</small></div>`;
    }).join('')}</div>`;
  };
  const a = found.filter(f => f.moed === 'א׳' || f.manual), b = found.filter(f => f.moed === 'ב׳');
  openWide(`
    <h2>📅 לוח מבחנים ומרווחים</h2>
    <p class="muted">קורסי הסמסטר שלך (${mine.length}). המספרים בין מבחנים הם ימי למידה: אדום = עד יומיים, כתום = 3–4, ירוק = 5+. מועדים מ-CheeseFork וממשימות מסוג מבחן.</p>
    ${found.length ? section('מועד א׳', a) + section('מועד ב׳', b) : '<p class="empty">עוד לא פורסמו מועדים לקורסים שלך. אם הקורסים לא מסומנים "בלימוד" – סמן אותם בתוכנית.</p>'}
    ${closeBtn}`);
}

// ---------- timetable generator ----------
let genOpts = { avoid: [], earliest: 0 };

async function openTimetableGenerator() {
  const cur = currentSemesterNumber();
  const cand = courses().filter(c => !isComplete(c) && (c.status === 'active' || c.sem === cur));
  const info = {};
  for (const c of cand) info[c.code] = cfGroups(await cfCourse(c.code));
  openWide(`
    <h2>✨ מחולל מערכות שעות</h2>
    <p class="muted">בוחר קבוצה אחת מכל סוג (הרצאה / תרגול / מעבדה) לכל קורס ומציג את השילובים בלי התנגשויות. CheeseFork לא מציין איזה תרגול שייך לאיזו הרצאה, אז בדוק את השיבוץ מול המערכת הרשמית.</p>
    <div class="chips gen-courses">${cand.map(c => `<label class="chip"><input type="checkbox" data-gc="${esc(c.code)}" ${Object.keys(info[c.code]).length ? 'checked' : 'disabled'}> ${esc(c.name)}${Object.keys(info[c.code]).length ? '' : ' (אין מערכת)'}</label>`).join('') || '<span class="muted">אין קורסים בלימוד בסמסטר הנוכחי.</span>'}</div>
    <div class="grid2" style="margin-top:10px">
      <div><span class="field-label">ימים חופשיים (בלי לימודים)</span>
        <div class="chips">${[0, 1, 2, 3, 4].map(d => `<label class="chip"><input type="checkbox" data-avoid="${d}" ${genOpts.avoid.includes(d) ? 'checked' : ''}> ${DAY_NAMES[d]}</label>`).join('')}</div></div>
      <label>לא להתחיל לפני<select id="genEarly">${[0, 8, 9, 10].map(h => `<option value="${h}" ${genOpts.earliest === h ? 'selected' : ''}>${h ? `${h}:00` : 'ללא הגבלה'}</option>`).join('')}</select></label>
    </div>
    <div class="actions"><button class="btn primary" type="button" id="genGo">חשב שילובים</button></div>
    <div id="genOut"></div>
    ${closeBtn}`, form => {
    $('#genGo', form).onclick = () => {
      genOpts = { avoid: $$('[data-avoid]:checked', form).map(x => +x.dataset.avoid), earliest: +$('#genEarly', form).value };
      const codes = $$('[data-gc]:checked', form).map(x => x.dataset.gc);
      showGeneratorResults(form, codes, info);
    };
  });
}

function generateTimetables(codes, info) {
  // One pick per (course, type); each pick is a list of meetings.
  const picks = codes.flatMap(code => Object.entries(info[code]).map(([type, groups]) => ({
    code, type,
    options: Object.entries(groups).filter(([, ms]) => ms.every(m => !genOpts.avoid.includes(m.day) && m.s >= genOpts.earliest * 60))
      .map(([name, ms]) => ({ code, type, name, ms })),
  })));
  if (picks.some(p => !p.options.length)) return { results: [], empty: picks.find(p => !p.options.length) };
  picks.sort((a, b) => a.options.length - b.options.length);
  const results = [];
  let nodes = 0;
  const chosen = [];
  const rec = i => {
    if (results.length >= 400 || nodes++ > 60000) return;
    if (i === picks.length) { results.push([...chosen]); return; }
    for (const o of picks[i].options) {
      if (chosen.some(c => clash(c.ms, o.ms))) continue;
      chosen.push(o); rec(i + 1); chosen.pop();
    }
  };
  rec(0);
  const score = r => {
    const all = r.flatMap(o => o.ms);
    const days = new Set(all.map(m => m.day));
    let gaps = 0;
    for (const d of days) {
      const day = all.filter(m => m.day === d).sort((a, b) => a.s - b.s);
      for (let i = 1; i < day.length; i++) gaps += Math.max(0, day[i].s - day[i - 1].e);
    }
    return { days: days.size, gaps, r };
  };
  return { results: results.map(score).sort((a, b) => a.days - b.days || a.gaps - b.gaps).slice(0, 8), total: results.length, capped: nodes > 60000 || results.length >= 400 };
}

function miniGrid(r) {
  const all = r.flatMap(o => o.ms.map(m => ({ ...m, o })));
  const lo = Math.min(...all.map(m => m.s)), hi = Math.max(...all.map(m => m.e)), span = Math.max(60, hi - lo);
  return `<div class="mini-tt">${[0, 1, 2, 3, 4].map(d => `<div class="mt-day"><small>${DAY_NAMES[d].slice(0, 3)}</small><div class="mt-col">
    ${all.filter(m => m.day === d).map(m => `<i style="top:${((m.s - lo) / span * 100).toFixed(1)}%;height:${((m.e - m.s) / span * 100).toFixed(1)}%;--h:${slotColor(m.o.code)}" title="${esc(courseLabel(m.o.code))} · ${esc(m.o.type)} ${esc(m.o.name)} · ${m.start}-${m.end}"></i>`).join('')}</div></div>`).join('')}</div>`;
}

function showGeneratorResults(form, codes, info) {
  const out = $('#genOut', form);
  if (!codes.length) { out.innerHTML = '<p class="muted">בחר לפחות קורס אחד.</p>'; return; }
  const { results, total, empty, capped } = generateTimetables(codes, info);
  if (empty) { out.innerHTML = `<p class="bad-t">ל-${esc(courseLabel(empty.code))} (${esc(empty.type)}) אין קבוצה שמתאימה להגבלות.</p>`; return; }
  if (!results.length) { out.innerHTML = '<p class="bad-t">אין שילוב בלי התנגשויות. נסה להוריד קורס או להקל בהגבלות.</p>'; return; }
  out.innerHTML = `<p class="muted">${capped ? 'יותר מ-' : ''}${total} שילובים אפשריים; הנה ${results.length} הטובים ביותר (פחות ימים, פחות חורים):</p>
    <div class="gen-results">${results.map((x, i) => `<div class="gen-card">
      <div><b>אפשרות ${i + 1}</b> · ${x.days} ימים · חורים ${Math.floor(x.gaps / 60)}:${String(x.gaps % 60).padStart(2, '0')} שעות</div>
      ${miniGrid(x.r)}
      <small class="muted">${x.r.map(o => `${esc(courseLabel(o.code))} ${esc(o.type)} ${esc(o.name)}`).join(' · ')}</small>
      <button class="btn small primary" type="button" data-use="${i}">השתמש במערכת הזו</button></div>`).join('')}</div>`;
  $$('[data-use]', out).forEach(b => b.onclick = () => {
    const pick = results[+b.dataset.use].r;
    if (!confirm('להחליף את השיעורים הקיימים של הקורסים האלה במערכת השעות?')) return;
    const set = new Set(codes);
    slots().filter(s => set.has(s.course)).forEach(s => Store.remove('slot', s.id));
    for (const o of pick) for (const m of o.ms) {
      Store.put('slot', uid(), { course: o.code, title: '', stype: o.type, day: m.day, start: m.start, end: m.end, room: m.room });
    }
    toast('המערכת נשמרה');
    $('#modal').close();
    go('timetable');
  });
}

// ---------- notifications drawer ----------
const NOTIF_LS = 'pp_desktop_notif';

function notifData() {
  const now = new Date(), today = new Date(); today.setHours(0, 0, 0, 0);
  const todaySlots = slots().filter(s => +s.day === now.getDay()).sort((a, b) => toMin(a.start) - toMin(b.start));
  const open = Store.list('task').filter(t => !t.done && t.due);
  const withDays = open.map(t => ({ t, days: daysBetween(today, new Date(t.due.slice(0, 10) + 'T00:00')) }));
  const urgent = withDays.filter(x => x.days <= 3).sort((a, b) => a.days - b.days);
  const exams = withDays.filter(x => x.t.type === 'exam' && x.days >= 0 && x.days <= 14).sort((a, b) => a.days - b.days);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return { todaySlots, urgent, exams, left: todaySlots.filter(s => toMin(s.end) > nowMin).length };
}

function updateBell() {
  const b = $('#xBell .badge');
  if (!b) return;
  const n = notifData().urgent.length;
  b.textContent = n || '';
  b.hidden = !n;
}

function openNotifications() {
  const d = notifData();
  const enabled = lsGet(NOTIF_LS) === '1' && window.Notification?.permission === 'granted';
  const dueLabel = days => days < 0 ? `באיחור ${-days} ימים` : days === 0 ? 'היום' : days === 1 ? 'מחר' : `בעוד ${days} ימים`;
  openWide(`
    <h2>🔔 עדכונים והתראות</h2>
    <div class="notif-sec"><h3>🕒 השיעורים של היום (${DAY_NAMES[new Date().getDay()]})</h3>
      ${d.todaySlots.length ? d.todaySlots.map(s => `<div class="notif-row"><b dir="ltr">${esc(s.start)}–${esc(s.end)}</b>
        <span class="grow">${esc(s.course ? courseLabel(s.course) : s.title)} <small class="muted">${esc(s.stype || '')}</small></span><small class="muted">${esc(s.room || '')}</small></div>`).join('')
        : '<p class="muted">אין שיעורים במערכת להיום.</p>'}</div>
    <div class="notif-sec"><h3>🚨 משימות דחופות (עד 3 ימים)</h3>
      ${d.urgent.length ? d.urgent.map(x => `<div class="notif-row ${x.days < 0 ? 'late' : ''}" data-task="${esc(x.t.id)}"><span class="grow">${(TASK_TYPES[x.t.type] || TASK_TYPES.other).icon} ${esc(x.t.title)}${x.t.course ? ` <small class="muted">${esc(courseLabel(x.t.course))}</small>` : ''}</span><small>${dueLabel(x.days)}</small></div>`).join('')
        : '<p class="muted">אין משימות דחופות 🎉</p>'}</div>
    <div class="notif-sec"><h3>🎯 מבחנים בשבועיים הקרובים</h3>
      ${d.exams.length ? d.exams.map(x => `<div class="notif-row"><span class="grow">${esc(x.t.title)}</span><small>${dueLabel(x.days)}</small></div>`).join('') : '<p class="muted">אין מבחנים קרובים.</p>'}</div>
    <div class="notif-sec"><h3>⏰ תזכורת 10 דקות לפני שיעור</h3>
      <label class="check"><input type="checkbox" id="notifToggle" ${enabled ? 'checked' : ''} ${window.Notification ? '' : 'disabled'}> התראה במכשיר הזה</label>
      <p class="muted">עובדת רק כשהאפליקציה פתוחה (דפדפן או PWA פתוחים ברקע). להתראות כשהאפליקציה סגורה השתמש ב-Instinct ב-WhatsApp.</p></div>
    ${closeBtn}`, form => {
    $$('[data-task]', form).forEach(r => r.onclick = () => { $('#modal').close(); setTimeout(() => editTask(r.dataset.task), 30); });
    $('#notifToggle', form).onchange = async e => {
      if (e.target.checked) {
        const p = await Notification.requestPermission();
        if (p !== 'granted') { e.target.checked = false; toast('ההרשאה נדחתה בדפדפן'); return; }
        lsSet(NOTIF_LS, '1'); toast('התראות הופעלו');
      } else lsSet(NOTIF_LS, null);
    };
  });
}

// Fires once per class per day, 10 minutes ahead, while the app is open.
const firedNotif = new Set();
setInterval(() => {
  if (lsGet(NOTIF_LS) !== '1' || window.Notification?.permission !== 'granted') return;
  const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
  for (const s of slots()) {
    const diff = toMin(s.start) - nowMin;
    const key = `${ymd(now)}-${s.id}`;
    if (+s.day === now.getDay() && diff > 0 && diff <= 10 && !firedNotif.has(key)) {
      firedNotif.add(key);
      new Notification(`${s.course ? courseLabel(s.course) : s.title} בעוד ${diff} דקות`, { body: `${s.stype || ''} ${s.room || ''}`.trim(), icon: 'icons/icon-192.png' });
    }
  }
}, 30000);

// ---------- rights FAQ ----------
function openFaq() {
  const R = typeof RESERVE !== 'undefined' ? RESERVE : null;
  const qa = [
    ['איך מחושב הממוצע?', `ממוצע משוקלל לפי נק״ז: סכום (ציון × נק״ז) חלקי סך הנק״ז המדורגות. קורסים עם עובר בינארי ופטורים נספרים בנק״ז לתואר אבל לא נכנסים לממוצע.`],
    ['מה סף ההצטיינות?', `דיקן: ממוצע ${HONORS.dean}+, נשיא: ${HONORS.president}+, בסמסטר עם לפחות ${HONORS.minCredits} נק״ז מדורגות. אפשר לראות את התחזית בטאב "ביצועים".`],
    ['מה נדרש לתואר במכונות?', `${DEGREE_RULES.total} נק״ז: ${DEGREE_RULES.mandatory} חובה, ${DEGREE_RULES.electives} בחירה מתקדמת מרשימות א׳–ה׳ (לפחות ${DEGREE_RULES.minCourses.A} מרשימה א׳, ${DEGREE_RULES.minCourses.D} מד׳, ${DEGREE_RULES.minCourses.B} מב׳, ${DEGREE_RULES.minCourses.C} מג׳, ויחד ב׳+ג׳+ד׳ לפחות ${DEGREE_RULES.minBCD} נק״ז), פרויקט גמר ${DEGREE_RULES.project}, מל״ג ${DEGREE_RULES.malag}, כלל טכניוני ${DEGREE_RULES.general} וחינוך גופני ${DEGREE_RULES.sports}.`],
    ...(R ? [
      ['מהו עובר בינארי (מילואים)?', `קורס שעבר בציון ${R.binaryMinGrade}+ נשאר עם הנק״ז אבל הציון יוצא מהממוצע. מכסה לפי קבוצת המילואים בשנה, עד ${R.binaryMaxDegree} קורסים בתואר ועד ${R.binaryMaxShare * 100}% מנק״ז התואר. ההמרה מוגשת במערכת הטכניון; האפליקציה רק מחשבת אותה.`],
      ['לאיזו קבוצת מילואים אני שייך?', Object.entries(R.groups).map(([g, t]) => `קבוצה ${g}: ${t}`).join('\n')],
      ['פטור מנק״ז והארכת לימודים', `פטור מנק״ז: ${Object.entries(R.creditExemption).map(([g, n]) => `קבוצה ${g} – עד ${n}`).join(', ')} (בחירה/כלליים). הארכת לימודים: ${Object.entries(R.extensions).map(([g, t]) => `קבוצה ${g}: ${t}`).join('; ')}.`],
      ['מועדים מיוחדים והתאמות', 'מועד מיוחד למבחן שהוחמץ בגלל שירות, תוספת זמן של 25%, הארכת הגשות לפי ימי השירות ומטלה חלופית בשירות ארוך. פירוט מלא וההתאמות לפי הקבוצה שלך בטאב תכנון תואר ← מילואים.'],
      ['סמסטר קיץ ושכר לימוד', 'פטור משכר לימוד לקורס אחד עם 22+ ימי שירות בשנה, ולשני קורסים עם 30+.'],
    ] : []),
    ['מה זה סמסטר קיץ בתוכנית?', 'אפשר להוסיף סמסטר קיץ אחרי כל סמסטר אביב דרך 🧰 ← ניהול סמסטרים, ולשבץ אליו קורסים כמו לכל סמסטר אחר.'],
  ];
  openWide(`
    <h2>📖 זכויות ושאלות נפוצות</h2>
    <p class="muted">מידע כללי שנאסף ממקורות הטכניון והפקולטה. תמיד לאמת מול הפקולטה לפני החלטה.</p>
    <div class="faq">${qa.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a).replace(/\n/g, '<br>')}</p></details>`).join('')}</div>
    <div class="link-row">
      <a class="btn small" href="https://ugportal.technion.ac.il" target="_blank" rel="noopener">פורטל הסטודנטים</a>
      <a class="btn small" href="https://students.technion.ac.il" target="_blank" rel="noopener">students.technion</a>
      ${R ? `<a class="btn small" href="mailto:${R.email}">רכזת מילואים</a>` : ''}
    </div>
    <div class="actions"><button class="btn" type="button" id="faqRes">🎖️ למילואים בתכנון תואר</button><span class="spacer"></span><button class="btn" value="cancel" formnovalidate>סגור</button></div>`, form => {
    $('#faqRes', form).onclick = () => { $('#modal').close(); plannerTab = 'reserve'; go('planner'); };
  });
}

// ---------- command palette (Ctrl+K) ----------
let palette;
function openPalette() {
  if (!palette) {
    palette = document.createElement('dialog');
    palette.id = 'xPalette';
    palette.innerHTML = '<input id="xpInput" placeholder="חפש קורס, משימה או פעולה…" autocomplete="off"><div id="xpList" role="listbox"></div>';
    document.body.appendChild(palette);
    palette.addEventListener('click', e => { if (e.target === palette) palette.close(); });
  }
  const input = $('#xpInput', palette), list = $('#xpList', palette);
  let items = [], sel = 0;
  const base = () => [
    ...$$('#tabs button').map(b => ({ icon: b.firstElementChild?.textContent || '▫️', label: b.textContent.trim(), hint: 'מעבר ללשונית', run: () => go(b.dataset.view) })),
    { icon: '⚖️', label: 'השוואת קורסים', hint: 'פעולה', run: () => openComparator() },
    { icon: '📅', label: 'לוח מבחנים ומרווחים', hint: 'פעולה', run: openExamCalendar },
    { icon: '✨', label: 'מחולל מערכות שעות', hint: 'פעולה', run: openTimetableGenerator },
    { icon: '🗓️', label: 'ניהול סמסטרים וקיץ', hint: 'פעולה', run: openSemesterManager },
    { icon: '🔔', label: 'התראות', hint: 'פעולה', run: openNotifications },
    { icon: '📖', label: 'זכויות ושאלות נפוצות', hint: 'פעולה', run: openFaq },
    { icon: '📸', label: 'ייצוא מפת הקורסים כתמונה', hint: 'פעולה', run: exportMapPng },
    { icon: '🖨️', label: 'הדפסת התוכנית', hint: 'פעולה', run: printPlan },
  ];
  const search = q => {
    q = norm(q.trim());
    if (!q) return base();
    const out = base().filter(i => norm(i.label).includes(q));
    courses().filter(c => norm(c.name).includes(q) || c.code.includes(q)).slice(0, 8)
      .forEach(c => out.push({ icon: '🎓', label: c.name, hint: `${c.code} · ${fmt(c.credits)} נק״ז`, run: () => editCourse(c.code) }));
    const have = new Set(courses().map(c => c.code));
    ELECTIVES.filter(e => !have.has(e[0]) && (norm(e[1]).includes(q) || e[0].includes(q))).slice(0, 6)
      .forEach(e => out.push({ icon: '🧩', label: e[1], hint: `בחירה ${LISTS[e[3]].short} · ${e[0]}`, run: () => { catQuery = e[0]; catFilter = 'all'; plannerTab = 'catalog'; go('planner'); } }));
    Store.list('task').filter(t => norm(t.title).includes(q)).slice(0, 6)
      .forEach(t => out.push({ icon: '📝', label: t.title, hint: t.due ? t.due.slice(0, 10) : 'משימה', run: () => editTask(t.id) }));
    return out;
  };
  const draw = () => {
    list.innerHTML = items.length ? items.map((it, i) => `<div class="xp-item ${i === sel ? 'on' : ''}" data-i="${i}" role="option"><span>${it.icon}</span><b>${esc(it.label)}</b><small class="muted">${esc(it.hint)}</small></div>`).join('')
      : '<p class="muted" style="padding:14px">לא נמצא כלום.</p>';
    $('.xp-item.on', list)?.scrollIntoView({ block: 'nearest' });
  };
  const choose = i => { const it = items[i]; if (!it) return; palette.close(); setTimeout(it.run, 30); };
  input.value = '';
  items = search(''); sel = 0; draw();
  input.oninput = () => { items = search(input.value); sel = 0; draw(); };
  input.onkeydown = e => {
    if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
    else if (e.key === 'Enter') { choose(sel); e.preventDefault(); }
  };
  list.onclick = e => { const el = e.target.closest('.xp-item'); if (el) choose(+el.dataset.i); };
  if (!palette.open) palette.showModal();
  input.focus();
}
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette?.open ? palette.close() : openPalette(); }
});

// ---------- export / print ----------
function exportMapPng() {
  if (currentView !== 'map') go('map');
  setTimeout(() => {
    const wrap = $('.semesters');
    if (!wrap) return;
    drawPrereqLines();
    const scale = 2, W = wrap.scrollWidth, H = wrap.scrollHeight, box = wrap.getBoundingClientRect();
    const cv = document.createElement('canvas');
    cv.width = W * scale; cv.height = H * scale;
    const ctx = cv.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0b1220';
    ctx.fillRect(0, 0, W, H);
    ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const family = getComputedStyle(document.body).fontFamily;
    const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); };
    // prerequisite lines first, so cards sit on top
    $$('.pq-lines path', wrap).forEach(p => {
      const cs = getComputedStyle(p);
      ctx.strokeStyle = cs.stroke; ctx.lineWidth = parseFloat(cs.strokeWidth) || 1.2; ctx.globalAlpha = +cs.opacity || .6;
      ctx.stroke(new Path2D(p.getAttribute('d')));
    });
    ctx.globalAlpha = 1;
    const text = (t, x, y, maxW, font, color) => {
      ctx.font = font; ctx.fillStyle = color;
      let s = t.trim();
      while (s.length > 1 && ctx.measureText(s).width > maxW) s = s.slice(0, -2) + '…';
      ctx.fillText(s, x, y);
    };
    $$('.sem-label, .course', wrap).forEach(el => {
      const r = el.getBoundingClientRect(), x = r.left - box.left, y = r.top - box.top;
      const cs = getComputedStyle(el);
      rr(x, y, r.width, r.height, 10);
      ctx.fillStyle = cs.backgroundColor; ctx.fill();
      ctx.strokeStyle = cs.borderTopColor; ctx.lineWidth = 1; ctx.stroke();
      const lines = $$('b, small, .c-name, .c-meta, .c-status', el);
      const step = r.height / (lines.length + 1);
      lines.forEach((ln, i) => {
        const lc = getComputedStyle(ln);
        text(ln.textContent.replace(/\s+/g, ' '), x + r.width - 10, y + step * (i + 1), r.width - 20, `${lc.fontWeight} ${parseFloat(lc.fontSize)}px ${family}`, lc.color);
      });
    });
    const a = document.createElement('a');
    a.href = cv.toDataURL('image/png'); a.download = 'מפת-הקורסים.png';
    document.body.appendChild(a); a.click(); a.remove();
    toast('התמונה נשמרה');
  }, 80);
}

function printPlan() {
  if (currentView !== 'planner') go('planner');
  setTimeout(() => window.print(), 150);
}

// ---------- wiring: header buttons and per-view buttons ----------
function openTools() {
  const items = [
    ['⚖️ השוואת קורסים', () => openComparator()],
    ['📅 לוח מבחנים ומרווחים', openExamCalendar],
    ['✨ מחולל מערכות שעות', openTimetableGenerator],
    ['🗓️ ניהול סמסטרים וקיץ', openSemesterManager],
    ['📖 זכויות ושאלות נפוצות', openFaq],
    ['📸 ייצוא מפת הקורסים (PNG)', exportMapPng],
    ['🖨️ הדפסת התוכנית', printPlan],
  ];
  openWide(`<h2>🧰 כלים</h2><div class="tools-grid">${items.map(([l], i) => `<button class="btn" type="button" data-tool="${i}">${l}</button>`).join('')}</div>${closeBtn}`, form => {
    $$('[data-tool]', form).forEach(b => b.onclick = () => { $('#modal').close(); setTimeout(items[+b.dataset.tool][1], 30); });
  });
}

function addHeaderButtons() {
  const sync = $('#syncBtn');
  if (!sync || $('#xSearch')) return;
  const mk = (id, label, title, fn, extra = '') => {
    const b = document.createElement('button');
    b.id = id; b.type = 'button'; b.className = 'hbtn'; b.title = title; b.innerHTML = label + extra; b.onclick = fn;
    sync.before(b);
  };
  mk('xSearch', '🔍', 'חיפוש מהיר (Ctrl+K)', openPalette);
  mk('xBell', '🔔', 'התראות', openNotifications, '<i class="badge" hidden></i>');
  mk('xTools', '🧰', 'כלים', openTools);
}

// Add buttons into the toolbars the views render.
function injectViewButtons() {
  const mapTb = $('.map-panel .toolbar .row');
  if (mapTb && !$('#xMapPng')) {
    mapTb.insertAdjacentHTML('afterbegin', '<button class="btn" id="xMapPng" type="button">📸 תמונה</button><button class="btn" id="xMapCmp" type="button">⚖️ השוואה</button>');
    $('#xMapPng').onclick = exportMapPng;
    $('#xMapCmp').onclick = () => openComparator();
  }
  const planTb = $('#view .panel > .toolbar');
  if (currentView === 'planner' && planTb && !$('#xSemMgr')) {
    planTb.insertAdjacentHTML('beforeend', '<div class="row wrap no-print"><button class="btn small" id="xSemMgr" type="button">🗓️ סמסטרים</button><button class="btn small" id="xExams" type="button">📅 מבחנים</button><button class="btn small" id="xPrint" type="button">🖨️ הדפסה</button></div>');
    $('#xSemMgr').onclick = openSemesterManager;
    $('#xExams').onclick = openExamCalendar;
    $('#xPrint').onclick = printPlan;
  }
  const ttTb = currentView === 'timetable' && $('#view .toolbar');
  if (ttTb && !$('#xGen')) {
    ttTb.insertAdjacentHTML('beforeend', '<button class="btn primary" id="xGen" type="button">✨ מחולל מערכות</button>');
    $('#xGen').onclick = openTimetableGenerator;
  }
}

(() => {
  const baseRender = render;
  render = function () { baseRender(); injectViewButtons(); updateBell(); };
  addHeaderButtons();
  render();
})();
