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

- **Dockerfile**: Multi-stage build on `node:18-alpine`, runs `build:standalone`, exposes port 3000.
- **docker-compose.yml**: Two services — `postgres` (PostgreSQL 16 Alpine, port 5432) and `reading-assistant` (port 3000, depends on healthy postgres).
- **Build & Run**: `docker compose up --build`

### CI/CD

- **`.github/workflows/docker.yml`**: Pushes multi-arch (amd64/arm64) Docker image to Docker Hub on `main`/`dev` pushes and `v*` tags.
- **`.github/workflows/ghcr.yml`**: Pushes Docker image to GitHub Container Registry on `main`/`db` pushes and `v*` tags.
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
│   ├── ReadingAssistant/       # Core reading assistance feature components
│   ├── Vocabulary/             # My Vocabulary page components (table, flashcards, quiz, spelling, review lists, export, sharing)
│   ├── MagicDown/              # Markdown rendering and editing components
│   ├── Auth/                   # Authentication UI components
│   ├── Dashboard/              # Student dashboard components
│   ├── TeacherDashboard/       # Teacher dashboard components
│   ├── Leaderboard/            # Leaderboard components
│   ├── Subscription/           # Subscription/billing UI components
│   ├── UserManagement/         # User management components
│   └── Provider/               # Context providers (Theme, I18n)
├── hooks/                      # Custom React hooks for business logic
├── store/                      # Zustand stores (global state, persisted)
├── lib/                        # Server-side data access layer
│   ├── db.ts                   # PostgreSQL connection pool singleton
│   ├── sessions.ts             # Session data access
│   ├── users.ts                # User data access
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
│   ├── subscription.ts         # Subscription data access
│   └── subscription-email.ts   # Subscription email templates
├── templates/                  # Email template files
├── utils/                      # Client/server helper functions
├── constants/                  # Application constants (prompts, URLs, locales)
├── locales/                    # I18n translation files (JSON)
└── types.d.ts                  # Shared TypeScript type definitions
scripts/                        # SQL migrations (init-db.sql + incremental migrations)
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

### 3. Components & UI

- **Shadcn UI**: UI primitives are located in `@/components/ui`. Do not modify them directly; extend them or create wrappers in `src/components/Internal`.
- **Styling**: Use **Tailwind CSS** with the `tailwindcss-animate` and `@tailwindcss/typography` plugins. Follow mobile-first responsive design patterns.
- **Dark Mode**: Uses `darkMode: ["class"]`. Ensure all new UI elements support both light and dark modes using Tailwind `dark:` classes.
- **Icons**: Use **lucide-react**.
- **I18n**: All UI strings must use `useTranslation` from `react-i18next`. Use `t("key.path")` for all labels.

### 4. State Management

- **Zustand**: Used for global client-side state and persistence.
- **Stores**: `reading.ts`, `global.ts`, `setting.ts`, `history.ts`, `achievements.ts`, `vocabulary.ts` — all in `src/store/`.
- **Persistence**: Most stores use the `persist` middleware to save data in `localStorage`.
- **Radash**: Use **radash** utilities for common operations like `pick`, `isString`, `isObject`, etc.

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

- **`src/auth.ts`**: Full server-side config with `PostgresAdapter` (pg Pool, max 20 connections). Session strategy is `database` with 30-day maxAge.
- **`src/auth.config.ts`**: Lightweight Edge-compatible config used by middleware (no pg dependency).
- **`src/middleware.ts`**: Intercepts `/api/:path*` requests. Handles API key injection for AI/search providers and verifies `ACCESS_PASSWORD` via HMAC signature.
- **Roles**: `UserRole` includes `admin`, `teacher`, `student`. Roles are auto-assigned on first sign-in via session callbacks (`ensureUserRole`, `ensureUserSchool`).
- **Session**: Extended to include `user.id` and `user.role` on the client side.

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
- **Categories**: AI provider keys/URLs, search provider keys/URLs, auth (NextAuth + Google OAuth), database (`DATABASE_URL`, `POSTGRES_PASSWORD`), Stripe/billing, email (Mailtrap), access control (`ACCESS_PASSWORD`, `ADMIN_EMAILS`, `SUPER_ADMIN_EMAILS`), MCP server config, feature flags (`NEXT_PUBLIC_DISABLED_AI_PROVIDER`, `NEXT_PUBLIC_DISABLED_SEARCH_PROVIDER`, `NEXT_PUBLIC_MODEL_LIST`).
- **Never commit** `.env` or `.env.local` files.

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

## Security & Safety

- **Secrets**: Do not hardcode API keys or credentials.
- **Sanitization**: Use Zod to sanitize and validate all external inputs (user input, file uploads).
- **API Access**: All AI/search proxy routes are protected by HMAC-signed `ACCESS_PASSWORD` verification in middleware.
- **RBAC**: Role-based access control (admin/teacher/student) is enforced via NextAuth session callbacks and API route checks.
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
