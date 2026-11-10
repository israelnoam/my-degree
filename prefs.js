// Device preferences that must apply before the page draws: colour theme and language.
// Loaded in <head>; both are kept on this device only (like the AI key).

// Load-time safety net (this is the first script): any error while the app starts is
// shown on the page, and so is a screen that never draws, so a blank page always says why.
window.__loadErrors = [];
window.addEventListener('error', e => {
  // Script errors, and our own scripts / stylesheets failing to load; not broken images.
  const res = e.target && e.target !== window ? e.target.tagName : '';
  if (res && res !== 'SCRIPT' && res !== 'LINK') return;
  if (window.__loadErrors.length < 8) window.__loadErrors.push(`${e.message || e.type} @ ${(e.filename || e.target?.src || '').split('/').pop()}:${e.lineno || ''}`);
}, true);
window.addEventListener('unhandledrejection', e => {
  if (window.__loadErrors.length < 8) window.__loadErrors.push('promise: ' + (e.reason?.message || e.reason));
});
window.addEventListener('load', () => setTimeout(() => {
  const view = document.getElementById('view');
  const blank = view && !view.children.length;
  if (!blank && !window.__loadErrors.length) return;
  if (!blank && !window.__loadErrors.some(x => !/^promise:/.test(x))) return; // late network hiccups don't matter once the screen is up
  const box = document.createElement('div');
  box.id = 'loadReport';
  box.style.cssText = 'margin:12px;padding:12px 16px;border:1px solid #ef5b5b;border-radius:12px;background:#2a1215;color:#fde2e2;font:14px/1.5 system-ui,sans-serif;';
  const ver = [...document.scripts].map(s => (s.src.match(/[?&]v=(\d+)/) || [])[1]).find(Boolean) || '?';
  box.innerHTML = `<b>⚠️ ${blank ? 'המסך לא נטען' : 'הייתה שגיאה בטעינה'}</b><div>צלם את התיבה הזו ושלח:</div>
    <pre dir="ltr" style="white-space:pre-wrap;user-select:all;margin:8px 0 0">version ${ver} · ${location.origin}${location.pathname}
${(window.__loadErrors.length ? window.__loadErrors : ['(no script error caught)']).join('\n')}</pre>`;
  (view ? view.parentNode.insertBefore(box, view) : document.body.prepend(box));
}, 3000));

// The app moved from GitHub Pages to Vercel. Old links and installed icons land here, so
// send them on (the data comes back from Google Drive after signing in there).
const APP_HOME = 'https://my-degree-ashen.vercel.app';
if (location.hostname === 'israelnoam.github.io' && !location.hash.includes('access_token')) {
  location.replace(APP_HOME + location.pathname.replace(/^\/my-degree/, '') + location.search);
}

const PREF_THEME = 'pp_theme'; // 'dark' (default) | 'light' | 'auto' (follow the device)
const PREF_LANG = 'pp_lang';   // 'he' (default) | 'en'

const prefGet = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
const prefSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

const LANG = prefGet(PREF_LANG, 'he') === 'en' ? 'en' : 'he';
document.documentElement.lang = LANG;
document.documentElement.dir = LANG === 'en' ? 'ltr' : 'rtl';

const themeQuery = window.matchMedia?.('(prefers-color-scheme: light)');
function themePref() { return prefGet(PREF_THEME, 'dark'); }
function applyTheme() {
  const pref = themePref();
  const theme = pref === 'auto' ? (themeQuery?.matches ? 'light' : 'dark') : pref;
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f3f6fb' : '#0b1220');
}
function setTheme(pref) { prefSet(PREF_THEME, pref); applyTheme(); }
themeQuery?.addEventListener?.('change', () => { if (themePref() === 'auto') applyTheme(); });
applyTheme();

// Switching language reloads, so every screen and label is rebuilt in the new language.
function setLang(lang) { prefSet(PREF_LANG, lang); location.reload(); }

// Dates and times follow the language.
const LOCALE = LANG === 'en' ? 'en-GB' : 'he-IL';
