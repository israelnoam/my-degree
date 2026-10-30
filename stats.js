// מרכז ביצועים ונתוני תואר: averages, credits, honours forecast and grade charts.

const HONORS = { dean: 85, president: 90, minCredits: 18 }; // same thresholds as Semestero

let perfTab = 'summary';

const isGraded = c => c.status === 'done' && c.grade !== null && c.grade !== '' && !isNaN(c.grade);
const wavg = list => {
  const cr = list.reduce((a, c) => a + (+c.credits || 0), 0);
  return cr ? list.reduce((a, c) => a + c.grade * c.credits, 0) / cr : null;
};

// Per semester: graded average, graded credits, everything completed, and the
// cumulative average up to and including it.
function semesterStats() {
  const list = courses();
  const maxSem = Math.max(0, ...list.filter(c => isComplete(c) || c.status === 'active').map(c => c.sem || 0));
  const out = [];
  let running = [];
  for (let s = 1; s <= maxSem; s++) {
    const inSem = list.filter(c => c.sem === s);
    const graded = inSem.filter(isGraded);
    running = running.concat(graded);
    const active = inSem.filter(c => c.status === 'active');
    out.push({
      sem: s,
      avg: wavg(graded),
      gradedCredits: graded.reduce((a, c) => a + +c.credits, 0),
      doneCredits: inSem.filter(isComplete).reduce((a, c) => a + +c.credits, 0),
      activeCredits: active.reduce((a, c) => a + +c.credits, 0),
      cumulative: wavg(running),
      graded,
      active,
    });
  }
  return out;
}

function honorFor(s) {
  if (s.avg === null || s.gradedCredits < HONORS.minCredits) return null;
  if (s.avg >= HONORS.president) return 'president';
  if (s.avg >= HONORS.dean) return 'dean';
  return null;
}
const HONOR_LABEL = { president: '🏅 הצטיינות נשיא', dean: '🎖️ הצטיינות דיקן' };

// ---------- small SVG helpers (sized by viewBox, so they scale with the card) ----------
function donut(parts, total, centerTop, centerSub) {
  const R = 70, W = 18, C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = parts.filter(p => p.value > 0).map(p => {
    const len = (p.value / total) * C;
    const gap = parts.filter(q => q.value > 0).length > 1 ? 2 : 0; // surface gap between segments
    const seg = `<circle r="${R}" cx="90" cy="90" fill="none" stroke="${p.color}" stroke-width="${W}"
      stroke-dasharray="${Math.max(0, len - gap)} ${C}" stroke-dashoffset="${-offset}" transform="rotate(-90 90 90)"
      data-tip="${esc(p.label)}: ${fmt(p.value)} נק״ז (${fmt((p.value / total) * 100, 0)}%)"></circle>`;
    offset += len;
    return seg;
  }).join('');
  return `<svg viewBox="0 0 180 180" class="donut" role="img" aria-label="${esc(centerSub)} ${esc(centerTop)}">
    <circle r="${R}" cx="90" cy="90" fill="none" stroke="var(--line)" stroke-width="${W}"></circle>${arcs}
    <text x="90" y="88" text-anchor="middle" class="donut-big">${centerTop}</text>
    <text x="90" y="110" text-anchor="middle" class="donut-sub">${centerSub}</text>
  </svg>`;
}

// Semester averages (bars) with the cumulative average (line) on the same 50–100 scale.
function semesterChart(stats) {
  const rows = stats.filter(s => s.avg !== null);
  if (!rows.length) return '<p class="muted">עדיין אין ציונים.</p>';
  const W = 760, H = 260, L = 34, B = 26, T = 14, R = 44;
  const lo = 50, hi = 100, y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const band = (W - L - R) / rows.length, bw = Math.min(56, band * 0.5);
  const x = i => L + band * i + band / 2;
  const grid = [50, 60, 70, 80, 90, 100].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"></line>
    <text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" class="tick">${v}</text>`).join('');
  const refs = [[HONORS.dean, 'דיקן'], [HONORS.president, 'נשיא']].map(([v, l]) =>
    `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="ref"></line><text x="${W - R + 4}" y="${y(v) + 4}" class="ref-label">${l}</text>`).join('');
  const bars = rows.map((s, i) => {
    const top = y(s.avg), h = y(lo) - top;
    return `<g data-tip="${esc(semName(s.sem))}: ממוצע ${fmt(s.avg, 1)} · ${fmt(s.gradedCredits)} נק״ז עם ציון${honorFor(s) ? ' · ' + HONOR_LABEL[honorFor(s)] : ''}">
      <rect x="${x(i) - band / 2}" y="${T}" width="${band}" height="${H - T - B}" fill="transparent"></rect>
      <path d="M${x(i) - bw / 2},${y(lo)} V${top + 4} Q${x(i) - bw / 2},${top} ${x(i) - bw / 2 + 4},${top} H${x(i) + bw / 2 - 4} Q${x(i) + bw / 2},${top} ${x(i) + bw / 2},${top + 4} V${y(lo)} Z" class="bar-fill"></path>
      <text x="${x(i)}" y="${top - 6}" text-anchor="middle" class="bar-val">${fmt(s.avg, 1)}</text>
      <text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="tick">סמ׳ ${s.sem}</text></g>`;
  }).join('');
  const line = rows.map((s, i) => `${i ? 'L' : 'M'}${x(i)},${y(s.cumulative)}`).join(' ');
  const dots = rows.map((s, i) => `<circle cx="${x(i)}" cy="${y(s.cumulative)}" r="5" class="cum-dot" data-tip="ממוצע מצטבר אחרי סמסטר ${s.sem}: ${fmt(s.cumulative, 2)}"></circle>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" direction="ltr" role="img" aria-label="ממוצע לפי סמסטר">
    ${grid}${refs}${bars}<path d="${line}" class="cum-line"></path>${dots}</svg>
    <div class="legend-row"><span><i class="sw bar"></i>ממוצע סמסטר</span><span><i class="sw line"></i>ממוצע מצטבר</span></div>`;
}

function distributionChart(graded) {
  const bins = [[55, 64], [65, 74], [75, 84], [85, 89], [90, 94], [95, 100]];
  const counts = bins.map(([a, b]) => graded.filter(c => c.grade >= a && c.grade <= b));
  const max = Math.max(1, ...counts.map(c => c.length));
  const W = 560, H = 200, B = 26, T = 18, L = 8;
  const band = (W - 2 * L) / bins.length, bw = band * 0.6;
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" direction="ltr" role="img" aria-label="התפלגות ציונים">
    <line x1="${L}" x2="${W - L}" y1="${H - B}" y2="${H - B}" class="grid"></line>
    ${counts.map((list, i) => {
      const h = (H - B - T) * list.length / max, x = L + band * i + (band - bw) / 2, top = H - B - h;
      return `<g data-tip="${bins[i][0]}–${bins[i][1]}: ${list.length ? list.map(c => c.name).join(', ') : 'אין'}">
        <rect x="${L + band * i}" y="${T}" width="${band}" height="${H - B - T}" fill="transparent"></rect>
        ${list.length ? `<path d="M${x},${H - B} V${top + 4} Q${x},${top} ${x + 4},${top} H${x + bw - 4} Q${x + bw},${top} ${x + bw},${top + 4} V${H - B} Z" class="bar-fill"></path>
        <text x="${x + bw / 2}" y="${top - 5}" text-anchor="middle" class="bar-val">${list.length}</text>` : ''}
        <text x="${L + band * i + band / 2}" y="${H - 8}" text-anchor="middle" class="tick">${bins[i][0]}–${bins[i][1]}</text></g>`;
    }).join('')}</svg>`;
}

function courseBars(graded) {
  const sorted = [...graded].sort((a, b) => b.grade - a.grade);
  return `<div class="grade-bars">${sorted.map(c => `
    <div class="gb-row" data-tip="${esc(c.name)} · ${fmt(c.credits)} נק״ז · ${esc(semName(c.sem))}">
      <span class="gb-name">${esc(c.name)}</span>
      <span class="gb-track"><i style="width:${Math.max(0, (c.grade - 50) * 2)}%"></i></span>
      <b class="gb-val">${c.grade}</b>
    </div>`).join('')}</div>`;
}

// ---------- the view ----------
function renderPerformance(root) {
  const s = computeStats();
  const sems = semesterStats();
  const graded = courses().filter(isGraded);
  const passed = courses().filter(isComplete);
  const binaries = passed.filter(c => c.status === 'binary').length;
  const exempt = passed.filter(c => c.status === 'exempt').length;
  const best = sems.filter(x => x.avg !== null && x.gradedCredits >= 6).sort((a, b) => b.avg - a.avg)[0];
  const current = [...sems].reverse().find(x => x.activeCredits > 0);
  const p = degreeProgress();
  const planned = p.all('plan');
  const remaining = Math.max(0, s.total - s.doneCredits - s.activeCredits - planned);

  const tabs = [['summary', '📋 תקציר ומדדים'], ['charts', '📈 גרפים וניתוח ציונים']]
    .map(([k, l]) => `<button class="${perfTab === k ? 'on' : ''}" data-ptab="${k}">${l}</button>`).join('');

  const summary = `
    <div class="kpis">
      <div class="kpi"><small>🎯 ממוצע מצטבר</small><b>${s.gpa === null ? '—' : fmt(s.gpa, 2)}</b><span>מ-${graded.length} קורסים עם ציון</span></div>
      <div class="kpi"><small>📚 נק״ז שהושלמו</small><b>${fmt(s.doneCredits)} <em>/ ${fmt(s.total)}</em></b><span>${fmt((s.doneCredits / s.total) * 100, 1)}% מהתואר</span></div>
      <div class="kpi"><small>✅ קורסים שעברו</small><b>${passed.length}</b><span>${graded.length} עם ציון · ${binaries} בינארי · ${exempt} פטור</span></div>
      <div class="kpi"><small>⭐ סמסטר מוביל</small><b>${best ? fmt(best.avg, 1) : '—'}</b><span>${best ? esc(semName(best.sem)) : 'ממתין לציונים'}</span></div>
    </div>

    <section class="perf-card honors">
      <div class="perf-head"><h3>🏅 סימולטור הצטיינות דיקן ונשיא</h3>
        <small class="muted">סף דיקן ${HONORS.dean} · סף נשיא ${HONORS.president} · לפחות ${HONORS.minCredits} נק״ז עם ציון בסמסטר</small></div>
      <div class="honor-grid">
        <div>
          <h4>אותות שנצברו</h4>
          ${sems.filter(x => x.avg !== null).map(x => `<div class="honor-row">
            <span>${esc(semName(x.sem))}</span>
            <span class="muted">${fmt(x.avg, 1)} · ${fmt(x.gradedCredits)} נק״ז</span>
            <b class="${honorFor(x) || 'none'}">${honorFor(x) ? HONOR_LABEL[honorFor(x)] : x.gradedCredits < HONORS.minCredits ? `פחות מ-${HONORS.minCredits} נק״ז` : 'מתחת לסף'}</b>
          </div>`).join('') || '<p class="muted">עדיין אין סמסטרים עם ציונים.</p>'}
        </div>
        <div>
          <h4>תחזית לסמסטר הנוכחי</h4>
          ${current ? `
            <p>${esc(semName(current.sem))}: <b>${fmt(current.activeCredits)}</b> נק״ז בלימוד${current.active.some(c => c.status === 'active') ? '' : ''}.</p>
            ${current.activeCredits >= HONORS.minCredits
              ? `<p class="good">✓ מספיק נק״ז להצטיינות. ממוצע ${HONORS.dean}+ בסמסטר = דיקן, ${HONORS.president}+ = נשיא.</p>`
              : `<p class="warn">⚠️ חסרים ${fmt(HONORS.minCredits - current.activeCredits)} נק״ז כדי להגיע ל-${HONORS.minCredits}.</p>`}
            <p class="muted">קורסים בעובר בינארי או בפטור לא נספרים לממוצע ההצטיינות.</p>`
            : '<p class="muted">סמן קורסים כ"בלימוד" כדי לראות תחזית.</p>'}
        </div>
      </div>
    </section>

    <div class="perf-grid">
      <section class="perf-card">
        <div class="perf-head"><h3>🍩 התפלגות נק״ז</h3><span class="pill">סה״כ ${fmt(s.total)}</span></div>
        <div class="donut-wrap">
          ${donut([
            { label: 'הושלם', value: s.doneCredits, color: 'var(--green)' },
            { label: 'בלימוד', value: s.activeCredits, color: 'var(--accent)' },
            { label: 'מתוכנן', value: planned, color: 'var(--blue)' },
          ], s.total, fmt((s.doneCredits / s.total) * 100, 0) + '%', 'הושלם')}
          <ul class="donut-legend">
            <li><i style="background:var(--green)"></i>הושלם<b>${fmt(s.doneCredits)}</b></li>
            <li><i style="background:var(--accent)"></i>בלימוד<b>${fmt(s.activeCredits)}</b></li>
            <li><i style="background:var(--blue)"></i>מתוכנן<b>${fmt(planned)}</b></li>
            <li><i style="background:var(--line)"></i>עוד לא בתוכנית<b>${fmt(remaining)}</b></li>
          </ul>
        </div>
      </section>
      <section class="perf-card">
        <div class="perf-head"><h3>📑 נק״ז לפי קטגוריה</h3><span class="pill">דרישות הפקולטה</span></div>
        ${reqBar('חובה פקולטית', DEGREE_RULES.mandatory, p.get('mandatory').done, p.get('mandatory').now, p.get('mandatory').plan)}
        ${reqBar('בחירה מתקדמת (א׳–ה׳)', DEGREE_RULES.electives, p.sum(p.elec, 'done'), p.sum(p.elec, 'now'), p.sum(p.elec, 'plan'))}
        ${reqBar('פרויקט גמר', DEGREE_RULES.project, p.get('project').done, p.get('project').now, p.get('project').plan)}
        ${reqBar('מל״ג + כלל טכניונית', DEGREE_RULES.malag + DEGREE_RULES.general, p.sum(['malag', 'general'], 'done'), p.sum(['malag', 'general'], 'now'), p.sum(['malag', 'general'], 'plan'))}
        ${reqBar('חינוך גופני', DEGREE_RULES.sports, p.get('sports').done, p.get('sports').now, p.get('sports').plan)}
      </section>
    </div>`;

  const remainingGraded = Math.max(0, s.total - s.doneCredits);
  const charts = `
    <section class="perf-card">
      <div class="perf-head"><h3>ממוצע לפי סמסטר</h3><small class="muted">קווי הסף: דיקן ${HONORS.dean}, נשיא ${HONORS.president}</small></div>
      ${semesterChart(sems)}
    </section>
    <div class="perf-grid">
      <section class="perf-card">
        <div class="perf-head"><h3>התפלגות ציונים</h3><small class="muted">מספר קורסים בכל טווח</small></div>
        ${graded.length ? distributionChart(graded) : '<p class="muted">עדיין אין ציונים.</p>'}
      </section>
      <section class="perf-card">
        <div class="perf-head"><h3>🎯 יעד ממוצע לסוף התואר</h3></div>
        <label>הממוצע שאני רוצה בסוף<input id="targetGpa" type="number" min="55" max="100" step="0.5" value="${esc(settings().targetGpa || 90)}"></label>
        <div id="targetOut" class="target-out"></div>
        <p class="muted">מחושב על ${fmt(remainingGraded)} הנק״ז שנשארו בתואר, בהנחה שכולן עם ציון.</p>
      </section>
    </div>
    <section class="perf-card">
      <div class="perf-head"><h3>כל הציונים</h3><small class="muted">מהגבוה לנמוך</small></div>
      ${graded.length ? courseBars(graded) : '<p class="muted">עדיין אין ציונים.</p>'}
    </section>`;

  root.innerHTML = `
    <section class="panel perf">
      <div class="toolbar"><div><h2>📊 מרכז ביצועים ונתוני תואר</h2>
        <p class="muted">ממוצעים, נק״ז, הצטיינות ומגמות בציונים</p></div></div>
      <div class="seg small perf-tabs">${tabs}</div>
      ${perfTab === 'summary' ? summary : charts}
    </section>`;

  $$('[data-ptab]', root).forEach(b => b.onclick = () => { perfTab = b.dataset.ptab; render(); });
  const t = $('#targetGpa', root);
  if (t) {
    const update = () => {
      const target = +t.value;
      const gradedCredits = graded.reduce((a, c) => a + +c.credits, 0);
      const need = remainingGraded ? (target * (gradedCredits + remainingGraded) - (s.gpa || 0) * gradedCredits) / remainingGraded : null;
      $('#targetOut', root).innerHTML = need === null ? ''
        : need > 100 ? `<b class="bad">לא אפשרי</b> <span class="muted">(צריך ${fmt(need, 1)} בממוצע)</span>`
        : need <= 55 ? `<b class="good">כבר מובטח</b>`
        : `צריך ממוצע <b>${fmt(need, 1)}</b> בשאר התואר`;
    };
    t.oninput = update;
    t.onchange = () => Store.put('meta', 'settings', { targetGpa: +t.value });
    update();
  }
}

// Shared hover tooltip for anything with data-tip (charts, bars, donut segments).
(() => {
  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  document.body.appendChild(tip);
  const show = e => {
    const el = e.target.closest?.('[data-tip]');
    if (!el) { tip.classList.remove('show'); return; }
    tip.textContent = el.dataset.tip;
    tip.classList.add('show');
    const x = Math.min(window.innerWidth - tip.offsetWidth - 8, Math.max(8, e.clientX - tip.offsetWidth / 2));
    tip.style.left = x + 'px';
    tip.style.top = (e.clientY - tip.offsetHeight - 14) + 'px';
  };
  document.addEventListener('pointermove', show);
  document.addEventListener('pointerdown', show);
  document.addEventListener('scroll', () => tip.classList.remove('show'), true);
})();
