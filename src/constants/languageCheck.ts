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

/**
 * Longest side (px) of a page held in the pre-upload staging tray. Higher than
 * the 2000px upload size so a tight crop of a full-page photo still has enough
 * pixels left; the cropped result is downscaled to the upload size afterwards.
 */
export const LANGUAGE_CHECK_STAGING_MAX_SIDE = 3200;
export const LANGUAGE_CHECK_MAX_ESSAYS = 100;
/** ~2.5 MB base64 per page after downscale is far above the expected ~300 KB. */
export const LANGUAGE_CHECK_MAX_IMAGE_CHARS = 3_500_000;
export const LANGUAGE_CHECK_MAX_TRANSCRIPT_CHARS = 60_000;

/** Essays (scans included) are auto-deleted this many days after upload. */
export const LANGUAGE_CHECK_RETENTION_DAYS = 30;

/**
 * Dead drafts are swept sooner: a `draft` essay with an empty transcript holds
 * nothing but multi-MB scans and no recoverable work — OCR never produced any
 * text (typically blocked at an access gate) or the upload was abandoned
 * mid-flow. Drafts the user typed into keep the full retention window.
 */
export const LANGUAGE_CHECK_DRAFT_RETENTION_DAYS = 7;

// ─── Learn from your mistakes (lessons → practice → quiz) ───────────────────

/** Max categories studied in one learning session (each one is a full unit). */
export const LANGUAGE_CHECK_LEARN_MAX_CATEGORIES = 6;

/** Age used until the learner picks a level (S4 — the Language Check's baseline). */
export const LANGUAGE_CHECK_LEARN_DEFAULT_AGE = 15;
export const LANGUAGE_CHECK_LEARN_MIN_AGE = 8;
export const LANGUAGE_CHECK_LEARN_MAX_AGE = 18;

/**
 * Exercise formats, ordered the way a unit should progress: recognise →
 * controlled production → freer production → proofreading in context.
 */
export const LEARN_EXERCISE_TYPES = [
  "choice",
  "fill-blank",
  "reorder",
  "error-correction",
  "rewrite",
  "compose",
  "proofread",
] as const;

export type LearnExerciseType = (typeof LEARN_EXERCISE_TYPES)[number];

/**
 * Exercise formats that suit each category, most useful first. Spelling is not
 * a word-order task and word-order is not a free-writing task, so each
 * category only gets the formats that genuinely train it. Typed as a Record so
 * adding a category forces a decision here.
 */
export const LEARN_CATEGORY_TYPES: Record<
  LanguageCheckCategory,
  readonly LearnExerciseType[]
> = {
  "subject-verb-agreement": ["fill-blank", "choice", "error-correction", "rewrite", "proofread"],
  tense: ["fill-blank", "choice", "error-correction", "proofread", "rewrite"],
  article: ["choice", "fill-blank", "error-correction", "proofread"],
  "plural-countable": ["choice", "fill-blank", "error-correction", "rewrite"],
  preposition: ["choice", "fill-blank", "error-correction", "proofread"],
  pronoun: ["choice", "fill-blank", "error-correction", "rewrite"],
  "word-form": ["fill-blank", "choice", "error-correction", "rewrite"],
  "word-choice": ["choice", "fill-blank", "rewrite", "error-correction"],
  collocation: ["choice", "fill-blank", "rewrite", "error-correction"],
  register: ["choice", "rewrite", "error-correction", "compose"],
  redundancy: ["choice", "rewrite", "error-correction", "proofread"],
  fragment: ["choice", "error-correction", "rewrite", "compose", "proofread"],
  "run-on": ["choice", "rewrite", "error-correction", "compose", "proofread"],
  "missing-element": ["fill-blank", "error-correction", "reorder", "rewrite"],
  "word-order": ["reorder", "choice", "error-correction", "rewrite"],
  connector: ["choice", "fill-blank", "rewrite", "compose", "proofread"],
  spelling: ["choice", "fill-blank", "error-correction", "proofread"],
  punctuation: ["choice", "error-correction", "rewrite", "proofread"],
  capitalisation: ["choice", "error-correction", "rewrite", "proofread"],
  "unclear-phrasing": ["choice", "rewrite", "compose", "error-correction"],
  chinglish: ["choice", "rewrite", "fill-blank", "compose"],
  concision: ["choice", "rewrite", "compose", "error-correction"],
  "vocabulary-upgrade": ["choice", "fill-blank", "rewrite", "compose"],
};

/**
 * Categories where letter case and punctuation ARE the skill, so answers are
 * compared exactly (every other category ignores case and end punctuation).
 */
export const LEARN_STRICT_CATEGORIES: readonly LanguageCheckCategory[] = [
  "capitalisation",
  "punctuation",
];

/**
 * Teaching scope per category — prompt-only (never shown in the UI). It pins
 * down WHAT a unit teaches so the lesson, exercises and quiz of a category
 * stay on target, and carries the Cantonese/Chinese transfer patterns behind
 * the typical Hong Kong learner error. Typed as a Record so adding a category
 * forces a description here.
 */
export const LEARN_CATEGORY_FOCUS: Record<LanguageCheckCategory, string> = {
  "subject-verb-agreement":
    "The verb must agree with its subject in number: third-person singular -s in the present simple (she goes), is/are, was/were, has/have, 'there is/are', 'each/every/everyone + singular verb', subjects separated from the verb by a phrase. Chinese verbs never change form, so learners drop -s or add it to plural subjects.",
  tense:
    "Choosing and keeping a consistent verb tense/time frame: simple past vs present perfect, past narrative consistency, present simple for facts and routines, future forms, tense after time words (yesterday, since, for, already). Chinese marks time with words, not verb forms, so learners leave verbs in the base form or shift tense mid-paragraph.",
  article:
    "a / an / the / no article: first vs second mention, specific vs general reference, uncountable and plural nouns with no article, fixed phrases (in hospital, at school, the sun). Chinese has no articles, so learners omit them or overuse 'the'.",
  "plural-countable":
    "Plural -s/-es and irregular plurals (children, people), countable vs uncountable nouns (information, advice, homework, equipment, furniture never take -s or 'a'), quantifiers (much/many, a few/a little, fewer/less). Chinese nouns do not inflect for number.",
  preposition:
    "Prepositions of time and place (in/on/at), dependent prepositions after verbs/adjectives/nouns (depend on, interested in, discuss [no preposition], arrive in/at, good at), and unnecessary prepositions. Prepositions are learnt as chunks; direct translation from Chinese misleads.",
  pronoun:
    "Pronoun case (I/me, he/him, who/whom), agreement with the noun they replace, clear reference (what does 'it/this/they' point to), consistent person (not switching you/we/they), reflexive pronouns, possessives (its vs it's, their/there).",
  "word-form":
    "Using the right part of speech and derivation: noun/verb/adjective/adverb forms (success/succeed/successful/successfully, decide/decision), -ing vs -ed adjectives (bored/boring), verb patterns (verb + -ing vs to-infinitive), comparatives and superlatives.",
  "word-choice":
    "Choosing the word whose meaning really fits: commonly confused words (borrow/lend, say/tell, look/see/watch, hear/listen, make/do, economic/economical, affect/effect), near-synonyms with different usage.",
  collocation:
    "Words that naturally go together in English: verb + noun (make a decision, do homework, take a photo, have a look), adjective + noun (heavy rain, strong tea), and set phrases. Learners translate word by word from Chinese, producing combinations that no English speaker uses.",
  register:
    "Matching formality to the task: avoiding contractions, slang, text-speak, chatty fillers and phrasal verbs in formal writing (letters, proposals, reports, essays), and using suitable formal alternatives. Also keeping a consistent register within one text.",
  redundancy:
    "Cutting words that repeat meaning: 'return back', 'repeat again', 'in my opinion I think', 'more and more increasing', 'each and every', double subjects ('my teacher he'), double connectors ('Although ... but ...', 'Because ... so ...').",
  fragment:
    "A sentence needs a subject and a finite verb and must express a complete thought. Fixing fragments: dependent clauses standing alone (Because I was tired.), missing finite verb (-ing phrase on its own), and attaching or completing them.",
  "run-on":
    "Joining independent clauses correctly: comma splices and fused sentences. Fixes: full stop, semicolon, comma + coordinating conjunction (FANBOYS), or subordination (although, because, which). Chinese allows comma-chains of clauses, so learners join sentences with commas.",
  "missing-element":
    "Every English clause needs an explicit subject and a verb: dummy subjects 'it/there' (It is raining; There are three reasons), the linking verb 'be' before adjectives and nouns (She is tall — Chinese says 'she very tall'), auxiliary verbs in questions/negatives, and missing objects.",
  "word-order":
    "Standard English word order: Subject-Verb-Object, adverb/adverbial placement (frequency adverbs before the main verb, time/place order), adjective order, question word order (inversion with auxiliaries; no inversion in embedded questions), and indirect questions. Chinese word order differs (time before verb, question words in place).",
  connector:
    "Linking ideas logically: addition (moreover, in addition), contrast (however, although, whereas), cause/result (because, therefore, as a result), sequence (firstly, finally), exemplification; correct position and punctuation of connectors; avoiding weak/overused 'and', 'but', 'so' chains; matching the logical relation.",
  spelling:
    "Accurate spelling of common words: doubled consonants (beginning, stopped), silent letters, ie/ei, -able/-ible, homophones (their/there, to/too, its/it's), plurals and -ing/-ed spelling rules, and frequently misspelt words (receive, necessary, separate, definitely). Teach memorisation strategies (syllable chunking, mnemonics, look-cover-write-check).",
  punctuation:
    "Commas (lists, after introductory phrases, before coordinating conjunctions, around non-essential clauses), full stops, question/exclamation marks, apostrophes (possession vs contraction), colons/semicolons, quotation marks. Case sensitivity: answers must match the punctuation exactly.",
  capitalisation:
    "Capital letters for sentence starts, the pronoun I, proper nouns (names, places, nationalities, languages, days, months, titles), and titles; NOT for common nouns, seasons or school subjects other than languages. Case sensitivity: answers must match capital letters exactly.",
  "unclear-phrasing":
    "Writing so a reader understands on first reading: vague words (thing, something, people), ambiguous reference, over-long tangled sentences, misplaced modifiers, and fixing by naming the exact idea, shortening and re-ordering.",
  chinglish:
    "Literal translation from Chinese that sounds unnatural (open the light, learn knowledge, give me a deep impression, I very like it, according to my opinion, have a good time to play, add oil). Teach 'English says X, not Y' by showing the natural English expression and the Chinese pattern behind the mistake.",
  concision:
    "Saying the same thing in fewer, stronger words: delete padding (due to the fact that → because; in order to → to), turn noun phrases into verbs, remove repeated ideas, and replace wordy lead-ins. The meaning must stay identical.",
  "vocabulary-upgrade":
    "Replacing plain or vague words (good, bad, very important, a lot of, get, thing, big problem) with precise, higher-register vocabulary an S4–S6 writer can use correctly (beneficial, detrimental, crucial, numerous, obtain, issue, serious). Teach nuance, collocation and register of the new word, not just a synonym list.",
};

// ─── Learn from your mistakes: persistence, activity log & dashboards ───────

/** Quiz percentage from which a topic counts as secure / developing (else needs review). */
export const LANGUAGE_CHECK_LEARN_MASTERY_SECURE = 80;
export const LANGUAGE_CHECK_LEARN_MASTERY_DEVELOPING = 50;

/** Learning sessions kept per user; starting another one needs a delete first. */
export const LANGUAGE_CHECK_LEARN_MAX_SESSIONS = 50;

/** Consecutive learning events further apart than this are not counted as time on task. */
export const LANGUAGE_CHECK_LEARN_ACTIVE_GAP_SECONDS = 300;

/** Dashboard time windows in days (0 = all time). */
export const LANGUAGE_CHECK_LEARN_RANGES = [0, 7, 30, 90] as const;

/**
 * Activity-log event types for the learning page, stored as plain text in
 * `language_check_learn_events.type` (no SQL CHECK on purpose: a drifted list
 * would fail the whole save, so the Zod enums derived from these arrays are the
 * single gate — AGENTS §M).
 *
 * Almost every event is DERIVED SERVER-SIDE from the content/results the
 * browser saves (a lesson appears, an answer is recorded, a quiz round
 * completes…), so a replayed or duplicated save can never double-count and a
 * score can never be typed in by the client. The browser only reports what the
 * server cannot see.
 */
export const LANGUAGE_CHECK_LEARN_CLIENT_EVENT_TYPES = [
  "session_resumed",
  "summary_viewed",
  "generation_failed",
] as const;

export const LANGUAGE_CHECK_LEARN_EVENT_TYPES = [
  "session_started",
  "session_resumed",
  "lesson_generated",
  "lesson_viewed",
  "practice_generated",
  "practice_answered",
  "practice_revealed",
  "practice_completed",
  "quiz_generated",
  "quiz_answered",
  "quiz_completed",
  "quiz_retaken",
  "summary_viewed",
  "session_completed",
  "session_deleted",
  "generation_failed",
] as const;

export type LanguageCheckLearnEventType =
  (typeof LANGUAGE_CHECK_LEARN_EVENT_TYPES)[number];
export type LanguageCheckLearnClientEventType =
  (typeof LANGUAGE_CHECK_LEARN_CLIENT_EVENT_TYPES)[number];
