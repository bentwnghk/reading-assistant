# Competitor Onboarding Research: ReadTheory · Newsela · Quizlet

How three key competitors structure their new-user onboarding flows, with screenshots, key steps, and points of friction or delight. Companion to [competitor-analysis.md](./competitor-analysis.md).

**Why these three:** each maps to one of Mr.🆖 ProReader's core pillars —

| Competitor | Pillar it maps to |
|---|---|
| **ReadTheory** | Adaptive reading comprehension + placement (≈ our Text Difficulty / Reading Test / StudentInfo) |
| **Newsela** | Leveled content + teacher/class assignment workflows (≈ our classes, assignments, shares) |
| **Quizlet** | Vocabulary study modes + SRS (≈ our Glossary, My Vocabulary, flashcards/quiz/spelling) |

> Screenshot note: images are hotlinked from official help centers / vendor CDNs. Intercom-hosted screenshots have expiring signatures and may 404 after ~1–2 weeks — re-fetch from the linked source article if broken.

---

## 1. ReadTheory — "Setup in 5 minutes" (student-led, assessment-first)

**Positioning:** teachers set up classes in under 5 minutes; students take the benchmark assessment the same day; onboarding *is* the product's core adaptive loop.

### Key steps

1. Teacher creates a free account → creates a class (max 35 students) → receives a **Class Code**
2. Student signs up at the student sign-up page: SSO (Google / Microsoft / Clever / ClassLink) **or** self-chosen username + password — **no email required** for students
3. Class Code entered **inline during signup** (or later from the student dashboard)
4. Student is immediately funneled into the **placement pretest** — first-run value is the assessment itself
5. Adaptive loop after pretest: score ≥90% → grade level up · 70–89% → stay · ≤69% → grade level down, quiz returns to the pool
6. Progress reports only populate after pretest + ≥1 full quiz (official guidance: 8+ quizzes for accurate initial data)

### Screenshots & walkthroughs

| Screen | Link |
|---|---|
| Student sign-up screen | [help.readtheory.org — How to Create a Student Account](https://help.readtheory.org/how-to-create-a-student-account) |
| Class onboarding video (teacher) | [youtube.com — Onboarding Your Class to ReadTheory](https://www.youtube.com/watch?v=2o08AiiJEmI) |
| Getting Started 101 video | [youtube.com — Getting Started with ReadTheory](https://www.youtube.com/watch?v=SbH95HqHCtA) |

![ReadTheory — where each student stands (progress dashboards)](https://readtheory.org/wp-content/uploads/2026/07/Know-where-each-student-stands-every-step-of-the-way.-1-3.png)

![ReadTheory — content catalog](https://readtheory.org/wp-content/uploads/2026/07/Content-Catalog-V2-1.png)

### Delight ✨

- **Zero-friction student accounts** — username + password, no email; realistic for K-12 (COPPA-friendly)
- **First-run = adaptive value** — the pretest personalizes everything before the student ever sees a menu
- **Knowledge Points visible from minute one** — large bonuses for passing (70%+) and perfect scores motivate care, not speed; teachers set weekly KP goals (e.g. 150/week) that work across ability levels
- **"Up and running in one week"** positioning; bulk student upload handled by support email

### Friction 🚧

- **Reports show no data** until pretest + full quiz complete — teachers confuse this for a bug (it's in their FAQ)
- **Pretest accuracy complaints** — one wrong answer can drop a student a full grade level; teachers cannot override levels ([Common Sense community review](https://www.commonsense.org/node/5118376))
- **Test-like format** criticized as unengaging for developing reading habits (Common Sense review)
- Free tier: ads + 35-student class cap; ad-free and activity history are paid

**Sources:** [FAQ](https://readtheory.org/frequently-asked-questions) · [Common Sense review](https://www.commonsense.org/education/reviews/readtheory) · [Teacher's Lounge guides](https://readtheory.org/teachers-lounge/using-readtheory-for-intervention-a-teachers-guide-from-an-avid-readtheory-user) · [Pricing](https://readtheory.org/app/pricing/teacher)

---

## 2. Newsela — enterprise-style, integration-matrix onboarding

**Positioning:** school/district provisioning first; classes and licenses flow from LMS/SSO integrations; teachers get an in-app onboarding checklist.

### Key steps (teacher)

1. newsela.com → **Sign Up** → SSO (Google / Clever / Microsoft) or email + password
2. Enter name + **faculty email** (used to validate school + auto-attach subscription license) → **email verification** loop
3. First login → in-app **onboarding checklist** (create class, explore content, assign)
4. Create class: name, grade, subject → receive **Class Link or Class Code**; or import from Google Classroom / Canvas / Schoology / Clever / ClassLink
5. Students join via **Class Link** (prompted to sign in/create account → dropped straight into class), **Class Code** entry on their account page, or **auto-rostering** via the school's LMS/Clever admin — zero student action

### Key steps (student)

- Class Link → sign in or create account → automatically in the class
- Class Code → Settings → Classes → enter code → "Join class"
- Clever/ClassLink/Canvas/Schoology → click Newsela inside the LMS portal → account + roster happen automatically
- One account per student for life, across years and classes

### Screenshots & walkthroughs

| Screen | Link |
|---|---|
| Teacher Get Started checklist | [Direct PNG (Webflow CDN)](https://cdn.prod.website-files.com/66f182e7ce15762d01b32e09/6a3164cf47e97068f08def11_Teacher%20Get%20Started%20Checklist.png) |
| Teacher sign-up + verification screens | [help.newsela.com — Sign Up or Log In to a Teacher Account](https://help.newsela.com/en/articles/13656023-sign-up-or-log-in-to-a-teacher-account) |
| Class creation + codes | [help.newsela.com — How to Create Classes](https://help.newsela.com/en/articles/13656110-how-to-create-classes) |
| Adding students (link vs code) | [help.newsela.com — How to Add Students to Classes](https://help.newsela.com/en/articles/13656087-how-to-add-students-to-classes) |

![Newsela — teacher Get Started checklist](https://cdn.prod.website-files.com/66f182e7ce15762d01b32e09/6a3164cf47e97068f08def11_Teacher%20Get%20Started%20Checklist.png)

### Delight ✨

- **Roster-sync nirvana** — with Clever/ClassLink/Canvas/Schoology, students do literally nothing; account + class membership happen on first LMS click
- **One account per student for life**, across years, classes, and teachers; licenses auto-attach based on the school chosen at signup
- **Class Link deep-join** — one click drops a signed-in student directly into the right class
- **Teacher onboarding checklist** gamifies setup inside the product (create class → add students → assign)

### Friction 🚧

- **7+ provisioning paths** (Google, Clever, Canvas, ClassLink, Schoology, Microsoft, manual) — teachers must "ask their administrator" which one applies; the help center exists largely to disambiguate this matrix
- **Email verification gate** before the teacher can do anything; verification emails sometimes don't arrive (documented failure path)
- Manual (code) path is 5+ steps per student; co-teacher additions fall back to the LMS admin for some integrations
- Content is platform-locked — no BYO text (opposite of our OCR/upload-first model)

**Sources:** [Ways to Create Student Accounts](https://support.newsela.com/article/ways-to-create-student-accounts) · [Ways to Join a Teacher's Class](https://support.newsela.com/article/ways-to-join-a-teacher-s-class) · [Getting Teachers Started for Administrators](https://help.newsela.com/en/articles/13656022-getting-teachers-started-for-administrators)

---

## 3. Quizlet — content-library-first, then hard monetization gate

**Positioning:** instant access to a 500M+ public study-set library; onboarding is search, not setup; monetization gates the most effective study modes.

### Key steps (web — from PageFlows' 18-screen capture)

1. Homepage → **Sign up** (Google / Apple / email)
2. Enter email → **enter birthday** (COPPA age gate) → set password → **choose username**
3. Inline error/retry states; **email confirmation** prompt
4. "Get started" landing → search existing public sets or create a first set
5. First study session hits the wall fast: free = Flashcards + Match, **5 Learn rounds + 1 practice test per set**, then upgrade prompt ($35.99/yr; 7-day trial only on the annual plan)

### Screenshots & walkthroughs

| Screen | Link |
|---|---|
| Full screen-by-screen flow (3 free screens, rest paywalled) | [pageflows.com — Quizlet Onboarding Flow on Web](https://pageflows.com/post/desktop-web/onboarding/quizlet) |
| The paywall / pricing page | [quizlet.com/upgrade](https://quizlet.com/upgrade) |
| Community screenshot of the gate | [ntdaily.com — Quizlet's paywalls](https://www.ntdaily.com/opinion/quizlet-s-paywalls-place-priority-on-profits-over-pupils/article_848d54c6-4eca-11ef-b6bd-bba8eff900d3.html) |

![Quizlet — paywall opinion piece header (NT Daily)](https://bloximages.chicago2.vip-townnews.com/ntdaily.com/content/tncms/assets/v3/editorial/4/a0/4a0e4026-4ec5-11ef-8bbd-cf2f4ce14654/66a96ce1468e2.image.jpg?resize=1396%2C750)

### Delight ✨

- **Instant content gratification** — studying a relevant set within 30 seconds without creating anything; library search *is* the onboarding
- **Low-friction identity** — username, not real name; birthday gate is a speed bump, not a wall
- **Polished multi-state signup UX** — inline errors, retry states, forgiving flows
- **Quizlet Live** gives teachers an immediate classroom hook with any existing set

### Friction 🚧

- **The 2022+ paywall on Learn/Test modes** — the features that made it sticky became the upsell; sustained student backlash, bypass videos, and a whole "Quizlet alternative" content genre exist because of it
- **Daily Learn limits reset per 24h** regardless of study load; ads on free tier
- **Thin personalization** — no level assessment, no goal setting; assumes you already know what to study (an opening for us)
- COPPA gate adds a step but is handled gracefully

**Sources:** [PageFlows](https://pageflows.com/post/desktop-web/onboarding/quizlet) · [NT Daily opinion](https://www.ntdaily.com/opinion/quizlet-s-paywalls-place-priority-on-profits-over-pupils/article_848d54c6-4eca-11ef-b6bd-bba8eff900d3.html) · [MintDeck breakdown of free vs paywalled](https://www.mintdeck.app/blog/quizlet-paywall-free-alternative) · [Quizlet pricing](https://quizlet.com/upgrade)

---

## Side-by-side summary

| Dimension | ReadTheory | Newsela | Quizlet |
|---|---|---|---|
| Time to first value | Same class period (pretest) | Same day (via checklist/LMS) | < 1 minute (library search) |
| Account friction (student) | Minimal (username, no email) | None with LMS; moderate with code | Low (email + birthday + username) |
| Personalization in onboarding | High (adaptive pretest) | Low (grade band at class creation) | None |
| Teacher role in student onboarding | Class code (inline at signup) | Link / code / full LMS roster sync | Optional (classes/Live) |
| First-run "aha" | Placement + Knowledge Points | Leveled article at your reading level | Studying immediately from shared sets |
| Biggest complaint | Pretest accuracy; empty reports | Integration matrix confusion | Paywall on best study modes |

---

## Takeaways for Mr.🆖 ProReader

1. **Copy ReadTheory's account model for students** — class code inline at signup; make Google SSO optional rather than the only path (we currently gate everything behind Google OAuth, which blocks classroom-wide adoption where students lack Google accounts).
2. **Copy Newsela's checklist pattern** — a first-login teacher checklist ("create class → share code → assign first text") maps directly onto our existing classes / assignments / shares primitives with no new backend.
3. **Make our StudentInfo step pay off visibly** — the age/grade slider ≈ ReadTheory's pretest; surface an immediate personalization payoff (e.g. difficulty analysis tuned to level) so first-run demonstrates adaptive value like their placement does.
4. **Avoid Quizlet's mistake** — our SRS flashcards / quiz / spelling are the "Learn mode" equivalents and our retention engine. Keep a genuinely functional free tier for students; monetize teacher/school tooling (dashboards, assignments, exports) instead.
5. **Kill empty-report confusion** — ReadTheory's #1 FAQ complaint. Our dashboard should always explain *why* a metric is empty ("complete a reading test to see skill profile") with a CTA to the action that fills it.

---

*Researched via public product pages, vendor help centers, PageFlows, and Common Sense Education reviews. Compiled August 2026.*
