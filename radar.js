// 🛰️ Opportunity radar: once a week Claude searches the web for hackathons, competitions,
// scholarships, events and internships that fit you, and the results show in
// תכנון תואר ← הזדמנויות under their own heading. Uses your AI key (הגדרות AI);
// without one you get a list of places to look. The results sync, so one device a week
// does the search for all of them.

const RADAR_EVERY = 7 * MS_DAY;
const RADAR_KINDS = {
  hackathon: { icon: '💻', label: 'האקתון' },
  competition: { icon: '🏆', label: 'תחרות' },
  scholarship: { icon: '🎓', label: 'מלגה' },
  event: { icon: '🎤', label: 'אירוע / כנס' },
  internship: { icon: '💼', label: 'משרת סטודנט / התמחות' },
  program: { icon: '🚀', label: 'תוכנית' },
  other: { icon: '📌', label: 'אחר' },
};
const RADAR_SOURCES = [
  ['📅 אירועים בטכניון', 'https://www.technion.ac.il/events/'],
  ['🎓 דיקנאט הסטודנטים', 'https://dean.technion.ac.il/'],
  ['⚙️ הפקולטה להנדסת מכונות', 'https://meeng.technion.ac.il/'],
  ['💻 חיפוש האקתונים לסטודנטים', 'https://www.google.com/search?q=%D7%94%D7%90%D7%A7%D7%AA%D7%95%D7%9F+%D7%A1%D7%98%D7%95%D7%93%D7%A0%D7%98%D7%99%D7%9D+%D7%98%D7%9B%D7%A0%D7%99%D7%95%D7%9F'],
];

let radarBusy = false, radarError = null;
const radarData = () => Store.get('meta', 'radar') || { items: [], checkedAt: 0 };
const radarDue = () => Date.now() - (radarData().checkedAt || 0) > RADAR_EVERY;

const RADAR_TOOL = {
  name: 'save_opportunities',
  description: 'Save the opportunities you found. Call this exactly once, at the end, with every item you found (an empty list if nothing fits).',
  strict: true,
  input_schema: {
    type: 'object', additionalProperties: false, required: ['items'],
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false,
          required: ['title', 'kind', 'date', 'deadline', 'location', 'url', 'summary', 'why'],
          properties: {
            title: { type: 'string', description: 'Name of the opportunity, as published' },
            kind: { type: 'string', enum: Object.keys(RADAR_KINDS) },
            date: { type: 'string', description: 'When it happens, YYYY-MM-DD, or "" if unknown/ongoing' },
            deadline: { type: 'string', description: 'Registration or application deadline, YYYY-MM-DD, or ""' },
            location: { type: 'string', description: 'City / campus / online' },
            url: { type: 'string', description: 'The official page, taken from your search results' },
            summary: { type: 'string', description: 'One or two sentences on what it is' },
            why: { type: 'string', description: 'One short sentence on why it fits this student' },
          },
        },
      },
    },
  },
};

function radarPrompt() {
  const s = computeStats();
  const active = courses().filter(c => c.status === 'active').map(c => c.name);
  const planned = courses().filter(c => courseCat(c) !== 'mandatory' && !isComplete(c)).map(c => c.name);
  const lang = typeof LANG !== 'undefined' && LANG === 'en' ? 'English' : 'Hebrew';
  return `Today is ${ymd(new Date())}. Find opportunities for an undergraduate Mechanical Engineering student at the Technion (Haifa, Israel), semester ${currentSemesterNumber()}, average ${s.gpa === null ? 'n/a' : fmt(s.gpa, 1)}, ${fmt(s.doneCredits)} credits done.
Studying now: ${active.join(', ') || '—'}. Electives planned: ${planned.join(', ') || '—'}.

Search the web for things happening or open for registration in roughly the next 8 weeks:
- hackathons (Technion, other Israeli universities, companies, online) that engineering students can join
- engineering / robotics / design / entrepreneurship competitions
- scholarships and grants for Technion or Israeli engineering students (including reserve-duty students)
- conferences, workshops, meetups and career fairs relevant to mechanical engineering, robotics, AI or energy
- student positions, internships and summer programs

Rules: only real items you found in search results, with their official link; skip anything whose date and deadline have both passed; at most 12 items, most relevant first.
Write title, summary and why in ${lang}. Then call save_opportunities once with the list.`;
}

async function runRadar({ quiet = false } = {}) {
  if (radarBusy || !claudeKey()) return;
  radarBusy = true; radarError = null;
  if (currentView === 'planner') render();
  try {
    const client = await claudeClient();
    const user = { role: 'user', content: radarPrompt() };
    let assistant = [], final;
    // Web search runs on Anthropic's side; a long search can pause and must be resumed.
    for (let i = 0; i < 4; i++) {
      final = await client.beta.messages.stream({
        model: CV_MODEL,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium' },
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 6 }, RADAR_TOOL],
        messages: assistant.length ? [user, { role: 'assistant', content: assistant }] : [user],
      }).finalMessage();
      assistant = [...assistant, ...final.content];
      if (final.stop_reason !== 'pause_turn') break;
    }
    if (final.stop_reason === 'refusal') throw new Error('הבקשה נדחתה על ידי Claude');
    const call = assistant.find(b => b.type === 'tool_use' && b.name === RADAR_TOOL.name);
    if (!call) throw new Error('החיפוש לא הסתיים ברשימה. נסה שוב.');
    const prev = new Set(radarData().items.map(x => x.url));
    const items = (call.input?.items || [])
      .filter(x => x && x.title && /^https:\/\//.test(x.url) && RADAR_KINDS[x.kind])
      .slice(0, 12)
      .map(x => ({ ...x, found: prev.has(x.url) ? (radarData().items.find(p => p.url === x.url)?.found || Date.now()) : Date.now() }));
    Store.put('meta', 'radar', { items, checkedAt: Date.now() });
    const fresh = items.filter(x => !prev.has(x.url)).length;
    if (!quiet || fresh) toast(fresh ? `🛰️ נמצאו ${fresh} הזדמנויות חדשות` : 'אין הזדמנויות חדשות השבוע');
  } catch (e) {
    console.error(e);
    radarError = aiErrorHtml(e); // already escaped
    if (!quiet) toast('⚠️ בדיקת ההזדמנויות נכשלה');
  } finally {
    radarBusy = false;
    if (currentView === 'planner') render();
  }
}

// Items still relevant: no date at all, or a date/deadline from today on.
function radarItems() {
  const today = ymd(new Date());
  return radarData().items.filter(x => !(x.date || x.deadline) || (x.date || '') >= today || (x.deadline || '') >= today);
}

function radarHtml() {
  const d = radarData(), items = radarItems(), has = !!claudeKey();
  const when = d.checkedAt ? new Date(d.checkedAt).toLocaleDateString(LOCALE, { day: 'numeric', month: 'numeric', year: 'numeric' }) : '';
  const fmtDay = s => s ? new Date(s + 'T00:00').toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'numeric' }) : '';
  const isNew = x => Date.now() - (x.found || 0) < RADAR_EVERY;
  return `<section class="radar">
    <div class="radar-head"><h2>🛰️ האקתונים, תחרויות ואירועים</h2>
      ${has ? `<button type="button" class="btn small" id="radarRun" ${radarBusy ? 'disabled' : ''}>${radarBusy ? '⏳ מחפש…' : '🔄 בדוק עכשיו'}</button>` : ''}</div>
    <p class="muted">${has
      ? `פעם בשבוע Claude מחפש ברשת האקתונים, תחרויות, מלגות, כנסים ומשרות סטודנט שמתאימים לך. ${when ? `בדיקה אחרונה: ${when}.` : 'עוד לא נבדק.'} כל בדיקה עולה בערך 20–50 סנט.`
      : 'עם מפתח AI (קו״ח ← 🤖 הגדרות AI) האפליקציה תחפש בשבילך פעם בשבוע. עד אז, כאן כדאי לבדוק:'}</p>
    ${radarError ? `<p class="warn">⚠️ ${radarError}</p>` : ''}
    ${items.length ? `<div class="radar-list">${items.map((x, i) => {
      const k = RADAR_KINDS[x.kind] || RADAR_KINDS.other;
      return `<div class="radar-item">
        <div class="ri-top"><span class="ri-kind">${k.icon} ${k.label}</span>${isNew(x) ? '<span class="badge-new">חדש</span>' : ''}</div>
        <h3>${esc(x.title)}</h3>
        <p class="ri-meta">${x.date ? `📅 ${fmtDay(x.date)}` : ''}${x.deadline ? ` · ⏳ הרשמה עד ${fmtDay(x.deadline)}` : ''}${x.location ? ` · 📍 ${esc(x.location)}` : ''}</p>
        <p>${esc(x.summary)}</p>
        ${x.why ? `<p class="muted">💡 ${esc(x.why)}</p>` : ''}
        <div class="link-row"><a class="btn small" href="${esc(x.url)}" target="_blank" rel="noopener">לפרטים ↗</a>
          ${x.deadline || x.date ? `<button type="button" class="btn small" data-radartask="${i}">＋ תזכורת במשימות</button>` : ''}</div>
      </div>`;
    }).join('')}</div>` : has && d.checkedAt ? '<p class="muted">לא נמצאו הזדמנויות פתוחות כרגע.</p>' : ''}
    ${!has || !items.length ? `<div class="link-row">${RADAR_SOURCES.map(([l, u]) => `<a class="btn small" href="${esc(u)}" target="_blank" rel="noopener">${l}</a>`).join('')}</div>` : ''}
  </section>`;
}

function bindRadar(root) {
  $('#radarRun', root)?.addEventListener('click', () => runRadar());
  $$('[data-radartask]', root).forEach(b => b.onclick = () => {
    const x = radarItems()[+b.dataset.radartask];
    if (!x) return;
    editTask(null, { title: x.title, type: 'other', due: x.deadline || x.date, notes: `${x.summary}\n${x.url}` });
  });
}

// The weekly check: a little after launch, quietly, only when it's due and you're online.
// It waits for the sync first, so a check another device already did this week is seen.
(function radarWeekly(tries = 0) {
  setTimeout(() => {
    if (Sync.state === 'syncing' && tries < 6) return radarWeekly(tries + 1);
    if (claudeKey() && navigator.onLine && radarDue()) runRadar({ quiet: true });
  }, 10000);
})();
