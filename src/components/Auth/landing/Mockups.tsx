"use client";

import { useState } from "react";
import {
  Upload,
  FileText,
  Brain,
  Image as ImageIcon,
  Volume2,
  Trophy,
  BarChart3,
  Sparkles,
  Check,
  Target,
  BookOpen,
  BookText,
  Gamepad2,
  Bot,
  User,
  Send,
  ImagePlus,
  Lightbulb,
  MessageSquareQuote,
} from "lucide-react";

/* ───────────────────────────────────────────────────────────────
   Shared window chrome — gives each mockup a consistent "app" frame
   sitting on the editorial paper.
───────────────────────────────────────────────────────────────── */
function MockupFrame({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-2xl border border-[var(--lp-rule)] bg-[var(--lp-surface)] shadow-[0_24px_60px_-28px_rgba(23,22,26,0.35)] overflow-hidden ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-[var(--lp-rule)] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--lp-rule)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--lp-rule)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--lp-rule)]" />
        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--lp-ink-soft)]">
          {label}
        </span>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

/* Small label used inside mockups */
function Tag({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "accent" | "highlight" }) {
  const tones = {
    muted: "border-[var(--lp-rule)] text-[var(--lp-ink-soft)]",
    accent: "border-[var(--lp-accent)]/40 text-[var(--lp-accent)] bg-[var(--lp-accent)]/5",
    highlight: "border-[var(--lp-highlight)] text-[var(--lp-ink)] bg-[var(--lp-highlight)]/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/* ── 1. HERO — the signature: passage + highlighted word + glossary popover ── */
export function HeroReadingMockup() {
  return (
    <MockupFrame label="Reading · Deep-Sea Wonders">
      <p className="font-display text-lg sm:text-xl leading-relaxed text-[var(--lp-ink)]">
        Deep beneath the surface, currents stir the cold darkness. Here,{" "}
        <span className="lp-marker lp-marker--draw relative whitespace-nowrap font-semibold">
          luminous
          <span className="absolute -top-1 -right-3 h-2 w-2 rounded-full bg-[var(--lp-highlight)] ring-2 ring-[var(--lp-surface)]" />
        </span>{" "}
        creatures drift past one another — their soft glow the only light for
        miles around.
      </p>

      {/* Glossary popover card */}
      <div className="mt-5 rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-paper-2)] p-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-2xl font-semibold text-[var(--lp-ink)]">luminous</span>
          <span className="font-mono text-xs text-[var(--lp-ink-soft)]">lu·mi·nous</span>
          <span className="font-mono text-xs italic text-[var(--lp-ink-soft)]">adjective</span>
          <button
            className="ml-auto inline-flex items-center gap-1 text-xs text-[var(--lp-accent)]"
            aria-hidden
          >
            <Volume2 className="h-3.5 w-3.5" /> Listen
          </button>
        </div>
        <p className="mt-2 text-sm text-[var(--lp-ink)]">
          Full of light; brightly glowing. <span className="text-[var(--lp-ink-soft)]">發光的；明亮的</span>
        </p>
        <p className="mt-1.5 text-sm italic text-[var(--lp-ink-soft)]">
          “The luminous jellyfish pulsed gently in the dark water.”
        </p>
      </div>
    </MockupFrame>
  );
}

/* ── 2. ENCOUNTER — upload / OCR + Text Repository ── */
export function UploadMockup() {
  return (
    <MockupFrame label="Select Text">
      <div className="rounded-xl border-2 border-dashed border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/50 px-4 py-7 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
          <Upload className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm font-semibold text-[var(--lp-ink)]">Drop an image or PDF here</p>
        <p className="text-xs text-[var(--lp-ink-soft)]">or click to select · PNG, JPG, PDF</p>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--lp-ink-soft)]">
            Text Repository
          </span>
          <Tag tone="highlight">DSE ready</Tag>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
            <FileText className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--lp-ink)]">DSE 2023 Paper 1 Part A Text 1</p>
            <p className="truncate text-xs text-[var(--lp-ink-soft)]">Flash Fiction Writing Tips for Short Stories</p>
          </div>
          <span className="shrink-0 rounded-lg bg-[var(--lp-accent)] px-3 py-1.5 text-xs font-semibold text-white">
            Read
          </span>
        </div>
      </div>
    </MockupFrame>
  );
}

/* ── 3. UNDERSTAND — text versions + mind map + AI visualization ── */
const TEXT_VERSIONS = {
  Original:
    "I presented plenty of evidence that recycling was costly and inefficient, but its defenders said that it was unfair to rush to judgment. Noting that the modern recycling movement had really just begun a few years earlier, they predicted it would flourish as the industry matured and the public learned how to recycle properly.",
  Adapted:
    "I gave a lot of proof that recycling cost too much and was not efficient. But people who supported recycling said it was unfair to judge too quickly. They said the modern recycling movement had just started a few years earlier. They predicted it would get better as the industry grew and people learned how to recycle.",
  Simplified:
    "I showed it cost too much. It was not efficient (not working well). Supporters said it was unfair to judge. They said recycling was new. It would get better.",
} as const;

type TextVersion = keyof typeof TEXT_VERSIONS;

export function UnderstandMockup() {
  const [version, setVersion] = useState<TextVersion>("Adapted");
  const tabs: TextVersion[] = ["Original", "Adapted", "Simplified"];
  return (
    <MockupFrame label="Understand">
      <div className="mb-3 inline-flex rounded-lg border border-[var(--lp-rule)] p-0.5 font-mono text-[11px]">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setVersion(t)}
            className={`rounded-md px-3 py-1 transition-colors ${
              version === t
                ? "bg-[var(--lp-accent)] text-white"
                : "text-[var(--lp-ink-soft)] hover:text-[var(--lp-ink)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <p className="text-sm leading-relaxed text-[var(--lp-ink)]">{TEXT_VERSIONS[version]}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {/* mind map */}
        <div className="rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/50 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[var(--lp-ink-soft)]">
            <Brain className="h-3.5 w-3.5" />
            <span className="font-mono text-[10px] uppercase tracking-wider">Mind map</span>
          </div>
          <svg viewBox="0 0 100 56" className="w-full">
            <line x1="50" y1="28" x2="20" y2="12" stroke="var(--lp-rule)" strokeWidth="1" />
            <line x1="50" y1="28" x2="80" y2="12" stroke="var(--lp-rule)" strokeWidth="1" />
            <line x1="50" y1="28" x2="20" y2="44" stroke="var(--lp-rule)" strokeWidth="1" />
            <line x1="50" y1="28" x2="80" y2="44" stroke="var(--lp-rule)" strokeWidth="1" />
            <circle cx="50" cy="28" r="9" fill="var(--lp-accent)" />
            <circle cx="20" cy="12" r="6" fill="var(--lp-highlight)" />
            <circle cx="80" cy="12" r="6" fill="var(--lp-highlight)" />
            <circle cx="20" cy="44" r="6" fill="var(--lp-highlight)" />
            <circle cx="80" cy="44" r="6" fill="var(--lp-highlight)" />
          </svg>
        </div>
        {/* visualization thumbnail */}
        <div className="relative flex flex-col rounded-xl border border-[var(--lp-rule)] bg-gradient-to-br from-[var(--lp-accent)]/15 via-[var(--lp-highlight)]/20 to-transparent p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[var(--lp-ink-soft)]">
            <ImageIcon className="h-3.5 w-3.5" />
            <span className="font-mono text-[10px] uppercase tracking-wider">AI image</span>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <Sparkles className="h-7 w-7 text-[var(--lp-accent)]" />
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

/* ── 3b. AI TUTOR — context-aware reading coach chat ── */
export function AITutorMockup() {
  return (
    <MockupFrame label="AI Tutor">
      {/* messages */}
      <div className="space-y-3">
        {/* user (right) */}
        <div className="flex flex-row-reverse gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white dark:bg-blue-600">
            <User className="h-4 w-4" />
          </span>
          <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-blue-500 px-3 py-2 text-sm text-white dark:bg-blue-600">
            Why do defenders say it’s unfair to rush to judgment?
          </div>
        </div>
        {/* assistant (left) */}
        <div className="flex gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--lp-rule)] bg-[var(--lp-paper-2)] text-[var(--lp-ink-soft)]">
            <Bot className="h-4 w-4" />
          </span>
          <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-[var(--lp-rule)] bg-[var(--lp-paper-2)] px-3 py-2 text-sm leading-relaxed text-[var(--lp-ink)]">
            Good thinking! 🤔 The defenders point out recycling has only{" "}
            <em className="not-italic font-semibold text-[var(--lp-accent)]">just begun</em> — so
            they feel it’s too early to judge. What might happen as the industry{" "}
            <em className="not-italic font-semibold text-[var(--lp-accent)]">matures</em>?
          </div>
        </div>
      </div>

      {/* quick questions + answer help */}
      <div className="mt-3 rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/50 p-2">
        {/* quick questions */}
        <div>
          <p className="mb-1 flex items-center gap-1 text-[9px] text-[var(--lp-ink-soft)]">
            <Lightbulb className="h-2.5 w-2.5" /> Quick Questions:
          </p>
          <div className="flex flex-wrap gap-1">
            {[
              { icon: Lightbulb, label: "Main idea" },
              { icon: BookOpen, label: "Vocab help" },
              { icon: MessageSquareQuote, label: "Explain" },
            ].map((q) => (
              <span
                key={q.label}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2 py-0.5 text-[10px] text-[var(--lp-ink)]"
              >
                <q.icon className="h-2.5 w-2.5" /> {q.label}
              </span>
            ))}
          </div>
        </div>
        {/* answer help */}
        <div className="mt-1.5">
          <p className="mb-1 flex items-center gap-1 text-[9px] text-[var(--lp-ink-soft)]">
            <ImagePlus className="h-2.5 w-2.5" /> Answer Help:
          </p>
          <div className="flex flex-wrap gap-1">
            {["Hint me", "Step-by-step", "Give answer"].map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2 py-0.5 text-[10px] text-[var(--lp-ink)]"
              >
                <ImagePlus className="h-2.5 w-2.5" /> {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* input */}
      <div className="mt-3 flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--lp-rule)] text-[var(--lp-ink-soft)]">
          <ImagePlus className="h-4 w-4" />
        </span>
        <div className="flex-1 rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-paper-2)] px-3 py-2.5 text-xs text-[var(--lp-ink-soft)]">
          Type your question...
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--lp-accent)] text-white">
          <Send className="h-4 w-4" />
        </span>
      </div>
    </MockupFrame>
  );
}

/* ── 4. PRACTICE — flashcard flip + scramble + grammar game ── */
export function PracticeMockup() {
  const [flipped, setFlipped] = useState(false);
  return (
    <MockupFrame label="Practice">
      {/* flashcard header — remaining counter */}
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--lp-ink-soft)]">Flashcards</span>
        <span className="font-mono text-[10px] text-[var(--lp-ink-soft)]">3 / 12 remaining</span>
      </div>

      {/* click-to-flip flashcard */}
      <div className="perspective-1000">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setFlipped((f) => !f)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setFlipped((f) => !f);
            }
          }}
          className={`relative h-64 w-full cursor-pointer transform-style-preserve-3d transition-transform duration-500 ${
            flipped ? "rotate-y-180" : ""
          }`}
        >
          {/* FRONT */}
          <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-paper-2)] p-4 text-center">
            <div className="flex items-center gap-2">
              <span className="font-display text-4xl font-bold text-[var(--lp-ink)]">flourish</span>
              <Volume2 className="h-5 w-5 text-[var(--lp-ink-soft)]" aria-hidden />
            </div>
            <span className="mt-2 font-mono text-xs text-[var(--lp-ink-soft)]">flour·ish</span>
            <span className="mt-2 rounded-full bg-[var(--lp-accent)]/10 px-2.5 py-0.5 text-xs text-[var(--lp-accent)]">
              verb
            </span>
            <span className="mt-4 text-[10px] text-[var(--lp-ink-soft)]">Click to flip</span>
          </div>

          {/* BACK */}
          <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col rounded-xl border border-emerald-300 bg-[var(--lp-surface)] p-3 text-left">
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold text-[var(--lp-ink)]">flourish</span>
              <Volume2 className="h-4 w-4 text-[var(--lp-ink-soft)]" aria-hidden />
            </div>
            <span className="mt-0.5 font-mono text-[10px] text-[var(--lp-ink-soft)]">flour·ish · verb</span>
            <div className="mt-2 space-y-1.5">
              <div className="rounded-lg bg-[var(--lp-paper-2)] p-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--lp-ink-soft)]">
                  English Definition
                </p>
                <p className="text-[11px] leading-snug text-[var(--lp-ink)]">
                  to grow or develop successfully; to thrive
                </p>
              </div>
              <div className="rounded-lg bg-[var(--lp-paper-2)] p-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--lp-ink-soft)]">中文解釋</p>
                <p className="text-[11px] leading-snug text-[var(--lp-ink)]">茁壯成長；繁榮</p>
              </div>
              <div className="rounded-lg bg-[var(--lp-paper-2)] p-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--lp-ink-soft)]">
                  Example 例句
                </p>
                <p className="text-[11px] leading-snug italic text-[var(--lp-ink)]">
                  “They predicted recycling would{" "}
                  <span className="not-italic font-semibold text-[var(--lp-accent)]">flourish</span> as the industry
                  matured.”
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SRS rating buttons — appear when flipped, like the real app */}
      {flipped && (
        <div className="mt-3">
          <p className="mb-1.5 text-center text-[10px] text-[var(--lp-ink-soft)]">How well did you know this?</p>
          <div className="grid grid-cols-4 gap-1.5">
            <span className="rounded-lg border border-rose-300 px-2 py-1.5 text-center text-xs font-semibold text-rose-600">
              Again
            </span>
            <span className="rounded-lg border border-orange-300 px-2 py-1.5 text-center text-xs font-semibold text-orange-600">
              Hard
            </span>
            <span className="rounded-lg border border-blue-300 px-2 py-1.5 text-center text-xs font-semibold text-blue-600">
              Good
            </span>
            <span className="rounded-lg border border-green-300 px-2 py-1.5 text-center text-xs font-semibold text-green-600">
              Easy
            </span>
          </div>
        </div>
      )}

      {/* word scramble — flourish */}
      <div className="mt-3 rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/50 p-3">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[var(--lp-ink-soft)]">
          Word scramble
        </div>
        <p className="text-xs text-[var(--lp-ink)]">to grow or develop successfully; to thrive</p>
        <p className="text-xs text-[var(--lp-ink-soft)]">茁壯成長；繁榮</p>
        {/* blanks — 8 letters to guess */}
        <div className="mt-2.5 flex gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="h-6 w-4 border-b-2 border-[var(--lp-ink-soft)]/50"
              aria-hidden
            />
          ))}
        </div>
        {/* scrambled letter tiles */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["L", "O", "U", "R", "I", "S", "H", "F"].map((ch, i) => (
            <span
              key={i}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] font-display text-sm font-semibold text-[var(--lp-ink)]"
            >
              {ch}
            </span>
          ))}
        </div>
      </div>

      {/* grammar workshop — fill-the-blank from a word bank */}
      <div className="mt-3 rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--lp-ink-soft)]">
              Grammar Workshop
            </span>
            <span className="rounded-full border border-[var(--lp-rule)] px-2 py-0.5 text-[10px] text-[var(--lp-ink-soft)]">
              Present Perfect Tense
            </span>
          </div>
          <span className="font-mono text-[10px] text-[var(--lp-ink-soft)]">3 / 10 · 120 pts</span>
        </div>
        <div className="mb-3 h-1 overflow-hidden rounded-full bg-[var(--lp-rule)]">
          <div className="h-full rounded-full bg-[var(--lp-accent)]" style={{ width: "30%" }} />
        </div>

        {/* sentence with inline slot */}
        <div className="rounded-lg bg-[var(--lp-paper-2)] p-3 text-sm leading-relaxed text-[var(--lp-ink)]">
          She{" "}
          <span className="mx-0.5 inline-flex items-center rounded-md border-2 border-[var(--lp-accent)] bg-[var(--lp-accent)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--lp-accent)]">
            has
          </span>{" "}
          finished her homework.
        </div>

        {/* pattern hint */}
        <p className="mt-2 font-mono text-[10px] text-[var(--lp-ink-soft)]">Pattern: [auxiliary] + [past participle]</p>

        {/* word bank */}
        <div className="mt-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--lp-ink-soft)]">Word Bank</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[
              { w: "had", used: false },
              { w: "was", used: false },
              { w: "is", used: false },
              { w: "has", used: true },
              { w: "did", used: false },
            ].map((c) => (
              <span
                key={c.w}
                className={`rounded-lg border px-2.5 py-1 text-xs ${
                  c.used
                    ? "border-[var(--lp-rule)] bg-[var(--lp-paper-2)] text-[var(--lp-ink-soft)] opacity-40"
                    : "border-[var(--lp-rule)] bg-[var(--lp-surface)] text-[var(--lp-ink)]"
                }`}
              >
                {c.w}
              </span>
            ))}
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

/* ── 5. MASTER — test scorecard + vocabulary + achievements + leaderboard ── */
export function MasterMockup() {
  const skills = [
    { l: "Main idea", v: 90 },
    { l: "Inference", v: 70 },
    { l: "Vocabulary", v: 85 },
  ];
  return (
    <MockupFrame label="Master">
      <div className="grid items-start gap-4 sm:grid-cols-2">
        {/* Column 1 — your stats: scorecard + vocabulary */}
        <div className="flex flex-col gap-4">
          {/* scorecard */}
          <div className="rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/50 p-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-14 w-14 items-center justify-center">
                <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--lp-rule)" strokeWidth="4" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="var(--lp-accent)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="78 100"
                  />
                </svg>
                <span className="absolute font-display text-base font-bold text-[var(--lp-ink)]">8/10</span>
              </div>
              <div>
                <p className="font-display text-sm font-semibold text-[var(--lp-ink)]">Reading test</p>
                <p className="text-xs text-[var(--lp-ink-soft)]">+2 from last time</p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {skills.map((s) => (
                <div key={s.l}>
                  <div className="flex justify-between text-[10px] text-[var(--lp-ink-soft)]">
                    <span>{s.l}</span>
                    <span className="font-mono">{s.v}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--lp-rule)]">
                    <div className="h-full rounded-full bg-[var(--lp-accent)]" style={{ width: `${s.v}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--lp-accent)]/40 bg-[var(--lp-accent)]/5 px-3 py-2 text-xs font-semibold text-[var(--lp-accent)] transition-colors hover:bg-[var(--lp-accent)]/10"
            >
              <Target className="h-3.5 w-3.5" />
              Targeted practice
            </button>
          </div>

          {/* vocabulary */}
          <div className="rounded-xl border border-[var(--lp-rule)] p-3">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[var(--lp-ink-soft)]">
              My vocabulary
            </div>
            {[
              { w: "inefficient", m: 3 },
              { w: "defenders", m: 4 },
              { w: "flourish", m: 5 },
            ].map((row) => (
              <div key={row.w} className="flex items-center justify-between py-1 text-sm">
                <span className="text-[var(--lp-ink)]">{row.w}</span>
                <span className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full ${
                        i < row.m ? "bg-[var(--lp-accent)]" : "bg-[var(--lp-rule)]"
                      }`}
                    />
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2 — rewards & ranking: achievements + leaderboard */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-[var(--lp-rule)] p-3">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[var(--lp-ink-soft)]">
              Achievements
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { icon: BookOpen, label: "Avid Reader", c: "bg-blue-100 text-blue-600" },
                { icon: BookText, label: "Word Collector", c: "bg-green-100 text-green-600" },
                { icon: Gamepad2, label: "Grammar Gamer", c: "bg-amber-100 text-amber-600" },
                { icon: Sparkles, label: "Curious Learner", c: "bg-cyan-100 text-cyan-600" },
              ].map((a) => (
                <div key={a.label} className="flex items-center gap-2">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${a.c}`}>
                    <a.icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-medium leading-tight text-[var(--lp-ink)]">{a.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/50 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[var(--lp-ink-soft)]">
              <Trophy className="h-3.5 w-3.5" />
              <span className="font-mono text-[10px] uppercase tracking-wider">Leaderboard</span>
            </div>
            {[
              { r: 1, n: "Chloe L.", pts: "1,240", you: false },
              { r: 2, n: "You", pts: "1,180", you: true },
              { r: 3, n: "Marcus T.", pts: "1,090", you: false },
              { r: 4, n: "Priya K.", pts: "1,050", you: false },
            ].map((row) => (
              <div
                key={row.r}
                className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${
                  row.you
                    ? "bg-[var(--lp-accent)]/10 font-semibold text-[var(--lp-accent)]"
                    : "text-[var(--lp-ink)]"
                }`}
              >
                <span className="w-4 font-mono text-xs text-[var(--lp-ink-soft)]">{row.r}</span>
                <span className="flex-1">{row.n}</span>
                <span className="font-mono text-xs text-[var(--lp-ink-soft)]">{row.pts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

/* ── 6. CLASSROOMS — teacher dashboard ── */
export function DashboardMockup() {
  const bars = [50, 75, 40, 88, 60, 92, 68];
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const highlight = [1, 3, 5];
  return (
    <MockupFrame label="Teacher Dashboard · Form 3B">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/50 p-4">
          <div className="mb-3 flex items-center justify-between text-[var(--lp-ink-soft)]">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="font-mono text-[10px] uppercase tracking-wider">Daily activity</span>
            </div>
            <span className="font-mono text-[10px]">last 7 days</span>
          </div>
          <div className="relative h-24">
            {/* gridlines */}
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border-t border-dashed border-[var(--lp-rule)]" />
              ))}
            </div>
            {/* bars */}
            <div className="absolute inset-0 flex items-end gap-2">
              {bars.map((b, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t ${
                    highlight.includes(i) ? "bg-[var(--lp-accent)]" : "bg-[var(--lp-accent)]/60"
                  }`}
                  style={{ height: `${b}%` }}
                />
              ))}
            </div>
          </div>
          <div className="mt-1.5 flex gap-2">
            {days.map((d, i) => (
              <span
                key={i}
                className={`flex-1 text-center font-mono text-[9px] ${
                  highlight.includes(i) ? "font-bold text-[var(--lp-accent)]" : "text-[var(--lp-ink-soft)]"
                }`}
              >
                {d}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--lp-rule)] p-3">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[var(--lp-ink-soft)]">
            Students
          </div>
          {[
            { n: "Chloe L.", s: "92%", ok: true },
            { n: "Marcus T.", s: "78%", ok: true },
            { n: "Priya K.", s: "61%", ok: false },
          ].map((st) => (
            <div key={st.n} className="flex items-center justify-between py-1 text-sm">
              <span className="flex items-center gap-2 text-[var(--lp-ink)]">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full ${
                    st.ok ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                  }`}
                >
                  <Check className="h-3 w-3" />
                </span>
                {st.n}
              </span>
              <span className="font-mono text-xs text-[var(--lp-ink-soft)]">{st.s}</span>
            </div>
          ))}
        </div>
      </div>
    </MockupFrame>
  );
}
