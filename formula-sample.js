// Sample formula sheet: Solids Mechanics 1 (034028), rebuilt from the student's own LaTeX
// sheet (spring 2026) in the app's block format. Opens from "📐 מחולל נוסחאונים ← פתח דוגמה".
(() => {
  const DEFS = '<defs><marker id="ab" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#1d4ed8"/></marker><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#dc2626"/></marker><marker id="ak" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#111"/></marker></defs>';
  const S = (vb, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${DEFS}${body}</svg>`;
  const T = (x, y, t, a = '') => `<text x="${x}" y="${y}" font-family="KaTeX_Math, 'Times New Roman', serif"${/font-style/.test(a) ? '' : ' font-style="italic"'}${/font-size/.test(a) ? '' : ' font-size="13"'} ${a}>${t}</text>`;
  const H = (x, y, t, a = '') => `<text x="${x}" y="${y}" font-family="'David Libre', serif" font-weight="700" font-size="12" text-anchor="middle" ${a}>${t}</text>`;
  const L = (x1, y1, x2, y2, c = '#111', w = 1.3, m = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${m ? `marker-end="url(#${m})"` : ''}/>`;
  const wall = (x, y1, y2) => L(x, y1, x, y2, '#111', 2) + Array.from({ length: Math.floor((y2 - y1) / 6) }, (_, i) => L(x, y1 + i * 6 + 6, x - 6, y1 + i * 6, '#111', 0.8)).join('');
  const axes = (curve) => S('0 0 90 60', `${L(10, 30, 84, 30, '#111', 1, 'ak')}${L(10, 56, 10, 4, '#111', 1, 'ak')}${T(80, 44, 'x', 'font-size="10"')}<path d="${curve}" fill="none" stroke="#dc2626" stroke-width="2"/>`);
  const beam = (load) => S('0 0 100 60', `${wall(14, 18, 48)}<rect x="14" y="30" width="72" height="8" fill="#d1d5db" stroke="#111" stroke-width="1"/>${load}`);

  const cycle = S('0 0 120 100', `${T(52, 16, 'e', 'font-size="14"')}${T(60, 20, '1', 'font-size="9" font-style="normal"')}
    ${T(88, 88, 'e', 'font-size="14"')}${T(96, 92, '2', 'font-size="9" font-style="normal"')}
    ${T(14, 88, 'e', 'font-size="14"')}${T(22, 92, '3', 'font-size="9" font-style="normal"')}
    ${L(50.5, 18.5, 51, 18.5)}${L(86.5, 90.5, 87, 90.5)}${L(12.5, 90.5, 13, 90.5)}
    <path d="M72 18 Q100 30 98 70" fill="none" stroke="#1d4ed8" stroke-width="2.2" marker-end="url(#ab)"/>
    <path d="M82 90 Q58 104 34 92" fill="none" stroke="#1d4ed8" stroke-width="2.2" marker-end="url(#ab)"/>
    <path d="M14 72 Q12 34 44 16" fill="none" stroke="#1d4ed8" stroke-width="2.2" marker-end="url(#ab)"/>
    <text x="60" y="62" font-size="20" text-anchor="middle">+</text>`);

  const semi = S('0 0 90 60', `${L(5, 52, 85, 52, '#111', 1, 'ak')}${L(45, 58, 45, 4, '#111', 1, 'ak')}<path d="M15 52 A30 30 0 0 1 75 52 Z" fill="#fde2e2" stroke="#111"/><circle cx="45" cy="39" r="2.6" fill="#dc2626"/>${T(48, 36, 'C', 'font-size="10"')}${T(78, 50, 'r', 'font-size="10"')}`);
  const quarter = S('0 0 90 60', `<path d="M20 52 L20 14 A38 38 0 0 1 58 52 Z" fill="#fde2e2" stroke="#111"/><circle cx="36" cy="36" r="2.6" fill="#dc2626"/>${T(39, 33, 'C', 'font-size="10"')}`);
  const tri = S('0 0 90 60', `<path d="M20 52 L72 52 L20 12 Z" fill="#fde2e2" stroke="#111"/><circle cx="37" cy="39" r="2.6" fill="#dc2626"/>${T(40, 36, 'C', 'font-size="10"')}${T(44, 60, 'b', 'font-size="10"')}${T(8, 34, 'h', 'font-size="10"')}`);
  const trap = S('0 0 90 60', `<path d="M20 52 L76 52 L54 12 L20 12 Z" fill="#fde2e2" stroke="#111"/><circle cx="42" cy="34" r="2.6" fill="#dc2626"/>${T(45, 31, 'C', 'font-size="10"')}${T(46, 60, 'b', 'font-size="10"')}${T(34, 10, 'a', 'font-size="10"')}${T(8, 34, 'h', 'font-size="10"')}`);

  const pointLoad = beam(`${L(84, 6, 84, 28, '#dc2626', 1.8, 'ar')}${T(88, 14, 'F', 'font-size="11" fill="#dc2626"')}`);
  const udl = beam(`${[22, 34, 46, 58, 70, 82].map(x => L(x, 12, x, 28, '#dc2626', 1.3, 'ar')).join('')}${L(22, 12, 84, 12, '#dc2626', 1.3)}${T(88, 12, 'q', 'font-size="11" fill="#dc2626"')}`);
  const tipMoment = beam(`<path d="M80 22 A9 9 0 1 1 92 30" fill="none" stroke="#dc2626" stroke-width="1.8" marker-end="url(#ar)"/>${T(88, 14, 'M', 'font-size="11" fill="#dc2626"')}`);

  const virtualRod = S('0 0 200 140', `${L(20, 120, 190, 120, '#111', 1, 'ak')}${L(20, 130, 20, 8, '#111', 1, 'ak')}
    <circle cx="20" cy="120" r="3.5" fill="#fff" stroke="#111"/>${L(20, 120, 120, 40, '#dc2626', 3.5)}
    ${L(120, 40, 160, 40, '#1d4ed8', 2, 'ab')}${T(162, 44, 'F', 'fill="#1d4ed8"')}
    ${L(120, 40, 100, 18, '#dc2626', 1.6, 'ar')}${T(84, 18, 'δr', 'fill="#dc2626"')}
    <path d="M60 120 A40 40 0 0 0 52 95" fill="none" stroke="#111"/>${T(64, 108, 'θ')}
    <path d="M110 48 A12 12 0 0 0 104 32" fill="none" stroke="#111" stroke-dasharray="2 2"/>${T(126, 66, 'L')}${T(186, 136, 'x', 'font-size="11"')}`);

  const zeroV = S('0 0 90 80', `${L(15, 15, 45, 55, '#1d4ed8', 3)}${L(75, 15, 45, 55, '#1d4ed8', 3)}<circle cx="45" cy="55" r="4" fill="#111"/>${T(20, 38, '0', 'font-style="normal"')}${T(63, 38, '0', 'font-style="normal"')}${H(45, 76, 'צומת V')}`);
  const zeroT = S('0 0 90 80', `${L(8, 52, 82, 52, '#111', 3)}${L(45, 52, 45, 10, '#1d4ed8', 3)}<circle cx="45" cy="52" r="4" fill="#111"/>${T(32, 30, '0', 'font-style="normal"')}${H(45, 76, 'צומת T')}`);
  const zeroF = S('0 0 90 80', `${L(45, 52, 82, 52, '#111', 3)}${L(45, 52, 45, 10, '#1d4ed8', 3)}${L(8, 52, 41, 52, '#dc2626', 2, 'ar')}<circle cx="45" cy="52" r="4" fill="#111"/>${T(32, 30, '0', 'font-style="normal"')}${T(16, 46, 'F', 'fill="#dc2626"')}${H(45, 76, 'כוח על קו מוט')}`);

  const torsion = S('0 0 220 110', `<ellipse cx="40" cy="55" rx="14" ry="30" fill="#e5e7eb" stroke="#111"/>
    <path d="M40 25 L175 25 M40 85 L175 85" stroke="#111" stroke-width="1.3"/>
    <ellipse cx="175" cy="55" rx="14" ry="30" fill="#f3f4f6" stroke="#111"/>
    ${L(40, 25, 175, 25)}${L(30, 32, 160, 30, '#1d4ed8', 1.2)}${L(30, 32, 175, 25, '#1d4ed8', 1.2)}${T(150, 22, 'γ', 'fill="#1d4ed8"')}
    ${L(175, 55, 186, 30, '#1d4ed8', 1.4)}${T(186, 50, 'R', 'font-size="11"')}${T(192, 30, 'ϕ', 'font-size="12"')}
    <path d="M200 32 A26 26 0 0 1 200 78" fill="none" stroke="#dc2626" stroke-width="2" marker-end="url(#ar)"/>${T(206, 60, 'T', 'fill="#dc2626"')}
    ${L(160, 72, 160, 50, '#dc2626', 1.4, 'ar')}${T(150, 66, 'τ', 'fill="#dc2626" font-size="11"')}
    ${L(40, 100, 175, 100, '#111', 0.8, 'ak')}${T(105, 108, 'L', 'font-size="11"')}`);

  const rigidBars = S('0 0 220 110', `${L(15, 30, 200, 30, '#111', 4)}${L(15, 30, 200, 76, '#1d4ed8', 1.4)}
    <circle cx="15" cy="30" r="4" fill="#fff" stroke="#111"/>${T(6, 22, 'A', 'font-size="11"')}
    ${L(110, 30, 110, 54, '#dc2626', 3)}${L(200, 30, 200, 76, '#dc2626', 3)}
    ${T(104, 22, 'B', 'font-size="11"')}${T(194, 22, 'C', 'font-size="11"')}${T(114, 64, 'B′', 'font-size="11"')}${T(204, 86, 'C′', 'font-size="11"')}
    ${T(116, 46, 'ΔL₁', 'font-size="10" fill="#dc2626"')}${T(204, 56, 'ΔL₂', 'font-size="10" fill="#dc2626"')}
    ${L(15, 100, 108, 100, '#111', 0.8, 'ak')}${L(15, 92, 198, 92, '#111', 0.8, 'ak')}${T(56, 108, 'x₁', 'font-size="10"')}${T(100, 89, 'x₂', 'font-size="10"')}`);

  const R = String.raw;
  window.FS_SAMPLE_SOLIDS = {
    title: 'נוסחאון מכניקת מוצקים 1', course: '034028', pages: 2, cols: 3, theme: 'standard', autofit: true,
    footer: 'מכניקת מוצקים 1 - סמסטר אביב 2026',
    profile: ['figures', 'derivations', 'procedures', 'tables'],
    brief: { emphasis: 'עבודה וירטואלית, מסבכים, מהלכי כוחות ומומנטים, פיתול ומערכות לא מסוימות סטטית', skip: '', rules: '2 עמודים, צבעוני' },
    coverage: [
      { topic: 'וקטורים ומומנטים', status: 'in' }, { topic: 'שיווי משקל ודג״ח', status: 'in' },
      { topic: 'מסבכים, מסגרות ומכונות', status: 'in' }, { topic: 'עבודה וירטואלית', status: 'in' },
      { topic: 'מהלכי כוחות ומומנטים בקורות', status: 'in' }, { topic: 'מרכז כובד', status: 'in' },
      { topic: 'מאמץ, עיבור וחוק הוק', status: 'in' }, { topic: 'מערכות לא מסוימות סטטית', status: 'in' },
      { topic: 'פיתול במוטות עגולים', status: 'in' }, { topic: 'חיכוך', status: 'missing', note: 'לא בנוסחאון המקורי; בדוק אם במבחן' },
      { topic: 'שיטת הקשיחות (מטריצת קשיחות)', status: 'partial', note: 'בגרסה "עם מטריצת קשיחות" בלבד' },
    ],
    sections: [
      { id: 's1', title: 'וקטורים', blocks: [
        { t: 'kv', label: 'וקטור מ-A ל-B', tex: R`\underline{r}^{B/A}=\underline{r}^B-\underline{r}^A` },
        { t: 'kv', label: 'גודל של וקטור', tex: R`|\underline{v}|=\sqrt{v_1^2+v_2^2+v_3^2}` },
        { t: 'kv', label: 'וקטור יחידה', tex: R`\underline{e}_v=\frac{\underline{v}}{|\underline{v}|}` },
        { t: 'kv', label: 'מכפלה סקלרית', tex: R`\underline{u}\cdot\underline{v}=|\underline{u}|\,|\underline{v}|\cos\theta` },
        { t: 'kv', label: 'מכפלה וקטורית', tex: R`|\underline{u}\times\underline{v}|=|\underline{u}|\,|\underline{v}|\sin\theta` },
        { t: 'kv', label: 'היפוך סימן', tex: R`\underline{u}\times\underline{v}=-(\underline{v}\times\underline{u})` },
        { t: 'table', rows: [[cycle, R`$\underline{u}\times\underline{v}=\begin{vmatrix}e_1&e_2&e_3\\u_1&u_2&u_3\\v_1&v_2&v_3\end{vmatrix}$`]] },
      ] },
      { id: 's2', title: 'מומנטים', blocks: [
        { t: 'kv', label: 'הגדרה', tex: R`\underline{M}=\underline{r}\times\underline{F}` },
        { t: 'kv', label: 'גודל', tex: R`|M|=r\cdot F\cdot\sin\theta` },
        { t: 'text', md: R`**כלל יד ימין:** אצבעות מכיוון נקודת החישוב לקו הפעולה ($r$), כיפוף לכיוון הכוח, אגודל מורה את כיוון המומנט.` },
        { t: 'text', md: '**מומנט סביב ציר:**' },
        { t: 'eq', tex: R`M^{B/A}=(\underline{r}\times\underline{F})\cdot\underline{e}^{B/A}` },
        { t: 'callout', variant: 'tip', title: 'דגש: מי נכנס למשוואה?', items: ['**כוחות:** קו פעולה שמצטלב עם כיוון הציר.', '**מומנטים:** רק מומנט (או רכיב) **המקביל** לכיוון הציר.'] },
        { t: 'text', md: R`**החלפת כוח במומנט טהור (צמד כוחות):** כוחות שווים בגודלם והפוכים בכיוונם מתקזזים במשוואת הכוחות. גודל המומנט: $|M|=F\cdot d$.` },
      ] },
      { id: 's3', title: 'עומסים מפורסים', blocks: [
        { t: 'text', md: '**כלל אצבע לגרפים:** קפיצה בגרף הגזירה או המומנט תתרחש אך ורק בנקודת הפעולה של כוח או מומנט מרוכז. עומס מפורס יוצר שינוי רציף.' },
        { t: 'h', md: R`החלפת עומס מפורס בכוח שקול (עבור $q(x)$ כללי):` },
        { t: 'eq', tex: R`F_{eq}=\int_0^L q(x)\,dx,\qquad x_{eq}=\frac{\int_0^L x\,q(x)\,dx}{\int_0^L q(x)\,dx}` },
        { t: 'list', style: 'square', items: [R`**עומס מלבני:** $F=q_0L$, באמצע: $x_{eq}=\frac{L}{2}$.`, R`**עומס משולש:** $F=\frac{q_0L}{2}$, בשליש הבסיס: $\frac{L}{3}$ מהצד הגבוה.`, R`**עומס טרפזי:** $F=\frac{(q_1+q_2)L}{2}$, $x_{eq}=\frac{L}{3}\cdot\frac{2q_2+q_1}{q_1+q_2}$ (מהצד של $q_1$).`] },
        { t: 'table', head: ['קורה ועומסים', 'גזירה (V)', 'מומנט (M)'], rows: [
          [pointLoad, axes('M10 42 L76 42'), axes('M10 52 L76 30')],
          [udl, axes('M10 52 L76 30'), axes('M10 54 Q40 32 76 30')],
          [tipMoment, axes('M10 30 L76 30'), axes('M10 16 L76 16')],
        ] },
      ] },
      { id: 's4', title: 'קשרים דיפרנציאליים (קורות)', blocks: [
        { t: 'text', md: R`עבור קורה שצירה לאורך $e_1$, בין העומס המפורס ($q$), כוח הגזירה ($V$) ומומנט הכפיפה ($M$):` },
        { t: 'eq', tex: R`\frac{dV_2}{dx_1}=-q_2,\quad \frac{dV_3}{dx_1}=-q_3,\quad \frac{dM_3}{dx_1}=-V_2,\quad \frac{dM_2}{dx_1}=V_3` },
        { t: 'text', md: '**אופן השימוש:** חילוץ הגזירה והמומנט לאורך הקורה ע״י **אינטגרציה ישירה** (הפרדת משתנים).' },
        { t: 'table', head: [R`עומס $q$`, R`גזירה $V$`, R`מומנט $M$`], rows: [['0', 'קבוע', R`ליניארי ($n=1$)`], ['קבוע', R`ליניארי ($n=1$)`, R`פרבולה ($n=2$)`], [R`ליניארי ($n=1$)`, R`פרבולה ($n=2$)`, R`מעלה שלישית ($n=3$)`]] },
        { t: 'list', style: 'square', items: ['**כוח מרוכז:** קפיצה בגרף הגזירה בכיוון הכוח.', '**מומנט מרוכז:** קפיצה בגרף המומנט בלבד.', R`**קיצון:** $V=0$ ⇐ נקודת קיצון בגרף המומנט.`] },
      ] },
      { id: 's5', title: 'מרכזי כובד', blocks: [
        { t: 'kv', label: 'מקרה כללי (רציף)', tex: R`x_{cm}=\frac{\int x\,\rho\,dv}{\int\rho\,dv}` },
        { t: 'kv', label: 'מערכת מורכבת', tex: R`x_{cm}=\frac{\sum_{i=1}^n m_ix_i}{\sum m_i}` },
        { t: 'table', head: ['צורה', 'מרכז כובד'], rows: [
          [semi, R`**חצי עיגול:** $\bar x=0,\ \bar y=\frac{4r}{3\pi}$`],
          [quarter, R`**רבע עיגול:** $\bar x=\bar y=\frac{4r}{3\pi}$`],
          [tri, R`**משולש ישר זווית:** $\bar x=\frac{b}{3},\ \bar y=\frac{h}{3}$`],
          [trap, R`**טרפז ישר זווית:** $\bar y=\frac{h}{3}\cdot\frac{2a+b}{a+b}$`],
        ] },
      ] },
      { id: 's6', title: 'מתמטיקה שימושית', blocks: [
        { t: 'kv', label: 'משפט הסינוסים', tex: R`\frac{A}{\sin\alpha}=\frac{B}{\sin\beta}=\frac{C}{\sin\gamma}` },
        { t: 'kv', label: 'משפט הקוסינוסים', tex: R`C^2=A^2+B^2-2AB\cos\gamma` },
        { t: 'kv', label: 'משפט תאלס', tex: R`DE\parallel BC\Rightarrow\frac{AD}{DB}=\frac{AE}{EC}` },
        { t: 'eq', tex: R`\sin2\alpha=2\sin\alpha\cos\alpha,\quad \cos2\alpha=\cos^2\alpha-\sin^2\alpha=1-2\sin^2\alpha` },
        { t: 'kv', label: 'משוואת ישר', tex: R`y=mx+b,\ \ m=\frac{y_2-y_1}{x_2-x_1}` },
      ] },
      { id: 's7', title: 'מסבכים, מסגרות ומכונות', blocks: [
        { t: 'text', md: '**מסבכים:** מחוברים בצירים חסרי חיכוך, משקל זניח, כוחות פועלים על הצירים בלבד.' },
        { t: 'list', style: 'bullet', items: ['**שיטת הצמתים:** דג״ח לכל ציר והשוואת כוחות לאפס.', '**שיטת החתכים:** חיתוך דרך המוט המבוקש, סכום מומנטים בנקודה שמאפסת כמה שיותר נעלמים (בדו-מימד עד 3 מוטות).', '**מוטות אפס:** מוטות שלא פועל בהם כוח.'] },
        { t: 'text', md: '**מסגרות ומכונות:** אלמנטים לא ישרים, כוחות לא רק בצירים. **TFM (מוט שני כוחות):** הכוחות פועלים רק על הקו המחבר, שווים ומנוגדים.' },
      ] },
      { id: 's8', title: 'מוטות אפס', blocks: [
        { t: 'h', md: '1. צומת ללא כוח חיצוני או ריאקציה:' },
        { t: 'list', style: 'square', items: ['**צומת עם 2 מוטות (V):** אם אינם על אותו ישר, שניהם מוטות אפס.', '**צומת עם 3 מוטות (T):** אם שניים על אותו ישר, השלישי מוט אפס.'] },
        { t: 'h', md: '2. צומת שעליו פועל כוח חיצוני:' },
        { t: 'list', style: 'square', items: ['**צומת עם 2 מוטות:** אם הכוח על קו אחד המוטות, **השני** הוא מוט אפס.'] },
        { t: 'table', rows: [[zeroV, zeroT, zeroF]] },
      ] },
      { id: 's9', title: 'עבודה וירטואלית', blocks: [
        { t: 'steps', title: 'סדר פעולות (סד״פ):', items: [
          '**זיהוי דרגות חופש (ד״ח):** המשתנים הבלתי תלויים שמתארים את תנועת המערכת.',
          R`**וקטורי מיקום ($\underline r$):** מנקודה נייחת לכל כוח חיצוני, דרך כל קשר גיאומטרי בשרטוט.`,
          R`**גזירה לפי ד״ח:** $\delta\underline r=\frac{\partial\underline r}{\partial a}\delta a+\frac{\partial\underline r}{\partial b}\delta b$`,
          R`**עבודה וירטואלית:** $\delta W_F=\underline F\cdot\delta\underline r$, $\ \delta W_{mg}=m\underline g\cdot\delta\underline r_{cm}$, $\ \delta W_M=M\delta\theta$, $\ \delta W_k=-K\Delta L\,\delta(\Delta L)$`,
          R`**שיווי משקל:** $\sum\delta W=0$.`,
        ] },
        { t: 'figure', svg: virtualRod, caption: R`מוט קשיח $L$ בזווית $\theta$, מוזז וירטואלית ב-$\delta\theta$`, width: 80 },
        { t: 'eq', tex: R`\underline r=L\cos\theta\,\hat i+L\sin\theta\,\hat j\ \Rightarrow\ \delta\underline r=-L\sin\theta\,\delta\theta\,\hat i+L\cos\theta\,\delta\theta\,\hat j` },
        { t: 'callout', variant: 'tip', title: 'טריקים ודגשים: עבודה וירטואלית', items: [
          '**כמה ד״ח?** כמספר העצמים שצריך לקבע כדי שהמערכת תהיה מוגדרת גיאומטרית במלואה.',
          '**ריאקציות:** הופכים סמך נייח לנייד ומוסיפים כוח חיצוני בכיוון הריאקציה שירדה.',
          R`**קפיץ קשיח ($K\to\infty$):** אינו משנה אורכו, מתייחסים אליו כמוט קשיח.`,
          R`**בורג:** $\frac{\delta\phi}{2\pi}=\frac{\delta x}{P}$ (פסיעה $P$).`,
        ] },
      ] },
      { id: 's10', title: 'מאמץ, עיבור וקשרי הזזה', blocks: [
        { t: 'kv', label: 'מאמץ נורמלי', tex: R`\sigma=\frac{N}{A}` },
        { t: 'kv', label: 'עיבור הנדסי', tex: R`\epsilon=\frac{\Delta L}{L}` },
        { t: 'kv', label: 'חוק הוק', tex: R`\sigma=E\cdot\epsilon` },
        { t: 'h', md: 'קשרי כוח-התארכות' },
        { t: 'kv', label: R`מוט אחיד ($N,A,E$ קבועים)`, tex: R`\Delta L_{AB}=u_B-u_A=\left(\frac{NL}{EA}\right)_{AB}` },
        { t: 'kv', label: 'מוט משתנה', tex: R`\Delta L_{AB}=\int_0^L\frac{N(x)}{E(x)A(x)}dx` },
        { t: 'kv', label: 'היטל התזוזה על ציר המוט', tex: R`\Delta L_{AB}=(\underline u_B-\underline u_A)\cdot\underline e_{AB}` },
        { t: 'h', md: 'עיבור והתארכות תרמית' },
        { t: 'eq', tex: R`\Delta L_{tot}=\frac{NL}{EA}+\alpha\,\Delta T\,L\ \Rightarrow\ N=\frac{EA}{L}(\Delta L_{tot}-\alpha\,\Delta T\,L)` },
        { t: 'callout', variant: 'trap', items: [
          R`**חופש עיוות:** מבנה חופשי מתארך ב-$\alpha\Delta TL$ בלי מאמץ ($N=0$).`,
          '**מלכודת נפוצה:** הצבת התארכות תרמית ישר לחוק הוק. התארכות חופשית **אינה** גוררת מאמץ: בדוק קודם את אילוצי המבנה.',
          R`**קפיצים:** במקביל $K_{eq}=K_1+K_2$; בטור $\frac1{K_{eq}}=\frac1{K_1}+\frac1{K_2}$.`,
          R`**הפרש טמפ׳ בקצוות:** $T_{avg}=\frac12(T_A+T_B)$.`,
        ] },
      ] },
      { id: 's11', title: 'סד״פ - מערכות לא מסוימות סטטית', blocks: [
        { t: 'text', md: R`**מספר נעלמים:** מוטות + ריאקציות. **מספר משוואות:** צמתים $\times$ מימד הבעיה.` },
        { t: 'steps', title: '', items: [
          R`**קשרים גיאומטריים:** $\Delta L_{AB}=(\underline u_B-\underline u_A)\cdot\underline e_{AB}$ + תנאי שפה.`,
          '**שיווי משקל:** דג״ח של הצומת.',
          R`**חוק הוק:** $N_i=\frac{E_iA_i}{L_i}\Delta L_i$.`,
          '**הרכבה ופתרון:** הצב 2 ו-3 בתוך 1.',
        ] },
        { t: 'text', md: '**טריק קינמטי (קורה קשיחה על מוטות):** הקורה נשארת ישרה; מוצאים את ציר הסיבוב ומשתמשים **במשפט תאלס** בין ההתארכויות.' },
        { t: 'figure', svg: rigidBars, width: 85 },
      ] },
      { id: 's12', title: 'פיתול במוטות עגולים', blocks: [
        { t: 'symbols', rows: [[R`\gamma`, 'זווית עיבור גזירה', R`\text{rad}`], [R`\phi`, 'זווית פיתול בחתך', R`\text{rad}`], [R`T`, 'מומנט פיתול', R`N\cdot m`], [R`J`, 'מומנט אינרציה פולארי', R`m^4`], [R`\tau`, 'מאמץ גזירה', R`Pa`], [R`G`, 'מודול גזירה', R`Pa`]] },
        { t: 'kv', label: 'חוק הוק בגזירה', tex: R`\tau(r)=G\cdot\gamma(r)` },
        { t: 'kv', label: 'מאמץ גזירה', tex: R`\tau(r)=\frac{T\cdot r}{J},\ \ \tau_{max}=\frac{TR}{J}` },
        { t: 'list', style: 'square', items: [R`**עגול מלא:** $J=\frac{\pi R^4}{2}$`, R`**עבה דופן:** $J=\frac{\pi}{2}(r_{out}^4-r_{in}^4)$`, R`**דק דופן:** $J\approx2\pi R^3t$`] },
        { t: 'kv', label: 'זווית פיתול', tex: R`\Delta\phi=\left(\frac{TL}{GJ}\right)_{AB}=\int_0^L\frac{T(x)}{G(x)J(x)}dx` },
        { t: 'kv', label: 'קשר גיאומטרי', tex: R`u_A=R\phi,\quad L\gamma=r\,\Delta\phi` },
        { t: 'figure', svg: torsion, width: 85 },
        { t: 'callout', variant: 'tip', title: 'דגש!', md: R`במוט הרתום משני קצותיו, סכום זוויות הפיתול מתאפס: $\sum\Delta\phi_i=0$.` },
      ] },
    ],
  };
})();
