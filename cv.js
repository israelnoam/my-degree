// קורות חיים: a CV generator. One base profile (synced like everything else),
// plus "targets" (a job / company) that each get their own tailored version.
//
// Tailoring works two ways:
//  - Built in, no AI: keywords from the job ad reorder sections, entries,
//    bullets and skills, and show what's covered and what's missing.
//  - Optional AI: with your own Anthropic API key (kept on this device only),
//    Claude rewrites the CV for the target, never inventing facts.
// The structure follows JSON Resume; templates are single-column and ATS-friendly.

const ANTHROPIC_SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.133.0/+esm';
const MAMMOTH_URL = 'https://cdn.jsdelivr.net/npm/mammoth@1.13.0/mammoth.browser.min.js';
const CV_MODEL = 'claude-opus-5-5';
const LS_CLAUDE_KEY = 'pp_claude_key'; // device-only, never synced

const CV_SECTIONS = {
  education: { he: 'השכלה', en: 'Education', fields: [['degree', 'תואר'], ['area', 'תחום'], ['institution', 'מוסד'], ['start', 'התחלה'], ['end', 'סיום'], ['gpa', 'ממוצע']] },
  work: { he: 'ניסיון תעסוקתי', en: 'Experience', fields: [['position', 'תפקיד'], ['company', 'חברה'], ['location', 'מיקום'], ['start', 'התחלה'], ['end', 'סיום']] },
  projects: { he: 'פרויקטים', en: 'Projects', fields: [['name', 'שם הפרויקט'], ['role', 'תפקיד'], ['start', 'התחלה'], ['end', 'סיום']] },
  military: { he: 'שירות צבאי', en: 'Military Service', fields: [['role', 'תפקיד'], ['unit', 'יחידה'], ['start', 'התחלה'], ['end', 'סיום']] },
  volunteer: { he: 'התנדבות', en: 'Volunteering', fields: [['role', 'תפקיד'], ['organization', 'ארגון'], ['start', 'התחלה'], ['end', 'סיום']] },
  awards: { he: 'פרסים והצטיינויות', en: 'Awards', fields: [['title', 'שם'], ['awarder', 'מטעם'], ['date', 'תאריך']], noBullets: true },
};
const SECTION_ORDER = ['education', 'work', 'projects', 'military', 'volunteer', 'awards'];
const CV_LABELS = {
  he: { summary: 'תקציר', skills: 'כישורים', languages: 'שפות' },
  en: { summary: 'Summary', skills: 'Skills', languages: 'Languages' },
};
const CV_TEMPLATES = { classic: 'קלאסי', modern: 'מודרני', compact: 'צפוף (עמוד אחד)' };

// Words that help when they appear in a job ad for an engineering student.
const SKILL_WORDS = ['solidworks', 'catia', 'creo', 'nx', 'inventor', 'autocad', 'fusion 360', 'ansys', 'abaqus', 'comsol', 'fea', 'fem', 'cfd',
  'matlab', 'simulink', 'python', 'c++', 'c#', 'java', 'labview', 'ros', 'git', 'linux', 'excel', 'sql', 'arduino', 'raspberry pi', 'plc',
  'gd&t', 'dfm', 'cnc', '3d printing', 'machining', 'cad', 'cam', 'pcb', 'embedded', 'control', 'robotics', 'mechatronics', 'thermodynamics',
  'fluid', 'heat transfer', 'vibration', 'dynamics', 'design', 'manufacturing', 'testing', 'prototyping', 'machine learning', 'ai', 'data analysis',
  'תכן', 'ייצור', 'בקרה', 'רובוטיקה', 'מכטרוניקה', 'אנליזה', 'ניסויים', 'אב טיפוס', 'סימולציה', 'תרמודינמיקה', 'זרימה', 'חוזק', 'אלמנטים סופיים',
  'פיתוח', 'מכני', 'תעשייה', 'אוטומציה', 'עבודת צוות', 'אנגלית'];
const STOP = new Set(('the a an and or of to in for on with at by from as is are be will you your our we us this that it its into such ' +
  'experience years year work team ability strong good knowledge skills requirements required preferred plus job role position company candidate ' +
  'looking seeking join including advantage etc new great excellent responsible responsibilities ' +
  'של את על עם או גם כל לא יש היא הוא הם אנו אנחנו זה זו כי אם אשר בין עד לפחות יתרון חובה דרישות התפקיד תפקיד ניסיון ידע היכרות ' +
  'עבודה משרה מועמד מועמדת שנים שנות יכולת יכולות טובה גבוהה מאוד בתחום כולל למשרה דרוש דרושה דרושים ל ב ה ו מ ש כ').split(/\s+/));

let cvTab = 'profile';
let cvTargetId = null;

// ---------- data ----------
function emptyProfile() {
  return {
    basics: { name: '', label: '', email: '', phone: '', location: '', linkedin: '', github: '', website: '', summary: '' },
    education: [], work: [], projects: [], military: [], volunteer: [], awards: [],
    skills: '', languages: '',
  };
}
function cvProfile() {
  const p = Store.get('cv', 'profile');
  const base = emptyProfile();
  if (!p) return base;
  const out = { ...base, ...p, basics: { ...base.basics, ...(p.basics || {}) } };
  for (const k of SECTION_ORDER) if (!Array.isArray(out[k])) out[k] = [];
  return out;
}
let cvSaveTimer = null;
function saveProfile(p, now = false) {
  clearTimeout(cvSaveTimer);
  const write = () => {
    const { kind, id, u, del, ...data } = p;
    Store.recs['cv:profile'] = { ...data, kind: 'cv', id: 'profile', u: Date.now() };
    Store.persist();
  };
  if (now) write(); else cvSaveTimer = setTimeout(write, 600);
}
const cvTargets = () => Store.list('cvTarget').sort((a, b) => (b.created || 0) - (a.created || 0));
const claudeKey = () => { try { return localStorage.getItem(LS_CLAUDE_KEY) || ''; } catch { return ''; } };

// ---------- the normalised shape every template renders ----------
// { lang, basics:{name,label,contacts:[],summary}, sections:[{key,title,items:[{heading,sub,meta,bullets:[]}]}],
//   skills:[{name,keywords:[]}], languages:[], notes:[], matched:[], missing:[] }
function splitLines(s) { return String(s || '').split('\n').map(x => x.replace(/^[\s•\-*·▪●]+/, '').trim()).filter(Boolean); }

function parseSkills(text) {
  return splitLines(text).map(line => {
    const m = line.match(/^([^:]{1,40}):\s*(.+)$/);
    return m ? { name: m[1].trim(), keywords: m[2].split(/[,،;]/).map(s => s.trim()).filter(Boolean) }
      : { name: '', keywords: line.split(/[,،;]/).map(s => s.trim()).filter(Boolean) };
  });
}

function itemFromEntry(key, e) {
  const dates = [e.start, e.end].filter(Boolean).join(' – ') || e.date || '';
  const bullets = splitLines(e.highlights);
  switch (key) {
    case 'education': return { heading: [e.degree, e.area].filter(Boolean).join(', '), sub: e.institution, meta: dates, bullets: e.gpa ? [`GPA ${e.gpa}`].concat(bullets) : bullets };
    case 'work': return { heading: e.position, sub: [e.company, e.location].filter(Boolean).join(', '), meta: dates, bullets };
    case 'projects': return { heading: e.name, sub: e.role, meta: dates, bullets };
    case 'military': return { heading: e.role, sub: e.unit, meta: dates, bullets };
    case 'volunteer': return { heading: e.role, sub: e.organization, meta: dates, bullets };
    case 'awards': return { heading: e.title, sub: e.awarder, meta: e.date, bullets: [] };
  }
  return { heading: '', sub: '', meta: '', bullets };
}

function normalizeCv(p, lang = 'he') {
  const b = p.basics;
  return {
    lang,
    basics: {
      name: b.name, label: b.label, summary: b.summary,
      contacts: [b.email, b.phone, b.location, b.linkedin, b.github, b.website].filter(Boolean),
    },
    sections: SECTION_ORDER.map(key => ({
      key, title: CV_SECTIONS[key][lang],
      items: p[key].map(e => itemFromEntry(key, e)).filter(it => it.heading || it.sub || it.bullets.length),
    })).filter(s => s.items.length),
    skills: parseSkills(p.skills),
    languages: splitLines(p.languages),
    notes: [], matched: [], missing: [],
  };
}

// ---------- built-in tailoring (no AI) ----------
function keywordsFromAd(ad) {
  const text = String(ad || '').toLowerCase();
  const found = new Map();
  for (const w of SKILL_WORDS) if (text.includes(w)) found.set(w, 5);
  const words = text.replace(/[^\p{L}\p{N}+#&\s.-]/gu, ' ').split(/\s+/)
    .map(w => w.replace(/^[.-]+|[.-]+$/g, '')).filter(w => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
  for (const w of words) found.set(w, (found.get(w) || 0) + 1);
  return [...found.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([w]) => w);
}

function cvText(cv) {
  return [cv.basics.label, cv.basics.summary, ...cv.sections.flatMap(s => s.items.flatMap(i => [i.heading, i.sub, ...i.bullets])),
    ...cv.skills.flatMap(s => [s.name, ...s.keywords]), ...cv.languages].join(' ').toLowerCase();
}

function parseInstructions(text, lang) {
  const t = String(text || '').toLowerCase();
  const opts = { lang, maxBullets: null, hide: [] };
  if (/אנגלית|english/.test(t)) opts.lang = 'en';
  if (/עברית|hebrew/.test(t)) opts.lang = 'he';
  if (/עמוד אחד|one page|1 page|single page/.test(t)) opts.maxBullets = 3;
  const m = t.match(/(\d)\s*(?:נקודות|בולטים|bullets)/); if (m) opts.maxBullets = +m[1];
  if (/בלי (?:ה)?(?:צבא|שירות)|no military|without military/.test(t)) opts.hide.push('military');
  if (/בלי (?:ה)?התנדבות|no volunteer/.test(t)) opts.hide.push('volunteer');
  if (/בלי (?:ה)?פרסים|no awards/.test(t)) opts.hide.push('awards');
  return opts;
}

function tailorLocal(p, target) {
  const opts = parseInstructions(target.instructions, target.lang || 'he');
  const cv = normalizeCv(p, opts.lang);
  const own = new Set(String(target.company || '').toLowerCase().split(/\s+/));
  const kws = keywordsFromAd([target.role, target.jobAd].join(' ')).filter(k => !own.has(k));
  const score = s => kws.reduce((a, k) => a + (String(s).toLowerCase().includes(k) ? 1 : 0), 0);
  cv.sections = cv.sections.filter(s => !opts.hide.includes(s.key));
  for (const s of cv.sections) {
    for (const it of s.items) {
      it.bullets = it.bullets.map((b, i) => ({ b, s: score(b), i })).sort((a, b) => b.s - a.s || a.i - b.i).map(x => x.b);
      if (opts.maxBullets) it.bullets = it.bullets.slice(0, opts.maxBullets);
      it._s = score([it.heading, it.sub, ...it.bullets].join(' '));
    }
    if (['work', 'projects', 'volunteer'].includes(s.key)) s.items.sort((a, b) => b._s - a._s);
    s._s = s.items.reduce((a, it) => a + it._s, 0);
  }
  // Education stays first; the rest follow by relevance.
  const edu = cv.sections.filter(s => s.key === 'education');
  cv.sections = edu.concat(cv.sections.filter(s => s.key !== 'education').sort((a, b) => b._s - a._s));
  for (const g of cv.skills) g.keywords.sort((a, b) => score(b) - score(a));
  cv.skills.sort((a, b) => score(b.keywords.join(' ')) - score(a.keywords.join(' ')));
  const text = cvText(cv);
  cv.matched = kws.filter(k => text.includes(k));
  cv.missing = kws.filter(k => !text.includes(k)).slice(0, 15);
  cv.notes = [
    cv.missing.length ? `מילים מהמודעה שלא מופיעות בקו״ח: ${cv.missing.slice(0, 8).join(', ')}. אם יש לך ניסיון בהן, הוסף אותן לפרופיל.` : 'כל מילות המפתח העיקריות מהמודעה כבר מופיעות.',
    'הסדר שונה לפי הרלוונטיות למודעה. הנוסח עצמו לא השתנה. להתאמה מלאה של הנוסח השתמש ב-AI.',
  ];
  if (opts.lang === 'en' && /[֐-׿]/.test(text)) {
    cv.notes.push('חלק מהתוכן בעברית. לקו״ח באנגלית מלאה השתמש ב"התאם עם AI" (מתרגם), או כתוב את הפרופיל באנגלית.');
  }
  cv.source = 'local';
  return cv;
}

// ---------- AI tailoring (optional, your own API key) ----------
const CV_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['basics', 'sections', 'skills', 'languages', 'notes', 'matched', 'missing'],
  properties: {
    basics: {
      type: 'object', additionalProperties: false, required: ['name', 'label', 'contacts', 'summary'],
      properties: { name: { type: 'string' }, label: { type: 'string' }, contacts: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' } },
    },
    sections: {
      type: 'array', items: {
        type: 'object', additionalProperties: false, required: ['key', 'title', 'items'],
        properties: {
          key: { type: 'string' }, title: { type: 'string' },
          items: {
            type: 'array', items: {
              type: 'object', additionalProperties: false, required: ['heading', 'sub', 'meta', 'bullets'],
              properties: { heading: { type: 'string' }, sub: { type: 'string' }, meta: { type: 'string' }, bullets: { type: 'array', items: { type: 'string' } } },
            },
          },
        },
      },
    },
    skills: {
      type: 'array', items: {
        type: 'object', additionalProperties: false, required: ['name', 'keywords'],
        properties: { name: { type: 'string' }, keywords: { type: 'array', items: { type: 'string' } } },
      },
    },
    languages: { type: 'array', items: { type: 'string' } },
    notes: { type: 'array', items: { type: 'string' } },
    matched: { type: 'array', items: { type: 'string' } },
    missing: { type: 'array', items: { type: 'string' } },
  },
};

const CV_SYSTEM = `You are an expert CV writer for engineering students and graduates in Israel.
You tailor a candidate's CV to one specific job or company.
Hard rules:
- Use only facts present in the candidate data. Never invent employers, dates, numbers, tools, grades or achievements. You may rephrase, merge, shorten, reorder and drop content.
- Follow the candidate's own instructions unless they conflict with the rule above.
- Write in the requested language (Hebrew or English) and translate the content if needed. Section titles in that language too.
- Make it ATS-friendly: standard section titles, plain text, strong action verbs, keywords from the job ad only where the data supports them.
- Keep bullets short (one line each when possible), most relevant first; drop weak or unrelated bullets.
- "notes": 3-6 short, concrete suggestions to the candidate in Hebrew (what to add or strengthen for this target).
- "matched": job-ad keywords the CV now covers. "missing": important job-ad keywords the candidate's data doesn't support.`;

function aiPrompt(p, target) {
  const opts = parseInstructions(target.instructions, target.lang || 'he');
  return `Target: ${target.role || ''}${target.company ? ` at ${target.company}` : ''}
Language: ${opts.lang === 'en' ? 'English' : 'Hebrew'}
Template: ${target.template || 'classic'}

<job_ad>
${target.jobAd || '(none given)'}
</job_ad>

<candidate_instructions>
${target.instructions || '(none)'}
</candidate_instructions>

<candidate_data>
${JSON.stringify(normalizeCv(p, opts.lang), null, 1)}
</candidate_data>

Return the tailored CV as JSON in the given schema.`;
}

async function claudeClient() {
  const key = claudeKey();
  if (!key) throw new Error('צריך מפתח API של Anthropic (בלשונית "הגדרות AI")');
  const { default: Anthropic } = await import(ANTHROPIC_SDK_URL);
  return new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
}

async function callClaudeJson(system, prompt, schema) {
  const client = await claudeClient();
  const response = await client.beta.messages.create({
    model: CV_MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
    system,
    messages: [{ role: 'user', content: prompt }],
  });
  if (response.stop_reason === 'refusal') throw new Error('הבקשה נדחתה על ידי Claude' + (response.stop_details?.explanation ? `: ${response.stop_details.explanation}` : ''));
  if (response.stop_reason === 'max_tokens') throw new Error('התשובה נחתכה (ארוכה מדי). נסה לקצר את הנתונים.');
  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
  return JSON.parse(text);
}

async function tailorWithAi(p, target) {
  const lang = parseInstructions(target.instructions, target.lang || 'he').lang;
  const cv = await callClaudeJson(CV_SYSTEM, aiPrompt(p, target), CV_SCHEMA);
  return { ...cv, lang, source: 'ai' };
}

// ---------- import an existing CV ----------
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('טעינת הספרייה נכשלה (צריך אינטרנט)'));
    document.head.appendChild(s);
  });
}

async function fileToText(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    const rows = await pdfRows(file); // grades.js
    return rows.map(r => r.join(' ')).join('\n');
  }
  if (name.endsWith('.docx')) {
    await loadScript(MAMMOTH_URL);
    const { value } = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return value;
  }
  return file.text();
}

const HEADINGS = [
  ['education', /^(השכלה|לימודים|השכלה אקדמית|education|academic background)\b/i],
  ['work', /^(ניסיון תעסוקתי|ניסיון מקצועי|ניסיון|תעסוקה|experience|work experience|professional experience|employment)\b/i],
  ['projects', /^(פרויקטים|פרוייקטים|projects?)\b/i],
  ['military', /^(שירות צבאי|צבא|military|military service|idf service)\b/i],
  ['volunteer', /^(התנדבות|פעילות התנדבותית|volunteer(ing)?|volunteer experience)\b/i],
  ['awards', /^(פרסים|הצטיינויות|הישגים|awards|honors|achievements)\b/i],
  ['skills', /^(כישורים|מיומנויות|כלים|skills|technical skills|tools)\b/i],
  ['languages', /^(שפות|languages)\b/i],
  ['summary', /^(תקציר|על עצמי|פרופיל|summary|profile|about( me)?)\b/i],
];
const DATE_RX = /((19|20)\d{2})\s*[-–—]\s*((19|20)\d{2}|היום|הווה|present|current|now)|((19|20)\d{2})/i;

// Best-effort: contacts by pattern, sections by headings, entries start at lines with dates.
function parseCvText(text) {
  const p = emptyProfile();
  const lines = String(text).split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const all = lines.join('\n');
  p.basics.email = (all.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [''])[0];
  p.basics.phone = (all.match(/(\+972[-\s]?|0)5\d[-\s]?\d{3}[-\s]?\d{4}/) || [''])[0];
  p.basics.linkedin = (all.match(/(https?:\/\/)?(www\.)?linkedin\.com\/[^\s|,]+/i) || [''])[0];
  p.basics.github = (all.match(/(https?:\/\/)?(www\.)?github\.com\/[^\s|,]+/i) || [''])[0];
  p.basics.name = lines.find(l => !/@|\d{3}|linkedin|github|http/i.test(l) && l.length < 40) || '';

  let current = null, entry = null;
  const summary = [], skills = [], languages = [];
  for (const line of lines) {
    const h = HEADINGS.find(([, rx]) => rx.test(line) && line.length < 40);
    if (h) { current = h[0]; entry = null; continue; }
    if (!current || line === p.basics.name) continue;
    if (current === 'summary') { summary.push(line); continue; }
    if (current === 'skills') { skills.push(line); continue; }
    if (current === 'languages') { languages.push(line); continue; }
    const isBullet = /^[•\-*·▪●]/.test(line);
    const date = line.match(DATE_RX);
    if (!entry || (!isBullet && date)) {
      const title = line.replace(DATE_RX, '').replace(/[|,–-]\s*$/, '').trim();
      const [first, ...rest] = title.split(/\s[|,–—-]\s|,\s/);
      entry = current === 'education' ? { degree: first || title, institution: rest.join(', '), start: date?.[1] || date?.[0] || '', end: date?.[3] || '', highlights: '' }
        : current === 'projects' ? { name: first || title, role: rest.join(', '), start: date?.[1] || '', end: date?.[3] || '', highlights: '' }
        : current === 'military' ? { role: first || title, unit: rest.join(', '), start: date?.[1] || '', end: date?.[3] || '', highlights: '' }
        : current === 'volunteer' ? { role: first || title, organization: rest.join(', '), start: date?.[1] || '', end: date?.[3] || '', highlights: '' }
        : current === 'awards' ? { title: title, awarder: '', date: date?.[0] || '' }
        : { position: first || title, company: rest.join(', '), location: '', start: date?.[1] || '', end: date?.[3] || '', highlights: '' };
      p[current].push(entry);
      continue;
    }
    if ('highlights' in entry) entry.highlights += (entry.highlights ? '\n' : '') + line.replace(/^[•\-*·▪●]\s*/, '');
  }
  p.basics.summary = summary.join(' ');
  p.skills = skills.join('\n');
  p.languages = languages.join('\n');
  return p;
}

const PROFILE_SCHEMA_PROMPT = `Convert this CV text into JSON with exactly these keys:
basics {name,label,email,phone,location,linkedin,github,website,summary},
education [{degree,area,institution,start,end,gpa,highlights}],
work [{position,company,location,start,end,highlights}],
projects [{name,role,start,end,highlights}],
military [{role,unit,start,end,highlights}],
volunteer [{role,organization,start,end,highlights}],
awards [{title,awarder,date}],
skills (string: one line per group, "Group: a, b, c"),
languages (string: one line per language).
"highlights" is a string with one bullet per line. Keep the original language and wording; don't invent anything. Use "" for unknown fields.`;

async function importCvFile(file) {
  toast('קורא את הקובץ…');
  let text;
  try { text = await fileToText(file); } catch (e) { alert(e.message || 'לא הצלחתי לקרוא את הקובץ'); return; }
  if (!text || text.trim().length < 20) { alert('לא מצאתי טקסט בקובץ. אם זה PDF סרוק (תמונה), הדבק את הטקסט ידנית.'); return; }
  reviewImport(text);
}

function reviewImport(text) {
  const parsed = parseCvText(text);
  const count = SECTION_ORDER.reduce((a, k) => a + parsed[k].length, 0);
  openModal(`
    <h2>📥 ייבוא קורות חיים</h2>
    <p>זיהיתי: <b>${esc(parsed.basics.name || 'ללא שם')}</b> · ${count} פריטים ב-${SECTION_ORDER.filter(k => parsed[k].length).map(k => CV_SECTIONS[k].he).join(', ') || 'אף סעיף'}${parsed.skills ? ' · כישורים' : ''}.</p>
    <p class="muted">הזיהוי האוטומטי הוא "הכי טוב שאפשר". אחרי הייבוא עבור על הפרופיל ותקן. ${claudeKey() ? 'עם AI הזיהוי מדויק יותר.' : 'עם מפתח AI הזיהוי מדויק יותר.'}</p>
    <label>הטקסט שחולץ (אפשר לתקן לפני הייבוא)<textarea name="text" rows="10" dir="auto">${esc(text)}</textarea></label>
    <label class="check"><input type="checkbox" name="replace" checked> להחליף את הפרופיל הקיים (אחרת: להוסיף אליו)</label>
    <div class="actions">
      <span class="spacer"></span>
      <button class="btn" value="cancel" formnovalidate>ביטול</button>
      ${claudeKey() ? '<button class="btn" value="ai">🤖 ייבוא עם AI</button>' : ''}
      <button class="btn primary" value="local">ייבא</button>
    </div>`,
  (action, fd) => {
    const replace = fd.get('replace') === 'on';
    const txt = fd.get('text');
    if (action === 'ai') {
      toast('Claude קורא את קורות החיים…');
      callClaudeJson('You extract CV data into JSON. Never invent information.', `${PROFILE_SCHEMA_PROMPT}\n\n<cv>\n${txt}\n</cv>`, PROFILE_IMPORT_SCHEMA)
        .then(p => { applyImport(p, replace); toast('הייבוא הושלם'); })
        .catch(e => alert('הייבוא עם AI נכשל: ' + e.message));
      return;
    }
    applyImport(parseCvText(txt), replace);
    toast('הייבוא הושלם. עבור על הפרופיל ותקן');
  });
}

const str = { type: 'string' };
const entryOf = keys => ({ type: 'array', items: { type: 'object', additionalProperties: false, required: keys, properties: Object.fromEntries(keys.map(k => [k, str])) } });
const PROFILE_IMPORT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['basics', 'education', 'work', 'projects', 'military', 'volunteer', 'awards', 'skills', 'languages'],
  properties: {
    basics: { type: 'object', additionalProperties: false, required: Object.keys(emptyProfile().basics), properties: Object.fromEntries(Object.keys(emptyProfile().basics).map(k => [k, str])) },
    education: entryOf(['degree', 'area', 'institution', 'start', 'end', 'gpa', 'highlights']),
    work: entryOf(['position', 'company', 'location', 'start', 'end', 'highlights']),
    projects: entryOf(['name', 'role', 'start', 'end', 'highlights']),
    military: entryOf(['role', 'unit', 'start', 'end', 'highlights']),
    volunteer: entryOf(['role', 'organization', 'start', 'end', 'highlights']),
    awards: entryOf(['title', 'awarder', 'date']),
    skills: str, languages: str,
  },
};

function applyImport(parsed, replace) {
  const cur = cvProfile();
  let next;
  if (replace) next = { ...emptyProfile(), ...parsed, basics: { ...emptyProfile().basics, ...parsed.basics } };
  else {
    next = { ...cur, basics: { ...cur.basics } };
    for (const [k, v] of Object.entries(parsed.basics)) if (v && !next.basics[k]) next.basics[k] = v;
    for (const k of SECTION_ORDER) next[k] = cur[k].concat(parsed[k] || []);
    next.skills = [cur.skills, parsed.skills].filter(Boolean).join('\n');
    next.languages = [cur.languages, parsed.languages].filter(Boolean).join('\n');
  }
  saveProfile(next, true);
  Store.emit();
  cvTab = 'profile';
  render();
}

// Education (and honours, top courses) straight from the degree data.
function fillFromDegree() {
  const p = cvProfile();
  const s = computeStats();
  const graded = courses().filter(c => c.status === 'done' && c.grade != null).sort((a, b) => b.grade - a.grade);
  const honors = typeof semesterStats === 'function'
    ? semesterStats().filter(x => honorFor(x)).map(x => `${honorFor(x) === 'president' ? 'הצטיינות נשיא' : 'הצטיינות דיקן'} – ${semName(x.sem)}`) : [];
  const startYear = settings().startYear || 2025;
  const entry = {
    degree: 'B.Sc.', area: 'הנדסת מכונות', institution: 'הטכניון – מכון טכנולוגי לישראל',
    start: String(startYear), end: `${+startYear + 4} (צפוי)`, gpa: s.gpa ? fmt(s.gpa, 1) : '',
    highlights: [
      graded.length ? `קורסים בולטים: ${graded.slice(0, 5).map(c => `${c.name} (${c.grade})`).join(', ')}` : '',
      ...honors,
    ].filter(Boolean).join('\n'),
  };
  const i = p.education.findIndex(e => /טכניון|technion/i.test(e.institution || ''));
  if (i >= 0) p.education[i] = { ...p.education[i], ...entry }; else p.education.unshift(entry);
  for (const h of honors) if (!p.awards.some(a => a.title === h)) p.awards.push({ title: h, awarder: 'הטכניון', date: '' });
  saveProfile(p, true);
  Store.emit();
  toast('ההשכלה עודכנה מנתוני התואר');
}

// ---------- rendering the CV ----------
function cvHtml(cv, template = 'classic') {
  const lang = cv.lang === 'en' ? 'en' : 'he';
  const L = CV_LABELS[lang];
  const sec = (title, body) => body ? `<section class="cvs"><h2>${esc(title)}</h2>${body}</section>` : '';
  return `<div class="cv-page t-${esc(template)}" dir="${lang === 'en' ? 'ltr' : 'rtl'}" lang="${lang}">
    <header class="cvh">
      <h1 dir="auto">${esc(cv.basics.name || (lang === 'en' ? 'Your Name' : 'השם שלך'))}</h1>
      ${cv.basics.label ? `<div class="cv-label" dir="auto">${esc(cv.basics.label)}</div>` : ''}
      ${cv.basics.contacts?.length ? `<div class="cv-contacts">${cv.basics.contacts.map(c => `<span dir="ltr">${esc(c)}</span>`).join('<i>|</i>')}</div>` : ''}
    </header>
    ${sec(L.summary, cv.basics.summary ? `<p dir="auto">${esc(cv.basics.summary)}</p>` : '')}
    ${(cv.sections || []).map(s => sec(s.title, s.items.map(it => `
      <div class="cv-item">
        <div class="cv-row"><b dir="auto">${esc(it.heading)}</b>${it.meta ? `<span class="cv-meta" dir="ltr">${esc(it.meta)}</span>` : ''}</div>
        ${it.sub ? `<div class="cv-sub" dir="auto">${esc(it.sub)}</div>` : ''}
        ${it.bullets?.length ? `<ul>${it.bullets.map(b => `<li dir="auto">${esc(b)}</li>`).join('')}</ul>` : ''}
      </div>`).join(''))).join('')}
    ${sec(L.skills, (cv.skills || []).filter(g => g.keywords.length).map(g => `<div class="cv-skill">${g.name ? `<b>${esc(g.name)}:</b> ` : ''}${g.keywords.map(esc).join(', ')}</div>`).join(''))}
    ${sec(L.languages, cv.languages?.length ? `<div class="cv-skill">${cv.languages.map(esc).join(' · ')}</div>` : '')}
  </div>`;
}

function cvPlainText(cv) {
  const L = CV_LABELS[cv.lang === 'en' ? 'en' : 'he'];
  const out = [cv.basics.name, cv.basics.label, (cv.basics.contacts || []).join(' | '), ''];
  if (cv.basics.summary) out.push(L.summary.toUpperCase(), cv.basics.summary, '');
  for (const s of cv.sections || []) {
    out.push(s.title.toUpperCase());
    for (const it of s.items) {
      out.push([it.heading, it.sub, it.meta].filter(Boolean).join(' | '));
      it.bullets.forEach(b => out.push('• ' + b));
    }
    out.push('');
  }
  if (cv.skills?.length) { out.push(L.skills.toUpperCase()); cv.skills.forEach(g => out.push((g.name ? g.name + ': ' : '') + g.keywords.join(', '))); out.push(''); }
  if (cv.languages?.length) out.push(L.languages.toUpperCase(), cv.languages.join(' · '));
  return out.filter(x => x != null).join('\n');
}

// ---------- the tab ----------
function renderCv(root) {
  const p = cvProfile();
  const targets = cvTargets();
  if (cvTargetId && !targets.some(t => t.id === cvTargetId)) cvTargetId = null;
  const tabs = [['profile', '👤 הפרופיל שלי'], ['target', '🎯 התאמה למשרה'], ['ai', '🤖 הגדרות AI']]
    .map(([k, l]) => `<button class="${cvTab === k ? 'on' : ''}" data-cvtab="${k}">${l}</button>`).join('');
  root.innerHTML = `
    <section class="panel cv-panel">
      <div class="toolbar">
        <div><h2>📄 קורות חיים</h2><p class="muted">פרופיל אחד, וגרסה מותאמת לכל משרה או חברה. הכול מסתנכרן ל-Google Drive.</p></div>
        <div class="row wrap">
          <button class="btn" id="cvImport">📥 ייבוא קו״ח קיים</button>
          <button class="btn" id="cvFromDegree">🎓 מלא השכלה מהתואר</button>
        </div>
      </div>
      <div class="seg small perf-tabs">${tabs}</div>
      <div id="cvBody">${cvTab === 'profile' ? profileEditor(p) : cvTab === 'target' ? targetView(p, targets) : aiSettings()}</div>
    </section>`;

  $$('[data-cvtab]', root).forEach(b => b.onclick = () => { cvTab = b.dataset.cvtab; render(); });
  $('#cvImport').onclick = () => cvFileInput().click();
  $('#cvFromDegree').onclick = fillFromDegree;
  if (cvTab === 'profile') bindProfileEditor(root, p);
  else if (cvTab === 'target') bindTargetView(root, p);
  else bindAiSettings(root);
}

function cvFileInput() {
  let input = $('#cvFile');
  if (!input) {
    input = document.createElement('input');
    input.type = 'file'; input.id = 'cvFile'; input.hidden = true;
    input.onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) importCvFile(f); };
    document.body.appendChild(input);
  }
  return input;
}

// --- profile editor: form on one side, live preview on the other ---
function profileEditor(p) {
  const b = p.basics;
  const field = (k, label, attrs = '') => `<label>${label}<input data-basic="${k}" value="${esc(b[k])}" ${attrs}></label>`;
  return `
    <div class="cv-layout">
      <div class="cv-editor">
        <details open class="cv-block"><summary>פרטים אישיים</summary>
          <div class="grid2">
            ${field('name', 'שם מלא')}${field('label', 'כותרת (למשל: סטודנט להנדסת מכונות)')}
            ${field('email', 'אימייל', 'dir="ltr" type="email"')}${field('phone', 'טלפון', 'dir="ltr"')}
            ${field('location', 'מיקום')}${field('linkedin', 'LinkedIn', 'dir="ltr"')}
            ${field('github', 'GitHub', 'dir="ltr"')}${field('website', 'אתר / תיק עבודות', 'dir="ltr"')}
          </div>
          <label>תקציר (2–3 משפטים)<textarea data-basic="summary" rows="3" dir="auto">${esc(b.summary)}</textarea></label>
        </details>
        ${SECTION_ORDER.map(key => sectionEditor(key, p[key])).join('')}
        <details class="cv-block" ${p.skills ? 'open' : ''}><summary>כישורים</summary>
          <label>שורה לכל קבוצה, בפורמט "קבוצה: א, ב, ג"<textarea data-free="skills" rows="4" dir="auto" placeholder="תוכנות: SolidWorks, MATLAB, Python&#10;ייצור: CNC, הדפסת תלת-ממד">${esc(p.skills)}</textarea></label>
        </details>
        <details class="cv-block" ${p.languages ? 'open' : ''}><summary>שפות</summary>
          <label>שורה לכל שפה<textarea data-free="languages" rows="3" dir="auto" placeholder="עברית – שפת אם&#10;אנגלית – רמה גבוהה">${esc(p.languages)}</textarea></label>
        </details>
      </div>
      <div class="cv-preview-wrap"><div class="cv-preview-head"><b>תצוגה מקדימה</b><span class="muted">הגרסה הבסיסית</span></div>
        <div id="cvPreview" class="cv-preview">${cvHtml(normalizeCv(p, 'he'))}</div></div>
    </div>`;
}

function sectionEditor(key, list) {
  const def = CV_SECTIONS[key];
  return `<details class="cv-block" ${list.length ? 'open' : ''}><summary>${def.he} <span class="count">${list.length}</span></summary>
    ${list.map((e, i) => `<div class="cv-entry" data-sec="${key}" data-i="${i}">
      <div class="grid2">${def.fields.map(([f, l]) => `<label>${l}<input data-f="${f}" value="${esc(e[f] || '')}" dir="auto"></label>`).join('')}</div>
      ${def.noBullets ? '' : `<label>נקודות (שורה לכל נקודה)<textarea data-f="highlights" rows="3" dir="auto">${esc(e.highlights || '')}</textarea></label>`}
      <div class="row"><button class="btn small" data-move="-1">↑</button><button class="btn small" data-move="1">↓</button><span class="spacer"></span><button class="btn small danger" data-del>מחק</button></div>
    </div>`).join('')}
    <button class="btn small" data-add="${key}">＋ הוסף ל${def.he}</button>
  </details>`;
}

function bindProfileEditor(root, p) {
  const refresh = () => { $('#cvPreview', root).innerHTML = cvHtml(normalizeCv(p, 'he')); saveProfile(p); };
  $$('[data-basic]', root).forEach(el => el.oninput = () => { p.basics[el.dataset.basic] = el.value; refresh(); });
  $$('[data-free]', root).forEach(el => el.oninput = () => { p[el.dataset.free] = el.value; refresh(); });
  $$('.cv-entry', root).forEach(box => {
    const key = box.dataset.sec, i = +box.dataset.i;
    $$('[data-f]', box).forEach(el => el.oninput = () => { p[key][i][el.dataset.f] = el.value; refresh(); });
    $('[data-del]', box).onclick = () => { if (!confirm('למחוק את הפריט?')) return; p[key].splice(i, 1); saveProfile(p, true); render(); };
    $$('[data-move]', box).forEach(b => b.onclick = () => {
      const j = i + +b.dataset.move;
      if (j < 0 || j >= p[key].length) return;
      [p[key][i], p[key][j]] = [p[key][j], p[key][i]];
      saveProfile(p, true); render();
    });
  });
  $$('[data-add]', root).forEach(b => b.onclick = () => {
    const key = b.dataset.add;
    p[key].push(Object.fromEntries(CV_SECTIONS[key].fields.map(([f]) => [f, '']).concat(CV_SECTIONS[key].noBullets ? [] : [['highlights', '']])));
    saveProfile(p, true); render();
  });
}

// --- targets: one tailored version per job / company ---
function targetView(p, targets) {
  const t = targets.find(x => x.id === cvTargetId) || targets[0];
  if (t) cvTargetId = t.id;
  const list = `<div class="cv-targets">
    ${targets.map(x => `<button class="cv-target ${t && x.id === t.id ? 'on' : ''}" data-target="${esc(x.id)}">
      <b>${esc(x.role || 'משרה')}</b><small>${esc(x.company || '')}${x.result ? ` · ${x.result.source === 'ai' ? '🤖' : '🔑'}` : ''}</small></button>`).join('')}
    <button class="cv-target add" id="cvNewTarget">＋ משרה / חברה חדשה</button>
  </div>`;
  if (!t) return list + '<p class="empty">צור יעד ראשון: המשרה או החברה שאליה אתה מגיש.</p>';
  const cv = t.result || null;
  return `${list}
    <div class="cv-layout">
      <div class="cv-editor">
        <div class="grid2">
          <label>תפקיד<input id="tRole" value="${esc(t.role || '')}" placeholder="למשל: סטודנט/ית להנדסת מכונות – תכן מכני"></label>
          <label>חברה<input id="tCompany" value="${esc(t.company || '')}" placeholder="למשל: אלביט, אינטל, Formula Technion"></label>
          <label>שפה<select id="tLang"><option value="he" ${t.lang !== 'en' ? 'selected' : ''}>עברית</option><option value="en" ${t.lang === 'en' ? 'selected' : ''}>English</option></select></label>
          <label>תבנית<select id="tTemplate">${Object.entries(CV_TEMPLATES).map(([k, l]) => `<option value="${k}" ${t.template === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        </div>
        <label>מודעת הדרושים / תיאור החברה (הדבק כאן)<textarea id="tAd" rows="7" dir="auto" placeholder="הדבק את הטקסט של המשרה, דרישות, תיאור החברה…">${esc(t.jobAd || '')}</textarea></label>
        <label>הנחיות והכוונות שלך<textarea id="tInstr" rows="4" dir="auto" placeholder="למשל: עמוד אחד, באנגלית, להדגיש את פרויקט הפורמולה ו-SolidWorks, בלי שירות צבאי">${esc(t.instructions || '')}</textarea></label>
        <div class="row wrap">
          <button class="btn primary" id="tTailor">🔑 התאם (בלי AI)</button>
          <button class="btn primary" id="tTailorAi" ${claudeKey() ? '' : 'disabled title="הוסף מפתח בהגדרות AI"'}>🤖 התאם עם AI</button>
          <button class="btn" id="tCopyPrompt" title="להדביק ב-Claude / Gemini בלי מפתח">📋 העתק פרומפט</button>
          <span class="spacer"></span>
          <button class="btn" id="tDup">שכפל</button>
          <button class="btn danger" id="tDel">מחק</button>
        </div>
        ${cv ? `<div class="cv-analysis">
          <h3>${cv.source === 'ai' ? '🤖 הותאם עם AI' : '🔑 הותאם לפי מילות מפתח'} <small class="muted">${t.tailoredAt ? new Date(t.tailoredAt).toLocaleString('he-IL') : ''}</small></h3>
          ${cv.matched?.length ? `<p><b>מכוסה:</b> ${cv.matched.map(k => `<span class="chip ok">${esc(k)}</span>`).join(' ')}</p>` : ''}
          ${cv.missing?.length ? `<p><b>חסר:</b> ${cv.missing.map(k => `<span class="chip miss">${esc(k)}</span>`).join(' ')}</p>` : ''}
          ${cv.notes?.length ? `<ul class="cv-notes">${cv.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
        </div>` : '<p class="muted">לחץ "התאם" כדי ליצור את הגרסה למשרה הזו.</p>'}
      </div>
      <div class="cv-preview-wrap">
        <div class="cv-preview-head"><b>הגרסה למשרה</b>
          <div class="row"><button class="btn small" id="tCopyText" ${cv ? '' : 'disabled'}>העתק טקסט</button><button class="btn small primary" id="tPrint" ${cv ? '' : 'disabled'}>⬇️ PDF</button></div></div>
        <div id="cvPreview" class="cv-preview">${cvHtml(cv || normalizeCv(p, t.lang || 'he'), t.template || 'classic')}</div>
      </div>
    </div>`;
}

function bindTargetView(root, p) {
  $$('[data-target]', root).forEach(b => b.onclick = () => { cvTargetId = b.dataset.target; render(); });
  $('#cvNewTarget', root).onclick = () => {
    const id = uid();
    Store.put('cvTarget', id, { role: '', company: '', jobAd: '', instructions: '', lang: 'he', template: 'classic', result: null, created: Date.now() });
    cvTargetId = id; render();
  };
  const t = Store.get('cvTarget', cvTargetId);
  if (!t) return;
  // Saves as you type without re-rendering the page (which would steal focus).
  const save = data => {
    const key = `cvTarget:${t.id}`;
    Store.recs[key] = { ...Store.recs[key], ...data, u: Date.now() };
    Store.persist();
  };
  const val = () => ({ role: $('#tRole').value, company: $('#tCompany').value, lang: $('#tLang').value, template: $('#tTemplate').value, jobAd: $('#tAd').value, instructions: $('#tInstr').value });
  [['#tRole', 'role'], ['#tCompany', 'company'], ['#tAd', 'jobAd'], ['#tInstr', 'instructions']].forEach(([sel, k]) => { $(sel).oninput = e => save({ [k]: e.target.value }); });
  $('#tTemplate').onchange = e => { Store.put('cvTarget', t.id, { template: e.target.value }); };
  $('#tLang').onchange = e => { Store.put('cvTarget', t.id, { lang: e.target.value }); };
  const finish = result => { Store.put('cvTarget', t.id, { ...val(), result, tailoredAt: Date.now() }); toast('הגרסה מוכנה'); };
  $('#tTailor').onclick = () => finish(tailorLocal(p, { ...t, ...val() }));
  $('#tTailorAi').onclick = async e => {
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = '🤖 Claude כותב…';
    try { finish(await tailorWithAi(p, { ...t, ...val() })); }
    catch (err) { alert('ההתאמה עם AI נכשלה: ' + (err.message || err)); btn.disabled = false; btn.textContent = '🤖 התאם עם AI'; }
  };
  $('#tCopyPrompt').onclick = () => {
    const text = `${CV_SYSTEM}\n\n${aiPrompt(p, { ...t, ...val() })}\n\n(Return the CV as clean text, ready to paste, instead of JSON.)`;
    navigator.clipboard.writeText(text).then(() => toast('הפרומפט הועתק. הדבק ב-Claude או Gemini')).catch(() => alert(text));
  };
  $('#tDup').onclick = () => {
    const id = uid(); const { kind, u, del, ...rest } = t;
    Store.put('cvTarget', id, { ...rest, ...val(), id, role: (val().role || 'משרה') + ' (עותק)', created: Date.now() });
    cvTargetId = id; render();
  };
  $('#tDel').onclick = () => { if (confirm('למחוק את הגרסה הזו?')) { Store.remove('cvTarget', t.id); cvTargetId = null; } };
  $('#tCopyText').onclick = () => t.result && navigator.clipboard.writeText(cvPlainText(t.result)).then(() => toast('הטקסט הועתק'));
  $('#tPrint').onclick = () => printCv();
}

// Print just the CV page (A4); the browser's "Save as PDF" makes the file.
function printCv() {
  const page = $('#cvPreview .cv-page');
  if (!page) return;
  const holder = document.createElement('div');
  holder.id = 'cvPrintRoot';
  holder.innerHTML = page.outerHTML;
  document.body.appendChild(holder);
  document.body.classList.add('printing-cv');
  const done = () => { document.body.classList.remove('printing-cv'); holder.remove(); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
  setTimeout(done, 1500);
}

// --- AI settings (device-only key) ---
function aiSettings() {
  const has = !!claudeKey();
  return `<div class="narrow-block">
    <h3>🤖 התאמה עם Claude (אופציונלי)</h3>
    <p>בלי AI האפליקציה מסדרת את קורות החיים לפי מילות המפתח במודעה. עם AI, Claude כותב מחדש את הניסוח למשרה, לפי ההנחיות שלך, בלי להמציא עובדות.</p>
    <ol class="howto">
      <li>צור מפתח API ב-<a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a> (נדרש חיוב לפי שימוש; התאמה של קו״ח עולה בדרך כלל כמה סנטים).</li>
      <li>הדבק אותו כאן. המפתח נשמר <b>רק במכשיר הזה</b>: הוא לא מסתנכרן ל-Google ולא נשלח לשום מקום חוץ מ-Anthropic.</li>
    </ol>
    <label>Anthropic API key<input id="aiKey" type="password" dir="ltr" autocomplete="off" placeholder="${has ? '•••••••• (שמור)' : 'sk-ant-…'}"></label>
    <div class="row wrap"><button class="btn primary" id="aiSave">שמור</button>${has ? '<button class="btn danger" id="aiClear">מחק מפתח</button>' : ''}</div>
    <p class="muted">מודל: ${CV_MODEL}. בלי מפתח אפשר להשתמש ב"העתק פרומפט" ולהדביק ב-Claude או Gemini בעצמך.</p>
  </div>`;
}
function bindAiSettings(root) {
  $('#aiSave', root).onclick = () => {
    const v = $('#aiKey', root).value.trim();
    if (!v) return;
    try { localStorage.setItem(LS_CLAUDE_KEY, v); } catch {}
    toast('המפתח נשמר במכשיר הזה'); render();
  };
  $('#aiClear', root)?.addEventListener('click', () => { try { localStorage.removeItem(LS_CLAUDE_KEY); } catch {} render(); });
}
