"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "motion/react";
import {
  Upload,
  Brain,
  Image as ImageIcon,
  Volume2,
  BarChart3,
  FileDown,
  Sparkles,
  Target,
  Timer,
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
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Trophy,
  CalendarRange,
  Infinity as InfinityIcon,
  School,
  Lock,
  Camera,
  Check,
  CheckCircle2,
  Calendar,
  Users,
  TrendingUp,
  Download,
  Award,
  TriangleAlert,
  BookOpenCheck,
  ClipboardList,
  ClipboardCheck,
  Combine,
  Shuffle,
  SpellCheck,
  Swords,
  GraduationCap,
  BookMarked,
  Clock,
  HelpCircle,
  Keyboard,
  Table as TableIcon,
  ListPlus,
  History,
  Wand2,
  Layers,
  Play,
  Library,
  Search,
  Globe,
  Building2,
  RotateCcw,
  Crown,
  Eye,
  Languages,
  Medal,
  ChevronsUpDown,
  Flame,
  Coins,
  Stethoscope,
  Copy,
  ScrollText,
  Zap,
  XCircle,
  Highlighter,
  Pencil,
  Plus,
  X,
  Gauge,
  FileText,
  FileEdit,
  FileMinus,
  EyeOff,
} from "lucide-react";

/* ───────────────────────────────────────────────────────────────
   Shared window chrome — gives each mockup a consistent "app" frame
   sitting on the editorial paper.
───────────────────────────────────────────────────────────────── */
function MockupFrame({
  label,
  children,
  className = "",
  frameRef,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  frameRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={frameRef}
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

/* ── 1b. HERO — capture any text: photograph a paper → live tappable passage ── */
export function CaptureComprehendMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const [phase, setPhase] = useState<"capture" | "result">("capture");
  const [flashKey, setFlashKey] = useState(0);

  // Auto-cycle: capture → shutter flash → result → capture …
  // Paused when the mockup is scrolled out of view.
  useEffect(() => {
    if (!inView) return;
    if (phase === "capture") {
      const id = setTimeout(() => {
        setFlashKey((k) => k + 1);
        setPhase("result");
      }, 2600);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setPhase("capture"), 4400);
    return () => clearTimeout(id);
  }, [phase, inView]);

  return (
    <MockupFrame label="CAPTURE · Mr.🆖 ProReader" frameRef={ref}>
      <div className="relative min-h-[18rem] sm:min-h-[20rem]">
        {/* shutter flash — replays on each capture → result transition */}
        {flashKey > 0 && (
          <motion.div
            key={flashKey}
            className="pointer-events-none absolute inset-0 z-30 rounded-xl bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.5, times: [0, 0.35, 1], ease: "easeOut" }}
            aria-hidden
          />
        )}

        <AnimatePresence initial={false}>
          {phase === "capture" ? (
            <motion.div
              key="capture"
              className="absolute inset-0 flex flex-col justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <CaptureBeat />
            </motion.div>
          ) : (
            <motion.div
              key="result"
              className="absolute inset-0 flex flex-col justify-center"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <ResultBeat />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MockupFrame>
  );
}

/* Camera viewfinder beat — a printed exam paper framed by focus brackets
   while an OCR scan line sweeps across it. */
function CaptureBeat() {
  return (
    <div className="w-full">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--lp-ink-soft)]">
          <Camera className="h-3.5 w-3.5" /> Scanner
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-[var(--lp-accent)]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--lp-accent)] opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--lp-accent)]" />
          </span>
          Scanning…
        </span>
      </div>

      {/* camera viewport */}
      <div className="relative overflow-hidden rounded-xl border border-[var(--lp-rule)] bg-gradient-to-br from-[var(--lp-paper-2)] to-[var(--lp-paper)] p-4">
        {/* focus corner brackets */}
        <span className="pointer-events-none absolute left-3 top-3 h-5 w-5 rounded-tl border-l-2 border-t-2 border-[var(--lp-accent)]" />
        <span className="pointer-events-none absolute right-3 top-3 h-5 w-5 rounded-tr border-r-2 border-t-2 border-[var(--lp-accent)]" />
        <span className="pointer-events-none absolute bottom-3 left-3 h-5 w-5 rounded-bl border-b-2 border-l-2 border-[var(--lp-accent)]" />
        <span className="pointer-events-none absolute bottom-3 right-3 h-5 w-5 rounded-br border-b-2 border-r-2 border-[var(--lp-accent)]" />

        {/* the printed exam paper */}
        <div
          className="relative mx-auto max-w-[260px] rounded-[3px] bg-[var(--lp-surface)] px-4 py-3 shadow-[0_8px_24px_-12px_rgba(23,22,26,0.25)]"
          style={{ transform: "rotate(-1.5deg)" }}
        >
          <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--lp-ink-soft)]">
            HKDSE · English Language · Paper 1
          </p>
          <div className="my-1.5 h-px bg-[var(--lp-rule)]" />
          <p className="font-display text-[12px] leading-snug text-[var(--lp-ink-soft)]">
            Deep beneath the surface, currents stir the cold darkness. Here, luminous creatures drift past one another — their soft glow the only light for miles around.
          </p>
        </div>

        {/* OCR scan line — one sweep per capture beat. CSS (not motion) so it
            runs on the very first mount despite AnimatePresence initial={false}. */}
        <div
          className="lp-scan-line pointer-events-none absolute left-4 right-4 h-[2px] rounded-full bg-[var(--lp-accent)] shadow-[0_0_10px_2px_var(--lp-accent)]"
          aria-hidden
        />
      </div>

      {/* shutter */}
      <div className="mt-4 flex items-center justify-center" aria-hidden>
        <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--lp-accent)]">
          <span className="h-7 w-7 rounded-full bg-[var(--lp-accent)]" />
        </div>
      </div>
    </div>
  );
}

/* Result beat — the captured passage now live in-app, with one word
   highlighted and a glossary popover. */
function ResultBeat() {
  const [showPopover, setShowPopover] = useState(false);

  // Reveal the popover once the `lp-marker--draw` highlighter finishes drawing
  // on "luminous" (0.5s delay + 0.9s duration, defined in globals.css). Under
  // reduced motion the draw is instant, so show the popover right away.
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShowPopover(true);
      return;
    }
    const id = setTimeout(() => setShowPopover(true), 1400);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="w-full">
      {/* provenance row — ties the result back to the captured photo */}
      <div className="mb-3 flex items-center gap-1.5 text-[10px] text-[var(--lp-ink-soft)]">
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--lp-rule)] bg-[var(--lp-paper-2)] px-2 py-0.5 font-medium text-[var(--lp-ink)]">
          <Check className="h-3 w-3 text-[var(--lp-accent)]" /> Extracted from photo
        </span>
        <span className="ml-auto inline-flex items-center gap-1 font-mono">
          <Highlighter className="h-3 w-3" /> tap any word
        </span>
      </div>

      <p className="font-display text-lg leading-relaxed text-[var(--lp-ink)] sm:text-xl">
        Deep beneath the surface, currents stir the cold darkness. Here,{" "}
        <span className="lp-marker lp-marker--draw relative whitespace-nowrap font-semibold">
          luminous
          <span className="absolute -top-1 -right-3 h-2 w-2 rounded-full bg-[var(--lp-highlight)] ring-2 ring-[var(--lp-surface)]" />
        </span>{" "}
        creatures drift past one another — their soft glow the only light for
        miles around.
      </p>

      {/* glossary popover — mirrors the Chapter 02 Text Analysis (Original) popover.
          Always rendered to reserve its space; revealed once the highlight finishes. */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: showPopover ? 1 : 0, y: showPopover ? 0 : 8 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative mx-auto mt-5 w-[calc(100%-1rem)] max-w-[300px] rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-3 shadow-lg"
      >
        {/* popover arrow pointing up */}
        <div className="absolute -top-1.5 left-10 h-3 w-3 rotate-45 border-l border-t border-[var(--lp-rule)] bg-[var(--lp-surface)]" />
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-sm font-bold text-[var(--lp-ink)]">luminous</span>
            <span className="ml-1.5 text-[10px] text-[var(--lp-ink-soft)]">lu·mi·nous</span>
            <Volume2 className="ml-1 inline h-3 w-3 text-[var(--lp-ink-soft)]" />
          </div>
          <span className="shrink-0 rounded bg-[var(--lp-paper-2)] px-1.5 py-0.5 text-[9px] text-[var(--lp-ink-soft)]">
            adjective
          </span>
        </div>
        <div className="mt-1 text-sm font-semibold text-[var(--lp-accent)]">發光的；明亮的</div>
        <div className="text-[11px] text-[var(--lp-ink-soft)]">
          full of light; brightly glowing
        </div>
        <div className="mt-2 border-t border-[var(--lp-rule)] pt-2 text-[10px] italic text-[var(--lp-ink-soft)]">
          “The luminous jellyfish pulsed gently in the dark water.”
        </div>
      </motion.div>
    </div>
  );
}

/* ── 2. ENCOUNTER — Select Text: three clickable sources ── */
type SourceTab = "upload" | "repository" | "ai";

export function UploadMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
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

  // Auto-cycle the tabs every 5s. Re-runs on every `tab` change (including
  // manual clicks), so each tab gets a full 5s before advancing. Paused when
  // the mockup is scrolled out of view.
  useEffect(() => {
    if (!inView) return;
    const order: SourceTab[] = ["upload", "repository", "ai"];
    const id = setTimeout(() => {
      setTab((cur) => order[(order.indexOf(cur) + 1) % order.length]);
    }, 5000);
    return () => clearTimeout(id);
  }, [tab, inView]);

  return (
    <MockupFrame label="SELECT TEXT · Mr.🆖 ProReader" frameRef={ref}>
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
        {/* user (right) */}
        <div className="flex flex-row-reverse gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white dark:bg-blue-600">
            <User className="h-4 w-4" />
          </span>
          <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-blue-500 px-3 py-2 text-sm text-white dark:bg-blue-600">
            Maybe recycling rates will go up as factories get better at it?
          </div>
        </div>
        {/* assistant (left) */}
        <div className="flex gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--lp-rule)] bg-[var(--lp-paper-2)] text-[var(--lp-ink-soft)]">
            <Bot className="h-4 w-4" />
          </span>
          <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-[var(--lp-rule)] bg-[var(--lp-paper-2)] px-3 py-2 text-sm leading-relaxed text-[var(--lp-ink)]">
            Exactly! ✅ As technology improves and{" "}
            <em className="not-italic font-semibold text-[var(--lp-accent)]">economies of scale</em>{" "}
            kick in, costs drop and recycling becomes more viable. Can you find the sentence in
            paragraph 3 that hints at this?
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

/* ── 5a. MASTER — reading test results screen (faithful, static) ── */
// Mirrors the completed-test view in ReadingTest.tsx: the TestResultScreen
// tier card + skill breakdown + action-button row.
export function ReadingTestResultsMockup() {
  const score = 85;
  const earnedPoints = 17;
  const totalPoints = 20;
  const scoreColor = (s: number) =>
    s >= 80 ? "text-green-600 dark:text-green-400" : s >= 60 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400";

  // Faithful copy of TEST_TIER_CONFIG.master (ReadingTest.tsx)
  const tier = {
    emoji: "👑",
    Icon: Crown,
    badgeBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    gradient: "linear-gradient(135deg, rgba(255,237,160,0.15) 0%, rgba(251,191,36,0.08) 50%, rgba(255,237,160,0.15) 100%)",
  };
  const TierIcon = tier.Icon;

  const skills = [
    { l: "Main Idea", correct: 10, count: 10 },
    { l: "Vocabulary in Context", correct: 8, count: 10 },
    { l: "Inference", correct: 3, count: 5 },
    { l: "Referencing", correct: 4, count: 5 },
  ];

  return (
    <MockupFrame label="READING TEST · Mr.🆖 ProReader">
      <div className="rounded-md border p-4">
        {/* Header row */}
        <div className="mb-4 flex items-center justify-between border-b pb-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            Reading Test
          </h3>
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
            <RotateCcw className="h-4 w-4" />
            <span>Retry</span>
          </span>
        </div>

        <div className="space-y-6">
          {/* TestResultScreen card — faithful */}
          <div
            className="relative overflow-hidden rounded-2xl border-2 p-6 text-center shadow-2xl ring-4 ring-amber-400/60"
            style={{ background: tier.gradient }}
          >
            <div className="text-5xl">{tier.emoji}</div>
            <div className="mt-1">
              <div className="text-5xl font-black text-amber-600 dark:text-amber-400">{score}%</div>
              <p className="mt-1 text-sm text-muted-foreground">Excellent!</p>
              <p className="text-sm text-muted-foreground">{earnedPoints} / {totalPoints} points</p>
            </div>
            <div className="mt-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${tier.badgeBg}`}>
                <TierIcon className="h-3.5 w-3.5" />
                Master
              </span>
            </div>
          </div>

          {/* Skill breakdown — faithful */}
          <div className="rounded-lg bg-muted p-4">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <h4 className="font-medium">Skill Breakdown</h4>
            </div>
            <div className="space-y-3">
              {skills.map((s) => {
                const pct = Math.round((s.correct / s.count) * 100);
                return (
                  <div key={s.l}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{s.l}</span>
                      <span className={`font-medium ${scoreColor(pct)}`}>
                        {s.correct}/{s.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted-foreground/20">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons — faithful */}
          <div className="flex flex-wrap justify-center gap-2">
            <span className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium">
              <Eye className="mr-1.5 h-4 w-4" /> Review Answers
            </span>
            <span className="inline-flex items-center rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
              <Target className="mr-1.5 h-4 w-4" /> Practice Skills (3)
            </span>
            <span className="inline-flex items-center rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
              <RotateCcw className="mr-1.5 h-4 w-4" /> Retry Missed (2)
            </span>
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

/* ── 5b. MASTER — targeted practice screen (faithful, static) ── */
// Mirrors the question-by-question in-progress quiz view in ReadingTest.tsx:
// progress bar + renderQuestion() MCQ card + prev/next nav.
export function TargetedPracticeMockup() {
  const options = [
    { letter: "A", text: "They have proof that costs will soon decrease." },
    { letter: "B", text: "They trust that time and experience will help.", selected: true },
    { letter: "C", text: "They plan to redesign the whole process themselves." },
    { letter: "D", text: "They believe the critics exaggerated the costs." },
  ];

  return (
    <MockupFrame label="READING TEST · Mr.🆖 ProReader">
      {/* Section — mirrors ReadingTest.tsx in-progress section */}
      <div className="rounded-md border p-4">
        {/* Header row */}
        <div className="mb-4 flex items-center justify-between border-b pb-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            Reading Test
          </h3>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground">
            <Languages className="h-4 w-4" />
          </span>
        </div>

        <div className="space-y-4 py-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Question 1 of 6</span>
              <span>Press →/←</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted-foreground/20">
              <div className="h-full rounded-full bg-primary" style={{ width: "17%" }} />
            </div>
          </div>

          {/* Question card — mirrors renderQuestion() */}
          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-start gap-3">
              <span className="font-bold text-primary">1.</span>
              <div className="flex-1">
                <div className="mb-1 flex flex-wrap gap-2">
                  <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">Multiple Choice</span>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">Inference</span>
                </div>
                <p className="font-medium">
                  What can we infer about why the defenders believe recycling will improve?
                </p>
              </div>
            </div>
            <div className="space-y-2 pl-6">
              {options.map((opt) => (
                <div key={opt.letter} className="flex items-center gap-2">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      opt.selected ? "border-primary" : "border-input"
                    }`}
                  >
                    {opt.selected && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </span>
                  <span className="text-sm">{opt.letter}) {opt.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs opacity-50">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Previous
            </span>
            <span className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
              Next <ChevronRight className="ml-1.5 h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

/* ── 5c. MASTER — achievements screen (faithful, static) ── */
// Mirrors AchievementsTab + AchievementMedal: overall progress banner + medal
// grid with progress rings, milestone dots. Uses real ACHIEVEMENT_CONFIG types.
export function AchievementsMockup() {
  // Color maps — mirror AchievementMedal.tsx
  const colorBg: Record<string, string> = {
    blue: "bg-blue-500", green: "bg-green-500", indigo: "bg-indigo-500", cyan: "bg-cyan-500",
    purple: "bg-purple-500", amber: "bg-amber-500", teal: "bg-teal-500", pink: "bg-pink-500",
  };
  const colorRing: Record<string, string> = {
    blue: "stroke-blue-500", green: "stroke-green-500", indigo: "stroke-indigo-500", cyan: "stroke-cyan-500",
    purple: "stroke-purple-500", amber: "stroke-amber-500", teal: "stroke-teal-500", pink: "stroke-pink-500",
  };
  const colorText: Record<string, string> = {
    blue: "text-blue-600 dark:text-blue-400", green: "text-green-600 dark:text-green-400",
    indigo: "text-indigo-600 dark:text-indigo-400", cyan: "text-cyan-600 dark:text-cyan-400",
    purple: "text-purple-600 dark:text-purple-400", amber: "text-amber-600 dark:text-amber-400",
    teal: "text-teal-600 dark:text-teal-400", pink: "text-pink-600 dark:text-pink-400",
  };
  const colorGlow: Record<string, string> = {
    blue: "shadow-blue-400/50", green: "shadow-green-400/50", indigo: "shadow-indigo-400/50", cyan: "shadow-cyan-400/50",
    purple: "shadow-purple-400/50", amber: "shadow-amber-400/50", teal: "shadow-teal-400/50", pink: "shadow-pink-400/50",
  };

  // Real achievement types from ACHIEVEMENT_CONFIG (achievements.ts)
  const medals = [
    { type: "Avid Reader", icon: BookOpen, color: "blue", unlocked: true, progress: 100, current: 12, nextTarget: 0, label: "Read 10 texts", dotsUnlocked: 2 },
    { type: "Word Collector", icon: BookText, color: "green", unlocked: true, progress: 100, current: 72, nextTarget: 0, label: "Collect 50 words", dotsUnlocked: 1 },
    { type: "Flashcard Reviews", icon: Layers, color: "indigo", unlocked: false, progress: 64, current: 32, nextTarget: 50, label: "Review 50 cards", dotsUnlocked: 0 },
    { type: "Curious Learner", icon: Sparkles, color: "cyan", unlocked: false, progress: 47, current: 14, nextTarget: 30, label: "Ask 30 questions", dotsUnlocked: 0 },
  ];

  const totalUnlocked = 3;
  const totalMilestones = 105;
  const pct = Math.round((totalUnlocked / totalMilestones) * 100);

  return (
    <MockupFrame label="ACHIEVEMENTS · Mr.🆖 ProReader">
      <div className="space-y-4">
        {/* Overall progress banner */}
        <div className="rounded-xl border bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-orange-500/10 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-500/20">
                <Medal className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">Achievements</p>
                <p className="text-xs text-muted-foreground">Milestones you&apos;ve unlocked</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold tabular-nums text-yellow-600 dark:text-yellow-400">
                {totalUnlocked}
                <span className="text-sm font-normal text-muted-foreground">/{totalMilestones}</span>
              </p>
              <p className="text-xs text-muted-foreground">{pct}%</p>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {totalUnlocked} of {totalMilestones} milestones unlocked
          </p>
        </div>

        {/* Medal grid — faithful to AchievementMedal */}
        <div className="grid grid-cols-2 gap-3">
          {medals.map((m) => {
            const cBg = colorBg[m.color];
            const cRing = colorRing[m.color];
            const cText = colorText[m.color];
            const cGlow = colorGlow[m.color];
            const circ = 2 * Math.PI * 44;
            const offset = circ - (m.progress / 100) * circ;
            const Icon = m.icon;
            return (
              <div
                key={m.type}
                className={`relative flex flex-col items-center rounded-2xl border-2 p-3 ${
                  m.unlocked
                    ? "border-transparent bg-gradient-to-b from-card to-card/80 shadow-lg"
                    : "border-border/50 bg-card/60"
                }`}
              >
                {m.unlocked && (
                  <div className={`absolute inset-0 rounded-2xl opacity-10 blur-xl ${cBg}`} />
                )}
                {/* Medal circle with progress ring */}
                <div className="relative mb-2 h-16 w-16">
                  <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="44" fill="none" strokeWidth="5" className="stroke-muted-foreground/20" />
                    {m.unlocked ? (
                      <circle cx="50" cy="50" r="44" fill="none" strokeWidth="5" className={cRing} />
                    ) : (
                      <circle
                        cx="50" cy="50" r="44" fill="none" strokeWidth="5"
                        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                        className={cRing}
                      />
                    )}
                  </svg>
                  <div
                    className={`absolute inset-2 flex items-center justify-center rounded-full ${
                      m.unlocked ? `${cBg} shadow-lg ${cGlow}` : "bg-muted"
                    }`}
                  >
                    {m.unlocked ? (
                      <Icon className="h-7 w-7 text-white" />
                    ) : (
                      <Lock className="h-6 w-6 text-muted-foreground/50" />
                    )}
                  </div>
                  {m.unlocked && (
                    <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5">
                      <CheckCircle2 className={`h-5 w-5 ${cText}`} />
                    </div>
                  )}
                </div>
                <p
                  className={`text-center text-sm font-bold leading-tight ${
                    m.unlocked ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {m.type}
                </p>
                <p
                  className={`text-center text-xs leading-tight ${
                    m.unlocked ? cText : "text-muted-foreground/70"
                  }`}
                >
                  {m.label}
                </p>
                {/* Progress bar + count */}
                <div className="mt-2 w-full">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${m.unlocked ? cBg : "bg-muted-foreground/40"}`}
                      style={{ width: `${m.progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-center text-[10px] text-muted-foreground">
                    {m.unlocked ? `${m.dotsUnlocked} unlocked` : `${m.current} / ${m.nextTarget}`}
                  </p>
                </div>
                {/* Milestone dots */}
                <div className="mt-2 flex justify-center gap-1">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full ${
                        i < m.dotsUnlocked ? cBg : "bg-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MockupFrame>
  );
}

/* ── 5d. MASTER — leaderboard ranking screen (faithful, static) ── */
// Mirrors LeaderboardTable: sort bar + ranked rows with medals, avatars,
// "You" highlight, and rank-trend arrows.
export function LeaderboardMockup() {
  // Leaderboard rows — mirror LeaderboardTable.tsx structure.
  // School-wide ranking: a larger pool, "You" mid-pack at #7.
  // `className` is shown under each name when the school scope is active.
  // Leaderboard rows — mirror LeaderboardTable.tsx structure.
  // School-wide ranking, top-5 view with "You" on the podium at #3.
  // `className` is shown under each name when the school scope is active.
  const rows = [
    { rank: 1, name: "Aisha N.", className: "S5 Gp1", score: 1420, you: false, prior: 1, medal: true, medalColor: "text-yellow-400", rowBg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800" },
    { rank: 2, name: "Diego S.", className: "S6 Gp2", score: 1340, you: false, prior: 4, medal: true, medalColor: "text-yellow-400", rowBg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800" },
    { rank: 3, name: "Jamie C.", className: "S4 Gp1", score: 1290, you: true, prior: 5, medal: true, medalColor: "", rowBg: "" },
    { rank: 4, name: "Hana W.", className: "S4 Gp1", score: 1200, you: false, prior: 4, medal: false, medalColor: "", rowBg: "" },
    { rank: 5, name: "Lucas P.", className: "S5 Gp2", score: 1140, you: false, prior: 8, medal: false, medalColor: "", rowBg: "" },
  ];
  const medalEmoji = (r: number) => (r === 1 ? "🥇" : r === 2 ? "🥈" : "🥉");

  const sortCols = [
    { key: "weekly_score", label: "Score", active: true },
    { key: "reading_streak_days", label: "Streak", active: false },
    { key: "avg_test_score", label: "Test", active: false },
    { key: "total_vocabulary_words", label: "Vocab", active: false },
    { key: "total_flashcard_reviews", label: "Flashcards", active: false },
    { key: "improvement_score", label: "Improvement", active: false },
  ];

  return (
    <MockupFrame label="LEADERBOARD · Mr.🆖 ProReader">
      <div className="space-y-2.5">
        {/* Header — mirrors LeaderboardPage header */}
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <div>
            <h2 className="text-base font-bold leading-tight">Leaderboard</h2>
            <p className="text-[10px] text-muted-foreground">See where you rank across your whole school</p>
          </div>
        </div>

        {/* Period toggle — Weekly (active) / All-Time */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <span className="flex flex-1 items-center justify-center gap-1 rounded-md bg-background py-1 text-xs font-medium text-foreground shadow-sm">
            <CalendarRange className="h-3.5 w-3.5" />
            Weekly
          </span>
          <span className="flex flex-1 items-center justify-center gap-1 rounded-md py-1 text-xs font-medium text-muted-foreground">
            <InfinityIcon className="h-3.5 w-3.5" />
            All-Time
          </span>
        </div>

        {/* Week selector — Last Week / This Week / Next Week */}
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" />
            Last Week
          </span>
          <span className="font-medium tabular-nums">This Week</span>
          <span className="flex cursor-not-allowed items-center gap-1 text-muted-foreground/40">
            Next Week
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </span>
        </div>

        {/* Scope tabs — My Class / My School (active) / Global */}
        <div className="flex gap-2">
          <span className="flex flex-1 items-center justify-center gap-1 rounded-lg border-2 border-border py-1.5 text-xs font-medium text-muted-foreground">
            <Users className="h-3 w-3 shrink-0" />
            My Class
          </span>
          <span className="flex flex-1 items-center justify-center gap-1 rounded-lg border-2 border-primary bg-primary/10 py-1.5 text-xs font-medium text-primary">
            <School className="h-3 w-3 shrink-0" />
            My School
          </span>
          <span className="flex flex-1 items-center justify-center gap-1 rounded-lg border-2 border-border py-1.5 text-xs font-medium text-muted-foreground">
            <Globe className="h-3 w-3 shrink-0" />
            Global
          </span>
        </div>

        {/* Sort bar */}
        <div className="flex items-center gap-3 overflow-x-auto border-b px-2 pb-1">
          <span className="shrink-0 text-xs text-muted-foreground">Rank:</span>
          {sortCols.map((c) => (
            <span
              key={c.key}
              className={`flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs ${
                c.active ? "font-semibold text-primary" : "text-muted-foreground"
              }`}
            >
              {c.label}
              {c.active && <ChevronDown className="h-3 w-3" />}
            </span>
          ))}
        </div>
        {/* Entries */}
        {rows.map((r) => {
          const isYou = r.you;
          const isMedal = r.medal;
          const delta = r.prior - r.rank;
          return (
            <div
              key={r.rank}
              className={`flex items-center gap-3 rounded-xl border p-2.5 ${
                isYou
                  ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
                  : isMedal
                  ? r.rowBg
                  : "bg-card"
              }`}
            >
              {/* Rank */}
              <div className="w-8 shrink-0 text-center">
                {isMedal ? (
                  <span className="text-xl font-black">{medalEmoji(r.rank)}</span>
                ) : (
                  <span className="text-sm font-bold tabular-nums text-muted-foreground">#{r.rank}</span>
                )}
              </div>
              {/* Avatar */}
              <div className="shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                  {r.name.charAt(0)}
                </div>
              </div>
              {/* Name + class + rank trend */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`truncate text-sm font-semibold ${isYou ? "text-primary" : ""}`}>
                    {r.name}
                  </span>
                  {isYou && (
                    <span className="shrink-0 rounded-full bg-primary/20 px-1.5 py-0.5 text-xs font-medium text-primary">
                      You
                    </span>
                  )}
                </div>
                {/* Class name — shown under each student in the school scope */}
                <div className="truncate text-xs text-muted-foreground">{r.className}</div>
                <div className="mt-0.5">
                  {delta > 0 ? (
                    <span className="flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400">
                      <ChevronUp className="h-3 w-3" /> Up {delta}
                    </span>
                  ) : delta < 0 ? (
                    <span className="flex items-center gap-0.5 text-xs text-red-500">
                      <ChevronDown className="h-3 w-3" /> Down {Math.abs(delta)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Same</span>
                  )}
                </div>
              </div>
              {/* Primary stat */}
              <div className="shrink-0 text-right">
                <div
                  className={`text-base font-black tabular-nums ${
                    isYou ? "text-primary" : isMedal ? r.medalColor : ""
                  }`}
                >
                  {r.score.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Weekly Score</div>
              </div>
            </div>
          );
        })}
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

/* ── 8a. VOCABULARY — Words table screen (faithful, static) ── */
// Mirrors the My Vocabulary page with the Words tab active: page header (title +
// stat cards) + 7-tab strip + toolbar + sortable word table + pagination.
export function WordsTableMockup() {
  // Overview stat cards (word stats — the page header on the Words tab).
  const wordStats = [
    { label: "Total Words", value: "128", icon: BookMarked, color: "text-[var(--lp-ink)]", sub: "Own: 96 · Teacher: 32" },
    { label: "Due for Review", value: "14", icon: Clock, color: "text-orange-500", sub: null },
    { label: "Mastered", value: "47", icon: CheckCircle2, color: "text-green-500", sub: null },
    { label: "New Words", value: "21", icon: Brain, color: "text-blue-500", sub: null },
  ];

  // Full 7-tab strip matches the real page; static (Words active).
  const tabs = [
    { key: "table", label: "Words", icon: TableIcon },
    { key: "phrases", label: "Phrases", icon: Combine },
    { key: "flashcard", label: "Flashcard", icon: Layers },
    { key: "spelling", label: "Spelling", icon: SpellCheck },
    { key: "quiz", label: "Quiz", icon: ClipboardList },
    { key: "lists", label: "Review Lists", icon: ListPlus },
    { key: "history", label: "History", icon: History },
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
  const ratingDot: Record<string, string> = {
    easy: "bg-green-500", medium: "bg-yellow-500", hard: "bg-red-500", none: "bg-gray-300 dark:bg-gray-600",
  };
  const ratingLabel: Record<string, string> = { easy: "Easy", medium: "Medium", hard: "Hard", none: "—" };

  type Level = "0" | "1" | "2" | "3" | "4" | "5";
  type Rating = "easy" | "medium" | "hard" | "none";
  type Source = "own" | "teacher";

  const wordRows: { word: string; pos: string; def: string; zh: string; source: Source; rating: Rating; level: Level }[] = [
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
        {wordStats.map((s) => (
          <div key={s.label} className="rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-2">
            <div className="flex items-center gap-1 text-[var(--lp-ink-soft)]">
              <s.icon className={`h-3 w-3 ${s.color}`} />
              <span className="truncate text-[8px] uppercase tracking-wide">{s.label}</span>
            </div>
            <div className={`mt-0.5 font-display text-lg font-bold ${s.color}`}>{s.value}</div>
            {s.sub && <div className="text-[7px] leading-tight text-[var(--lp-ink-soft)]">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* tab strip — 7 tabs match the real page; Words active */}
      <div className="mt-3 flex flex-wrap gap-1 border-b border-[var(--lp-rule)]">
        {tabs.map((tb) => {
          const active = tb.key === "table";
          return (
            <span
              key={tb.key}
              className={`flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium -mb-px border-b-2 transition-colors ${
                active
                  ? "border-[var(--lp-accent)] text-[var(--lp-accent)]"
                  : "border-transparent text-[var(--lp-ink-soft)]"
              }`}
            >
              <tb.icon className="h-3 w-3" />
              {tb.label}
            </span>
          );
        })}
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

      {/* table */}
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
            {wordRows.map((r, i) => (
              <tr
                key={r.word}
                className={`text-[10px] text-[var(--lp-ink)] ${i !== wordRows.length - 1 ? "border-b border-[var(--lp-rule)]" : ""}`}
              >
                <td className="px-2 py-1.5 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <Volume2 className="h-3 w-3 text-[var(--lp-ink-soft)]" />
                    {r.word}
                  </span>
                </td>
                <td className="px-1.5 py-1.5">
                  <span className="italic text-[var(--lp-ink-soft)]">{r.pos}</span>
                </td>
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

      {/* pagination */}
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

/* ── 8b. VOCABULARY — Spelling game setup screen (faithful, static) ── */
// Mirrors the My Vocabulary page with the Spelling tab active: page header +
// 7-tab strip (Spelling active) + the frozen initial spelling setup (Solo,
// Listen & Type, Medium difficulty, Time Challenge on, Start Game).
export function SpellingSetupMockup() {
  const wordStats = [
    { label: "Total Words", value: "128", icon: BookMarked, color: "text-[var(--lp-ink)]", sub: "Own: 96 · Teacher: 32" },
    { label: "Due for Review", value: "14", icon: Clock, color: "text-orange-500", sub: null },
    { label: "Mastered", value: "47", icon: CheckCircle2, color: "text-green-500", sub: null },
    { label: "New Words", value: "21", icon: Brain, color: "text-blue-500", sub: null },
  ];

  const tabs = [
    { key: "table", label: "Words", icon: TableIcon },
    { key: "phrases", label: "Phrases", icon: Combine },
    { key: "flashcard", label: "Flashcard", icon: Layers },
    { key: "spelling", label: "Spelling", icon: SpellCheck },
    { key: "quiz", label: "Quiz", icon: ClipboardList },
    { key: "lists", label: "Review Lists", icon: ListPlus },
    { key: "history", label: "History", icon: History },
  ];

  const spellModes = [
    { key: "listen-type", label: "Listen & Type", icon: Volume2, active: true },
    { key: "scramble", label: "Letter Scramble", icon: Shuffle, active: false },
    { key: "fill-blanks", label: "Fill Blanks", icon: Keyboard, active: false },
    { key: "mixed", label: "Mixed Mode", icon: HelpCircle, active: false },
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
        {wordStats.map((s) => (
          <div key={s.label} className="rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-2">
            <div className="flex items-center gap-1 text-[var(--lp-ink-soft)]">
              <s.icon className={`h-3 w-3 ${s.color}`} />
              <span className="truncate text-[8px] uppercase tracking-wide">{s.label}</span>
            </div>
            <div className={`mt-0.5 font-display text-lg font-bold ${s.color}`}>{s.value}</div>
            {s.sub && <div className="text-[7px] leading-tight text-[var(--lp-ink-soft)]">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* tab strip — 7 tabs match the real page; Spelling active */}
      <div className="mt-3 flex flex-wrap gap-1 border-b border-[var(--lp-rule)]">
        {tabs.map((tb) => {
          const active = tb.key === "spelling";
          return (
            <span
              key={tb.key}
              className={`flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium -mb-px border-b-2 transition-colors ${
                active
                  ? "border-[var(--lp-accent)] text-[var(--lp-accent)]"
                  : "border-transparent text-[var(--lp-ink-soft)]"
              }`}
            >
              <tb.icon className="h-3 w-3" />
              {tb.label}
            </span>
          );
        })}
      </div>

      {/* ── SPELLING setup ── */}
      <div className="mt-3 flex flex-col gap-3">
        {/* title */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <SpellCheck className="h-4 w-4 text-[var(--lp-accent)]" />
            <span className="font-display text-sm font-semibold text-[var(--lp-ink)]">Spelling Challenge</span>
            <HelpCircle className="h-3 w-3 text-[var(--lp-ink-soft)]" />
          </div>
          <p className="text-[9px] text-[var(--lp-ink-soft)]">Practice spelling 128 words</p>
        </div>

        {/* play mode: Solo (selected) | Multiplayer Battle */}
        <div>
          <div className="mb-1.5 text-[9px] font-medium text-[var(--lp-ink-soft)]">Choose Your Challenge</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative rounded-lg border-2 border-[var(--lp-accent)] bg-[var(--lp-accent)]/10 p-2">
              <CheckCircle2 className="absolute right-1 top-1 h-3 w-3 text-[var(--lp-accent)]" />
              <div className="mb-1 flex h-6 w-6 items-center justify-center rounded bg-[var(--lp-accent)]/15">
                <User className="h-3.5 w-3.5 text-[var(--lp-accent)]" />
              </div>
              <div className="text-[10px] font-semibold text-[var(--lp-accent)]">Solo Practice</div>
              <div className="text-[8px] text-[var(--lp-ink-soft)]">At your own pace</div>
            </div>
            <div className="relative rounded-lg border-2 border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-500/10 to-transparent p-2">
              <span className="absolute right-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-fuchsia-500 px-1 py-0.5 text-[7px] font-bold text-white">
                <span className="h-1 w-1 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
              <div className="mb-1 flex h-6 w-6 items-center justify-center rounded bg-fuchsia-500/15">
                <Swords className="h-3.5 w-3.5 text-fuchsia-500" />
              </div>
              <div className="text-[10px] font-semibold text-fuchsia-600 dark:text-fuchsia-400">Multiplayer Battle</div>
              <div className="text-[8px] text-[var(--lp-ink-soft)]">Real-time arena</div>
            </div>
          </div>
        </div>

        {/* game mode grid */}
        <div>
          <div className="mb-1.5 text-[9px] font-medium text-[var(--lp-ink-soft)]">Select Game Mode</div>
          <div className="grid grid-cols-2 gap-1.5">
            {spellModes.map((m) => (
              <div
                key={m.key}
                className={`flex items-center gap-1.5 rounded-md border-2 px-2 py-1.5 ${
                  m.active
                    ? "border-[var(--lp-accent)] bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]"
                    : "border-[var(--lp-rule)] text-[var(--lp-ink-soft)]"
                }`}
              >
                <m.icon className="h-3 w-3" />
                <span className="text-[9px]">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* difficulty */}
        <div>
          <div className="mb-1.5 text-[9px] font-medium text-[var(--lp-ink-soft)]">Select Difficulty</div>
          <div className="grid grid-cols-3 gap-1.5">
            {["Easy", "Medium", "Hard"].map((d) => (
              <div
                key={d}
                className={`rounded-md border-2 px-2 py-1.5 text-center text-[10px] font-medium ${
                  d === "Medium"
                    ? "border-[var(--lp-accent)] bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]"
                    : "border-[var(--lp-rule)] text-[var(--lp-ink-soft)]"
                }`}
              >
                {d}
              </div>
            ))}
          </div>
        </div>

        {/* time challenge toggle */}
        <div className="flex items-center justify-between rounded-md border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/40 px-2 py-1.5">
          <div className="flex items-center gap-1.5">
            <Timer className="h-3 w-3 text-[var(--lp-ink-soft)]" />
            <span className="text-[10px] text-[var(--lp-ink)]">Time Challenge</span>
          </div>
          <span className="relative h-3.5 w-6 rounded-full bg-[var(--lp-accent)]">
            <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-white" />
          </span>
        </div>

        {/* start button */}
        <div className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--lp-accent)] px-3 py-2 text-[11px] font-semibold text-white shadow">
          <Play className="h-3.5 w-3.5" />
          Start Game
        </div>
      </div>
    </MockupFrame>
  );
}

/* ════════════════════════════════════════════════════════════════
   PRACTICE carousel slides (Chapter 04) — 10 faithful mockups.
   Each slide is a standalone view of a real in-app screen.
   ════════════════════════════════════════════════════════════════ */

/* Shared chrome for the flashcard slides: toolbar + progress row */
function FlashcardChrome() {
  return (
    <>
      {/* toolbar — Prioritize hard words · Shuffle · Regenerate */}
      <div className="mb-2 flex flex-wrap items-center justify-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2 py-1 text-[10px] font-medium text-[var(--lp-ink)]">
          <Target className="h-3 w-3 text-[var(--lp-ink-soft)]" /> Prioritize hard
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2 py-1 text-[10px] font-medium text-[var(--lp-ink)]">
          <Shuffle className="h-3 w-3 text-[var(--lp-ink-soft)]" /> Shuffle
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2 py-1 text-[10px] text-[var(--lp-ink-soft)]">
          <RotateCcw className="h-3 w-3" /> Regenerate
        </span>
      </div>
      {/* progress row — remaining counter + SRS stats + bar */}
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] text-[var(--lp-ink-soft)]">
        <span>3 / 12 remaining</span>
        <span className="flex items-center gap-1.5">
          <span className="text-rose-500">Again: 1</span>
          <span className="text-[var(--lp-rule)]">|</span>
          <span className="text-orange-500">Hard: 0</span>
          <span className="text-[var(--lp-rule)]">|</span>
          <span className="text-blue-500">Good: 2</span>
          <span className="text-[var(--lp-rule)]">|</span>
          <span className="text-green-500">Easy: 9</span>
        </span>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--lp-rule)]">
        <div className="h-full rounded-full bg-gradient-to-r from-[var(--lp-accent)] to-[var(--lp-accent)]/60" style={{ width: "75%" }} />
      </div>
    </>
  );
}

/* ── Slide 1. Flashcard — FRONT ── */
export function FlashcardFrontMockup() {
  return (
    <MockupFrame label="FLASHCARDS · Mr.🆖 ProReader">
      <FlashcardChrome />
      {/* card — front */}
      <div className="flex h-64 w-full flex-col overflow-hidden rounded-xl border-2 border-[var(--lp-rule)] bg-gradient-to-br from-[var(--lp-surface)] via-[var(--lp-surface)] to-[var(--lp-accent)]/5 shadow-lg">
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <div className="flex items-center gap-2">
            <span className="font-display text-4xl font-extrabold text-[var(--lp-ink)]">flourish</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--lp-accent)]/10">
              <Volume2 className="h-4 w-4 text-[var(--lp-ink-soft)]" />
            </span>
          </div>
          <span className="mt-2 font-mono text-base text-[var(--lp-ink-soft)]">flour·ish</span>
          <span className="mt-2 rounded-full bg-[var(--lp-accent)]/10 px-3 py-1 text-sm font-medium text-[var(--lp-accent)]">
            verb
          </span>
        </div>
        <span className="pb-4 text-center text-[10px] text-[var(--lp-ink-soft)]">
          Click to flip
        </span>
      </div>
    </MockupFrame>
  );
}

/* ── Slide 2. Flashcard — BACK ── */
export function FlashcardBackMockup() {
  return (
    <MockupFrame label="FLASHCARDS · Mr.🆖 ProReader">
      <FlashcardChrome />
      {/* card — back */}
      <div className="relative max-h-72 w-full overflow-hidden rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-[var(--lp-surface)] via-[var(--lp-surface)] to-emerald-100 p-3 shadow-lg dark:border-emerald-800 dark:to-emerald-950/50">
        <div className="flex items-center gap-2">
          <span className="font-display text-xl font-extrabold text-[var(--lp-ink)]">flourish</span>
          <Volume2 className="h-4 w-4 text-[var(--lp-ink-soft)]" />
          <span className="font-mono text-[10px] text-[var(--lp-ink-soft)]">flour·ish</span>
          <span className="ml-auto rounded-full bg-[var(--lp-accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--lp-accent)]">
            verb
          </span>
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="rounded-lg bg-[var(--lp-paper-2)] p-2">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--lp-ink-soft)]">English Definition</p>
            <p className="text-[11px] leading-snug text-[var(--lp-ink)]">to grow or develop successfully; to thrive</p>
          </div>
          <div className="rounded-lg bg-[var(--lp-paper-2)] p-2">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--lp-ink-soft)]">中文解釋</p>
            <p className="text-[11px] leading-snug text-[var(--lp-ink)]">茁壯成長；繁榮</p>
          </div>
          <div className="rounded-lg bg-[var(--lp-paper-2)] p-2">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--lp-ink-soft)]">Example 例句</p>
            <p className="text-[11px] leading-snug italic text-[var(--lp-ink)]">
              “They predicted recycling would{" "}
              <span className="not-italic font-semibold text-[var(--lp-accent)]">flourish</span> as the industry matured.”
            </p>
          </div>
        </div>
      </div>
      {/* SRS rating buttons */}
      <div className="mt-3">
        <p className="mb-1.5 text-center text-[10px] text-[var(--lp-ink-soft)]">How well did you know this?</p>
        <div className="grid grid-cols-4 gap-1.5">
          <span className="rounded-lg border border-rose-300 px-2 py-1.5 text-center text-[11px] font-semibold text-rose-600">Again</span>
          <span className="rounded-lg border border-orange-300 px-2 py-1.5 text-center text-[11px] font-semibold text-orange-600">Hard</span>
          <span className="rounded-lg border border-blue-300 px-2 py-1.5 text-center text-[11px] font-semibold text-blue-600">Good</span>
          <span className="rounded-lg border border-green-300 px-2 py-1.5 text-center text-[11px] font-semibold text-green-600">Easy</span>
        </div>
      </div>
    </MockupFrame>
  );
}

/* Shared header for the spelling slides — counter · streak · hint · timer + bar */
function SpellingHeader({ mode }: { mode: string }) {
  return (
    <>
      <div className="mb-1.5 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2 text-[var(--lp-ink-soft)]">
          <span>3 / 10</span>
          <span className="inline-flex items-center gap-0.5 font-semibold text-orange-500">
            <Flame className="h-3.5 w-3.5 animate-pulse" />4
          </span>
        </div>
        <div className="flex items-center gap-2 text-[var(--lp-ink-soft)]">
          <span className="inline-flex items-center gap-0.5">
            <Lightbulb className="h-3.5 w-3.5" />3
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Timer className="h-3.5 w-3.5" />18s
          </span>
        </div>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--lp-rule)]">
        <div className="h-full rounded-full bg-[var(--lp-accent)]" style={{ width: "30%" }} />
      </div>
      <div className="mb-2 text-center">
        <span className="rounded-full bg-[var(--lp-rule)]/60 px-2 py-0.5 text-[10px] text-[var(--lp-ink-soft)]">{mode}</span>
      </div>
    </>
  );
}

/* Shared bottom score row for the spelling slides */
function SpellingScoreRow() {
  return (
    <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-[var(--lp-ink-soft)]">
      <span>Score:</span>
      <span className="font-semibold text-[var(--lp-ink)]">340</span>
      <span className="text-[var(--lp-rule)]">|</span>
      <Flame className="h-3.5 w-3.5 text-orange-500" />
      <span className="font-semibold text-[var(--lp-ink)]">4</span>
    </div>
  );
}

/* ── Slide 3. Spelling — Listen & Type ── */
export function SpellingListenTypeMockup() {
  return (
    <MockupFrame label="SPELLING · Mr.🆖 ProReader">
      <SpellingHeader mode="Listen & Type" />
      <div className="rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-4">
        <div className="flex flex-col items-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--lp-accent)]/10">
            <Volume2 className="h-7 w-7 text-[var(--lp-accent)]" />
          </span>
          <p className="mt-2 text-[11px] text-[var(--lp-ink-soft)]">Click to hear the word</p>
          {/* hint-revealed letters */}
          <p className="mt-2 font-mono text-base tracking-[0.3em] text-[var(--lp-ink)]">_ h _ _ _ _</p>
          <div className="mt-3 w-full rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/40 px-3 py-2.5 text-center text-sm text-[var(--lp-ink-soft)]">
            Type the word you hear...
          </div>
        </div>
      </div>
      <SpellingScoreRow />
    </MockupFrame>
  );
}

/* ── Slide 4. Spelling — Fill Blanks ── */
export function SpellingFillBlanksMockup() {
  return (
    <MockupFrame label="SPELLING · Mr.🆖 ProReader">
      <SpellingHeader mode="Fill Blanks" />
      <div className="rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-4">
        <p className="mb-2 flex items-center justify-center gap-1 text-center text-[11px] text-[var(--lp-ink-soft)]">
          <Eye className="h-3 w-3" /> the process by which plants use sunlight · 光合作用
        </p>
        {/* word display — letters with blanks */}
        <div className="flex justify-center gap-0.5 font-mono text-lg tracking-wider">
          {["p", "h", "o", "t", "_", "_", "_", "_", "t", "h", "_", "s", "_", "s"].map((ch, i) => (
            <span
              key={i}
              className={`inline-flex h-7 w-4 items-center justify-center ${
                ch === "_" ? "border-b-2 border-[var(--lp-accent)]" : "text-[var(--lp-ink)]"
              }`}
            >
              {ch === "_" ? "" : ch}
            </span>
          ))}
        </div>
        <div className="mt-3 w-full rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/40 px-3 py-2.5 text-center text-sm text-[var(--lp-ink-soft)]">
          Type the missing letters...
        </div>
      </div>
      <SpellingScoreRow />
    </MockupFrame>
  );
}

/* ── Slide 5. Spelling — Letter Scramble ── */
export function SpellingScrambleMockup() {
  return (
    <MockupFrame label="SPELLING · Mr.🆖 ProReader">
      <SpellingHeader mode="Letter Scramble" />
      <div className="rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-4">
        <p className="mb-2 flex items-center justify-center gap-1 text-center text-[11px] text-[var(--lp-ink-soft)]">
          <Eye className="h-3 w-3" /> to grow or develop successfully; to thrive · 茁壯成長
        </p>
        {/* assembly area */}
        <div className="flex min-h-[2.25rem] items-center justify-center border-b-2 border-dashed border-[var(--lp-rule)] p-1.5 font-mono text-lg tracking-widest text-[var(--lp-ink)]">
          F L O U
        </div>
        {/* scrambled letter tiles */}
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {["R", "I", "S", "H"].map((ch, i) => (
            <span
              key={i}
              className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-[var(--lp-accent)] bg-[var(--lp-accent)]/10 font-display text-sm font-semibold text-[var(--lp-accent)]"
            >
              {ch}
            </span>
          ))}
          {["F", "L", "O", "U"].map((ch, i) => (
            <span
              key={`u-${i}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-paper-2)] text-sm font-semibold text-[var(--lp-ink-soft)] opacity-40"
            >
              {ch}
            </span>
          ))}
        </div>
        <div className="mt-3 flex justify-center">
          <span className="inline-flex items-center gap-1 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2.5 py-1 text-[10px] text-[var(--lp-ink-soft)]">
            <RotateCcw className="h-3 w-3" /> Clear
          </span>
        </div>
      </div>
      <SpellingScoreRow />
    </MockupFrame>
  );
}

/* ── Slide 6. Grammar — Topics table/card grid ── */
export function GrammarTopicsMockup() {
  const tabs = [
    { key: "topics", label: "Topics", icon: BookOpen, active: true },
    { key: "lessons", label: "Lessons", icon: GraduationCap },
    { key: "games", label: "Games", icon: Gamepad2 },
    { key: "quiz", label: "Quiz", icon: CheckCircle2 },
  ];
  const topics = [
    { name: "Present Perfect", zh: "現在完成式", cefr: "B2", cefrCls: "bg-orange-100 text-orange-800", count: "3x", catCls: "bg-blue-100 text-blue-800", desc: "have/has + past participle — past actions connected to the present." },
    { name: "Conditionals", zh: "條件句", cefr: "B1", cefrCls: "bg-yellow-100 text-yellow-800", count: "2x", catCls: "bg-purple-100 text-purple-800", desc: "If-clause + main clause; real & hypothetical conditions." },
    { name: "Passive Voice", zh: "被動語態", cefr: "B1", cefrCls: "bg-yellow-100 text-yellow-800", count: "2x", catCls: "bg-green-100 text-green-800", desc: "be + past participle — focus on the receiver of the action." },
    { name: "Modal Verbs", zh: "情態動詞", cefr: "A2", cefrCls: "bg-lime-100 text-lime-800", count: "1x", catCls: "bg-cyan-100 text-cyan-800", desc: "can · could · may · might — ability, possibility & permission." },
  ];
  return (
    <MockupFrame label="GRAMMAR · Mr.🆖 ProReader">
      {/* tab bar */}
      <div className="mb-3 flex gap-1 border-b border-[var(--lp-rule)]">
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
      {/* topic card grid */}
      <div className="grid gap-2 sm:grid-cols-2">
        {topics.map((tp) => (
          <div key={tp.name} className="rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-2.5">
            <div className="flex items-start justify-between gap-1.5">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-[var(--lp-ink)]">{tp.name}</p>
                <p className="text-[9px] text-[var(--lp-ink-soft)]">{tp.zh}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <span className={`rounded px-1.5 py-0.5 text-[8px] font-medium ${tp.cefrCls}`}>{tp.cefr}</span>
                <span className={`rounded px-1.5 py-0.5 text-[8px] font-medium ${tp.catCls}`}>{tp.count}</span>
              </div>
            </div>
            <p className="mt-1.5 line-clamp-2 text-[9px] leading-snug text-[var(--lp-ink-soft)]">{tp.desc}</p>
            <div className="mt-1.5 flex gap-1">
              <span className="inline-flex items-center gap-0.5 rounded-md bg-[var(--lp-accent)] px-1.5 py-0.5 text-[8px] font-semibold text-white">
                <GraduationCap className="h-2.5 w-2.5" /> Lesson
              </span>
              <span className="inline-flex items-center gap-0.5 rounded-md border border-[var(--lp-rule)] px-1.5 py-0.5 text-[8px] text-[var(--lp-ink-soft)]">
                <Highlighter className="h-2.5 w-2.5" /> Highlight
              </span>
            </div>
          </div>
        ))}
      </div>
    </MockupFrame>
  );
}

/* ── Slide 7. Grammar Game — Roulette ── */
const WHEEL_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
const WHEEL_TOPICS = ["Pres. Perfect", "Conditionals", "Passive", "Modals", "Articles", "Prepositions", "Comparatives", "Conjunctions"];

function wheelSlicePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const toRad = (a: number) => ((a - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

export function GrammarRouletteMockup() {
  const options = [
    { label: "They has eaten dinner.", correct: false },
    { label: "They have eaten dinner.", correct: true },
    { label: "They have eat dinner.", correct: false },
    { label: "They having eaten dinner.", correct: false },
  ];
  return (
    <MockupFrame label="GRAMMAR ROULETTE · Mr.🆖 ProReader">
      {/* header — back | streak | coins */}
      <div className="mb-1.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[10px] text-[var(--lp-ink-soft)]">
          <ArrowLeft className="h-3 w-3" /> Back to Games
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
            <Flame className="h-2.5 w-2.5" /> ×3
          </span>
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600">
            <Coins className="h-3.5 w-3.5" /> 350
          </span>
        </div>
      </div>
      <div className="mb-2 flex items-center justify-between font-mono text-[9px] text-[var(--lp-ink-soft)]">
        <span>10 rounds · 1/10</span>
        <span className="inline-flex items-center gap-0.5"><Timer className="h-3 w-3" />28s</span>
      </div>

      {/* wheel */}
      <div className="relative mx-auto mb-2 h-36 w-36">
        {/* pointer */}
        <div
          className="absolute left-1/2 top-0 z-10 -translate-x-1/2"
          style={{ width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: "12px solid var(--lp-accent)" }}
        />
        <svg viewBox="0 0 120 120" className="h-full w-full" role="img" aria-label="Grammar roulette wheel">
          {WHEEL_COLORS.map((color, i) => {
            const start = i * 45;
            const end = start + 45;
            const mid = start + 22.5;
            const toRad = (a: number) => ((a - 90) * Math.PI) / 180;
            const lx = 60 + 38 * Math.cos(toRad(mid));
            const ly = 60 + 38 * Math.sin(toRad(mid));
            return (
              <g key={i}>
                <path d={wheelSlicePath(60, 60, 56, start, end)} fill={color} stroke="#fff" strokeWidth="1" />
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="4"
                  fill="white"
                  style={{ fontFamily: "var(--font-sans), sans-serif" }}
                >
                  {WHEEL_TOPICS[i]}
                </text>
              </g>
            );
          })}
          <circle cx="60" cy="60" r="12" fill="white" stroke="var(--lp-rule)" strokeWidth="1" />
          <circle cx="60" cy="60" r="3" fill="var(--lp-accent)" />
        </svg>
      </div>

      {/* landed topic pill */}
      <div className="mb-2 flex justify-center">
        <span className="rounded-full bg-[#3b82f6] px-3 py-1 text-[10px] font-semibold text-white">Present Perfect 🔥 Hot Topic!</span>
      </div>

      {/* question box */}
      <div className="rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-2.5">
        <p className="mb-2 text-[11px] font-medium text-[var(--lp-ink)]">Which sentence is correct?</p>
        <div className="space-y-1.5">
          {options.map((o, i) => (
            <div
              key={i}
              className={`rounded-lg border px-2.5 py-1.5 text-left text-[10px] ${
                o.correct
                  ? "border-green-500 bg-green-50 font-medium text-green-800"
                  : "border-[var(--lp-rule)] opacity-60 text-[var(--lp-ink-soft)]"
              }`}
            >
              {String.fromCharCode(65 + i)}. {o.label}
            </div>
          ))}
        </div>
      </div>
    </MockupFrame>
  );
}

/* ── Slide 8. Grammar Game — Error Surgery ── */
export function GrammarErrorSurgeryMockup() {
  const sentence = [
    { w: "She", sel: false },
    { w: "have", sel: true },
    { w: "gone", sel: false },
    { w: "to", sel: false },
    { w: "the", sel: false },
    { w: "store", sel: false },
  ];
  return (
    <MockupFrame label="ERROR SURGERY · Mr.🆖 ProReader">
      {/* header */}
      <div className="mb-1.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[10px] text-[var(--lp-ink-soft)]">
          <ArrowLeft className="h-3 w-3" /> Back to Games
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-orange-500">
            <Flame className="h-3 w-3" /> ×3
          </span>
          <span className="text-[10px] font-semibold text-[var(--lp-ink-soft)]">240 pts</span>
        </div>
      </div>
      {/* progress + round counter + timer */}
      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--lp-rule)]">
        <div className="h-full rounded-full bg-[var(--lp-accent)]" style={{ width: "30%" }} />
      </div>
      <div className="mb-2 flex items-center justify-between text-[9px] text-[var(--lp-ink-soft)]">
        <span className="inline-flex items-center gap-0.5"><Timer className="h-3 w-3" />18s</span>
        <span className="rounded-md border border-[var(--lp-rule)] px-1.5 py-0.5 text-[8px]">Present Perfect</span>
        <span>3 / 10</span>
      </div>

      {/* instruction strip */}
      <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-red-700 dark:border-red-800 dark:bg-red-900/10 dark:text-red-400">
        <Stethoscope className="h-3.5 w-3.5 shrink-0" />
        <span className="text-[10px] font-medium">Tap the error word in the sentence</span>
      </div>

      {/* sentence box — clickable word buttons */}
      <div className="mb-2 rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-3">
        <div className="flex flex-wrap gap-x-1 gap-y-1.5 text-[11px]">
          {sentence.map((s, i) => (
            <span
              key={i}
              className={`rounded border px-1.5 py-0.5 ${
                s.sel
                  ? "border-2 border-amber-500 bg-amber-100 font-semibold text-amber-800"
                  : "border-transparent text-[var(--lp-ink)]"
              }`}
            >
              {s.w}
            </span>
          ))}
        </div>
      </div>

      {/* correction panel */}
      <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3 dark:bg-amber-900/10">
        <p className="mb-2 text-[9px] font-medium text-amber-800">
          Replace: <span className="font-mono">have</span> →
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { w: "has", correct: true },
            { w: "had", correct: false },
            { w: "having", correct: false },
            { w: "is", correct: false },
          ].map((c) => (
            <span
              key={c.w}
              className={`rounded-lg border px-2 py-1.5 text-center text-[10px] font-medium ${
                c.correct
                  ? "border-green-500 bg-green-100 text-green-800"
                  : "border-[var(--lp-rule)] bg-[var(--lp-surface)] text-[var(--lp-ink)]"
              }`}
            >
              {c.w}
            </span>
          ))}
        </div>
      </div>
    </MockupFrame>
  );
}

/* ── Slide 9. Grammar Game — Workshop ── */
export function GrammarWorkshopMockup() {
  return (
    <MockupFrame label="GRAMMAR WORKSHOP · Mr.🆖 ProReader">
      {/* header */}
      <div className="mb-1.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[10px] text-[var(--lp-ink-soft)]">
          <ArrowLeft className="h-3 w-3" /> Back to Games
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-orange-500">
            <Flame className="h-3 w-3" /> ×3
          </span>
          <span className="text-[10px] font-semibold text-[var(--lp-ink-soft)]">180 pts</span>
        </div>
      </div>
      {/* progress + counter + timer */}
      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--lp-rule)]">
        <div className="h-full rounded-full bg-[var(--lp-accent)]" style={{ width: "25%" }} />
      </div>
      <div className="mb-2 flex items-center justify-between text-[9px] text-[var(--lp-ink-soft)]">
        <span className="inline-flex items-center gap-0.5"><Timer className="h-3 w-3" />22s</span>
        <span className="rounded-md border border-[var(--lp-rule)] px-1.5 py-0.5 text-[8px]">Conditionals</span>
        <span>2 / 8</span>
      </div>

      {/* sentence box with slots */}
      <div className="rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/30 p-3">
        <p className="text-[11px] leading-relaxed text-[var(--lp-ink)]">
          If it rains,{" "}
          <span className="mx-0.5 inline-block rounded-md border-2 border-[var(--lp-accent)] bg-[var(--lp-accent)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--lp-accent)]">
            we
          </span>{" "}
          <span className="mx-0.5 inline-block rounded-md border-2 border-[var(--lp-accent)] bg-[var(--lp-accent)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--lp-accent)]">
            will
          </span>{" "}
          stay home.
        </p>
      </div>

      {/* pattern hint */}
      <p className="mt-2 font-mono text-[9px] text-[var(--lp-ink-soft)]">Pattern: [subject] + [auxiliary] + [verb]</p>

      {/* word bank */}
      <div className="mt-2">
        <p className="mb-1.5 text-[9px] uppercase tracking-wide text-[var(--lp-ink-soft)]">Word Bank</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            { w: "we", used: true },
            { w: "will", used: true },
            { w: "stay", used: false },
            { w: "go", used: false },
            { w: "home", used: false },
            { w: "it", used: false },
            { w: "would", used: false },
          ].map((c) => (
            <span
              key={c.w}
              className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium ${
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

      {/* check answer button */}
      <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--lp-accent)] px-3 py-2 text-[11px] font-semibold text-white">
        <CheckCircle2 className="h-3.5 w-3.5" /> Check Answer
      </div>
    </MockupFrame>
  );
}

/* ── Slide 10. Multiplayer Spelling Battle — Lobby ── */
export function SpellingBattleLobbyMockup() {
  const players = [
    { name: "Alice", you: true, host: true, away: false, initials: "AL" },
    { name: "Bob", you: false, host: false, away: false, initials: "BO" },
    { name: "Carol", you: false, host: false, away: false, initials: "CA" },
    { name: "Dave", you: false, host: false, away: true, initials: "DA" },
  ];
  return (
    <MockupFrame label="SPELLING BATTLE · Mr.🆖 ProReader">
      {/* card title + status */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Swords className="h-4 w-4 text-fuchsia-500" />
          <span className="font-display text-sm font-semibold text-[var(--lp-ink)]">Battle Room</span>
        </div>
        <span className="rounded-full bg-[var(--lp-rule)]/60 px-2 py-0.5 text-[9px] font-medium text-[var(--lp-ink-soft)]">
          Waiting
        </span>
      </div>

      {/* room code block */}
      <div className="flex items-center justify-center gap-2 rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/40 py-3">
        <span className="font-mono text-2xl font-bold tracking-[0.3em] text-[var(--lp-ink)]">ABC123</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--lp-rule)] text-[var(--lp-ink-soft)]">
          <Copy className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-1 text-center text-[9px] text-[var(--lp-ink-soft)]">Share this code with your opponents</p>

      <div className="my-3 border-t border-[var(--lp-rule)]" />

      {/* players list */}
      <div className="mb-1.5 flex items-center gap-1.5 text-[var(--lp-ink)]">
        <Users className="h-3.5 w-3.5 text-[var(--lp-ink-soft)]" />
        <span className="text-[11px] font-medium">Players (4)</span>
      </div>
      <div className="space-y-1.5">
        {players.map((p) => (
          <div
            key={p.name}
            className={`flex items-center gap-2 rounded-lg border p-1.5 ${
              p.you ? "border-[var(--lp-accent)]/40 bg-[var(--lp-accent)]/5" : "border-[var(--lp-rule)] bg-[var(--lp-surface)]"
            }`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--lp-accent)]/15 text-[8px] font-bold uppercase text-[var(--lp-accent)]">
              {p.initials}
            </span>
            <span className="text-[10px] font-medium text-[var(--lp-ink)]">{p.name}</span>
            {p.you && (
              <span className="rounded bg-[var(--lp-rule)]/60 px-1.5 py-0.5 text-[8px] text-[var(--lp-ink-soft)]">You</span>
            )}
            {p.away && (
              <span className="rounded border border-[var(--lp-rule)] px-1.5 py-0.5 text-[8px] text-[var(--lp-ink-soft)]">away</span>
            )}
            {p.host && <Crown className="ml-auto h-3.5 w-3.5 text-amber-500" />}
          </div>
        ))}
      </div>

      <div className="my-3 border-t border-[var(--lp-rule)]" />

      {/* words row */}
      <div className="mb-3 flex items-center justify-between text-[10px] text-[var(--lp-ink-soft)]">
        <span>Words in this battle</span>
        <span className="rounded-md border border-[var(--lp-rule)] px-1.5 py-0.5 text-[9px] text-[var(--lp-ink)]">10 words</span>
      </div>

      {/* game rules */}
      <div className="rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/30 p-2.5">
        <div className="mb-2 flex items-center gap-1.5 text-[var(--lp-ink)]">
          <ScrollText className="h-3 w-3 text-[var(--lp-ink-soft)]" />
          <span className="text-[10px] font-medium">Game Rules</span>
        </div>
        <div className="mb-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[9px]">
          <div><span className="text-[var(--lp-ink-soft)]">Mode: </span><span className="font-medium text-[var(--lp-ink)]">Listen &amp; Type</span></div>
          <div><span className="text-[var(--lp-ink-soft)]">Difficulty: </span><span className="font-medium text-[var(--lp-ink)]">Medium</span></div>
          <div><span className="text-[var(--lp-ink-soft)]">Time/word: </span><span className="font-medium text-[var(--lp-ink)]">20s</span></div>
          <div><span className="text-[var(--lp-ink-soft)]">Timed: </span><span className="font-medium text-[var(--lp-ink)]">On</span></div>
        </div>
        <div className="space-y-1">
          <div className="flex items-start gap-1.5 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-1.5">
            <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
            <div><span className="text-[9px] font-medium text-[var(--lp-ink)]">Correct</span> <span className="text-[8px] text-[var(--lp-ink-soft)]">· 100 base pts</span></div>
          </div>
          <div className="flex items-start gap-1.5 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-1.5">
            <Zap className="h-3 w-3 shrink-0 text-amber-500" />
            <div><span className="text-[9px] font-medium text-[var(--lp-ink)]">Speed</span> <span className="text-[8px] text-[var(--lp-ink-soft)]">· up to +50</span></div>
          </div>
          <div className="flex items-start gap-1.5 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-1.5">
            <Flame className="h-3 w-3 shrink-0 text-orange-500" />
            <div><span className="text-[9px] font-medium text-[var(--lp-ink)]">Streak</span> <span className="text-[8px] text-[var(--lp-ink-soft)]">· +10% up to +50%</span></div>
          </div>
          <div className="flex items-start gap-1.5 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-1.5">
            <Lightbulb className="h-3 w-3 shrink-0 text-yellow-500" />
            <div><span className="text-[9px] font-medium text-[var(--lp-ink)]">Hints</span> <span className="text-[8px] text-[var(--lp-ink-soft)]">· max 3 · 10/20/30</span></div>
          </div>
          <div className="flex items-start gap-1.5 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-1.5">
            <XCircle className="h-3 w-3 shrink-0 text-rose-500" />
            <div><span className="text-[9px] font-medium text-[var(--lp-ink)]">Wrong</span> <span className="text-[8px] text-[var(--lp-ink-soft)]">· 0 pts — streak resets</span></div>
          </div>
        </div>
      </div>

      {/* action buttons */}
      <div className="mt-3 flex gap-2">
        <span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-fuchsia-500 px-3 py-2 text-[11px] font-semibold text-white">
          <Play className="h-3.5 w-3.5" /> Start Battle
        </span>
        <span className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-3 py-2 text-[11px] text-[var(--lp-ink-soft)]">
          Leave
        </span>
      </div>
    </MockupFrame>
  );
}

/* ════════════════════════════════════════════════════════════════
   UNDERSTAND carousel slides (Chapter 02) — 6 faithful mockups.
   Each slide is a standalone view of a real in-app screen.
   ════════════════════════════════════════════════════════════════ */

/* Shared two-paragraph passage (Original) — same recycling text, split
   into two paragraphs so the mockups look like real reading passages. */
const UNDERSTAND_PARAGRAPHS = {
  original: [
    "I presented plenty of evidence that recycling was costly and inefficient, but its defenders said that it was unfair to rush to judgment. Noting that the modern recycling movement had really just begun a few years earlier, they predicted it would flourish as the industry matured and the public learned how to recycle properly.",
    "Critics, however, were not convinced. They pointed to studies showing that collecting, sorting, and reprocessing waste often consumed more energy than it saved, and that the costs fell heavily on local governments already struggling to balance their budgets.",
  ],
  adapted: [
    "I gave a lot of proof that recycling cost too much and was not efficient. But people who supported recycling said it was unfair to judge too quickly. They said the modern recycling movement had just started a few years earlier. They predicted it would get better as the industry grew and people learned how to recycle.",
    "However, critics did not agree. They showed studies proving that collecting and sorting waste often used more energy than it saved. They also noted that the high costs hurt local governments that were already struggling with money.",
  ],
  simplified: [
    "I showed it cost too much. It was not efficient (not working well). Supporters said it was unfair to judge. They said recycling was new. It would get better.",
    "But critics did not agree. They showed proof. Collecting and sorting waste used too much energy. It also cost too much money for towns.",
  ],
} as const;

/* Shared text-analysis header: title + download dropdown, mirrors
   AdaptedText.tsx (BookOpen + "Text Analysis & Adaptation" + FileDown). */
function TextAnalysisHeader() {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-[var(--lp-rule)] pb-3">
      <BookOpen className="h-4 w-4 text-[var(--lp-ink-soft)]" />
      <span className="font-display text-sm font-semibold text-[var(--lp-ink)]">Text Analysis &amp; Adaptation</span>
      <span className="ml-auto inline-flex items-center gap-1 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2 py-1 text-[10px] text-[var(--lp-ink-soft)]">
        <FileDown className="h-3 w-3" /> Word
        <ChevronDown className="h-2.5 w-2.5" />
      </span>
    </div>
  );
}

/* Shared text-analysis tab strip — Original · Adapted · Simplified. */
function TextAnalysisTabs({ active }: { active: "original" | "adapted" | "simplified" }) {
  const tabs: { key: typeof active; label: string; icon: React.ReactNode }[] = [
    { key: "original", label: "Original", icon: <FileText className="h-3 w-3" /> },
    { key: "adapted", label: "Adapted", icon: <FileEdit className="h-3 w-3" /> },
    { key: "simplified", label: "Simplified", icon: <FileMinus className="h-3 w-3" /> },
  ];
  return (
    <div className="mb-3 flex gap-1 rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/40 p-0.5">
      {tabs.map((tb) => (
        <span
          key={tb.key}
          className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition-colors ${
            active === tb.key
              ? "bg-[var(--lp-accent)] text-white"
              : "text-[var(--lp-ink-soft)]"
          }`}
        >
          {tb.icon}
          {tb.label}
        </span>
      ))}
    </div>
  );
}

/* ── Slide 1. Mind map — left-to-right, 4 branches with sub-leaves ──
   Based on the Mermaid mindmap:
     root((The Myth of Recycling))
       Costly and Inefficient          (3 leaves)
       Overstated Environmental Benefits (4 leaves)
       Political and Social Pressure    (4 leaves)
       What Actually Works              (4 leaves) */
export function UnderstandMindMapMockup() {
  // Branch palette: red, amber, violet, emerald
  const BRANCHES = [
    {
      label: "Costly & Inefficient",
      color: "#EF4444",
      leafFill: "#FEE2E2",
      centerY: 45,
      leaves: [
        { text: "More expensive than landfills", y: 29 },
        { text: "Material prices have plummeted", y: 45 },
        { text: "Companies shutting down plants", y: 61 },
      ],
    },
    {
      label: "Overstated Benefits",
      color: "#F59E0B",
      leafFill: "#FEF3C7",
      centerY: 135,
      leaves: [
        { text: "Plastic recycling: little impact", y: 111 },
        { text: "40,000 bottles offset one flight", y: 127 },
        { text: "Rinsing bottles adds emissions", y: 143 },
        { text: "90% benefits from few materials", y: 159 },
      ],
    },
    {
      label: "Political Pressure",
      color: "#8B5CF6",
      leafFill: "#EDE9FE",
      centerY: 225,
      leaves: [
        { text: "Recycling seen as morality", y: 201 },
        { text: "Zero-waste goals unrealistic", y: 217 },
        { text: "National rate has stagnated", y: 233 },
        { text: "Rich vs low-income areas", y: 249 },
      ],
    },
    {
      label: "What Actually Works",
      color: "#10B981",
      leafFill: "#D1FAE5",
      centerY: 315,
      leaves: [
        { text: "Paper, cardboard, aluminum", y: 291 },
        { text: "Landfills capture methane", y: 307 },
        { text: "Modern incinerators are clean", y: 323 },
        { text: "Most else not worth it", y: 339 },
      ],
    },
  ];

  // SVG layout constants
  const ROOT_CX = 48, ROOT_CY = 180, ROOT_R = 26;
  const BRANCH_X = 142, BRANCH_W = 106, BRANCH_H = 16;
  const LEAF_X = 298, LEAF_W = 138, LEAF_H = 12;
  const ROOT_RIGHT = ROOT_CX + ROOT_R;
  const BRANCH_RIGHT = BRANCH_X + BRANCH_W;

  return (
    <MockupFrame label="MIND MAP · Mr.🆖 ProReader">
      {/* toolbar row — EN toggle · Download · Regenerate */}
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-[var(--lp-rule)] pb-3">
        <Brain className="h-4 w-4 text-[var(--lp-accent)]" />
        <span className="font-display text-sm font-semibold text-[var(--lp-ink)]">Mind Map</span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2 py-1 text-[10px] text-[var(--lp-ink-soft)]">
          <Languages className="h-3 w-3" /> EN
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2 py-1 text-[10px] text-[var(--lp-ink-soft)]">
          <RotateCcw className="h-3 w-3" /> Regenerate
        </span>
      </div>

      <div className="rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/40 p-3">
        <svg viewBox="0 0 440 360" className="w-full" role="img" aria-label="Mind map: The Myth of Recycling">
          {/* ── connectors: root → branches (curved, colored per branch) ── */}
          {BRANCHES.map((b) => (
            <path
              key={`rc-${b.label}`}
              d={`M ${ROOT_RIGHT} ${ROOT_CY} Q ${(ROOT_RIGHT + BRANCH_X) / 2} ${b.centerY} ${BRANCH_X} ${b.centerY}`}
              stroke={b.color}
              strokeWidth="1.2"
              fill="none"
            />
          ))}

          {/* ── connectors: branches → leaves (curved, colored per branch) ── */}
          {BRANCHES.map((b) =>
            b.leaves.map((leaf, li) => (
              <path
                key={`bc-${b.label}-${li}`}
                d={`M ${BRANCH_RIGHT} ${b.centerY} Q ${(BRANCH_RIGHT + LEAF_X) / 2} ${leaf.y} ${LEAF_X} ${leaf.y}`}
                stroke={b.color}
                strokeWidth="0.8"
                fill="none"
              />
            )),
          )}

          {/* ── leaves (lighter tints, dark text) ── */}
          {BRANCHES.map((b) =>
            b.leaves.map((leaf, li) => (
              <g key={`l-${b.label}-${li}`}>
                <rect x={LEAF_X} y={leaf.y - LEAF_H / 2} width={LEAF_W} height={LEAF_H} rx="2" fill={b.leafFill} />
                <text
                  x={LEAF_X + LEAF_W / 2}
                  y={leaf.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="5.5"
                  fill="#37474F"
                  style={{ fontFamily: "var(--font-sans), sans-serif" }}
                >
                  {leaf.text}
                </text>
              </g>
            )),
          )}

          {/* ── branches (medium fills, white text) ── */}
          {BRANCHES.map((b) => (
            <g key={`b-${b.label}`}>
              <rect x={BRANCH_X} y={b.centerY - BRANCH_H / 2} width={BRANCH_W} height={BRANCH_H} rx="3" fill={b.color} />
              <text
                x={BRANCH_X + BRANCH_W / 2}
                y={b.centerY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="7"
                fontWeight="600"
                fill="white"
                style={{ fontFamily: "var(--font-sans), sans-serif" }}
              >
                {b.label}
              </text>
            </g>
          ))}

          {/* ── root (circle, indigo) ── */}
          <circle cx={ROOT_CX} cy={ROOT_CY} r={ROOT_R} fill="#5C6BC0" />
          <text
            x={ROOT_CX}
            y={ROOT_CY - 5}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="7"
            fontWeight="700"
            fill="white"
            style={{ fontFamily: "var(--font-sans), sans-serif" }}
          >
            The Myth of
          </text>
          <text
            x={ROOT_CX}
            y={ROOT_CY + 6}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="7"
            fontWeight="700"
            fill="white"
            style={{ fontFamily: "var(--font-sans), sans-serif" }}
          >
            Recycling
          </text>
        </svg>
      </div>
    </MockupFrame>
  );
}

/* ── Slide 2. AI Visualization — recycling infographic (User Manual §4.6) ── */
export function UnderstandVisualizationMockup() {
  return (
    <MockupFrame label="AI VISUALIZATION · Mr.🆖 ProReader">
      {/* toolbar — Download · Chinese toggle · Regenerate · remaining quota */}
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-[var(--lp-rule)] pb-3">
        <ImageIcon className="h-4 w-4 text-[var(--lp-accent)]" />
        <span className="font-display text-sm font-semibold text-[var(--lp-ink)]">Text Visualization</span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2 py-1 text-[10px] text-[var(--lp-ink-soft)]">
          <Download className="h-3 w-3" /> PNG
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-[var(--lp-ink-soft)]">
          <span className="relative h-3 w-5 rounded-full bg-[var(--lp-accent)]">
            <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-white" />
          </span>
          中文
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--lp-accent)] px-2 py-1 text-[10px] font-semibold text-white">
          <ImageIcon className="h-3 w-3" /> Regenerate
        </span>
        <span className="text-[9px] text-[var(--lp-ink-soft)]">1 left today</span>
      </div>

      {/* the infographic poster — same SVG as User Manual §4.6 */}
      <div className="rounded-xl border border-[var(--lp-rule)] bg-gradient-to-br from-[var(--lp-accent)]/10 via-[var(--lp-highlight)]/15 to-transparent p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[var(--lp-ink-soft)]">
          <ImageIcon className="h-3 w-3" />
          <span className="font-mono text-[9px] uppercase tracking-wider">AI Visualization</span>
        </div>
        <div className="flex items-center justify-center">
          <svg
            viewBox="0 0 240 200"
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-full max-h-72"
            role="img"
            aria-label="Infographic poster: The recycling movement is ready to flourish"
          >
            <defs>
              <clipPath id="lpPosterClip2">
                <rect width="240" height="200" rx="4" />
              </clipPath>
            </defs>
            <g clipPath="url(#lpPosterClip2)">
              {/* poster paper */}
              <rect width="240" height="200" fill="#FBF8F1" />
              {/* top accent bars */}
              <rect x="0" y="0" width="240" height="5" fill="#1E3A8A" />
              <rect x="0" y="5" width="240" height="1.5" fill="#F5C842" />
              {/* title */}
              <text x="120" y="22" textAnchor="middle" fontSize="16" fontWeight="900" fill="#17161A" style={{ fontFamily: "var(--font-display), Georgia, serif" }}>RECYCLING</text>
              <text x="120" y="31" textAnchor="middle" fontSize="5.5" fontWeight="600" letterSpacing="1.5" fill="#5C5751" style={{ fontFamily: "var(--font-mono), monospace" }}>A MOVEMENT IN PROGRESS</text>
              <line x1="85" y1="36" x2="155" y2="36" stroke="#DCD5C6" strokeWidth="0.8" />
              <circle cx="120" cy="36" r="2" fill="#F5C842" />
              {/* critics panel (left) */}
              <rect x="14" y="42" width="100" height="46" rx="4" fill="#FEF2F2" stroke="#FCA5A5" strokeWidth="0.5" />
              <text x="64" y="51" textAnchor="middle" fontSize="5.5" fontWeight="700" letterSpacing="1" fill="#B91C1C" style={{ fontFamily: "var(--font-mono), monospace" }}>CRITICS SAY</text>
              <g transform="translate(56, 54)" stroke="#DC2626" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M -5,0 L -5,5 M -7,3 L -5,5 L -3,3" />
                <path d="M 1,0 L 1,7 M -1,5 L 1,7 L 3,5" />
                <path d="M 7,0 L 7,6 M 5,4 L 7,6 L 9,4" />
              </g>
              <text x="64" y="76" textAnchor="middle" fontSize="7" fontWeight="700" fill="#17161A" style={{ fontFamily: "var(--font-sans), sans-serif" }}>&ldquo;Costly&rdquo;</text>
              <text x="64" y="84" textAnchor="middle" fontSize="5" fill="#5C5751" style={{ fontFamily: "var(--font-sans), sans-serif" }}>inefficient &middot; rush to judge</text>
              {/* VS badge */}
              <circle cx="120" cy="65" r="9" fill="#17161A" />
              <text x="120" y="68" textAnchor="middle" fontSize="7" fontWeight="900" fill="#F5C842" style={{ fontFamily: "var(--font-display), Georgia, serif" }}>VS</text>
              {/* defenders panel (right) */}
              <rect x="126" y="42" width="100" height="46" rx="4" fill="#EFF6FF" stroke="#93C5FD" strokeWidth="0.5" />
              <text x="176" y="51" textAnchor="middle" fontSize="5.5" fontWeight="700" letterSpacing="1" fill="#1E40AF" style={{ fontFamily: "var(--font-mono), monospace" }}>DEFENDERS SAY</text>
              <g transform="translate(168, 54)" stroke="#2563EB" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M -5,8 L -5,3 M -7,5 L -5,3 L -3,5" />
                <path d="M 1,8 L 1,1 M -1,3 L 1,1 L 3,3" />
                <path d="M 7,8 L 7,2 M 5,4 L 7,2 L 9,4" />
              </g>
              <text x="176" y="76" textAnchor="middle" fontSize="7" fontWeight="700" fill="#17161A" style={{ fontFamily: "var(--font-sans), sans-serif" }}>&ldquo;Too soon&rdquo;</text>
              <text x="176" y="84" textAnchor="middle" fontSize="5" fill="#5C5751" style={{ fontFamily: "var(--font-sans), sans-serif" }}>just begun &middot; will flourish</text>
              {/* growth chart */}
              <text x="14" y="100" fontSize="5.5" fontWeight="700" letterSpacing="0.8" fill="#5C5751" style={{ fontFamily: "var(--font-mono), monospace" }}>PROJECTED GROWTH</text>
              <line x1="14" y1="115" x2="226" y2="115" stroke="#DCD5C6" strokeWidth="0.4" strokeDasharray="2 2" />
              <line x1="14" y1="127" x2="226" y2="127" stroke="#DCD5C6" strokeWidth="0.4" strokeDasharray="2 2" />
              <line x1="14" y1="132" x2="226" y2="132" stroke="#DCD5C6" strokeWidth="0.8" />
              <rect x="24" y="125" width="28" height="7" rx="1" fill="#1E3A8A" opacity="0.25" />
              <rect x="62" y="120" width="28" height="12" rx="1" fill="#1E3A8A" opacity="0.4" />
              <rect x="100" y="115" width="28" height="17" rx="1" fill="#1E3A8A" opacity="0.58" />
              <rect x="138" y="109" width="28" height="23" rx="1" fill="#1E3A8A" opacity="0.78" />
              <rect x="176" y="102" width="28" height="30" rx="1" fill="#F5C842" />
              <rect x="176" y="102" width="28" height="30" rx="1" fill="none" stroke="#1E3A8A" strokeWidth="0.5" />
              <path d="M 38,125 L 76,120 L 114,115 L 152,109 L 190,102" stroke="#17161A" strokeWidth="0.8" fill="none" strokeDasharray="1.5 1.5" opacity="0.4" />
              <text x="38" y="140" textAnchor="middle" fontSize="4.5" fill="#5C5751" style={{ fontFamily: "var(--font-sans), sans-serif" }}>now</text>
              <text x="76" y="140" textAnchor="middle" fontSize="4.5" fill="#5C5751" style={{ fontFamily: "var(--font-sans), sans-serif" }}>early</text>
              <text x="114" y="140" textAnchor="middle" fontSize="4.5" fill="#5C5751" style={{ fontFamily: "var(--font-sans), sans-serif" }}>growing</text>
              <text x="152" y="140" textAnchor="middle" fontSize="4.5" fill="#5C5751" style={{ fontFamily: "var(--font-sans), sans-serif" }}>maturing</text>
              <text x="190" y="140" textAnchor="middle" fontSize="4.5" fontWeight="700" fill="#1E3A8A" style={{ fontFamily: "var(--font-sans), sans-serif" }}>flourish!</text>
              {/* key takeaway box */}
              <rect x="14" y="148" width="212" height="44" rx="4" fill="#17161A" />
              <text x="120" y="162" textAnchor="middle" fontSize="6" fontStyle="italic" fill="#9CA3AF" style={{ fontFamily: "var(--font-display), Georgia, serif" }}>the verdict?</text>
              <rect x="62" y="167" width="104" height="16" fill="#F5C842" opacity="0.9" rx="1" />
              <text x="114" y="179" textAnchor="middle" fontSize="14" fontWeight="900" fill="#17161A" style={{ fontFamily: "var(--font-display), Georgia, serif" }}>FLOURISH</text>
              <g transform="translate(182, 158)">
                <line x1="5" y1="20" x2="5" y2="10" stroke="#15803D" strokeWidth="0.9" />
                <path d="M 5,12 Q 0,11 0.5,6 Q 5,7 5,12 Z" fill="#22C55E" />
                <path d="M 5,10 Q 10,9 9.5,4 Q 5,5 5,10 Z" fill="#16A34A" />
              </g>
            </g>
            <rect x="0.5" y="0.5" width="239" height="199" fill="none" stroke="#DCD5C6" rx="4" />
          </svg>
        </div>
      </div>
    </MockupFrame>
  );
}

/* ── Slide 3. Text Analysis — Original tab ──
   2 paragraphs, highlighted yellow chips, glossary popover underneath,
   floating selection toolbar above the text body. */
export function UnderstandOriginalMockup() {
  return (
    <MockupFrame label="TEXT ANALYSIS · Mr.🆖 ProReader">
      <TextAnalysisHeader />
      <TextAnalysisTabs active="original" />

      {/* control row — Read Along · Edit (mirrors AdaptedText.tsx) */}
      <div className="mb-3 flex items-center justify-end gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2 py-1 text-[10px] text-[var(--lp-ink)]">
          <Volume2 className="h-3 w-3" /> Read Along
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2 py-1 text-[10px] text-[var(--lp-ink)]">
          <Pencil className="h-3 w-3" /> Edit
        </span>
      </div>

      {/* green tip banner — mirrors AdaptedText.tsx highlightTip */}
      <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
        💡 <Brain className="inline h-3 w-3 align-text-bottom" /> Tap the{" "}
        <span className="font-medium">yellow words</span> for definitions,{" "}
        <Volume2 className="inline h-3 w-3 align-text-bottom" /> to listen, and{" "}
        <Plus className="inline h-3 w-3 align-text-bottom" /> to add new words.
      </div>

      {/* highlighted words chips (mirrors highlightedWords map) */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-md bg-[var(--lp-paper-2)]/60 p-2">
        <span className="text-[9px] text-[var(--lp-ink-soft)]">Added words:</span>
        {["flourish", "inefficient", "predicted", "matured", "defenders", "local"].map((w) => (
          <span
            key={w}
            className="rounded bg-yellow-100 px-1.5 py-0.5 text-[9px] font-medium text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-200"
          >
            {w}
          </span>
        ))}
      </div>

      {/* text body — 2 paragraphs with highlighted words (yellow chips),
          one with the small amber dot that signals a glossary entry */}
      <div className="relative space-y-3">
        <p className="pl-0 text-[11px] leading-relaxed text-[var(--lp-ink)]">
          I presented plenty of evidence that recycling was{" "}
          <mark className="rounded bg-yellow-200 px-0.5 text-[var(--lp-ink)] dark:bg-yellow-400/80">
            costly
          </mark>{" "}
          and{" "}
          <mark className="rounded bg-yellow-200 px-0.5 text-[var(--lp-ink)] dark:bg-yellow-400/80">
            inefficient
          </mark>
          , but its{" "}
          <mark className="rounded bg-yellow-200 px-0.5 text-[var(--lp-ink)] dark:bg-yellow-400/80">
            defenders
          </mark>{" "}
          said that it was unfair to{" "}
          <mark className="rounded bg-yellow-200 px-0.5 text-[var(--lp-ink)] dark:bg-yellow-400/80">
            rush to judgment
          </mark>
          . Noting that the modern recycling movement had really just begun a few years earlier, they{" "}
          <mark className="rounded bg-yellow-200 px-0.5 text-[var(--lp-ink)] dark:bg-yellow-400/80">
            predicted
          </mark>{" "}
          it would{" "}
          <mark className="rounded bg-yellow-200 px-0.5 text-[var(--lp-ink)] dark:bg-yellow-400/80">
            flourish
          </mark>{" "}
          as the industry{" "}
          <mark className="rounded bg-yellow-200 px-0.5 text-[var(--lp-ink)] dark:bg-yellow-400/80">
            matured
          </mark>{" "}
          and the public learned how to recycle properly.
        </p>
        <p className="text-[11px] leading-relaxed text-[var(--lp-ink)]">
          Critics, however, were not convinced. They pointed to studies showing that collecting,
          sorting, and reprocessing waste often consumed more energy than it saved, and that the
          costs fell heavily on{" "}
          <span className="relative inline-block">
            {/* floating selection toolbar — mirrors the .selection-popup in AdaptedText.tsx */}
            <div className="absolute -top-9 left-0 z-10 flex w-max items-center gap-0.5 whitespace-nowrap rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-0.5 shadow-md">
              <span className="inline-flex items-center gap-0.5 border-r border-[var(--lp-rule)] px-1.5 py-1 text-[9px] font-medium text-[var(--lp-ink)]">
                <Plus className="h-3 w-3" /> Add Word
              </span>
              <span className="inline-flex items-center gap-0.5 border-r border-[var(--lp-rule)] px-1.5 py-1 text-[9px] font-medium text-[var(--lp-ink)]">
                <Brain className="h-3 w-3 text-[var(--lp-accent)]" /> Analyze
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-1 text-[9px] font-medium text-[var(--lp-ink)]">
                <Volume2 className="h-3 w-3 text-green-500" /> Speak
              </span>
            </div>
            <mark className="rounded bg-yellow-200 px-0.5 text-[var(--lp-ink)] dark:bg-yellow-400/80">
              local
              <sup className="ml-0.5 inline-flex h-[10px] min-w-[10px] items-center justify-center rounded-full bg-amber-500/80 align-super text-[7px] font-bold text-white" />
            </mark>
          </span>{" "}
          governments already struggling to balance their budgets.
        </p>

        {/* glossary popover underneath the "local" chip —
            mirrors the .glossary-popover in AdaptedText.tsx */}
        <div className="relative mx-auto mt-2 w-[calc(100%-1rem)] max-w-[300px] rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-3 shadow-lg">
          {/* popover arrow pointing up */}
          <div className="absolute -top-1.5 left-10 h-3 w-3 rotate-45 border-l border-t border-[var(--lp-rule)] bg-[var(--lp-surface)]" />
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-sm font-bold text-[var(--lp-ink)]">local</span>
              <span className="ml-1.5 text-[10px] text-[var(--lp-ink-soft)]">lo·cal</span>
              <Volume2 className="ml-1 inline h-3 w-3 text-[var(--lp-ink-soft)]" />
            </div>
            <span className="shrink-0 rounded bg-[var(--lp-paper-2)] px-1.5 py-0.5 text-[9px] text-[var(--lp-ink-soft)]">
              adjective
            </span>
          </div>
          <div className="mt-1 text-sm font-semibold text-[var(--lp-accent)]">本地的；地方的</div>
          <div className="text-[11px] text-[var(--lp-ink-soft)]">
            relating to a particular area, city, or community
          </div>
          <div className="mt-2 border-t border-[var(--lp-rule)] pt-2 text-[10px] italic text-[var(--lp-ink-soft)]">
            “The costs fell heavily on local governments already struggling to balance their budgets.”
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

/* ── Slide 4. Text Analysis — Adapted tab ── */
export function UnderstandAdaptedMockup() {
  return (
    <MockupFrame label="TEXT ANALYSIS · Mr.🆖 ProReader">
      <TextAnalysisHeader />
      <TextAnalysisTabs active="adapted" />

      {/* control row — Regenerate (student age) */}
      <div className="mb-3 flex items-center justify-end gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--lp-paper-2)] px-2 py-1 text-[10px] font-medium text-[var(--lp-ink)]">
          <BookOpen className="h-3 w-3" /> Regenerate (14 yo)
        </span>
      </div>

      {/* adapted text body — 2 paragraphs, plain (no highlights by default) */}
      <div className="space-y-3">
        <p className="text-[11px] leading-relaxed text-[var(--lp-ink)]">
          {UNDERSTAND_PARAGRAPHS.adapted[0]}
        </p>
        <p className="text-[11px] leading-relaxed text-[var(--lp-ink)]">
          {UNDERSTAND_PARAGRAPHS.adapted[1]}
        </p>
      </div>

      {/* Simplify further button — mirrors AdaptedText.tsx */}
      <div className="mt-4 border-t border-[var(--lp-rule)] pt-3">
        <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[var(--lp-paper-2)] px-3 py-2 text-[10px] font-medium text-[var(--lp-ink)]">
          <ArrowDown className="h-3 w-3" /> Simplify Further
        </span>
      </div>
    </MockupFrame>
  );
}

/* ── Slide 5. Text Analysis — Simplified tab ── */
export function UnderstandSimplifiedMockup() {
  return (
    <MockupFrame label="TEXT ANALYSIS · Mr.🆖 ProReader">
      <TextAnalysisHeader />
      <TextAnalysisTabs active="simplified" />

      {/* simplified text body — 2 short paragraphs */}
      <div className="space-y-3">
        <p className="text-[11px] leading-relaxed text-[var(--lp-ink)]">
          {UNDERSTAND_PARAGRAPHS.simplified[0]}
        </p>
        <p className="text-[11px] leading-relaxed text-[var(--lp-ink)]">
          {UNDERSTAND_PARAGRAPHS.simplified[1]}
        </p>
      </div>

      {/* Simplify further button — mirrors AdaptedText.tsx */}
      <div className="mt-4 border-t border-[var(--lp-rule)] pt-3">
        <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[var(--lp-paper-2)] px-3 py-2 text-[10px] font-medium text-[var(--lp-ink)]">
          <ArrowDown className="h-3 w-3" /> Simplify Further
        </span>
      </div>
    </MockupFrame>
  );
}

/* ── Slide 6. Text Difficulty Analysis + CEFR Word Highlight ── */
export function UnderstandDifficultyMockup() {
  // 3 DifficultyCards (Original / Adapted / Simplified) — mirrors
  // DifficultyCard in TextDifficultyAnalyzer.tsx
  const cards = [
    {
      title: "Original",
      cefr: "B2",
      cefrCls: "bg-orange-200 text-orange-900 dark:bg-orange-800 dark:text-orange-100",
      words: 96, sentences: 4, avgLen: 24.0, flesch: 49.5, grade: "S5",
    },
    {
      title: "Adapted",
      cefr: "B1",
      cefrCls: "bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100",
      words: 88, sentences: 6, avgLen: 14.7, flesch: 71.3, grade: "S2",
    },
    {
      title: "Simplified",
      cefr: "A2",
      cefrCls: "bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100",
      words: 52, sentences: 8, avgLen: 6.5, flesch: 88.4, grade: "P6",
    },
  ];

  // CEFR legend counts (only highlight B1+ in the mockup)
  const cefrLegend = [
    { level: "A1", count: 14, dot: "bg-cyan-500" },
    { level: "A2", count: 22, dot: "bg-green-500" },
    { level: "B1", count: 31, dot: "bg-amber-500" },
    { level: "B2", count: 18, dot: "bg-orange-500" },
    { level: "C1", count: 8, dot: "bg-red-500" },
    { level: "C2", count: 3, dot: "bg-purple-500" },
  ];

  return (
    <MockupFrame label="DIFFICULTY · Mr.🆖 ProReader">
      {/* header — title + analyze + hide/show cards toggle */}
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-[var(--lp-rule)] pb-3">
        <BarChart3 className="h-4 w-4 text-[var(--lp-ink-soft)]" />
        <span className="font-display text-sm font-semibold text-[var(--lp-ink)]">Text Difficulty Analysis</span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2 py-1 text-[10px] text-[var(--lp-ink)]">
          <Gauge className="h-3 w-3" /> Analyze
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--lp-accent)] px-2 py-1 text-[10px] font-medium text-white">
          <EyeOff className="h-3 w-3" /> Hide
        </span>
      </div>

      {/* 3 DifficultyCards in a row */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {cards.map((c) => (
          <div
            key={c.title}
            className="rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-2.5"
          >
            <p className="mb-2 border-b border-[var(--lp-rule)] pb-1.5 text-center text-[10px] font-medium text-[var(--lp-ink)]">
              {c.title}
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[var(--lp-ink-soft)]">CEFR</span>
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${c.cefrCls}`}>{c.cefr}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[var(--lp-ink-soft)]">Words</span>
                <span className="text-[10px] text-[var(--lp-ink)]">{c.words}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[var(--lp-ink-soft)]">Sentences</span>
                <span className="text-[10px] text-[var(--lp-ink)]">{c.sentences}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[var(--lp-ink-soft)]">Avg len</span>
                <span className="text-[10px] text-[var(--lp-ink)]">{c.avgLen}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[var(--lp-ink-soft)]">Flesch</span>
                <span className="text-[10px] text-[var(--lp-ink)]">{c.flesch}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[var(--lp-ink-soft)]">Grade</span>
                <span className="text-[10px] text-[var(--lp-ink)]">{c.grade}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CEFR Word Highlight panel — mirrors CefrTextHighlighter */}
      <div className="rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Highlighter className="h-3.5 w-3.5 text-[var(--lp-ink-soft)]" />
            <span className="text-[11px] font-medium text-[var(--lp-ink)]">CEFR Word Highlight</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-[var(--lp-accent)] px-2 py-1 text-[10px] font-medium text-white">
            <X className="h-3 w-3" /> Hide
          </span>
        </div>

        {/* legend — clickable CEFR level chips */}
        <div className="mb-3 flex flex-wrap gap-1.5 border-b border-[var(--lp-rule)] pb-2">
          {cefrLegend.map((c) => (
            <span
              key={c.level}
              className="inline-flex items-center gap-1 text-[9px] text-[var(--lp-ink)]"
            >
              <span className={`h-2.5 w-2.5 rounded ${c.dot}`} />
              <span className="font-medium">{c.level}</span>
              <span className="text-[var(--lp-ink-soft)]">({c.count})</span>
            </span>
          ))}
        </div>

        {/* highlighted text body — 2 paragraphs with CEFR-colored words */}
        <div className="max-h-48 space-y-2 overflow-hidden text-[10px] leading-relaxed text-[var(--lp-ink)]">
          <p>
            I{" "}
            <span className="rounded bg-orange-200 px-0.5 text-[var(--lp-ink)] dark:bg-orange-800 dark:text-orange-100">presented</span>{" "}
            plenty of{" "}
            <span className="rounded bg-amber-200 px-0.5 text-[var(--lp-ink)] dark:bg-amber-800 dark:text-amber-100">evidence</span>{" "}
            that{" "}
            <span className="rounded bg-amber-200 px-0.5 text-[var(--lp-ink)] dark:bg-amber-800 dark:text-amber-100">recycling</span>{" "}
            was{" "}
            <span className="rounded bg-orange-200 px-0.5 text-[var(--lp-ink)] dark:bg-orange-800 dark:text-orange-100">costly</span>{" "}
            and{" "}
            <span className="rounded bg-red-200 px-0.5 text-[var(--lp-ink)] dark:bg-red-800 dark:text-red-100">inefficient</span>
            , but its{" "}
            <span className="rounded bg-red-200 px-0.5 text-[var(--lp-ink)] dark:bg-red-800 dark:text-red-100">defenders</span>{" "}
            said that it was{" "}
            <span className="rounded bg-amber-200 px-0.5 text-[var(--lp-ink)] dark:bg-amber-800 dark:text-amber-100">unfair</span>{" "}
            to rush to{" "}
            <span className="rounded bg-orange-200 px-0.5 text-[var(--lp-ink)] dark:bg-orange-800 dark:text-orange-100">judgment</span>
            . They{" "}
            <span className="rounded bg-orange-200 px-0.5 text-[var(--lp-ink)] dark:bg-orange-800 dark:text-orange-100">predicted</span>{" "}
            it would{" "}
            <span className="rounded bg-red-200 px-0.5 text-[var(--lp-ink)] dark:bg-red-800 dark:text-red-100">flourish</span>{" "}
            as the industry{" "}
            <span className="rounded bg-red-200 px-0.5 text-[var(--lp-ink)] dark:bg-red-800 dark:text-red-100">matured</span>
            .
          </p>
          <p>
            <span className="rounded bg-red-200 px-0.5 text-[var(--lp-ink)] dark:bg-red-800 dark:text-red-100">Critics</span>
            , however, were not{" "}
            <span className="rounded bg-amber-200 px-0.5 text-[var(--lp-ink)] dark:bg-amber-800 dark:text-amber-100">convinced</span>
            . They pointed to{" "}
            <span className="rounded bg-amber-200 px-0.5 text-[var(--lp-ink)] dark:bg-amber-800 dark:text-amber-100">studies</span>{" "}
            showing that collecting and{" "}
            <span className="rounded bg-orange-200 px-0.5 text-[var(--lp-ink)] dark:bg-orange-800 dark:text-orange-100">reprocessing</span>{" "}
            waste often consumed more{" "}
            <span className="rounded bg-amber-200 px-0.5 text-[var(--lp-ink)] dark:bg-amber-800 dark:text-amber-100">energy</span>{" "}
            than it saved.
          </p>
        </div>
      </div>
    </MockupFrame>
  );
}
