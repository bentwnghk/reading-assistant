"use client";

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, useInView } from "motion/react";
import {
  Plus,
  Minus,
  Camera,
  Brain,
  BarChart3,
  Highlighter,
  PenTool,
  Volume2,
  MessageCircle,
  MessageSquareText,
  BookOpen,
  Layers,
  Gamepad2,
  ClipboardList,
  Target,
  BookOpenCheck,
  Library,
  ClipboardCheck,
  Medal,
  Trophy,
  Download,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";

const easeOut: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

// Same features, icons, and colors as the About dialog's "Powerful Features"
// grid (header.about.features.*). Titles/descriptions are pulled from i18n.
const FEATURES: { key: string; icon: LucideIcon; color: string }[] = [
  { key: "ocr", icon: Camera, color: "text-blue-500" },
  { key: "visual", icon: Brain, color: "text-purple-500" },
  { key: "visualization", icon: ImageIcon, color: "text-sky-500" },
  { key: "difficulty", icon: BarChart3, color: "text-emerald-500" },
  { key: "cefrHighlight", icon: Highlighter, color: "text-sky-500" },
  { key: "adaptation", icon: PenTool, color: "text-green-500" },
  { key: "tts", icon: Volume2, color: "text-teal-500" },
  { key: "tutor", icon: MessageCircle, color: "text-[var(--lp-accent)]" },
  { key: "sentenceAnalysis", icon: MessageSquareText, color: "text-orange-500" },
  { key: "glossary", icon: BookOpen, color: "text-indigo-500" },
  { key: "flashcard", icon: Layers, color: "text-cyan-500" },
  { key: "spelling", icon: Gamepad2, color: "text-pink-500" },
  { key: "quiz", icon: ClipboardList, color: "text-violet-500" },
  { key: "test", icon: Target, color: "text-red-500" },
  { key: "grammar", icon: BookOpenCheck, color: "text-fuchsia-500" },
  { key: "grammarGames", icon: Gamepad2, color: "text-lime-600 dark:text-lime-400" },
  { key: "vocabularyPage", icon: Library, color: "text-sky-500" },
  { key: "assignments", icon: ClipboardCheck, color: "text-teal-600 dark:text-teal-400" },
  { key: "achievements", icon: Medal, color: "text-amber-500" },
  { key: "leaderboard", icon: Trophy, color: "text-yellow-500" },
  { key: "wordExport", icon: Download, color: "text-rose-500" },
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
              <f.icon className={`mt-0.5 h-4 w-4 shrink-0 ${f.color}`} />
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
