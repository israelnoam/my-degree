// 🤖 יועץ תואר: a chat about your degree, answered by Claude from your own data
// (plan, grades, requirements, tasks, reserve rights, CheeseFork). It only advises:
// it has no tools and the app never applies anything it says.
// Reuses cv.js: the device-only API key (הגדרות AI), the SDK loader and the model.

const ADVISOR_SUGGESTIONS = [
  'מה כדאי לי לקחת בסמסטר הבא?',
  'האם אני בקצב לסיים את התואר בזמן?',
  'מה יקרה לממוצע שלי אם אקבל 90 בכל הקורסים שאני לומד עכשיו?',
  'אילו דרישות בחירה עוד חסרות לי?',
  'איך עובר בינארי במילואים ישפיע על הממוצע שלי?',
];

let advisorMsgs = []; // [{role, content}] – this session only
let advisorBusy = false;
let advisorDlg;

// Everything the advisor knows about you, rebuilt from live app state on every question.
function advisorContext() {
  const s = computeStats();
  const p = degreeProgress();
  const R = DEGREE_RULES;
  const bucket = (label, keys, need) => `${label}: הושלם ${fmt(p.sum(keys, 'done'))}, בלימוד ${fmt(p.sum(keys, 'now'))}, מתוכנן ${fmt(p.sum(keys, 'plan'))} / נדרש ${need}`;
  const listCount = Object.entries(R.minCourses).map(([l, m]) => {
    const b = p.get(l).courses;
    return `רשימה ${LISTS[l].short}: ${b.done.length} הושלמו, ${b.now.length + b.plan.length} בתכנון / לפחות ${m} קורסים`;
  });
  const courseLine = c => {
    const st = STATUS[courseState(c)].label;
    const cat = LISTS[courseCat(c)]?.name || 'חובה';
    return `- ${c.code} | ${c.name} | ${fmt(c.credits)} נק״ז | ${c.sem ? semName(c.sem) : 'לא משובץ'} | ${st}${c.grade != null && c.grade !== '' ? ` | ציון ${c.grade}` : ''} | ${cat}`;
  };
  const inPlan = new Set(courses().map(c => c.code));
  const soon = tasksWithin(30);
  const groups = settings().reserve || {};
  return `היום: ${new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}. הסמסטר הנוכחי בתוכנית: ${currentSemesterNumber()} (${semName(currentSemesterNumber())}).

## מצב כללי
ממוצע משוקלל: ${s.gpa === null ? 'אין עדיין' : fmt(s.gpa, 2)} · נק״ז שהושלמו: ${fmt(s.doneCredits)} מתוך ${fmt(s.total)} · קורסים שהושלמו: ${s.doneCount} · נק״ז בלימוד עכשיו: ${fmt(s.activeCredits)}
ספי הצטיינות: דיקן ${HONORS.dean}+, נשיא ${HONORS.president}+, בסמסטר עם לפחות ${HONORS.minCredits} נק״ז מדורגות.

## דרישות התואר (הנדסת מכונות, טכניון) והתקדמות
סה״כ: הושלם ${fmt(p.all('done'))}, בלימוד ${fmt(p.all('now'))}, מתוכנן ${fmt(p.all('plan'))} / נדרש ${R.total}
${bucket('חובה פקולטית', ['mandatory'], R.mandatory)}
${bucket('בחירה מתקדמת א׳–ה׳', p.elec, R.electives)}
${listCount.join('\n')}
ב׳+ג׳+ד׳ יחד: הושלם ${fmt(p.sum(['B', 'C', 'D'], 'done'))} / לפחות ${R.minBCD} נק״ז
${bucket('פרויקט גמר', ['project'], R.project)}
${bucket('מל״ג', ['malag'], R.malag)}
${bucket('כלל טכניונית', ['general'], R.general)}
${bucket('חינוך גופני', ['sports'], R.sports)}

## כל הקורסים בתוכנית (קוד | שם | נק״ז | סמסטר | סטטוס | ציון | קטגוריה)
${courses().map(courseLine).join('\n')}

## קורסי בחירה שעוד לא בתוכנית (קוד | שם | נק״ז | רשימה)
${ELECTIVES.filter(e => !inPlan.has(e[0])).map(([code, name, cr, l]) => `- ${code} | ${name} | ${cr} | ${LISTS[l].short}`).join('\n')}

## משימות ומבחנים פתוחים (באיחור ו-30 הימים הקרובים)
${soon.length ? soon.map(t => `- ${t.due.slice(0, 16).replace('T', ' ')} | ${(TASK_TYPES[t.type] || TASK_TYPES.other).label} | ${t.title}${t.course ? ` | ${courseLabel(t.course)}` : ''}${dueText(t).overdue ? ' | באיחור' : ''}`).join('\n') : 'אין.'}

## מילואים
קבוצות המילואים שסימנתי לפי סמסטר: ${Object.entries(groups).filter(([, g]) => +g).map(([s, g]) => `סמסטר ${s}: קבוצה ${g}`).join(', ') || 'לא סימנתי'}.
הגדרת הקבוצות: ${Object.entries(RESERVE.groups).map(([g, t]) => `${g} – ${t}`).join('; ')}.
עובר בינארי: ציון ${RESERVE.binaryMinGrade}+, הנק״ז נשארות והציון יוצא מהממוצע; לשנה לפי קבוצה ${JSON.stringify(RESERVE.binaryPerYear)}; עד ${RESERVE.binaryMaxDegree} בתואר ועד ${RESERVE.binaryMaxShare * 100}% מנק״ז התואר. פטור מנק״ז לפי קבוצה: ${JSON.stringify(RESERVE.creditExemption)}. הארכת לימודים: ${Object.entries(RESERVE.extensions).map(([g, t]) => `קבוצה ${g}: ${t}`).join('; ')}.
זכויות נוספות: מועד מיוחד למבחן שהוחמץ בגלל שירות, 25% תוספת זמן, הארכת הגשות לפי ימי השירות, פטור משכר לימוד בקיץ (קורס אחד ב-22+ ימי שירות בשנה, שניים ב-30+). רכזת מילואים: ${RESERVE.email}.`;
}

const ADVISOR_SYSTEM = `אתה "יועץ התואר" באפליקציה אישית של סטודנט/ית להנדסת מכונות בטכניון.
ענה בעברית, בקצרה ולעניין, על סמך הנתונים שלמטה (הם המצב העדכני מתוך האפליקציה). כשאתה מחשב (ממוצע, נק״ז, קצב), הראה את החישוב בשורה אחת.
אם חסר מידע כדי לענות, אמור מה חסר. אל תמציא קורסים, ציונים, תאריכים או נהלים; בשאלות על נהלים וזכויות ציין שצריך לאמת מול הפקולטה.
אתה רק מייעץ: אין לך שום יכולת לשנות את התוכנית, הציונים או המשימות. כשאתה ממליץ על שינוי, הסבר איפה באפליקציה עושים אותו (למשל "תכנון תואר ← קורסי בחירה ← ＋ לתוכנית").
עיצוב: טקסט רגיל, אפשר **הדגשה** ורשימות עם "- ". בלי טבלאות.`;

// Courses named in the question (by number or name) get their CheeseFork data added.
async function advisorCourseFacts(question) {
  const q = norm(question);
  const pool = [...courses().map(c => [c.code, c.name]), ...ELECTIVES.map(e => [e[0], e[1]])];
  const hits = [...new Map(pool.filter(([code, name]) => q.includes(code) || (name.length > 3 && q.includes(norm(name)))).map(x => [x[0], x])).values()].slice(0, 4);
  const out = [];
  for (const [code, name] of hits) {
    const crs = await withTimeout(cfCourse(code), 10000).catch(() => null);
    const g = crs?.general;
    if (!g) { out.push(`### ${name} (${code})\nאין נתוני CheeseFork.`); continue; }
    const groups = cfGroups(crs);
    out.push(`### ${name} (${code})
דרישות קדם: ${g['מקצועות קדם'] || 'אין'}${g['מקצועות קדם'] ? ` (${evalPrereqs(g['מקצועות קדם'], doneCode8Check()).ok ? 'מולאו' : 'חסרות'})` : ''}
מקצועות צמודים: ${g['מקצועות צמודים'] || 'אין'}
מועד א׳: ${g['מועד א'] || '—'} · מועד ב׳: ${g['מועד ב'] || '—'}
אחראים: ${g['אחראים'] || '—'}
נפתח בסמסטרים: ${CF.offeredIn(code).sort().map(cfKeyLabel).join(', ') || 'לא נמצא'}
קבוצות: ${Object.entries(groups).map(([t, gs]) => `${t} ${Object.keys(gs).length}`).join(', ') || '—'}
סילבוס: ${g['סילבוס'] || '—'}`);
  }
  return out.length ? `\n\n## נתוני CheeseFork לקורסים שבשאלה\n${out.join('\n\n')}` : '';
}

// Escaped text with **bold**, "- " bullets and line breaks.
function advisorMd(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/^#{1,4}\s*(.+)$/gm, '<b>$1</b>')
    .replace(/^\s*[-•]\s+(.+)$\n?/gm, '<span class="adv-li">$1</span>')
    .replace(/\n/g, '<br>');
}

function openAdvisor() {
  if (!advisorDlg) {
    advisorDlg = document.createElement('dialog');
    advisorDlg.id = 'xAdvisorDlg';
    document.body.appendChild(advisorDlg);
    advisorDlg.addEventListener('click', e => { if (e.target === advisorDlg) advisorDlg.close(); });
  }
  drawAdvisor();
  if (!advisorDlg.open) advisorDlg.showModal();
  $('#advInput', advisorDlg)?.focus();
}

function drawAdvisor() {
  const has = !!claudeKey();
  advisorDlg.innerHTML = `
    <div class="adv-head"><h2>🤖 יועץ תואר</h2><span class="spacer"></span>
      ${advisorMsgs.length ? '<button class="btn small" type="button" id="advClear">🗑️ שיחה חדשה</button>' : ''}
      <button class="btn small" type="button" id="advClose" aria-label="סגור">✕</button></div>
    ${has ? `
      <div class="adv-log" id="advLog">${advisorMsgs.length ? advisorMsgs.map(m => `<div class="adv-msg ${m.role}">${m.role === 'user' ? esc(m.content).replace(/\n/g, '<br>') : advisorMd(m.content)}</div>`).join('')
        : `<div class="adv-intro"><p>שאל אותי על התואר שלך: מה לקחת בהמשך, אם אתה בקצב, מה יקרה לממוצע אם…, דרישות וזכויות מילואים. אני רואה את התוכנית, הציונים, המשימות ונתוני CheeseFork.</p>
          <div class="chips">${ADVISOR_SUGGESTIONS.map(s => `<button type="button" class="chip" data-advq="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>`}</div>
      <form class="adv-form" id="advForm">
        <textarea id="advInput" rows="2" placeholder="שאל שאלה על התואר… (Enter לשליחה, Shift+Enter לשורה חדשה)" ${advisorBusy ? 'disabled' : ''}></textarea>
        <button class="btn primary" type="submit" ${advisorBusy ? 'disabled' : ''}>שלח</button>
      </form>
      <p class="muted adv-note">היועץ רק מציע – הוא לא משנה את התוכנית, הציונים או המשימות. כל שאלה נשלחת ל-Anthropic עם נתוני התואר שלך (עולה כמה סנטים).</p>`
    : `<div class="narrow-block">
      <p>היועץ משתמש ב-Claude עם מפתח API משלך – אותו מפתח של התאמת קורות החיים.</p>
      <ol class="howto">
        <li>צור מפתח API ב-<a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a> (נדרש חיוב לפי שימוש; שאלה עולה בדרך כלל כמה סנטים).</li>
        <li>הדבק אותו בלשונית <b>קו״ח ← 🤖 הגדרות AI</b>. המפתח נשמר <b>רק במכשיר הזה</b>: הוא לא מסתנכרן ל-Google ולא נשלח לשום מקום חוץ מ-Anthropic.</li>
      </ol>
      <button class="btn primary" type="button" id="advToSettings">🤖 להגדרות AI</button></div>`}`;

  $('#advClose', advisorDlg).onclick = () => advisorDlg.close();
  $('#advClear', advisorDlg)?.addEventListener('click', () => { if (!advisorBusy) { advisorMsgs = []; drawAdvisor(); } });
  $('#advToSettings', advisorDlg)?.addEventListener('click', () => { advisorDlg.close(); cvTab = 'ai'; go('cv'); });
  $$('[data-advq]', advisorDlg).forEach(b => b.onclick = () => askAdvisor(b.dataset.advq));
  const form = $('#advForm', advisorDlg), input = $('#advInput', advisorDlg);
  if (form) {
    form.onsubmit = e => { e.preventDefault(); askAdvisor(input.value); };
    input.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAdvisor(input.value); } };
  }
  const log = $('#advLog', advisorDlg);
  if (log) log.scrollTop = log.scrollHeight;
}

async function askAdvisor(question) {
  question = String(question || '').trim();
  if (!question || advisorBusy) return;
  advisorBusy = true;
  advisorMsgs.push({ role: 'user', content: question });
  const answer = { role: 'assistant', content: '' };
  advisorMsgs.push(answer);
  drawAdvisor();
  const bubble = $$('.adv-msg.assistant', advisorDlg).pop();
  bubble.innerHTML = '<span class="muted">חושב…</span>';
  const log = $('#advLog', advisorDlg);
  try {
    const system = `${ADVISOR_SYSTEM}\n\n# הנתונים שלי\n${advisorContext()}${await advisorCourseFacts(question)}`;
    const client = await claudeClient();
    const stream = client.beta.messages.stream({
      model: CV_MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      system,
      // The answer being written is the last (empty) entry: send the turns before it.
      messages: advisorMsgs.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
    });
    for await (const ev of stream) {
      if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
        answer.content += ev.delta.text;
        if (bubble.isConnected) {
          bubble.innerHTML = advisorMd(answer.content);
          log.scrollTop = log.scrollHeight;
        }
      }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') throw new Error('הבקשה נדחתה על ידי Claude' + (final.stop_details?.explanation ? `: ${final.stop_details.explanation}` : ''));
    if (final.stop_reason === 'max_tokens') answer.content += '\n\n(התשובה נחתכה)';
    // Use the final text: a server-side fallback may have restarted the answer mid-stream.
    const text = final.content.filter(b => b.type === 'text').map(b => b.text).join('');
    if (text) answer.content = text;
  } catch (e) {
    console.error(e);
    // Drop the failed turn so the conversation stays valid; keep the question in the box to retry.
    advisorMsgs.splice(-2, 2);
    advisorBusy = false;
    drawAdvisor();
    $('#advInput', advisorDlg).value = question;
    $('#advLog', advisorDlg).insertAdjacentHTML('beforeend', `<p class="warn">⚠️ ${esc(e.status === 401 ? 'מפתח ה-API לא תקין. בדוק אותו בהגדרות AI.' : e.message || e)}</p>`);
    return;
  }
  advisorBusy = false;
  drawAdvisor();
}
