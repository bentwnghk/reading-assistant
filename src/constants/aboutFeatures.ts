/**
 * Single source of truth for the "Powerful Features" cards.
 *
 * Rendered by BOTH the About dialog (src/components/Internal/Header.tsx) and
 * the landing page's FeaturesShowcase (src/components/Auth/landing/
 * FeaturesShowcase.tsx) — the two surfaces must show the same cards in the
 * same order with the same emojis. Add a new card HERE (plus its
 * `header.about.features.<key>.{title,desc}` entries in BOTH
 * src/locales/en-US.json and src/locales/zh-HK.json) and every surface
 * updates together. Never hand-list the cards in a component again.
 */
export const ABOUT_FEATURES = [
  { key: "ocr", emoji: "📷" },
  { key: "aiTextGenerator", emoji: "✨" },
  { key: "preReading", emoji: "🧭" },
  { key: "visual", emoji: "🧠" },
  { key: "visualization", emoji: "🖼️" },
  { key: "difficulty", emoji: "📊" },
  { key: "cefrHighlight", emoji: "🎨" },
  { key: "adaptation", emoji: "✏️" },
  { key: "tts", emoji: "🔊" },
  { key: "tutor", emoji: "🤖" },
  { key: "sentenceAnalysis", emoji: "💬" },
  { key: "glossary", emoji: "📖" },
  { key: "flashcard", emoji: "🃏" },
  { key: "spelling", emoji: "🎮" },
  { key: "multiplayer", emoji: "⚔️" },
  { key: "quiz", emoji: "📋" },
  { key: "test", emoji: "📝" },
  { key: "grammar", emoji: "📐" },
  { key: "grammarGames", emoji: "🎮" },
  { key: "vocabularyPage", emoji: "📚" },
  { key: "assignments", emoji: "📋" },
  { key: "languageCheck", emoji: "🔍" },
  { key: "classReport", emoji: "📊" },
  { key: "achievements", emoji: "🏆" },
  { key: "leaderboard", emoji: "🏅" },
  { key: "wordExport", emoji: "📄" },
] as const;

export type AboutFeatureKey = (typeof ABOUT_FEATURES)[number]["key"];
