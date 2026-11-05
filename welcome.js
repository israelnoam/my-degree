// "צעדים ראשונים": the welcome checklist for a new user.
// Shown at the top of the course map when someone opens the app for the first time
// (or with the ?welcome link), until every step is done or they hide it. Synced, so it
// follows you between devices.

const WELCOME_LINK = () => `${location.origin}${location.pathname}?welcome`;
const welcomeParam = new URLSearchParams(location.search).has('welcome');
const welcomeSkipped = id => (settings().welcomeSkip || []).includes(id);

// A new user: nothing imported, no plan picked, no grades yet.
function looksNewUser() {
  const st = settings();
  return !st.planId && !st.gradesImportedAt && !courses().some(c => c.grade != null || ['done', 'exempt', 'binary'].includes(c.status));
}

function welcomeVisible() {
  const st = settings();
  if (st.welcomeDone) return false;
  return welcomeParam || !!st.welcomeStarted || looksNewUser();
}

function welcomeSteps() {
  const st = settings();
  const year = st.startYear || 2025;
  const now = new Date().getFullYear();
  const years = Array.from({ length: 9 }, (_, i) => now - 7 + i);
  return [
    { id: 'google', icon: '☁️', title: 'התחבר עם Google', must: true,
      text: 'כך הנתונים שלך נשמרים בגוגל דרייב שלך (בתיקייה מוסתרת שרק האפליקציה רואה) ומסתנכרנים בין הטלפון, האייפד והמחשב. אף אחד אחר לא רואה אותם.',
      done: Sync.connected, btn: 'התחבר עם Google', run: () => connectGoogle() },
    { id: 'grades', icon: '📄', title: 'ייבא גיליון ציונים', must: true,
      text: 'ב-<a href="https://students.technion.ac.il" target="_blank" rel="noopener">פורטל הסטודנטים</a> ← גיליון ציונים ← הורד PDF, ובחר אותו כאן. הקורסים, הציונים, הסמסטרים ושנת ההתחלה ייכנסו לבד.',
      done: !!st.gradesImportedAt || courses().some(c => c.grade != null), skip: 'אין לי עדיין ציונים',
      btn: 'בחר קובץ PDF', run: () => $('#gradeFile').click() },
    { id: 'plan', icon: '📚', title: 'הוסף מערכת מומלצת', must: true,
      text: 'התוכנית המומלצת של המסלול שלך, לפי השנה שבה התחלת: מובנית (הנדסת מכונות), מחוברת הפקולטה בעזרת AI, מקובץ שחבר שיתף, או הסדר שלך.',
      done: !!st.planId, btn: 'בחר תוכנית', run: () => openPlanPicker() },
    { id: 'year', icon: '🗓️', title: 'שנת התחלה', must: true,
      text: `באיזו שנה התחלת את התואר? לפי זה נקבעים שמות הסמסטרים והמערכות מ-CheeseFork.
        <select id="wYear">${years.map(y => `<option value="${y}" ${y === year ? 'selected' : ''}>חורף ${y}–${y + 1}</option>`).join('')}</select>`,
      done: !!st.startYearConfirmed, btn: 'אישור', run: () => {
        Store.put('meta', 'settings', { startYear: +$('#wYear').value, startYearConfirmed: true });
        Sync.schedule(500);
      } },
    { id: 'calendar', icon: '📅', title: 'חבר יומן', must: false,
      text: 'Google Calendar נכנס עם החיבור ל-Google. יומן של אפל (iCloud) או Outlook: מוסיפים לפי קישור בהגדרות.',
      done: GCal.googleReady() || icsFeeds().length > 0, skip: 'לא עכשיו',
      btn: 'להגדרות היומן', run: () => { go('settings'); setTimeout(() => $('#icsSection')?.scrollIntoView({ behavior: 'smooth' }), 150); } },
    { id: 'ai', icon: '🤖', title: 'מפתח AI (לא חובה)', must: false,
      text: 'ליועץ התואר, לסריקת ההזדמנויות השבועית, לקורות חיים ולבניית תוכנית מחוברת. מפתח אישי שלך מ-Anthropic, נשמר רק במכשיר; צריך להטעין קרדיט בחשבון (שאלה עולה כמה סנטים).',
      done: !!claudeKey(), skip: 'בלי AI', btn: 'הגדר מפתח', run: () => openAdvisor() },
    { id: 'tour', icon: '🧭', title: 'סיור קצר באפליקציה', must: false,
      text: 'דקה וחצי שמראה איפה הכול.', done: !!lsGet(TOUR_LS), skip: 'דלג', btn: 'התחל סיור', run: () => startTour() },
  ].map(s => ({ ...s, skipped: !s.done && welcomeSkipped(s.id) }));
}

function welcomeCard() {
  if (!welcomeVisible()) return '';
  const st = settings();
  // Opened by the ?welcome link: keep showing it after the grades come in.
  if (welcomeParam && !st.welcomeStarted) setTimeout(() => startWelcome(), 0);
  const steps = welcomeSteps();
  const finished = steps.filter(s => s.done || s.skipped).length;
  const next = steps.find(s => !s.done && !s.skipped);
  return `<section class="panel welcome" id="welcome">
    <div class="perf-head"><h2>🚀 צעדים ראשונים</h2><span class="muted">${finished}/${steps.length}</span></div>
    <div class="welcome-bar"><i style="width:${finished / steps.length * 100}%"></i></div>
    ${!next ? `<p class="good">🎉 הכול מוכן! אפשר לחזור לכאן מההגדרות בכל רגע.</p>` : ''}
    <ol class="welcome-steps">${steps.map(s => `
      <li class="w-step ${s.done ? 'done' : s.skipped ? 'skipped' : ''} ${s === next ? 'next' : ''}">
        <span class="w-check">${s.done ? '✓' : s.skipped ? '–' : ''}</span>
        <div class="w-body">
          <b>${s.icon} ${s.title}</b>${s.must ? '' : ' <small class="muted">(רשות)</small>'}
          ${s === next || (!s.done && !s.skipped && s.id === 'year') ? `<p class="muted">${s.text}</p>` : ''}
          ${!s.done ? `<div class="row wrap">
            <button type="button" class="btn small ${s === next ? 'primary' : ''}" data-wrun="${s.id}">${s.btn}</button>
            ${s.skip && !s.skipped ? `<button type="button" class="btn small ghost" data-wskip="${s.id}">${s.skip}</button>` : ''}
          </div>` : ''}
        </div>
      </li>`).join('')}</ol>
    <div class="row wrap welcome-foot">
      <button type="button" class="btn small" id="wShare">🔗 שלח את האפליקציה לחבר</button>
      <a class="btn small ghost" href="privacy.html" target="_blank" rel="noopener">🔒 פרטיות</a>
      <button type="button" class="btn small ghost" id="wHide">${next ? 'הסתר' : 'סגור'}</button>
    </div>
  </section>`;
}

function bindWelcome(root) {
  const card = $('#welcome', root);
  if (!card) return;
  const steps = welcomeSteps();
  // Working on any step past "connect" marks the checklist as started, so it stays until
  // it's done (an existing user on a new device only connects, then their data hides it).
  $$('[data-wrun]', card).forEach(b => b.onclick = () => {
    if (b.dataset.wrun !== 'google') startWelcome();
    steps.find(s => s.id === b.dataset.wrun)?.run();
  });
  $$('[data-wskip]', card).forEach(b => b.onclick = () => {
    startWelcome();
    Store.put('meta', 'settings', { welcomeSkip: [...new Set([...(settings().welcomeSkip || []), b.dataset.wskip])] });
  });
  $('#wHide', card).onclick = () => {
    Store.put('meta', 'settings', { welcomeDone: true });
    toast('אפשר לפתוח את הצעדים הראשונים שוב מההגדרות', () => Store.put('meta', 'settings', { welcomeDone: false }));
  };
  $('#wShare', card).onclick = () => shareApp();
}

function startWelcome() {
  if (!settings().welcomeStarted) Store.put('meta', 'settings', { welcomeStarted: true });
}

function reopenWelcome() {
  Store.put('meta', 'settings', { welcomeDone: false, welcomeStarted: true });
  go('map');
  setTimeout(() => $('#welcome')?.scrollIntoView({ behavior: 'smooth' }), 150);
}

// The link a friend opens: it starts them on the checklist with their own, empty app.
function shareApp() {
  const url = WELCOME_LINK();
  const text = `"התואר שלי": תכנון תואר, ציונים, משימות ומערכת שעות לטכניון. כל אחד מתחבר עם ה-Google שלו והנתונים שלו נשארים אצלו: ${url}`;
  if (navigator.share) return navigator.share({ title: 'התואר שלי', text, url }).catch(() => {});
  navigator.clipboard.writeText(url).then(() => toast('הקישור הועתק: שלח אותו לחבר')).catch(() => prompt('העתק את הקישור:', url));
}
