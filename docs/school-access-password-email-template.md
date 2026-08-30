# School Access Password Onboarding Email Template

Bilingual (English + 繁體中文) email for schools on the Free (Access Password) billing mode. Explains how new teachers and students install the PWA on iPads, sign in with school Google accounts, and enter the Access Password in the first-run onboarding dialog.

UI labels quoted in the email mirror `onboarding.*` and `settingsBanner.*` keys in `src/locales/en-US.json` / `zh-HK.json` — if the onboarding dialog wording changes, update this template to match.

## Placeholders

| Placeholder | Example value | Notes |
|---|---|---|
| `{{APP_URL}}` | `https://read.mr5ai.com` | Web app URL |
| `{{SCHOOL_NAME_EN}}` | CCC Kei Chi Secondary School | English school name |
| `{{SCHOOL_NAME_ZH}}` | 中華基督教會基智中學 | Chinese school name |
| `{{SCHOOL_EMAIL_DOMAIN}}` | `@gs.keichi.edu.hk` | School Google account domain |
| `{{ACCESS_PASSWORD}}` | `12345678` | The school's Access Password (Free mode) |

---

## Subject

> Welcome to Mr.🆖 ProReader — Access Password for {{SCHOOL_NAME_EN}} | 歡迎使用 Mr.🆖 ProReader — {{SCHOOL_NAME_ZH}}訪問密碼

---

## Email body

Dear Teachers and Students,

Welcome to **Mr.🆖 ProReader**! Our school has arranged **free access** for all {{SCHOOL_NAME_EN}} members. The first time you sign in, the app will guide you through setup — you only need to enter the Access Password below **once**.

> **Access Password: `{{ACCESS_PASSWORD}}`**
> Please keep this password within our school community.

### Part A — Install the app on your iPad (do this first)

Mr.🆖 ProReader can be installed like a native app on your iPad, so it opens full-screen from your Home Screen with nothing else on the page.

1. Open **Safari** on your iPad *(you must use Safari — not Chrome — for installation)*.
2. Go to **{{APP_URL}}**.
3. Tap the **Share button** — the square with an arrow pointing up (↑), at the top of the Safari toolbar.
4. Scroll down the share menu and tap **"Add to Home Screen"**.
5. Keep the name **Mr.🆖 ProReader** and tap **"Add"** (top-right corner).
6. Done! The Mr.🆖 ProReader icon is now on your Home Screen. **Always start the app from this icon** — it opens full-screen, just like any other app.

### Part B — First sign-in and Access Password

**Step 1 — Sign in with your school Google account**
Open the app (**{{APP_URL}}** or your new Home Screen icon) and sign in with Google using your school account (**{{SCHOOL_EMAIL_DOMAIN}}**).

**Step 2 — The Welcome dialog appears**
After signing in for the first time, a dialog titled **"Welcome to Mr.🆖 ProReader"** opens automatically. It says *"One quick step before you start: choose how you want to power the AI features"* and shows **three option cards**: Subscription, **Free**, and Meter.

**Step 3 — Choose the "Free" card**
Tap the green **Free** card (the one with the key icon, described as *"Use an Access Password from Mr.🆖 — no payment needed"*). Do **not** choose Subscription or Meter — those require payment details.

**Step 4 — Enter the Access Password**
The dialog now shows the **"Free access"** step with a single **Access Password** field. Type `{{ACCESS_PASSWORD}}`, then tap **"Save and continue"**. A confirmation message appears: *"Access Password saved — you're ready to go!"*

**Step 5 — Start reading**
The final screen shows a green ✔ **"You're all set!"** with suggestions for what to do next. Tap **"Start reading"** — you're done! The app remembers your password; you won't need to enter it again.

### If you don't see the dialog

If you closed the dialog with **"Skip for now"** or the ✕ button, it will reappear next time you sign in. You can also set up the password manually: tap **"Open Settings"** on the **yellow banner** at the top of the page, select **Free** under *Billing Mode*, paste the Access Password, and save.

Any questions? Contact your teacher or the school admin. Happy reading! 📚

---

**親愛的老師及同學：**

歡迎使用 **Mr.🆖 ProReader**！學校已為全體{{SCHOOL_NAME_ZH}}師生安排**免費使用**。首次登入時，應用程式會引導你完成設定 — 只需輸入以下訪問密碼**一次**。

> **訪問密碼：`{{ACCESS_PASSWORD}}`**（請勿向外校人士透露）

### 第一部分 — 在 iPad 上安裝應用程式（請先完成）

Mr.🆖 ProReader 可以像原生 App 一樣安裝在你的 iPad 上，從主畫面開啟即全螢幕顯示。

1. 在 iPad 上開啟 **Safari**（*必須使用 Safari，不能用 Chrome*）。
2. 前往 **{{APP_URL}}**。
3. 點擊 Safari 工具列頂部的**「分享」按鈕** — 帶有向上箭頭（↑）的方形圖示。
4. 在分享選單中向下滑動，點擊**「加入主畫面」**。
5. 保留名稱 **Mr.🆖 ProReader**，點擊右上角的**「加入」**。
6. 完成！Mr.🆖 ProReader 圖示已出現在主畫面。**日後請一律從這個圖示開啟應用程式** — 全螢幕顯示，與其他 App 一樣。

### 第二部分 — 首次登入與訪問密碼

**步驟一 — 使用學校 Google 帳戶登入**
開啟應用程式（**{{APP_URL}}** 或新的主畫面圖示），以學校帳戶（**{{SCHOOL_EMAIL_DOMAIN}}**）透過 Google 登入。

**步驟二 — 歡迎對話框自動出現**
首次登入後，標題為**「歡迎使用 Mr.🆖 ProReader」**的對話框會自動開啟，顯示*「開始之前只需一步：選擇驅動 AI 功能的方式」*，並列出**三張選項卡**：訂閱、**免費**、用量。

**步驟三 — 選擇「免費」卡片**
點擊綠色的**免費**卡片（鑰匙圖示，說明為*「使用 Mr.🆖 提供的訪問密碼 — 無需付款」*）。請**不要**選擇「訂閱」或「用量」— 那兩項需要付費資料。

**步驟四 — 輸入訪問密碼**
對話框進入**「免費使用」**步驟，只有一個**訪問密碼**輸入框。輸入 `{{ACCESS_PASSWORD}}`，然後點擊**「儲存並繼續」**。畫面會顯示：*「訪問密碼已儲存 — 一切就緒！」*

**步驟五 — 開始閱讀**
最後一頁顯示綠色 ✔**「設定完成！」**及後續建議。點擊**「開始閱讀」**即可！系統會記住密碼，之後無需再輸入。

**看不到對話框？**
若你曾點擊**「暫時跳過」**或 ✕ 關閉對話框，下次登入時會再次出現。你也可以手動設定：點擊頁面頂部**黃色橫幅**上的**「開啟設定」**，在*計費模式*中選擇**免費**，貼上訪問密碼並儲存。

如有疑問，請聯絡你的老師或學校管理員。祝閱讀愉快！📚
