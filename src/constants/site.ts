// Central site configuration consumed by Next.js Metadata API
// (layout.tsx, robots.ts, sitemap.ts, manifest.ts, opengraph-image).
// These run server-side only, so reading non-NEXT_PUBLIC env vars is safe.

export const APP_NAME = "Mr.🆖 ProReader";
export const APP_SHORT_NAME = "ProReader";
export const APP_TITLE_TEMPLATE = "%s - Mr.🆖 ProReader";
export const APP_DEFAULT_TITLE = "Mr.🆖 ProReader";
export const APP_DESCRIPTION =
  "Transform any English reading material into an interactive learning experience! With AI-powered tools, personalized content, and gamified learning, mastering English reading has never been this exciting!";
export const APP_KEYWORDS = [
  "English reading assistant",
  "reading comprehension",
  "AI reading tutor",
  "vocabulary builder",
  "CEFR",
  "ESL",
  "EFL",
  "English learning",
  "spaced repetition",
  "reading practice",
  "grammar games",
  "AI tutor",
  "reading comprehension questions",
  "learn English online",
];

// Resolve the public site URL at runtime. `APP_URL` is the canonical
// server-side env var (see env.tpl / docker-compose AUTH_URL).
export const SITE_URL = (
  process.env.APP_URL ||
  process.env.AUTH_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

// Routes that search engines are allowed to index (everything else is
// auth-gated or app-internal and should be excluded).
export const PUBLIC_ROUTES = [
  "",
  "/privacy-policy",
  "/terms-of-service",
] as const;
