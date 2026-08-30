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
- **Type Checking**: `npm run typecheck` (runs `tsc --noEmit`)

### Testing

- **App**: No automated tests in the main Next.js app currently.
- **Realtime package**: The `realtime/` package has **Vitest** unit tests (`scoring.test.ts`, `words.test.ts`). Run from `realtime/` with `npm test`.
- **Guideline**: If adding tests to the app, use **Vitest** or **Jest** following standard Next.js patterns. Place test files next to the code they test (e.g., `ComponentName.test.tsx`) or in a `__tests__` directory.

### Docker

- **Main app Dockerfile**: Multi-stage build on `node:20-alpine`, runs `build:standalone`, exposes port 3000.
- **Realtime Dockerfile**: Multi-stage build on `node:20-alpine` at `realtime/Dockerfile`, builds TypeScript → JS, exposes port 3001. Uses a 3-stage layout (deps → builder → prod-deps → runner) for a slim final image.
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
│   ├── ReadingAssistant/       # Core reading assistance feature components (43 files — see Reading Assistant Features section)
│   ├── Vocabulary/             # My Vocabulary page components (table, phrases, flashcards, quiz, spelling, review lists, export, sharing)
│   ├── MagicDown/              # Markdown rendering and editing components
│   ├── Auth/                   # Authentication UI components
│   ├── Dashboard/              # Student dashboard components (session sharing dialogs, SkillProfileCard)
│   ├── TeacherDashboard/       # Teacher dashboard components (includes GrammarGameChart)
│   ├── Leaderboard/            # Leaderboard components (weekly + all-time tables, LeaderboardPage)
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
│   ├── assignments.ts          # Assignment CRUD + stripSessionForAssignment (teacher→student)
│   ├── assignment-presets.ts   # Reusable school-wide student-group presets
│   ├── skill-profile.ts        # Comprehension skill-profile snapshot + cross-session rollup
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
│       ├── scoring.ts          # Authoritative scoring + timing constants (per-mode, phrase-aware)
│       ├── scoring.test.ts     # Vitest unit tests for scoring/judging
│       ├── types.ts            # Battle types (mirrored from src/types.d.ts)
│       ├── words.ts            # Word/phrase list resolution + per-mode challenge precompute (enrichWords)
│       └── words.test.ts       # Vitest unit tests for word resolution/enrichment
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
  - `useSpellingBattle` — Multiplayer spelling battle state via the non-persisted `battle` store + singleton Socket.io event wiring
  - `useAutoSave` — Auto-saves reading session to localforage history (skips during streaming; excludes `originalImages`/`visualizationImage` from its dependency array because they are lazy-loaded asynchronously — see Architectural Rules §C below)
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
- **Stores**: `reading.ts`, `global.ts`, `setting.ts`, `history.ts`, `achievements.ts`, `vocabulary.ts`, `sharing.ts`, `assignments.ts`, `battle.ts` — all in `src/store/`.
- **Persistence**: Most stores use the `persist` middleware to save data in `localStorage`. Exceptions: `battle.ts` is **non-persisted** (ephemeral connection state, lives at module scope — see Architectural Rules §A).
- **Radash**: Use **radash** utilities for common operations like `pick`, `isString`, `isObject`, etc.
- **History store lightweight/full split**: The `src/store/history.ts` store tracks sessions in two states. `loadFromAPI` populates the array with **lightweight** entries (no `originalImages`/`visualizationImage` — these large base64 payloads are stripped by `getUserSessions()`). The async `loadFull(id)` method fetches the complete session (including media) on demand via `/api/sessions/[id]`, deduplicates concurrent fetches, and merges via `hydrate(id, data)`. A module-level `hydratedSessionIds` Set records which entries already contain full media. Use `loadFull` (not `load`) whenever media fields are needed (restore, download, assignment snapshots); use `load` only for synchronous reads of already-present text fields. See Architectural Rules §C below.
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
- **`assignments/*`**: Teacher assignments CRUD, student submissions, view, overdue count, and reusable student-group presets (`/presets`).
- **`skill-profile/*`**: Comprehension skill-profile snapshot (per-session + cross-session rollup).
- **`realtime/*`**: HMAC ticket issuance for the standalone Socket.io server (`/realtime/ticket`).

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

- **`user_vocabulary`**: Per-user word bank. Columns: `user_id`, `word` (unique per user), `entry_type` (`'word'` | `'phrase'`, default `'word'` — drives the Words vs. Phrases tab split), `syllabification`, `part_of_speech`, `english_definition`, `chinese_definition`, `example`, `source_session_ids` (JSONB), `shared_by` (FK to `users.id`, NULL = "own"), `srs_counts` (JSONB `{"hard":N,"medium":N}`), `rating` (derived: easy/hard/medium), `mastery_level` (0-5), `review_count`, `correct_count`, `last_reviewed_at`, `next_review_at`.
- **`vocabulary_review_sessions`**: Review session history. Columns: `id`, `user_id`, `mode` (flashcard/quiz/spelling), `entry_type` (`'word'` | `'phrase'` — review sessions are type-scoped so phrases get their own queue), `word_count`, `correct_count`, `rating_counts` (JSONB `{"again":N,"hard":N,"good":N,"easy":N}`), `results` (JSONB array), `created_at`.
- **`review_lists`**: Named word lists. Columns: `id`, `name`, `words` (JSONB array of `ReviewListWord`), `word_count`, `created_by`, `created_at`, `updated_at`.
- **`shared_review_lists`**: Pending/accepted/rejected review list shares. Columns: `id`, `sender_id`, `recipient_id`, `review_list_id`, `review_list_name`, `word_count`, `status`, `created_at`, `updated_at`.

### Migrations (apply in order)

1. `scripts/add-user-vocabulary.sql` — creates `user_vocabulary` table
2. `scripts/add-vocabulary-shared-by.sql` — adds `shared_by` column
3. `scripts/add-vocabulary-review-sessions.sql` — creates `vocabulary_review_sessions` table
4. `scripts/add-review-lists.sql` — creates `review_lists` and `shared_review_lists` tables
5. `scripts/add-review-session-rating-counts.sql` — adds `rating_counts` JSONB + `rating` TEXT
6. `scripts/add-srs-counts.sql` — adds `srs_counts` JSONB to `user_vocabulary`
7. `scripts/add-phrases.sql` — adds `entry_type` to `user_vocabulary`/`vocabulary_review_sessions` + `collocations` columns on `reading_sessions`
8. `scripts/migrate-multi-word-to-phrases.sql` — reclassifies legacy multi-word entries (containing a space) from `'word'` to `'phrase'`; hyphenated compounds stay `'word'`
9. `scripts/backfill-user-vocabulary.sql` — backfills words from existing sessions

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
| `VocabularyContainer.tsx` | Main container — tabs (Table, Phrases, Flashcards, Quiz, Spelling, Review Lists, History), stats cards, word/phrase selection |
| `VocabularyTable.tsx` | Sortable/filterable word table with source column, bulk selection, review list filtering |
| `PhrasesTab.tsx` | Phrase table (filters `user_vocabulary` by `entry_type='phrase'`), pronunciation playback, syllable display |
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
- **Phrases**: `entry_type` is set automatically on sync — multi-word entries (lowercased word contains whitespace) become `'phrase'`; hyphenated compounds (e.g. `well-known`) stay `'word'`. On upsert, `'phrase'` is sticky: once a row is a phrase (or the new row is a phrase) it stays a phrase. Flashcard/spelling/quiz are unified across words and phrases; review sessions and queues are **type-scoped** so phrases never mix into the word queue.

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
| Pre-Reading | `PreReading.tsx` | AI-generated scaffolding (activation prompts, prediction, purpose, pre-teach words, background note); captures the student's prediction |
| Summary | `Summary.tsx` | AI-generated text summary |
| Adapted Text | `AdaptedText.tsx` | AI-simplified version of the text; includes sentence-by-sentence **read-along** (TTS + highlight) and Sentence Analysis |
| Mind Map | `MindMap.tsx` | AI-generated Markdown mind map (rendered via `MagicDown`) |
| Visualization | `Visualization.tsx` | AI-generated image visualization of the text |
| Reading Test | `ReadingTest.tsx` | Multi-type comprehension questions (MC, T/F/NG, short answer, inference, vocab-context, referencing); each question is tagged with a `skillTested` (skill-profile) and `difficultyLevel` |
| Glossary | `Glossary.tsx` | Extracted vocabulary with definitions, syllabification, examples, and SRS rating |
| Collocations | `Collocations.tsx` | AI-extracted chunk-level collocations (pattern, meaning, contrast note, example) stored per-session |
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
| `SectionNavSheet.tsx` (in `Internal/`) | Slide-in section navigation drawer opened from the Header hamburger (home page only) |
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

### Pre-Reading & Collocations (DB columns on `reading_sessions`)

- `pre_reading` (JSONB `PreReadingData`: activation prompts, prediction prompt, purpose, pre-teach words, background note), `pre_reading_generated_at` (BIGINT) — AI scaffolding shown before reading.
- `student_prediction` (TEXT — the student's free-text prediction; **per-user, zeroed on share**), `prediction_rating` (INTEGER — teacher/self rating of the prediction).
- `collocations` (JSONB array of `CollocationChunk`: id, chunk, pattern, meaning, meaningZh, contrastNote, example), `collocations_generated_at` (BIGINT).
- Migrations: `scripts/add-pre-reading.sql`, `scripts/add-skill-profile.sql`, `scripts/add-phrases.sql` (collocations columns).

### Comprehension Skill Profile

Each `ReadingTestQuestion` carries `skillTested: ReadingTestSkill` (`"main-idea" | "detail" | "inference" | "vocabulary" | "purpose"`) and a `difficultyLevel`. When a test completes, a per-session `skill_breakdown` JSONB snapshot is written to `reading_sessions`, and a cross-session rollup is upserted into the `user_skill_profile` table (`{skill: {earned,total,correct,count,sessions}}`, plus `weakest_skill`). The dashboard `SkillProfileCard.tsx` reads the rollup. Data access lives in `src/lib/skill-profile.ts`; API at `/api/skill-profile`.

---

## AI Generation Tracking (`activeGenerations`)

All AI generation loading state is tracked in the reading store via `activeGenerations: Record<string, boolean>`, keyed by `GenerationType`. This replaces the former component-local `useState<ReadingStatus>` and per-component `isGenerating`/`isLoading` flags. The store-level design ensures loading indicators survive SPA navigation (e.g., user navigates to `/leaderboard` mid-generation, returns, and still sees the spinner + disabled button).

### `GenerationType` Values

| Type | Generation Function | Hook or Component |
|------|-------------------|-------------------|
| `"extracting"` | `extractTextFromImage` | Hook |
| `"title"` | `generateTitle` | Hook |
| `"summary"` | `generateSummary` | Hook |
| `"pre-reading"` | `generatePreReading` | Hook |
| `"adapted-text"` | `adaptText` | Hook |
| `"simplified-text"` | `simplifyText` | Hook |
| `"reading-text"` | `generateReadingText` | Hook |
| `"mindmap"` | `generateMindMap` | Hook |
| `"visualization"` | `generateVisualization` | Hook |
| `"reading-test"` | `generateReadingTest` | Hook |
| `"targeted-practice"` | `generateTargetedPractice` | Hook |
| `"glossary"` | `generateGlossary` | Hook |
| `"vocabulary-suggest"` | `suggestVocabulary` | Hook |
| `"collocations"` | `generateCollocations` | Hook |
| `"grammar-topics"` | `analyzeGrammarTopics` | Hook |
| `"grammar-quiz"` | `generateGrammarQuiz` | Hook |
| `"grammar-scramble"` | `generateGrammarScrambleContent` | Hook |
| `"grammar-workshop"` | `generateGrammarWorkshopContent` | Hook |
| `"grammar-surgery"` | `generateErrorSurgeryContent` | Hook |
| `"grammar-questions"` | `generateGrammarQuestions` | Hook (shared by Roulette + Duel) |
| `"grammar-lesson"` | `generateGrammarLesson` | Hook |
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

> **Every score/progress field added to the reading store must also be zeroed here** (or it leaks to students — see Architectural Rules §C). This now includes all grammar-game scores/accuracies/completion counts and `grammarQuiz` per-item `userAnswer`/`earnedPoints`.

---

## Assignments (Teacher → Student)

Teachers can create assignments from a reading session (their own or from the text repository) and assign them to students. Each student receives a **stripped copy** (`stripSessionForAssignment`) with all AI content preserved and every per-student attempt field reset. Students work the assignment; their scores are cached on `assignment_submissions` and surfaced in the teacher dashboard.

### Database Tables

- **`assignments`**: Teacher-created assignments. Columns: `id`, `teacher_id`, `title`, `description`, `subject`, `source_session_id`, `source_doc_title`, `due_date`, `status` (`'active'`|`'archived'`), `student_ids` (JSONB array), `created_at`, `updated_at`.
- **`assignment_submissions`**: Per-student working state. Columns: `id`, `assignment_id` (FK cascade), `student_id`, `student_session_id`, `progress`, cached score columns (`test_score`, `vocabulary_quiz_score`, `spelling_game_best_score`, `grammar_quiz_score`, `grammar_game_best_score`, etc.), `test_completed`, `last_viewed_at`, `submitted_at`, `created_at`.
- **`assignment_presets`**: Reusable, **school-wide** student-group presets. Columns: `id`, `teacher_id` (creator — always an admin/super-admin), `school_id`, `name`, `description`, `student_ids` (JSONB array), `student_count`, `created_at`, `updated_at`. Shared across the school; only admins/super-admins can create/edit/delete — teachers can view and apply them when creating assignments. **Preset members are assignable even when not in the teacher's own classes**: the create-assignment POST carries the applied `presetId`, and `resolveValidStudentIds` unions own-class members with *that one preset's* members (validated to be in the teacher's school). Hand-picking students from presets that were not applied is rejected.

### Key Modules

| Module | Purpose |
|--------|---------|
| `src/lib/assignments.ts` | Assignment CRUD, submission scoring, **`stripSessionForAssignment`** |
| `src/lib/assignment-presets.ts` | Preset CRUD |
| `src/store/assignments.ts` | Client state (active/overdue counts, current assignment) |
| `src/utils/progress.ts` | `calculateProgress` — shared completion proxy used here + dashboards |

### `stripSessionForAssignment` vs `stripUserData`

`stripSessionForAssignment` (in `assignments.ts`) is **forked from** `stripUserData` (`shared-sessions.ts`) but resets **more** state — all grammar-game scores/completion, spelling accuracy, and `studentPrediction`/`predictionRating`. Session sharing leaves grammar/spelling state untouched; assignments reset everything per-student. Keep both stripping functions in sync when adding new score/progress fields (same rule as Architectural Rules §C).

### API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/assignments` | GET, POST | List/create assignments |
| `/api/assignments/[id]` | GET, PATCH, DELETE | Assignment CRUD |
| `/api/assignments/[id]/submissions` | GET | List student submissions |
| `/api/assignments/[id]/view` | GET | Student fetches their stripped working copy |
| `/api/assignments/overdue/count` | GET | Student overdue count (badge) |
| `/api/assignments/targets` | GET | Assignable students (teacher's classes) |
| `/api/assignments/presets` | GET, POST | Preset CRUD |
| `/api/assignments/presets/[id]` | GET, PATCH, DELETE | Single preset |

Activity types added: `assignment_create`, `assignment_start`, `assignment_submit`.

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
| `progress.ts` | `calculateProgress` — shared completion proxy (assignments + dashboards) |
| `sessionMetrics.ts` | Aggregate session metric helpers (e.g. `grammarGameBestScore`) |
| `sentences.ts` | Sentence splitting for read-along / Sentence Analysis |
| `skillProfile.ts` | Comprehension skill-profile helpers (mirrors `src/lib/skill-profile.ts` rollup logic) |
| `tts.ts` | Single Web Audio `AudioContext` TTS engine: `speakWord`, `readAlong`, `unlockAudio` (see Architectural Rules §K) |
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
- **Validate**: Run `npm run lint` and `npm run typecheck` to ensure your changes don't introduce lint errors or type errors. Do not run `npm run build` as part of routine validation — it is slow and redundant with typecheck.
- **Database Changes**: If modifying database schema, create a new SQL migration file in `scripts/` following the existing naming convention. Update the corresponding `src/lib/*.ts` data access module.
- **API Routes**: New API routes should follow existing patterns — use `parseError` for error handling, Zod for input validation, and the `getPool()`/`getClient()` helpers from `src/lib/db.ts` for database access.
- **Communication**: Summarize what changed, where, and why. Call out tradeoffs, assumptions, and known limitations. If validation could not be run, say so explicitly.
- **Clarity**: Prefer clarity and simplicity over cleverness. Preserve existing behavior unless the task explicitly requires changes.
- **UI Consistency**: Ensure all new UI elements support both light and dark modes using Tailwind `dark:` classes.

---

## Architectural Rules & Lessons Learned

Hard-won constraints. Violating each caused real production bugs; the **rule** is what matters, not the history. Apply these when adding features or touching the listed subsystems.

### A. State that spans SPA navigation must live at module/store scope

The reading store is a module-level singleton that survives client-side route changes. Any state whose lifecycle spans component unmount/remount must live there too — **not** in `useState`/`useRef`, which reset when the component unmounts (e.g. on navigating to `/leaderboard` mid-generation):

| Concern | Wrong | Right |
|---|---|---|
| AI generation loading | `useState<ReadingStatus>` in the hook | `activeGenerations` in the reading store (see that section) |
| One-shot side-effect guards ("persist battle results once") | `useRef<boolean>` | Store flag reset on phase change (`resultPersisted` on `battle` store) |
| Realtime socket connection | Created in a hook/component | Singleton in `src/lib/realtime-client.ts`; `battle` store is non-persisted |
| `AudioContext` for TTS | Per-component | Module singleton in `src/utils/tts.ts` |

Component-local state is fine **only** for ephemeral UI (popups, selection, streaming preview) that has no meaning after unmount.

**Converse footgun — cross-page bleed**: because the store survives navigation, `useReadingStore().id` stays set even on `/vocabulary`. Components reused across pages that read a page-specific store field must accept an explicit override prop (e.g. `disableSessionGlossary`) or receive data via props — don't trust the store value on a page it doesn't belong to.

**Lightweight alternative**: for a one-shot UI flag that must reset on full reload but survive navigation and needs no persistence, a module-level boolean + getter/setter (e.g. `isStudyPlanDialogChecked()` in `vocabulary.ts`) is simpler than a store field. Do **not** use this for any user data (scores, progress, settings).

### B. `next/dynamic()` components need a local `<Suspense>` boundary

`next/dynamic(() => import(...))` without a `loading` option suspends on **first** render (the chunk loads). With no local `<Suspense>`, the suspension bubbles to the root `<Suspense fallback={null}>` in `page.tsx` and the **entire page blanks** for ~100–400ms. Symptom signature: "scroll jumps to top / page flashes blank" that happens **only once per page load** (the import promise is cached afterwards).

Always wrap dynamic components (especially `MagicDown`) in a local `<Suspense>`:
```tsx
<Suspense fallback={<LoadingSpinner />}>
  <MagicDown value={...} onChange={...} hideTools />
</Suspense>
```
Note: Radix `onOpenAutoFocus={(e) => e.preventDefault()}` does **not** fix this — that guards a different (focus-driven) scroll issue. Known call sites: `AdaptedText.tsx` (Sentence Analysis dialog — fixed), `Summary.tsx`, `MindMap.tsx`.

### C. Persistence layer — full write AND read path for store fields

A store field is not persisted automatically. When adding one, update **all** of:

| Layer | File | Check |
|---|---|---|
| DB schema | `scripts/init-db.sql` + new migration | Column exists with correct type/constraints |
| Create | `src/lib/sessions.ts` `createReadingSession()` | Column in INSERT list **and** `$N` placeholder in VALUES **and** value in the JS array **and** ON CONFLICT update |
| Update | `src/lib/sessions.ts` `updateReadingSession()` | Field in `fieldMappings` with correct (JSON vs raw) serialization |
| Read | `src/lib/sessions.ts` `getUserReadingSessions()` / `getReadingSession()` | Mapped from `row.column` with a fallback default |

**SQL INSERT sync**: when editing a hand-written INSERT, the column list, the `$N` placeholders, and the JS values array must change together — a count mismatch throws `INSERT has more target columns than expressions` at runtime, and the three parts are far apart in the file.

**Read-path mirror — lazy-loaded fields**: `originalImages` and `visualizationImage` are stripped from the list query (`getUserSessions()`) for performance and fetched on demand via `loadFull(id)`. Before stopping eager-load of any column, audit every consumer:
- Anything using `!!row.visualization_image` as a completion proxy must switch to the lightweight proxy that **is** returned — `visualization_generated_at > 0`. Update **every** `calculateProgress` copy: `dashboardMetrics.ts`, `Dashboard/SessionsTab.tsx`, `users.ts` (`getStudentSessions*` must also `SELECT` the timestamp).
- `useAutoSave` must **not** have lazy-loaded media in its dependency array (they arrive async and trigger a clobbering write).
- `AuthProvider`'s background merge is guarded against account switching (`syncedUserIdRef`) and session switching (`store.id !== id`).

Rule of thumb: "If I stop returning this column from the list query, what else reads it?" Answer *before* merging the query change.

**`stripUserData` / `stripSessionForAssignment` for sharing & assignments**: every score/progress/completion field added to the reading store must be zeroed in `stripUserData` (`src/lib/shared-sessions.ts`) **and** `stripSessionForAssignment` (`src/lib/assignments.ts`), or it leaks to students/recipients. JSONB arrays of questions (`grammarQuiz`, `readingTest`) need per-item `userAnswer`/`earnedPoints` stripping, not just a scalar zero. Keep both stripping functions in sync.

### D. Database migration best practices

- Each feature gets its **own** incremental migration (`scripts/add-*.sql`); never edit an already-applied migration. Also update `scripts/init-db.sql` so fresh installs match.
- Adding a value to a `CHECK` constraint (`achievement_type`, `activity_type`): `DROP CONSTRAINT IF EXISTS` then recreate with the **full** list of values.
- Test both paths: incremental migration on an existing DB, and `init-db.sql` on a fresh DB.

### E. Zustand `persist` hydration is async

On first render the store returns defaults, then hydrates from localStorage via `setTimeout`. Any value that drives initial render output (language, theme) must be read from `localStorage.getItem(...)` directly in the first `useLayoutEffect`, not from the store. And when the user changes such a value, write to localStorage explicitly (persist's `setItem` is also async; the next `getItem` won't reflect it until flushed).

### F. Env vars: runtime vs build-time

`NEXT_PUBLIC_*` is inlined at **build time** (changing it needs a rebuild). For per-deployment values (timeouts, limits, toggles, `REALTIME_URL`, `SESSION_IDLE_TIMEOUT_MINUTES`), use server-side env vars (no prefix) exposed via `/api/config`. The Docker image is built once and reused across environments.

### G. AI model settings — reuse lists; changing a default needs only SQL

- **Reuse** existing model lists (`AVAILABLE_MODELS`, `TUTOR_MODELS`, `VISION_MODELS`) for any new model setting. The Settings form schema uses `z.enum(<ARRAY>)`, so it picks up list changes automatically — do **not** hand-maintain a parallel literal. Per-feature lists cause Zod enum mismatch bugs.
- **Changing a default**: update the list + `defaultValues` in `src/store/setting.ts`. Authenticated users load settings from the DB (`user_settings.settings` JSONB) via `loadFromServer` on each sign-in — localStorage is never read for them. So forcing existing users to a new default needs **only** a SQL migration (`jsonb_set` on `user_settings`); a client-side localStorage migration is dead code.

### H. Multi-system integration checklists

A major feature touches many subsystems; missing any one causes runtime errors or silent data inconsistency.

#### H.1 Major reading-assistant feature
Touch all of: types (`types.d.ts`) → store (`reading.ts`) → hook (`useReadingAssistant`) → prompts (`readingPrompts.ts`) → components (`ReadingAssistant/`) + barrel export → `page.tsx` render → workflow (`WorkflowProgress`, `SectionNavSheet`) → session persistence (`sessions.ts`) → DB migration (`scripts/` + `init-db.sql`) → achievements (`achievements.ts` + `AchievementMedal`) → activity logging (`activity.ts`, `activityLogger.ts`) → leaderboard (`leaderboard.ts`, `LeaderboardTable`, `PersonalStatsCard`) → dashboards (`dashboardMetrics.ts`, `OverviewTab`, `SessionsTab`, `teacherDashboardMetrics.ts`, `TeacherDashboard`) → Excel exports (`excelExport.ts`, `teacherDashboardExcel.ts`) → user data (`users.ts`, `StudentDataView`) → settings (`setting.ts`, `Setting.tsx`) → **strip functions** (`stripUserData` + `stripSessionForAssignment` — §C) → **skill-profile** (`skill-profile.ts`, if questions are tagged) → i18n (both locales) → landing page + About dialog.

#### H.2 Realtime feature (additions to H.1)
Types mirrored in `realtime/src/game/types.ts` (sync comment both sides) → non-persisted store (`battle.ts`) → hook with singleton event-wiring guard (`useSpellingBattle`) → socket client (`realtime-client.ts`) → ticket API (`/api/realtime/ticket`) → realtime package build/Dockerfile → `docker-compose.yml` service → env vars (`REALTIME_*`) → CI parallel job (`ghcr.yml`) → `ClassBattlePoller` in root layout → Header bell badge + About dialog → landing page → i18n → user manuals → README/FAQs.

#### H.3 Extending a multiplayer game's modes
Types (both sides) → word resolution (`words.ts` `enrichWords`) → scoring (`scoring.ts` per-mode durations + `judgeAnswer`) → engine (`engine.ts` `actualMode`, `submitAnswer`, `startWord` payload) → room creation (`rooms.ts`, `server.ts`) → lobby UI (mode picker) → arena UI (per-mode rendering + optimistic `checkAnswer`) → poller (`ClassBattlePoller`) → invite dialog → i18n.

### I. Realtime service patterns (`realtime/`)

- **Standalone package**: own `package.json`/`tsconfig`/build/Dockerfile/CI. Main app `tsconfig.json` must `exclude: ["realtime"]`. No imports from `src/` — types are mirrored manually with a sync comment on both sides. Also mirror any **gameplay constants** the client needs for UI (e.g. `MAX_HINTS_PER_WORD`, `HINT_COSTS`).
- **HMAC-ticket auth** (not shared sessions): `/api/realtime/ticket` signs `{userId,name,image,role,schoolId,classId,exp}` with `AUTH_SECRET`; the client fetches a fresh ticket on every connection/reconnect (30s TTL is enough); the server verifies HMAC + exp. Stateless — no DB lookup per connection.
- **Module-scope socket**: singleton in `realtime-client.ts`; `socket.io-client` is dynamically imported inside `connectRealtime()` to keep it out of the SSR bundle. Event wiring uses a module-level `eventsWired` guard (register listeners once).
- **Two-channel notifications**: socket event (real-time, connected users) + HTTP poll (`ClassBattlePoller` in root layout, 60s, all users). Raw HTTP routes need explicit `setCorsHeaders()` — a separate CORS handshake from Engine.IO.
- **Grace-based reconnection**: new joiners only in lobby; reconnecting members re-bind their seat in any phase. On disconnect, mark `disconnected` + 15s grace; a game dropping below 2 present players cancels back to lobby.
- **Authoritative server scoring + input clamping**: the server clock is authoritative; clients send answer + hint count only. **Every client-reported scoring input must be server-clamped** to its valid range (`clampHintsUsed`) before scoring — the client UI is a suggestion, the server is the law.
- **CI/CD**: two parallel jobs publish `ghcr.io/owner/repo` and `.../-realtime`.

### J. Multiplayer game-mechanic rules

- **Per-mode time constants**: when a game supports multiple input mechanics (listen-type vs scramble vs fill-blanks), word durations must be per-mode (`Record<GameMode, Record<Difficulty, number>>`), not global. Scramble needs longer than transcription.
- **Server-precomputed randomness**: in "mixed" mode each word's mode + `blankPositions`/`shuffledLetters` is assigned server-side in `enrichWords()` and stored on `room.canonicalWords`. Never compute randomized per-challenge data on the client.
- **Mode-aware judging (mirrored)**: `judgeAnswer()` on the server must mirror the client's optimistic `checkAnswer()`. fill-blanks compares only the missing letters (no trim); listen-type/scramble compare whole words (normalized).
- **Tie ranking**: equal scores get the same rank (track `prevScore`/`prevCorrect`, increment rank only on change).
- **Scoring balance**: audit the min/max of **every** input (hint count, time, streak). Flat penalties break at the edges and compound mechanics amplify it. The hint policy: `MAX_HINTS_PER_WORD = 3`, escalating `HINT_COSTS = [10, 20, 30]`, and hint-aided correct answers do not advance the streak. Net result: clean correct (100) > hint-aided (40) > wrong (0).

### K. Spelling-game specifics

- **SRS integration is mandatory**: any game/quiz generating word-results needs `onWordResult(word, correct)` → `PATCH /api/vocabulary/word` and `onComplete(results)` → `POST /api/vocabulary/review-sessions`. Without it, play doesn't feed spaced repetition.
- **Phrase-aware**: solo + multiplayer spelling are unified across words and phrases. Phrase answers use multi-word judging (whole-phrase normalized comparison); the realtime `scoring.ts`/`words.ts` resolve phrase challenges server-side. Word sources include glossary, vocabulary (incl. phrases), and review lists.
- **Suppress keyboard suggestions** on recall-testing inputs: `autoComplete="off"`, `autoCorrect="off"`, `autoCapitalize="off"`, `spellCheck={false}`, plus `writingsuggestions="false"` (spread via cast — not in React types). Omit any one and the browser spoils the answer.
- **iOS Safari audio**: `HTMLAudioElement` gesture-blessing is per-element and non-transferable, and `setTimeout`/`await` breaks the gesture chain. Use a single Web Audio `AudioContext` (`src/utils/tts.ts`): `ctx.resume()` once inside a gesture unlocks it for the page lifetime; schedule buffers via `source.start()` afterwards, no further gestures needed. `speakWord()` short-circuits before fetch if not unlocked (don't waste TTS calls). UX: one **persistent pulsing speaker button** (never an ephemeral toast) as the unlock + replay affordance. **Server-paced** features (multiplayer) hit this deterministically; user-paced ones may slip through but are still fragile. Keep exactly one TTS implementation — import from `@/utils/tts`, never fork per feature.
- **Toast action buttons**: persistent toasts (`duration: Infinity`) must carry a navigation action. Use a store flag (`shouldOpenBattle`) to bridge the poller/dialog (runs anywhere) to the flow component (renders only on `/`).

### L. Color & commit hygiene

- **Colors**: audit existing chart/badge/category colors before choosing one for a new feature (`dashboardMetrics.ts`, `teacherDashboardMetrics.ts`, `AchievementMedal.tsx`, landing/About cards). Each feature's chart color must be unique within its chart.
- **Commits**: split major features into independently-buildable commits (data → AI → UI → persistence → metrics → i18n/presentation). A single 1,500-line commit makes bugs hard to isolate and revert.

### M. Derive validation enums from the canonical list — never parallel literals

`/api/activity` once validated `activityType` against a hand-maintained Zod enum that had drifted behind `ActivityType` in `src/lib/activity.ts`. New activity types were POSTed by the client but silently 400-rejected — `logActivity` swallows errors by design (fire-and-forget) — so rows were never inserted, `checkAndUnlockAchievements` never ran, and achievements quietly never unlocked. The same drift had been silently dropping other activity types for a long time. Symptom signature: "feature logs data / unlocks achievements… sometimes nothing happens, no errors anywhere."

- The canonical list is `ACTIVITY_TYPES` in `src/lib/activity.ts`; the route schema uses `z.enum(ACTIVITY_TYPES)`. Adding an activity type = extend that array (+ the SQL CHECK-constraint migration, §D) — nothing else.
- Same rule as §G's model lists, generalized: any `z.enum([...])` over a domain that HAS a canonical array (models, activity types, game modes) must be **derived** (`z.enum(ARRAY)`), never retyped as a literal. Hand-maintained copies drift silently because the failure is a quiet 400 in a fire-and-forget path.
- **Finding every list to update**: when adding a value to a domain enum, grep for an existing sibling value (e.g. `grammar_duel_complete`) — every match is a list/CHECK that enumerates the domain: API Zod schema, TS unions (`lib/activity.ts` + the client mirror in `utils/activityLogger.ts`), SQL CHECK constraints (§D), realtime mirrored types (§I).
- **Nested-schema drift**: Zod **strips** unknown object keys by default — a `details` sub-schema missing fields (`multiplayer`, `opponentCount`, `rank`) doesn't reject the request, it silently deletes the data. When enriching a payload, extend the nested schema too, not just the enum.

### N. One-shot completion effects need a ref guard when deps include function props

A state-watching effect (`if (gameStatus === "completed") …`) whose dep array includes function props (`onComplete`, `onWordResult`) re-runs whenever the parent re-renders with a fresh callback identity — e.g. inline factories in JSX like `onComplete={handleGameComplete("spelling")}` (`Glossary.tsx`). The loop closes on itself: effect calls a store setter → parent re-renders → new callback identity → effect re-runs → … Symptom signature: **React error #185 (max update depth) on game completion + duplicate "Achievement Unlocked!" dialogs + inflated /leaderboard progress** (achievements are COUNT-based over `activity_logs`, and each duplicate `logActivity` POST silently unlocks another milestone). Fixed in `VocabularySpelling.tsx`; the same class was fixed in `VocabularyQuiz.tsx` (v4.11).

- Fix pattern: one-shot ref guard (`completionFiredRef`), reset when leaving the completed state — same pattern as `newBestFiredRef`/`confettiFiredRef`, and it also survives StrictMode double-invoked effects.
- Better still: fire completion side effects from an event handler / a timer-expiry effect, not a state-watching effect; keep completion-effect deps to stable primitives (the grammar games use `[gameStatus]` only).
- Any `logActivity` inside an effect is a duplication risk by construction — it's fire-and-forget, so duplicates never error.
