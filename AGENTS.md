# AGENTS.md

This document provides essential guidelines and technical references for AI agents (and human developers) working on the **Mr.🆖 ProReader** repository. Adhere to these patterns to ensure consistency, security, and maintainability.

---

## Development Workflow & Commands

The project uses **npm** as the primary package manager (>= 9.8.0, Node >= 18.18.0).

### Core Commands

- **Install Dependencies**: `npm install`
- **Development Server**: `npm run dev` (Runs at `http://localhost:3000` with Turbopack)
- **Build Project**: `npm run build`
- **Static Export**: `npm run build:export` (Generates `out/` directory, sets `NEXT_PUBLIC_BUILD_MODE=export`)
- **Standalone Build**: `npm run build:standalone` (Sets `NEXT_PUBLIC_BUILD_MODE=standalone`)
- **Start Production**: `npm run start`
- **Linting**: `npm run lint`

### Testing

- **Status**: Currently, there are no automated tests in the codebase.
- **Guideline**: If adding tests, use **Vitest** or **Jest** following standard Next.js patterns. Place test files next to the code they test (e.g., `ComponentName.test.tsx`) or in a `__tests__` directory.

### Docker

- **Main app Dockerfile**: Multi-stage build on `node:18-alpine`, runs `build:standalone`, exposes port 3000.
- **Realtime Dockerfile**: Multi-stage build on `node:18-alpine` at `realtime/Dockerfile`, builds TypeScript → JS, exposes port 3001. Uses a 3-stage layout (deps → builder → prod-deps → runner) for a slim final image.
- **docker-compose.yml**: Three services — `postgres` (PostgreSQL 16 Alpine, port 5432), `reading-assistant` (port 3000, depends on healthy postgres), and `realtime` (port 3001, Socket.io server, depends on healthy postgres, shares `AUTH_SECRET` and `DATABASE_URL`).
- **Build & Run**: `docker compose up --build`

### CI/CD

- **`.github/workflows/docker.yml`**: Pushes multi-arch (amd64/arm64) Docker image to Docker Hub on `main`/`dev` pushes and `v*` tags.
- **`.github/workflows/ghcr.yml`**: Pushes Docker image to GitHub Container Registry on `main`/`db` pushes and `v*` tags. Also builds and pushes a separate `-realtime` image from `realtime/Dockerfile` in a parallel job.
- **`.github/workflows/issue-translator.yml`**: Auto-translates non-English GitHub issues.

---

## Project Structure

```
src/
├── app/                        # Next.js App Router (Pages, API routes, Layouts)
│   ├── api/                    # API route handlers (see Backend section)
│   ├── sw.ts                   # Serwist service worker source
│   └── ...                     # Page routes
├── auth.ts                     # NextAuth v5 full server-side config (PostgreSQL adapter)
├── auth.config.ts              # NextAuth v5 Edge-compatible config (Google OAuth only)
├── middleware.ts                # Request middleware (API key injection, access control)
├── components/
│   ├── ui/                     # Shadcn UI primitives (do not modify directly)
│   ├── Internal/               # Custom shared components
│   ├── ReadingAssistant/       # Core reading assistance feature components (41 files — see Reading Assistant Features section)
│   ├── Vocabulary/             # My Vocabulary page components (table, flashcards, quiz, spelling, review lists, export, sharing)
│   ├── MagicDown/              # Markdown rendering and editing components
│   ├── Auth/                   # Authentication UI components
│   ├── Dashboard/              # Student dashboard components (includes session sharing dialogs)
│   ├── TeacherDashboard/       # Teacher dashboard components (includes GrammarGameChart)
│   ├── Leaderboard/            # Leaderboard components
│   ├── Subscription/           # Subscription/billing UI components
│   ├── UserManagement/         # User management components
│   ├── Provider/               # Context providers (Theme, I18n)
│   ├── PWAInstallPrompt.tsx    # PWA install dialog (iOS + standard browsers)
│   ├── ServiceWorkerRegistrar.tsx # Service worker registration on mount
│   ├── History.tsx             # Reading session history browser with import/export
│   ├── ReminderPreferences.tsx # Email reminder frequency settings
│   └── Setting.tsx             # Application settings panel
├── hooks/                      # Custom React hooks (see Hooks section)
├── store/                      # Zustand stores (global state, persisted)
├── lib/                        # Server-side data access + realtime client
│   ├── db.ts                   # PostgreSQL connection pool singleton
│   ├── sessions.ts             # Session data access
│   ├── users.ts                # User data access
│   ├── realtime-client.ts      # Singleton Socket.io client (module-scope, SPA-safe)
│   ├── realtime-ticket.ts      # HMAC ticket issuance for realtime server auth
│   ├── vocabulary.ts           # Vocabulary data access (CRUD, stats, SRS, review sessions)
│   ├── review-lists.ts         # Review list CRUD + sharing
│   ├── achievements.ts         # Achievement logic
│   ├── activity.ts             # Activity tracking
│   ├── chatQuestions.ts        # Chat question generation
│   ├── email.ts                # Email sending (Mailtrap)
│   ├── leaderboard.ts          # Leaderboard queries
│   ├── reminders.ts            # Email reminder scheduling
│   ├── repository.ts           # Text repository queries
│   ├── school-subscription.ts  # School subscription logic
│   ├── settings.ts             # App settings queries
│   ├── shared-sessions.ts      # Session sharing CRUD + share target resolution
│   ├── subscription.ts         # Subscription data access
│   └── subscription-email.ts   # Subscription email templates
├── templates/                  # Email template files
├── utils/                      # Client/server helper functions (see Utils section)
├── constants/                  # Application constants (prompts, URLs, locales)
├── locales/                    # I18n translation files (JSON)
└── types.d.ts                  # Shared TypeScript type definitions
scripts/                        # SQL migrations (init-db.sql + incremental migrations)
realtime/                       # Standalone Socket.io server for multiplayer spelling battles
├── Dockerfile                  # Multi-stage build (deps→builder→prod-deps→runner)
├── src/
│   ├── server.ts               # Socket.io bootstrap + room/game orchestration
│   ├── auth.ts                 # HMAC ticket verification
│   ├── config.ts               # Runtime env-driven configuration
│   ├── db.ts                   # PostgreSQL pool + helper queries
│   ├── presence.ts             # Connected-user presence tracker
│   ├── rooms.ts                # Room CRUD, player management, host transfer
│   └── game/
│       ├── engine.ts           # Game loop (countdown→playing→finished)
│       ├── scoring.ts          # Authoritative scoring + timing constants
│       ├── types.ts            # Battle types (mirrored from src/types.d.ts)
│       └── words.ts            # Word list resolution (glossary/vocab/review-list/curated)
```

---

## Code Style & Conventions

### 1. TypeScript & Types

- **Strict Mode**: `strict: true` is enabled in `tsconfig.json`. Always provide explicit types for function parameters and return values.
- **Global Types**: Core business logic types (e.g., `ReadingSession`, `ReadingTestQuestion`, `GlossaryEntry`, `VocabularyWord`, `VocabularyReviewSession`, `ReviewList`, `UserRole`, `SchoolInfo`, `TextVisibility`, `RepositoryText`) are defined in `src/types.d.ts`. Check this file before creating new interfaces.
- **Explicit Any**: While `@typescript-eslint/no-explicit-any` is currently `off`, avoid `any` unless absolutely necessary for external library compatibility. Prefer `unknown` or specific interfaces.
- **Unused Vars**: `@typescript-eslint/no-unused-vars` is `error`. Prefix intentionally unused variables with `_`.
- **Zod**: Use **Zod** for schema validation, especially for AI response parsing and API request bodies.

### 2. React & Next.js

- **App Router**: This project uses the Next.js App Router.
- **React Compiler**: The experimental React Compiler is enabled (`reactCompiler: true` in `next.config.ts`). Avoid manual memoization (`useMemo`, `useCallback`, `React.memo`) unless there is a specific reason the compiler cannot optimize it.
- **Client Components**: Use `"use client";` at the top of files that require browser APIs or React hooks (state, effects).
- **Dynamic Imports**: Use Next.js `dynamic()` for heavy components or those that rely on browser-only libraries (e.g., `MagicDown`, `Mermaid`).
- **Hooks**: Prefer custom hooks for complex logic (e.g., `useReadingAssistant`, `useAiProvider`, `useDashboardMetrics`, `useTeacherDashboard`, `useSubscription`).
- **All Hooks** (in `src/hooks/`):
  - `useReadingAssistant` — Core reading session business logic (AI generation, games, vocabulary). Returns `activeGenerations` (not a local `status` enum) so loading state survives SPA navigation
  - `useAiProvider` — AI model provider factory for streaming/generation
  - `useDashboardMetrics` — Student dashboard data aggregation
  - `useTeacherDashboard` — Teacher dashboard data aggregation
  - `useSubscription` — Stripe subscription state management
  - `useSchoolSubscription` — School subscription state management
  - `useVocabularySync` — Auto-syncs glossary changes to vocabulary DB on change
  - `useAutoSave` — Auto-saves reading session to localforage history (skips during streaming; excludes `originalImages`/`visualizationImage` from its dependency array because they are lazy-loaded asynchronously — see [Lesson 10](#10-lazy-loaded-large-fields-originalimages--visualizationimage))
  - `useMobile` — Responsive breakpoint detection
  - `useAccurateTimer` — High-precision countdown timer for games
  - `useSubmitShortcut` — Keyboard shortcut (Ctrl+Enter) for form submission
  - `useIdleTimer` — Client-side idle timeout with multi-tab sync via BroadcastChannel

### 3. Components & UI

- **Shadcn UI**: UI primitives are located in `@/components/ui`. Do not modify them directly; extend them or create wrappers in `src/components/Internal`.
- **Styling**: Use **Tailwind CSS** with the `tailwindcss-animate` and `@tailwindcss/typography` plugins. Follow mobile-first responsive design patterns.
- **Dark Mode**: Uses `darkMode: ["class"]`. Ensure all new UI elements support both light and dark modes using Tailwind `dark:` classes.
- **Icons**: Use **lucide-react**.
- **I18n**: All UI strings must use `useTranslation` from `react-i18next`. Use `t("key.path")` for all labels.

### 4. State Management

- **Zustand**: Used for global client-side state and persistence.
- **Stores**: `reading.ts`, `global.ts`, `setting.ts`, `history.ts`, `achievements.ts`, `vocabulary.ts`, `sharing.ts` — all in `src/store/`.
- **Persistence**: Most stores use the `persist` middleware to save data in `localStorage`.
- **Radash**: Use **radash** utilities for common operations like `pick`, `isString`, `isObject`, etc.
- **History store lightweight/full split**: The `src/store/history.ts` store tracks sessions in two states. `loadFromAPI` populates the array with **lightweight** entries (no `originalImages`/`visualizationImage` — these large base64 payloads are stripped by `getUserSessions()`). The async `loadFull(id)` method fetches the complete session (including media) on demand via `/api/sessions/[id]`, deduplicates concurrent fetches, and merges via `hydrate(id, data)`. A module-level `hydratedSessionIds` Set records which entries already contain full media. Use `loadFull` (not `load`) whenever media fields are needed (restore, download, assignment snapshots); use `load` only for synchronous reads of already-present text fields. See [Lesson 10](#10-lazy-loaded-large-fields-originalimages--visualizationimage).
- **AI Generation Tracking**: All AI generation loading state lives in the reading store's `activeGenerations: Record<string, boolean>` field (keyed by `GenerationType`). Components read `!!activeGenerations["type"]` for spinners/disabled state. This **must** be store-level (not component-local `useState`) so loading indicators and button-disable survive SPA navigation — the user can navigate to `/leaderboard` mid-generation, come back, and still see the spinner. See [AI Generation Tracking](#ai-generation-tracking-activegenerations) below.

### 5. Imports

- **Path Alias**: Always use the `@/` prefix for absolute imports from the `src` directory.
- **Ordering**:
  1. React/Next.js core
  2. Third-party libraries
  3. Components (Internal/UI)
  4. Hooks & Stores
  5. Utils & Types

---

## Authentication (NextAuth v5)

The project uses **next-auth v5 (beta.30)** with **Google OAuth** as the sole provider.

- **`src/auth.ts`**: Full server-side config with `PostgresAdapter` (pg Pool, max 20 connections). Session strategy is `database` with configurable `SESSION_MAX_AGE` (default: 3 days).
- **`src/auth.config.ts`**: Lightweight Edge-compatible config used by middleware (no pg dependency).
- **`src/middleware.ts`**: Intercepts `/api/:path*` requests. Handles API key injection for AI/search providers and verifies `ACCESS_PASSWORD` via HMAC signature.
- **Roles**: `UserRole` includes `super-admin`, `admin`, `teacher`, `student`. Super-admins can share with any user across schools. Roles are auto-assigned on first sign-in via session callbacks (`ensureUserRole`, `ensureUserSchool`).
- **Session**: Extended to include `user.id` and `user.role` on the client side.

### Session Security

Three layers protect user sessions:

| Feature | Config Var | Default | How it works |
|---------|-----------|---------|--------------|
| **Session max lifetime** | `SESSION_MAX_AGE` (server-side, seconds) | 259200 (3 days) | Hard ceiling — NextAuth rejects sessions after this period from creation. No extension on activity. |
| **Concurrent session limit** | `MAX_CONCURRENT_SESSIONS` (server-side) | 3 | On each sign-in (`events.signIn`), old sessions beyond this count are pruned via `enforceConcurrentSessionLimit()` in `src/lib/session-security.ts`. |
| **Client-side idle timeout** | `SESSION_IDLE_TIMEOUT_MINUTES` (server-side, minutes) | 30 | The `useIdleTimer` hook (`src/hooks/useIdleTimer.ts`) tracks real DOM interaction (mouse, keyboard, touch, click, scroll). After the idle threshold, calls `signOut()`. Multi-tab sync via `BroadcastChannel`. Shows a warning toast 1 minute before. The value is exposed to the client at runtime via `/api/config` (NOT `NEXT_PUBLIC_*`) so it can be changed without rebuilding. |

**Key design decisions**:
- Idle timeout is **client-side only** — server-side idle detection was removed because background polling (60s pending-shares poll in `Header.tsx`) keeps server-side activity timestamps fresh, making it ineffective.
- `SESSION_IDLE_TIMEOUT_MINUTES` is a **server-side env var** exposed via `/api/config`, not a `NEXT_PUBLIC_*` build-time var, so it can be changed per-deployment without rebuilding the Docker image.

---

## Database (PostgreSQL)

The project uses **PostgreSQL 16** as its primary database.

- **Connection**: Singleton `pg.Pool` in `src/lib/db.ts` (max 20 connections, 30s idle timeout, 2s connect timeout).
- **Data Access**: Server-side queries live in `src/lib/*.ts` files. All database operations should go through these modules, not raw SQL in API routes.
- **Migrations**: SQL migration files in `scripts/` (e.g., `init-db.sql`, `add-subscriptions.sql`, `migrate-ai-models.sql`). Apply migrations manually in order.
- **Auth Storage**: next-auth uses the `@auth/pg-adapter` with its own schema managed by the adapter.

---

## Backend & API Patterns

### 1. Error Handling

- Use the `parseError` utility from `@/utils/error.ts` to standardize error messages.
- In async functions, use `try...catch...finally` to manage loading states and error reporting.

### 2. API Routes

API routes are in `src/app/api/`. Key route groups:

- **`ai/*`**: AI provider proxies (Google, Google Vertex, OpenAI, Anthropic, DeepSeek, xAI, Mistral, Azure, OpenRouter, OpenAI Compatible, Pollinations, Ollama).
- **`webhooks/stripe/`**: Stripe webhook handler.
- **`subscription/*`**: Subscription management (checkout, portal, cancel, reactivate, status).
- **`auth/*`**: NextAuth API routes.
- **`users/*` / `user/*`**: User management and profile.
- **`classes/*`**: Class management (teacher/student).
- **`sessions/*`**: Reading session CRUD.
- **`vocabulary/*`**: Vocabulary CRUD, sync, SRS rating, word sharing, review session history.
- **`review-lists/*`**: Named review list CRUD + sharing between users.
- **`leaderboard/*`**: Leaderboard data.
- **`achievements/*`**: Achievement tracking.
- **`activity/*`**: User activity logging.
- **`repository/*`**: Shared text repository.
- **`schools/*`**: School management.
- **`chat-questions/*`**: AI-generated chat questions.
- **`reminders/*`**: Email reminder preferences.
- **`settings/*`**: Application settings.
- **`import/*`**: Data import endpoints.
- **`admin/*`**: Admin-only endpoints.
- **`cron/*`**: Scheduled tasks (email reminders).
- **`config/*`**: Public config endpoints (e.g., fallback model).
- **`shares/*`**: Reading session sharing (create, list pending, accept/reject, get targets).

### 3. Provider Proxying

The middleware (`src/middleware.ts`) and `next.config.ts` rewrites proxy requests to external AI and search providers:

- **AI Providers**: Google, Google Vertex, OpenRouter, OpenAI, Anthropic, DeepSeek, xAI, Mistral, Azure, OpenAI Compatible, Pollinations, Ollama.
- **Search Providers**: Tavily, Firecrawl, Exa, Bocha, Brave, SearXNG.
- **Access Control**: All proxied routes require HMAC-signed `ACCESS_PASSWORD`. The middleware replaces client tokens with server-side API keys.
- **Disabled Providers**: `NEXT_PUBLIC_DISABLED_AI_PROVIDER` and `NEXT_PUBLIC_DISABLED_SEARCH_PROVIDER` env vars can disable entire providers. `NEXT_PUBLIC_MODEL_LIST` supports `-all,+model` syntax for fine-grained model control.

### 4. Subscriptions & Billing (Stripe)

- **Stripe Integration**: Full subscription lifecycle (checkout, portal, cancellation, reactivation, webhooks).
- **Plans**: Individual and school subscriptions with configurable pricing and trial periods.
- **Webhook**: `src/app/api/webhooks/stripe/route.ts` handles Stripe events.

### 5. Email System

- **Provider**: Mailtrap for transactional emails.
- **Use Cases**: Reading reminders, subscription expiry notifications.
- **Cron**: `src/app/api/cron/route.ts` triggers scheduled email sends.
- **Templates**: `src/templates/` contains email template definitions.

### 6. Environment Variables

- Refer to `env.tpl` for all available environment variables (~70+ variables).
- **Categories**: AI provider keys/URLs, search provider keys/URLs, auth (NextAuth + Google OAuth), database (`DATABASE_URL`, `POSTGRES_PASSWORD`), Stripe/billing, email (Mailtrap), access control (`ACCESS_PASSWORD`, `ADMIN_EMAILS`, `SUPER_ADMIN_EMAILS`), session security (`SESSION_MAX_AGE`, `MAX_CONCURRENT_SESSIONS`, `SESSION_IDLE_TIMEOUT_MINUTES`), MCP server config, feature flags (`NEXT_PUBLIC_DISABLED_AI_PROVIDER`, `NEXT_PUBLIC_DISABLED_SEARCH_PROVIDER`, `NEXT_PUBLIC_MODEL_LIST`).
- **Never commit** `.env` or `.env.local` files.
- **CRITICAL — Runtime vs Build-time**: `NEXT_PUBLIC_*` env vars are **inlined at build time** — changing them requires a rebuild. For values that should be configurable at deployment/runtime (e.g., timeouts, limits, feature toggles), use **server-side env vars** (no `NEXT_PUBLIC_` prefix) and expose them to the client via an API route (e.g., `/api/config`). The Docker image is built once and deployed with different env var values across environments, so avoid `NEXT_PUBLIC_*` for anything that varies per deployment.

---

## PWA (Serwist)

The project uses **Serwist** (Workbox successor) for service worker support.

- **Source**: `src/app/sw.ts` — configured with `skipWaiting`, `clientsClaim`, `navigationPreload`, and runtime caching via `defaultCache`.
- **Build**: During `PHASE_PRODUCTION_BUILD`, `next.config.ts` wraps the config with `withSerwistInit` (swSrc → swDest: `public/sw.js`).
- **TypeScript**: `tsconfig.json` includes `"webworker"` in `lib` for service worker type support.

---

## My Vocabulary Page (`/vocabulary`)

A dedicated auth-gated page for systematic vocabulary review across all reading sessions. Accessible via the Header `BookOpen` icon (after Bell icon) and a link inside the Glossary section on the main page.

### Database Tables

- **`user_vocabulary`**: Per-user word bank. Columns: `user_id`, `word` (unique per user), `syllabification`, `part_of_speech`, `english_definition`, `chinese_definition`, `example`, `source_session_ids` (JSONB), `shared_by` (FK to `users.id`, NULL = "own"), `srs_counts` (JSONB `{"hard":N,"medium":N}`), `rating` (derived: easy/hard/medium), `mastery_level` (0-5), `review_count`, `correct_count`, `last_reviewed_at`, `next_review_at`.
- **`vocabulary_review_sessions`**: Review session history. Columns: `id`, `user_id`, `mode` (flashcard/quiz/spelling), `word_count`, `correct_count`, `rating_counts` (JSONB `{"again":N,"hard":N,"good":N,"easy":N}`), `results` (JSONB array), `created_at`.
- **`review_lists`**: Named word lists. Columns: `id`, `name`, `words` (JSONB array of `ReviewListWord`), `word_count`, `created_by`, `created_at`, `updated_at`.
- **`shared_review_lists`**: Pending/accepted/rejected review list shares. Columns: `id`, `sender_id`, `recipient_id`, `review_list_id`, `review_list_name`, `word_count`, `status`, `created_at`, `updated_at`.

### Migrations (apply in order)

1. `scripts/add-user-vocabulary.sql` — creates `user_vocabulary` table
2. `scripts/add-vocabulary-shared-by.sql` — adds `shared_by` column
3. `scripts/add-vocabulary-review-sessions.sql` — creates `vocabulary_review_sessions` table
4. `scripts/add-review-lists.sql` — creates `review_lists` and `shared_review_lists` tables
5. `scripts/add-review-session-rating-counts.sql` — adds `rating_counts` JSONB + `rating` TEXT
6. `scripts/add-srs-counts.sql` — adds `srs_counts` JSONB to `user_vocabulary`
7. `scripts/backfill-user-vocabulary.sql` — backfills words from existing sessions

`scripts/init-db.sql` includes all tables for fresh installs.

### SRS (Spaced Repetition) System

- **Algorithm**: Leitner 5-box in `src/utils/srs.ts`
- **Intervals**: 0 (immediate), 1d, 3d, 7d, 14d, 30d
- **Rating**: Derived from cumulative `srs_counts`: `again`/`hard` presses → `hard` count, `good` presses → `medium` count, `easy` is dismissal (not counted). Rating logic: both 0 → "easy", hard ≥ medium → "hard", medium > hard → "medium"
- **Actions**: `recordSRSAction` in `src/lib/vocabulary.ts` auto-inserts words not yet in DB (with `wordData` payload), then updates `srs_counts` via `jsonb_set`
- **Due for Review**: Words where `next_review_at = 0` (never reviewed) OR `next_review_at <= now()`
- **Unified flow**: Both main page and vocabulary page flashcards use `onWordAction` → `recordSRSAction`

### Key Components

| Component | Purpose |
|-----------|---------|
| `VocabularyContainer.tsx` | Main container — tabs (Table, Flashcards, Quiz, Spelling, Review Lists, History), stats cards, word selection |
| `VocabularyTable.tsx` | Sortable/filterable word table with source column, bulk selection, review list filtering |
| `AutoSelectPanel.tsx` | 5 auto-select strategies (due for review, hard words, random, new, oldest reviewed) |
| `ExportPanel.tsx` | Export to PDF, Word, CSV, text-as-image |
| `ReviewListsTab.tsx` | CRUD for named review lists, pagination, share button (teachers/admins only) |
| `ReviewHistory.tsx` | Paginated review session history with per-rating counts, delete with confirmation |
| `ShareVocabularyDialog.tsx` | Share individual words with same-school users (teachers/admins/super-admins) |
| `AddToReviewListDialog.tsx` | Add selected words to a review list |
| `ReviewListShareDialog.tsx` | Share named review lists with same-school users |

### API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/vocabulary` | GET | Fetch user's vocabulary with stats |
| `/api/vocabulary/sync` | POST | Sync words from reading sessions to DB |
| `/api/vocabulary/word` | PATCH | SRS action (rate word), auto-insert if missing |
| `/api/vocabulary/share` | POST | Share words with other users |
| `/api/vocabulary/review-sessions` | GET, POST, DELETE | Review session CRUD |
| `/api/review-lists` | GET, POST, PATCH, DELETE | Review list CRUD |
| `/api/review-lists/[id]` | GET | Get single review list |
| `/api/review-lists/share` | POST | Share review list with users |
| `/api/review-lists/share/pending` | GET | List pending shares (or count) |
| `/api/review-lists/share/[id]` | PUT | Accept/reject a share |

### Sharing Rules

- **Vocabulary sharing**: Teachers/admins/super-admins can share individual words with same-school users. Super-admins can share with any user.
- **Review list sharing**: Teachers/admins/super-admins can share named review lists. Share button hidden from students in UI.
- **Accept flow**: When a student accepts a shared review list, words are written to `user_vocabulary` with `shared_by = sender_id` (teacher source) AND to `review_lists` (recipient's copy).
- **Role gating**: UI shows share controls conditionally; API rejects non-teacher/admin/super-admin requests.

### Important Implementation Notes

- `recordSRSAction` uses `jsonb_set(srs_counts, ARRAY[$3], ...)` — the `ARRAY[]` wrapper is required to avoid PostgreSQL `text vs text[]` type conflict.
- `loadReviewListIntoQueue` deduplicates by word text (case-insensitive), not by ID, to prevent duplicate entries.
- Accepted shared review list words are persisted to `user_vocabulary` on accept (not deferred to first review), so source attribution is correct immediately.
- The `acceptedReviewListWords` store field bridges the main page to the vocabulary page for review list workflows.
- Pagination: Table tab uses 25/50/75/100 per page; Review Lists & History tabs use 10/20/30/50.

---

## Reading Assistant Features

The main reading page (`src/app/page.tsx`) is a multi-step workflow driven by `useReadingAssistant` and the Zustand `reading` store. Each step has a corresponding component in `src/components/ReadingAssistant/`.

### Workflow Steps

| Step | Component | Description |
|------|-----------|-------------|
| Student Info | `StudentInfo.tsx` | Age/grade slider for adaptive content |
| Image Upload | `ImageUpload.tsx` | Upload images, PDFs, or paste URLs; OCR extraction |
| Text Difficulty | `TextDifficultyAnalyzer.tsx` | Multi-metric readability (Flesch, Flesch-Kincaid, ARI, Coleman-Liau, SMOG, CEFR) with interactive highlighting |
| CEFR Highlighting | `CefrTextHighlighter.tsx` | Color-coded word difficulty overlay per CEFR level |
| Summary | `Summary.tsx` | AI-generated text summary |
| Adapted Text | `AdaptedText.tsx` | AI-simplified version of the text |
| Mind Map | `MindMap.tsx` | AI-generated Markdown mind map (rendered via `MagicDown`) |
| Visualization | `Visualization.tsx` | AI-generated image visualization of the text |
| Reading Test | `ReadingTest.tsx` | Multi-type comprehension questions (MC, T/F/NG, short answer, inference, vocab-context, referencing) |
| Glossary | `Glossary.tsx` | Extracted vocabulary with definitions, syllabification, examples, and SRS rating |
| Grammar | `Grammar.tsx` | AI grammar topic extraction, interactive quiz, Word export, grammar-specific text highlighting |
| Grammar Games | `GrammarGames.tsx` | Hub for 5 gamified grammar exercises (see Grammar Games below) |
| Vocabulary Flashcard | `VocabularyFlashcard.tsx` | In-session flashcard review with SRS integration |
| Vocabulary Quiz | `VocabularyQuiz.tsx` | In-session word-to-definition / fill-blank quiz |
| Vocabulary Spelling | `VocabularySpelling.tsx` | Spelling game with listen-type, scramble, and fill-blanks modes |
| Spelling Battle Arena | `SpellingBattleArena.tsx` | Real-time multiplayer spelling along-side arena (word display, answer input, live ranking) |
| Spelling Battle Lobby | `SpellingBattleLobby.tsx` | Multiplayer room create/join, word source selection, class-battle toggle |
| Spelling Battle Flow | `SpellingBattleFlow.tsx` | Orchestrator: lobby → countdown → arena → results |
| Spelling Battle Results | `SpellingBattleResults.tsx` | Final ranking, tier badges, accuracy, rematch button |
| Reading Tutor | `ReadingTutorChat.tsx` | AI-powered reading comprehension tutor (accessed via `TutorChatFab.tsx`) |

### Grammar Games (5 games)

All games are launched from `GrammarGames.tsx` hub. Each game stores high scores and per-game accuracy in the reading store and persists to `reading_sessions` DB table.

| Game | Component | Description |
|------|-----------|-------------|
| Grammar Roulette | `GrammarRoulette.tsx` | Spinning wheel selects a grammar topic; answer MCQs. Practice/Arcade/Mastery modes. |
| Error Surgery | `GrammarErrorSurgery.tsx` | AI generates sentences with one grammar error; identify and fix it from 4 options. |
| Grammar Workshop | `GrammarWorkshop.tsx` | Fill-in-the-blank sentences with word bank (slot-fill challenges). |
| Grammar Duel | `GrammarDuel.tsx` | Turn-based battle vs AI (easy/medium/hard). Power moves after streak. |
| Word Scramble | `GrammarWordScramble.tsx` | Reorder scrambled words to form a grammatically correct sentence. |

- **Shared UI**: `GameResultScreen.tsx` provides celebration animations (canvas-confetti), performance tiers, and replay for all games.
- **Game modes**: Practice (no timer), Arcade (timed), Mastery (target score).

### Grammar Database Columns

Grammar data is stored on the `reading_sessions` table:
- `grammar_topics` (JSONB) — AI-extracted grammar topics
- `grammar_quiz` (JSONB) — Quiz questions
- `grammar_quiz_score`, `grammar_quiz_completed`, `grammar_quiz_earned_points`, `grammar_quiz_total_points`
- `grammar_highlight_enabled`, `grammar_highlight_topic_id` — Text highlight state
- Per-game high scores: `grammar_scramble_high_score`, `grammar_workshop_high_score`, `grammar_surgery_high_score`, `grammar_roulette_high_score`, `grammar_duel_high_score`
- Per-game accuracy: `grammar_scramble_accuracy`, etc.
- Per-game completion count: `grammar_scramble_completed`, etc.
- Challenge caches: `grammar_scramble_challenges`, `grammar_workshop_challenges`, `grammar_game_questions`, `grammar_error_challenges`

### Grammar Migrations (apply in order)

1. `scripts/add-grammar-columns.sql` — Base grammar analysis + quiz columns
2. `scripts/add-grammar-games.sql` — High scores, error challenges, activity types
3. `scripts/add-grammar-game-challenges.sql` — AI-generated challenge caches
4. `scripts/add-grammar-game-accuracy.sql` — Overall grammar game accuracy
5. `scripts/add-grammar-game-per-game-accuracy.sql` — Per-game accuracy + completion counts
6. `scripts/add-grammar-game-completed-at.sql` — Completion counters + timestamp
7. `scripts/add-grammar-game-leaderboard.sql` — Leaderboard columns in `weekly_stats`
8. `scripts/add-grammar-leaderboard.sql` — Grammar quiz leaderboard
9. `scripts/add-grammar-achievements.sql` — Grammar achievement types
10. `scripts/add-grammar-games-achievements.sql` — Grammar games achievement type
11. `scripts/add-grammar-activities.sql` — Grammar activity types
12. `scripts/add-grammar-quiz-mode.sql` — Quiz navigation mode

### Other Key ReadingAssistant Components

| Component | Purpose |
|-----------|---------|
| `LearningRecommendationDialog.tsx` | Adaptive dialog suggesting next learning activities based on session progress |
| `RepositoryUploadDialog.tsx` | Upload extracted text to the shared text repository |
| `WorkflowProgress.tsx` | Step progress indicator at top of main page |
| `TocDrawer.tsx` | Table of contents drawer for all workflow sections |
| `TocFab.tsx` | Floating button to open TOC drawer on mobile |
| `TutorChatFab.tsx` | Floating button to open AI reading tutor chat |
| `QuickQuestions.tsx` | Suggested questions for the reading tutor |
| `ChatMessageBubble.tsx` | Renders individual chat messages with markdown |
| `ParagraphWithNav.tsx` | Paragraph display with navigation |

### Visualization & Mind Map

Both features use AI image generation from the extracted text:
- **Visualization** (`Visualization.tsx`): Generates an image via AI. Supports Chinese/English toggle. Downloadable as PNG.
- **Mind Map** (`MindMap.tsx`): Generates a Markdown mind map rendered with `MagicDown`. Supports Chinese/English toggle.
- **DB columns**: `visualization_image` (TEXT, base64 data URL), `visualization_generated_at` (BIGINT).

### Text Difficulty Analysis

`TextDifficultyAnalyzer.tsx` and `src/utils/textDifficulty.ts` provide multi-metric readability analysis:
- **Readability formulas**: Flesch Reading Ease, Flesch-Kincaid Grade, Automated Readability Index, Coleman-Liau Index, SMOG Index
- **CEFR analysis**: Uses `cefr-analyzer` for word-level CEFR classification (A1–C2) with color-coded highlighting
- **Libraries**: `flesch`, `flesch-kincaid`, `automated-readability`, `coleman-liau`, `smog-formula`, `syllable`, `cefr-analyzer`
- Types: `TextDifficultyResult`, `CEFRLevel`

---

## AI Generation Tracking (`activeGenerations`)

All AI generation loading state is tracked in the reading store via `activeGenerations: Record<string, boolean>`, keyed by `GenerationType`. This replaces the former component-local `useState<ReadingStatus>` and per-component `isGenerating`/`isLoading` flags. The store-level design ensures loading indicators survive SPA navigation (e.g., user navigates to `/leaderboard` mid-generation, returns, and still sees the spinner + disabled button).

### `GenerationType` Values

| Type | Generation Function | Hook or Component |
|------|-------------------|-------------------|
| `"extracting"` | `extractTextFromImage` | Hook |
| `"title"` | `generateTitle` | Hook |
| `"summary"` | `generateSummary` | Hook |
| `"adapted-text"` | `adaptText` | Hook |
| `"simplified-text"` | `simplifyText` | Hook |
| `"mindmap"` | `generateMindMap` | Hook |
| `"visualization"` | `generateVisualization` | Hook |
| `"reading-test"` | `generateReadingTest` | Hook |
| `"targeted-practice"` | `generateTargetedPractice` | Hook |
| `"glossary"` | `generateGlossary` | Hook |
| `"vocabulary-suggest"` | `suggestVocabulary` | Hook |
| `"grammar-topics"` | `analyzeGrammarTopics` | Hook |
| `"grammar-quiz"` | `generateGrammarQuiz` | Hook |
| `"grammar-scramble"` | `generateGrammarScrambleContent` | Hook |
| `"grammar-workshop"` | `generateGrammarWorkshopContent` | Hook |
| `"grammar-surgery"` | `generateErrorSurgeryContent` | Hook |
| `"grammar-questions"` | `generateGrammarQuestions` | Hook (shared by Roulette + Duel) |
| `"sentence-analysis"` | `handleAnalyzeSentence` | `AdaptedText.tsx` (direct `generateText`) |
| `"tutor"` | `askTutor` | Hook |

### Store API

- **`activeGenerations: Record<string, boolean>`** — in the reading store. Not persisted to localStorage or DB (excluded from `partialize`, reset to `{}` in `onRehydrateStorage` and `restore()`).
- **`setGenerating(type: GenerationType, active: boolean)`** — sets the flag. When `active=true`, also clears `error` (matching the old `setStatus` error-clearing behavior).
- **Legacy `status: ReadingStatus`** — kept in the store for DB backward compatibility (`sessions.ts` maps it as `"idle"`), but **no longer drives UI**. Do not read it in components.

### How to Use

**In generation functions** (hook or component):
```ts
// Guard at start — prevents duplicate concurrent generation
if (useReadingStore.getState().activeGenerations["my-type"]) return;

setGenerating("my-type", true);
try {
  // ... AI call ...
} finally {
  setGenerating("my-type", false);
}
```

**In components** — read flags for spinners/disabled state:
```tsx
const { activeGenerations } = useReadingStore();
// or from the hook: const { activeGenerations } = useReadingAssistant();
const isGenerating = !!activeGenerations["my-type"];
```

**Grammar games `isAutoGenerating` pattern** — derived from the flag + cache emptiness:
```tsx
const isGenerating = !!activeGenerations["grammar-surgery"];
const isAutoGenerating = isGenerating && challenges.length === 0;
```

### What NOT to move to `activeGenerations`

These remain component-local because they are not AI generation state:
- `isTTSLoading` (text-to-speech playback)
- `evaluatingId` / `evaluatingShortAnswer` (per-question evaluation, granular)
- `isAiThinking` (game logic timing in GrammarDuel)
- `streamingContent` (ephemeral live-stream text in tutor chat)
- `isProcessingPdf` (PDF parsing, not AI)

---

## Session Sharing

Teachers and admins can share completed reading sessions with students. Shared sessions strip user-specific data (answers, scores, chat history) and create a clean copy for the recipient.

### Database Table

- **`shared_sessions`**: Columns: `id`, `sender_id`, `recipient_id`, `session_id`, `session_data` (JSONB), `status` (pending/accepted/rejected), `doc_title`, `created_at`, `updated_at`.

### Migration

- `scripts/add-shared-sessions.sql` — Creates `shared_sessions` table with indexes

### Key Modules

| Module | Purpose |
|--------|---------|
| `src/lib/shared-sessions.ts` | CRUD for shared sessions + share target resolution by role |
| `src/store/sharing.ts` | Client-side state for pending shares (non-persisted Zustand store) |
| `src/components/Dashboard/ShareSessionDialog.tsx` | Dialog to select recipients and share a session |
| `src/components/Dashboard/SharedSessionDialog.tsx` | Dialog to accept/reject incoming shared sessions |

### API Routes

| Route | Methods | Purpose |
|-------|---------|-------------|
| `/api/shares` | GET, POST | List pending shares / create shared sessions |
| `/api/shares/[id]` | PUT | Accept or reject a shared session |
| `/api/shares/targets` | GET | Get available share targets for current user (grouped by class/school) |

### Share Target Resolution

`getShareTargets` in `src/lib/shared-sessions.ts` resolves available recipients based on role:
- **super-admin**: All users across all schools, grouped by class and school
- **admin**: All users in the same school, grouped by class
- **teacher**: Students in the teacher's classes
- **student**: Classmates in the same class

### Data Stripping

When sharing, `stripUserData` removes: `userAnswer`, `earnedPoints` from test questions; resets `testScore`, `testCompleted`, `vocabularyQuizScore`, `spellingGameBestScore`, `flashcardReviewDates`, `glossaryRatings`, `chatHistory`, `status`, `error`; strips `id`, `createdAt`, `updatedAt`. On accept, a new `id` and timestamps are assigned.

---

## App Routes

Next.js App Router pages in `src/app/`:

| Route | Purpose |
|-------|---------|
| `/` (`page.tsx`) | Main reading assistant page (core workflow) |
| `/vocabulary` | My Vocabulary page (auth-gated) |
| `/leaderboard` | Leaderboard + achievements page (auth-gated) |
| `/image-viewer` | Standalone image viewer with zoom/pan |
| `/privacy-policy` | Privacy policy page |
| `/terms-of-service` | Terms of service page |
| `/unsubscribe` | Email unsubscribe handler |

---

## Utils (`src/utils/`)

| Module | Purpose |
|--------|---------|
| `textDifficulty.ts` | Multi-metric readability analysis (Flesch, CEFR, etc.) |
| `vocabularyExport.ts` | Export vocabulary to PDF, Word (docx), CSV, text-as-image |
| `vocabulary.ts` | Glossary sorting and priority helpers |
| `srs.ts` | Leitner SRS algorithm for spaced repetition |
| `reading-assistant/provider.ts` | AI provider factory (creates Vercel AI SDK provider instances) |
| `parser/` | File content extraction (`pdfParser.ts`, `officeParser.ts`, `textParser.ts`) |
| `crawler.ts` | Web page content extraction via Jina Reader |
| `learningActivities.ts` | Learning activity definitions for recommendation engine |
| `activityLogger.ts` | Log user activities to API |
| `chatQuestionLogger.ts` | Log tutor chat questions to API (silent, non-blocking) |
| `artifact.ts` | AI artifact modification prompt templates |
| `error.ts` | `parseError` utility for standardized error messages |
| `style.ts` | `cn()` Tailwind class merge utility |
| `file.ts` | File download and size formatting |
| `formatDate.ts` | Date formatting helpers |
| `url.ts` | URL completion utilities |
| `vertexAuth.ts` | Google Vertex AI authentication helpers |
| `storage.ts` | Localforage storage helpers |
| `markdown.ts` | Markdown processing |
| `animate-text.ts` | Rehype plugin: splits text into animated spans |
| `model.ts` | AI model list and configuration utilities |
| `text.ts` | Text processing helpers |
| `signature.ts` | HMAC signature generation for API access |
| `dashboardMetrics.ts` | Student dashboard data aggregation |
| `teacherDashboardMetrics.ts` | Teacher dashboard data aggregation |
| `excelExport.ts` | Student data Excel export |
| `teacherDashboardExcel.ts` | Teacher dashboard Excel export |
| `i18n.ts` | i18n configuration |

---

## Security & Safety

- **Secrets**: Do not hardcode API keys or credentials.
- **Sanitization**: Use Zod to sanitize and validate all external inputs (user input, file uploads).
- **API Access**: All AI/search proxy routes are protected by HMAC-signed `ACCESS_PASSWORD` verification in middleware.
- **RBAC**: Role-based access control (super-admin/admin/teacher/student) is enforced via NextAuth session callbacks and API route checks.
- **Destructive Actions**: Avoid `rm -rf` or history rewriting in git unless explicitly requested.

---

## Agent Instructions

- **Read First**: Always read the relevant file and its neighbors before proposing edits.
- **Follow Patterns**: If adding a new component, look at existing components in the appropriate `src/components/` subdirectory for reference implementations.
- **Keep it Focused**: Make small, cohesive changes. Avoid unrelated refactors.
- **Validate**: Run `npm run lint` and `npm run build` to ensure your changes don't break the build.
- **Database Changes**: If modifying database schema, create a new SQL migration file in `scripts/` following the existing naming convention. Update the corresponding `src/lib/*.ts` data access module.
- **API Routes**: New API routes should follow existing patterns — use `parseError` for error handling, Zod for input validation, and the `getPool()`/`getClient()` helpers from `src/lib/db.ts` for database access.
- **Communication**: Summarize what changed, where, and why. Call out tradeoffs, assumptions, and known limitations. If validation could not be run, say so explicitly.
- **Clarity**: Prefer clarity and simplicity over cleverness. Preserve existing behavior unless the task explicitly requires changes.
- **UI Consistency**: Ensure all new UI elements support both light and dark modes using Tailwind `dark:` classes.

---

## Lessons Learned: Adding Major Features

The Grammar feature (v2.462–v2.485) introduced several issues that required multiple reverts and fixes. The insights below apply to any major feature addition.

### 1. Multi-System Integration Checklist

A major feature touches **many subsystems**. Missing any one causes runtime errors or data inconsistencies. Before marking a feature complete, verify integration across **all** of the following:

| System | Files to Update | What to Check |
|--------|----------------|---------------|
| **Types** | `src/types.d.ts` | Define all new interfaces/types first |
| **Store** | `src/store/reading.ts` | Add state fields, setters, and persistence |
| **Hooks** | `src/hooks/useReadingAssistant.ts` | Add business logic methods |
| **Prompts** | `src/constants/readingPrompts.ts` | Add AI prompt functions |
| **Components** | `src/components/ReadingAssistant/` | Main UI component + any helper components |
| **Barrel Export** | `src/components/ReadingAssistant/index.ts` | Re-export new component |
| **Main Page** | `src/app/page.tsx` | Render the new component section |
| **Workflow** | `WorkflowProgress.tsx`, `TocDrawer.tsx` | Add to step list and table of contents |
| **Session Persistence** | `src/lib/sessions.ts` | Save/load new fields to/from DB |
| **DB Migration** | `scripts/*.sql` | Add columns; update `init-db.sql` for fresh installs |
| **Achievements** | `src/lib/achievements.ts` | Add achievement types + colors in `AchievementMedal.tsx` |
| **Activity Logging** | `src/lib/activity.ts`, `src/utils/activityLogger.ts` | Add activity types |
| **Leaderboard** | `src/lib/leaderboard.ts`, `LeaderboardTable.tsx`, `PersonalStatsCard.tsx`, `types.ts` | Add new stat columns |
| **Dashboard** | `src/utils/dashboardMetrics.ts`, `OverviewTab.tsx`, `SessionsTab.tsx` | Add to student metrics |
| **Teacher Dashboard** | `src/utils/teacherDashboardMetrics.ts`, `TeacherDashboard.tsx`, charts | Add to class metrics and charts |
| **Excel Export** | `src/utils/excelExport.ts`, `src/utils/teacherDashboardExcel.ts` | Add columns to exports |
| **User Data** | `src/lib/users.ts`, `StudentDataView.tsx` | Include in student detail views |
| **Settings** | `src/store/setting.ts`, `src/components/Setting.tsx` | Add any model-specific settings |
| **I18n** | `src/locales/en-US.json`, `src/locales/zh-HK.json` | Add all UI strings in both languages |
| **Landing Page** | `src/components/Auth/LandingPage.tsx` | Add to feature cards, workflow, skills |
| **About Dialog** | `src/components/Internal/Header.tsx` | Add to feature cards, workflow, skills |

### 2. Database Migration Best Practices

- **Separate migration files**: Each new feature must have its own incremental migration file (e.g., `add-grammar-columns.sql`, `add-grammar-achievements.sql`). Do **not** modify existing migration files that have already been applied.
- **Update `init-db.sql`**: Also update `scripts/init-db.sql` so fresh installs include all features without running incremental migrations.
- **CHECK constraints**: When adding new values to `CHECK` constraints (e.g., `achievement_type`, `activity_type`), the migration must `DROP CONSTRAINT IF EXISTS` then re-create it with the full list of values.
- **Test both paths**: Verify that both (1) running the incremental migration on an existing DB and (2) running `init-db.sql` on a fresh DB produce the correct schema.

### 3. Model List Reuse in Settings

- When adding a new AI model setting (e.g., `grammarModel`), **reuse existing model lists** (`AVAILABLE_MODELS`, `VISION_MODELS`, `TUTOR_MODELS`) unless there's a strong reason to create a separate list.
- Creating a dedicated model list (e.g., `GRAMMAR_MODELS`) adds maintenance burden and caused Zod enum validation issues that required two reverts (v2.480, v2.481) to fix.
- The settings form uses `z.enum()` from Zod, so the model list must match exactly between the store definition and the form schema.

### 4. Color and Data Conflicts

- Before choosing colors (Tailwind classes, hex codes) for a new feature, audit all existing color usages across the codebase to avoid conflicts:
  - Chart colors in `dashboardMetrics.ts` and `teacherDashboardMetrics.ts`
  - Badge/label colors in `AchievementMedal.tsx`
  - Category colors in feature components
  - Landing page and About dialog feature card colors
- Each feature's chart color must be unique within its chart. The grammar feature initially used `#d946ef` (fuchsia) which conflicted, and was changed to `#14b8a6` (teal) in a hotfix.

### 5. Incremental Commits

- Avoid massive single commits. The initial grammar commit (1,530 lines across 15 files) made it difficult to isolate and revert bugs.
- Recommended commit structure for a major feature:
  1. Types + store + hooks (data layer)
  2. Prompts + AI logic (AI layer)
  3. Component UI (UI layer)
  4. DB migrations + session persistence (persistence layer)
  5. Dashboard/leaderboard/achievements integration (metrics layer)
  6. I18n + landing page updates (presentation layer)
- Each commit should be independently buildable and not break existing functionality.

### 6. SQL INSERT Synchronization

When modifying a `INSERT INTO ... VALUES ($1, $2, ...)` statement, **all three parts must be updated together**:

1. **Column list** — the column names after `INSERT INTO table (`
2. **Parameter placeholders** — the `$N` tokens in `VALUES (...)`
3. **Values array** — the JS array passed as the query's second argument

A mismatch between column count and placeholder count causes a PostgreSQL `INSERT has more target columns than expressions` error at runtime. This is easy to miss during code review because the three parts are often far apart in the same function.

**Prevention checklist** when adding a column to `createReadingSession` (or any hand-written INSERT):

| Step | What to update | Where in `sessions.ts` |
|------|---------------|----------------------|
| Add column name | Column list after `INSERT INTO reading_sessions (` | ~line 19 |
| Add `$N` placeholder | VALUES clause — increment the max `$N` by 1 | ~line 48 |
| Add value expression | JS array — insert at the correct positional index | ~line 116 |
| Add ON CONFLICT update | `column = EXCLUDED.column` in the upsert clause | ~line 49 |

Also verify that `updateReadingSession`'s `fieldMappings` already includes the new field (it maps JS camelCase → DB snake_case).

### 7. Full Persistence Layer Check for New Store Fields

When a new field is added to the Zustand store (`src/store/reading.ts`), it is not automatically persisted to the database. The persistence layer must be updated explicitly. Before considering a new store field "complete", verify:

| Layer | File | What to check |
|-------|------|---------------|
| **DB schema** | `scripts/init-db.sql` + new migration | Column exists with correct type and constraints |
| **Create** | `src/lib/sessions.ts` `createReadingSession()` | Column in INSERT, placeholder in VALUES, value in array, ON CONFLICT update |
| **Update** | `src/lib/sessions.ts` `updateReadingSession()` | Field in `fieldMappings` + correct serialization (JSON vs raw) |
| **Read** | `src/lib/sessions.ts` `getUserReadingSessions()` + `getReadingSession()` | Field mapped from `row.column_name` with correct fallback default |

A field that exists in the store and `fieldMappings` but is missing from the DB schema and INSERT will silently fail: the column doesn't exist in the table, so reads return `undefined`, and fallback logic determines the displayed value. This was the root cause of the `source` field bug where all sessions appeared as "from repository" — the `source` column had never been added to the database.

### 8. Generation Loading State Must Be Store-Level (Not Component-Local)

AI generation loading indicators (`isGenerating`, `isLoading`, etc.) **must** live in the Zustand store (`activeGenerations`), not in component-local `useState`. This was learned the hard way:

- **The bug**: Loading state was tracked via `useState<ReadingStatus>` inside `useReadingAssistant` (component-local). When the user navigated to `/leaderboard` mid-generation, the component unmounted, the local state reset to `"idle"`, and the spinner disappeared. On return, the user saw no indication that generation was still running, could click "Generate" again, and two concurrent streams would interleave tokens into the same store field — corrupting the output.
- **The fix**: All generation flags now live in `activeGenerations: Record<string, boolean>` in the reading store. The store is a module-level singleton that survives SPA navigation. Components read from the store, so spinners persist and buttons stay disabled across page transitions. Each generation function also has an early-return guard (`if (activeGenerations["type"]) return;`) as a belt-and-suspenders check.
- **Key principle**: Any state that tracks an async operation whose lifecycle spans component unmount/remount (which includes ALL AI generations, since the user can navigate freely) must be in the store, not in `useState`. Component-local state is fine for ephemeral UI concerns (popups, selected items, streaming preview text) that have no meaning after unmount.

### 9. `next/dynamic()` Components Need a Local `<Suspense>` Boundary

Components loaded via `next/dynamic(() => import(...))` **without a `loading` option and without a local `<Suspense>` wrapper** will, on their very first render in a page session, suspend while their chunk loads. React bubbles that suspension up to the **nearest ancestor `<Suspense>`** — and in this app that is the root-level `<Suspense fallback={null}>` wrapping all of `<HomeContent />` in `src/app/page.tsx`. The result: the **entire page** is replaced by `null` (a blank document) until the chunk resolves (~100–400ms in dev, faster but still nonzero in production). Once the chunk loads, React restores the full tree and the browser recovers the prior scroll position.

**Why this is deceptive**: The symptom usually reported is "the page scrolls to the top", but the actual cause is a **document height collapse**, not a scroll operation. No `scrollTo`/`focus`/`scrollTop` assignment is involved — it's invisible to JS-level instrumentation. `document.body.scrollHeight` reads `0` (with `documentElement.scrollHeight` reading exactly the viewport height) during the blank window.

**The "only the first time" signature**: This class of bug **only reproduces once per page load** because the lazy chunk's import promise is cached in memory for the remainder of the session. If a user reports a symptom that happens on the first interaction after reload and never again, suspect a `next/dynamic()` / `React.lazy()` first-load suspension.

**The fix**: Always wrap `<MagicDown>` (and any other `next/dynamic()` component) in a local `<Suspense fallback={...}>` at each call site so the loading state is scoped to that subtree instead of blanking the whole app:

```tsx
import { Suspense } from "react";

<Suspense fallback={<LoadingSpinner />}>
  <MagicDown value={...} onChange={...} hideTools />
</Suspense>
```

**Diagnostic checklist** when investigating a "scroll jumps to top" / "page flashes blank" symptom:

| Step | What to check | How |
|------|---------------|-----|
| 1. Is it a real scroll, or a document collapse? | Log `document.body.scrollHeight` in a `requestAnimationFrame` loop around the trigger | If it reads `0` during the symptom, the page content is gone, not scrolled |
| 2. Is a lazy component mounting for the first time? | Look for `next/dynamic()` / `React.lazy()` in the subtree that just rendered | These suspend on first render only |
| 3. Is there a local `<Suspense>` around it? | Check the JSX context of the lazy component usage | If not, the suspension bubbles to the root |
| 4. Does the symptom only happen once per page load? | Reload and try the same action twice | "Only first time" = cached chunk promise afterwards |

**Known call sites of `MagicDown` (all loaded via `next/dynamic()` without local Suspense — potential blank-page sites)**: `AdaptedText.tsx` (Sentence Analysis dialog — fixed), `Summary.tsx`, `MindMap.tsx`. If a similar symptom appears in those sections after a fresh page load, apply the same local `<Suspense>` wrap.

**Why `onOpenAutoFocus={(e) => e.preventDefault()}` on the Radix `DialogContent` does NOT fix this**: That guards against focus-driven scroll (a real but different Radix behavior). It was the first attempted fix for the Sentence Analysis scroll-to-top bug and had zero effect, because the cause was the lazy import's Suspense suspension, not focus management. Don't conflate the two.

### 10. Lazy-Loaded Large Fields (`originalImages` / `visualizationImage`)

`originalImages` (base64 image arrays) and `visualizationImage` (base64 data URL) are the two largest payloads on a reading session. Loading them for every row in the session list (on sign-in, dashboard, history) is expensive and unnecessary for list/metric views. As of v2.859 these fields are **stripped from the list query** (`getUserSessions()` in `src/lib/sessions.ts` no longer joins `reading_images` and returns `originalImages: []` / `visualizationImage: ""`). Full media is fetched **on demand** via `getReadingSession` / the history store's `loadFull(id)`, with concurrent-fetch deduplication and a `hydratedSessionIds` Set tracking which entries already contain media.

This lightweight/full split is correct, but it silently broke two classes of consumers and required follow-up fixes (v2.860, v2.861). **Any time you stop eager-loading a field, audit every consumer**:

| Failure mode | What happens | Fix pattern |
|--------------|--------------|-------------|
| **Presence-as-completion proxy** | Code used `!!row.visualization_image` to mean "visualization was generated". With the field stripped, this is always `false`, so progress bars / dashboard counts / activity tallies report 0%. | Switch to a **lightweight proxy** that *is* returned by the list query — here `visualization_generated_at > 0` (a BIGINT timestamp). Update *every* `calculateProgress` copy: `src/utils/dashboardMetrics.ts`, `src/components/Dashboard/SessionsTab.tsx`, and `src/lib/users.ts` (`getStudentSessions`/`getStudentSessionsForClass` must also `SELECT` the timestamp column). |
| **Autosave dependency array** | `useAutoSave` had `originalImages`/`visualizationImage` in its `useEffect` deps. After lazy-loading, these arrive **asynchronously** (background merge in `AuthProvider`), transitioning the store field from `[]`/`""` (lightweight) to populated (hydrated). That transition fires the autosave effect, which persists the *current* store state — potentially clobbering the just-fetched media, or triggering a redundant write before hydration lands. | Remove lazy-loaded media fields from the autosave dependency array. They are not user-editable text and are persisted by their own generation/save paths. |

**The background-merge race (AuthProvider)**: On sign-in, `AuthProvider` restores the **lightweight** session immediately (so the "Welcome back!" UI isn't blocked), then fetches the full session and merges **only** `originalImages`/`visualizationImage` into the store. The merge is guarded by two checks to avoid clobbering user edits made in the window between restore and fetch:
1. `syncedUserIdRef.current !== expectedUserId` — user hasn't signed out / switched accounts.
2. `useReadingStore.getState().id !== sessionToRestore.id` — user hasn't switched to a different session.

**Rule of thumb**: "If I stop returning this column from the list query, what else reads it?" Answer that question *before* merging the query change, not after users report zeroed-out dashboards.

**Lesson 7 interaction**: This is the read-path mirror of [Lesson 7](#7-full-persistence-layer-check-for-new-store-fields). Lesson 7 says "a field missing from the DB/INSERT silently fails on write"; this lesson says "a field missing from the SELECT silently fails on read." Both produce `undefined`/fallback values with no error, so they are invisible to tests that don't assert the specific field.

### 11. Changing an AI Model Default — What to Update, and Why No Client-Side Migration Is Needed

Changing the default value of an AI model setting (e.g., making `step-3.7-flash` the default Advanced AI Tutor Model instead of `gpt-5.4-mini`) touches **two code locations** and, if you want existing users to adopt the new default, **one SQL migration**. The Settings dialog label itself lives in `src/locales/*.json` (`setting.<fieldName>`).

#### Code changes (in `src/store/setting.ts`)

| What | Where | Notes |
|------|-------|-------|
| **Model list** | `const` array (e.g., `TUTOR_MODELS`, `READING_TEXT_MODELS`, `VISION_MODELS`, `AVAILABLE_MODELS`, `BASIC_TUTOR_MODELS`) | Add/remove/rename entries. The Zod schema in `Setting.tsx` uses `z.enum(<ARRAY>)`, so it picks up the change automatically — **do not** hand-maintain a parallel literal in the schema. |
| **Default value** | `defaultValues` object (e.g., `tutorModel: "step-3.7-flash"`) | New users and `reset()` calls get this. |

The `getItem` validation in the persist config only resets a stored value to the default when it is **not in the model list** (i.e., invalid). It does **not** force a *valid* old selection to the new default — so a user who previously chose `gpt-5.4-mini` keeps it unless you migrate them.

#### Force-applying the new default to existing users

Because the app is auth-gated and `setItem` short-circuits when `currentUserId` is set (`if (currentUserId) return;` in the persist storage), **authenticated users never read or write the model fields to localStorage**. Their settings are loaded from the server via `loadFromServer` on each sign-in (`{ ...defaultValues, ...serverSettings }`). The DB (`user_settings.settings` JSONB) is therefore the **single source of truth** — a **SQL migration alone** is sufficient, and a client-side localStorage migration is dead code that should not be added.

Create a migration in `scripts/` (see `migrate-tutor-model-step-3.7-flash.sql` for the template):

```sql
UPDATE user_settings
SET settings =
    jsonb_set(
      settings,
      '{tutorModel}', '"step-3.7-flash"'::jsonb
    ),
    updated_at = NOW();
```

- **No `WHERE` clause** → applies to all users unconditionally (true "force").
- Add a `WHERE settings->>'tutorModel' = '<old-value>'` clause if you only want to migrate users on a specific previous model.
- Update `scripts/init-db.sql` if the default seed data embeds the old model name.

#### Anti-pattern: client-side localStorage migration

Do **not** add a one-time override in the persist `getItem` (e.g., a `localStorage.getItem("...-migrated-...")` flag that force-sets the field). For authenticated users, `loadFromServer` overwrites whatever `getItem` produced, so the override has no lasting effect; for unauthenticated users, there is no meaningful persisted setting to migrate. It is unreachable code that adds maintenance burden.

#### Related: [Lesson 3](#3-model-list-reuse-in-settings) (Model List Reuse)

Lesson 3 says to **reuse existing model lists** rather than creating per-feature lists. This lesson covers the *operational* side of those same lists — how to change a default and roll it out. Reuse + this lesson together prevent both the Zod enum mismatch bugs (Lesson 3) and the "stale default in the DB" gap (this lesson).

### 12. Adding a Standalone Realtime Service (Multiplayer Spelling Battle Lessons)

The multiplayer spelling battle (v2.902–v2.907) introduced a **standalone Socket.io server** (`realtime/`) alongside the Next.js app. This is the first realtime feature in the project and established several architectural patterns.

#### 12.1 Standalone Package Isolation

The `realtime/` directory is a completely independent Node.js+TypeScript package:

| Concern | How realtime/ handles it |
|---------|--------------------------|
| **Code deps** | Its own `package.json`, `tsconfig.json`, `vitest.config.ts`. No import from `src/` — types are **manually mirrored** in `realtime/src/game/types.ts` with a comment at the top of `src/types.d.ts` (`// Mirrored in realtime/src/game/types.ts — keep both sides in sync`). |
| **Build** | `npm run build` in `realtime/` compiles `src/` → `dist/` (CommonJS, ES2022 target). |
| **Docker** | Own multi-stage `realtime/Dockerfile` (3-stage: deps → builder → prod-deps → runner). Published as a separate `-realtime` image via `.github/workflows/ghcr.yml`. |
| **Runtime** | Runs as a separate container in `docker-compose.yml` on port 3001. Shares `AUTH_SECRET` and `DATABASE_URL` env vars with the main app. |

**Key decisions**:
- The main app's `tsconfig.json` `exclude` list **must** include `"realtime"` (v2.904) to avoid TypeScript picking up the standalone package in the Next.js build.
- The realtime server has its own `config.ts` with env-driven runtime configuration (`REALTIME_PORT`, `REALTIME_CORS_ORIGIN`, `AUTH_SECRET`, `DATABASE_URL`, timeout/max-room constants).
- The realtime URL is a **server-side runtime env var** (`REALTIME_URL`, not `NEXT_PUBLIC_*`), exposed to the client via `/api/config`, so the same Docker image works across deployments.

#### 12.2 HMAC-Ticket Auth for External Services

Instead of sharing session state or using a DB lookup on every Socket.io connection, auth uses **short-lived HMAC-signed tickets**:

1. **Issuance**: The Next.js app's `/api/realtime/ticket` endpoint creates a JSON payload (`userId`, `name`, `image`, `role`, `schoolId`, `classId`, `exp`) and signs it with `AUTH_SECRET` via HMAC-SHA256.
2. **Delivery**: The client fetches the ticket via HTTP **before** connecting and passes it as Socket.io's `auth.token`.
3. **Verification**: The realtime server's `auth.ts` verifies the HMAC signature + expiry on each connection.
4. **Refresh**: The client's `auth` callback (in Socket.io config) fetches a fresh ticket on **every** connection attempt (initial + each reconnect), so tickets need only a 30s TTL.

```
Next.js API                    Client                       Realtime Server
  /api/realtime/ticket
       │                         │                               │
       │─── HMAC ticket ────────>│                               │
       │                         │─── connect({ auth.token }) ──>│
       │                         │                               │── verify HMAC + exp
       │                         │<────── connected ────────────│
```

**Why this pattern**:
- **No shared session DB** — the realtime server never queries the NextAuth session table.
- **Lightweight verification** — HMAC is stateless (no DB call per connection).
- **Graceful degradation** — if the ticket endpoint is down, the client's reconnection loop retries and re-fetches.
- **Class-battle routing** — the ticket embeds `classId` (resolved server-side during issuance) so the realtime server knows which class notifications to route without extra DB queries. Fallback DB resolution is included for older clients during rollout.

#### 12.3 Module-Scope Socket Connection (Lesson 8 Extension)

The Socket.io connection lives at **module scope** (`src/lib/realtime-client.ts` singleton), per Lesson 8's principle that state tracking an async operation whose lifecycle spans component unmount/remount must be at module level, not component-local:

- `connectRealtime()` creates the singleton socket; subsequent calls are no-ops.
- `disconnectRealtime()` tears it down (explicit lifecycle managed by UI, not React mount/unmount).
- `getRealtimeSocket()` provides access for event wiring.
- The battle Zustand store (`battle.ts`) is **non-persisted** — battle state is ephemeral and tied to the live connection, but lives at module scope so it survives SPA navigation.

The `useSpellingBattle` hook's event wiring uses the **singleton pattern** with a module-level `eventsWired` guard:
```ts
let eventsWired = false
function wireEventsOnce(socket) {
  if (eventsWired) return
  eventsWired = true
  // ... register all server→store event handlers ...
}
```
This ensures event listeners are registered exactly once, not re-attached on every hook mount. On Socket.io reconnect, the `connect` event handler re-joins the current room to restore the seat.

**Socket.io client import**: Dynamically imported inside `connectRealtime()` (`const { io } = await import("socket.io-client")`) so it stays out of the SSR bundle and is code-split (only loaded when a user actually starts a battle).

#### 12.4 Two-Channel Notification Pattern

Class-battle invites reach students via **two independent channels**, covering both connected and non-connected users:

| Channel | Mechanism | Latency | Coverage |
|---------|-----------|---------|----------|
| **Socket event** | `class_battle_available` emitted to connected classmates in the same class | Real-time (<100ms) | Students currently on the web app with an active WebSocket |
| **HTTP poll** | `ClassBattlePoller` component (mounted in root layout) fetches `/api/battle/pending-class-invites` from the realtime server every 60s via `fetch()` | 60s max | **All** students (no WebSocket needed), works on any page |

**Design notes**:
- The poll endpoint is a **raw HTTP route** on the realtime server (not Socket.io), authenticated by the same HMAC ticket passed as a query parameter.
- The `ClassBattlePoller` is mounted in `RootLayout` (outside the page router) so it lives across all SPA navigations.
- The poll updates `pendingClassBattleInvites` in the battle store, which drives the **bell badge count** in `Header.tsx` (alongside pending shares and review list shares).
- Clicking the bell when class-battle invites exist opens `ClassBattleInviteDialog` with room code, copy-button, and instructions.
- The poller is **student-only** (early return for non-students).

#### 12.5 Persistent Toast Lifecycle

Class-battle invite toasts use `duration: Infinity` and are managed programmatically:

- **Show**: On first discovery via poll, `toast(invite.roomCode, { id: invite.roomCode, duration: Infinity })`.
- **Dismiss**: When the student joins the room (`useBattleStore.subscribe` watches `roomCode`) or the room is destroyed/starts (the invite disappears from the poll response).
- **Idempotency**: A `useRef<Set<string>>` tracks which room codes currently have active toasts, preventing duplicates.
- **Poll-driven cleanup**: On each poll cycle, invites that vanished from the response are dismissed.

This is different from typical auto-dismiss toasts and requires explicit lifecycle management.

#### 12.6 Grace-Based Reconnection for Realtime

The realtime server distinguishes **new joiners** from **reconnecting members**:

| Type | When allowed | Behavior |
|------|-------------|----------|
| **New joiner** | Lobby only | Must enter via room code; subject to class-membership check; triggers `player_joined` event |
| **Reconnecting member** | Any game phase (lobby/countdown/playing/finished) | Re-binds the player's existing seat; skips membership check; no `player_joined` event — just fresh `room:state` |

Implementation in `server.ts`:
```ts
const existingMember = room.players.get(user.userId);
if (!existingMember && room.status !== "lobby") {
  return emitRoomError(socket, "room_not_in_lobby", "That battle has already started");
}
```

**Disconnect handling**:
- On socket `disconnect`, the player is marked `status: "disconnected"` and a 15-second grace timer starts (`config.reconnectGraceMs`).
- If the player reconnects within grace (Socket.io's reconnection loop fires a new `room:join`), the seat is restored.
- If grace expires and the player is still disconnected, they are removed from the room.
- If an in-progress game drops below 2 present players, the game is cancelled back to lobby.

#### 12.7 Authoritative Server Scoring

The game engine is **server-authoritative** for all scoring. Clients only report their typed answer + hint usage count; the server judges correctness and computes points:

```ts
// Server clock is authoritative — ignore the client's submittedAt for scoring
const result = scoreAnswer({
  correct,
  timed: room.config.timed,
  durationMs,
  timeTakenMs: Date.now() - room.wordStartedAt,  // server clock
  hintsUsed: payload.hintsUsed,
  oldStreak: player.streak,
});
```

Scoring formula (from `realtime/src/game/scoring.ts`, ported verbatim from the solo spelling game so scores are comparable):
- Base 100 points for a correct answer
- Speed bonus: `floor(remainingTimeFraction * 50)` if timed (0–50)
- Streak bonus: +10% per streak level beyond 2, capped at +50% (streaks of 3–7)
- Hint penalty: -10 per hint used
- Floor: minimum 10 points per correct answer

The per-word time limit and between-word pause are defined as constants at module scope and are not overridable per-room:

| Difficulty | Word duration | Grace | Between-word pause |
|-----------|--------------|-------|-------------------|
| Easy | 30s | 500ms | 1.5s |
| Medium | 20s | 500ms | 1.5s |
| Hard | 12s | 500ms | 1.5s |

#### 12.8 CORS for Mixed-Protocol Servers

The realtime server serves two protocol layers on the same HTTP server:
- **Socket.io (Engine.IO)**: CORS configured via `io.cors` — applies to WebSocket upgrade and long-polling transport.
- **Raw HTTP routes** (`/health`, `/api/battle/pending-class-invites`): Need **explicit CORS headers** via `setCorsHeaders()` because browser `fetch()` calls use a separate CORS handshake from the Socket.io connection.

```ts
function setCorsHeaders(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin;
  if (origin && config.corsOrigin.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Vary", "Origin");
  }
}
```

This was missed in v2.902 and hotfixed in v2.906 — without it, browser `fetch()` calls to the raw HTTP endpoints fail with CORS errors in production.

#### 12.9 CI/CD for Multi-Image Releases

The GitHub Actions workflow (`ghcr.yml`) builds and publishes **two separate Docker images** in parallel jobs:

| Image | Context | Tags | Purpose |
|-------|---------|------|---------|
| `ghcr.io/owner/repo` | `.` (app root) | `main`, `dev`, `v*` | Next.js app |
| `ghcr.io/owner/repo-realtime` | `./realtime` | `main`, `dev`, `v*` | Socket.io server |

Both images are pushed to the same container registry with a `-realtime` suffix for the second. Each has its own metadata step, build step, and artifact attestation step. Jobs are fully independent (no `needs` dependency).

#### 12.10 Multi-System Integration Checklist for Realtime Features

Building the multiplayer spelling battle confirmed that the checklist from [Lesson 1](#1-multi-system-integration-checklist) applies to realtime features too. The additional systems touched by a realtime feature:

| System | Files | What to check |
|--------|-------|---------------|
| **Types (mirrored)** | `src/types.d.ts` + `realtime/src/game/types.ts` | Manually mirror all shared types; add sync comment |
| **Store (non-persisted)** | `src/store/battle.ts` | Zustand store at module scope, NOT persisted (ephemeral connection state) |
| **Hook** | `src/hooks/useSpellingBattle.ts` | Singleton event-wiring guard (`eventsWired`), connection lifecycle |
| **Socket client** | `src/lib/realtime-client.ts` | Singleton module-level connection, dynamic `socket.io-client` import, auth ticket fetch |
| **Ticket API** | `src/app/api/realtime/ticket/route.ts` | Short-lived HMAC ticket issuance (embeds userId + role + schoolId + classId) |
| **Realtime package** | `realtime/` | Standalone package with own build, Dockerfile, CI pipeline |
| **Docker compose** | `docker-compose.yml` | Add the realtime service alongside postgres and app |
| **Env vars** | `env.tpl`, `realtime/src/config.ts` | `REALTIME_PORT`, `REALTIME_CORS_ORIGIN`, `REALTIME_URL` |
| **CI/CD** | `.github/workflows/ghcr.yml` | Parallel job for `-realtime` image |
| **Root layout** | `src/app/layout.tsx` | Mount `ClassBattlePoller` for cross-page notification polling |
| **Header integration** | `src/components/Internal/Header.tsx` | Bell badge count includes `pendingClassBattleInvites`; about dialog feature cards |
| **Landing page** | `src/components/Auth/landing/FeaturesShowcase.tsx` | Add multiplayer feature entry |
| **I18n** | `src/locales/en-US.json`, `zh-HK.json` | All battle UI strings, error codes, toast messages, about dialog |
| **User manuals** | `public/docs/user-manual-*.html` | Multiplayer spelling battle how-to + class battle section |
| **README/FAQs** | `README.md`, `FAQs.md` | Feature description and Q&A |

#### 12.11 Type Mirroring Pattern

Types between the main app and the realtime package are **manually mirrored** rather than shared via a common package. This avoids adding a monorepo build step or package publishing requirement. The convention:

1. Define all battle types in `src/types.d.ts` (the main app's canonical home).
2. Copy them to `realtime/src/game/types.ts`, adding a comment at the top: `// Mirrored from src/types.d.ts — keep both sides in sync`.
3. Add a comment at the source definition: `// Mirrored in realtime/src/game/types.ts`.

This is manual and error-prone, but keeps each package independently buildable and deployable. If a type mismatch causes a runtime error, the fix is to update both files in the same commit.
