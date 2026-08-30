# School Free Access Onboarding Email Template (Whitelisted Domain)

Bilingual (English + 繁體中文) email for schools whose Google email domain is whitelisted in the deployment's `FREE_ACCESS_EMAILS` environment variable (e.g. `@gs.keichi.edu.hk`). Explains how new teachers and students install the PWA on iPads and sign in with school Google accounts. **No Access Password is involved** — free (proxy) access is granted automatically at sign-in and is identity-bound to the school account, so there is no password to distribute, remember, or leak.

> For schools that are **not** whitelisted, use the classic Access Password flow instead: users enter a password in the first-run onboarding dialog (see *Mode C — Free* in the User Manuals, `public/docs/user-manual-en.html` / `user-manual-zh-hk.html`).

UI labels quoted in the email mirror `setting.freeAccessNotice` in `src/locales/en-US.json` / `zh-HK.json` — if that wording changes, update this template to match.

## Placeholders

| Placeholder | Example value | Notes |
|---|---|---|
| `{{APP_URL}}` | `https://read.mr5ai.com` | Web app URL |
| `{{SCHOOL_NAME_EN}}` | CCC Kei Chi Secondary School | English school name |
| `{{SCHOOL_NAME_ZH}}` | 中華基督教會基智中學 | Chinese school name |
| `{{SCHOOL_EMAIL_DOMAIN}}` | `@gs.keichi.edu.hk` | School Google account domain (whitelisted) |

---

## Subject

> Welcome to Mr.🆖 ProReader — Free Access for {{SCHOOL_NAME_EN}} | 歡迎使用 Mr.🆖 ProReader — {{SCHOOL_NAME_ZH}}免費使用

---

## Email body

Dear Teachers and Students,

Welcome to **Mr.🆖 ProReader**! Our school has arranged **free access** for all {{SCHOOL_NAME_EN}} members. There is **no password to enter** — access is linked to your school Google account, so simply signing in is enough. Nothing to remember, nothing to type.

### Part A — Install the app on your iPad (do this first)

Mr.🆖 ProReader can be installed like a native app on your iPad, so it opens full-screen from your Home Screen with nothing else on the page.

1. Open **Safari** on your iPad *(you must use Safari — not Chrome — for installation)*.
2. Go to **{{APP_URL}}**.
3. Tap the **Share button** — the square with an arrow pointing up (↑), at the top of the Safari toolbar.
4. Scroll down the share menu and tap **"Add to Home Screen"**.
5. Keep the name **Mr.🆖 ProReader** and tap **"Add"** (top-right corner).
6. Done! The Mr.🆖 ProReader icon is now on your Home Screen. **Always start the app from this icon** — it opens full-screen, just like any other app.

### Part B — Sign in and start reading

**Step 1 — Sign in with your school Google account**
Open the app (**{{APP_URL}}** or your new Home Screen icon) and sign in with Google using your **school account** (**{{SCHOOL_EMAIL_DOMAIN}}**).

**Step 2 — That's it!**
All AI features work immediately. The app sets itself to **Free** mode automatically — no setup dialog, no Access Password. If you open **Settings → General**, you'll see the confirmation: *"✅ Free AI access is enabled for your account — no Access Password needed."*

**Step 3 — Start reading**
Upload a photo of your reading material and try the summary, mind map, glossary, or games. Happy reading!

### Important notes

- **Use your school account** ({{SCHOOL_EMAIL_DOMAIN}}) — personal Google accounts do not have automatic access.
- Free access is tied to your signed-in school account, so it can't be shared with people outside the school.
- If an AI feature ever says *"No permissions"*, you are probably signed in with a personal Google account — sign out and sign in again with your school account.

Any questions? Contact your teacher or the school admin. Happy reading! 📚

---

**親愛的老師及同學：**

歡迎使用 **Mr.🆖 ProReader**！學校已為全體{{SCHOOL_NAME_ZH}}師生安排**免費使用**。**毋須輸入任何密碼**——訪問權已與你的學校 Google 帳戶綁定，只要登入即可使用，不用記、不用打。

### 第一部分 — 在 iPad 上安裝應用程式（請先完成）

Mr.🆖 ProReader 可以像原生 App 一樣安裝在你的 iPad 上，從主畫面開啟即全螢幕顯示。

1. 在 iPad 上開啟 **Safari**（*必須使用 Safari，不能用 Chrome*）。
2. 前往 **{{APP_URL}}**。
3. 點擊 Safari 工具列頂部的**「分享」按鈕** — 帶有向上箭頭（↑）的方形圖示。
4. 在分享選單中向下滑動，點擊**「加入主畫面」**。
5. 保留名稱 **Mr.🆖 ProReader**，點擊右上角的**「加入」**。
6. 完成！Mr.🆖 ProReader 圖示已出現在主畫面。**日後請一律從這個圖示開啟應用程式** — 全螢幕顯示，與其他 App 一樣。

### 第二部分 — 登入即用

**步驟一 — 使用學校 Google 帳戶登入**
開啟應用程式（**{{APP_URL}}** 或新的主畫面圖示），以**學校帳戶**（**{{SCHOOL_EMAIL_DOMAIN}}**）透過 Google 登入。

**步驟二 — 就是這麼簡單！**
所有 AI 功能即時可用。應用程式會自動設定為**免費**模式——沒有設定對話框、沒有訪問密碼。開啟**設定 → 一般**可看到確認訊息：*「✅ 你的帳戶已啟用免費 AI 訪問 — 無需訪問密碼。」*

**步驟三 — 開始閱讀**
上傳閱讀材料的照片，試試摘要、心智圖、詞彙表或遊戲。

### 重要事項

- **請使用學校帳戶**（{{SCHOOL_EMAIL_DOMAIN}}）——個人 Google 帳戶不會自動享有免費訪問。
- 免費訪問綁定你登入的學校帳戶，無法轉交校外人士。
- 若 AI 功能出現*「無權限」*，你很可能以個人 Google 帳戶登入了——請登出後再以學校帳戶登入。

如有疑問，請聯絡你的老師或學校管理員。祝閱讀愉快！📚
