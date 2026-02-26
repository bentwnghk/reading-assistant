# AGENTS.md

This document provides essential guidelines and technical references for AI agents (and human developers) working on the **Reading Assistant** repository. Adhere to these patterns to ensure consistency, security, and maintainability.

---

## 🚀 Development Workflow & Commands

The project uses **pnpm** as the primary package manager.

### Core Commands

- **Install Dependencies**: `pnpm install`
- **Development Server**: `pnpm dev` (Runs at `http://localhost:3000` with Turbopack)
- **Build Project**: `npm run build`
- **Static Export**: `npm run build:export` (Generates `out/` directory)
- **Standalone Build**: `npm run build:standalone`
- **Start Production**: `pnpm start`
- **Linting**: `npm run lint`

### Testing

- **Status**: Currently, there are no automated tests in the codebase.
- **Guideline**: If adding tests, use **Vitest** or **Jest** following standard Next.js patterns. Place test files next to the code they test (e.g., `ComponentName.test.tsx`) or in a `__tests__` directory.
- **Single Test**: To run a single test (if added), use `pnpm vitest run path/to/file.test.ts`.

---

## 📂 Project Structure

- `src/app`: Next.js App Router (Pages, API routes, Layouts).
- `src/components`: UI components.
  - `ui/`: Shadcn primitives.
  - `Internal/`: Custom shared components.
  - `ReadingAssistant/`: Feature-specific components for reading assistance.
  - `MagicDown/`: Markdown rendering and editing components.
  - `Provider/`: Context providers (Theme, I18n).
- `src/hooks`: Custom React hooks for business logic and state interaction.
- `src/store`: Zustand stores for global state and persistence.
- `src/utils`: Helper functions and core logic.
- `src/constants`: Application constants (prompts, URLs, locales).
- `src/locales`: I18n translation files (JSON).
- `src/middleware.ts`: Next.js middleware for request handling.

---

## 🎨 Code Style & Conventions

### 1. TypeScript & Types

- **Strict Mode**: `strict: true` is enabled in `tsconfig.json`. Always provide explicit types for function parameters and return values.
- **Global Types**: Core business logic types (e.g., `ReadingSession`, `ReadingTestQuestion`, `GlossaryEntry`) are defined in `src/types.d.ts`. Check this file before creating new interfaces.
- **Explicit Any**: While `@typescript-eslint/no-explicit-any` is currently `off`, avoid `any` unless absolutely necessary for external library compatibility. Prefer `unknown` or specific interfaces.
- **Zod**: Use **Zod** for schema validation, especially for AI response parsing and API request bodies.

### 2. React & Next.js

- **App Router**: This project uses the Next.js App Router.
- **Client Components**: Use `"use client";` at the top of files that require browser APIs or React hooks (state, effects).
- **Dynamic Imports**: Use Next.js `dynamic()` for heavy components or those that rely on browser-only libraries (e.g., `MagicDown`, `Mermaid`).
- **Hooks**: Prefer custom hooks for complex logic (e.g., `useReadingAssistant`, `useAiProvider`).

### 3. Components & UI

- **Shadcn UI**: UI primitives are located in `@/components/ui`. Do not modify them directly; extend them or create wrappers in `src/components/Internal`.
- **Styling**: Use **Tailwind CSS**. Follow mobile-first responsive design patterns.
- **Icons**: Use **lucide-react**.
- **I18n**: All UI strings must use `useTranslation` from `react-i18next`. Use `t("key.path")` for all labels.

### 4. State Management

- **Zustand**: Used for global state and persistence.
- **Persistence**: Most stores use the `persist` middleware (e.g., `useReadingStore` in `src/store/reading.ts`) to save data in `localStorage`.
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

## 🛠 Backend & API Patterns

### 1. Error Handling

- Use the `parseError` utility from `@/utils/error.ts` to standardize error messages.
- In async functions, use `try...catch...finally` to manage loading states and error reporting.

### 2. API Routes

- **AI Provider Proxies**: Located at `src/app/api/ai/*`. These proxy requests to various AI providers (Google, OpenAI, Anthropic, DeepSeek, etc.) to avoid CORS issues and manage keys.
- **Proxying**: The project proxies various AI and search providers via `next.config.ts` rewrites to avoid CORS issues and manage keys.

### 3. Environment Variables

- Refer to `env.tpl` for all available environment variables.
- Critical AI provider variables include `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.
- MCP server configuration: `MCP_AI_PROVIDER`, `MCP_SEARCH_PROVIDER`, `MCP_THINKING_MODEL`, `MCP_TASK_MODEL`.
- Never commit `.env` or `.env.local` files.

---

## 🔒 Security & Safety

- **Secrets**: Do not hardcode API keys or credentials.
- **Sanitization**: Use Zod to sanitize and validate all external inputs (user input, file uploads).
- **Destructive Actions**: Avoid `rm -rf` or history rewriting in git unless explicitly requested.

---

## 🤖 Agent Instructions

- **Read First**: Always read the relevant file and its neighbors before proposing edits.
- **Follow Patterns**: If adding a new component, look at existing components in `src/components/ReadingAssistant/` for reference implementations.
- **Keep it Focused**: Make small, cohesive changes. Avoid unrelated refactors.
- **Validate**: Run `npm run lint` and `npm run build` to ensure your changes don't break the build.
- **Communication**: Summarize what changed, where, and why. Call out tradeoffs, assumptions, and known limitations. If validation could not be run, say so explicitly.
- **Clarity**: Prefer clarity and simplicity over cleverness. Preserve existing behavior unless the task explicitly requires changes.
- **UI Consistency**: Ensure all new UI elements support both light and dark modes using Tailwind `dark:` classes.
