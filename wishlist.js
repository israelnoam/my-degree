// ⭐ Wishlist (תכנון תואר ← רשימת משאלות): courses you might take but haven't committed to.
// They stay out of the plan and the degree requirements until you move one into a semester.
// Each wish is a synced record of kind 'wish', keyed by course number.

const WISH_PRIO = { high: { icon: '⭐', label: 'רוצה מאוד' }, maybe: { icon: '🤔', label: 'אולי' } };

const wishes = () => Store.list('wish').sort((a, b) => (a.prio === 'high' ? 0 : 1) - (b.prio === 'high' ? 0 : 1) || (a.added || 0) - (b.added || 0));
const isWished = code => !!Store.get('wish', code);

// What we know about a course number: the elective lists first, then CheeseFork.
function courseInfo(code) {
  const e = ELECTIVE_BY_CODE[code];
  if (e) return { code, name: e.name, credits: e.credits, list: e.list };
  const cf = CF.find(code)?.course?.general;
  if (cf) return { code, name: cf['שם מקצוע'] || code, credits: parseFloat(cf['נקודות']) || 0, list: '' };
  return null;
}

function addWish(code, info = courseInfo(code)) {
  if (!info) return toast('לא מצאתי את הקורס');
  if (courseByCode(code)) return toast('הקורס כבר בתוכנית');
  Store.put('wish', code, { code, name: info.name, credits: +info.credits || 0, list: info.list || '', prio: 'maybe', sem: 0, note: '', added: Date.now() });
  toast(`⭐ ${info.name} נוסף לרשימת המשאלות`);
}
function removeWish(code) { removeWithUndo([['wish', code]], 'הוסר מרשימת המשאלות'); }
function toggleWish(code) { isWished(code) ? removeWish(code) : addWish(code); }

const wishStar = code => isWished(code)
  ? `<button type="button" class="btn small wish-on" data-wishstar="${esc(code)}" title="ברשימת המשאלות (לחץ להסרה)" aria-label="הסר מרשימת המשאלות">★</button>`
  : `<button type="button" class="btn small" data-wishstar="${esc(code)}" title="הוסף לרשימת המשאלות" aria-label="הוסף לרשימת המשאלות">☆</button>`;

function bindWishStars(root) {
  $$('[data-wishstar]', root).forEach(b => b.onclick = e => { e.stopPropagation(); toggleWish(b.dataset.wishstar); });
}

// Courses you can add by typing: electives plus every course CheeseFork has loaded.
function wishSearch(q) {
  q = norm(q.trim());
  if (!q) return [];
  const seen = new Set([...courses().map(c => c.code), ...wishes().map(w => w.code)]);
  const out = [];
  const add = info => { if (!seen.has(info.code) && (norm(info.name).includes(q) || info.code.includes(q))) { seen.add(info.code); out.push(info); } };
  ELECTIVES.forEach(([code]) => add(courseInfo(code)));
  for (const map of Object.values(CF.data)) {
    for (const c of map.values()) {
      if (out.length >= 30) return out;
      const code = oldCourseCode(c.general['מספר מקצוע']);
      add({ code, name: c.general['שם מקצוע'] || code, credits: parseFloat(c.general['נקודות']) || 0, list: '' });
    }
  }
  return out.slice(0, 30);
}

function wishlistHtml() {
  const list = wishes();
  const check = doneCode8Check();
  const total = list.reduce((a, w) => a + (+w.credits || 0), 0);
  const byList = {};
  list.forEach(w => { const k = LISTS[w.list] ? w.list : 'other'; byList[k] = (byList[k] || 0) + (+w.credits || 0); });
  const now = currentSemesterNumber();
  const semOpts = sel => `<option value="0">— עוד לא יודע —</option>` + semIds().filter(s => semOrder(s) >= now)
    .map(s => `<option value="${s}" ${+sel === s ? 'selected' : ''}>${s > 100 ? 'קיץ' : `סמסטר ${s}`} · ${semesterYearLabel(s)}</option>`).join('');
  return `<div class="wish">
    <div class="wish-head">
      <div><h2>⭐ רשימת משאלות</h2>
        <p class="muted">קורסים שאולי תרצה לקחת. הם לא נכנסים לתוכנית ולדרישות התואר עד שתעביר אותם לסמסטר.</p></div>
      <div class="row wrap">
        ${list.length >= 2 ? '<button type="button" class="btn small" id="wishCmp">⚖️ השווה את המועדפים</button>' : ''}
        ${list.length ? '<button type="button" class="btn small primary" id="wishAsk">🤖 עזור לי לבחור</button>' : ''}
      </div>
    </div>
    <div class="wish-add"><input type="search" id="wishQ" autocomplete="off" placeholder="🔍 הוסף קורס: חפש לפי שם או מספר (גם קורסים מחוץ לרשימות הבחירה)"><div id="wishRes" class="cmp-results" hidden></div></div>
    ${list.length ? `<p class="wish-sum">${list.length} קורסים · ${fmt(total)} נק״ז
      ${Object.entries(byList).map(([k, cr]) => `<span class="lbadge" style="--lc:${LISTS[k]?.color || 'var(--muted)'}">${LISTS[k]?.short || 'אחר'} · ${fmt(cr)}</span>`).join(' ')}</p>
    <div class="wish-list">${list.map(w => {
      const g = CF.find(w.code)?.course?.general;
      const pre = g ? evalPrereqs(g['מקצועות קדם'], check) : null;
      const offered = CF.offeredIn(w.code).sort().map(cfKeyLabel);
      const inPlan = courseByCode(w.code);
      const prio = WISH_PRIO[w.prio] || WISH_PRIO.maybe;
      return `<div class="wish-item ${w.prio === 'high' ? 'high' : ''}" data-wish="${esc(w.code)}">
        <div class="wi-top">
          <button type="button" class="wi-prio" data-wishprio title="לחץ להחלפה: רוצה מאוד / אולי">${prio.icon} ${prio.label}</button>
          <span class="muted">${esc(w.code)} · ${fmt(w.credits)} נק״ז${LISTS[w.list] ? ` · <span class="lbadge" style="--lc:${LISTS[w.list].color}">${LISTS[w.list].short}</span>` : ''}</span>
        </div>
        <h3 translate="no">${esc(w.name)}</h3>
        <p class="wi-meta">${offered.length ? `נפתח: ${offered.join(', ')}` : g ? '' : 'לא נפתח לאחרונה'}
          ${pre ? (pre.ok ? ' · <span class="ok-t">✓ דרישות קדם</span>' : ' · <span class="bad-t">חסרות דרישות קדם</span>') : ''}
          ${inPlan ? ' · <span class="ok-t">כבר בתוכנית</span>' : ''}</p>
        <div class="grid2">
          <label>מתי הייתי רוצה<select data-wishsem>${semOpts(w.sem)}</select></label>
          <label>למה / הערות<input data-wishnote value="${esc(w.note || '')}" placeholder="למשל: אם ייפתח בחורף, בגלל הפרויקט"></label>
        </div>
        <div class="link-row">
          ${inPlan ? '' : '<button type="button" class="btn small primary" data-wishplan>＋ לתוכנית</button>'}
          <button type="button" class="btn small" data-wishcmp>⚖️ השווה</button>
          ${askAdvisorBtn(w.code)}
          <button type="button" class="btn small danger" data-wishdel>הסר</button>
        </div>
      </div>`;
    }).join('')}</div>` : `<p class="empty">הרשימה ריקה. הוסף קורסים כאן, או לחץ ☆ ליד קורס בלשונית "קורסי בחירה".</p>`}
  </div>`;
}

function bindWishlist(root) {
  const q = $('#wishQ', root), res = $('#wishRes', root);
  if (q) {
    q.oninput = () => {
      const m = wishSearch(q.value);
      res.hidden = !q.value.trim();
      res.innerHTML = m.length ? m.map(c => `<button type="button" class="cmp-opt" data-wishadd="${esc(c.code)}"><span translate="no">${esc(c.name)}</span> <small class="muted">${esc(c.code)} · ${fmt(c.credits)} נק״ז${LISTS[c.list] ? ` · ${LISTS[c.list].short}` : ''}</small></button>`).join('')
        : `<p class="muted">${Object.keys(CF.data).length ? 'לא נמצא קורס' : 'טוען מ-CheeseFork…'}</p>`;
    };
    // Enter takes the first match.
    q.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const first = wishSearch(q.value)[0]; if (first) addWish(first.code, first); } };
    res.onclick = e => {
      const b = e.target.closest('[data-wishadd]');
      if (b) addWish(b.dataset.wishadd, wishSearch(q.value).find(c => c.code === b.dataset.wishadd));
    };
  }
  $('#wishCmp', root)?.addEventListener('click', () => { cmpPick = wishes().slice(0, 3).map(w => w.code).concat(['', '', '']).slice(0, 3); openComparator(); });
  $('#wishAsk', root)?.addEventListener('click', () => openAdvisor(`מתוך רשימת המשאלות שלי (${wishes().map(w => `${w.name} ${w.code}`).join(', ')}): אילו כדאי לי לקחת, באיזה סמסטר, ומה מהם עוזר לי הכי הרבה בדרישות התואר?`));
  $$('[data-wish]', root).forEach(card => {
    const code = card.dataset.wish, w = () => Store.get('wish', code);
    $('[data-wishprio]', card).onclick = () => Store.put('wish', code, { prio: w().prio === 'high' ? 'maybe' : 'high' });
    $('[data-wishsem]', card).onchange = e => Store.put('wish', code, { sem: +e.target.value });
    $('[data-wishnote]', card).onchange = e => Store.put('wish', code, { note: e.target.value.trim() });
    $('[data-wishdel]', card).onclick = () => removeWish(code);
    $('[data-wishcmp]', card).onclick = () => openComparator(code);
    $('[data-wishplan]', card)?.addEventListener('click', () => {
      const x = w();
      addToPlan(code, 0, { name: x.name, credits: x.credits, list: x.list, sem: x.sem }).then(() => Store.remove('wish', code));
    });
  });
}
