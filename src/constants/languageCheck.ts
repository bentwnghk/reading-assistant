/**
 * Canonical error taxonomy for the Language Check feature.
 *
 * Tuned to common HK ESL/EFL error patterns and mapped onto the HKDSE English
 * Writing "Language" domain (grammar & sentence structures, vocabulary,
 * spelling/punctuation, register). The Zod enum (API + AI response), colour
 * map, i18n labels and legend ALL derive from this single list — never retype
 * it as a literal elsewhere.
 *
 * Two tiers share the one list: clear errors (grammar, mechanics, wrong words)
 * and an "expression" tier (group "expression", see `isExpressionCategory`) for
 * text that is grammatical but unclear, unnatural, Chinglish, wordy or
 * improvable.
 */
export const LANGUAGE_CHECK_CATEGORIES = [
  "subject-verb-agreement",
  "tense",
  "article",
  "plural-countable",
  "preposition",
  "pronoun",
  "word-form",
  "word-choice",
  "collocation",
  "register",
  "redundancy",
  "fragment",
  "run-on",
  "missing-element",
  "word-order",
  "connector",
  "spelling",
  "punctuation",
  "capitalisation",
  // Expression tier — grammatical, but unclear / unnatural / improvable.
  "unclear-phrasing",
  "chinglish",
  "concision",
  "vocabulary-upgrade",
] as const;

export type LanguageCheckCategory = (typeof LANGUAGE_CHECK_CATEGORIES)[number];

export type LanguageCheckGroup =
  | "grammar"
  | "vocabulary"
  | "structure"
  | "mechanics"
  | "expression";

export const LANGUAGE_CHECK_CATEGORY_GROUP: Record<
  LanguageCheckCategory,
  LanguageCheckGroup
> = {
  "subject-verb-agreement": "grammar",
  tense: "grammar",
  article: "grammar",
  "plural-countable": "grammar",
  preposition: "grammar",
  pronoun: "grammar",
  "word-form": "grammar",
  "word-choice": "vocabulary",
  collocation: "vocabulary",
  register: "vocabulary",
  redundancy: "vocabulary",
  fragment: "structure",
  "run-on": "structure",
  "missing-element": "structure",
  "word-order": "structure",
  connector: "structure",
  spelling: "mechanics",
  punctuation: "mechanics",
  capitalisation: "mechanics",
  "unclear-phrasing": "expression",
  chinglish: "expression",
  concision: "expression",
  "vocabulary-upgrade": "expression",
};

/**
 * Expression-tier categories are suggestions (the text is grammatical), not
 * errors. They are drawn with a dotted underline, listed separately in the
 * legend, and are not part of the "corrected" essay.
 */
export function isExpressionCategory(category: string): boolean {
  return (
    LANGUAGE_CHECK_CATEGORY_GROUP[category as LanguageCheckCategory] ===
    "expression"
  );
}

/** Max alternative phrasings kept per suggestion. */
export const LANGUAGE_CHECK_MAX_ALTERNATIVES = 3;

export interface CategoryStyle {
  /** Inline highlight in the essay text. */
  highlight: string;
  /** Solid chip / badge (category pill, number bubble). */
  badge: string;
  /** Legend dot. */
  dot: string;
  /** Left accent border on correction cards. */
  border: string;
  /** docx hex colour (no #) for the exported underline/marker. */
  hex: string;
}

// Every category gets a unique hue so the legend is unambiguous.
export const LANGUAGE_CHECK_CATEGORY_STYLES: Record<
  LanguageCheckCategory,
  CategoryStyle
> = {
  "subject-verb-agreement": {
    highlight: "bg-red-200 dark:bg-red-900/70 decoration-red-500",
    badge: "bg-red-600 text-white",
    dot: "bg-red-500",
    border: "border-l-red-500",
    hex: "DC2626",
  },
  tense: {
    highlight: "bg-orange-200 dark:bg-orange-900/70 decoration-orange-500",
    badge: "bg-orange-600 text-white",
    dot: "bg-orange-500",
    border: "border-l-orange-500",
    hex: "EA580C",
  },
  article: {
    highlight: "bg-amber-200 dark:bg-amber-900/70 decoration-amber-500",
    badge: "bg-amber-600 text-white",
    dot: "bg-amber-500",
    border: "border-l-amber-500",
    hex: "D97706",
  },
  "plural-countable": {
    highlight: "bg-yellow-200 dark:bg-yellow-800/70 decoration-yellow-500",
    badge: "bg-yellow-600 text-white",
    dot: "bg-yellow-500",
    border: "border-l-yellow-500",
    hex: "CA8A04",
  },
  preposition: {
    highlight: "bg-lime-200 dark:bg-lime-900/70 decoration-lime-500",
    badge: "bg-lime-600 text-white",
    dot: "bg-lime-500",
    border: "border-l-lime-500",
    hex: "65A30D",
  },
  pronoun: {
    highlight: "bg-green-200 dark:bg-green-900/70 decoration-green-500",
    badge: "bg-green-600 text-white",
    dot: "bg-green-500",
    border: "border-l-green-500",
    hex: "16A34A",
  },
  "word-form": {
    highlight: "bg-emerald-200 dark:bg-emerald-900/70 decoration-emerald-500",
    badge: "bg-emerald-600 text-white",
    dot: "bg-emerald-500",
    border: "border-l-emerald-500",
    hex: "059669",
  },
  "word-choice": {
    highlight: "bg-teal-200 dark:bg-teal-900/70 decoration-teal-500",
    badge: "bg-teal-600 text-white",
    dot: "bg-teal-500",
    border: "border-l-teal-500",
    hex: "0D9488",
  },
  collocation: {
    highlight: "bg-cyan-200 dark:bg-cyan-900/70 decoration-cyan-500",
    badge: "bg-cyan-600 text-white",
    dot: "bg-cyan-500",
    border: "border-l-cyan-500",
    hex: "0891B2",
  },
  register: {
    highlight: "bg-sky-200 dark:bg-sky-900/70 decoration-sky-500",
    badge: "bg-sky-600 text-white",
    dot: "bg-sky-500",
    border: "border-l-sky-500",
    hex: "0284C7",
  },
  redundancy: {
    highlight: "bg-blue-200 dark:bg-blue-900/70 decoration-blue-500",
    badge: "bg-blue-600 text-white",
    dot: "bg-blue-500",
    border: "border-l-blue-500",
    hex: "2563EB",
  },
  fragment: {
    highlight: "bg-indigo-200 dark:bg-indigo-900/70 decoration-indigo-500",
    badge: "bg-indigo-600 text-white",
    dot: "bg-indigo-500",
    border: "border-l-indigo-500",
    hex: "4F46E5",
  },
  "run-on": {
    highlight: "bg-violet-200 dark:bg-violet-900/70 decoration-violet-500",
    badge: "bg-violet-600 text-white",
    dot: "bg-violet-500",
    border: "border-l-violet-500",
    hex: "7C3AED",
  },
  "missing-element": {
    highlight: "bg-purple-200 dark:bg-purple-900/70 decoration-purple-500",
    badge: "bg-purple-600 text-white",
    dot: "bg-purple-500",
    border: "border-l-purple-500",
    hex: "9333EA",
  },
  "word-order": {
    highlight: "bg-fuchsia-200 dark:bg-fuchsia-900/70 decoration-fuchsia-500",
    badge: "bg-fuchsia-600 text-white",
    dot: "bg-fuchsia-500",
    border: "border-l-fuchsia-500",
    hex: "C026D3",
  },
  connector: {
    highlight: "bg-pink-200 dark:bg-pink-900/70 decoration-pink-500",
    badge: "bg-pink-600 text-white",
    dot: "bg-pink-500",
    border: "border-l-pink-500",
    hex: "DB2777",
  },
  spelling: {
    highlight: "bg-rose-200 dark:bg-rose-900/70 decoration-rose-500",
    badge: "bg-rose-600 text-white",
    dot: "bg-rose-500",
    border: "border-l-rose-500",
    hex: "E11D48",
  },
  punctuation: {
    highlight: "bg-slate-300 dark:bg-slate-700 decoration-slate-500",
    badge: "bg-slate-600 text-white",
    dot: "bg-slate-500",
    border: "border-l-slate-500",
    hex: "475569",
  },
  capitalisation: {
    highlight: "bg-stone-300 dark:bg-stone-700 decoration-stone-500",
    badge: "bg-stone-600 text-white",
    dot: "bg-stone-500",
    border: "border-l-stone-500",
    hex: "57534E",
  },
  // Expression tier: every Tailwind hue above is taken, so these use bespoke
  // colours (olive, orchid, green, brown) plus a dotted underline so they read
  // as suggestions rather than errors.
  "unclear-phrasing": {
    highlight:
      "bg-[#eef1b4] dark:bg-[#4a4f12] underline decoration-dotted decoration-2 underline-offset-4 decoration-[#a7b620]",
    badge: "bg-[#7f8b18] text-white",
    dot: "bg-[#a7b620]",
    border: "border-l-[#a7b620]",
    hex: "7F8B18",
  },
  chinglish: {
    highlight:
      "bg-[#f7cdee] dark:bg-[#57194c] underline decoration-dotted decoration-2 underline-offset-4 decoration-[#b6209b]",
    badge: "bg-[#8b1876] text-white",
    dot: "bg-[#b6209b]",
    border: "border-l-[#b6209b]",
    hex: "8B1876",
  },
  concision: {
    highlight:
      "bg-[#cfe9c4] dark:bg-[#1f4a18] underline decoration-dotted decoration-2 underline-offset-4 decoration-[#3f9a2c]",
    badge: "bg-[#2f7a20] text-white",
    dot: "bg-[#3f9a2c]",
    border: "border-l-[#3f9a2c]",
    hex: "2F7A20",
  },
  "vocabulary-upgrade": {
    highlight:
      "bg-[#ebd5c0] dark:bg-[#573319] underline decoration-dotted decoration-2 underline-offset-4 decoration-[#b0652b]",
    badge: "bg-[#7c4a2d] text-white",
    dot: "bg-[#b0652b]",
    border: "border-l-[#b0652b]",
    hex: "7C4A2D",
  },
};

/** Fallback style for an unknown category (never expected after Zod parsing). */
export const DEFAULT_CATEGORY_STYLE: CategoryStyle =
  LANGUAGE_CHECK_CATEGORY_STYLES["word-choice"];

export const LANGUAGE_CHECK_STATUSES = [
  "draft",
  "transcribed",
  "checked",
] as const;

export type LanguageCheckStatus = (typeof LANGUAGE_CHECK_STATUSES)[number];

/**
 * Marker the OCR step writes for a word it cannot read. The check prompt is
 * told to ignore it, so the two prompts MUST share this constant.
 */
export const LANGUAGE_CHECK_ILLEGIBLE_MARKER = "[?]";

/** Server-side caps (also enforced client-side for friendlier errors). */
export const LANGUAGE_CHECK_MAX_PAGES = 10;
export const LANGUAGE_CHECK_MAX_ESSAYS = 100;
/** ~2.5 MB base64 per page after downscale is far above the expected ~300 KB. */
export const LANGUAGE_CHECK_MAX_IMAGE_CHARS = 3_500_000;
export const LANGUAGE_CHECK_MAX_TRANSCRIPT_CHARS = 60_000;

/** Essays (scans included) are auto-deleted this many days after upload. */
export const LANGUAGE_CHECK_RETENTION_DAYS = 30;
