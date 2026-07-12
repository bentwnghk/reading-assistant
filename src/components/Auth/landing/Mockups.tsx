"use client";

import { useState, useEffect } from "react";
import {
  Upload,
  Brain,
  Image as ImageIcon,
  Volume2,
  Trophy,
  BarChart3,
  FileDown,
  Sparkles,
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
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Lock,
  CheckCircle2,
  Calendar,
  Users,
  TrendingUp,
  Download,
  Award,
  TriangleAlert,
  BookOpenCheck,
  ClipboardList,
  SpellCheck,
  GraduationCap,
  BookMarked,
  Clock,
  HelpCircle,
  Table as TableIcon,
  ListPlus,
  History,
  Wand2,
  Layers,
  Library,
  Search,
  Globe,
  Building2,
  RotateCcw,
  ChevronDown,
  ChevronsUpDown,
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
        <span className="ml-2 font-mono text-[10px] tracking-[0.18em] text-[var(--lp-ink-soft)]">
          {label}
        </span>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

/* Visibility badge — mirrors the real TextRepository VisibilityBadge (public/school/class) */
function RepoVisBadge({
  visibility,
  label,
}: {
  visibility: "public" | "school" | "class";
  label: string;
}) {
  if (visibility === "public") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--lp-accent)]/40 bg-[var(--lp-accent)]/5 px-2 py-0.5 text-[9px] font-medium text-[var(--lp-accent)]">
        <Globe className="h-2.5 w-2.5" />
        {label}
      </span>
    );
  }
  if (visibility === "school") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--lp-rule)] px-2 py-0.5 text-[9px] font-medium text-[var(--lp-ink-soft)]">
        <Building2 className="h-2.5 w-2.5" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--lp-rule)] bg-[var(--lp-paper-2)] px-2 py-0.5 text-[9px] font-medium text-[var(--lp-ink-soft)]">
      <Users className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

/* ── 1. HERO — the signature: passage + highlighted word + glossary popover ── */
export function HeroReadingMockup() {
  return (
    <MockupFrame label="READING · Mr.🆖 ProReader">
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

/* ── 2. ENCOUNTER — Select Text: three clickable sources ── */
type SourceTab = "upload" | "repository" | "ai";

export function UploadMockup() {
  const [tab, setTab] = useState<SourceTab>("ai");
  const newVocab = ["shimmering", "reluctantly", "horizon", "tide pool"];
  const repoRows = [
    {
      name: "DSE 2023 Paper 1 Part A Text 1",
      sub: "Flash Fiction Writing Tips for Short Stories",
      creator: "Ms. Chan",
      date: "Sep 12",
      visibility: "public" as const,
      visLabel: "Public",
    },
    {
      name: "DSE 2024 Paper 1 Part B2 Text 5",
      sub: "Exposing Flaws in Science and Media",
      creator: "Ms. Wong",
      date: "Sep 8",
      visibility: "public" as const,
      visLabel: "Public",
    },
    {
      name: "DSE 2026 Paper 1 Part B1 Text 2",
      sub: "Grow your YouTube channel with key tips",
      creator: "Mr. Lee",
      date: "Sep 5",
      visibility: "public" as const,
      visLabel: "Public",
    },
  ];
  const tabs: { key: SourceTab; label: string; icon: React.ReactNode }[] = [
    { key: "upload", label: "Upload Image/PDF", icon: <ImageIcon className="h-3 w-3" /> },
    { key: "repository", label: "Text Repository", icon: <Library className="h-3 w-3" /> },
    { key: "ai", label: "AI Generate", icon: <Sparkles className="h-3 w-3" /> },
  ];

  // Auto-cycle the tabs every 2s. Re-runs on every `tab` change (including
  // manual clicks), so each tab gets a full 2s before advancing.
  useEffect(() => {
    const order: SourceTab[] = ["upload", "repository", "ai"];
    const id = setTimeout(() => {
      setTab((cur) => order[(order.indexOf(cur) + 1) % order.length]);
    }, 2000);
    return () => clearTimeout(id);
  }, [tab]);

  return (
    <MockupFrame label="SELECT TEXT · Mr.🆖 ProReader">
      {/* clickable tab strip — three text sources */}
      <div className="flex gap-1 border-b border-[var(--lp-rule)]">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 border-b-2 px-2 py-1.5 text-[10px] font-medium transition-colors ${
              tab === t.key
                ? "-mb-px border-[var(--lp-accent)] text-[var(--lp-accent)]"
                : "border-transparent text-[var(--lp-ink-soft)] hover:text-[var(--lp-ink)]"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Upload Image/PDF tab ── */}
      {tab === "upload" && (
        <div className="mt-3 rounded-xl border-2 border-dashed border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/50 px-4 py-7 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
            <Upload className="h-4.5 w-4.5" />
          </div>
          <p className="mt-2 text-sm font-semibold text-[var(--lp-ink)]">Drop an image or PDF here</p>
          <p className="text-xs text-[var(--lp-ink-soft)]">or click to select · PNG, JPG, PDF</p>
        </div>
      )}

      {/* ── Text Repository tab ── */}
      {tab === "repository" && (
        <div className="mt-3">
          {/* toolbar — search + visibility filter */}
          <div className="mb-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--lp-ink-soft)]" />
              <div className="w-full rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-surface)] py-1.5 pl-8 pr-3 text-[11px] text-[var(--lp-ink-soft)]">
                Search texts…
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2.5 py-1.5 text-[11px] text-[var(--lp-ink-soft)]">
              All <ChevronDown className="h-3 w-3" />
            </div>
          </div>
          {/* table — Name · Read · Creator · Date · Visibility */}
          <div className="overflow-x-auto rounded-xl border border-[var(--lp-rule)]">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/60">
                  <th className="px-3 py-1.5 align-middle font-mono text-[9px] font-medium uppercase tracking-wider text-[var(--lp-ink-soft)]">
                    <span className="flex items-center gap-1">
                      Name <ChevronsUpDown className="h-2.5 w-2.5 opacity-40" />
                    </span>
                  </th>
                  <th className="w-[1%] px-2 py-1.5"></th>
                  <th className="hidden px-3 py-1.5 align-middle font-mono text-[9px] font-medium uppercase tracking-wider text-[var(--lp-ink-soft)] sm:table-cell">
                    <span className="flex items-center gap-1">
                      Creator <ChevronsUpDown className="h-2.5 w-2.5 opacity-40" />
                    </span>
                  </th>
                  <th className="hidden px-3 py-1.5 align-middle font-mono text-[9px] font-medium uppercase tracking-wider text-[var(--lp-ink-soft)] sm:table-cell">
                    <span className="flex items-center gap-1">
                      Date <ChevronDown className="h-2.5 w-2.5" />
                    </span>
                  </th>
                  <th className="px-3 py-1.5 align-middle font-mono text-[9px] font-medium uppercase tracking-wider text-[var(--lp-ink-soft)]">
                    <span className="flex items-center gap-1">
                      Visibility <ChevronsUpDown className="h-2.5 w-2.5 opacity-40" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {repoRows.map((r) => (
                  <tr key={r.name} className="border-t border-[var(--lp-rule)] bg-[var(--lp-surface)]">
                    <td className="px-3 py-2 align-middle">
                      <p className="text-[11px] font-semibold leading-snug text-[var(--lp-ink)]">{r.name}</p>
                      {r.sub && (
                        <p className="mt-0.5 max-w-[180px] truncate text-[10px] text-[var(--lp-ink-soft)]" title={r.sub}>
                          {r.sub}
                        </p>
                      )}
                    </td>
                    <td className="px-2 py-2 align-middle text-right">
                      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--lp-accent)] px-2 py-1 text-[10px] font-semibold text-white">
                        <BookOpen className="h-3 w-3" /> Read
                      </span>
                    </td>
                    <td className="hidden px-3 py-2 align-middle text-[10px] text-[var(--lp-ink-soft)] sm:table-cell">
                      {r.creator}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2 align-middle text-[10px] text-[var(--lp-ink-soft)] sm:table-cell">
                      {r.date}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <RepoVisBadge visibility={r.visibility} label={r.visLabel} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── AI Generate tab ── */}
      {tab === "ai" && (
        <>
          {/* AI Text Generator form card */}
          <div className="mt-3 space-y-3 rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" />
              <span className="font-display text-sm font-semibold text-[var(--lp-ink)]">AI Text Generator</span>
            </div>

            {/* Topic input */}
            <div>
              <span className="text-[9px] uppercase tracking-wide text-[var(--lp-ink-soft)]">Topic / Theme</span>
              <div className="mt-0.5 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/40 px-2 py-1.5 text-[11px] text-[var(--lp-ink)]">
                A day at the beach
              </div>
            </div>

            {/* Description */}
            <div>
              <span className="text-[9px] uppercase tracking-wide text-[var(--lp-ink-soft)]">Further Description (optional)</span>
              <div className="mt-0.5 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/40 px-2 py-1.5 text-[11px] text-[var(--lp-ink-soft)]">
                The main character is a shy 14-year-old; include a surprising ending
              </div>
            </div>

            {/* 3-col row: Text Type · Approx. Length · Level (CEFR) */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[9px] uppercase tracking-wide text-[var(--lp-ink-soft)]">Text Type</span>
                <div className="mt-0.5 flex items-center justify-between rounded-md border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/40 px-2 py-1.5 text-[11px] text-[var(--lp-ink)]">
                  <span>Short story</span>
                  <ChevronDown className="h-3 w-3 text-[var(--lp-ink-soft)]" />
                </div>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wide text-[var(--lp-ink-soft)]">Approx. Length</span>
                <div className="mt-0.5 flex items-center justify-between rounded-md border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/40 px-2 py-1.5 text-[11px] text-[var(--lp-ink)]">
                  <span>≈ 400 words</span>
                  <ChevronDown className="h-3 w-3 text-[var(--lp-ink-soft)]" />
                </div>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wide text-[var(--lp-ink-soft)]">Level (CEFR)</span>
                <div className="mt-0.5 flex items-center justify-between rounded-md border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/40 px-2 py-1.5 text-[11px] text-[var(--lp-ink)]">
                  <span>B1</span>
                  <RotateCcw className="h-3 w-3 text-[var(--lp-ink-soft)]" />
                </div>
              </div>
            </div>

            {/* Generate button */}
            <div className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--lp-accent)] px-3 py-2 text-[11px] font-semibold text-white">
              <Sparkles className="h-3.5 w-3.5" /> Generate Reading Text
            </div>
          </div>

          {/* QC details card (the result) */}
          <div className="mt-3 space-y-2 rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/40 p-3">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-[var(--lp-accent)]" />
              <span className="text-[11px] font-semibold text-[var(--lp-ink)]">Generated Text Details</span>
            </div>
            {/* badges: Words · Est. FK Grade · CEFR (color-coded) · text type */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-[var(--lp-rule)]/60 px-1.5 py-0.5 text-[9px] font-medium text-[var(--lp-ink)]">Words: 248</span>
              <span className="rounded-md bg-[var(--lp-rule)]/60 px-1.5 py-0.5 text-[9px] font-medium text-[var(--lp-ink)]">Est. FK Grade: 6.2</span>
              <span className="rounded-md bg-cyan-100 px-1.5 py-0.5 text-[9px] font-medium text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300">CEFR B1</span>
              <span className="rounded-md border border-[var(--lp-rule)] px-1.5 py-0.5 text-[9px] text-[var(--lp-ink-soft)]">Short story</span>
            </div>
            {/* new vocabulary chips */}
            <div>
              <p className="text-[9px] text-[var(--lp-ink-soft)]">New vocabulary to learn</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {newVocab.map((w) => (
                  <span key={w} className="rounded-md border border-[var(--lp-rule)] px-1.5 py-0.5 text-[9px] text-[var(--lp-ink-soft)]">
                    {w}
                  </span>
                ))}
              </div>
            </div>
            {/* regenerate one CEFR band up/down */}
            <div className="flex gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2 py-1 text-[10px] text-[var(--lp-ink)]">
                <ArrowDown className="h-3 w-3" /> Easier
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2 py-1 text-[10px] text-[var(--lp-ink)]">
                <ArrowUp className="h-3 w-3" /> Harder
              </span>
            </div>
          </div>
        </>
      )}
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
    <MockupFrame label="TEXT ADAPTATION · Mr.🆖 ProReader">
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
          <svg viewBox="0 0 200 130" className="w-full" role="img" aria-label="Mind map: Recycling">
            {/* ── connectors (curved, colored per branch) ── */}
            {/* root → branches */}
            <path d="M 90,57 Q 72,40 83,22" stroke="#26A69A" strokeWidth="1" fill="none" />
            <path d="M 90,73 Q 72,90 83,109" stroke="#42A5F5" strokeWidth="1" fill="none" />
            <path d="M 110,57 Q 128,40 117,22" stroke="#AB47BC" strokeWidth="1" fill="none" />
            <path d="M 110,73 Q 128,90 117,109" stroke="#FFA726" strokeWidth="1" fill="none" />
            {/* branch → leaves */}
            <path d="M 37,18 Q 30,14 32,11" stroke="#26A69A" strokeWidth="0.8" fill="none" />
            <path d="M 37,26 Q 30,30 32,28" stroke="#26A69A" strokeWidth="0.8" fill="none" />
            <path d="M 37,106 Q 30,102 32,101" stroke="#42A5F5" strokeWidth="0.8" fill="none" />
            <path d="M 37,114 Q 30,118 32,119" stroke="#42A5F5" strokeWidth="0.8" fill="none" />
            <path d="M 163,18 Q 170,14 168,11" stroke="#AB47BC" strokeWidth="0.8" fill="none" />
            <path d="M 163,26 Q 170,30 168,28" stroke="#AB47BC" strokeWidth="0.8" fill="none" />
            <path d="M 163,106 Q 170,102 168,101" stroke="#FFA726" strokeWidth="0.8" fill="none" />
            <path d="M 163,114 Q 170,118 168,119" stroke="#FFA726" strokeWidth="0.8" fill="none" />

            {/* ── leaves (lighter tints) ── */}
            {/* left top — teal leaves */}
            <rect x="2" y="6" width="30" height="10" rx="2" fill="#B2DFDB" />
            <text x="17" y="12" textAnchor="middle" dominantBaseline="central" fontSize="4.5" fill="#37474F" style={{ fontFamily: "var(--font-sans), sans-serif" }}>Costly</text>
            <rect x="2" y="23" width="30" height="10" rx="2" fill="#B2DFDB" />
            <text x="17" y="29" textAnchor="middle" dominantBaseline="central" fontSize="4.5" fill="#37474F" style={{ fontFamily: "var(--font-sans), sans-serif" }}>Wasteful</text>
            {/* left bottom — blue leaves */}
            <rect x="2" y="96" width="30" height="10" rx="2" fill="#BBDEFB" />
            <text x="17" y="101" textAnchor="middle" dominantBaseline="central" fontSize="4.5" fill="#37474F" style={{ fontFamily: "var(--font-sans), sans-serif" }}>Early</text>
            <rect x="2" y="114" width="30" height="10" rx="2" fill="#BBDEFB" />
            <text x="17" y="119" textAnchor="middle" dominantBaseline="central" fontSize="4.5" fill="#37474F" style={{ fontFamily: "var(--font-sans), sans-serif" }}>Growing</text>
            {/* right top — purple leaves */}
            <rect x="168" y="6" width="30" height="10" rx="2" fill="#E1BEE7" />
            <text x="183" y="12" textAnchor="middle" dominantBaseline="central" fontSize="4.5" fill="#37474F" style={{ fontFamily: "var(--font-sans), sans-serif" }}>Too soon</text>
            <rect x="168" y="23" width="30" height="10" rx="2" fill="#E1BEE7" />
            <text x="183" y="29" textAnchor="middle" dominantBaseline="central" fontSize="4.5" fill="#37474F" style={{ fontFamily: "var(--font-sans), sans-serif" }}>Promising</text>
            {/* right bottom — amber leaves */}
            <rect x="168" y="96" width="30" height="10" rx="2" fill="#FFE0B2" />
            <text x="183" y="101" textAnchor="middle" dominantBaseline="central" fontSize="4.5" fill="#37474F" style={{ fontFamily: "var(--font-sans), sans-serif" }}>Matures</text>
            <rect x="168" y="114" width="30" height="10" rx="2" fill="#FFE0B2" />
            <text x="183" y="119" textAnchor="middle" dominantBaseline="central" fontSize="4.5" fill="#37474F" style={{ fontFamily: "var(--font-sans), sans-serif" }}>Flourish</text>

            {/* ── branches (medium fills, white text) ── */}
            <rect x="35" y="15" width="48" height="14" rx="3" fill="#26A69A" />
            <text x="59" y="22" textAnchor="middle" dominantBaseline="central" fontSize="5.5" fontWeight="600" fill="white" style={{ fontFamily: "var(--font-sans), sans-serif" }}>Criticism</text>
            <rect x="35" y="102" width="48" height="14" rx="3" fill="#42A5F5" />
            <text x="59" y="109" textAnchor="middle" dominantBaseline="central" fontSize="5.5" fontWeight="600" fill="white" style={{ fontFamily: "var(--font-sans), sans-serif" }}>Growth</text>
            <rect x="117" y="15" width="48" height="14" rx="3" fill="#AB47BC" />
            <text x="141" y="22" textAnchor="middle" dominantBaseline="central" fontSize="5.5" fontWeight="600" fill="white" style={{ fontFamily: "var(--font-sans), sans-serif" }}>Defense</text>
            <rect x="117" y="102" width="48" height="14" rx="3" fill="#FFA726" />
            <text x="141" y="109" textAnchor="middle" dominantBaseline="central" fontSize="5.5" fontWeight="600" fill="white" style={{ fontFamily: "var(--font-sans), sans-serif" }}>Future</text>

            {/* ── root (circle, indigo) ── */}
            <circle cx="100" cy="65" r="14" fill="#5C6BC0" />
            <text x="100" y="66" textAnchor="middle" dominantBaseline="central" fontSize="6.5" fontWeight="700" fill="white" style={{ fontFamily: "var(--font-sans), sans-serif" }}>Recycling</text>
          </svg>
        </div>
        {/* visualization thumbnail — infographic poster */}
        <div className="relative flex flex-col rounded-xl border border-[var(--lp-rule)] bg-gradient-to-br from-[var(--lp-accent)]/15 via-[var(--lp-highlight)]/20 to-transparent p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[var(--lp-ink-soft)]">
            <ImageIcon className="h-3.5 w-3.5" />
            <span className="font-mono text-[10px] uppercase tracking-wider">AI Visualization</span>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <svg
              viewBox="0 0 240 200"
              xmlns="http://www.w3.org/2000/svg"
              className="h-full w-full"
              role="img"
              aria-label="Infographic poster: The recycling movement is ready to flourish"
            >
              <defs>
                <clipPath id="lpPosterClip">
                  <rect width="240" height="200" rx="4" />
                </clipPath>
              </defs>
              <g clipPath="url(#lpPosterClip)">
                {/* ── poster paper ── */}
                <rect width="240" height="200" fill="#FBF8F1" />

                {/* ── top accent bars ── */}
                <rect x="0" y="0" width="240" height="5" fill="#1E3A8A" />
                <rect x="0" y="5" width="240" height="1.5" fill="#F5C842" />

                {/* ── title ── */}
                <text
                  x="120"
                  y="22"
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="900"
                  fill="#17161A"
                  style={{ fontFamily: "var(--font-display), Georgia, serif" }}
                >
                  RECYCLING
                </text>
                <text
                  x="120"
                  y="31"
                  textAnchor="middle"
                  fontSize="5.5"
                  fontWeight="600"
                  letterSpacing="1.5"
                  fill="#5C5751"
                  style={{ fontFamily: "var(--font-mono), monospace" }}
                >
                  A MOVEMENT IN PROGRESS
                </text>
                <line x1="85" y1="36" x2="155" y2="36" stroke="#DCD5C6" strokeWidth="0.8" />
                <circle cx="120" cy="36" r="2" fill="#F5C842" />

                {/* ── debate: critics panel (left) ── */}
                <rect
                  x="14"
                  y="42"
                  width="100"
                  height="46"
                  rx="4"
                  fill="#FEF2F2"
                  stroke="#FCA5A5"
                  strokeWidth="0.5"
                />
                <text
                  x="64"
                  y="51"
                  textAnchor="middle"
                  fontSize="5.5"
                  fontWeight="700"
                  letterSpacing="1"
                  fill="#B91C1C"
                  style={{ fontFamily: "var(--font-mono), monospace" }}
                >
                  CRITICS SAY
                </text>
                {/* down-trend arrows */}
                <g transform="translate(56, 54)" stroke="#DC2626" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M -5,0 L -5,5 M -7,3 L -5,5 L -3,3" />
                  <path d="M 1,0 L 1,7 M -1,5 L 1,7 L 3,5" />
                  <path d="M 7,0 L 7,6 M 5,4 L 7,6 L 9,4" />
                </g>
                <text
                  x="64"
                  y="76"
                  textAnchor="middle"
                  fontSize="7"
                  fontWeight="700"
                  fill="#17161A"
                  style={{ fontFamily: "var(--font-sans), sans-serif" }}
                >
                  &ldquo;Costly&rdquo;
                </text>
                <text
                  x="64"
                  y="84"
                  textAnchor="middle"
                  fontSize="5"
                  fill="#5C5751"
                  style={{ fontFamily: "var(--font-sans), sans-serif" }}
                >
                  inefficient &middot; rush to judge
                </text>

                {/* ── VS badge ── */}
                <circle cx="120" cy="65" r="9" fill="#17161A" />
                <text
                  x="120"
                  y="68"
                  textAnchor="middle"
                  fontSize="7"
                  fontWeight="900"
                  fill="#F5C842"
                  style={{ fontFamily: "var(--font-display), Georgia, serif" }}
                >
                  VS
                </text>

                {/* ── debate: defenders panel (right) ── */}
                <rect
                  x="126"
                  y="42"
                  width="100"
                  height="46"
                  rx="4"
                  fill="#EFF6FF"
                  stroke="#93C5FD"
                  strokeWidth="0.5"
                />
                <text
                  x="176"
                  y="51"
                  textAnchor="middle"
                  fontSize="5.5"
                  fontWeight="700"
                  letterSpacing="1"
                  fill="#1E40AF"
                  style={{ fontFamily: "var(--font-mono), monospace" }}
                >
                  DEFENDERS SAY
                </text>
                {/* up-trend arrows */}
                <g transform="translate(168, 54)" stroke="#2563EB" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M -5,8 L -5,3 M -7,5 L -5,3 L -3,5" />
                  <path d="M 1,8 L 1,1 M -1,3 L 1,1 L 3,3" />
                  <path d="M 7,8 L 7,2 M 5,4 L 7,2 L 9,4" />
                </g>
                <text
                  x="176"
                  y="76"
                  textAnchor="middle"
                  fontSize="7"
                  fontWeight="700"
                  fill="#17161A"
                  style={{ fontFamily: "var(--font-sans), sans-serif" }}
                >
                  &ldquo;Too soon&rdquo;
                </text>
                <text
                  x="176"
                  y="84"
                  textAnchor="middle"
                  fontSize="5"
                  fill="#5C5751"
                  style={{ fontFamily: "var(--font-sans), sans-serif" }}
                >
                  just begun &middot; will flourish
                </text>

                {/* ── growth chart ── */}
                <text
                  x="14"
                  y="100"
                  fontSize="5.5"
                  fontWeight="700"
                  letterSpacing="0.8"
                  fill="#5C5751"
                  style={{ fontFamily: "var(--font-mono), monospace" }}
                >
                  PROJECTED GROWTH
                </text>
                {/* gridlines */}
                <line x1="14" y1="115" x2="226" y2="115" stroke="#DCD5C6" strokeWidth="0.4" strokeDasharray="2 2" />
                <line x1="14" y1="127" x2="226" y2="127" stroke="#DCD5C6" strokeWidth="0.4" strokeDasharray="2 2" />
                <line x1="14" y1="132" x2="226" y2="132" stroke="#DCD5C6" strokeWidth="0.8" />
                {/* ascending bars */}
                <rect x="24" y="125" width="28" height="7" rx="1" fill="#1E3A8A" opacity="0.25" />
                <rect x="62" y="120" width="28" height="12" rx="1" fill="#1E3A8A" opacity="0.4" />
                <rect x="100" y="115" width="28" height="17" rx="1" fill="#1E3A8A" opacity="0.58" />
                <rect x="138" y="109" width="28" height="23" rx="1" fill="#1E3A8A" opacity="0.78" />
                <rect x="176" y="102" width="28" height="30" rx="1" fill="#F5C842" />
                <rect x="176" y="102" width="28" height="30" rx="1" fill="none" stroke="#1E3A8A" strokeWidth="0.5" />
                {/* trend line over bars */}
                <path
                  d="M 38,125 L 76,120 L 114,115 L 152,109 L 190,102"
                  stroke="#17161A"
                  strokeWidth="0.8"
                  fill="none"
                  strokeDasharray="1.5 1.5"
                  opacity="0.4"
                />
                {/* bar labels */}
                <text x="38" y="140" textAnchor="middle" fontSize="4.5" fill="#5C5751" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
                  now
                </text>
                <text x="76" y="140" textAnchor="middle" fontSize="4.5" fill="#5C5751" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
                  early
                </text>
                <text x="114" y="140" textAnchor="middle" fontSize="4.5" fill="#5C5751" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
                  growing
                </text>
                <text x="152" y="140" textAnchor="middle" fontSize="4.5" fill="#5C5751" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
                  maturing
                </text>
                <text x="190" y="140" textAnchor="middle" fontSize="4.5" fontWeight="700" fill="#1E3A8A" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
                  flourish!
                </text>

                {/* ── key takeaway box ── */}
                <rect x="14" y="148" width="212" height="44" rx="4" fill="#17161A" />
                <text
                  x="120"
                  y="162"
                  textAnchor="middle"
                  fontSize="6"
                  fontStyle="italic"
                  fill="#9CA3AF"
                  style={{ fontFamily: "var(--font-display), Georgia, serif" }}
                >
                  the verdict?
                </text>
                {/* highlighter behind FLOURISH */}
                <rect x="62" y="167" width="104" height="16" fill="#F5C842" opacity="0.9" rx="1" />
                <text
                  x="114"
                  y="179"
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="900"
                  fill="#17161A"
                  style={{ fontFamily: "var(--font-display), Georgia, serif" }}
                >
                  FLOURISH
                </text>
                {/* sprout icon */}
                <g transform="translate(182, 158)">
                  <line x1="5" y1="20" x2="5" y2="10" stroke="#15803D" strokeWidth="0.9" />
                  <path d="M 5,12 Q 0,11 0.5,6 Q 5,7 5,12 Z" fill="#22C55E" />
                  <path d="M 5,10 Q 10,9 9.5,4 Q 5,5 5,10 Z" fill="#16A34A" />
                </g>
              </g>

              {/* outer border */}
              <rect x="0.5" y="0.5" width="239" height="199" fill="none" stroke="#DCD5C6" rx="4" />
            </svg>
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

/* ── 3b. AI TUTOR — context-aware reading coach chat ── */
export function AITutorMockup() {
  return (
    <MockupFrame label="AI TUTOR · Mr.🆖 ProReader">
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
    <MockupFrame label="PRACTICE · Mr.🆖 ProReader">
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

/* ── 5. MASTER — test scorecard + leaderboard + achievements ── */
export function MasterMockup() {
  const [practiceMode, setPracticeMode] = useState(false);
  const skills = [
    { l: "Main idea", v: 90 },
    { l: "Inference", v: 70 },
    { l: "Vocabulary", v: 85 },
  ];
  const achievements = [
    {
      name: "Avid Reader",
      icon: BookOpen,
      colorBg: "bg-blue-500",
      colorText: "text-blue-600 dark:text-blue-400",
      colorRing: "#3b82f6",
      colorDot: "bg-blue-500",
      desc: "Read 10 texts",
      progress: 60,
      current: "8",
      target: "10",
      unlocked: true,
      dotsEarned: 1,
    },
    {
      name: "Word Collector",
      icon: BookText,
      colorBg: "bg-green-500",
      colorText: "text-green-600 dark:text-green-400",
      colorRing: "#22c55e",
      colorDot: "bg-green-500",
      desc: "Collect 100 vocabulary items",
      progress: 44,
      current: "72",
      target: "100",
      unlocked: true,
      dotsEarned: 1,
    },
    {
      name: "Grammar Gamer",
      icon: Gamepad2,
      colorBg: "bg-amber-500",
      colorText: "text-amber-600 dark:text-amber-400",
      colorRing: "#f59e0b",
      colorDot: "bg-amber-500",
      desc: "Play 5 grammar games",
      progress: 60,
      current: "3",
      target: "5",
      unlocked: false,
      dotsEarned: 0,
    },
    {
      name: "Curious Learner",
      icon: Sparkles,
      colorBg: "bg-cyan-500",
      colorText: "text-cyan-600 dark:text-cyan-400",
      colorRing: "#06b6d4",
      colorDot: "bg-cyan-500",
      desc: "Ask AI Tutor 20 questions",
      progress: 47,
      current: "12",
      target: "20",
      unlocked: true,
      dotsEarned: 1,
    },
  ];
  return (
    <MockupFrame label="DASHBOARD · Mr.🆖 ProReader">
      <div className="grid items-start gap-4 sm:grid-cols-2">
        {/* Column 1 — your stats: scorecard + leaderboard */}
        <div className="flex flex-col gap-4">
          {practiceMode ? (
            /* ── targeted practice — question-by-question quiz view ── */
            <div className="rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/50 p-4">
              {/* header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPracticeMode(false)}
                    className="text-[var(--lp-ink-soft)] transition-colors hover:text-[var(--lp-ink)]"
                    aria-label="Back to results"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs font-semibold text-[var(--lp-ink)]">Reading Test</span>
                </div>
                <span className="rounded-md bg-[var(--lp-accent)] px-2.5 py-1 text-[10px] font-semibold text-white">
                  Submit Answers
                </span>
              </div>

              {/* progress */}
              <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--lp-ink-soft)]">
                <span>Question 1 of 6</span>
                <span>Press →/←</span>
              </div>
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[var(--lp-rule)]">
                <div className="h-full rounded-full bg-[var(--lp-accent)]" style={{ width: "17%" }} />
              </div>

              {/* question card */}
              <div className="rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[var(--lp-accent)]">1.</span>
                  <span className="rounded bg-[var(--lp-paper-2)] px-1.5 py-0.5 text-[9px] text-[var(--lp-ink-soft)]">
                    Inference
                  </span>
                  <span className="rounded bg-[var(--lp-paper-2)] px-1.5 py-0.5 text-[9px] text-[var(--lp-ink-soft)]">
                    Inference
                  </span>
                </div>
                <p className="mb-3 text-sm font-medium text-[var(--lp-ink)]">
                  What can we infer about why the defenders believe recycling will improve?
                </p>
                <div className="space-y-1.5">
                  {[
                    { letter: "A", text: "They have proof that costs will decrease", selected: false },
                    { letter: "B", text: "They trust that time and experience will help", selected: true },
                    { letter: "C", text: "They plan to redesign the process themselves", selected: false },
                    { letter: "D", text: "They think the critics lied about the costs", selected: false },
                  ].map((opt) => (
                    <div
                      key={opt.letter}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                        opt.selected
                          ? "border-[var(--lp-accent)] bg-[var(--lp-accent)]/5 text-[var(--lp-ink)]"
                          : "border-[var(--lp-rule)] text-[var(--lp-ink-soft)]"
                      }`}
                    >
                      <span
                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                          opt.selected
                            ? "border-[var(--lp-accent)] bg-[var(--lp-accent)]"
                            : "border-[var(--lp-rule)]"
                        }`}
                      >
                        {opt.selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                      <span className="font-mono text-[10px]">{opt.letter})</span>
                      <span>{opt.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* navigation */}
              <div className="mt-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--lp-rule)] px-2.5 py-1.5 text-[10px] text-[var(--lp-ink-soft)] opacity-50">
                  <ArrowLeft className="h-3 w-3" /> Previous
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--lp-accent)] px-2.5 py-1.5 text-[10px] font-semibold text-white">
                  Next <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          ) : (
            /* ── scorecard (default) ── */
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
                onClick={() => setPracticeMode(true)}
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--lp-accent)]/40 bg-[var(--lp-accent)]/5 px-3 py-2 text-xs font-semibold text-[var(--lp-accent)] transition-colors hover:bg-[var(--lp-accent)]/10"
              >
                <Target className="h-3.5 w-3.5" />
                Targeted practice
              </button>
            </div>
          )}

          {/* leaderboard */}
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

        {/* Column 2 — rewards: achievements */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-[var(--lp-rule)] p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-[var(--lp-ink-soft)]" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--lp-ink-soft)]">
                Achievements
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {achievements.map((a) => (
                <div
                  key={a.name}
                  className={`flex flex-col items-center rounded-2xl border-2 p-2.5 ${
                    a.unlocked
                      ? "border-transparent bg-[var(--lp-surface)] shadow-sm"
                      : "border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/40"
                  }`}
                >
                  {/* medal circle with progress ring */}
                  <div className="relative mb-2 h-12 w-12">
                    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
                      <circle cx="50" cy="50" r="44" fill="none" stroke="var(--lp-rule)" strokeWidth="5" />
                      {a.unlocked ? (
                        <circle cx="50" cy="50" r="44" fill="none" stroke={a.colorRing} strokeWidth="5" />
                      ) : (
                        <circle
                          cx="50"
                          cy="50"
                          r="44"
                          fill="none"
                          stroke={a.colorRing}
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeDasharray="276"
                          strokeDashoffset={276 - Math.round((a.progress / 100) * 276)}
                        />
                      )}
                    </svg>
                    {/* inner circle */}
                    <div
                      className={`absolute inset-[10px] flex items-center justify-center rounded-full ${
                        a.unlocked ? `${a.colorBg} shadow-sm` : "bg-[var(--lp-paper-2)]"
                      }`}
                    >
                      {a.unlocked ? (
                        <a.icon className="h-4 w-4 text-white" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-[var(--lp-ink-soft)] opacity-50" />
                      )}
                    </div>
                    {/* check badge */}
                    {a.unlocked && (
                      <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-[var(--lp-surface)] p-0.5">
                        <CheckCircle2 className={`h-3 w-3 ${a.colorText}`} />
                      </span>
                    )}
                  </div>
                  {/* title */}
                  <span
                    className={`text-center text-[10px] font-bold leading-tight ${
                      a.unlocked ? "text-[var(--lp-ink)]" : "text-[var(--lp-ink-soft)]"
                    }`}
                  >
                    {a.name}
                  </span>
                  {/* milestone label */}
                  <span
                    className={`mt-0.5 text-center text-[8px] leading-tight ${
                      a.unlocked ? a.colorText : "text-[var(--lp-ink-soft)] opacity-70"
                    }`}
                  >
                    {a.desc}
                  </span>
                  {/* progress bar */}
                  <div className="mt-1.5 w-full">
                    <div className="h-0.5 w-full overflow-hidden rounded-full bg-[var(--lp-rule)]">
                      <div
                        className={`h-full rounded-full ${a.unlocked ? a.colorBg : "bg-[var(--lp-ink-soft)] opacity-40"}`}
                        style={{ width: `${a.progress}%` }}
                      />
                    </div>
                    <span className="mt-0.5 block text-center text-[7px] text-[var(--lp-ink-soft)]">
                      {a.current} / {a.target}
                    </span>
                  </div>
                  {/* milestone dots */}
                  <div className="mt-1 flex justify-center gap-0.5">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-1 w-1 rounded-full ${
                          i < a.dotsEarned ? a.colorDot : "bg-[var(--lp-ink-soft)] opacity-30"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

/* ── 6. CLASSROOMS — teacher dashboard with 4 real charts ── */
export function DashboardMockup() {
  // Chart 1: Daily Learning Activity — stacked bars (5 series)
  const dailyData = [
    { name: "Chloe", segs: [12, 9, 7, 5, 3] },
    { name: "Marcus", segs: [8, 7, 5, 4] },
    { name: "Priya", segs: [6, 5, 4, 3] },
    { name: "Ethan", segs: [10, 8, 6, 4, 2] },
    { name: "Sofia", segs: [11, 9, 7, 6, 4] },
  ];
  const dailyColors = ["#3b82f6", "#8b5cf6", "#22c55e", "#f97316", "#eab308"];
  const dailyLabels = ["Read", "Summary", "Mind Map", "Glossary", "Test"];

  // Chart 2: Vocabulary Growth — multi-line area
  const vocabLines = [
    { color: "#3b82f6", name: "Chloe", pts: "10,85 45,75 80,62 115,48 150,35 185,20" },
    { color: "#22c55e", name: "Sofia", pts: "10,87 45,80 80,70 115,58 150,45 185,32" },
    { color: "#ef4444", name: "Ethan", pts: "10,89 45,84 80,78 115,70 150,62 185,52" },
  ];

  // Chart 3: Reading Texts — quartile-colored bars
  const readingData = [
    { name: "Chloe", val: 88, q: 4 },
    { name: "Marcus", val: 72, q: 3 },
    { name: "Priya", val: 42, q: 2 },
    { name: "Ethan", val: 55, q: 3 },
    { name: "Sofia", val: 95, q: 4 },
  ];
  const quartileColors = ["#ef4444", "#f97316", "#22c55e", "#3b82f6"];

  // Chart 4: AI Features Usage — stacked bars (4 series)
  const aiData = [
    { name: "Chloe", segs: [8, 5, 4, 3] },
    { name: "Marcus", segs: [6, 4, 3, 2] },
    { name: "Priya", segs: [4, 3, 2, 2] },
    { name: "Ethan", segs: [7, 5, 4, 3] },
    { name: "Sofia", segs: [9, 6, 5, 4] },
  ];
  const aiColors = ["#3b82f6", "#8b5cf6", "#0ea5e9", "#22c55e"];
  const aiLabels = ["Summary", "Mind Map", "Adapted", "Glossary"];

  const gridLines = [15, 38, 61];
  const studentNames = dailyData.map((d) => d.name);

  return (
    <MockupFrame label="TEACHER DASHBOARD · Mr.🆖 ProReader">
      {/* header / filter bar */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[var(--lp-accent)]" />
          <span className="text-xs font-semibold text-[var(--lp-ink)]">Form 3B</span>
          <span className="font-mono text-[10px] text-[var(--lp-ink-soft)]">28 students</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--lp-rule)] px-2 py-1 text-[10px] font-medium text-[var(--lp-ink-soft)]">
          <FileDown className="h-3 w-3" /> Export
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* ── Chart 1: Daily Learning Activity ── */}
        <div className="rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-3">
          <p className="text-xs font-semibold text-[var(--lp-ink)]">Daily Learning Activity</p>
          <p className="mb-2 text-[10px] text-[var(--lp-ink-soft)]">
            Total: <span className="font-bold text-[var(--lp-ink)]">247</span>
          </p>
          <svg viewBox="0 0 200 110" className="w-full">
            {gridLines.map((y) => (
              <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="var(--lp-rule)" strokeDasharray="2 2" strokeWidth="0.4" opacity="0.6" />
            ))}
            <line x1="0" y1="95" x2="200" y2="95" stroke="var(--lp-rule)" strokeWidth="0.6" />
            {dailyData.map((student, si) => {
              let cumY = 95;
              const barX = si * 36 + 14;
              return student.segs.map((h, hi) => {
                cumY -= h;
                return (
                  <rect
                    key={`d-${si}-${hi}`}
                    x={barX}
                    y={cumY}
                    width={20}
                    height={h}
                    fill={dailyColors[hi]}
                  />
                );
              });
            })}
            {studentNames.map((nm, si) => (
              <text
                key={nm}
                x={si * 36 + 24}
                y={106}
                textAnchor="end"
                fontSize="6"
                fill="var(--lp-ink-soft)"
                transform={`rotate(-30 ${si * 36 + 24} 106)`}
              >
                {nm}
              </text>
            ))}
          </svg>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
            {dailyLabels.map((l, i) => (
              <span key={l} className="inline-flex items-center gap-0.5 text-[8px] text-[var(--lp-ink-soft)]">
                <span className="h-1.5 w-1.5 rounded-sm" style={{ background: dailyColors[i] }} />
                {l}
              </span>
            ))}
          </div>
        </div>

        {/* ── Chart 2: Vocabulary Growth ── */}
        <div className="rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-3">
          <p className="text-xs font-semibold text-[var(--lp-ink)]">Vocabulary Growth</p>
          <p className="mb-2 text-[10px] text-[var(--lp-ink-soft)]">Last 30 days</p>
          <svg viewBox="0 0 200 110" className="w-full">
            {gridLines.map((y) => (
              <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="var(--lp-rule)" strokeDasharray="2 2" strokeWidth="0.4" opacity="0.6" />
            ))}
            <line x1="0" y1="95" x2="200" y2="95" stroke="var(--lp-rule)" strokeWidth="0.6" />
            {/* area fills */}
            {vocabLines.map((line) => (
              <polygon
                key={`fill-${line.name}`}
                points={`${line.pts} 185,95 10,95`}
                fill={line.color}
                opacity="0.08"
              />
            ))}
            {/* trend lines */}
            {vocabLines.map((line) => (
              <polyline
                key={`line-${line.name}`}
                points={line.pts}
                fill="none"
                stroke={line.color}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {/* endpoint dots */}
            {vocabLines.map((line) => {
              const lastPt = line.pts.split(" ").pop()!.split(",");
              return <circle key={`dot-${line.name}`} cx={lastPt[0]} cy={lastPt[1]} r="2" fill={line.color} />;
            })}
            <text x="10" y="106" textAnchor="middle" fontSize="5" fill="var(--lp-ink-soft)">Jun 1</text>
            <text x="80" y="106" textAnchor="middle" fontSize="5" fill="var(--lp-ink-soft)">Jun 10</text>
            <text x="150" y="106" textAnchor="middle" fontSize="5" fill="var(--lp-ink-soft)">Jun 20</text>
          </svg>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
            {vocabLines.map((line) => (
              <span key={line.name} className="inline-flex items-center gap-0.5 text-[8px] text-[var(--lp-ink-soft)]">
                <span className="h-1.5 w-1.5 rounded-sm" style={{ background: line.color }} />
                {line.name}
              </span>
            ))}
          </div>
        </div>

        {/* ── Chart 3: Reading Test Score ── */}
        <div className="rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-3">
          <p className="text-xs font-semibold text-[var(--lp-ink)]">Reading Test Score</p>
          <p className="mb-2 text-[10px] text-[var(--lp-ink-soft)]">
            Avg: <span className="font-bold text-[var(--lp-ink)]">70</span>
          </p>
          <svg viewBox="0 0 200 110" className="w-full">
            {gridLines.map((y) => (
              <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="var(--lp-rule)" strokeDasharray="2 2" strokeWidth="0.4" opacity="0.6" />
            ))}
            {/* dashed class-average reference line */}
            <line x1="0" y1="39" x2="200" y2="39" stroke="var(--lp-ink)" strokeDasharray="4 3" strokeWidth="0.6" opacity="0.4" />
            <text x="197" y="37" textAnchor="end" fontSize="5" fill="var(--lp-ink-soft)">avg 70</text>
            <line x1="0" y1="95" x2="200" y2="95" stroke="var(--lp-rule)" strokeWidth="0.6" />
            {readingData.map((s, si) => {
              const barH = s.val * 0.8;
              return (
                <rect
                  key={s.name}
                  x={si * 36 + 14}
                  y={95 - barH}
                  width={20}
                  height={barH}
                  fill={quartileColors[s.q - 1]}
                  rx={2}
                />
              );
            })}
            {readingData.map((s, si) => (
              <text
                key={s.name}
                x={si * 36 + 24}
                y={106}
                textAnchor="end"
                fontSize="6"
                fill="var(--lp-ink-soft)"
                transform={`rotate(-30 ${si * 36 + 24} 106)`}
              >
                {s.name}
              </text>
            ))}
          </svg>
          <div className="mt-1 flex flex-wrap gap-x-1.5 gap-y-0.5">
            {["Q1", "Q2", "Q3", "Q4"].map((l, i) => (
              <span key={l} className="inline-flex items-center gap-0.5 text-[7px] text-[var(--lp-ink-soft)]">
                <span className="h-1.5 w-1.5 rounded-sm" style={{ background: quartileColors[i] }} />
                {l}
              </span>
            ))}
          </div>
        </div>

        {/* ── Chart 4: AI Features Usage ── */}
        <div className="rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-3">
          <p className="text-xs font-semibold text-[var(--lp-ink)]">AI Features Usage</p>
          <p className="mb-2 text-[10px] text-[var(--lp-ink-soft)]">
            Total: <span className="font-bold text-[var(--lp-ink)]">189</span>
          </p>
          <svg viewBox="0 0 200 110" className="w-full">
            {gridLines.map((y) => (
              <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="var(--lp-rule)" strokeDasharray="2 2" strokeWidth="0.4" opacity="0.6" />
            ))}
            <line x1="0" y1="95" x2="200" y2="95" stroke="var(--lp-rule)" strokeWidth="0.6" />
            {aiData.map((student, si) => {
              let cumY = 95;
              const barX = si * 36 + 14;
              return student.segs.map((h, hi) => {
                const scaledH = h * 2;
                cumY -= scaledH;
                return (
                  <rect
                    key={`a-${si}-${hi}`}
                    x={barX}
                    y={cumY}
                    width={20}
                    height={scaledH}
                    fill={aiColors[hi]}
                  />
                );
              });
            })}
            {studentNames.map((nm, si) => (
              <text
                key={nm}
                x={si * 36 + 24}
                y={106}
                textAnchor="end"
                fontSize="6"
                fill="var(--lp-ink-soft)"
                transform={`rotate(-30 ${si * 36 + 24} 106)`}
              >
                {nm}
              </text>
            ))}
          </svg>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
            {aiLabels.map((l, i) => (
              <span key={l} className="inline-flex items-center gap-0.5 text-[8px] text-[var(--lp-ink-soft)]">
                <span className="h-1.5 w-1.5 rounded-sm" style={{ background: aiColors[i] }} />
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

/* ── 7. ASSIGNMENTS — faithful mockup of the teacher assignment detail page ── */
export function AssignmentsMockup() {
  // Mirrors the AssignmentStats overview strip (4 StatCards).
  const stats = [
    { label: "Assessed", value: "24/28", icon: Users, color: "text-[var(--lp-accent)]" },
    { label: "Participation", value: "86%", icon: TrendingUp, color: "text-emerald-500" },
    { label: "Class avg", value: "74", icon: Award, color: "text-indigo-500" },
    { label: "At-risk", value: "3", icon: TriangleAlert, color: "text-amber-500" },
  ];

  // Mirrors the 8-column sortable roster table. Score columns match the real
  // activity meta: testScore / vocab / spelling / grammarQuiz / grammarGame.
  type Row = {
    name: string;
    init: string;
    email: string;
    progress: number;
    test: number | null;
    vocab: number | null;
    spell: number | null;
    gq: number | null;
    gg: number | null;
    viewed: string;
  };
  const rows: Row[] = [
    { name: "Chloe L.", init: "C", email: "chloe.l@school.edu", progress: 100, test: 92, vocab: 88, spell: 90, gq: 85, gg: 80, viewed: "Jun 9, 14:22" },
    { name: "Marcus T.", init: "M", email: "marcus.t@school.edu", progress: 80, test: 74, vocab: 70, spell: 78, gq: 72, gg: 68, viewed: "Jun 8, 09:10" },
    { name: "Priya K.", init: "P", email: "priya.k@school.edu", progress: 52, test: 61, vocab: 55, spell: 60, gq: 58, gg: 50, viewed: "Jun 7, 16:40" },
    { name: "Ethan W.", init: "E", email: "ethan.w@school.edu", progress: 24, test: null, vocab: null, spell: null, gq: null, gg: null, viewed: "—" },
  ];

  const scoreCols = [
    { key: "test" as const, icon: BookOpenCheck, color: "text-teal-500", title: "Test" },
    { key: "vocab" as const, icon: ClipboardList, color: "text-blue-500", title: "Vocab" },
    { key: "spell" as const, icon: SpellCheck, color: "text-pink-500", title: "Spelling" },
    { key: "gq" as const, icon: GraduationCap, color: "text-fuchsia-500", title: "Grammar Quiz" },
    { key: "gg" as const, icon: Gamepad2, color: "text-amber-500", title: "Grammar Game" },
  ];

  const cell = (v: number | null) => (v == null ? "—" : String(v));

  return (
    <MockupFrame label="ASSIGNMENTS · Mr.🆖 ProReader">
      {/* ── header card: title / subject / status + meta row ── */}
      <div className="rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-base font-bold text-[var(--lp-ink)]">
              DSE 2023 Paper 1 — Reading
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--lp-ink-soft)]">English · Paper 1</p>
          </div>
          <span className="shrink-0 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            Active
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-[var(--lp-ink-soft)]">
          Read the passage and complete all sections before the deadline.
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 border-t border-[var(--lp-rule)] pt-2.5 text-[11px] text-[var(--lp-ink-soft)]">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" /> 28 students
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Due Jun 12
          </span>
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Avg 64%
          </span>
        </div>
      </div>

      {/* ── export button (right-aligned, like the real page) ── */}
      <div className="mt-3 flex justify-end">
        <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--lp-ink)]">
          <Download className="h-3.5 w-3.5" /> Export to Excel
        </span>
      </div>

      {/* ── AssignmentStats overview strip (4 StatCards) ── */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/50 p-2"
          >
            <s.icon className={`h-3 w-3 ${s.color}`} />
            <div className="mt-1 font-display text-base font-bold text-[var(--lp-ink)]">
              {s.value}
            </div>
            <div className="text-[8px] uppercase tracking-wide text-[var(--lp-ink-soft)]">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── roster table (8 sortable columns) ── */}
      <div className="mt-3 overflow-hidden rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-surface)]">
        <table className="w-full border-collapse text-[var(--lp-ink)]">
          <thead>
            <tr className="border-b border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/40 text-[9px] uppercase tracking-wide text-[var(--lp-ink-soft)]">
              <th className="px-2 py-1.5 text-left font-semibold">Student</th>
              <th className="px-1.5 py-1.5 text-left font-semibold">Progress</th>
              {scoreCols.map((c) => (
                <th key={c.key} className="px-1 py-1.5 text-center font-semibold" title={c.title}>
                  <c.icon className={`mx-auto h-3 w-3 ${c.color}`} />
                </th>
              ))}
              <th className="px-2 py-1.5 text-right font-semibold">Viewed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.name}
                className={`text-[11px] ${i !== rows.length - 1 ? "border-b border-[var(--lp-rule)]" : ""}`}
              >
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--lp-accent)] text-[8px] font-bold text-white">
                      {r.init}
                    </span>
                    <span className="truncate font-medium">{r.name}</span>
                  </div>
                </td>
                <td className="px-1.5 py-1.5">
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-8 overflow-hidden rounded-full bg-[var(--lp-rule)]">
                      <div
                        className="h-full rounded-full bg-[var(--lp-accent)]"
                        style={{ width: `${r.progress}%` }}
                      />
                    </div>
                    <span className="font-mono text-[9px] tabular-nums text-[var(--lp-ink-soft)]">
                      {r.progress}%
                    </span>
                  </div>
                </td>
                {scoreCols.map((c) => (
                  <td
                    key={c.key}
                    className={`px-1 py-1.5 text-center font-mono tabular-nums ${
                      r[c.key] == null
                        ? "text-[var(--lp-ink-soft)]"
                        : (r[c.key] ?? 0) >= 70
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-[var(--lp-ink)]"
                    }`}
                  >
                    {cell(r[c.key])}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-right font-mono text-[9px] tabular-nums text-[var(--lp-ink-soft)]">
                  {r.viewed}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MockupFrame>
  );
}

/* ── 8. VOCABULARY — faithful mockup of the My Vocabulary page ── */
export function VocabularyMockup() {
  // 4 overview stat cards (Total / Due / Mastered / New). Colors match the real page.
  const stats = [
    { label: "Total Words", value: "128", icon: BookMarked, color: "text-[var(--lp-ink)]", sub: "Own: 96 · Teacher: 32" },
    { label: "Due for Review", value: "14", icon: Clock, color: "text-orange-500", sub: null },
    { label: "Mastered", value: "47", icon: CheckCircle2, color: "text-green-500", sub: null },
    { label: "New Words", value: "21", icon: Brain, color: "text-blue-500", sub: null },
  ];

  // Tab strip — note Spelling precedes Quiz, matching the real page.
  const tabs = [
    { key: "table", label: "Table", icon: TableIcon, active: true },
    { key: "flashcard", label: "Flashcard", icon: Layers, active: false },
    { key: "spelling", label: "Spelling", icon: SpellCheck, active: false },
    { key: "quiz", label: "Quiz", icon: ClipboardList, active: false },
    { key: "lists", label: "Review Lists", icon: ListPlus, active: false },
    { key: "history", label: "History", icon: History, active: false },
  ];

  // Mastery level badges: 0 New → 5 Mastered (gray→red→orange→yellow→blue→green ramp).
  const masteryStyle: Record<string, string> = {
    "5": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    "4": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    "3": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    "2": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
    "1": "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    "0": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  const masteryLabel: Record<string, string> = {
    "5": "Mastered", "4": "L4", "3": "L3", "2": "L2", "1": "L1", "0": "New",
  };

  // Rating dots: hard red / medium yellow / easy green / unrated gray.
  const ratingDot: Record<string, string> = {
    easy: "bg-green-500",
    medium: "bg-yellow-500",
    hard: "bg-red-500",
    none: "bg-gray-300 dark:bg-gray-600",
  };
  const ratingLabel: Record<string, string> = { easy: "Easy", medium: "Medium", hard: "Hard", none: "—" };

  type Level = "0" | "1" | "2" | "3" | "4" | "5";
  type Rating = "easy" | "medium" | "hard" | "none";
  type Row = {
    word: string;
    pos: string;
    def: string;
    zh: string;
    source: "own" | "teacher";
    rating: Rating;
    level: Level;
  };
  const rows: Row[] = [
    { word: "flourish", pos: "verb", def: "to grow or develop successfully", zh: "茁壯成長", source: "own", rating: "easy", level: "5" },
    { word: "luminous", pos: "adj.", def: "full of light; brightly glowing", zh: "發光的", source: "own", rating: "medium", level: "4" },
    { word: "inefficient", pos: "adj.", def: "not using time or energy well", zh: "效率低的", source: "teacher", rating: "hard", level: "2" },
    { word: "defenders", pos: "noun", def: "people who support or protect", zh: "捍衛者", source: "teacher", rating: "hard", level: "1" },
    { word: "verdict", pos: "noun", def: "a formal decision or judgment", zh: "裁決", source: "own", rating: "none", level: "0" },
  ];

  return (
    <MockupFrame label="MY VOCABULARY · Mr.🆖 ProReader">
      {/* title row */}
      <div className="flex items-center gap-2">
        <BookMarked className="h-4 w-4 text-indigo-500" />
        <span className="font-display text-base font-semibold text-[var(--lp-ink)]">My Vocabulary</span>
        <HelpCircle className="h-3.5 w-3.5 text-[var(--lp-ink-soft)]" />
      </div>

      {/* 4 stat cards */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-2"
          >
            <div className="flex items-center gap-1 text-[var(--lp-ink-soft)]">
              <s.icon className={`h-3 w-3 ${s.color}`} />
              <span className="truncate text-[8px] uppercase tracking-wide">{s.label}</span>
            </div>
            <div className={`mt-0.5 font-display text-lg font-bold ${s.color}`}>{s.value}</div>
            {s.sub && <div className="text-[7px] leading-tight text-[var(--lp-ink-soft)]">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* tabs */}
      <div className="mt-3 flex flex-wrap gap-1 border-b border-[var(--lp-rule)]">
        {tabs.map((tb) => (
          <span
            key={tb.key}
            className={`flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium -mb-px border-b-2 ${
              tb.active
                ? "border-[var(--lp-accent)] text-[var(--lp-accent)]"
                : "border-transparent text-[var(--lp-ink-soft)]"
            }`}
          >
            <tb.icon className="h-3 w-3" />
            {tb.label}
          </span>
        ))}
      </div>

      {/* toolbar: Auto Select | spacer | Export */}
      <div className="mt-2.5 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2 py-1 text-[10px] text-[var(--lp-ink)]">
          <Wand2 className="h-3 w-3 text-[var(--lp-accent)]" /> Auto Select
        </span>
        <span className="flex-1" />
        <span className="inline-flex items-center gap-1 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2 py-1 text-[10px] text-[var(--lp-ink)]">
          <Download className="h-3 w-3" /> Export
        </span>
      </div>

      {/* meta row */}
      <div className="mt-2 flex items-center justify-between text-[9px] text-[var(--lp-ink-soft)]">
        <span>Showing 5 of 128 words</span>
        <span>Page 1 of 3</span>
      </div>

      {/* word table */}
      <div className="mt-1.5 overflow-hidden rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-surface)]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/40 text-[8px] uppercase tracking-wide text-[var(--lp-ink-soft)]">
              <th className="px-2 py-1.5 text-left font-semibold">Word</th>
              <th className="px-1.5 py-1.5 text-left font-semibold">PoS</th>
              <th className="px-1.5 py-1.5 text-left font-semibold">Definition</th>
              <th className="px-1.5 py-1.5 text-left font-semibold">中文</th>
              <th className="px-1.5 py-1.5 text-center font-semibold">Source</th>
              <th className="px-1.5 py-1.5 text-center font-semibold">Rating</th>
              <th className="px-2 py-1.5 text-center font-semibold">Level</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.word}
                className={`text-[10px] text-[var(--lp-ink)] ${i !== rows.length - 1 ? "border-b border-[var(--lp-rule)]" : ""}`}
              >
                <td className="px-2 py-1.5 font-medium">{r.word}</td>
                <td className="px-1.5 py-1.5 italic text-[var(--lp-ink-soft)]">{r.pos}</td>
                <td className="max-w-[110px] truncate px-1.5 py-1.5">{r.def}</td>
                <td className="px-1.5 py-1.5 text-[var(--lp-ink-soft)]">{r.zh}</td>
                <td className="px-1.5 py-1.5 text-center">
                  <span
                    className={`inline-flex rounded px-1.5 py-0.5 text-[8px] font-medium ${
                      r.source === "teacher"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {r.source === "teacher" ? "Teacher" : "Own"}
                  </span>
                </td>
                <td className="px-1.5 py-1.5 text-center">
                  <span className="inline-flex items-center gap-1 text-[9px] text-[var(--lp-ink-soft)]">
                    <span className={`h-1.5 w-1.5 rounded-full ${ratingDot[r.rating]}`} />
                    {ratingLabel[r.rating]}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-center">
                  <span className={`inline-flex rounded px-1.5 py-0.5 text-[8px] font-medium ${masteryStyle[r.level]}`}>
                    {masteryLabel[r.level]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* pagination: Per page 25/50/75/100 (50 default) + page nav */}
      <div className="mt-2 flex items-center justify-between text-[9px] text-[var(--lp-ink-soft)]">
        <span className="inline-flex items-center gap-1">
          Per page:
          {[25, 50, 75, 100].map((n, idx) => (
            <span
              key={n}
              className={`rounded px-1 py-0.5 ${idx === 1 ? "bg-[var(--lp-accent)] font-medium text-white" : ""}`}
            >
              {n}
            </span>
          ))}
        </span>
        <span className="inline-flex items-center gap-1">
          <ChevronRight className="h-3 w-3 rotate-180" />
          <span className="rounded bg-[var(--lp-accent)] px-1.5 py-0.5 font-medium text-white">1</span>
          <span>2</span>
          <span>3</span>
          <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </MockupFrame>
  );
}
