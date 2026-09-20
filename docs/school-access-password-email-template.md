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

> Welcome to Mr.🆖 ProReader | 歡迎使用 Mr.🆖 ProReader

---

## Email body

Dear Colleagues,

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

### Part C — English teachers: add your students to your classes (teachers only)

**Good news — all English classes have already been created for you.** Every form (S1–S6) already has its English groups set up, e.g. **S1 · English · Gp1**, **S1 · English · Gp2**, … **S6 · English · Gp5**. **You do NOT need to create any class** — you only need to add your students to your own classes.

Complete Parts A and B first (install the app and sign in). Then:

1. On the main screen, tap the **User Management** button (people icon) at the top.
2. In the window that opens, tap the **Classes** tab. You will see **your own classes only** — each labelled **Form · Subject · Group**, e.g. **S1 · English · Gp1**.
3. Find the class you want to fill, and tap the **people icon** in that class's row (the *Manage Members* button in the **Actions** column).
4. A **"Members of …"** window opens. Tap the **Add Student** button.
5. Type a student's name or email in the **"Search students..."** box, then **tap each student to select** them (a ✓ appears).
6. Tap **Add Selected Student (N)**. Done — the student is now in your class.
7. Repeat steps 3–6 for each of your classes.

**Notes:**
- A student appears in the search list only **after they have signed in at least once** with their school Google account. It's best to do this after your students have completed Parts A and B.
- A student can belong to more than one class (e.g. yours and another teacher's), so don't worry about "using them up".

### Part D — Teachers of other subjects (Science, Geography, …): create your class first (teachers only)

English classes are pre-created, but for other subjects you create your own class — it takes less than a minute. Complete Parts A and B first. Then:

1. On the main screen, tap the **User Management** button (people icon) at the top.
2. Tap the **Classes** tab.
3. Tap the **Create Class** button (top-right of the tab, with a **+** sign).
4. In the **Create Class** dialog, fill in three things:
   - **Subject** — tap the **Subject** dropdown and choose your subject (e.g. *Science*, *Geography*).
   - **Form / Grade** — tap the **Form / Grade** dropdown and choose the form you teach (S1–S6).
   - **Class Name** — tap the **Class Name** box and type your group name only, e.g. `Gp1`. Don't type the subject or form — they are added automatically.
   - Below the box, a preview shows the final label, e.g. *"Displays as: **S1 · Science · Gp1**"* — check it looks right.
5. (Optional) Type a **Description**.
6. Tap **Save**. Your class is created and you are set as its teacher automatically.
7. Now add your students: tap the **people icon** in your new class's row and follow **Part C, steps 4–6** above.

**Note:** if your subject is missing from the **Subject** dropdown, ask the school admin to add it (admins manage subjects and forms under the **Subjects & Forms** tab).

### Important notes

- **Use your school account** ({{SCHOOL_EMAIL_DOMAIN}}) — personal Google accounts do not have automatic access.
- Free access is tied to your signed-in school account, so it can't be shared with people outside the school.
- If an AI feature ever says *"No permissions"*, you are probably signed in with a personal Google account — sign out and sign in again with your school account.

Any questions? Contact your teacher or the school admin. Happy reading! 📚

---

**各位同事：**

學校已為全體師生安排免費使用 **Mr.🆖 ProReader**。 **毋須輸入任何密碼** ——訪問權已與你的學校 Google 帳戶綁定，只要登入即可使用。

### 第一部分 — 在 iPad 上安裝應用程式（請先完成）

Mr.🆖 ProReader 可以像原生 App 一樣安裝在你的 iPad 上，從主畫面開啟即全螢幕顯示。

1. 在 iPad 上開啟 **Safari**。
2. 前往 https://read.mr5ai.com。
3. 點擊 Safari 工具列頂部的 **「分享」按鈕** — 帶有向上箭頭（↑）的方形圖示。
4. 在分享選單中向下滑動，點擊 **「更多」**，然後 **「加入主畫面」**。
5. 保留名稱 **Mr.🆖 ProReader**，點擊右上角的 **「加入」**。
6. 完成！Mr.🆖 ProReader 圖示已出現在主畫面。**日後請一律從這個圖示開啟應用程式** — 全螢幕顯示，與其他 App 一樣。

### 第二部分 — 登入即用

**步驟一 — 使用學校 Google 帳戶登入**
開啟應用程式（ https://read.mr5ai.com 或新的主畫面圖示 ），以 **學校帳戶**（ **@gs.keichi.edu.hk** ）透過 Google 登入。

**步驟二 — 就是這麼簡單！**
所有 AI 功能即時可用。應用程式會自動設定為 **免費** 模式——沒有設定對話框、沒有訪問密碼。開啟 **設定 → 一般** 可看到確認訊息：*「✅ 你的帳戶已啟用免費 AI 訪問 — 無需訪問密碼。」*

**步驟三 — 開始閱讀**
上傳閱讀材料的照片，或從文本庫選擇文章，或使用 AI 生成，然後試試摘要、思維導圖、文本分析和改寫、詞彙或遊戲等功能。

### 第三部分 — 英文科老師：把學生加入你的班別（僅限老師）

**好消息——所有英文班已經為你預先開好。** 全部六個級別（S1–S6）的英文分組均已建立，例如 **S1 · English · Gp1**、**S1 · English · Gp2**……**S6 · English · Gp5**。**你毋須建立任何新班**，只需把你的學生加入你自己的班別。

請先完成第一及第二部分（安裝應用程式及登入），然後：

1. 在主畫面頂部點擊 **「用戶管理」** 按鈕（人像圖示）。
2. 在彈出的視窗中點擊 **「班別」** 分頁。你只會看到 **你自己負責的班別** ——每班名稱格式為 **級別 · 科目 · 組別**，例如 **S1 · English · Gp1**。
3. 找到要加入學生的班別，點擊該班 **「操作」欄中的人像圖示**（管理學生按鈕）。
4. 視窗標題為 **「某某班的學生」**。點擊 **「添加學生」** 按鈕。
5. 在 **「搜索學生...」** 框輸入學生姓名或班別與學號（例如 **5D07**），然後 **點擊選取** 每位學生（出現 ✓ 號）。
6. 點擊 **「確認添加 (N)」**。完成——學生已加入你的班別。
7. 為其餘班別重複步驟 3 至 6。

**注意：**
- 學生 **必須先用學校 Google 帳戶登入至少一次**，才會出現在搜索清單中。建議待學生完成第一及第二部分後再進行。
- 一名學生可以同時屬於多個班別（例如你的班和其他老師的班）。

### 第四部分 — 其他科目老師（科學、地理等）：先建立你的班別（僅限老師）

英文班已預先開好，但其他科目需要你自己建立班別——不到一分鐘即可完成。請先完成第一及第二部分，然後：

1. 在主畫面頂部點擊 **「用戶管理」** 按鈕（人像圖示）。
2. 點擊 **「班別」** 分頁。
3. 點擊分頁右上角的 **「創建班別」** 按鈕（帶 **+** 號）。
4. 在 **「創建班別」** 對話框中填寫三項：
   - **科目** — 點擊 **「科目」** 下拉選單，選擇你的科目（例如 *科學*、*地理*）。
   - **級別** — 點擊 **「級別」** 下拉選單，選擇你任教的級別（S1–S6）。
   - **班別名稱** — 點擊 **「班別名稱」** 框，只輸入班別或組別名稱，例如 `A`。毋須輸入科目或級別——系統會自動加上。
   - 框下方會顯示最終名稱預覽，例如 *「顯示為：**S1 · Science · Gp1**」* ——請確認無誤。
5. （可選）填寫 **「描述」**。
6. 點擊 **「保存」**。班別即已建立，你會自動成為該班的負責老師。
7. 然後加入學生：點擊新班別該行的人像圖示，並依照 **第三部分步驟 4 至 6** 操作。

**注意：** 若 **「科目」** 下拉選單沒有你的科目，請聯絡本人新增。

### 重要事項

- **請使用學校帳戶**（ @gs.keichi.edu.hk ）——個人 Google 帳戶不會自動享有免費訪問。
- 免費訪問綁定你登入的學校帳戶，無法轉交校外人士。
- 若 AI 功能出現 *「無權限」*，你很可能以個人 Google 帳戶登入了——請登出後再以學校帳戶登入。

如欲了解更多功能和使用說明，請查看 **用戶手冊** (https://read.mr5ai.com/docs/user-manual-zh-hk.html)。如有疑問，請聯絡本人。
