# התואר שלי: a personal degree planner (PWA)

There's no login screen. Your data lives on each device and syncs through a hidden app folder in **your own Google Drive**.
No server or database is needed.

## 1. Put it online (GitHub Pages, free, ~5 min)

1. Create a new **public** repo on github.com, for example `my-degree`.
2. Click **Add file → Upload files** and drag in everything in this folder (keep the `icons` folder).
3. Go to **Settings → Pages**, set Source to `Deploy from a branch`, choose `main` / `/ (root)`, and save.
4. After about a minute, your app is live at `https://<your-username>.github.io/my-degree/`

## 2. Turn on Google sync (one time)

1. Go to https://console.cloud.google.com/projectcreate and create a project.
2. Go to **APIs & Services → Library**, find **Google Drive API**, and enable it.
3. Go to **OAuth consent screen**, pick External, fill in the app name and your email, and add yourself as a **Test user**.
   Then click **Publish app**. Otherwise Google expires the connection every 7 days. Since it's only for you, you don't need verification:
   just click through the "unverified app" warning once.
4. Go to **Credentials → Create credentials → OAuth client ID → Web application**.
   - Authorized JavaScript origins: `https://<your-username>.github.io`
   - Authorized redirect URIs: `https://<your-username>.github.io/my-degree/`
5. Copy the Client ID. In the app, open **הגדרות (Settings)**, paste it, and tap **התחבר ל-Google**.
6. Do step 5 once on each device (PC, iPad, phone).

The app's Settings page shows the exact origin and redirect URI to paste, so you can copy them from there.

## 3. Install it

- **PC (Chrome/Edge):** click the install icon in the address bar.
- **iPhone/iPad (Safari):** tap Share, then **Add to Home Screen**.

## How sync works

- Every change saves on the device right away, so the app works offline.
- About 1.5 s after a change, and whenever you open or return to the app, it merges with `personal-planner.json` in Drive's hidden app folder.
- Merging works record by record, and the newest edit wins. Editing different things on your phone and PC at the same time won't overwrite either one.
- Google access tokens last 1 hour. When one expires, the app silently gets a new one the next time you open it. If Google wants you to confirm, the top-right button says **התחבר מחדש**.
- Settings also has export/import to a JSON file as a backup.
