# AI English Reading Assistants for EFL Learners — Competitive Analysis

Head-to-head comparison of **Mr.🆖 ProReader** (this repository) against the leading AI-powered reading and literacy platforms serving EFL / striving readers. Compiled from public product pages, vendor documentation, and the IES What Works Clearinghouse.

**Legend:** ✅ = Yes / full · ◐ = Partial / limited · ❌ = No · — = unknown / not applicable

---

## 1. Product Overview

| Platform | Category | Primary Audience | Pricing | Website | iOS | Android | Access Model |
|---|---|---|---|---|---|---|---|
| **Mr.🆖 ProReader** | AI reading assistant + vocab/grammar suite | EFL learners (students + teachers) | Freemium (Stripe); self-hostable | [github.com/bentwnghk/reading-assistant](https://github.com/bentwnghk/reading-assistant) | PWA (browser install) | PWA (browser install) | Open-source · self-host via Docker (`docker compose up`) · Google sign-in |
| LingQ | Extensive reading + vocab tracker | Language learners (EFL/MFL) | Subscription (free tier) | [lingq.com](https://www.lingq.com) | [App Store](https://apps.apple.com/app/lingq-learn-languages/id379385811) | [Play Store](https://play.google.com/store/apps/details?id=com.linguistsoftware.lingq) | Consumer subscription |
| Beelinguapp | Bilingual parallel reading | EFL / casual learners | Freemium | [beelinguapp.com](https://www.beelinguapp.com) | [App Store](https://apps.apple.com/app/beelinguapp/id1210574997) | [Play Store](https://play.google.com/store/apps/details?id=com.beelinguapp) | Consumer freemium |
| Achieve3000 Literacy | Adaptive leveled ELL program | K-12 ELL / striving readers | School licensing | [mheducation.com › Achieve3000](https://www.mheducation.com/prek-12/program/microsites/achieve-3000-literacy.html) (achieve3000.com → McGraw Hill) | — (web/SSO) | — (web/SSO) | School license · SSO/Clever · login [portal.achieve3000.com](https://portal.achieve3000.com) |
| Newsela | Cross-curricular leveled content | K-12 ELA/SS/Science | School licensing | [newsela.com](https://newsela.com) | — (web/SSO) | — (web/SSO) | School license · Google Classroom/Clever |
| ReadTheory | Adaptive comprehension practice | K-12 (native + ELL) | Free + premium | [readtheory.org](https://readtheory.org) | — (web) | — (web) | Free + premium |
| CommonLit | Free ELA curriculum library | Secondary ELA | Free (paid add-ons) | [commonlit.org](https://www.commonlit.org) | — (web) | — (web) | Free · Google Classroom |
| Raz-Kids / Reading A-Z | Leveled eBook library | Elementary | Subscription | [raz-kids.com](https://www.raz-kids.com) · [readinga-z.com](https://www.readinga-z.com) | [Kids A-Z (App Store)](https://apps.apple.com/app/kids-a-z/id536128826) | [Kids A-Z (Play)](https://play.google.com/store/apps/details?id=com.learninga_z.onyourown) | Subscription |
| Epic | Kids' digital library | Elementary | Subscription (Basic free) | [getepic.com](https://www.getepic.com) | [App Store](https://apps.apple.com/app/epic/id719219382) | [Play Store](https://play.google.com/store/apps/details?id=com.getepic.epic) | Consumer subscription |
| Khanmigo | General AI tutor | K-12 all subjects | Subscription | [khanmigo.ai](https://www.khanmigo.ai) · [khanacademy.org](https://www.khanacademy.org) | via Khan Academy app | via Khan Academy app | Consumer subscription |
| Diffit | AI resource differentiation | Teachers | Freemium | [web.diffit.me](https://web.diffit.me) (app: [diffit.me](https://diffit.me)) | — (web) | — (web) | Freemium (teacher/district tiers) |
| EPS Reading Assistant | ASR oral-reading coach | Intervention / ELL | Licensing | [epslearning.com › Reading Assistant](https://www.epslearning.com/products/eps-reading-assistant) | — (web/SSO) | — (web/SSO) | School license · rostered |
| MagicSchool | Teacher AI productivity | Teachers | Freemium | [magicschool.ai](https://www.magicschool.ai) | — (web) | — (web) | Free for teachers + school tiers |
| Brisk Teaching | Teacher AI productivity (extension) | Teachers | Freemium | [briskteaching.com](https://www.briskteaching.com) | — (extension) | — (extension) | Freemium · lives inside Google/MS tools |

> Platforms marked "— (web/SSO)" are web-only (no native app); students access via district SSO/Clever/ClassLink. The official website's "Get the app" button is the authoritative source if any store link has moved. **Mr.🆖 ProReader** is the only self-hostable/open-source entry; all others are closed SaaS.

---

## 2. Content & Input

| Feature | Mr.🆖 ProReader | LingQ | Beelinguapp | Achieve3000 | Newsela | ReadTheory | CommonLit | Raz-Kids | Epic | Khanmigo | Diffit | EPS R.A. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Multi-level / adapted text | ✅ | ❌ | ❌ | ✅ | ✅ (5 levels) | ✅ (Lexile) | ◐ | ✅ (aa–Z) | ❌ | ❌ | ✅ (by grade) | ❌ |
| AI text simplification on demand | ✅ | ❌ | ❌ | ✅ | ✅ | ◐ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| OCR / image input | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ◐ | ❌ |
| PDF / file upload | ✅ | ◐ (import) | ◐ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (URL/PDF) | ❌ |
| URL / web-page ingestion | ✅ | ✅ | ◐ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| User-uploaded shared text repository | ✅ | ◐ (import only) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| CEFR / multi-metric readability analysis | ✅ | ❌ | ❌ | ◐ (Lexile) | ◐ (Lexile) | ✅ (Lexile) | ❌ | ◐ | ❌ | ❌ | ◐ | ❌ |
| CEFR word-level highlighting | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 3. Vocabulary & Spaced Repetition

| Feature | Mr.🆖 ProReader | LingQ | Beelinguapp | Achieve3000 | Newsela | ReadTheory | CommonLit | Raz-Kids | Epic | Khanmigo | Diffit | EPS R.A. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Auto glossary extraction | ✅ | ◐ (mark words) | ◐ (click-add) | ❌ | ◐ (in-text) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Personal word bank (per user) | ✅ | ✅ | ◐ | ◐ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Bilingual definitions (zh/en) | ✅ | ◐ | ✅ | ❌ | ◐ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Flashcards | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ◐ | ❌ | ❌ | ◐ | ❌ |
| Spaced repetition (algorithmic SRS) | ✅ (Leitner 5-box) | ◐ | ◐ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Named review lists + sharing | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Export (PDF/Word/CSV/image) | ✅ | ◐ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ◐ | ❌ |
| Review session history + stats | ✅ | ◐ | ❌ | ◐ | ❌ | ✅ (auto-grade) | ◐ | ✅ | ❌ | ❌ | ❌ | ◐ |
| Collocations (chunk learning) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 4. Comprehension, Grammar & Assessment

| Feature | Mr.🆖 ProReader | LingQ | Beelinguapp | Achieve3000 | Newsela | ReadTheory | CommonLit | Raz-Kids | Epic | Khanmigo | Diffit | EPS R.A. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Comprehension quizzes (MC/TF/short-answer/inference/vocab-context/referencing) | ✅ (6 types) | ◐ (cloze) | ❌ | ✅ | ✅ | ✅ (MC) | ✅ | ✅ | ❌ | ◐ | ✅ | ❌ |
| Skill profiling (main-idea/detail/inference/vocab/purpose) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| AI grammar-topic extraction | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Grammar quizzes + lessons | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ◐ | ❌ | ❌ |
| Grammar games (multiple) | ✅ (5 games) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Adaptive difficulty on performance | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ◐ | ❌ | ❌ | ❌ | ✅ |
| Pre-reading scaffolding (activate/predict/pre-teach) | ✅ | ❌ | ❌ | ✅ (polls) | ◐ | ❌ | ◐ | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## 5. Audio, Pronunciation & TTS

| Feature | Mr.🆖 ProReader | LingQ | Beelinguapp | Achieve3000 | Newsela | ReadTheory | CommonLit | Raz-Kids | Epic | Khanmigo | Diffit | EPS R.A. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Read-along (synced TTS + highlight) | ✅ | ◐ | ✅ (karaoke) | ◐ | ◐ | ◐ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Word-level TTS playback | ✅ | ✅ | ✅ | ◐ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| ASR oral-reading / pronunciation feedback | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ◐ (running record) | ❌ | ✅ (speech) | ❌ | ✅ |

---

## 6. AI Scaffolding, Tutoring & Engagement

| Feature | Mr.🆖 ProReader | LingQ | Beelinguapp | Achieve3000 | Newsela | ReadTheory | CommonLit | Raz-Kids | Epic | Khanmigo | Diffit | EPS R.A. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AI-generated summary | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ◐ | ✅ | ❌ |
| AI mind map | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| AI image visualization of text | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Conversational AI reading tutor | ✅ | ◐ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Gamification (points/badges/achievements) | ✅ | ◐ (streaks) | ◐ | ◐ | ◐ | ✅ | ❌ | ✅ | ◐ | ◐ | ❌ | ◐ |
| Leaderboard (weekly/all-time) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Real-time multiplayer game (spelling battle) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 7. Teacher, Classroom & Analytics

| Feature | Mr.🆖 ProReader | LingQ | Beelinguapp | Achieve3000 | Newsela | ReadTheory | CommonLit | Raz-Kids | Epic | Khanmigo | Diffit | EPS R.A. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Teacher → student assignments | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Session sharing (teacher↔student) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Student dashboard + analytics | ✅ | ◐ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Teacher dashboard + Excel export | ✅ | ❌ | ❌ | ✅ | ✅ | ◐ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Role-based access (admin/teacher/student) | ✅ | ❌ | ❌ | ✅ | ✅ | ◐ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| LMS / Google Classroom integration | ❌ | ❌ | ❌ | ✅ | ✅ | ◐ | ✅ | ✅ | ◐ | ◐ | ✅ | ◐ |

---

## 8. Platform, Deployment & Tech

| Feature | Mr.🆖 ProReader | LingQ | Beelinguapp | Achieve3000 | Newsela | ReadTheory | CommonLit | Raz-Kids | Epic | Khanmigo | Diffit | EPS R.A. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| PWA / installable | ✅ | ✅ (apps) | ✅ (apps) | ◐ | ◐ | ◐ | ◐ | ✅ (apps) | ✅ (apps) | ✅ | ◐ | ◐ |
| Self-host / open-source (Docker) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Bring-your-own-key multi-AI-provider | ✅ (10+ providers) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| i18n (multi-language UI) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Email reminders / subscriptions | ✅ | ❌ | ❌ | ◐ | ◐ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Analysis

### Where Mr.🆖 ProReader Stands Out (unique / differentiated)
- **BYO-key multi-provider AI** (Google/OpenAI/Anthropic/DeepSeek/xAI/Mistral/Azure/Ollama, etc.) — none of the commercial competitors let you plug in your own model keys or self-host.
- **Self-hostable open deployment** (Docker) — only ProReader offers on-prem/private data control.
- **Collocations** (chunk-level learning) — absent from all others.
- **AI mind map + AI image visualization** — no competitor offers both.
- **5 dedicated grammar games** (Roulette, Error Surgery, Workshop, Duel, Word Scramble) — unmatched; competitors do at most static grammar drills.
- **Real-time multiplayer spelling battle** (Socket.io arena) — unique gamified multiplayer.
- **Algorithmic Leitner SRS** with per-word review history + exportable named review lists — deeper than LingQ/Beelinguapp's informal flashcards.
- **Comprehension skill profiling** (5 skills, cross-session rollup) — no competitor tracks skill breakdowns this way.
- **CEFR word-level highlighting + 6-formula readability** — most offer only Lexile.
- **Multi-type reading test** (6 question types incl. T/F/NG, referencing) — richer than typical MC-only tools.
- **Arbitrary input (OCR/PDF/URL + shared text repository)** — Diffit matches on input but not on the learner-facing app.

### Where Competitors Lead
- **ASR oral-reading / pronunciation feedback** — EPS Reading Assistant and Raz-Kids (running records) do this; ProReader is TTS-only (no speech recognition).
- **Curated, standards-aligned content libraries at scale** — Newsela, CommonLit, Raz-Kids, Achieve3000 ship vast pre-leveled corpora; ProReader relies on user-supplied text.
- **LMS / Google Classroom / roster integration** — Newsela, CommonLit, Diffit, Brisk have deep LMS hooks; ProReader has none.
- **Efficacy evidence / research backing** — Achieve3000 and ReadTheory have WWC/efficacy studies; ProReader is newer with less published validation.
- **Native mobile apps** — LingQ, Beelinguapp, Epic, Raz-Kids have polished native apps; ProReader is PWA-only.

### Strategic Gaps Worth Considering
1. **Speech recognition / pronunciation scoring** (biggest functional gap vs. EPS R.A.).
2. **Built-in leveled content library** (reduces friction for teachers who lack source texts).
3. **LMS/SIS roster sync** (Google Classroom, Clever, ClassLink) — critical for school adoption.
4. **Published efficacy research** to match institutional procurement requirements.

---

## Pedagogical Foundations

| Theory | Feature mapping |
|---|---|
| Comprehensible input / i+1 (Krashen) | Leveled texts, TTS, AI simplification |
| Scaffolding / ZPD (Vygotsky) | Guided questions, chunking, multi-step routines |
| Spaced repetition / retrieval practice | Vocabulary flashcards, tracked review (Leitner) |
| Schema theory | Pre-reading organizers, background activation |
| Formative assessment | Auto-grading quizzes, dashboards |
| Extensive reading | Large leveled libraries (competitors) / importable texts (ProReader, LingQ) |

---

## Sources

- IES What Works Clearinghouse — Achieve3000 intervention report
- Newsela Educator Success Guide
- Vendor product pages: ReadTheory, CommonLit, ReadWorks, LingQ, Beelinguapp, Raz-Kids, Reading A-Z, Epic, Curipod, Khanmigo, MagicSchool, Diffit, Brisk Teaching, EPS Learning, McGraw Hill (Achieve3000 Literacy)

*Feature assessments reflect publicly documented capabilities as of Aug 2026 and may change as vendors ship updates; verify against the linked product pages before procurement decisions.*
