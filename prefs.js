// Device preferences that must apply before the page draws: colour theme and language.
// Loaded in <head>; both are kept on this device only (like the AI key).

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
