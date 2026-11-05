// English mode. The app is written in Hebrew; in English mode this layer translates the
// interface as it is drawn: text, tooltips, placeholders, alerts and notifications.
// Official Technion data (course names, syllabi) and anything you typed stay as they are,
// and elements marked translate="no" are left alone.
//
// Lookup order for a piece of text: the whole text, then a template with {n} slots, then
// each part between separators (· | – numbers arrows). Keys are stored without leading
// emoji/punctuation, the same way the text is split here.

const EN = {
  // ---------- header, tabs, navigation ----------
  'התואר שלי': 'My Degree', 'מפת קורסים': 'Course map', 'מפת הקורסים': 'Course map', 'תכנון תואר': 'Degree planning', 'משימות': 'Tasks',
  'מערכת שעות': 'Timetable', 'קו״ח': 'CV', 'קורות חיים': 'CV', 'הגדרות': 'Settings', 'ממוצע': 'Average', 'קורסים הושלמו': 'courses done',
  'נק״ז בלימוד': 'credits in progress', 'לשבוע הקרוב': 'this week', 'באיחור': 'overdue', 'להיום': 'today',
  'משימות לשבוע הקרוב (כולל באיחור': 'Tasks for the coming week (incl. overdue', 'משימות לשבוע הקרוב': 'Tasks for the coming week',
  'מרכז ביצועים ונתוני תואר': 'Performance and degree data', 'מרכז ביצועים': 'Performance',
  'חיפוש מהיר (Ctrl+K': 'Quick search (Ctrl+K', 'התראות': 'Notifications', 'התראות · סיכום שבועי חדש': 'Notifications · new weekly digest',
  'יועץ תואר (AI': 'Degree advisor (AI', 'יועץ תואר': 'Degree advisor', 'סנכרון עם Google': 'Google sync',
  'לא מסונכרן': 'Not synced', 'התחבר מחדש': 'Reconnect', 'מסנכרן': 'Syncing', 'מסונכרן': 'Synced', 'שגיאת סנכרון': 'Sync error',
  'לא מקוון': 'Offline', 'סונכרן': 'Synced', 'סנכרון אוטומטי פעם ביום · לחץ לסנכרן עכשיו': 'Syncs automatically once a day · click to sync now',
  'סנכרון אוטומטי פעם ביום': 'Syncs automatically once a day', 'לחץ לסנכרן עכשיו': 'click to sync now',
  'מעבר ללשונית': 'Go to tab', 'מעבר למסך': 'Go to screen', 'פעולה': 'Action', 'מדריך': 'Guide',
  'חפש קורס, משימה או פעולה': 'Search for a course, task or action', 'לא נמצא כלום': 'Nothing found',

  // ---------- statuses, types ----------
  'נעול': 'Locked', 'פתוח לרישום': 'Open', 'בלימוד': 'In progress', 'הושלם': 'Done', 'פטור': 'Exempt', 'עובר בינארי': 'Binary pass',
  'רגיל': 'Regular', 'עובר': 'Pass', 'בינארי': 'binary',
  'שיעורי בית': 'Homework', 'מבחן': 'Exam', 'בוחן': 'Quiz', 'פרויקט / מעבדה': 'Project / lab', 'אחר': 'Other',
  'הרצאה': 'Lecture', 'תרגול': 'Tutorial', 'מעבדה': 'Lab', 'סדנה': 'Workshop',
  'ראשון': 'Sunday', 'שני': 'Monday', 'שלישי': 'Tuesday', 'רביעי': 'Wednesday', 'חמישי': 'Thursday', 'שישי': 'Friday', 'שבת': 'Saturday',
  'חובה': 'Mandatory', 'בחירה': 'Elective', 'בחירה / לא משובץ': 'Elective / unscheduled',
  'א׳ – חישוביים': 'A – Computational', 'ב׳ – נושאי ליבה': 'B – Core topics', 'ג׳ – יישומיים ושילוביים': 'C – Applied & integrative',
  'ד׳ – מדעיים כלליים': 'D – General science', 'ה׳ – בחירה פקולטית כללית': 'E – General faculty electives',
  'חישוביים': 'Computational', 'נושאי ליבה': 'Core topics', 'יישומיים ושילוביים': 'Applied & integrative', 'מדעיים כלליים': 'General science', 'בחירה פקולטית כללית': 'General faculty electives',
  'א׳': 'A', 'ב׳': 'B', 'ג׳': 'C', 'ד׳': 'D', 'ה׳': 'E', 'ב׳+ג׳+ד׳': 'B+C+D',
  'פרויקט גמר': 'Final project', 'פרויקט': 'Project', 'מל״ג': 'Enrichment (Malag)', 'כלל טכניונית': 'Technion-wide', 'כלל טכניוני': 'Technion-wide', 'כללי': 'General',
  'חינוך גופני': 'Physical education', 'ספורט': 'Sports', 'מל״ג + כלל טכניונית': 'Enrichment + Technion-wide',
  'חורף': 'Winter', 'אביב': 'Spring', 'קיץ': 'Summer', 'סמסטר קיץ': 'Summer semester',
  'שנה א׳ · סמסטר א׳': 'Year 1 · Semester 1', 'שנה א׳ · סמסטר ב׳': 'Year 1 · Semester 2', 'שנה ב׳ · סמסטר ג׳': 'Year 2 · Semester 3', 'שנה ב׳ · סמסטר ד׳': 'Year 2 · Semester 4',
  'שנה ג׳ · סמסטר ה׳': 'Year 3 · Semester 5', 'שנה ג׳ · סמסטר ו׳': 'Year 3 · Semester 6', 'שנה ד׳ · סמסטר ז׳': 'Year 4 · Semester 7', 'שנה ד׳ · סמסטר ח׳': 'Year 4 · Semester 8',
  'שנה א׳': 'Year 1', 'שנה ב׳': 'Year 2', 'שנה ג׳': 'Year 3', 'שנה ד׳': 'Year 4',
  'סמסטר א׳': 'Semester 1', 'סמסטר ב׳': 'Semester 2', 'סמסטר ג׳': 'Semester 3', 'סמסטר ד׳': 'Semester 4', 'סמסטר ה׳': 'Semester 5', 'סמסטר ו׳': 'Semester 6', 'סמסטר ז׳': 'Semester 7', 'סמסטר ח׳': 'Semester 8',
  'תשפ״ד': '2023/24', 'תשפ״ה': '2024/25', 'תשפ״ו': '2025/26', 'תשפ״ז': '2026/27', 'תשפ״ח': '2027/28', 'תשפ״ט': '2028/29', 'תש״צ': '2029/30', 'תשצ״א': '2030/31',
  'נק״ז': 'credits', 'סמסטר': 'Semester', 'סמסטרים': 'Semesters', 'שנה': 'Year', 'קורס': 'Course', 'קורסים': 'courses', 'ציון': 'Grade', 'עם ציון': 'graded',
  'היום': 'today', 'מחר': 'tomorrow', 'עבר המועד': 'past due', 'עבר': 'past', 'ימים': 'days', 'דקות': 'minutes', 'שעות': 'hours', 'בעוד': 'in',
  'אין': 'None', 'לא': 'No', 'ללא': 'None', 'או': 'or', 'עד': 'until', 'לפחות': 'at least', 'חדש': 'New', 'עכשיו': 'now', 'מתוכנן': 'planned',

  // ---------- connect / Google ----------
  'חבר את חשבון Google': 'Connect your Google account', 'התחבר עם Google': 'Sign in with Google', 'עוד צעד אחד': 'One more step', 'אשר גישה': 'Allow access',
  'לחיצה אחת בכל מכשיר, והציונים, המשימות ומערכת השעות יהיו זהים במחשב, באייפד ובטלפון. גם היומן ו-Google Tasks (כולל מה ש-Instinct מוסיף) יופיעו כאן': 'One click on each device, and your grades, tasks and timetable are the same on your computer, iPad and phone. Your calendar and Google Tasks (including what Instinct adds) show up here too',
  'אשר לאפליקציה לקרוא את היומן ולסנכרן את Google Tasks': 'Allow the app to read your calendar and sync Google Tasks',
  'לא מחובר': 'not connected', 'צריך אישור': 'needs permission', 'יש בעיה (פרטים למטה': 'there is a problem (details below', 'מתחבר': 'connecting',
  'פתח': 'Open', 'סנכרן': 'Sync', 'רענן': 'Refresh', 'סנכרן עכשיו': 'Sync now',
  'הסנכרון עם Google Tasks לא עובד': 'Google Tasks sync isn’t working', 'לא הצלחתי לטעון את היומן': 'Couldn’t load the calendar',
  'לחץ על הכפתור, ובדף שנפתח לחץ': 'Click the button, and on the page that opens click', 'אחרי דקה-שתיים חזור לכאן': 'After a minute or two, come back here',
  'הפעל ב-Google Cloud': 'Enable in Google Cloud', 'פג תוקף החיבור': 'Connection expired', 'אין חיבור לאינטרנט': 'No internet connection', 'נדרש חיבור מחדש': 'Reconnection needed',

  // ---------- map ----------
  'ייבוא גיליון ציונים': 'Import grade sheet', 'הוסף קורס': 'Add course', 'תמונה': 'Image', 'השוואה': 'Compare',
  'הקווים מחברים כל קורס לדרישות הקדם שלו. לחץ על קורס לפרטים, ציון ו-CheeseFork; מעבר עכבר מדגיש את השרשרת': 'Lines connect each course to its prerequisites. Click a course for details, grade and CheeseFork; hovering highlights the chain',
  'אין קורסים': 'No courses', 'לא משובצים': 'Unscheduled',

  // ---------- course window ----------
  'עריכת קורס': 'Edit course', 'קורס חדש': 'New course', 'שם הקורס': 'Course name', 'מספר קורס': 'Course number', 'קטגוריה': 'Category', 'סטטוס': 'Status',
  'עובר בינארי (מילואים): הנק״ז נספרות, הציון לא נכנס לממוצע. נדרש ציון 55+': 'Binary pass (reserve duty): the credits count, the grade stays out of the average. Requires a grade of 55+',
  'מחשבון יעד למבחן': 'Exam target calculator', 'ציון יעד בקורס': 'Target course grade', 'משקל המבחן': 'Exam weight', 'ציון שאר הרכיבים': 'Grade of the other components',
  'מספיק לעבור את המבחן (55) כדי להגיע ליעד': 'Passing the exam (55) is enough to reach the target',
  'דרישות קדם': 'Prerequisites', 'הוסף דרישת קדם': 'Add prerequisite', 'נדרש עבור': 'Required for', 'הערות': 'Notes', 'מחק': 'Delete', 'משימה': 'Task',
  'ביטול': 'Cancel', 'שמור': 'Save', 'סגור': 'Close', 'נשמר': 'Saved', 'הקורס נמחק': 'Course deleted', 'בטל': 'Undo',
  'קורס עם המספר הזה כבר קיים': 'A course with this number already exists',
  'טוען נתונים מ-CheeseFork': 'Loading CheeseFork data', 'הקורס לא מופיע ב-CheeseFork בסמסטרים האחרונים': 'The course isn’t in CheeseFork in recent semesters',
  'נפתח ב': 'Offered in', 'הוסף מועדים למשימות': 'Add exam dates to tasks', 'דרישות קדם (מהטכניון': 'Prerequisites (from the Technion', 'מקצועות צמודים': 'Co-requisites',
  'סילבוס': 'Syllabus', 'קבוצות ושעות': 'Groups and times', 'למערכת': 'To timetable', 'המועדים כבר במשימות': 'The exam dates are already in your tasks',
  'כבר במערכת': 'Already in the timetable', 'מולאו': 'met', 'חסרות': 'missing', 'לא נפתח לאחרונה': 'not offered lately',
  'הקורס לא נפתח בסמסטרים האחרונים, אז אין לו שם ב-CheeseFork. לחץ כדי לראות אותו בקטלוג של הטכניון': 'This course hasn’t been offered in recent semesters, so CheeseFork has no name for it. Click to see it in the Technion catalog',
  'קטלוג הטכניון': 'Technion catalog', 'תיקייה בדרייב': 'Drive folder', 'שאל את היועץ': 'Ask the advisor', 'שאל את יועץ התואר על הקורס': 'Ask the degree advisor about this course',

  // ---------- tasks ----------
  'משימות ומבחנים': 'Tasks and exams', 'משימה חדשה': 'New task', 'עריכת משימה': 'Edit task', 'כותרת': 'Title', 'סוג': 'Type', 'תאריך': 'Date', 'שעה': 'Time',
  'בוצע': 'Done', 'השבוע הקרוב': 'Coming week', 'כל הפתוחות': 'All open', 'בוצעו': 'Done', 'הכל': 'All', 'כל הסוגים': 'All types', 'כל הקורסים': 'All courses',
  'משימות באיחור': 'Overdue', 'משימות להיום': 'Due today', 'בהמשך השבוע': 'Later this week', 'בהמשך': 'Later', 'בלי תאריך': 'No date',
  'אין משימות בשבוע הקרוב': 'No tasks this week', 'אין משימות פתוחות': 'No open tasks', 'אין משימות כאן': 'No tasks here', 'המשימה נמחקה': 'Task deleted',
  'פתח ב-Google Tasks': 'Open in Google Tasks', 'הוסף ליומן': 'Add to calendar', 'הוספה ליומן': 'add to calendar',
  'האפליקציה רק קוראת את היומן, אז ההוספה נעשית בחלון של Google': 'the app only reads your calendar, so you add it in Google’s window',
  'אפשר להפעיל ב⚙️ הגדרות כדי שהמשימה תופיע שם': 'turn it on in ⚙️ Settings so the task shows up there', 'הסנכרון כבוי': 'sync is off', 'מסתנכרן': 'syncs',
  'נשמר · יסונכרן ל-Google Tasks': 'Saved · will sync to Google Tasks', 'למשל: גיליון': 'e.g. Sheet', '— ללא —': '— none —',

  // ---------- timetable ----------
  'השבוע': 'This week', 'שבוע קודם': 'Previous week', 'שבוע הבא': 'Next week', 'הוסף שיעור': 'Add class', 'מחולל מערכות': 'Timetable generator',
  'שיעורים שהוספת כאן חוזרים כל שבוע. אירועים מ-Google Calendar מוצגים בצבע של היומן שלהם. לחץ על משבצת ריקה כדי להוסיף שיעור': 'Classes you add here repeat every week. Google Calendar events show in their calendar’s color. Click an empty slot to add a class',
  'שיעור חדש': 'New class', 'עריכת שיעור': 'Edit class', 'או כותרת חופשית': 'or a free title', 'למשל: שעת קבלה': 'e.g. office hours', 'יום': 'Day', 'התחלה': 'Start', 'סיום': 'End',
  'מיקום': 'Location', 'למשל: דן קאהן': 'e.g. Dan Kahn', 'בחר קורס או כתוב כותרת': 'Pick a course or write a title', 'שעת הסיום חייבת להיות אחרי ההתחלה': 'The end time must be after the start',
  'השיעור נמחק': 'Class deleted', 'כל היום': 'All day', 'פתח ב-Google Calendar': 'Open in Google Calendar',

  // ---------- planner ----------
  'התוכנית': 'Plan', 'קורסי בחירה': 'Electives', 'הזדמנויות': 'Opportunities', 'מילואים': 'Reserve duty',
  'סה״כ לתואר': 'Degree total', 'חובה פקולטית': 'Faculty mandatory', 'בחירה מתקדמת (א׳–ה׳': 'Advanced electives (A–E',
  'מלא = הושלם · מקווקו = בלימוד עכשיו · בהיר = מתוכנן. תוספת הניקוד של פיסיקה מורחבת נספרת כבחירה פקולטית': 'Solid = done · striped = in progress · light = planned. The extra credits of extended Physics count as a faculty elective',
  'ריק': 'Empty', 'סמסטרים': 'Semesters', 'מבחנים': 'Exams', 'הדפסה': 'Print',
  'רק מה שאפשר לקחת עכשיו (דרישות קדם מולאו': 'Only what I can take now (prerequisites met', 'חיפוש לפי שם או מספר': 'Search by name or number',
  'טוען מ-CheeseFork מתי כל קורס נפתח ומה דרישות הקדם': 'Loading from CheeseFork when each course is offered and its prerequisites',
  'לא נפתח לאחרונה ': 'not offered lately', 'חסרות דרישות קדם': 'missing prerequisites', 'לא נמצאו קורסים': 'No courses found', 'לתוכנית': 'To plan', 'בתוכנית': 'In plan',
  'ℹ️ פרטים, סילבוס ומועדים': 'ℹ️ Details, syllabus and exams', 'פרטים, סילבוס ומועדים': 'Details, syllabus and exams', 'טוען מ-CheeseFork': 'Loading from CheeseFork',
  'מועד א׳': 'Exam A', 'מועד ב׳': 'Exam B', 'אחראים': 'In charge', 'אחראי': 'In charge', 'קבוצות': 'Groups', 'השווה לקורסים אחרים': 'Compare with other courses',
  'לא הצלחתי לטעון מ-CheeseFork. סגור ופתח שוב כדי לנסות שוב': 'Couldn’t load from CheeseFork. Close and open again to retry',
  'באיזה סמסטר': 'Which semester', 'הוסף': 'Add', 'בחר קורס – הוא ייכנס לסמסטר לבחירתך': 'Pick a course – it goes into the semester you choose',
  'אתה עומד בתנאי הסף': 'You meet the requirements', 'עוד לא': 'Not yet', 'התוכניות': 'Programs', 'בתוכנית ✓': 'In plan ✓', 'הקורס לתוכנית': 'Course to plan',
  'פורמולה טכניון': 'Formula Technion', 'מרחיבים אופקים': 'Expanding Horizons', 'התמחות משנה ברובוטיקה (בין-פקולטית': 'Robotics minor (interfaculty',
  'קבוצת הסטודנטים שבונה רכב מרוץ חשמלי ואוטונומי. בפקולטה זה גם קורס בחירה: "פרויקט דגל – רכב מרוץ פורמולה" (034052, 2 נק״ז, רשימה ה׳)': 'The student team building an electric, autonomous race car. In the faculty it’s also an elective: "Flagship project – Formula race car" (034052, 2 credits, list E)',
  'הגשת מועמדות': 'Apply', 'טופס – מכני': 'Form – mechanical', 'טופס – אווירודינמיקה': 'Form – aerodynamics', 'טופס – אוטונומי': 'Form – autonomous', 'טופס – חשמל': 'Form – electrical',
  'התמחות נוספת לצד התואר, עם תעודה. דרישות: מצב אקדמי תקין, ממוצע 75+ ו-36 נק״ז לפחות בפקולטה. כל תוכנית 10+ נק״ז שנספרות כמל״ג או כבחירה. הגשה למזכירות הפקולטה עד 7 ימי עבודה לפני תחילת הסמסטר': 'An additional specialization alongside the degree, with a certificate. Requirements: good academic standing, an average of 75+ and at least 36 credits in the faculty. Each program is 10+ credits that count as enrichment or electives. Apply to the faculty office up to 7 working days before the semester starts',
  'אוריינות דיגיטלית (13 נק״ז): פייתון 234128 ✓ + מבוא לניתוח נתונים 094202 או מבני נתונים 234268 + 6 נק״ז קורסים חישוביים בפקולטה': 'Digital literacy (13 credits): Python 234128 ✓ + Intro to Data Analysis 094202 or Data Structures 234268 + 6 credits of computational courses in the faculty',
  'מנהיגות יזמית (10 נק״ז): 324528 + 324527': 'Entrepreneurial leadership (10 credits): 324528 + 324527',
  'כלכלה (20 נק״ז, ממוצע 80+): 094591/094594, 094503, 094504, 094513, 096570, 094564': 'Economics (20 credits, average 80+): 094591/094594, 094503, 094504, 094513, 096570, 094564',
  'הנדסת מערכות אווירונאוטיות (10.5 נק״ז): 085201, 084143 + פרויקט שנתי': 'Aeronautical systems engineering (10.5 credits): 085201, 084143 + annual project',
  'מנהיגות ורב-תחומיות בהנדסה (10 נק״ז): 014013, 016000 + 5 נק״ז': 'Leadership and multidisciplinarity in engineering (10 credits): 014013, 016000 + 5 credits',
  'תחבורה, הנדסת סביבה, הידרולוגיה ומשאבי מים (10 נק״ז כל אחת': 'Transportation, environmental engineering, hydrology and water resources (10 credits each',
  'לעמוד התוכנית': 'Program page',
  'תעודה טכניונית נוספת, 27 נק״ז מעבר לחובה. סף כניסה: ממוצע מצטבר 87.0 ולפחות 60 נק״ז. רשימות: קדם (בקרה), מבוא לרובוטיקה, למידה ובינה מלאכותית, מעבדה מעשית, ו-4 קורסי ליבה ברובוטיקה': 'An additional Technion certificate, 27 credits beyond the required ones. Entry: a cumulative average of 87.0 and at least 60 credits. Lists: prerequisite (control), intro to robotics, learning and AI, a practical lab, and 4 core robotics courses',
  'תוכניות ומסלולים': 'Programs and tracks',

  // ---------- reserve duty ----------
  'לא שירתתי': 'Didn’t serve', 'קבוצה': 'Group', 'איך נקבעת הקבוצה': 'How is the group set', 'עוברים בינאריים': 'Binary passes',
  'פחות מ-21 ימי שירות מצטברים בסמסטר': 'Less than 21 cumulative days of service in the semester',
  '21+ ימים בסמסטר, או 60+ ימים שהתחילו עד 3 חודשים לפני הסמסטר': '21+ days in the semester, or 60+ days that started up to 3 months before the semester',
  '35+ ימי שירות מצטברים בסמסטר': '35+ cumulative days of service in the semester',
  'סמסטר נוסף עם 42+ ימי שירות בשנה': 'an extra semester with 42+ days of service a year', 'שני סמסטרים נוספים עם 84+ ימי שירות בשנה': 'two extra semesters with 84+ days of service a year',
  'ההמרה מוציאה את הציון מהממוצע, והנק״ז נשארות. כדאי להמיר את הקורסים שמעלים את הממוצע הכי הרבה': 'Converting takes the grade out of the average and keeps the credits. Convert the courses that raise your average the most',
  'סמן כעובר': 'Mark as pass', 'אין קורסים עם ציון 55+ בשנה הזו': 'No courses with a grade of 55+ this year',
  'בחר קבוצת מילואים לסמסטרים שבהם שירתת כדי לראות כמה עוברים בינאריים מגיעים לך': 'Choose your reserve-duty group for the semesters you served to see how many binary passes you get',
  'הזכויות שלך': 'Your rights', 'מועד מיוחד': 'Special exam date',
  'לכל מבחן שהחמצת בגלל שירות (גם בבחנים), אם שירתת ביום המבחן, 3+ ימים בשבוע שלפניו, 10 ימים רצופים / 14 מצטברים בסמסטר, או 10 ימים בתקופת המבחנים': 'for any exam you missed because of service (quizzes too), if you served on the exam day, 3+ days in the week before, 10 consecutive / 14 cumulative days in the semester, or 10 days during the exam period',
  '25% תוספת זמן': '25% extra time', 'בשני מועדי הבחינה בסמסטר': 'in both exam dates in the semester', 'במבחן הראשון בכל קורס (לפי ימי השירות': 'in the first exam in each course (by days of service',
  'הערכה חלופית / מבחן מותאם': 'Alternative assessment / adapted exam', 'בשיקול המרצה': 'at the lecturer’s discretion', 'הארכת הגשות': 'Deadline extensions',
  'לפחות במספר ימי השירות (אם השירות היה בשבועיים שלפני ההגשה). שירות של 14+ ימים: מטלה חלופית או הפחתה יחסית במספר המטלות': 'by at least the number of days served (if the service was in the two weeks before the deadline). 14+ days of service: an alternative assignment or a proportional cut in the number of assignments',
  'פטור מנק״ז': 'Credit exemption', 'בקשה דרך רכז/ת המילואים בפקולטה': 'Apply through the faculty reserve-duty coordinator', 'בקשה ללימודי הסמכה': 'Apply to undergraduate studies',
  'הארכת לימודים': 'Extended studies', 'נק״ז פעילות חברתית': 'credits for social activity', 'על 14+ ימי מילואים בשנה (עד 2 בתואר)': 'for 14+ reserve days a year (up to 2 in the degree)',
  'פטור משכר לימוד לקורס אחד עם 22+ ימי שירות בשנה, ולשני קורסים עם 30+': 'tuition waiver for one course with 22+ days of service a year, and for two courses with 30+',
  'תמיכה': 'Support', 'חונכות ושיעורי עזר דרך המרכז לייעוץ, חדרי לימוד, שירות פסיכולוגי ומענקים בדיקנאט. מתווה 300+ למי ששירת מעל 300 ימים מ-7.10.23': 'mentoring and tutoring through the counseling center, study rooms, psychological services and grants from the Dean of Students. A 300+ track for those who served over 300 days since 7.10.23',
  'תשפ״ז: המתווה המלא לשנה הזו עוד לא פורסם. רכזת מילואים': '2026/27: this year’s full outline hasn’t been published yet. Reserve-duty coordinator',
  'מתווה המילואים – לימודי הסמכה': 'Reserve-duty outline – undergraduate', 'טופס בקשת התאמות': 'Accommodations request form', 'מסמך המתווה תשפ״ו (PDF': 'Outline document 2025/26 (PDF',
  'דיקנאט – מילואים ותמיכה': 'Dean of Students – reserve duty and support', 'למילואים בתכנון תואר': 'Reserve duty in Degree planning',

  // ---------- radar ----------
  'האקתונים, תחרויות ואירועים': 'Hackathons, competitions and events', 'בדוק עכשיו': 'Check now', 'מחפש': 'Searching',
  'פעם בשבוע Claude מחפש ברשת האקתונים, תחרויות, מלגות, כנסים ומשרות סטודנט שמתאימים לך': 'Once a week Claude searches the web for hackathons, competitions, scholarships, conferences and student jobs that fit you',
  'עוד לא נבדק': 'Not checked yet', 'כל בדיקה עולה בערך 20–50 סנט': 'Each check costs about 20–50 cents',
  'עם מפתח AI (קו״ח ← 🤖 הגדרות AI) האפליקציה תחפש בשבילך פעם בשבוע. עד אז, כאן כדאי לבדוק': 'With an AI key (CV → 🤖 AI settings) the app searches for you once a week. Until then, these are good places to look',
  'האקתון': 'Hackathon', 'תחרות': 'Competition', 'מלגה': 'Scholarship', 'אירוע / כנס': 'Event / conference', 'משרת סטודנט / התמחות': 'Student job / internship', 'תוכנית': 'Program',
  'לפרטים': 'Details', 'תזכורת במשימות': 'Reminder in tasks', 'לא נמצאו הזדמנויות פתוחות כרגע': 'No open opportunities right now',
  'אירועים בטכניון': 'Technion events', 'דיקנאט הסטודנטים': 'Dean of Students', 'הפקולטה להנדסת מכונות': 'Faculty of Mechanical Engineering', 'חיפוש האקתונים לסטודנטים': 'Search for student hackathons',
  'אין הזדמנויות חדשות השבוע': 'No new opportunities this week', 'בדיקת ההזדמנויות נכשלה': 'The opportunity check failed', 'החיפוש לא הסתיים ברשימה. נסה שוב': 'The search didn’t finish with a list. Try again',
  'הזדמנויות חדשות השבוע': 'New opportunities this week',

  // ---------- notifications / digest ----------
  'עדכונים והתראות': 'Updates and notifications', 'הסיכום השבועי': 'Weekly digest', 'מתעדכן בכל יום ראשון': 'updated every Sunday', 'להגשה השבוע': 'due this week',
  'מבחנים בשבועיים': 'exams in 2 weeks', 'קורסים בלי ציון': 'courses without a grade', 'אין הגשות השבוע': 'Nothing due this week',
  'מבחנים בשבועיים הקרובים': 'Exams in the next two weeks', 'אין מבחנים בשבועיים הקרובים': 'No exams in the next two weeks',
  'קורסים שהסמסטר שלהם נגמר ואין להם ציון': 'Courses whose semester ended without a grade', 'כל הקורסים מסמסטרים קודמים מעודכנים': 'All courses from past semesters are up to date',
  'השיעורים של היום': 'Today’s classes', 'אין שיעורים במערכת להיום': 'No classes today', 'משימות דחופות (עד 3 ימים': 'Urgent tasks (up to 3 days', 'אין משימות דחופות': 'No urgent tasks',
  'אין מבחנים קרובים': 'No upcoming exams', 'תזכורת 10 דקות לפני שיעור': 'Reminder 10 minutes before class', 'התראה במכשיר הזה': 'Notify on this device',
  'עובדת רק כשהאפליקציה פתוחה (דפדפן או PWA פתוחים ברקע). להתראות כשהאפליקציה סגורה השתמש ב-Instinct ב-WhatsApp': 'Works only while the app is open (browser or PWA open in the background). For notifications when it’s closed, use Instinct on WhatsApp',
  'ההרשאה נדחתה בדפדפן': 'The browser denied permission', 'התראות הופעלו': 'Notifications on', 'הסיכום השבועי שלך': 'Your weekly digest',

  // ---------- comparator / tools ----------
  'השוואת קורסים': 'Compare courses', 'בחר עד שלושה קורסים ליד זה. הנתונים מ-CheeseFork לסמסטר הנוכחי (או האחרון שפורסם)': 'Pick up to three courses side by side. Data from CheeseFork for the current semester (or the latest published)',
  'חפש קורס לפי שם או מספר': 'Search a course by name or number', 'בתוכנית שלי': 'In my plan', 'לא נמצא קורס': 'No course found', 'בחר קורס כדי להתחיל': 'Pick a course to start',
  'נפתח': 'Offered', 'לא נמצא': 'Not found', 'הסר': 'Remove', 'באותו יום': 'on the same day', 'ברצף של יום אחד': 'one day apart',
  'אפשר לשלב בלי התנגשות בהרצאות': 'can be combined without lecture clashes', 'כל קבוצות ההרצאה מתנגשות': 'all lecture groups clash',
  'לוח מבחנים ומרווחים': 'Exam calendar and gaps', 'אין מועדים': 'No dates', 'עוד לא פורסמו מועדים לקורסים שלך. אם הקורסים לא מסומנים "בלימוד" – סמן אותם בתוכנית': 'No exam dates published for your courses yet. If your courses aren’t marked "in progress", mark them in the plan',
  'מחולל מערכות שעות': 'Timetable generator', 'בוחר קבוצה אחת מכל סוג (הרצאה / תרגול / מעבדה) לכל קורס ומציג את השילובים בלי התנגשויות. CheeseFork לא מציין איזה תרגול שייך לאיזו הרצאה, אז בדוק את השיבוץ מול המערכת הרשמית': 'Picks one group of each type (lecture / tutorial / lab) per course and shows the combinations without clashes. CheeseFork doesn’t say which tutorial belongs to which lecture, so check against the official system',
  'אין מערכת': 'no schedule', 'אין קורסים בלימוד בסמסטר הנוכחי': 'No courses in progress this semester', 'ימים חופשיים (בלי לימודים': 'Days off (no classes', 'לא להתחיל לפני': 'Don’t start before',
  'ללא הגבלה': 'No limit', 'חשב שילובים': 'Find combinations', 'בחר לפחות קורס אחד': 'Pick at least one course', 'אין שילוב בלי התנגשויות. נסה להוריד קורס או להקל בהגבלות': 'No clash-free combination. Try removing a course or relaxing the limits',
  'השתמש במערכת הזו': 'Use this timetable', 'להחליף את השיעורים הקיימים של הקורסים האלה במערכת השעות': 'Replace these courses’ existing classes in the timetable', 'המערכת נשמרה': 'Timetable saved',
  'ניהול סמסטרים': 'Manage semesters', 'הוסף סמסטרים לתוכנית (עד 14) או סמסטר קיץ אחרי כל סמסטר אביב. אפשר להסיר רק סמסטר ריק': 'Add semesters to the plan (up to 14) or a summer semester after each spring. Only an empty semester can be removed',
  'הוסף סמסטר': 'Add semester', 'סמסטרי קיץ': 'Summer semesters', 'אחרי סמסטר': 'after semester', 'יש קורסים': 'has courses', 'אין עדיין סמסטר אביב בתוכנית': 'No spring semester in the plan yet',
  'זכויות ושאלות נפוצות': 'Rights and FAQ', 'מידע כללי שנאסף ממקורות הטכניון והפקולטה. תמיד לאמת מול הפקולטה לפני החלטה': 'General information from Technion and faculty sources. Always check with the faculty before deciding',
  'איך מחושב הממוצע': 'How is the average calculated',
  'ממוצע משוקלל לפי נק״ז: סכום (ציון × נק״ז) חלקי סך הנק״ז המדורגות. קורסים עם עובר בינארי ופטורים נספרים בנק״ז לתואר אבל לא נכנסים לממוצע': 'A credit-weighted average: the sum of (grade × credits) divided by the total graded credits. Binary-pass and exempt courses count toward degree credits but not the average',
  'מה סף ההצטיינות': 'What are the honors thresholds', 'מה נדרש לתואר במכונות': 'What does the ME degree require', 'מהו עובר בינארי (מילואים': 'What is a binary pass (reserve duty',
  'לאיזו קבוצת מילואים אני שייך': 'Which reserve-duty group am I in', 'פטור מנק״ז והארכת לימודים': 'Credit exemption and extended studies', 'מועדים מיוחדים והתאמות': 'Special exam dates and accommodations',
  'מועד מיוחד למבחן שהוחמץ בגלל שירות, תוספת זמן של 25%, הארכת הגשות לפי ימי השירות ומטלה חלופית בשירות ארוך. פירוט מלא וההתאמות לפי הקבוצה שלך בטאב תכנון תואר ← מילואים': 'A special date for an exam missed because of service, 25% extra time, deadline extensions by days served and an alternative assignment for long service. Full details and the accommodations for your group in Degree planning → Reserve duty',
  'סמסטר קיץ ושכר לימוד': 'Summer semester and tuition', 'מה זה סמסטר קיץ בתוכנית': 'What is a summer semester in the plan',
  'אפשר להוסיף סמסטר קיץ אחרי כל סמסטר אביב דרך תכנון תואר ← 🗓️ סמסטרים, ולשבץ אליו קורסים כמו לכל סמסטר אחר': 'You can add a summer semester after any spring semester in Degree planning → 🗓️ Semesters, and schedule courses in it like any other semester',
  'פורטל הסטודנטים': 'Student portal', 'רכזת מילואים': 'Reserve-duty coordinator',
  'ייצוא מפת הקורסים כתמונה': 'Export the course map as an image', 'הדפסת התוכנית': 'Print the plan', 'התמונה נשמרה': 'Image saved', 'מפת-הקורסים.png': 'course-map.png',
  'סיור באפליקציה': 'App tour', 'ניהול סמסטרים וקיץ': 'Manage semesters and summers',

  // ---------- advisor ----------
  'שאל על התואר שלך': 'Ask about your degree', 'שיחה חדשה': 'New chat', 'שלח': 'Send',
  'שאל אותי על התואר שלך: מה לקחת בהמשך, אם אתה בקצב, מה יקרה לממוצע אם…, דרישות וזכויות מילואים. אני רואה את התוכנית, הציונים, המשימות ונתוני CheeseFork': 'Ask me about your degree: what to take next, whether you’re on track, what happens to your average if…, requirements and reserve-duty rights. I can see your plan, grades, tasks and CheeseFork data',
  'מה כדאי לי לקחת בסמסטר הבא': 'What should I take next semester', 'האם אני בקצב לסיים את התואר בזמן': 'Am I on track to finish on time',
  'מה יקרה לממוצע שלי אם אקבל 90 בכל הקורסים שאני לומד עכשיו': 'What happens to my average if I get 90 in all my current courses',
  'אילו דרישות בחירה עוד חסרות לי': 'Which elective requirements am I still missing', 'איך עובר בינארי במילואים ישפיע על הממוצע שלי': 'How would a reserve-duty binary pass affect my average',
  'שאל שאלה על התואר… (Enter לשליחה, Shift+Enter לשורה חדשה': 'Ask about your degree… (Enter to send, Shift+Enter for a new line',
  'היועץ רק מציע – הוא לא משנה את התוכנית, הציונים או המשימות. כל שאלה נשלחת ל-Anthropic עם נתוני התואר שלך (עולה כמה סנטים)': 'The advisor only suggests – it never changes your plan, grades or tasks. Each question is sent to Anthropic with your degree data (costs a few cents)',
  'היועץ משתמש ב-Claude עם מפתח API משלך – אותו מפתח של התאמת קורות החיים': 'The advisor uses Claude with your own API key – the same key as the CV tailoring',
  'נדרש חיוב לפי שימוש; שאלה עולה בדרך כלל כמה סנטים)': 'pay-as-you-go billing; a question usually costs a few cents)',
  'להגדרות AI': 'To AI settings', 'חושב': 'Thinking', 'מפתח ה-API לא תקין. בדוק אותו בהגדרות AI': 'The API key is invalid. Check it in AI settings',
  'הבקשה נדחתה על ידי Claude': 'Claude declined the request',

  // ---------- settings ----------
  'איך פותחים בטלפון': 'How to open on your phone',
  'הנתונים נשמרים בתיקייה מוסתרת בגוגל דרייב שלך (רק האפליקציה הזו רואה אותה), ומסתנכרנים בין המחשב, האייפד והטלפון': 'Your data is kept in a hidden folder in your Google Drive (only this app can see it), and syncs between your computer, iPad and phone',
  'סנכרון אחרון': 'Last sync', 'אף פעם': 'never', 'התנתק': 'Disconnect',
  'הסנכרון האוטומטי רץ פעם ביום, בפתיחה הראשונה של האפליקציה באותו יום. בכל רגע אפשר ללחוץ "סנכרן עכשיו"': 'Automatic sync runs once a day, the first time you open the app that day. You can press "Sync now" any time',
  'סנכרן גם מיד אחרי כל שינוי (שימושי כשעובדים על שני מכשירים באותו יום': 'Also sync right after every change (useful when you use two devices on the same day',
  'הסנכרון עובד רק כשהאפליקציה מוגשת מכתובת https (למשל GitHub Pages)': 'Sync only works when the app is served over https (e.g. GitHub Pages)',
  'מתקדם: Client ID': 'Advanced: Client ID',
  'היומן במערכת השעות': 'Calendar in the timetable', 'מערכת השעות מציגה אירועים מהיומנים המסומנים, רק מהקטגוריות (צבעים) שבחרת. קריאה בלבד': 'The timetable shows events from the checked calendars, only from the categories (colors) you chose. Read-only',
  'יומנים': 'Calendars', 'טוען יומנים': 'Loading calendars', 'קטגוריות לפי צבע': 'Categories by color', 'Instinct צובע כל אירוע לפי הקטגוריה שלו. סמן את צבעי הלימודים': 'Instinct colors each event by its category. Check the study colors',
  'נראה כמו לימודים': 'looks like studies', 'אין אירועים ב-10 השבועות הקרובים ביומנים שנבחרו': 'No events in the next 10 weeks in the chosen calendars', 'סורק את היומן': 'Scanning the calendar', 'סרוק שוב': 'Scan again',
  'סנכרון דו-כיווני של המשימות עם Google Tasks': 'Two-way task sync with Google Tasks', 'משימות בלי קורס': 'tasks without a course', 'לא לסנכרן': 'don’t sync', 'טוען רשימות': 'Loading lists',
  'סנכרון המשימות נכשל': 'Task sync failed',
  'Google Calendar ו-Google Tasks': 'Google Calendar and Google Tasks', 'כדי להציג את היומן במערכת השעות ולסנכרן משימות, צריך לאשר הרשאות חדשות פעם אחת': 'To show your calendar in the timetable and sync tasks, approve new permissions once',
  'אשר גישה ליומן ולמשימות': 'Allow calendar and tasks access',
  'התואר': 'Degree', 'סה״כ נק״ז לתואר': 'Total degree credits', 'מספר סמסטרים': 'Number of semesters',
  'מראה ושפה': 'Appearance and language', 'ערכת צבעים': 'Color theme', 'כהה': 'Dark', 'בהיר': 'Light', 'לפי המכשיר': 'Match device', 'שפה · Language': 'Language',
  'נשמר במכשיר הזה. נתונים רשמיים מהטכניון (שמות קורסים, סילבוסים) נשארים בעברית': 'Saved on this device. Official Technion data (course names, syllabi) stays in Hebrew',
  'עזרה ומידע': 'Help and info', 'סיור קצר שמראה כל מה שהאפליקציה יודעת לעשות, תשובות על זכויות ונהלים, ויועץ AI שעונה לפי הנתונים שלך': 'A short tour of everything the app can do, answers about rights and procedures, and an AI advisor that answers from your data',
  'גיבוי': 'Backup', 'ייצוא לקובץ': 'Export to file', 'ייבוא מקובץ': 'Import from file', 'אפס תוכנית לימודים': 'Reset study plan',
  'איפוס מחזיר את רשימת הקורסים לתוכנית ברירת המחדל (הציונים והסטטוסים יימחקו; אפשר לבטל מיד אחרי). משימות ומערכת שעות לא נפגעות': 'Reset returns the course list to the default plan (grades and statuses are cleared; you can undo right after). Tasks and the timetable aren’t affected',
  'גיבויים אוטומטיים מ-Drive (7 ימים': 'Automatic backups from Drive (7 days', 'שחזר': 'Restore', 'עוד אין גיבויים. הראשון נוצר בסנכרון הבא': 'No backups yet. The first one is made at the next sync',
  'צריך חיבור פעיל: לחץ על כפתור הסנכרון': 'Needs an active connection: press the sync button', 'השחזור נכשל': 'Restore failed', 'הגיבוי שוחזר': 'Backup restored',
  'לאפס את כל הקורסים לתוכנית ברירת המחדל': 'Reset all courses to the default plan', 'התוכנית אופסה': 'Plan reset',
  'לשחזר את הגיבוי הזה? השינויים שאחריו יוחלפו (אפשר לבטל מיד אחרי)': 'Restore this backup? Changes made after it will be replaced (you can undo right after)',
  'לנתק את הסנכרון במכשיר הזה? הנתונים המקומיים יישארו': 'Disconnect sync on this device? Local data stays',
  'הדבק קודם Client ID': 'Paste a Client ID first', 'הקובץ הזה לא גיבוי של האפליקציה': 'This file isn’t a backup of this app', 'לא נמצאו רשומות תקינות בקובץ': 'No valid records in the file',
  'פתיחה בטלפון, באייפד ובמחשב': 'Open on your phone, iPad and computer', 'האפליקציה מותקנת במכשיר הזה': 'The app is installed on this device', 'סרוק עם המצלמה של הטלפון': 'Scan with your phone’s camera',
  'הכתובת של האפליקציה': 'The app’s address', 'העתק קישור': 'Copy link', 'שלח לעצמי בוואטסאפ': 'Send to myself on WhatsApp', 'שתף': 'Share', 'הקישור הועתק': 'Link copied', 'העתק את הקישור': 'Copy the link',
  'אייפון / אייפד': 'iPhone / iPad', 'אנדרואיד': 'Android', 'מחשב': 'Computer', 'קוד QR לכתובת האפליקציה': 'QR code for the app’s address',
  'אין אינטרנט להצגת הקוד. השתמש בקישור': 'No internet to show the code. Use the link',
  'חיבור ל-Google עושים פעם אחת בכל מכשיר. אחרי זה הנתונים מסתנכרנים לבד פעם ביום, או מיד בלחיצה על כפתור הסנכרון למעלה': 'You connect to Google once on each device. After that your data syncs by itself once a day, or right away with the sync button at the top',
  'האפליקציה תיפתח בחלון משלה, ותופיע בתפריט התחל': 'The app opens in its own window and appears in the Start menu',
  'משהו השתבש במסך הזה': 'Something went wrong on this screen', 'נסה מסך אחר, או ייצא גיבוי מההגדרות. אם זה חוזר, אפשר לנקות את הנתונים במכשיר הזה ולסנכרן מחדש': 'Try another screen, or export a backup from Settings. If it keeps happening, you can clear the data on this device and sync again',
  'להגדרות': 'To settings', 'נקה נתונים מקומיים': 'Clear local data', 'למחוק את הנתונים המקומיים במכשיר הזה? מה שמסונכרן ב-Google יחזור בסנכרון הבא': 'Delete the local data on this device? Whatever is synced to Google comes back at the next sync',

  // ---------- performance ----------
  'ממוצע לפי סמסטר': 'Average by semester', 'ממוצע מצטבר': 'Cumulative average', 'ממוצע סמסטר': 'Semester average', 'התפלגות ציונים': 'Grade distribution', 'התפלגות נק״ז': 'Credit distribution',
  'נק״ז לפי קטגוריה': 'Credits by category', 'הצטיינות דיקן': 'Dean’s list', 'הצטיינות נשיא': 'President’s list', 'סימולטור הצטיינות דיקן ונשיא': 'Dean’s and President’s honors simulator',
  'נק״ז שהושלמו': 'credits done', 'קורסים שעברו': 'courses passed', 'קורסים עם ציון': 'graded courses', 'סמסטר מוביל': 'Top semester', 'עדיין אין ציונים': 'No grades yet',
  'עדיין אין סמסטרים עם ציונים': 'No semesters with grades yet', 'תחזית לסמסטר הנוכחי': 'Forecast for the current semester', 'סמן קורסים כ"בלימוד" כדי לראות תחזית': 'Mark courses as "in progress" to see a forecast',
  'יעד ממוצע לסוף התואר': 'Target average for the end of the degree', 'הממוצע שאני רוצה בסוף': 'The average I want at the end', 'כבר מובטח': 'already secured', 'לא אפשרי': 'not possible',
  'דיקן': 'Dean', 'נשיא': 'President', 'מתחת לסף': 'below the threshold', 'קורסים בעובר בינארי או בפטור לא נספרים לממוצע ההצטיינות': 'Binary-pass or exempt courses don’t count toward the honors average',
  'מספר קורסים בכל טווח': 'Number of courses in each range', 'ממתין לציונים': 'awaiting grades', 'צפוי': 'expected', 'מהגבוה לנמוך': 'highest to lowest', 'כל הציונים': 'All grades',
  'תקציר ומדדים': 'Summary and metrics', 'גרפים וניתוח ציונים': 'Charts and grade analysis', 'ממוצעים, נק״ז, הצטיינות ומגמות בציונים': 'Averages, credits, honors and grade trends',

  // ---------- CV ----------
  'פרופיל אחד, וגרסה מותאמת לכל משרה או חברה. הכול מסתנכרן ל-Google Drive': 'One profile, and a tailored version for each job or company. Everything syncs to Google Drive',
  'ייבוא קו״ח קיים': 'Import an existing CV', 'מלא השכלה מהתואר': 'Fill education from the degree', 'הפרופיל שלי': 'My profile', 'התאמה למשרה': 'Tailor to a job', 'הגדרות AI': 'AI settings',
  'פרטים אישיים': 'Personal details', 'שם מלא': 'Full name', 'אימייל': 'Email', 'טלפון': 'Phone', 'אתר / תיק עבודות': 'Website / portfolio', 'תקציר': 'Summary', 'כישורים': 'Skills', 'שפות': 'Languages',
  'השכלה': 'Education', 'ניסיון תעסוקתי': 'Experience', 'פרויקטים': 'Projects', 'שירות צבאי': 'Military service', 'התנדבות': 'Volunteering', 'פרסים והצטיינויות': 'Awards',
  'תואר': 'Degree', 'תחום': 'Field', 'מוסד': 'Institution', 'תפקיד': 'Role', 'חברה': 'Company', 'שם הפרויקט': 'Project name', 'יחידה': 'Unit', 'ארגון': 'Organization', 'שם': 'Name', 'מטעם': 'From',
  'נקודות (שורה לכל נקודה': 'Bullets (one per line', 'שורה לכל שפה': 'One language per line', 'שורה לכל קבוצה, בפורמט "קבוצה: א, ב, ג"': 'One group per line, as "group: a, b, c"',
  'למשל: סטודנט/ית להנדסת מכונות – תכן מכני': 'e.g. Mechanical engineering student – mechanical design', 'כותרת (למשל: סטודנט להנדסת מכונות': 'Headline (e.g. mechanical engineering student',
  'תקציר (2–3 משפטים': 'Summary (2–3 sentences', 'משרה / חברה חדשה': 'New job / company', 'צור יעד ראשון: המשרה או החברה שאליה אתה מגיש': 'Create a first target: the job or company you’re applying to',
  'משרה': 'Job', 'למשל: אלביט, אינטל, Formula Technion': 'e.g. Elbit, Intel, Formula Technion', 'מודעת הדרושים / תיאור החברה (הדבק כאן': 'Job ad / company description (paste here',
  'הדבק את הטקסט של המשרה, דרישות, תיאור החברה': 'Paste the job text, requirements, company description', 'הנחיות והכוונות שלך': 'Your instructions',
  'למשל: עמוד אחד, באנגלית, להדגיש את פרויקט הפורמולה ו-SolidWorks, בלי שירות צבאי': 'e.g. one page, in English, highlight the Formula project and SolidWorks, no military service',
  'תבנית': 'Template', 'קלאסי': 'Classic', 'מודרני': 'Modern', 'צפוף (עמוד אחד': 'Compact (one page', 'התאם (בלי AI': 'Tailor (no AI', 'התאם עם AI': 'Tailor with AI', 'העתק פרומפט': 'Copy prompt',
  'הוסף מפתח בהגדרות AI': 'Add a key in AI settings', 'תצוגה מקדימה': 'Preview', 'הגרסה הבסיסית': 'Base version', 'הגרסה למשרה': 'Job version', 'הותאם לפי מילות מפתח': 'Tailored by keywords',
  'הותאם עם AI': 'Tailored with AI', 'לחץ "התאם" כדי ליצור את הגרסה למשרה הזו': 'Press "Tailor" to create the version for this job', 'העתק טקסט': 'Copy text', 'שכפל': 'Duplicate',
  'למחוק את הגרסה הזו': 'Delete this version', 'למחוק את הפריט': 'Delete this item', 'מכוסה': 'covered', 'חסר': 'missing', 'הטקסט הועתק': 'Text copied', 'הגרסה מוכנה': 'Version ready',
  'הפרומפט הועתק. הדבק ב-Claude או Gemini': 'Prompt copied. Paste it into Claude or Gemini', 'ההתאמה עם AI נכשלה': 'AI tailoring failed',
  'הסדר שונה לפי הרלוונטיות למודעה. הנוסח עצמו לא השתנה. להתאמה מלאה של הנוסח השתמש ב-AI': 'The order changed by relevance to the ad. The wording itself didn’t change. For full rewording, use AI',
  'כל מילות המפתח העיקריות מהמודעה כבר מופיעות': 'All the main keywords from the ad already appear',
  'חלק מהתוכן בעברית. לקו״ח באנגלית מלאה השתמש ב"התאם עם AI" (מתרגם), או כתוב את הפרופיל באנגלית': 'Some content is in Hebrew. For a fully English CV use "Tailor with AI" (it translates), or write the profile in English',
  'התאמה עם Claude (אופציונלי': 'Tailoring with Claude (optional',
  'בלי AI האפליקציה מסדרת את קורות החיים לפי מילות המפתח במודעה. עם AI, Claude כותב מחדש את הניסוח למשרה, לפי ההנחיות שלך, בלי להמציא עובדות': 'Without AI the app orders your CV by the ad’s keywords. With AI, Claude rewrites the wording for the job, following your instructions, without inventing facts',
  'נדרש חיוב לפי שימוש; התאמה של קו״ח עולה בדרך כלל כמה סנטים)': 'pay-as-you-go billing; tailoring a CV usually costs a few cents)',
  'הדבק אותו כאן. המפתח נשמר': 'Paste it here. The key is stored', 'רק במכשיר הזה': 'only on this device', 'הוא לא מסתנכרן ל-Google ולא נשלח לשום מקום חוץ מ-Anthropic': 'it doesn’t sync to Google and isn’t sent anywhere except Anthropic',
  'מחק מפתח': 'Delete key', 'המפתח נשמר במכשיר הזה': 'Key saved on this device',
  'ייבוא קורות חיים': 'Import CV', 'קורא את הקובץ': 'Reading the file', 'הטקסט שחולץ (אפשר לתקן לפני הייבוא': 'Extracted text (you can fix it before importing',
  'הזיהוי האוטומטי הוא "הכי טוב שאפשר". אחרי הייבוא עבור על הפרופיל ותקן': 'Automatic detection is "best effort". After importing, go over the profile and fix it',
  'עם AI הזיהוי מדויק יותר': 'With AI the detection is more accurate', 'עם מפתח AI הזיהוי מדויק יותר': 'With an AI key the detection is more accurate', 'ייבא': 'Import', 'ייבוא עם AI': 'Import with AI',
  'להחליף את הפרופיל הקיים (אחרת: להוסיף אליו': 'Replace the existing profile (otherwise: add to it', 'הייבוא הושלם. עבור על הפרופיל ותקן': 'Import done. Go over the profile and fix it',
  'הייבוא עם AI נכשל': 'AI import failed', 'ההשכלה עודכנה מנתוני התואר': 'Education updated from your degree data',
  'לא מצאתי טקסט בקובץ. אם זה PDF סרוק (תמונה), הדבק את הטקסט ידנית': 'No text found in the file. If it’s a scanned PDF (image), paste the text by hand',
  'לא הצלחתי לקרוא את הקובץ': 'Couldn’t read the file', 'טעינת הספרייה נכשלה (צריך אינטרנט': 'Loading the library failed (needs internet',
  'צריך מפתח API של Anthropic (בלשונית "הגדרות AI"': 'You need an Anthropic API key (in the "AI settings" tab',

  // ---------- grade sheet ----------
  'גיליון ציונים': 'Grade sheet', 'קורא את הגיליון': 'Reading the sheet', 'לא מצאתי קורסים בקובץ. זה גיליון הציונים מהטכניון': 'No courses found in the file. Is this the Technion grade sheet',
  'לא הצלחתי לטעון את קורא ה-PDF (צריך אינטרנט': 'Couldn’t load the PDF reader (needs internet', 'הכנס למפה': 'Put on the map',
  'קורסים בלי נק״ז (השלמות, אנגלית, עברית) לא נכנסים. הציונים יחליפו את מה שמופיע עכשיו במפה': 'Courses without credits (supplementary, English, Hebrew) aren’t included. The grades replace what the map shows now',

  // ---------- tour ----------
  'ברוכים הבאים ל"התואר שלי"': 'Welcome to "My Degree"',
  'כל התואר במקום אחד: מפת קורסים, תכנון, ציונים, משימות, מערכת שעות, קורות חיים ויועץ AI. הסיור לוקח בערך דקה וחצי – אפשר לדלג בכל רגע': 'Your whole degree in one place: course map, planning, grades, tasks, timetable, CV and an AI advisor. The tour takes about a minute and a half – skip any time',
  'הממוצע וההתקדמות': 'Average and progress', 'ממוצע משוקלל ונק״ז שהושלמו מתוך התואר. כמה קורסים עברת וכמה נק״ז אתה לומד עכשיו מופיעים במרכז הביצועים. לחיצה כאן פותחת את מרכז הביצועים': 'Weighted average and credits done out of the degree. Courses passed and credits in progress are in Performance. Clicking here opens it',
  'כמה משימות צריך להגיש בשבעת הימים הקרובים (כולל מה שבאיחור), וכמה מהן באיחור או להיום. לחיצה פותחת את משימות השבוע': 'How many tasks are due in the next seven days (including overdue ones), and how many are overdue or due today. Clicking opens this week’s tasks',
  'הנתונים נשמרים ב-Google Drive שלך ומסתנכרנים בין המחשב, האייפד והטלפון – אוטומטית פעם ביום, או מיד בלחיצה': 'Your data is kept in your Google Drive and syncs between your computer, iPad and phone – automatically once a day, or right away with a click',
  'חפש קורס, קורס בחירה, משימה או פעולה ועבור אליה מיד. עובד מכל מסך': 'Search for a course, elective, task or action and jump straight to it. Works from any screen',
  'סיכום שבועי חדש בכל יום ראשון (מה להגיש, מבחנים בשבועיים הקרובים וקורסים בלי ציון), השיעורים של היום, משימות דחופות, ותזכורת 10 דקות לפני כל שיעור': 'A new weekly digest every Sunday (what’s due, exams in the next two weeks and courses without a grade), today’s classes, urgent tasks, and a reminder 10 minutes before each class',
  'שאל בשפה חופשית: מה לקחת בסמסטר הבא, אם אתה בקצב, מה יקרה לממוצע אם… היועץ עונה לפי הנתונים שלך – ורק מציע, לא משנה כלום בעצמו': 'Ask in plain words: what to take next semester, whether you’re on track, what happens to your average if… The advisor answers from your data – and only suggests, it never changes anything itself',
  'חיבור ל-Google, יומנים ורשימות משימות, גיבוי ושחזור, התקנה בטלפון, שאלות נפוצות והסיור הזה': 'Google connection, calendars and task lists, backup and restore, installing on your phone, FAQ and this tour',
  'המסכים': 'The screens', 'מפת קורסים, תכנון תואר, משימות, מערכת שעות וקורות חיים. בטלפון הסרגל הזה נמצא בתחתית המסך': 'Course map, degree planning, tasks, timetable and CV. On a phone this bar is at the bottom of the screen',
  'כל הקורסים לפי סמסטר, בצבע לפי מצב (נעול, פתוח, בלימוד, הושלם). הקווים הם דרישות הקדם; מעבר עכבר מדגיש את השרשרת, ולחיצה פותחת ציון, CheeseFork ומחשבון יעד למבחן': 'All courses by semester, colored by status (locked, open, in progress, done). The lines are prerequisites; hovering highlights the chain, and clicking opens the grade, CheeseFork and an exam target calculator',
  'טען את גיליון הציונים מהטכניון (PDF) והציונים והסטטוסים יתעדכנו לבד': 'Load your Technion grade sheet (PDF) and grades and statuses update by themselves',
  'עד שלושה קורסים זה לצד זה: דרישות קדם, מועדי מבחנים, אחראים, סילבוס – ואזהרה על מבחנים צמודים או הרצאות מתנגשות': 'Up to three courses side by side: prerequisites, exam dates, staff, syllabus – with a warning about back-to-back exams or clashing lectures',
  'תמונה של המפה': 'Map image', 'שומר את מפת הקורסים כתמונה לשיתוף או להדפסה': 'Saves the course map as an image to share or print',
  'דרישות התואר': 'Degree requirements', 'כמה נק״ז חסרות בכל דרישה – חובה, בחירה מרשימות א׳–ה׳, פרויקט, מל״ג, כלל טכניוני וספורט – מה הושלם, מה בלימוד ומה מתוכנן': 'How many credits are missing in each requirement – mandatory, electives from lists A–E, project, enrichment, Technion-wide and sports – what’s done, in progress and planned',
  'התוכנית לפי סמסטרים': 'The plan by semester', 'שבץ קורסים לסמסטרים, ראה עומס נק״ז לכל סמסטר ואזהרה כשקורס לא בסמסטר המומלץ': 'Place courses in semesters, see the credit load of each semester and a warning when a course isn’t in its recommended semester',
  'כלי התכנון': 'Planning tools', 'ניהול סמסטרים וסמסטרי קיץ, לוח מבחנים עם ימי הלמידה בין מבחן למבחן, הדפסת התוכנית, ויועץ התואר': 'Manage semesters and summer semesters, an exam calendar with study days between exams, print the plan, and the degree advisor',
  'כל קורסי הבחירה עם סינון לפי רשימה ודרישות קדם. "פרטים" פותח סילבוס, דרישות קדם, מועדים ואחראים מ-CheeseFork; "＋ לתוכנית" משבץ לסמסטר': 'All electives, filterable by list and prerequisites. "Details" opens the syllabus, prerequisites, exam dates and staff from CheeseFork; "＋ To plan" places it in a semester',
  'האקתונים ותחרויות': 'Hackathons and competitions',
  'פעם בשבוע Claude מחפש ברשת האקתונים, תחרויות, מלגות, כנסים ומשרות סטודנט שמתאימים לך, ומציג אותם כאן – עם קישור ותזכורת במשימות בלחיצה. מתחתיהם: תוכניות כמו פורמולה, מרחיבים אופקים ורובוטיקה': 'Once a week Claude searches the web for hackathons, competitions, scholarships, conferences and student jobs that fit you, and shows them here – with a link and a one-click task reminder. Below them: programs like Formula, Expanding Horizons and Robotics',
  'מילואים והזדמנויות': 'Reserve duty and opportunities', 'חישוב עוברים בינאריים שמעלים הכי הרבה את הממוצע, הזכויות לפי קבוצת המילואים שלך, ותוכניות כמו מצוינות ותואר כפול': 'Works out the binary passes that raise your average most, your rights by reserve-duty group, and programs like excellence tracks and a double degree',
  'שיעורי בית, מבחנים ופרויקטים לפי קורס ותאריך. כל משימה מסתנכרנת ל-Google Tasks, ואפשר להוסיף אותה ליומן Google בלחיצה': 'Homework, exams and projects by course and date. Every task syncs to Google Tasks, and you can add it to Google Calendar with a click',
  'מצב הסנכרון, כפתור סנכרון מיידי וקישור ישיר ל-Google Tasks. הפס נשאר צמוד לראש המסך כשגוללים': 'The sync status, a sync-now button and a direct link to Google Tasks. The bar stays pinned to the top while you scroll',
  'השיעורים הקבועים שלך יחד עם אירועים מ-Google Calendar. לחיצה על משבצת ריקה מוסיפה שיעור': 'Your regular classes together with Google Calendar events. Clicking an empty slot adds a class',
  'בוחר קבוצות הרצאה ותרגול בלי התנגשויות, עם ימים חופשיים ושעת התחלה לבחירתך, ומדרג לפי הכי פחות ימים וחורים': 'Picks lecture and tutorial groups without clashes, with the days off and start time you choose, ranked by fewest days and gaps',
  'פרופיל אחד וגרסה מותאמת לכל משרה, לפי מילות המפתח במודעה – או עם AI. אפשר לייבא קו״ח קיים ולמלא השכלה מהתואר': 'One profile and a tailored version for each job, by the ad’s keywords – or with AI. You can import an existing CV and fill education from your degree',
  'ממוצע לפי סמסטר, תחזית הצטיינות דיקן ונשיא, וכמה נשאר עד סוף התואר': 'Average by semester, a Dean’s and President’s honors forecast, and how much is left in the degree',
  'זהו': 'That’s it', 'אפשר להפעיל את הסיור שוב מ⚙️ הגדרות ← עזרה ומידע, או מהחיפוש המהיר (Ctrl+K). בהצלחה בתואר': 'You can run the tour again from ⚙️ Settings → Help and info, or from quick search (Ctrl+K). Good luck with your degree',
  'דלג': 'Skip', 'הקודם': 'Back', 'הבא': 'Next', 'סיום': 'Finish', 'יאללה, נתחיל': 'Let’s go',
  'משימות לשבוע הקרוב ': 'Tasks for the coming week', 'חיפוש מהיר': 'Quick search', 'מפת הקורסים ': 'Course map',

  // ---------- install guide and Client ID steps (split by bold text) ----------
  'היכנס ל': 'Go to', 'וצור פרויקט חדש': 'and create a new project', 'תחת': 'Under', 'הפעל את': 'enable', 'ו': 'and', 'ב': 'in',
  'בחר External, מלא שם ומייל, והוסף את עצמך ב': 'choose External, fill in a name and email, and add yourself under', 'אחרי זה לחץ': 'Then click',
  'כדי שהחיבור לא יפוג כל 7 ימים': 'so the connection doesn’t expire every 7 days', 'כדי שהחיבור לא יפוג כל': 'so the connection doesn’t expire every', 'בחר': 'choose',
  'הוסף': 'add', 'העתק את ה-Client ID לכאן ולחץ "התחבר". חזור על החיבור פעם אחת בכל מכשיר': 'Copy the Client ID here and click "Sign in". Repeat the sign-in once on each device',
  'פתח את הקישור ב': 'Open the link in',
  'לא בכרום ולא מתוך וואטסאפ: אם הוא נפתח בתוך וואטסאפ, לחץ על ⋯ ← "פתח ב-Safari")': 'not Chrome and not inside WhatsApp: if it opens inside WhatsApp, tap ⋯ → "Open in Safari")',
  'לחץ על כפתור השיתוף': 'Tap the share button', 'בתחתית המסך': 'at the bottom of the screen', 'גלול ובחר': 'Scroll and choose', '"הוסף למסך הבית"': '"Add to Home Screen"', '"הוסף"': '"Add"',
  'פתח את האפליקציה': 'Open the app', 'מהאייקון במסך הבית': 'from the icon on the Home Screen', 'לא מ-Safari): כך היא נפתחת במסך מלא ושומרת את החיבור': 'not from Safari): that way it opens full screen and keeps the connection',
  'במפת הקורסים לחץ': 'In the course map tap', '"התחבר עם Google"': '"Sign in with Google"',
  'בחר את החשבון שלך ואשר. אם מופיע "Google hasn\'t verified this app": Advanced ← Go to israelnoam.github.io': 'choose your account and approve. If you see "Google hasn\'t verified this app": Advanced → Go to israelnoam.github.io',
  'תפריט': 'Menu', '"התקן אפליקציה"': '"Install app"', 'או "הוסף למסך הבית"': 'or "Add to Home Screen"', '"התקן"': '"Install"', 'פתח מהאייקון, ולחץ': 'Open from the icon, and tap',
  'במפת הקורסים': 'in the course map', 'ב-Chrome או Edge: אייקון ההתקנה': 'In Chrome or Edge: the install icon',
  'בצד ימין של שורת הכתובת, או תפריט ← "התקן אפליקציה"': 'on the right of the address bar, or Menu → "Install app"',
  'עברית': 'עברית',

  // ---------- more from the coverage check ----------
  // ---------- wishlist ----------
  'רשימת משאלות': 'Wishlist', 'רוצה מאוד': 'Really want', 'אולי': 'Maybe', 'השווה את המועדפים': 'Compare favorites', 'עזור לי לבחור': 'Help me choose',
  'קורסים שאולי תרצה לקחת. הם לא נכנסים לתוכנית ולדרישות התואר עד שתעביר אותם לסמסטר': 'Courses you might take. They stay out of the plan and degree requirements until you move them into a semester',
  'הוסף קורס: חפש לפי שם או מספר (גם קורסים מחוץ לרשימות הבחירה': 'Add a course: search by name or number (including courses outside the elective lists',
  'לחץ להחלפה: רוצה מאוד / אולי': 'Click to switch: really want / maybe', 'מתי הייתי רוצה': 'When I’d like to take it', '— עוד לא יודע —': '— not sure yet —', 'עוד לא יודע': 'not sure yet',
  'למה / הערות': 'Why / notes', 'למשל: אם ייפתח בחורף, בגלל הפרויקט': 'e.g. if it opens in winter, because of the project', 'השווה': 'Compare', 'כבר בתוכנית': 'already in the plan',
  'הרשימה ריקה. הוסף קורסים כאן, או לחץ ☆ ליד קורס בלשונית "קורסי בחירה"': 'The list is empty. Add courses here, or press ☆ next to a course in the "Electives" tab',
  'ברשימת המשאלות (לחץ להסרה': 'On your wishlist (click to remove', 'הוסף לרשימת המשאלות': 'Add to wishlist', 'הסר מרשימת המשאלות': 'Remove from wishlist',
  'הוסר מרשימת המשאלות': 'Removed from the wishlist', 'הקורס כבר בתוכנית': 'The course is already in the plan', 'לא מצאתי את הקורס': 'Couldn’t find the course', 'אחר': 'Other',
  'טוען מ-CheeseFork…': 'Loading from CheeseFork…', 'נפתח': 'Offered', 'מחוץ לרשימות': 'outside the lists',

  // ---------- AI errors ----------
  'אין מספיק קרדיט בחשבון ה-API שלך ב-Anthropic. הוסף קרדיט (אפשר גם סכום קטן, כמה דולרים) ונסה שוב בעוד דקה': 'Your Anthropic API account is out of credit. Add credit (even a few dollars is enough) and try again in a minute',
  'להוספת קרדיט ↗': 'Add credit ↗', 'למפתחות ↗': 'API keys ↗',
  'מפתח ה-API לא תקין או בוטל. צור מפתח חדש והדבק אותו בהגדרות AI': 'The API key is invalid or was revoked. Create a new key and paste it in AI settings',
  'למפתח הזה אין הרשאה למודל. בדוק את המפתח והחשבון ב-Anthropic': 'This key has no access to the model. Check the key and the account at Anthropic',
  'יותר מדי בקשות בזמן קצר (או שהגעת למגבלת השימוש בחשבון). חכה דקה ונסה שוב': 'Too many requests in a short time (or you hit the account’s usage limit). Wait a minute and try again',
  'השירות של Anthropic עמוס כרגע. נסה שוב בעוד כמה דקות': 'Anthropic’s service is busy right now. Try again in a few minutes',
  'תקלה זמנית אצל Anthropic. נסה שוב בעוד כמה דקות': 'A temporary problem at Anthropic. Try again in a few minutes',
  'אין חיבור ל-Anthropic. בדוק את האינטרנט ונסה שוב': 'Can’t reach Anthropic. Check your internet and try again', 'הבקשה נכשלה': 'The request failed',
  'ההתאמה עם AI נכשלה': 'AI tailoring failed', 'הייבוא עם AI נכשל': 'AI import failed',
  'קורסים שאולי תרצה לקחת, בלי להתחייב: סמן ☆ ליד קורס בחירה או חפש כל קורס, דרג "רוצה מאוד" או "אולי", כתוב למה, והעבר לסמסטר כשתחליט. אפשר גם להשוות אותם ולשאול את היועץ': 'Courses you might take, without committing: press ☆ next to an elective or search any course, rate it "really want" or "maybe", note why, and move it into a semester when you decide. You can also compare them and ask the advisor',

  'צור מפתח API ב': 'Create an API key at', 'הדבק אותו בלשונית': 'Paste it in', 'המפתח נשמר': 'The key is stored',
  'קו״ח ← 🤖 הגדרות AI': 'CV → 🤖 AI settings',
  'תוכנות: SolidWorks, MATLAB, Python\nייצור: CNC, הדפסת תלת-ממד': 'Software: SolidWorks, MATLAB, Python\nManufacturing: CNC, 3D printing',
  'עברית – שפת אם\nאנגלית – רמה גבוהה': 'Hebrew – native\nEnglish – fluent',
  'אותות שנצברו': 'Honors earned', 'עוד לא בתוכנית': 'not in the plan yet', 'דרישות הפקולטה': 'Faculty requirements', 'סה״כ': 'Total',

  // welcome checklist
  'צעדים ראשונים': 'First steps', '🚀 צעדים ראשונים': '🚀 First steps', 'רשימת התחלה': 'Getting started', '(רשות)': '(optional)',
  'ייבא גיליון ציונים': 'Import your grade sheet', 'קטלוג פקולטה': 'Faculty catalog', 'שנת התחלה': 'Start year',
  'חבר יומן': 'Connect a calendar', 'מפתח AI (לא חובה)': 'AI key (optional)', 'סיור קצר באפליקציה': 'A short tour of the app',
  'בחר קובץ PDF': 'Choose a PDF', 'בחר תוכנית': 'Choose a plan', 'אישור': 'Confirm', 'להגדרות היומן': 'Calendar settings', 'הגדר מפתח': 'Set up a key', 'התחל סיור': 'Start the tour',
  'אין לי עדיין ציונים': 'I have no grades yet', 'לא עכשיו': 'Not now', 'בלי AI': 'No AI', 'דלג': 'Skip', 'הסתר': 'Hide',
  'פורטל הסטודנטים': 'the student portal', '🔒 פרטיות': '🔒 Privacy', '🔒 מדיניות פרטיות': '🔒 Privacy policy',
  '🔗 שלח את האפליקציה לחבר': '🔗 Send the app to a friend', 'שלח את האפליקציה לחבר': 'Send the app to a friend', '🔗 שלח לחבר (אפליקציה משלו)': '🔗 Send to a friend (their own app)',
  '🎉 הכול מוכן! אפשר לחזור לכאן מההגדרות בכל רגע.': '🎉 All set! You can come back here from Settings any time.',
  'אפשר לפתוח את הצעדים הראשונים שוב מההגדרות': 'You can open First steps again from Settings', 'קישור': 'Link',
  'הקישור הועתק: שלח אותו לחבר': 'Link copied: send it to a friend',
  'כך הנתונים שלך נשמרים בגוגל דרייב שלך (בתיקייה מוסתרת שרק האפליקציה רואה) ומסתנכרנים בין הטלפון, האייפד והמחשב. אף אחד אחר לא רואה אותם.': 'Your data is saved in your own Google Drive (in a hidden folder only this app can see) and syncs between your phone, iPad and computer. No one else can see it.',
  '← גיליון ציונים ← הורד PDF, ובחר אותו כאן. הקורסים, הציונים, הסמסטרים ושנת ההתחלה ייכנסו לבד.': '→ grade sheet → download the PDF, and choose it here. Courses, grades, semesters and your start year come in by themselves.',
  'התוכנית המומלצת של המסלול שלך, לפי השנה שבה התחלת: מובנית (הנדסת מכונות), מחוברת הפקולטה בעזרת AI, מקובץ שחבר שיתף, או הסדר שלך.': 'The recommended plan of your track, for the year you started: built in (Mechanical Engineering), from the faculty booklet with AI, from a file a friend shared, or your own order.',
  'באיזו שנה התחלת את התואר? לפי זה נקבעים שמות הסמסטרים והמערכות מ-CheeseFork.': 'Which year did you start your degree? Semester names and CheeseFork schedules follow it.',
  'Google Calendar נכנס עם החיבור ל-Google. יומן של אפל (iCloud) או Outlook: מוסיפים לפי קישור בהגדרות.': 'Google Calendar comes in when you connect Google. Apple (iCloud) or Outlook calendars: add them by link in Settings.',
  'ליועץ התואר, לסריקת ההזדמנויות השבועית, לקורות חיים ולבניית תוכנית מחוברת. מפתח אישי שלך מ-Anthropic, נשמר רק במכשיר; צריך להטעין קרדיט בחשבון (שאלה עולה כמה סנטים).': 'For the degree advisor, the weekly opportunity scan, the CV and building a plan from a booklet. Your own Anthropic key, stored only on this device; your account needs credit (a question costs a few cents).',
  'דקה וחצי שמראה איפה הכול.': 'A minute and a half showing where everything is.',

  // degree plans
  '📚 קטלוג פקולטה': '📚 Faculty catalog', '📚 קטלוג פקולטה / החלף תוכנית': '📚 Faculty catalog / switch plan', 'תוכנית לימודים': 'Study plan',
  'בחר את התוכנית המומלצת של המסלול שלך. הקורסים שלה ייכנסו לסמסטרים במפה. קורסים שכבר עשית, לוקח עכשיו או כתבת עליהם הערה לא ישתנו, וגם קורסי בחירה שהוספת נשארים.': 'Choose the recommended plan of your track. Its courses go into the semesters on the map. Courses you finished, are taking or wrote a note on stay as they are, and so do electives you added.',
  'התוכנית שלך': 'your plan', 'מובנית': 'built in', 'בחר': 'Choose', '⬇️ קובץ': '⬇️ File', 'שמור כקובץ כדי לשתף': 'Save as a file to share', 'מחק': 'Delete',
  '📄 מחוברת הפקולטה (PDF) בעזרת AI': '📄 From the faculty booklet (PDF) with AI', 'קובץ החוברת (PDF)': 'Booklet file (PDF)', '🤖 בנה תוכנית מהחוברת': '🤖 Build a plan from the booklet', '🔑 הגדר מפתח AI': '🔑 Set up an AI key',
  '📁 מקובץ תוכנית ששיתפו איתך': '📁 From a plan file someone shared', '✍️ הסדר שלי': '✍️ My own order', '💾 שמור את הסדר שלי כתוכנית': '💾 Save my order as a plan', '✓ הסדר הנוכחי הוא התוכנית שלי': '✓ My current order is my plan',
  'חבר מאותו מסלול יכול ללחוץ "⬇️ קובץ" ליד תוכנית (או "שמור את הסדר שלי") ולשלוח לך את הקובץ.': 'A friend on the same track can press "⬇️ File" next to a plan (or "Save my order") and send you the file.',
  'לוקח את הקורסים בסדר אחר מהמומלץ? סדר אותם במפה (גרירה או "סמסטר" בכל קורס), ואז שמור את הסדר כתוכנית כדי לשתף או לחזור אליה. נשמרים רק קורסים וסמסטרים, בלי ציונים.': 'Taking courses in a different order? Arrange them on the map (drag, or "semester" on each course), then save the order as a plan to share or come back to. Only courses and semesters are saved, never grades.',
  'טען את התוכנית': 'Load the plan', 'חזרה': 'Back', 'חדש': 'new', 'יזוז': 'moves', 'בחירה / לא משובץ': 'Elective / unplaced',
  'אפשר לבטל מיד אחרי. כדאי לבדוק מול חוברת הפקולטה: התוכנית המומלצת היא המלצה, וקורסים זזים בין שנים.': 'You can undo right after. Check it against the faculty booklet: the recommended plan is a recommendation, and courses move between years.',
  'מעולה: התוכנית שלך היא הסדר שבמפה': 'Great: your plan is the order on the map', 'הסדר שלי': 'My own order', 'שם לתוכנית:': 'Plan name:',
  'נשמר. הקובץ ירד, ואפשר לשלוח אותו לחבר': 'Saved. The file downloaded, and you can send it to a friend',
  'בחר קודם את קובץ החוברת': 'Choose the booklet file first', 'צריך מפתח AI: לחץ "הגדר מפתח AI"': 'You need an AI key: press "Set up an AI key"',
  '⏳ Claude קורא את החוברת… זה לוקח בדרך כלל דקה-שתיים. אפשר להמשיך להשתמש באפליקציה, רק אל תסגור את החלון הזה.': '⏳ Claude is reading the booklet… this usually takes a minute or two. Don’t close this window.',
  'הקובץ לא נקרא. זה קובץ תוכנית (JSON) שיוצא מהאפליקציה?': 'Couldn’t read the file. Is it a plan file (JSON) exported from the app?', 'זה לא קובץ תוכנית לימודים של האפליקציה.': 'This isn’t a study-plan file from the app.', 'אין קורסים בקובץ.': 'There are no courses in the file.',
  'התשובה נחתכה. בחר פחות עמודים (רק עמודי התוכנית המומלצת) ונסה שוב.': 'The answer was cut off. Pick fewer pages (only the recommended-plan pages) and try again.',
  'לא מצאתי תוכנית מומלצת בעמודים האלה. בדוק שבחרת את העמודים עם הטבלאות לפי סמסטר.': 'I found no recommended plan on these pages. Check that you picked the pages with the per-semester tables.',
  'הנדסת מכונות · תוכנית מומלצת תשפ״ו': 'Mechanical Engineering · recommended plan 2025–26', 'הנדסת מכונות (ברירת מחדל)': 'Mechanical Engineering (default)',
  'תוכנית:': 'Plan:', 'שנת התחלה (סמסטר חורף)': 'Start year (winter semester)', 'אפס לתוכנית ברירת המחדל': 'Reset to the default plan',
  'איפוס מחזיר את רשימת הקורסים לתוכנית ברירת המחדל של הנדסת מכונות (הציונים והסטטוסים יימחקו; אפשר לבטל מיד אחרי). משימות ומערכת שעות לא נפגעות. להחלפת תוכנית בלי למחוק ציונים: "קטלוג פקולטה" למעלה.': 'Reset puts the course list back to the default Mechanical Engineering plan (grades and statuses are erased; you can undo right after). Tasks and the timetable are not affected. To switch plans without erasing grades: "Faculty catalog" above.',

  '📖 נק״ז בלימוד עכשיו': '📖 Credits in progress',
  // contact
  '💬 יצירת קשר': '💬 Contact', 'יצירת קשר / הצעה לשיפור': 'Contact / suggest an improvement', '💬 יצירת קשר / הצעה לשיפור': '💬 Contact / suggest an improvement', 'מייל': 'Email',
  'יש רעיון לשיפור, משהו שלא עובד או שאלה? אשמח לשמוע. ההודעה נשלחת מהמייל שלך, כך שאוכל לענות לך.': 'Have an idea, something that doesn’t work, or a question? I’d love to hear it. The message is sent from your own email, so I can reply.',
  'נושא': 'Topic', '💡 הצעה לשיפור': '💡 Suggestion', '🐞 משהו לא עובד': '🐞 Something doesn’t work', '❓ שאלה': '❓ Question', '✉️ אחר': '✉️ Other',
  'מה תרצה לכתוב?': 'What would you like to say?', 'שם (לא חובה)': 'Name (optional)', 'צרף פרטים טכניים (גרסה, מסך, דפדפן) כדי שיהיה קל לבדוק': 'Attach technical details (version, screen, browser) to make it easier to check',
  'אין לך אפליקציית מייל? כתוב ישירות ל-': 'No mail app? Write directly to', '📋 העתק': '📋 Copy', '📧 פתח מייל לשליחה': '📧 Open email to send', 'כתוב קודם את ההודעה': 'Write the message first',
  'נפתח המייל שלך: לחץ שם "שלח". תודה! 🙏': 'Your email opened: press "Send" there. Thanks! 🙏', 'הכתובת הועתקה': 'Address copied',

  // calendar links
  '🔗 יומנים לפי קישור (Apple, Outlook ועוד)': '🔗 Calendars by link (Apple, Outlook and more)',
  'כל יומן שיש לו קישור מנוי (ICS / webcal) מופיע במערכת השעות, לקריאה בלבד. מתעדכן כל רבע שעה כשהאפליקציה פתוחה.': 'Any calendar with a subscription link (ICS / webcal) shows in the timetable, read-only. Refreshes every 15 minutes while the app is open.',
  '⚠️ יומנים לפי קישור עובדים רק בכתובת החדשה של האפליקציה (Vercel).': '⚠️ Calendars by link work only at the app’s new address (Vercel).',
  'שם היומן': 'Calendar name', 'קישור (מתחיל ב-webcal:// או https://)': 'Link (starts with webcal:// or https://)', '＋ הוסף יומן': '＋ Add calendar', 'בודק את הקישור…': 'Checking the link…', 'הסר': 'Remove',
  '🍎 איך מוצאים את הקישור ביומן של אפל?': '🍎 How do I find the link in Apple Calendar?', '📧 Outlook / Google': '📧 Outlook / Google',
  'הקישור צריך להתחיל ב-webcal:// או https://': 'The link must start with webcal:// or https://', 'לא הצלחתי לקרוא את היומן מהקישור': 'Couldn’t read the calendar from the link',
  'אם אתה צובע אירועים לפי סוג (לימודים, אישי…), אפשר להציג רק חלק מהצבעים. בהתחלה הכול מוצג.': 'If you color events by type (study, personal…), you can show only some colors. At first everything is shown.',
  'גם היומן ו-Google Tasks יופיעו כאן.': 'Your calendar and Google Tasks show up here too.',
};

// "חורף תשפ״ו" and the like: every season with every Hebrew year.
for (const [he, en] of [['חורף', 'Winter'], ['אביב', 'Spring'], ['קיץ', 'Summer']]) {
  for (const y of ['תשפ״ד', 'תשפ״ה', 'תשפ״ו', 'תשפ״ז', 'תשפ״ח', 'תשפ״ט', 'תש״צ', 'תשצ״א']) EN[`${he} ${y}`] = `${en} ${EN[y]}`;
}

// Templates: {n} are the values, in the order they appear in the Hebrew.
const EN_PATTERNS = [
  ['{0} קורסים פעילים', '{0} active courses'],
  ['היומן "{0}" נוסף ({1} אירועים)', 'Calendar "{0}" added ({1} events)'], ['היומן "{0}" הוסר', 'Calendar "{0}" removed'], ['התוכנית "{0}" נטענה', 'Plan "{0}" loaded'],
  ['נמצאו {0} מסלולים בחוברת', '{0} tracks found in the booklet'], ['{0} קורסים חדשים · {1} יזוזו לסמסטר אחר · {2} בלי שינוי', '{0} new courses · {1} move to another semester · {2} unchanged'],
  ['{0} קורסים · {1} נק״ז בתוכנית · {2} סמסטרים', '{0} courses · {1} credits in the plan · {2} semesters'], ['חורף {0}–{1}', 'Winter {0}–{1}'],
  ['{0} באיחור', '{0} overdue'], ['{0} להיום', '{0} today'], ['{0} ימים', '{0} days'], ['בעוד {0} ימים', 'in {0} days'], ['באיחור {0} ימים', '{0} days overdue'],
  ['{0} בעוד {1} דקות', '{0} in {1} minutes'], ['+{0} מתוכנן', '+{0} planned'], ['+{0} עכשיו', '+{0} now'], ['{0} · {1} נק״ז', '{0} · {1} credits'],
  ['{0} נק״ז', '{0} credits'], ['{0} קורסים', '{0} courses'], ['/ {0} נק״ז · {1}%', '/ {0} credits · {1}%'], ['· ממוצע {0}', '· average {0}'], ['{0} נק״ז · ממוצע {1}', '{0} credits · average {1}'],
  ['{0} להגשה השבוע · {1} מבחנים בשבועיים · {2} קורסים בלי ציון', '{0} due this week · {1} exams in 2 weeks · {2} courses without a grade'],
  ['{0} סומן כעובר בינארי', '{0} marked as a binary pass'], ['{0} קורסים עודכנו', '{0} courses updated'], ['{0} – מועד {1}', '{0} – exam {1}'],
  ['{0}: {1}/{2} קורסים', '{0}: {1}/{2} courses'], ['ב׳+ג׳+ד׳: {0}/{1} נק״ז', 'B+C+D: {0}/{1} credits'], ['{0}/{1} נוצלו', '{0}/{1} used'],
  ['· נפתח: {0}', '· offered: {0}'], ['· ⏳ הרשמה עד {0}', '· ⏳ register by {0}'], ['⏳ הרשמה עד {0}', '⏳ register by {0}'], ['אחראי: {0}', 'In charge: {0}'], ['אפשרות {0}', 'Option {0}'],
  ['בדיקה אחרונה: {0}.', 'Last check: {0}.'], ['בחירה {0} · {1}', 'Elective {0} · {1}'], ['יובאו {0} רשומות', '{0} records imported'],
  ['ל-{0} ({1}) אין קבוצה שמתאימה להגבלות.', '{0} ({1}) has no group that fits the limits.'], ['לא משובצים: {0}', 'Unscheduled: {0}'],
  ['לייבא {0} רשומות מהקובץ? הן יחליפו את הקיימות.', 'Import {0} records from the file? They will replace the existing ones.'], ['למחוק את "{0}"?', 'Delete "{0}"?'],
  ['לרשימה "{0}"', 'to the list "{0}"'], ['✅ Google Tasks: מסתנכרן לרשימה "{0}"', '✅ Google Tasks: syncs to the list "{0}"'], ['מומלץ בסמסטר {0}', 'recommended in semester {0}'], ['מועד {0}', 'exam {0}'],
  ['מסונכרן · {0}', 'synced · {0}'], ['נוסף למערכת השעות ({0})', 'Added to the timetable ({0})'], ['נוסף לסמסטר {0}', 'Added to semester {0}'],
  ['נוספו {0} מועדים למשימות', '{0} exam dates added to tasks'], ['נפתח ב: {0}', 'Offered in: {0}'], ['סונכרן {0}', 'Synced {0}'], ['סמסטר {0}', 'Semester {0}'],
  ['סמסטר {0} · {1}', 'Semester {0} · {1}'], ['סמ׳ {0}', 'Sem. {0}'], ['סנכרון אחרון: {0}', 'Last sync: {0}'], ['סנכרון עם Google: {0}', 'Google sync: {0}'],
  ['ספר לי על {0} ({1}): איך הוא משפיע על הממוצע ועל דרישות התואר שלי, ולאילו קורסים הוא פותח את הדרך?', 'Tell me about {0} ({1}): how does it affect my average and degree requirements, and which courses does it open up?'],
  ['ספר לי על {0} ({1}): על מה הקורס, האם דרישות הקדם שלי מולאו, מתי כדאי לי לקחת אותו ואיך הוא משתלב בתוכנית ובעומס שלי?', 'Tell me about {0} ({1}): what is the course about, are my prerequisites met, when should I take it and how does it fit my plan and workload?'],
  ['עובר בינארי דורש ציון סופי {0} ומעלה. הזן את הציון.', 'A binary pass needs a final grade of {0} or higher. Enter the grade.'], ['פחות מ-{0} נק״ז', 'less than {0} credits'],
  ['פעם בשבוע Claude מחפש ברשת האקתונים, תחרויות, מלגות, כנסים ומשרות סטודנט שמתאימים לך. {0} כל בדיקה עולה בערך 20–50 סנט.', 'Once a week Claude searches the web for hackathons, competitions, scholarships, conferences and student jobs that fit you. {0} Each check costs about 20–50 cents.'],
  ['פתח את {0}', 'Open {0}'], ['ציון {0} · {1} נק״ז', 'grade {0} · {1} credits'], ['צריך {0} במבחן – לא אפשרי עם הרכיבים האלה', 'You’d need {0} in the exam – not possible with these components'],
  ['צריך לפחות {0} במבחן', 'You need at least {0} in the exam'], ['קבוצה {0}', 'Group {0}'], ['קבוצה {0}: {1}', 'Group {0}: {1}'], ['קבוצה {0} – עד {1}', 'group {0} – up to {1}'], ['קבוצות ושעות ({0})', 'Groups and times ({0})'],
  ['קווי הסף: דיקן {0}, נשיא {1}', 'Thresholds: Dean {0}, President {1}'], ['קורס {0}', 'Course {0}'], ['קורסים בולטים: {0}', 'Notable courses: {0}'], ['קיץ {0}', 'Summer {0}'],
  ['שנה {0} (סמסטרים {1}–{2}) · קבוצה {3}', 'Year {0} (semesters {1}–{2}) · group {3}'], ['סמסטר {0} · {1}', 'Semester {0} · {1}'], ['☀️ סמסטר {0}', '☀️ Semester {0}'],
  ['⚠️ {0}: {1} ו-{2} באותו יום ({3})', '⚠️ {0}: {1} and {2} on the same day ({3})'], ['⚠️ {0}: {1} ו-{2} ברצף של יום אחד', '⚠️ {0}: {1} and {2} one day apart'],
  ['✅ {0} + {1}: אפשר לשלב בלי התנגשות בהרצאות', '✅ {0} + {1}: can be combined without lecture clashes'], ['❌ {0} + {1}: כל קבוצות ההרצאה מתנגשות', '❌ {0} + {1}: all lecture groups clash'],
  ['⚠️ חסרים {0} נק״ז כדי להגיע ל-{1}.', '⚠️ {0} credits short of {1}.'], ['➖ הסר את סמסטר {0}', '➖ Remove semester {0}'], ['➕ הוסף סמסטר', '➕ Add semester'],
  ['🛰️ נמצאו {0} הזדמנויות חדשות', '🛰️ Found {0} new opportunities'], ['🕒 השיעורים של היום ({0})', '🕒 Today’s classes ({0})'], ['אחרי סמסטר {0}', 'after semester {0}'], ['אחרי סמסטר {0} (יש קורסים)', 'after semester {0} (has courses)'],
  ['הגעת למקסימום של {0} עוברים בינאריים בתואר', 'You’ve reached the maximum of {0} binary passes in the degree'],
  ['נשארו {0}. ההמרה מוציאה את הציון מהממוצע, והנק״ז נשארות. כדאי להמיר את הקורסים שמעלים את הממוצע הכי הרבה:', '{0} left. Converting takes the grade out of the average and keeps the credits. Convert the courses that raise your average the most:'],
  ['מגבלות: עד {0} קורסים בכל התואר (נוצלו {1}) ועד 10% מנק״ז התואר ({2}/{3}). ציון סופי {4}+. ההמרה עצמה מוגשת במערכת הטכניון ואינה הפיכה; כאן היא רק מחושבת בממוצע.', 'Limits: up to {0} courses in the whole degree ({1} used) and up to 10% of degree credits ({2}/{3}). Final grade {4}+. The conversion itself is filed in the Technion system and can’t be undone; here it’s only calculated in the average.'],
  ['דיקן: ממוצע {0}+, נשיא: {1}+, בסמסטר עם לפחות {2} נק״ז מדורגות. אפשר לראות את התחזית בטאב "ביצועים".', 'Dean’s list: average {0}+, President’s: {1}+, in a semester with at least {2} graded credits. You can see the forecast in Performance.'],
  ['{0} נק״ז: {1} חובה, {2} בחירה מתקדמת מרשימות א׳–ה׳ (לפחות {3} מרשימה א׳, {4} מד׳, {5} מב׳, {6} מג׳, ויחד ב׳+ג׳+ד׳ לפחות {7} נק״ז), פרויקט גמר {8}, מל״ג {9}, כלל טכניוני {10} וחינוך גופני {11}.', '{0} credits: {1} mandatory, {2} advanced electives from lists A–E (at least {3} from A, {4} from D, {5} from B, {6} from C, and B+C+D together at least {7} credits), final project {8}, enrichment {9}, Technion-wide {10} and physical education {11}.'],
  ['קורס שעבר בציון {0}+ נשאר עם הנק״ז אבל הציון יוצא מהממוצע. מכסה לפי קבוצת המילואים בשנה, עד {1} קורסים בתואר ועד {2}% מנק״ז התואר. ההמרה מוגשת במערכת הטכניון; האפליקציה רק מחשבת אותה.', 'A course passed with {0}+ keeps its credits but its grade leaves the average. The quota depends on your reserve-duty group per year, up to {1} courses in the degree and {2}% of degree credits. The conversion is filed in the Technion system; the app only calculates it.'],
  ['פטור מנק״ז: {0} (בחירה/כלליים). הארכת לימודים: {1}.', 'Credit exemption: {0} (electives/general). Extended studies: {1}.'],
  ['עד {0} נק״ז (בחירה/כלליים; תקרה כוללת 10). {1}', 'up to {0} credits (electives/general; overall cap 10). {1}'],
  ['קורסי הסמסטר שלך ({0}). המספרים בין מבחנים הם ימי למידה: אדום = עד יומיים, כתום = 3–4, ירוק = 5+. מועדים מ-CheeseFork וממשימות מסוג מבחן.', 'Your courses this semester ({0}). The numbers between exams are study days: red = up to two, orange = 3–4, green = 5+. Dates from CheeseFork and exam tasks.'],
  ['{0}{1} שילובים אפשריים; הנה {2} הטובים ביותר (פחות ימים, פחות חורים):', '{0}{1} possible combinations; here are the best {2} (fewest days, fewest gaps):'],
  ['· {0} ימים · חורים {1}:{2} שעות', '· {0} days · gaps {1}:{2} hours'],
  ['מחושב על {0} הנק״ז שנשארו בתואר, בהנחה שכולן עם ציון.', 'Based on the {0} credits left in the degree, assuming all are graded.'],
  ['מילים מהמודעה שלא מופיעות בקו״ח: {0}. אם יש לך ניסיון בהן, הוסף אותן לפרופיל.', 'Words from the ad that aren’t in your CV: {0}. If you have experience with them, add them to your profile.'],
  ['מודל: {0}. בלי מפתח אפשר להשתמש ב"העתק פרומפט" ולהדביק ב-Claude או Gemini בעצמך.', 'Model: {0}. Without a key you can use "Copy prompt" and paste it into Claude or Gemini yourself.'],
  ['כל רשימה ב-Google Tasks שמשויכת לקורס (כמו הרשימות ש-Instinct יצר) מסתנכרנת עם המשימות של אותו קורס. משימות בלי קורס נכנסות לרשימה "{0}". Google Tasks שומר רק תאריך, בלי שעה.', 'Every Google Tasks list linked to a course (like the lists Instinct created) syncs with that course’s tasks. Tasks without a course go into the list "{0}". Google Tasks keeps only the date, not the time.'],
  ['{0} כבוי בפרויקט ב-Google Cloud', '{0} is turned off in the Google Cloud project'], ['✓ מספיק נק״ז להצטיינות. ממוצע {0}+ בסמסטר = דיקן, {1}+ = נשיא.', '✓ Enough credits for honors. A semester average of {0}+ = Dean’s list, {1}+ = President’s.'],
  ['סף דיקן {0} · סף נשיא {1} · לפחות {2} נק״ז עם ציון בסמסטר', 'Dean threshold {0} · President threshold {1} · at least {2} graded credits in the semester'],
  ['{0} עם ציון · {1} בינארי · {2} פטור', '{0} graded · {1} binary · {2} exempt'], ['{0}% מהתואר', '{0}% of the degree'], ['מ-{0} קורסים עם ציון', 'from {0} graded courses'],
  ['{0} (צפוי)', '{0} (expected)'], ['(צריך {0} בממוצע)', '(needs an average of {0})'], ['(בגיליון: {0} נק״ז, ממוצע {1})', '(on the sheet: {0} credits, average {1})'], ['(קבוצה {0})', '(group {0})'],
  ['{0} (לא נפתח בסמסטרים האחרונים, שם לא ידוע)', '{0} (not offered in recent semesters, name unknown)'], ['📰 הסיכום השבועי {0}', '📰 Weekly digest {0}'],
  ['הוסף ל{0}', 'Add to {0}'],
  ['{0} נוסף לרשימת המשאלות', '{0} added to the wishlist'], ['נפתח: {0}', 'Offered: {0}'], ['{0} קורסים · {1} נק״ז', '{0} courses · {1} credits'],
  ['מתוך רשימת המשאלות שלי ({0}): אילו כדאי לי לקחת, באיזה סמסטר, ומה מהם עוזר לי הכי הרבה בדרישות התואר?', 'From my wishlist ({0}): which should I take, in which semester, and which helps my degree requirements the most?'],
  ['{0} ({1})', '{0} ({1})'],
];

// ---------- the translator ----------
const tr = (() => {
  if (LANG !== 'en') return s => s;
  const HEB = /[֐-׿]/;
  // The separators the strings were split on, plus ", " for lists such as "חורף תשפ״ו, אביב תשפ״ו".
  const SEP = /(\s*[·|•]\s*|\s+[–—]\s+|,\s+|(?:^|\s)[\d.,:/+%]*\d[\d.,:/+%]*(?=\s|$)|[←→↗]|\n)/;
  const SPLIT = /^([^\p{L}׳״"']*)([\s\S]*?)([^\p{L}׳״"'.]*)$/u;
  const swap = s => s.replace(/[←→]/g, c => (c === '←' ? '→' : '←'));
  const pats = EN_PATTERNS.map(([he, en]) => {
    const order = [];
    const quoted = he.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
    quoted.replace(/\{(\d+)\}/g, (_, n) => order.push(+n));
    const build = slot => new RegExp('^' + quoted.replace(/\{\d+\}/g, slot) + '$');
    // strict: a value never spans ", " or "; " (a list is split into items first); loose: anything.
    return { strict: build('([^,;]+?)'), re: build('([\\s\\S]+?)'), en, order, len: he.length };
  }).sort((a, b) => b.len - a.len);

  // One piece: its core (no leading emoji/punctuation, no trailing punctuation) looked up.
  const piece = s => {
    const whole = s.trim();
    if (EN[whole] !== undefined) return s.replace(whole, EN[whole]);
    const m = SPLIT.exec(s);
    if (!m) return null;
    let [, pre, mid, suf] = m;
    if (mid.endsWith('.')) { mid = mid.slice(0, -1); suf = '.' + suf; }
    const lead = mid.match(/^\s*/)[0], trail = mid.match(/\s*$/)[0];
    const key = mid.trim();
    const hit = EN[key];
    return hit === undefined ? null : swap(pre) + lead + hit + trail + swap(suf);
  };
  const pattern = (s, strict) => {
    const t = s.replace(/\s+/g, ' ').trim();
    for (const p of pats) {
      const m = (strict ? p.strict : p.re).exec(t);
      if (!m) continue;
      const vals = p.order.map((n, i) => ({ n, v: m[i + 1] }));
      return s.match(/^\s*/)[0] + p.en.replace(/\{(\d+)\}/g, (_, n) => translate(vals.find(x => x.n === +n)?.v ?? '')) + s.match(/\s*$/)[0];
    }
    return null;
  };
  const cache = new Map();
  function translate(s) {
    if (!s || !HEB.test(s)) return swap(s || '');
    if (cache.has(s)) return cache.get(s);
    // The whole text; a template whose values aren't lists; a list item by item; any template.
    let out = piece(s) ?? pattern(s, true);
    if (out === null && /[,;]\s/.test(s)) {
      const parts = s.split(/([,;]\s+)/).map((p, i) => (i % 2 || !HEB.test(p) ? swap(p) : piece(p) ?? pattern(p, true) ?? pattern(p)));
      if (!parts.includes(null)) out = parts.join('');
    }
    out ??= pattern(s);
    if (out === null) {
      out = s.split(SEP).map((part, i) => {
        if (!part) return '';
        if (i % 2) return swap(part); // a separator
        return HEB.test(part) ? (piece(part) ?? pattern(part) ?? part) : swap(part);
      }).join('');
    }
    if (cache.size > 5000) cache.clear();
    cache.set(s, out);
    return out;
  }
  return translate;
})();

// ---------- applying it to the page ----------
if (LANG === 'en') {
  const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
  const skip = el => !el || el.closest('[translate="no"], script, style, textarea, code, [contenteditable="true"]');
  // What we wrote last, so our own change (which the observer sees) isn't translated again:
  // translating isn't idempotent (arrows flip each time).
  const wroteText = new WeakMap(), wroteAttr = new WeakMap();
  const doText = n => {
    const v = n.nodeValue;
    if (wroteText.get(n) === v || skip(n.parentElement)) return;
    const t = tr(v);
    wroteText.set(n, t);
    if (t !== v) n.nodeValue = t;
  };
  const doAttrs = el => {
    if (skip(el)) return;
    let seen = wroteAttr.get(el);
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (!v || seen?.[a] === v) continue;
      const t = tr(v);
      (seen ||= {})[a] = t;
      wroteAttr.set(el, seen);
      if (t !== v) el.setAttribute(a, t);
    }
  };
  const walk = root => {
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1) return;
    doAttrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 3 ? doText(n) : doAttrs(n);
  };
  new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttrs(m.target);
      else m.addedNodes.forEach(walk);
    }
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  walk(document.body);
  document.title = tr(document.title);

  // Messages that never reach the page.
  const wrap = name => { const f = window[name].bind(window); window[name] = (msg, ...rest) => f(tr(String(msg ?? '')), ...rest); };
  ['alert', 'confirm', 'prompt'].forEach(wrap);
  if (window.Notification) {
    const N = window.Notification;
    window.Notification = class extends N { constructor(title, opts = {}) { super(tr(title), { ...opts, body: tr(opts.body || '') }); } };
  }
}
