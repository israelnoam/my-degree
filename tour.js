// 🧭 A guided tour: walks through every screen and tool with a spotlight and a short note.
// Starts by itself once per device (first launch), and any time from הגדרות or Ctrl+K.

const TOUR_LS = 'pp_tour_done';

// view: the screen to open first; tab: planner sub-tab; sel: what to spotlight (none = a centred card).
const TOUR_STEPS = [
  { title: '👋 ברוכים הבאים ל"התואר שלי"', text: 'כל התואר במקום אחד: מפת קורסים, תכנון, ציונים, משימות, מערכת שעות, קורות חיים ויועץ AI. הסיור לוקח בערך דקה וחצי – אפשר לדלג בכל רגע.' },
  { view: 'map', sel: '#stats', title: '📊 הממוצע וההתקדמות', text: 'ממוצע משוקלל, נק״ז שהושלמו מתוך התואר וכמה אתה לומד עכשיו. לחיצה כאן פותחת את מרכז הביצועים.' },
  { view: 'map', sel: '#openTasksStat', title: '✅ משימות לשבוע הקרוב', text: 'כמה משימות צריך להגיש בשבעת הימים הקרובים (כולל מה שבאיחור), וכמה מהן באיחור או להיום. לחיצה פותחת את משימות השבוע.' },
  { view: 'map', sel: '#syncBtn', title: '☁️ סנכרון עם Google', text: 'הנתונים נשמרים ב-Google Drive שלך ומסתנכרנים בין המחשב, האייפד והטלפון – אוטומטית פעם ביום, או מיד בלחיצה.' },
  { view: 'map', sel: '#xSearch', title: '🔍 חיפוש מהיר (Ctrl+K)', text: 'חפש קורס, קורס בחירה, משימה או פעולה ועבור אליה מיד. עובד מכל מסך.' },
  { view: 'map', sel: '#xBell', title: '🔔 התראות', text: 'סיכום שבועי חדש בכל יום ראשון (מה להגיש, מבחנים בשבועיים הקרובים וקורסים בלי ציון), השיעורים של היום, משימות דחופות, ותזכורת 10 דקות לפני כל שיעור.' },
  { view: 'map', sel: '#xAdvisor', title: '🤖 יועץ תואר', text: 'שאל בשפה חופשית: מה לקחת בסמסטר הבא, אם אתה בקצב, מה יקרה לממוצע אם… היועץ עונה לפי הנתונים שלך – ורק מציע, לא משנה כלום בעצמו.' },
  { view: 'map', sel: '#xSettings', title: '⚙️ הגדרות', text: 'חיבור ל-Google, יומנים ורשימות משימות, גיבוי ושחזור, התקנה בטלפון, שאלות נפוצות והסיור הזה.' },
  { view: 'map', sel: '#tabs', title: '🧭 המסכים', text: 'מפת קורסים, תכנון תואר, משימות, מערכת שעות וקורות חיים. בטלפון הסרגל הזה נמצא בתחתית המסך.' },
  { view: 'map', sel: '.semesters', title: '🎓 מפת הקורסים', text: 'כל הקורסים לפי סמסטר, בצבע לפי מצב (נעול, פתוח, בלימוד, הושלם). הקווים הם דרישות הקדם; מעבר עכבר מדגיש את השרשרת, ולחיצה פותחת ציון, CheeseFork ומחשבון יעד למבחן.' },
  { view: 'map', sel: '#gradeSheetBtn', title: '📄 ייבוא גיליון ציונים', text: 'טען את גיליון הציונים מהטכניון (PDF) והציונים והסטטוסים יתעדכנו לבד.' },
  { view: 'map', sel: '#xMapCmp', title: '⚖️ השוואת קורסים', text: 'עד שלושה קורסים זה לצד זה: דרישות קדם, מועדי מבחנים, אחראים, סילבוס – ואזהרה על מבחנים צמודים או הרצאות מתנגשות.' },
  { view: 'map', sel: '#xMapPng', title: '📸 תמונה של המפה', text: 'שומר את מפת הקורסים כתמונה לשיתוף או להדפסה.' },
  { view: 'planner', tab: 'plan', sel: '.req-grid', title: '🎯 דרישות התואר', text: 'כמה נק״ז חסרות בכל דרישה – חובה, בחירה מרשימות א׳–ה׳, פרויקט, מל״ג, כלל טכניוני וספורט – מה הושלם, מה בלימוד ומה מתוכנן.' },
  { view: 'planner', tab: 'plan', sel: '.pcols', title: '🗓️ התוכנית לפי סמסטרים', text: 'שבץ קורסים לסמסטרים, ראה עומס נק״ז לכל סמסטר ואזהרה כשקורס לא בסמסטר המומלץ.' },
  { view: 'planner', tab: 'plan', sel: '#xSemMgr', parent: true, title: '🧰 כלי התכנון', text: 'ניהול סמסטרים וסמסטרי קיץ, לוח מבחנים עם ימי הלמידה בין מבחן למבחן, הדפסת התוכנית, ויועץ התואר.' },
  { view: 'planner', tab: 'catalog', sel: '.cat-list', title: '🧩 קורסי בחירה', text: 'כל קורסי הבחירה עם סינון לפי רשימה ודרישות קדם. "פרטים" פותח סילבוס, דרישות קדם, מועדים ואחראים מ-CheeseFork; "＋ לתוכנית" משבץ לסמסטר.' },
  { view: 'planner', tab: 'wish', sel: '.wish', title: '⭐ רשימת משאלות', text: 'קורסים שאולי תרצה לקחת, בלי להתחייב: סמן ☆ ליד קורס בחירה או חפש כל קורס, דרג "רוצה מאוד" או "אולי", כתוב למה, והעבר לסמסטר כשתחליט. אפשר גם להשוות אותם ולשאול את היועץ.' },
  { view: 'planner', tab: 'opps', sel: '.radar', title: '🛰️ האקתונים ותחרויות', text: 'פעם בשבוע Claude מחפש ברשת האקתונים, תחרויות, מלגות, כנסים ומשרות סטודנט שמתאימים לך, ומציג אותם כאן – עם קישור ותזכורת במשימות בלחיצה. מתחתיהם: תוכניות כמו פורמולה, מרחיבים אופקים ורובוטיקה.' },
  { view: 'planner', tab: 'reserve', sel: '[data-ptab="reserve"]', title: '🎖️ מילואים והזדמנויות', text: 'חישוב עוברים בינאריים שמעלים הכי הרבה את הממוצע, הזכויות לפי קבוצת המילואים שלך, ותוכניות כמו מצוינות ותואר כפול.' },
  { view: 'tasks', sel: '#addTask', title: '📝 משימה חדשה', text: 'שיעורי בית, מבחנים ופרויקטים לפי קורס ותאריך. כל משימה מסתנכרנת ל-Google Tasks, ואפשר להוסיף אותה ליומן Google בלחיצה.' },
  { view: 'tasks', sel: '.gbar', title: '✅ Google Tasks', text: 'מצב הסנכרון, כפתור סנכרון מיידי וקישור ישיר ל-Google Tasks. הפס נשאר צמוד לראש המסך כשגוללים.' },
  { view: 'timetable', sel: '.tt-scroll', title: '🕒 מערכת שעות', text: 'השיעורים הקבועים שלך יחד עם אירועים מ-Google Calendar. לחיצה על משבצת ריקה מוסיפה שיעור.' },
  { view: 'timetable', sel: '#xGen', title: '✨ מחולל מערכות', text: 'בוחר קבוצות הרצאה ותרגול בלי התנגשויות, עם ימים חופשיים ושעת התחלה לבחירתך, ומדרג לפי הכי פחות ימים וחורים.' },
  { view: 'cv', sel: '.cv-panel', title: '📄 קורות חיים', text: 'פרופיל אחד וגרסה מותאמת לכל משרה, לפי מילות המפתח במודעה – או עם AI. אפשר לייבא קו״ח קיים ולמלא השכלה מהתואר.' },
  { view: 'performance', sel: '#view .panel', title: '📈 מרכז ביצועים', text: 'ממוצע לפי סמסטר, תחזית הצטיינות דיקן ונשיא, וכמה נשאר עד סוף התואר.' },
  { title: '🎉 זהו!', text: 'אפשר להפעיל את הסיור שוב מ⚙️ הגדרות ← עזרה ומידע, או מהחיפוש המהיר (Ctrl+K). בהצלחה בתואר!' },
];

let tour = null; // {i, root, back: {view, plannerTab}, timer}

function startTour(at = 0) {
  if (tour) endTour(false);
  $$('dialog[open]').forEach(d => d.close());
  const root = document.createElement('div');
  root.className = 'tour';
  root.innerHTML = '<div class="tour-spot"></div><div class="tour-card" role="dialog" aria-live="polite"></div>';
  document.body.appendChild(root);
  tour = { i: at, root, back: { view: currentView, plannerTab } };
  const place = () => tourPlace();
  tour.place = place;
  addEventListener('resize', place);
  addEventListener('scroll', place, true);
  document.addEventListener('keydown', tourKeys);
  // Views re-render on data changes; keep the spotlight on the live element.
  tour.timer = setInterval(place, 400);
  tourShow();
}

function tourKeys(e) {
  if (!tour) return;
  if (e.key === 'Escape') endTour(true);
  // RTL: the left arrow moves forward.
  else if (e.key === 'ArrowLeft' || e.key === 'Enter') { e.preventDefault(); tourStep(1); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); tourStep(-1); }
}

function tourStep(d) {
  const n = tour.i + d;
  if (n >= TOUR_STEPS.length) return endTour(true);
  if (n < 0) return;
  tour.i = n;
  tourShow();
}

function tourTarget(step) {
  if (!step.sel) return null;
  let el = $(step.sel);
  if (el && step.parent) el = el.parentElement;
  // Skip anything not on screen (e.g. hidden on phones).
  return el && el.getClientRects().length ? el : null;
}

function tourShow() {
  const step = TOUR_STEPS[tour.i];
  if (step.tab) plannerTab = step.tab;
  if (step.view && (step.view !== currentView || step.tab)) go(step.view);
  const card = $('.tour-card', tour.root);
  const last = tour.i === TOUR_STEPS.length - 1;
  card.innerHTML = `
    <div class="tour-prog"><span>${tour.i + 1} / ${TOUR_STEPS.length}</span><div class="bar"><i style="width:${(tour.i + 1) / TOUR_STEPS.length * 100}%"></i></div></div>
    <h3>${step.title}</h3><p>${step.text}</p>
    <div class="row">
      ${last ? '' : '<button type="button" class="btn small" data-tour="skip">דלג</button>'}
      <span class="spacer"></span>
      ${tour.i ? '<button type="button" class="btn small" data-tour="prev">→ הקודם</button>' : ''}
      <button type="button" class="btn small primary" data-tour="next">${last ? 'סיום' : tour.i ? 'הבא ←' : 'יאללה, נתחיל ←'}</button>
    </div>`;
  card.onclick = e => {
    const a = e.target.closest('[data-tour]')?.dataset.tour;
    if (a === 'next') tourStep(1);
    else if (a === 'prev') tourStep(-1);
    else if (a === 'skip') endTour(true);
  };
  // Let the screen render, bring the element into view, then place the spotlight.
  setTimeout(() => {
    if (!tour) return;
    tourTarget(step)?.scrollIntoView({ block: 'center', behavior: 'instant' });
    tourPlace();
    $('[data-tour="next"]', card)?.focus();
  }, 120);
}

function tourPlace() {
  if (!tour) return;
  const step = TOUR_STEPS[tour.i];
  const spot = $('.tour-spot', tour.root), card = $('.tour-card', tour.root);
  const el = tourTarget(step);
  const vw = innerWidth, vh = innerHeight, pad = 6, gap = 12;
  if (!el) {
    spot.classList.add('none');
    card.style.cssText = `top:${Math.max(16, (vh - card.offsetHeight) / 2)}px;left:${Math.max(16, (vw - card.offsetWidth) / 2)}px`;
    return;
  }
  // Large blocks get clipped to the viewport so the spotlight stays visible.
  const r = el.getBoundingClientRect();
  const top = Math.max(4, r.top - pad), bottom = Math.min(vh - 4, r.bottom + pad);
  const left = Math.max(4, r.left - pad), right = Math.min(vw - 4, r.right + pad);
  spot.classList.remove('none');
  spot.style.cssText = `top:${top}px;left:${left}px;width:${right - left}px;height:${bottom - top}px`;
  const ch = card.offsetHeight, cw = card.offsetWidth;
  let y = bottom + gap;
  if (y + ch > vh - 8) y = top - gap - ch;          // no room below: above
  if (y < 8) y = Math.min(vh - ch - 8, Math.max(8, bottom - ch - gap)); // tall target: inside it, at the bottom
  const x = Math.min(vw - cw - 8, Math.max(8, (left + right) / 2 - cw / 2));
  card.style.cssText = `top:${y}px;left:${x}px`;
}

function endTour(done) {
  if (!tour) return;
  clearInterval(tour.timer);
  removeEventListener('resize', tour.place);
  removeEventListener('scroll', tour.place, true);
  document.removeEventListener('keydown', tourKeys);
  tour.root.remove();
  const back = tour.back;
  tour = null;
  if (done) lsSet(TOUR_LS, '1');
  plannerTab = back.plannerTab;
  go(back.view);
}

// First launch on this device: offer the tour (the first card has a skip button).
setTimeout(() => {
  // A new user gets the welcome checklist instead; the tour is one of its steps.
  if (!lsGet(TOUR_LS) && !document.querySelector('dialog[open]') && !welcomeVisible()) startTour();
}, 1200);
