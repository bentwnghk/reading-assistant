"use client";

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, useInView } from "motion/react";
import { Plus, Minus } from "lucide-react";

const easeOut: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

// Same features and emojis as the About dialog's "Powerful Features"
// grid (header.about.features.*). Titles/descriptions are pulled from i18n.
const FEATURES: { key: string; emoji: string }[] = [
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
  { key: "achievements", emoji: "🏆" },
  { key: "leaderboard", emoji: "🏅" },
  { key: "wordExport", emoji: "📄" },
];

export function FeaturesShowcase() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
      <motion.div
        ref={ref}
        variants={stagger}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        className="text-center"
      >
        <motion.div variants={fadeUp} className="mb-3">
          <span className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--lp-accent)]">
            {t("landing.features.eyebrow")}
          </span>
        </motion.div>
        <motion.h2
          variants={fadeUp}
          className="font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl"
          style={{ fontVariationSettings: '"SOFT" 50, "WONK" 1' }}
        >
          {t("landing.features.title")}
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[var(--lp-ink-soft)]"
        >
          {t("landing.features.lede")}
        </motion.p>
        <motion.div variants={fadeUp} className="mt-7">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--lp-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--lp-accent)]/20 transition-all hover:-translate-y-0.5 hover:bg-[var(--lp-accent-2)]"
          >
            {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {open ? t("landing.features.hide") : t("landing.features.show")}
          </button>
        </motion.div>
      </motion.div>

      {open && (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.key}
              variants={fadeUp}
              className="flex items-start gap-2.5 rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-3"
            >
              <span className="mt-0.5 text-lg leading-none shrink-0">{f.emoji}</span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--lp-ink)]">
                  {t(`header.about.features.${f.key}.title`)}
                </div>
                <div className="mt-0.5 text-xs leading-snug text-[var(--lp-ink-soft)]">
                  {t(`header.about.features.${f.key}.desc`)}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
}
