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
  BadgeCheck,
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
  ArrowRight,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  PenLine,
  MoreHorizontal,
  CircleAlert,
  Activity,
  Archive,
  ArchiveRestore,
  Trash2,
  Bookmark,
  AlarmClock,
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
            {["Hint me", "Step-by-step", "Give answer", "Check answer"].map((label) => (
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

/* ── 5b. MASTER — the student "Learning Journey" dashboard dialog in two
      faithful static slides, mirroring the real Dashboard dialog one card at
      a time: the dialog header + Overview/Sessions tab list, the three
      summary StatCards (Reading Texts · Total Vocabulary · Avg Learning
      Progress), the stacked Daily Learning Activity chart with its time-range
      pills and 17-series legend, the 2-col Reading Activity + AI Features
      Usage row (horizontal stacked bars with the Mind Map ZH/EN split), the
      bucket-coloured score distributions with "Avg:" header chips,
      Spelling/Grammar trend lines with dashed average ReferenceLines, the
      gradient Vocabulary Growth area with its 13 pills, and the teal Skill
      Profile radar with the "Focus area" caption. ── */

/* Full-width time-series scaffold (320×126 viewBox) — dashed CartesianGrid,
   y tick labels and HORIZONTAL date ticks below, like the live charts'
   fontSize-10 XAxis (the student dashboard plots dates, not students). */
const SD_PLOT = { x0: 28, x1: 314, top: 8, base: 104, labelY: 116 };
const SD_BAR_W = 13;
const SD_STEP = (SD_PLOT.x1 - SD_PLOT.x0) / 14;
const sdBarX = (i: number) => SD_PLOT.x0 + i * SD_STEP + (SD_STEP - SD_BAR_W) / 2;
const sdY = (v: number, max: number) => SD_PLOT.base - (v / max) * (SD_PLOT.base - SD_PLOT.top);

/* Half-width scaffold for the 2-col score grid (152×108 viewBox, 4 slots). */
const SD_HALF = { x0: 24, x1: 148, top: 6, base: 88, labelY: 98 };
const SD_HALF_STEP = (SD_HALF.x1 - SD_HALF.x0) / 4;
const sdHalfY = (v: number, max: number) =>
  SD_HALF.base - (v / max) * (SD_HALF.base - SD_HALF.top);

/** Dashed CartesianGrid + YAxis ticks + baseline for the full-width charts. */
function SdGrid({ yMax, yTicks }: { yMax: number; yTicks: number[] }) {
  return (
    <g>
      {yTicks.map((tick) => (
        <g key={tick}>
          <line x1={SD_PLOT.x0} y1={sdY(tick, yMax)} x2={SD_PLOT.x1} y2={sdY(tick, yMax)} stroke="var(--lp-rule)" strokeWidth="0.4" strokeDasharray="2 2" opacity="0.55" />
          <text x={SD_PLOT.x0 - 3} y={sdY(tick, yMax) + 2} textAnchor="end" fontSize="5.5" fill="var(--lp-ink-soft)">
            {tick}
          </text>
        </g>
      ))}
      <line x1={SD_PLOT.x0} y1={SD_PLOT.base} x2={SD_PLOT.x1} y2={SD_PLOT.base} stroke="var(--lp-rule)" strokeWidth="0.7" />
    </g>
  );
}

/** Stacked Bars (stackId="a") over the 14 day slots — rows[day][series]. */
function SdStackedDays({ rows, colors, yMax }: { rows: number[][]; colors: string[]; yMax: number }) {
  const unit = (SD_PLOT.base - SD_PLOT.top) / yMax;
  return (
    <g>
      {rows.map((row, di) => {
        let cum = 0;
        return row.map((v, ki) => {
          if (v <= 0) return null;
          const y = SD_PLOT.base - (cum + v) * unit;
          cum += v;
          return <rect key={`${di}-${ki}`} x={sdBarX(di)} y={y} width={SD_BAR_W} height={v * unit} fill={colors[ki]} />;
        });
      })}
    </g>
  );
}

/** Dashed grid + y ticks + baseline + category x labels for the half charts. */
function SdHalfAxes({ yMax, yTicks, labels }: { yMax: number; yTicks: number[]; labels: string[] }) {
  return (
    <g>
      {yTicks.map((tick) => (
        <g key={tick}>
          <line x1={SD_HALF.x0} y1={sdHalfY(tick, yMax)} x2={SD_HALF.x1} y2={sdHalfY(tick, yMax)} stroke="var(--lp-rule)" strokeWidth="0.4" strokeDasharray="2 2" opacity="0.55" />
          <text x={SD_HALF.x0 - 3} y={sdHalfY(tick, yMax) + 2} textAnchor="end" fontSize="5" fill="var(--lp-ink-soft)">
            {tick}
          </text>
        </g>
      ))}
      <line x1={SD_HALF.x0} y1={SD_HALF.base} x2={SD_HALF.x1} y2={SD_HALF.base} stroke="var(--lp-rule)" strokeWidth="0.7" />
      {labels.map((l, i) => (
        <text
          key={l}
          x={SD_HALF.x0 + i * SD_HALF_STEP + SD_HALF_STEP / 2}
          y={SD_HALF.labelY}
          textAnchor="middle"
          fontSize="4.6"
          fill="var(--lp-ink-soft)"
        >
          {l}
        </text>
      ))}
    </g>
  );
}

/** Bucket Bars with rounded tops (radius [4,4,0,0]) + per-bucket Cell colors. */
function SdBucketBars({ counts, yMax }: { counts: number[]; yMax: number }) {
  const unit = (SD_HALF.base - SD_HALF.top) / yMax;
  const w = 20;
  return (
    <g>
      {counts.map((c, i) =>
        c <= 0 ? null : (
          <rect
            key={i}
            x={SD_HALF.x0 + i * SD_HALF_STEP + (SD_HALF_STEP - w) / 2}
            y={SD_HALF.base - c * unit}
            width={w}
            height={c * unit}
            rx="1.5"
            fill={TD_SCORE_BUCKETS[i].fill}
          />
        ),
      )}
    </g>
  );
}

/** Smooth monotone Line + r-3 dots (scaled down) in the chart's color. */
function SdTrendLine({ values, yMax, color }: { values: number[]; yMax: number; color: string }) {
  const step = (SD_HALF.x1 - SD_HALF.x0) / (values.length - 1);
  const pts = values.map((v, i) => ({ x: SD_HALF.x0 + i * step, y: sdHalfY(v, yMax) }));
  return (
    <g>
      <path d={tdSmoothPath(pts)} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="1.4" fill={color} />
      ))}
    </g>
  );
}

/** Dashed #94a3b8 ReferenceLine with the "Avg: N" label inside top right. */
function SdAvgRef({ avg, yMax }: { avg: number; yMax: number }) {
  const y = sdHalfY(avg, yMax);
  return (
    <g>
      <line x1={SD_HALF.x0} y1={y} x2={SD_HALF.x1} y2={y} stroke="#94a3b8" strokeWidth="0.6" strokeDasharray="2.5 1.8" />
      <text x={SD_HALF.x1} y={y - 1.5} textAnchor="end" fontSize="4.5" fill="#94a3b8">
        Avg: {avg}
      </text>
    </g>
  );
}

/* AI Features Usage — half-width horizontal bars (152×108 viewBox). 11
   feature rows (TD_AI_SERIES = AI_USAGE_KEYS + colors); the Mind Map row
   stacks Chinese (#a78bfa fill2) then English (#8b5cf6) segments like the
   live stacked BarChart (zh → en → value). No legend, like the live chart. */
const SD_AI = { x0: 48, x1: 146, top: 6, base: 96, tickY: 104 };
const SD_AI_UNIT = (SD_AI.x1 - SD_AI.x0) / 25;

function SdAiBars({ rows }: { rows: Array<{ zh?: number; en?: number; value: number }> }) {
  const pitch = (SD_AI.base - SD_AI.top) / rows.length;
  return (
    <g>
      {rows.map((r, i) => {
        const cy = SD_AI.top + pitch * i + pitch / 2;
        const segs = [
          { v: r.zh ?? 0, fill: "#a78bfa" },
          { v: r.en ?? 0, fill: TD_AI_SERIES[i].color },
          { v: r.value, fill: TD_AI_SERIES[i].color },
        ];
        let x = SD_AI.x0;
        return (
          <g key={TD_AI_SERIES[i].label}>
            {segs.map((s, si) => {
              if (s.v <= 0) return null;
              const rect = <rect key={si} x={x} y={cy - 2.2} width={s.v * SD_AI_UNIT} height={4.4} fill={s.fill} />;
              x += s.v * SD_AI_UNIT;
              return rect;
            })}
            <text x={SD_AI.x0 - 2} y={cy + 1.5} textAnchor="end" fontSize="4.2" fill="var(--lp-ink-soft)">
              {TD_AI_SERIES[i].label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** Gradient Area + 2px stroke — gradSessions (#3b82f6) / gradVocab (#6366f1). */
function SdArea({ pts, baseY, color, gradId, strokeW = 1.4 }: { pts: Array<{ x: number; y: number }>; baseY: number; color: string; gradId: string; strokeW?: number }) {
  const line = tdSmoothPath(pts);
  return (
    <g>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={color} stopOpacity={0.3} />
          <stop offset="95%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${line} L ${pts[pts.length - 1].x} ${baseY} L ${pts[0].x} ${baseY} Z`} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/** StatCard / HighlightedStatCard — rounded-xl border bg-card p-4 (primary
    border + tint + value when highlighted). */
function SdStatCard({ icon: Icon, tone, label, value, sub, highlight = false }: {
  icon: typeof BookOpen;
  tone: string;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-0.5 rounded-xl border p-2 ${highlight ? "border-primary/30 bg-primary/5" : "border-[var(--lp-rule)] bg-card"}`}>
      <p className="flex items-center gap-1 text-[8px] leading-tight text-muted-foreground">
        <Icon className={`h-2.5 w-2.5 shrink-0 ${tone}`} />
        {label}
      </p>
      <p className={`text-[15px] font-bold leading-none tabular-nums ${highlight ? "text-primary" : "text-[var(--lp-ink)]"}`}>{value}</p>
      {sub && <p className="text-[7px] leading-tight text-muted-foreground">{sub}</p>}
    </div>
  );
}

/* Shared slide chrome — the Learning Journey dialog header, description and
   the full-width Overview/Sessions tab list every live chart sits under. */
function StudentDashboardSlide({ children }: { children: React.ReactNode }) {
  return (
    <MockupFrame label="LEARNING JOURNEY · Mr.🆖 ProReader">
      <div className="flex items-center gap-1.5">
        <BarChart3 className="h-4 w-4 text-[var(--lp-accent)]" />
        <span className="text-xs font-semibold text-[var(--lp-ink)]">Learning Journey</span>
        <HelpCircle className="h-3.5 w-3.5 text-[var(--lp-ink-soft)]" />
      </div>
      <p className="mt-0.5 text-[9px] leading-snug text-[var(--lp-ink-soft)]">
        Track your reading and learning activity, scores, and vocabulary growth, and manage or share your reading sessions.
      </p>
      <div className="mb-3 mt-2 flex gap-1 rounded-lg bg-muted p-1">
        <span className="flex flex-1 items-center justify-center gap-1 rounded-md bg-background px-2.5 py-1 text-[9.5px] font-medium text-[var(--lp-ink)] shadow-sm">
          <BarChart3 className="h-2.5 w-2.5" />
          Overview
        </span>
        <span className="flex flex-1 items-center justify-center gap-1 rounded-md px-2.5 py-1 text-[9.5px] font-medium text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          Sessions
        </span>
      </div>
      <div className="space-y-3">{children}</div>
    </MockupFrame>
  );
}

/* Slide 1/2 — stat cards · Daily Learning Activity · Reading Activity + AI
   Features Usage (the live 2-col row) */
export function StudentDashboardOverviewMockup() {
  // Per-day activity counts (TD_DAILY_SERIES = DAILY_ACTIVITY_KEYS order);
  // only non-zero series paint, like the live stacked BarChart.
  const dailyRows = [
    [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0], // Oct 19
    [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 1], // Oct 20
    [0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2, 0, 0, 0, 0, 0, 0], // Oct 21
    [1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0], // Oct 22
    [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0], // Oct 23
    [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 3, 1, 0, 0, 0, 0, 0], // Oct 24
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0], // Oct 25
    [1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1], // Oct 26
    [0, 0, 0, 0, 0, 0, 0, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0], // Oct 27
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0, 0], // Oct 28
    [0, 1, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 0, 0, 0], // Oct 29
    [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 3, 2, 0, 0, 0, 0, 0], // Oct 30
    [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0], // Oct 31
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1], // Nov 1
  ];
  const dates = ["Oct 19", "Oct 20", "Oct 21", "Oct 22", "Oct 23", "Oct 24", "Oct 25", "Oct 26", "Oct 27", "Oct 28", "Oct 29", "Oct 30", "Oct 31", "Nov 1"];
  // Sessions started per week — totals 24, matching the Reading Texts card.
  const weeklyValues = [2, 3, 1, 4, 2, 5, 7];
  const weekLabels = ["Sep 14", "Sep 28", "Oct 12", "Oct 26"];
  const weeklyStep = (SD_HALF.x1 - SD_HALF.x0) / (weeklyValues.length - 1);
  const weeklyPts = weeklyValues.map((v, i) => ({ x: SD_HALF.x0 + i * weeklyStep, y: sdHalfY(v, 8) }));
  // Generated-artifact counts per AI feature (TD_AI_SERIES order); the Mind
  // Map row stacks its Chinese + English counts in place of `value`.
  const aiRows: Array<{ zh?: number; en?: number; value: number }> = [
    { value: 18 }, // Before You Read
    { value: 21 }, // Summary
    { zh: 6, en: 9, value: 0 }, // Mind Map (ZH + EN stacked)
    { value: 9 }, // Text Visualization
    { value: 12 }, // Adapted Text
    { value: 5 }, // Simplified Text
    { value: 24 }, // Sentence Analysis
    { value: 22 }, // Generate Glossary
    { value: 8 }, // Phrases & Collocations
    { value: 11 }, // Grammar Analysis
    { value: 17 }, // AI Tutor
  ];

  return (
    <StudentDashboardSlide>
      {/* Summary Cards Grid: HighlightedStatCard + two StatCards */}
      <div className="grid grid-cols-3 gap-2">
        <SdStatCard
          icon={BookOpen}
          tone="text-primary"
          highlight
          label="Reading Texts"
          value="24"
          sub="12 from uploaded · 9 from repository · 2 from AI · 1 from shared"
        />
        <SdStatCard icon={BookMarked} tone="text-indigo-500" label="Total Vocabulary" value="312" />
        <SdStatCard icon={TrendingUp} tone="text-emerald-500" label="Avg Learning Progress" value="78%" />
      </div>

      {/* Daily Learning Activity: time pills, stacked bars + 17-series legend */}
      <TdCard title="Daily Learning Activity">
        <TdPills options={["7d", "14d", "30d", "60d", "90d", "180d", "270d", "360d"]} active="14d" />
        <svg viewBox="0 0 320 126" className="w-full">
          <SdGrid yMax={8} yTicks={[0, 2, 4, 6, 8]} />
          <SdStackedDays rows={dailyRows} colors={TD_DAILY_SERIES.map((s) => s.color)} yMax={8} />
          {dates.map((d, i) => (
            <text key={d} x={sdBarX(i) + SD_BAR_W / 2} y={SD_PLOT.labelY} textAnchor="middle" fontSize="4.8" fill="var(--lp-ink-soft)">
              {d}
            </text>
          ))}
        </svg>
        <TdLegend items={TD_DAILY_SERIES} />
      </TdCard>

      {/* Charts Row 1: Reading Activity + AI Features Usage (the live
          md:grid-cols-2 row) */}
      <div className="grid grid-cols-2 gap-2">
        {/* Reading Activity: weekly gradient area (gradSessions blue) */}
        <TdCard title="Reading Activity">
          <svg viewBox="0 0 152 108" className="w-full">
            <SdHalfAxes yMax={8} yTicks={[0, 2, 4, 6, 8]} labels={[]} />
            <SdArea pts={weeklyPts} baseY={SD_HALF.base} color="#3b82f6" gradId="sdGradSessions" strokeW={1.2} />
            {[0, 2, 4, 6].map((i, li) => (
              <text key={i} x={SD_HALF.x0 + i * weeklyStep} y={SD_HALF.labelY} textAnchor={i === 0 ? "start" : i === 6 ? "end" : "middle"} fontSize="4.4" fill="var(--lp-ink-soft)">
                {weekLabels[li]}
              </text>
            ))}
          </svg>
        </TdCard>
        {/* AI Features Usage: horizontal stacked bars, Mind Map ZH+EN split */}
        <TdCard title="AI Features Usage">
          <svg viewBox="0 0 152 108" className="w-full">
            {[0, 5, 10, 15, 20, 25].map((t) => (
              <g key={t}>
                <line x1={SD_AI.x0 + t * SD_AI_UNIT} y1={SD_AI.top} x2={SD_AI.x0 + t * SD_AI_UNIT} y2={SD_AI.base} stroke="var(--lp-rule)" strokeWidth="0.4" strokeDasharray="2 2" opacity="0.55" />
                <text x={SD_AI.x0 + t * SD_AI_UNIT} y={SD_AI.tickY} textAnchor="middle" fontSize="4.5" fill="var(--lp-ink-soft)">
                  {t}
                </text>
              </g>
            ))}
            <line x1={SD_AI.x0} y1={SD_AI.top} x2={SD_AI.x0} y2={SD_AI.base} stroke="var(--lp-rule)" strokeWidth="0.7" />
            <SdAiBars rows={aiRows} />
          </svg>
        </TdCard>
      </div>
    </StudentDashboardSlide>
  );
}

/* Slide 2/2 — score distributions & trends · Vocabulary Growth · Skill Profile */
export function StudentDashboardChartsMockup() {
  const spellingValues = [62, 58, 71, 66, 78, 84, 80, 88]; // avg 73
  const grammarValues = [45, 52, 61, 58, 70, 74, 82]; // avg 63
  // Cumulative vocabulary over the picked 3M window — ends at 312, matching
  // the Total Vocabulary stat card.
  const vocabValues = [118, 142, 163, 184, 203, 221, 242, 258, 274, 289, 301, 312];
  const vocabLabels = ["Aug 10", "Sep 7", "Oct 5", "Oct 26"];
  const vocabStep = (SD_PLOT.x1 - SD_PLOT.x0) / (vocabValues.length - 1);
  const vocabPts = vocabValues.map((v, i) => ({ x: SD_PLOT.x0 + i * vocabStep, y: sdY(v, 350) }));
  const skillValues = [82, 76, 58, 84, 69]; // weakest → Inference

  return (
    <StudentDashboardSlide>
      {/* Score Charts 2×2 grid: two bucket distributions + two trends */}
      <div className="grid grid-cols-2 gap-2">
        {/* ScoreDistributionChart — Avg header chip, bucket Cells, no ref line */}
        <TdCard title="Reading Test Score" headerRight={<TdAvgChip value="69" />}>
          <svg viewBox="0 0 152 108" className="w-full">
            <SdHalfAxes yMax={9} yTicks={[0, 3, 6, 9]} labels={TD_SCORE_BUCKETS.map((b) => b.range)} />
            <SdBucketBars counts={[1, 2, 6, 8]} yMax={9} />
          </svg>
        </TdCard>
        <TdCard title="Vocab Quiz Score" headerRight={<TdAvgChip value="68" />}>
          <svg viewBox="0 0 152 108" className="w-full">
            <SdHalfAxes yMax={12} yTicks={[0, 4, 8, 12]} labels={TD_SCORE_BUCKETS.map((b) => b.range)} />
            <SdBucketBars counts={[2, 3, 7, 12]} yMax={12} />
          </svg>
        </TdCard>
        {/* SpellingTrendChart — dashed avg ReferenceLine, no header chip */}
        <TdCard title="Spelling Score">
          <svg viewBox="0 0 152 108" className="w-full">
            <SdHalfAxes yMax={100} yTicks={[0, 25, 50, 75, 100]} labels={spellingValues.map((_, i) => String(i + 1))} />
            <SdTrendLine values={spellingValues} yMax={100} color="#a855f7" />
            <SdAvgRef avg={73} yMax={100} />
          </svg>
        </TdCard>
        <TdCard title="Grammar Game Score">
          <svg viewBox="0 0 152 108" className="w-full">
            <SdHalfAxes yMax={100} yTicks={[0, 25, 50, 75, 100]} labels={grammarValues.map((_, i) => String(i + 1))} />
            <SdTrendLine values={grammarValues} yMax={100} color="#84cc16" />
            <SdAvgRef avg={63} yMax={100} />
          </svg>
        </TdCard>
      </div>

      {/* Vocabulary Growth: 13 time pills, indigo gradient cumulative area */}
      <TdCard title="Vocabulary Growth">
        <TdPills options={["1W", "2W", "3W", "1M", "2M", "3M", "4M", "5M", "6M", "9M", "1Y", "2Y", "3Y"]} active="3M" />
        <svg viewBox="0 0 320 126" className="w-full">
          <SdGrid yMax={350} yTicks={[0, 100, 200, 300]} />
          <SdArea pts={vocabPts} baseY={SD_PLOT.base} color="#6366f1" gradId="sdGradVocab" />
          {[0, 4, 8, 11].map((i, li) => (
            <text key={i} x={SD_PLOT.x0 + i * vocabStep} y={SD_PLOT.labelY} textAnchor={i === 0 ? "start" : i === 11 ? "end" : "middle"} fontSize="5.5" fill="var(--lp-ink-soft)">
              {vocabLabels[li]}
            </text>
          ))}
        </svg>
      </TdCard>

      {/* Skill Profile: dashed pentagon PolarGrid, teal radar (0.4 fill) +
          the "Focus area" caption from SkillProfileCard */}
      <div className="rounded-xl border border-[var(--lp-rule)] p-2.5">
        <h3 className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--lp-ink)]">
          <Target className="h-3 w-3 text-primary" />
          Reading Comprehension Skill Profile
        </h3>
        <svg viewBox="0 0 320 134" className="mt-1 w-full">
          {[13, 26, 39, 52].map((r) => (
            <polygon
              key={r}
              points={[0, 1, 2, 3, 4].map((i) => { const p = tdRadarPoint(i, r); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" ")}
              fill="none"
              stroke="var(--lp-rule)"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              opacity="0.7"
            />
          ))}
          {[0, 1, 2, 3, 4].map((i) => {
            const p = tdRadarPoint(i, TD_RADAR_R);
            return <line key={`spoke${i}`} x1={TD_RADAR_CX} y1={TD_RADAR_CY} x2={p.x} y2={p.y} stroke="var(--lp-rule)" strokeWidth="0.5" opacity="0.7" />;
          })}
          <polygon points={tdRadarPoly(skillValues)} fill="#14b8a6" fillOpacity="0.4" stroke="#14b8a6" strokeWidth="1.2" strokeLinejoin="round" />
          {TD_SKILL_LABELS.map((label, i) => {
            const p = tdRadarPoint(i, TD_RADAR_R);
            const cos = Math.cos(((-90 + i * 72) * Math.PI) / 180);
            const sin = Math.sin(((-90 + i * 72) * Math.PI) / 180);
            const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
            const x = anchor === "start" ? p.x + 5 : anchor === "end" ? p.x - 5 : p.x;
            const y = i === 0 ? p.y - 6 : sin > 0.5 ? p.y + 9 : p.y + 3;
            return (
              <text key={label} x={x} y={y} textAnchor={anchor} fontSize="6" fill="var(--lp-ink-soft)">
                {label}
              </text>
            );
          })}
        </svg>
        <p className="mt-0.5 text-center text-[8px] text-[var(--lp-ink-soft)]">
          Focus area: <span className="font-medium text-[var(--lp-ink)]">Inference</span>
        </p>
      </div>
    </StudentDashboardSlide>
  );
}

/* ── 6. CLASSROOMS — Teacher Dashboard, five faithful static slides mirroring
      the real TeacherDashboard dialog one chart-card at a time: the dialog
      header + class filter + Export row, then 3 of the 14 charts per slide
      (2 on the last) for a 10-student class. Each card mirrors its live
      component (DailyActivityChart, ReadingTextsChart, ScoreDistChart,
      GrammarGameChart, SpellingScore/Accuracy, VocabularyGrowth,
      SkillAveragesChart): same series colors, buckets, quartile shading,
      dashed class-average ReferenceLines and rotated student axis. ── */

// The class roster — 10 students, shared by every slide so scores tell a
// consistent story across charts (same students lead/lag everywhere).
const TD_STUDENTS = ["Chloe", "Marcus", "Priya", "Ethan", "Sofia", "Liam", "Ava", "Noah", "Isabella", "Ryan"];

// Colors/buckets mirror utils/teacherDashboardMetrics.ts.
const TD_QUARTILE_COLORS = ["#ef4444", "#f97316", "#22c55e", "#3b82f6"];
const TD_QUARTILE_LEGEND = [
  { label: "Q1 (0-25%)", color: "#ef4444" },
  { label: "Q2 (25-50%)", color: "#f97316" },
  { label: "Q3 (50-75%)", color: "#22c55e" },
  { label: "Q4 (75-100%)", color: "#3b82f6" },
];
const TD_SCORE_BUCKETS = [
  { range: "0-25%", fill: "#ef4444" },
  { range: "26-50%", fill: "#f97316" },
  { range: "51-75%", fill: "#22c55e" },
  { range: "76-100%", fill: "#3b82f6" },
];
// DAILY_ACTIVITY_KEYS + DAILY_ACTIVITY_COLORS (labels mirror dashboard.activities.*).
const TD_DAILY_SERIES = [
  { label: "Read Text", color: "#3b82f6" },
  { label: "Before You Read", color: "#f43f5e" },
  { label: "Summary", color: "#6366f1" },
  { label: "Mind Map", color: "#8b5cf6" },
  { label: "Text Visualization", color: "#0ea5e9" },
  { label: "Adapted Text", color: "#22c55e" },
  { label: "Simplified Text", color: "#14b8a6" },
  { label: "Sentence Analysis", color: "#f97316" },
  { label: "Glossary", color: "#eab308" },
  { label: "Phrases & Collocations", color: "#10b981" },
  { label: "Flashcard Review", color: "#f59e0b" },
  { label: "Spelling Game", color: "#ec4899" },
  { label: "Vocab Quiz", color: "#06b6d4" },
  { label: "Reading Test", color: "#ef4444" },
  { label: "Grammar Quiz", color: "#d946ef" },
  { label: "Grammar Game", color: "#84cc16" },
  { label: "AI Tutor", color: "#a855f7" },
];
// AI_USAGE_KEYS + AI_USAGE_COLORS (labels mirror dashboard.features.*).
const TD_AI_SERIES = [
  { label: "Before You Read", color: "#f43f5e" },
  { label: "Summary", color: "#3b82f6" },
  { label: "Mind Map", color: "#8b5cf6" },
  { label: "Text Visualization", color: "#0ea5e9" },
  { label: "Adapted Text", color: "#22c55e" },
  { label: "Simplified Text", color: "#14b8a6" },
  { label: "Sentence Analysis", color: "#f97316" },
  { label: "Generate Glossary", color: "#eab308" },
  { label: "Phrases & Collocations", color: "#10b981" },
  { label: "Grammar Analysis", color: "#d946ef" },
  { label: "AI Tutor", color: "#a855f7" },
];
// VocabularyGrowthChart's STUDENT_COLORS, indexed by student order.
const TD_GROWTH_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f97316", "#8b5cf6", "#14b8a6", "#ec4899", "#eab308", "#06b6d4", "#a855f7"];

/** Mirrors getQuartileColor in utils/teacherDashboardMetrics.ts. */
function tdQuartileColors(values: number[]): string[] {
  const sorted = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const out = new Array<string>(values.length);
  sorted.forEach((s, i) => {
    out[s.i] = TD_QUARTILE_COLORS[Math.min(3, Math.floor((i * 4) / values.length))];
  });
  return out;
}

/* Mini recharts scaffold — 320×150 viewBox with margins for the y tick labels
   (left) and the -45°-rotated student names (bottom), like the live charts'
   XAxis angle={-45} textAnchor="end". */
const TD_PLOT = { x0: 30, x1: 314, top: 10, base: 116, labelY: 126 };
const TD_BAR_W = 17;
const TD_STEP = (TD_PLOT.x1 - TD_PLOT.x0) / TD_STUDENTS.length;
const tdBarX = (i: number) => TD_PLOT.x0 + i * TD_STEP + (TD_STEP - TD_BAR_W) / 2;
const tdBarCX = (i: number) => tdBarX(i) + TD_BAR_W / 2;
const tdY = (v: number, max: number) => TD_PLOT.base - (v / max) * (TD_PLOT.base - TD_PLOT.top);

/** CartesianGrid (dashed) + YAxis ticks + rotated XAxis student names. */
function TdChartAxes({ yMax, yTicks }: { yMax: number; yTicks: number[] }) {
  return (
    <g>
      {TD_STUDENTS.map((_, i) => (
        <line key={`v${i}`} x1={tdBarCX(i)} y1={TD_PLOT.top} x2={tdBarCX(i)} y2={TD_PLOT.base} stroke="var(--lp-rule)" strokeWidth="0.4" opacity="0.3" />
      ))}
      {yTicks.map((tick) => (
        <g key={`h${tick}`}>
          <line x1={TD_PLOT.x0} y1={tdY(tick, yMax)} x2={TD_PLOT.x1} y2={tdY(tick, yMax)} stroke="var(--lp-rule)" strokeWidth="0.4" strokeDasharray="2 2" opacity="0.55" />
          <text x={TD_PLOT.x0 - 3} y={tdY(tick, yMax) + 2} textAnchor="end" fontSize="5.5" fill="var(--lp-ink-soft)">
            {tick}
          </text>
        </g>
      ))}
      <line x1={TD_PLOT.x0} y1={TD_PLOT.base} x2={TD_PLOT.x1} y2={TD_PLOT.base} stroke="var(--lp-rule)" strokeWidth="0.7" />
      {TD_STUDENTS.map((name, i) => (
        <text
          key={name}
          x={tdBarCX(i)}
          y={TD_PLOT.labelY}
          textAnchor="end"
          fontSize="6"
          fill="var(--lp-ink-soft)"
          transform={`rotate(-45 ${tdBarCX(i)} ${TD_PLOT.labelY})`}
        >
          {name}
        </text>
      ))}
    </g>
  );
}

/** Stacked Bars (stackId="a") — rows[student][series]; zero series paint nothing. */
function TdStackedBars({ rows, colors, yMax }: { rows: number[][]; colors: string[]; yMax: number }) {
  const unit = (TD_PLOT.base - TD_PLOT.top) / yMax;
  return (
    <g>
      {rows.map((row, si) => {
        let cum = 0;
        return row.map((v, ki) => {
          if (v <= 0) return null;
          const y = TD_PLOT.base - (cum + v) * unit;
          cum += v;
          return <rect key={`${si}-${ki}`} x={tdBarX(si)} y={y} width={TD_BAR_W} height={v * unit} fill={colors[ki]} />;
        });
      })}
    </g>
  );
}

/** Single-series Bar — optional per-student Cell colors and rounded tops. */
function TdSingleBars({ values, yMax, fill, colors, rounded = false }: { values: number[]; yMax: number; fill?: string; colors?: string[]; rounded?: boolean }) {
  const unit = (TD_PLOT.base - TD_PLOT.top) / yMax;
  return (
    <g>
      {values.map((v, i) =>
        v <= 0 ? null : (
          <rect key={i} x={tdBarX(i)} y={TD_PLOT.base - v * unit} width={TD_BAR_W} height={v * unit} rx={rounded ? 2 : 0} fill={colors?.[i] ?? fill} />
        ),
      )}
    </g>
  );
}

/** Dashed class-average ReferenceLine (y = the rounded classAvg, as live). */
function TdAvgLine({ avg, yMax }: { avg: number; yMax: number }) {
  return (
    <line
      x1={TD_PLOT.x0}
      y1={tdY(avg, yMax)}
      x2={TD_PLOT.x1}
      y2={tdY(avg, yMax)}
      stroke="var(--lp-ink)"
      strokeWidth="0.6"
      strokeDasharray="3 2"
      opacity="0.45"
    />
  );
}

/** Wrapped legend chips — the rounded-sm color squares the live charts use. */
function TdLegend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1 text-[7px] leading-none text-[var(--lp-ink-soft)]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-sm" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/** The small period / time-range pill buttons (variant default = filled). */
function TdPills({ options, active }: { options: string[]; active: string }) {
  return (
    <div className="mb-1.5 flex flex-wrap gap-1">
      {options.map((o) => (
        <span
          key={o}
          className={`rounded-md border px-1.5 py-0.5 text-[7px] font-medium leading-none ${
            o === active
              ? "border-transparent bg-[var(--lp-accent)] text-white"
              : "border-[var(--lp-rule)] text-[var(--lp-ink-soft)]"
          }`}
        >
          {o}
        </span>
      ))}
    </div>
  );
}

/** Chart card — mirrors the live `rounded-xl border bg-card p-4` cards. */
function TdCard({ title, headerRight, children }: { title: string; headerRight?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--lp-rule)] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold text-[var(--lp-ink-soft)]">{title}</p>
        {headerRight != null && <p className="text-[9px] text-[var(--lp-ink-soft)]">{headerRight}</p>}
      </div>
      {children}
    </div>
  );
}

/** The Total/Avg strip under the titles of ReadingTexts/TotalVocabulary/AiFeatures. */
function TdTotalAvgRow({ total, avg }: { total: string; avg: string }) {
  return (
    <p className="mb-1.5 mt-0.5 flex items-center justify-between text-[8px] text-[var(--lp-ink-soft)]">
      <span>
        Total: <strong className="font-semibold tabular-nums text-[var(--lp-ink)]">{total}</strong>
      </span>
      <span>
        Avg: <strong className="font-semibold tabular-nums text-[var(--lp-ink)]">{avg}</strong>
      </span>
    </p>
  );
}

/** The "Avg: N" header chip used by ScoreDist/GrammarGame/Spelling cards. */
function TdAvgChip({ value, percent = false }: { value: string; percent?: boolean }) {
  return (
    <span>
      Avg: <strong className="font-semibold tabular-nums text-[var(--lp-ink)]">{value}{percent ? "%" : ""}</strong>
    </span>
  );
}

/** Shared slide chrome — the dialog header, description and filter row
    (class combobox + Export to Excel) every live chart sits under. */
function TeacherDashboardSlide({ children }: { children: React.ReactNode }) {
  return (
    <MockupFrame label="TEACHER DASHBOARD · Mr.🆖 ProReader">
      <div className="flex items-center gap-1.5">
        <GraduationCap className="h-4 w-4 text-[var(--lp-accent)]" />
        <span className="text-xs font-semibold text-[var(--lp-ink)]">Teacher Dashboard</span>
        <HelpCircle className="h-3.5 w-3.5 text-[var(--lp-ink-soft)]" />
      </div>
      <p className="mt-0.5 text-[9px] leading-snug text-[var(--lp-ink-soft)]">
        Track your students&apos; reading and learning activity, AI usage, scores, and vocabulary growth over time.
      </p>
      <div className="mb-3 mt-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-paper-2)] px-2.5 py-1 text-[10px] font-medium text-[var(--lp-ink)]">
          Form 3B
          <ChevronsUpDown className="h-3 w-3 text-[var(--lp-ink-soft)]" />
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--lp-rule)] px-2 py-1 text-[10px] font-medium text-[var(--lp-ink-soft)]">
          <FileDown className="h-3 w-3" />
          Export to Excel
        </span>
      </div>
      <div className="space-y-3">{children}</div>
    </MockupFrame>
  );
}

/* Slide 1/5 — Daily Learning Activity · Reading Texts · Total Vocabulary */
export function TeacherDashboardActivityMockup() {
  // Per-student activity counts on the picked day (TD_DAILY_SERIES order);
  // only non-zero series paint, like the live stacked BarChart.
  const dailyRows = [
    [3, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0], // Chloe
    [2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], // Marcus
    [2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0], // Priya
    [3, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1], // Ethan
    [3, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0], // Sofia
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0], // Liam
    [2, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0], // Ava
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Noah
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], // Isabella
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0], // Ryan
  ];
  const readingValues = [14, 11, 9, 10, 15, 7, 12, 5, 9, 4]; // total 96, avg 10
  const vocabValues = [186, 132, 104, 121, 172, 76, 158, 61, 98, 48]; // total 1156, avg 116

  return (
    <TeacherDashboardSlide>
      {/* DailyActivityChart: title + ‹ date › nav (forward disabled on today) */}
      <TdCard
        title="Daily Learning Activity"
        headerRight={
          <span className="inline-flex items-center gap-1">
            <ChevronLeft className="h-3 w-3" />
            <Calendar className="h-2.5 w-2.5 opacity-70" />
            <span className="tabular-nums">Nov 1, 2026</span>
            <ChevronRight className="h-3 w-3 opacity-30" />
          </span>
        }
      >
        <svg viewBox="0 0 320 150" className="mt-1 w-full">
          <TdChartAxes yMax={8} yTicks={[0, 2, 4, 6, 8]} />
          <TdStackedBars rows={dailyRows} colors={TD_DAILY_SERIES.map((s) => s.color)} yMax={8} />
        </svg>
        <TdLegend items={TD_DAILY_SERIES} />
      </TdCard>

      {/* ReadingTextsChart: Total/Avg strip, period pills, quartile bars + avg line */}
      <TdCard title="Reading Texts">
        <TdTotalAvgRow total="96" avg="10" />
        <TdPills options={["All", "1W", "2W", "1M", "2M", "3M", "6M", "9M", "1Y"]} active="All" />
        <svg viewBox="0 0 320 150" className="w-full">
          <TdChartAxes yMax={16} yTicks={[0, 4, 8, 12, 16]} />
          <TdAvgLine avg={10} yMax={16} />
          <TdSingleBars values={readingValues} yMax={16} colors={tdQuartileColors(readingValues)} rounded />
        </svg>
        <TdLegend items={TD_QUARTILE_LEGEND} />
      </TdCard>

      {/* TotalVocabularyChart: same layout, no period pills */}
      <TdCard title="Total Vocabulary">
        <TdTotalAvgRow total="1156" avg="116" />
        <svg viewBox="0 0 320 150" className="mt-2 w-full">
          <TdChartAxes yMax={200} yTicks={[0, 50, 100, 150, 200]} />
          <TdAvgLine avg={116} yMax={200} />
          <TdSingleBars values={vocabValues} yMax={200} colors={tdQuartileColors(vocabValues)} rounded />
        </svg>
        <TdLegend items={TD_QUARTILE_LEGEND} />
      </TdCard>
    </TeacherDashboardSlide>
  );
}

/* Slide 2/5 — Avg Learning Progress · AI Features Usage · Reading Test Score */
export function TeacherDashboardProgressMockup() {
  const progressValues = [92, 78, 63, 74, 88, 52, 85, 41, 66, 38]; // avg 68%
  // Per-student AI usage (TD_AI_SERIES order); totals 82, avg 8.
  const aiRows = [
    [0, 6, 4, 0, 0, 0, 0, 5, 0, 0, 3], // Chloe
    [0, 4, 0, 0, 3, 0, 0, 0, 0, 2, 0], // Marcus
    [0, 3, 0, 0, 0, 0, 0, 2, 0, 0, 0], // Priya
    [0, 4, 3, 0, 0, 0, 0, 0, 0, 2, 3], // Ethan
    [2, 5, 0, 4, 0, 0, 0, 4, 0, 0, 0], // Sofia
    [0, 1, 0, 0, 0, 0, 0, 2, 0, 0, 0], // Liam
    [0, 4, 2, 0, 2, 0, 0, 0, 3, 0, 0], // Ava
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], // Noah
    [0, 3, 0, 0, 0, 1, 0, 0, 0, 0, 2], // Isabella
    [0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0], // Ryan
  ];
  // Reading Test scores per bucket (0-25/26-50/51-75/76-100) per student.
  const testDistRows = [
    [0, 0, 1, 4],
    [0, 1, 2, 2],
    [0, 1, 3, 1],
    [0, 0, 3, 2],
    [0, 0, 1, 4],
    [1, 2, 2, 0],
    [0, 1, 2, 2],
    [2, 2, 1, 0],
    [0, 1, 3, 1],
    [2, 2, 1, 0],
  ];

  return (
    <TeacherDashboardSlide>
      {/* AvgProgressChart: Avg in the title row, quartile bars, 0-100 domain */}
      <TdCard title="Avg Learning Progress" headerRight={<TdAvgChip value="68" percent />}>
        <svg viewBox="0 0 320 150" className="w-full">
          <TdChartAxes yMax={100} yTicks={[0, 25, 50, 75, 100]} />
          <TdAvgLine avg={68} yMax={100} />
          <TdSingleBars values={progressValues} yMax={100} colors={tdQuartileColors(progressValues)} rounded />
        </svg>
        <TdLegend items={TD_QUARTILE_LEGEND} />
      </TdCard>

      {/* AiFeaturesChart: Total/Avg strip, stacked bars (11 series) + avg line */}
      <TdCard title="AI Features Usage">
        <TdTotalAvgRow total="82" avg="8" />
        <svg viewBox="0 0 320 150" className="w-full">
          <TdChartAxes yMax={20} yTicks={[0, 5, 10, 15, 20]} />
          <TdAvgLine avg={8.2} yMax={20} />
          <TdStackedBars rows={aiRows} colors={TD_AI_SERIES.map((s) => s.color)} yMax={20} />
        </svg>
        <TdLegend items={TD_AI_SERIES} />
      </TdCard>

      {/* ScoreDistChart (Reading Test): stacked bucket counts, no ref line */}
      <TdCard title="Reading Test Score" headerRight={<TdAvgChip value="72" />}>
        <svg viewBox="0 0 320 150" className="w-full">
          <TdChartAxes yMax={6} yTicks={[0, 2, 4, 6]} />
          <TdStackedBars rows={testDistRows} colors={TD_SCORE_BUCKETS.map((b) => b.fill)} yMax={6} />
        </svg>
        <TdLegend items={TD_SCORE_BUCKETS.map((b) => ({ label: b.range, color: b.fill }))} />
      </TdCard>
    </TeacherDashboardSlide>
  );
}

/* Slide 3/5 — Vocab Quiz Score · Grammar Quiz Score · Grammar Game Score */
export function TeacherDashboardQuizScoresMockup() {
  const quizDistRows = [
    [0, 0, 1, 5],
    [0, 1, 2, 2],
    [0, 1, 3, 1],
    [0, 1, 2, 2],
    [0, 0, 2, 4],
    [1, 2, 1, 0],
    [0, 1, 2, 2],
    [2, 1, 1, 0],
    [0, 1, 3, 1],
    [1, 2, 1, 0],
  ];
  const grammarQuizDistRows = [
    [0, 1, 2, 2],
    [0, 1, 3, 1],
    [1, 2, 2, 0],
    [0, 1, 2, 1],
    [0, 1, 2, 2],
    [1, 2, 1, 0],
    [0, 1, 2, 2],
    [2, 2, 0, 0],
    [1, 2, 1, 0],
    [2, 2, 0, 0],
  ];
  // GrammarGameChart: per-student avg game score, lime bars + avg line, no legend.
  const gameScores = [88, 72, 55, 66, 84, 47, 81, 39, 58, 35]; // avg 63

  return (
    <TeacherDashboardSlide>
      <TdCard title="Vocab Quiz Score" headerRight={<TdAvgChip value="74" />}>
        <svg viewBox="0 0 320 150" className="w-full">
          <TdChartAxes yMax={6} yTicks={[0, 2, 4, 6]} />
          <TdStackedBars rows={quizDistRows} colors={TD_SCORE_BUCKETS.map((b) => b.fill)} yMax={6} />
        </svg>
        <TdLegend items={TD_SCORE_BUCKETS.map((b) => ({ label: b.range, color: b.fill }))} />
      </TdCard>

      <TdCard title="Grammar Quiz Score" headerRight={<TdAvgChip value="65" />}>
        <svg viewBox="0 0 320 150" className="w-full">
          <TdChartAxes yMax={5} yTicks={[0, 1, 2, 3, 4, 5]} />
          <TdStackedBars rows={grammarQuizDistRows} colors={TD_SCORE_BUCKETS.map((b) => b.fill)} yMax={5} />
        </svg>
        <TdLegend items={TD_SCORE_BUCKETS.map((b) => ({ label: b.range, color: b.fill }))} />
      </TdCard>

      <TdCard title="Grammar Game Score" headerRight={<TdAvgChip value="63" />}>
        <svg viewBox="0 0 320 150" className="w-full">
          <TdChartAxes yMax={100} yTicks={[0, 25, 50, 75, 100]} />
          <TdAvgLine avg={63} yMax={100} />
          <TdSingleBars values={gameScores} yMax={100} fill="#84cc16" rounded />
        </svg>
      </TdCard>
    </TeacherDashboardSlide>
  );
}

/* Slide 4/5 — Grammar Game Accuracy · Spelling Score · Spelling Accuracy */
export function TeacherDashboardSpellingMockup() {
  const gameAccDistRows = [
    [0, 0, 1, 3],
    [0, 1, 2, 1],
    [0, 2, 2, 0],
    [0, 1, 2, 1],
    [0, 0, 2, 2],
    [1, 2, 1, 0],
    [0, 1, 2, 1],
    [2, 1, 1, 0],
    [1, 2, 1, 0],
    [1, 2, 1, 0],
  ];
  // SpellingScoreChart / SpellingAccuracyChart: single bars + avg line, no legend.
  const spellingScores = [92, 76, 61, 70, 85, 52, 82, 44, 64, 40]; // avg 67
  const spellingAccuracies = [95, 82, 68, 76, 90, 58, 88, 49, 70, 45]; // avg 72%

  return (
    <TeacherDashboardSlide>
      <TdCard title="Grammar Game Accuracy" headerRight={<TdAvgChip value="68" />}>
        <svg viewBox="0 0 320 150" className="w-full">
          <TdChartAxes yMax={4} yTicks={[0, 1, 2, 3, 4]} />
          <TdStackedBars rows={gameAccDistRows} colors={TD_SCORE_BUCKETS.map((b) => b.fill)} yMax={4} />
        </svg>
        <TdLegend items={TD_SCORE_BUCKETS.map((b) => ({ label: b.range, color: b.fill }))} />
      </TdCard>

      <TdCard title="Spelling Score" headerRight={<TdAvgChip value="67" />}>
        <svg viewBox="0 0 320 150" className="w-full">
          <TdChartAxes yMax={100} yTicks={[0, 25, 50, 75, 100]} />
          <TdAvgLine avg={67} yMax={100} />
          <TdSingleBars values={spellingScores} yMax={100} fill="#a855f7" rounded />
        </svg>
      </TdCard>

      <TdCard title="Spelling Accuracy" headerRight={<TdAvgChip value="72" percent />}>
        <svg viewBox="0 0 320 150" className="w-full">
          <TdChartAxes yMax={100} yTicks={[0, 25, 50, 75, 100]} />
          <TdAvgLine avg={72} yMax={100} />
          <TdSingleBars values={spellingAccuracies} yMax={100} fill="#ec4899" rounded />
        </svg>
      </TdCard>
    </TeacherDashboardSlide>
  );
}

/* Slide 5/5 — Vocabulary Growth · Class Reading Comprehension Skill Profile */

/** Monotone-ish 30-day growth series (8 weekly-ish points, deterministic). */
function tdGrowLine(start: number, end: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const wobble = ((i * 7 + start) % 5) - 2; // deterministic -2..2 wiggle
    pts.push(Math.max(0, Math.round(start + (end - start) * t + wobble * (1 - t))));
  }
  pts[7] = end;
  return pts;
}

/** Catmull-Rom → cubic Bézier, approximating recharts' type="monotone". */
function tdSmoothPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = (p1.x + (p2.x - p0.x) / 6).toFixed(1);
    const c1y = (p1.y + (p2.y - p0.y) / 6).toFixed(1);
    const c2x = (p2.x - (p3.x - p1.x) / 6).toFixed(1);
    const c2y = (p2.y - (p3.y - p1.y) / 6).toFixed(1);
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

const TD_RADAR_CX = 160;
const TD_RADAR_CY = 70;
const TD_RADAR_R = 52;
const TD_SKILL_LABELS = ["Main Idea", "Detail", "Inference", "Vocabulary", "Author's Purpose"];
const TD_SKILL_VALUES = [78, 71, 58, 81, 66]; // weakest → Inference

function tdRadarPoint(i: number, r: number): { x: number; y: number } {
  const ang = ((-90 + i * 72) * Math.PI) / 180;
  return { x: TD_RADAR_CX + r * Math.cos(ang), y: TD_RADAR_CY + r * Math.sin(ang) };
}

function tdRadarPoly(values: number[], max = 100): string {
  return values
    .map((v, i) => {
      const p = tdRadarPoint(i, (v / max) * TD_RADAR_R);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");
}

export function TeacherDashboardGrowthMockup() {
  // Vocabulary totals at Nov 1 with their 30-day starting points.
  const growthSeries = [
    { name: "Chloe", start: 154, end: 186 },
    { name: "Marcus", start: 111, end: 132 },
    { name: "Priya", start: 88, end: 104 },
    { name: "Ethan", start: 103, end: 121 },
    { name: "Sofia", start: 143, end: 172 },
    { name: "Liam", start: 68, end: 76 },
    { name: "Ava", start: 133, end: 158 },
    { name: "Noah", start: 56, end: 61 },
    { name: "Isabella", start: 84, end: 98 },
    { name: "Ryan", start: 44, end: 48 },
  ];
  const growthXs = Array.from({ length: 8 }, (_, i) => TD_PLOT.x0 + (i * (TD_PLOT.x1 - TD_PLOT.x0)) / 7);
  const growthPaths = growthSeries.map((s) => {
    const pts = tdGrowLine(s.start, s.end).map((v, i) => ({ x: growthXs[i], y: tdY(v, 200) }));
    return { name: s.name, line: tdSmoothPath(pts), area: `${tdSmoothPath(pts)} L ${TD_PLOT.x1} ${TD_PLOT.base} L ${TD_PLOT.x0} ${TD_PLOT.base} Z` };
  });

  return (
    <TeacherDashboardSlide>
      {/* VocabularyGrowthChart: 13 time-range pills ("1M" active), smooth
          monotone areas (fillOpacity 0.1), toggle-chip legend */}
      <TdCard title="Vocabulary Growth">
        <TdPills options={["1W", "2W", "3W", "1M", "2M", "3M", "4M", "5M", "6M", "9M", "1Y", "2Y", "3Y"]} active="1M" />
        <svg viewBox="0 0 320 134" className="w-full">
          {[0, 50, 100, 150, 200].map((tick) => (
            <g key={tick}>
              <line x1={TD_PLOT.x0} y1={tdY(tick, 200)} x2={TD_PLOT.x1} y2={tdY(tick, 200)} stroke="var(--lp-rule)" strokeWidth="0.4" strokeDasharray="2 2" opacity="0.55" />
              <text x={TD_PLOT.x0 - 3} y={tdY(tick, 200) + 2} textAnchor="end" fontSize="5.5" fill="var(--lp-ink-soft)">
                {tick}
              </text>
            </g>
          ))}
          <line x1={TD_PLOT.x0} y1={TD_PLOT.base} x2={TD_PLOT.x1} y2={TD_PLOT.base} stroke="var(--lp-rule)" strokeWidth="0.7" />
          {growthPaths.map((g) => (
            <path key={`a-${g.name}`} d={g.area} fill={TD_GROWTH_COLORS[TD_STUDENTS.indexOf(g.name)]} opacity="0.1" />
          ))}
          {growthPaths.map((g) => (
            <path key={`l-${g.name}`} d={g.line} fill="none" stroke={TD_GROWTH_COLORS[TD_STUDENTS.indexOf(g.name)]} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {[
            { label: "Oct 3", x: TD_PLOT.x0, anchor: "start" as const },
            { label: "Oct 10", x: 101, anchor: "middle" as const },
            { label: "Oct 17", x: 172, anchor: "middle" as const },
            { label: "Oct 24", x: 243, anchor: "middle" as const },
            { label: "Oct 31", x: TD_PLOT.x1, anchor: "end" as const },
          ].map((d) => (
            <text key={d.label} x={d.x} y={126} textAnchor={d.anchor} fontSize="6" fill="var(--lp-ink-soft)">
              {d.label}
            </text>
          ))}
        </svg>
        <TdLegend items={TD_STUDENTS.map((name, i) => ({ label: name, color: TD_GROWTH_COLORS[i] }))} />
      </TdCard>

      {/* SkillAveragesChart: dashed pentagon PolarGrid, teal radar (0.4 fill),
          "Students: 10" chip and the "Focus area" footer */}
      <TdCard
        title="Class Reading Comprehension Skill Profile"
        headerRight={
          <span>
            Students: <strong className="font-semibold tabular-nums text-[var(--lp-ink)]">10</strong>
          </span>
        }
      >
        <svg viewBox="0 0 320 134" className="w-full">
          {/* concentric rings (0/25/50/75/100%) + spokes, dashed like PolarGrid */}
          {[13, 26, 39, 52].map((r) => (
            <polygon
              key={r}
              points={[0, 1, 2, 3, 4].map((i) => { const p = tdRadarPoint(i, r); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" ")}
              fill="none"
              stroke="var(--lp-rule)"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              opacity="0.7"
            />
          ))}
          {[0, 1, 2, 3, 4].map((i) => {
            const p = tdRadarPoint(i, TD_RADAR_R);
            return <line key={`spoke${i}`} x1={TD_RADAR_CX} y1={TD_RADAR_CY} x2={p.x} y2={p.y} stroke="var(--lp-rule)" strokeWidth="0.5" opacity="0.7" />;
          })}
          <polygon points={tdRadarPoly(TD_SKILL_VALUES)} fill="#14b8a6" fillOpacity="0.4" stroke="#14b8a6" strokeWidth="1.2" strokeLinejoin="round" />
          {TD_SKILL_LABELS.map((label, i) => {
            const p = tdRadarPoint(i, TD_RADAR_R);
            const cos = Math.cos(((-90 + i * 72) * Math.PI) / 180);
            const sin = Math.sin(((-90 + i * 72) * Math.PI) / 180);
            const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
            const x = anchor === "start" ? p.x + 5 : anchor === "end" ? p.x - 5 : p.x;
            const y = i === 0 ? p.y - 6 : sin > 0.5 ? p.y + 9 : p.y + 3;
            return (
              <text key={label} x={x} y={y} textAnchor={anchor} fontSize="6" fill="var(--lp-ink-soft)">
                {label}
              </text>
            );
          })}
        </svg>
        <p className="mt-0.5 text-center text-[8px] text-[var(--lp-ink-soft)]">
          Focus area: <span className="font-medium text-[var(--lp-ink)]">Inference</span>
        </p>
      </TdCard>
    </TeacherDashboardSlide>
  );
}

/* ── 7. ASSIGNMENTS — two faithful, static mockups of the real /assignments pages ── */
// Both mirror the live components with static <span>s standing in for buttons:
//  - AssignmentDetailMockup → /assignments/[id] teacher view (AssignmentStats + roster table)
//  - AssignmentsListMockup  → /assignments with the "My Assignments" tab active
//    (header tabs, saved-roster bar, status filter, assignment cards with teacher actions)

// Tier colors mirror TIER_COLORS in utils/assignmentStats.ts, and the 70/50
// thresholds mirror PASS_THRESHOLD / STRUGGLE_THRESHOLD there.
const TIER = { below: "#ef4444", mid: "#f59e0b", pass: "#22c55e" } as const;
const tierColor = (score: number) => (score < 50 ? TIER.below : score < 70 ? TIER.mid : TIER.pass);

/** Per-activity accents mirror ACTIVITY_META in components/Assignments/AssignmentStats.tsx. */
const ROSTER_ACTIVITIES = [
  { key: "test", label: "Reading test", icon: BookOpenCheck, accent: "#14b8a6" },
  { key: "vocab", label: "Vocab quiz", icon: ClipboardList, accent: "#3b82f6" },
  { key: "spell", label: "Spelling", icon: SpellCheck, accent: "#ec4899" },
  { key: "gq", label: "Grammar quiz", icon: GraduationCap, accent: "#d946ef" },
  { key: "gg", label: "Grammar game", icon: Gamepad2, accent: "#f59e0b" },
] as const;

export function AssignmentDetailMockup() {
  // Performance-by-activity chart data — hardest (lowest mean) at the top,
  // exactly like the real AssignmentStats bar chart.
  const performance = [
    { key: "gg", mean: 48 },
    { key: "gq", mean: 64 },
    { key: "spell", mean: 72 },
    { key: "vocab", mean: 78 },
    { key: "test", mean: 81 },
  ] as const;

  // Participation & mastery cards — attempted/pass/avg kept consistent with
  // the chart means above and the 28-student roster.
  const participation: Record<
    string,
    { attempted: number; pass: number; mid: number; below: number; passRate: number; avg: number }
  > = {
    test: { attempted: 24, pass: 18, mid: 4, below: 2, passRate: 75, avg: 81 },
    vocab: { attempted: 22, pass: 16, mid: 4, below: 2, passRate: 73, avg: 78 },
    spell: { attempted: 20, pass: 13, mid: 5, below: 2, passRate: 65, avg: 72 },
    gq: { attempted: 18, pass: 9, mid: 6, below: 3, passRate: 50, avg: 64 },
    gg: { attempted: 15, pass: 5, mid: 6, below: 4, passRate: 33, avg: 48 },
  };
  const total = 28;

  // Students needing attention — every chip score is below the 50 threshold.
  const atRisk = [
    { name: "Priya K.", email: "priya.k@school.edu.hk", weak: [{ key: "gg", score: 45 }] },
    { name: "Wong Ka-ho", email: "khwong@school.edu.hk", weak: [{ key: "gq", score: 42 }, { key: "gg", score: 38 }] },
    { name: "Johnson A.", email: "a.johnson@school.edu.hk", weak: [{ key: "spell", score: 48 }] },
  ] as const;

  // Roster rows — score columns match the real activity meta; the table loads
  // sorted by student name asc (the real default sort). Scores render as blue
  // drill-down links, missing scores as "-", empty view dates as "Never".
  const roster = [
    { name: "Chloe L.", email: "chloe.l@school.edu.hk", progress: 100, scores: { test: 92, vocab: 88, spell: 90, gq: 85, gg: 80 }, viewed: "Jun 9, 2026, 02:22 PM" },
    { name: "Ethan W.", email: "ethan.w@school.edu.hk", progress: 24, scores: { test: null, vocab: null, spell: null, gq: null, gg: null }, viewed: "Never" },
    { name: "Johnson A.", email: "a.johnson@school.edu.hk", progress: 60, scores: { test: 66, vocab: 60, spell: 48, gq: 52, gg: 55 }, viewed: "Jun 6, 2026, 11:05 AM" },
    { name: "Marcus T.", email: "marcus.t@school.edu.hk", progress: 80, scores: { test: 74, vocab: 70, spell: 78, gq: 72, gg: 68 }, viewed: "Jun 8, 2026, 09:10 AM" },
  ] as const;

  const labelFor = (key: string) => ROSTER_ACTIVITIES.find((a) => a.key === key)!.label;

  return (
    <MockupFrame label="ASSIGNMENT DETAIL · Mr.🆖 ProReader">
      {/* ── back row (real page: ghost Button + ArrowLeft) ── */}
      <div className="flex">
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--lp-ink-soft)]">
          <ArrowLeft className="h-3 w-3" /> Back
        </span>
      </div>

      {/* ── header card: title / subject / badges + meta row ── */}
      <div className="mt-2 rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-[var(--lp-ink)]">
              DSE 2023 Paper 1 — Reading
            </p>
            <p className="mt-0.5 text-[9px] text-[var(--lp-ink-soft)]">English · Paper 1</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {/* Badge variant="default" */}
            <span className="rounded-md bg-[var(--lp-accent)] px-1.5 py-0.5 text-[8px] font-semibold text-white">
              Active
            </span>
            {/* Badge variant="destructive" — past due with progress < 100% */}
            <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-[8px] font-semibold text-white">
              Overdue
            </span>
          </div>
        </div>
        <p className="mt-1.5 text-[9px] leading-snug text-[var(--lp-ink-soft)]">
          Read the passage and complete all sections before the deadline.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--lp-rule)] pt-2 text-[9px] text-[var(--lp-ink-soft)]">
          <span className="inline-flex items-center gap-1 text-red-500">
            <Calendar className="h-2.5 w-2.5" /> Due Jun 12, 2026
          </span>
          <span className="inline-flex items-center gap-1">
            <BadgeCheck className="h-2.5 w-2.5" /> Completed: 18/28 students
          </span>
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="h-2.5 w-2.5" /> Avg progress: 64%
          </span>
        </div>
      </div>

      {/* ── export button (right-aligned outline Button, like the real page) ── */}
      <div className="mt-2 flex justify-end">
        <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--lp-rule)] px-2 py-1 text-[9px] font-medium text-[var(--lp-ink)]">
          <Download className="h-2.5 w-2.5" /> Export to Excel
        </span>
      </div>

      {/* ── "Class insights" section heading (AssignmentStats SectionHeading) ── */}
      <div className="mt-2.5 flex items-center gap-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
          <Sparkles className="h-3 w-3" />
        </span>
        <div>
          <p className="text-[9px] font-semibold leading-tight text-[var(--lp-ink)]">Class insights</p>
          <p className="text-[7px] text-[var(--lp-ink-soft)]">Aggregated performance across all assigned students.</p>
        </div>
      </div>

      {/* ── overview strip — mirrors the real StatCard layout (icon+label → value → sub) ── */}
      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
        <div className="rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-2">
          <div className="flex items-center gap-1 text-[7px] text-[var(--lp-ink-soft)]">
            <Users className="h-2 w-2 text-[var(--lp-accent)]" /> Students assessed
          </div>
          <div className="mt-0.5 font-display text-sm font-bold tabular-nums text-[var(--lp-ink)]">
            24<span className="text-[9px] font-normal text-[var(--lp-ink-soft)]"> / 28</span>
          </div>
          <div className="text-[6.5px] text-[var(--lp-ink-soft)]">have at least one score</div>
        </div>
        <div className="rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-2">
          <div className="flex items-center gap-1 text-[7px] text-[var(--lp-ink-soft)]">
            <TrendingUp className="h-2 w-2 text-emerald-500" /> Avg participation
          </div>
          <div className="mt-0.5 font-display text-sm font-bold tabular-nums text-[var(--lp-ink)]">71%</div>
          <div className="text-[6.5px] text-[var(--lp-ink-soft)]">across all activities</div>
        </div>
        <div className="rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-2">
          <div className="flex items-center gap-1 text-[7px] text-[var(--lp-ink-soft)]">
            <Award className="h-2 w-2 text-indigo-500" /> Class average
          </div>
          <div className="mt-0.5 font-display text-sm font-bold tabular-nums text-[var(--lp-ink)]">69</div>
          <div className="text-[6.5px] text-[var(--lp-ink-soft)]">all attempts</div>
        </div>
        <div className="rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-2">
          <div className="flex items-center gap-1 text-[7px] text-[var(--lp-ink-soft)]">
            <TriangleAlert className="h-2 w-2 text-amber-500" /> Needing attention
          </div>
          <div className="mt-0.5 font-display text-sm font-bold tabular-nums text-amber-500">3</div>
          <div className="text-[6.5px] text-[var(--lp-ink-soft)]">below 50</div>
        </div>
      </div>

      {/* ── performance by activity (static bar chart, hardest at the top) ── */}
      <div className="mt-1.5 rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[8px] font-semibold text-[var(--lp-ink-soft)]">Performance by activity</p>
            <p className="text-[6.5px] text-[var(--lp-ink-soft)] opacity-70">Mean score (0–100), hardest at the top</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-x-1.5 gap-y-0.5">
            <span className="inline-flex items-center gap-0.5 text-[6.5px] text-[var(--lp-ink-soft)]">
              <span className="h-1.5 w-1.5 rounded-sm" style={{ background: TIER.below }} /> Struggling
            </span>
            <span className="inline-flex items-center gap-0.5 text-[6.5px] text-[var(--lp-ink-soft)]">
              <span className="h-1.5 w-1.5 rounded-sm" style={{ background: TIER.mid }} /> Developing
            </span>
            <span className="inline-flex items-center gap-0.5 text-[6.5px] text-[var(--lp-ink-soft)]">
              <span className="h-1.5 w-1.5 rounded-sm" style={{ background: TIER.pass }} /> Mastery
            </span>
            <span className="inline-flex items-center gap-0.5 text-[6.5px] text-[var(--lp-ink-soft)]">
              <span className="h-0 w-2 border-t border-dashed border-[var(--lp-ink-soft)]" /> Pass (70)
            </span>
          </div>
        </div>
        <div className="relative mt-1.5 space-y-1.5">
          {/* dashed pass line across the bar area (labels are w-14 + gap-1.5) */}
          <span
            aria-hidden="true"
            className="absolute top-0 h-full border-l border-dashed border-[var(--lp-ink-soft)]"
            style={{ left: "calc(62px + (100% - 62px) * 0.7)" }}
          />
          {performance.map((d) => (
            <div key={d.key} className="flex items-center gap-1.5">
              <span className="w-14 shrink-0 truncate text-right text-[7.5px] text-[var(--lp-ink-soft)]">
                {labelFor(d.key)}
              </span>
              <div className="relative h-2.5 flex-1">
                <div
                  className="h-full rounded-r-sm"
                  style={{ width: `${d.mean}%`, background: tierColor(d.mean) }}
                />
                <span
                  className="absolute top-1/2 -translate-y-1/2 text-[7px] font-medium tabular-nums text-[var(--lp-ink)]"
                  style={{ left: `calc(${d.mean}% + 3px)` }}
                >
                  {d.mean}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── participation & mastery grid (5 ParticipationCards) ── */}
      <div className="mt-1.5 rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-2.5">
        <p className="text-[8px] font-semibold text-[var(--lp-ink-soft)]">Participation &amp; mastery</p>
        <div className="mt-1.5 grid grid-cols-5 gap-1.5">
          {ROSTER_ACTIVITIES.map((a) => {
            const p = participation[a.key];
            const notStarted = total - p.attempted;
            const Icon = a.icon;
            return (
              <div key={a.key} className="rounded-md border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/50 px-1.5 py-1.5">
                <div className="flex items-center gap-0.5">
                  <span style={{ color: a.accent }}>
                    <Icon className="h-2 w-2" />
                  </span>
                  <span className="truncate text-[6.5px] font-medium text-[var(--lp-ink)]/80">{a.label}</span>
                </div>
                <div className="mt-1 flex items-end justify-between gap-1">
                  <div>
                    <div className="text-[10px] font-bold leading-none tabular-nums text-[var(--lp-ink)]">
                      {Math.round((p.attempted / total) * 100)}%
                    </div>
                    <div className="mt-0.5 text-[6px] text-[var(--lp-ink-soft)]">attempted {p.attempted}/{total}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold leading-none tabular-nums text-[var(--lp-ink)]">{p.passRate}%</div>
                    <div className="mt-0.5 text-[6px] text-[var(--lp-ink-soft)]">passed</div>
                  </div>
                </div>
                {/* tier distribution strip: below / mid / pass / not started */}
                <div className="mt-1.5 flex h-1 w-full overflow-hidden rounded-full bg-[var(--lp-rule)]">
                  <div style={{ width: `${(p.below / total) * 100}%`, background: TIER.below }} />
                  <div style={{ width: `${(p.mid / total) * 100}%`, background: TIER.mid }} />
                  <div style={{ width: `${(p.pass / total) * 100}%`, background: TIER.pass }} />
                  {notStarted > 0 && (
                    <div className="bg-[var(--lp-ink-soft)]/20" style={{ width: `${(notStarted / total) * 100}%` }} />
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between text-[6px] tabular-nums text-[var(--lp-ink-soft)]">
                  <span>Avg: {p.avg}</span>
                  <span>{p.pass}/{p.attempted}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── students needing attention (at-risk list with weak-area chips) ── */}
      <div className="mt-1.5 rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-surface)] p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[8px] font-semibold text-[var(--lp-ink-soft)]">Students needing attention</p>
            <p className="text-[6.5px] text-[var(--lp-ink-soft)] opacity-70">Scored below 50 in at least one activity</p>
          </div>
          <span className="rounded-md bg-[var(--lp-paper-2)] px-1.5 py-0.5 text-[7px] font-semibold tabular-nums text-[var(--lp-ink-soft)]">
            3
          </span>
        </div>
        <ul className="mt-1 divide-y divide-[var(--lp-rule)]">
          {atRisk.map((s) => (
            <li key={s.name} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 py-1.5">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--lp-paper-2)] text-[7px] font-bold text-[var(--lp-ink)]">
                {s.name[0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[8px] font-medium leading-tight text-[var(--lp-ink)]">{s.name}</p>
                <p className="truncate text-[6.5px] leading-tight text-[var(--lp-ink-soft)]">{s.email}</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[6.5px] text-[var(--lp-ink-soft)]">Needs support in</span>
                {s.weak.map((w) => (
                  <span
                    key={w.key}
                    className="inline-flex items-center gap-0.5 rounded-md bg-red-100 px-1 py-0.5 text-[6.5px] font-medium tabular-nums text-red-700 dark:bg-red-900/40 dark:text-red-300"
                  >
                    {labelFor(w.key)}
                    <span className="text-red-500 dark:text-red-400">{w.score}</span>
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ── roster table (8 sortable columns, faithful header labels) ── */}
      <div className="mt-1.5 overflow-hidden rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-surface)]">
        <table className="w-full border-collapse text-[var(--lp-ink)]">
          <thead>
            <tr className="border-b border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/40 text-[7px] uppercase tracking-wide text-[var(--lp-ink-soft)]">
              <th className="px-1.5 py-1.5 text-left font-semibold">
                <span className="inline-flex items-center gap-0.5">Student <ChevronsUpDown className="h-1.5 w-1.5 opacity-50" /></span>
              </th>
              <th className="px-1 py-1.5 text-left font-semibold">
                <span className="inline-flex items-center gap-0.5">Progress <ChevronsUpDown className="h-1.5 w-1.5 opacity-50" /></span>
              </th>
              {ROSTER_ACTIVITIES.map((a) => (
                <th key={a.key} className="px-1 py-1.5 text-center font-semibold">
                  <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
                    {a.label} <ChevronsUpDown className="h-1.5 w-1.5 opacity-50" />
                  </span>
                </th>
              ))}
              <th className="px-1.5 py-1.5 text-right font-semibold">
                <span className="inline-flex items-center gap-0.5">Last viewed <ChevronsUpDown className="h-1.5 w-1.5 opacity-50" /></span>
              </th>
            </tr>
          </thead>
          <tbody>
            {roster.map((r, i) => (
              <tr key={r.name} className={`text-[8px] ${i !== roster.length - 1 ? "border-b border-[var(--lp-rule)]" : ""}`}>
                <td className="px-1.5 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--lp-paper-2)] text-[8px] font-bold text-[var(--lp-ink)]">
                      {r.name[0]}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[8px] font-medium leading-tight">{r.name}</div>
                      <div className="truncate text-[6.5px] leading-tight text-[var(--lp-ink-soft)]">{r.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-1 py-1.5">
                  <div className="flex items-center gap-1">
                    <div className="h-1 w-8 overflow-hidden rounded-full bg-[var(--lp-rule)]">
                      <div className="h-full bg-[var(--lp-accent)]" style={{ width: `${r.progress}%` }} />
                    </div>
                    <span className="text-[7px] tabular-nums text-[var(--lp-ink-soft)]">{r.progress}%</span>
                  </div>
                </td>
                {ROSTER_ACTIVITIES.map((a) => (
                  <td key={a.key} className="px-0.5 py-1.5 text-center tabular-nums">
                    {/* real page: blue drill-down link; "-" when not attempted */}
                    {r.scores[a.key] == null ? (
                      <span className="text-[var(--lp-ink-soft)]">-</span>
                    ) : (
                      <span className="text-blue-600 dark:text-blue-400">{r.scores[a.key]}</span>
                    )}
                  </td>
                ))}
                <td className="px-1.5 py-1.5 text-right text-[6.5px] tabular-nums text-[var(--lp-ink-soft)]">
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

/* ── 7b. ASSIGNMENTS LIST — /assignments with the "My Assignments" tab active ── */
// Mirrors AssignmentsList: header + SegmentedTabs (admin view), the collapsed
// saved-roster bar (PresetsSection), the status filter + create button row and
// assignment cards with teacher actions. Pagination is omitted — it only
// renders past 10 assignments.
export function AssignmentsListMockup() {
  const cards = [
    {
      title: "DSE 2023 Paper 1 — Reading",
      subject: "English · Paper 1",
      status: "active" as const,
      overdue: true,
      description: "Read the passage and complete all sections before the deadline.",
      due: "Overdue",
      dueRed: true,
      completed: "18/28",
      avg: 64,
      archiveLabel: "Archive",
    },
    {
      title: "The Water Cycle — Comprehension",
      subject: "Geography",
      status: "active" as const,
      overdue: false,
      description: "Read about how water moves through its cycle, then answer the questions.",
      due: "Due Jun 26, 2026",
      dueRed: false,
      completed: "9/24",
      avg: 38,
      archiveLabel: "Archive",
    },
    {
      title: "News Clip — Plastic-free Week",
      subject: "English · Reading",
      status: "archived" as const,
      overdue: false,
      description: "Summarise the article and list three plastic-free swaps from the text.",
      due: "Due May 2, 2026",
      dueRed: false,
      completed: "22/26",
      avg: 91,
      archiveLabel: "Unarchive",
    },
  ];

  return (
    <MockupFrame label="MY ASSIGNMENTS · Mr.🆖 ProReader">
      {/* ── header row: title + help + view switch (SegmentedTabs) ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ClipboardCheck className="h-4 w-4 text-[var(--lp-accent)]" />
          <span className="font-display text-sm font-bold text-[var(--lp-ink)]">My Assignments</span>
          <HelpCircle className="h-3 w-3 text-[var(--lp-ink-soft)]" />
        </div>
        {/* SegmentedTabs — "My Assignments" active */}
        <div className="flex gap-0.5 rounded-lg bg-[var(--lp-paper-2)] p-0.5">
          <span className="rounded-md bg-[var(--lp-surface)] px-2 py-0.5 text-[9px] font-medium text-[var(--lp-ink)] shadow-sm">
            My Assignments
          </span>
          <span className="rounded-md px-2 py-0.5 text-[9px] font-medium text-[var(--lp-ink-soft)]">
            All Teachers
          </span>
        </div>
      </div>

      {/* ── saved rosters bar (PresetsSection, collapsed) ── */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[9px] text-[var(--lp-ink-soft)]">
          <Bookmark className="h-2.5 w-2.5" />
          Saved rosters
          <span className="rounded-md bg-[var(--lp-paper-2)] px-1 py-px text-[7px] font-semibold text-[var(--lp-ink-soft)]">3</span>
          <ChevronDown className="h-2.5 w-2.5" />
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--lp-rule)] px-2 py-1 text-[9px] font-medium text-[var(--lp-ink)]">
          <Plus className="h-2.5 w-2.5" /> Create roster
        </span>
      </div>

      {/* ── status filter + create assignment row ── */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-3 rounded-lg border border-[var(--lp-rule)] px-2 py-1 text-[9px] font-medium text-[var(--lp-ink)]">
          All <ChevronDown className="h-2.5 w-2.5 text-[var(--lp-ink-soft)]" />
        </span>
        <span className="flex-1" />
        <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--lp-rule)] px-2 py-1 text-[9px] font-medium text-[var(--lp-ink)]">
          <Plus className="h-2.5 w-2.5" /> Create assignment
        </span>
      </div>

      {/* ── assignment cards ── */}
      <div className="mt-2 space-y-2">
        {cards.map((c) => (
          <div
            key={c.title}
            className={`overflow-hidden rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-surface)] ${
              c.status === "archived" ? "opacity-60" : ""
            }`}
          >
            <div className="px-3 pb-1 pt-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-[var(--lp-ink)]">{c.title}</p>
                  <p className="mt-0.5 text-[8px] text-[var(--lp-ink-soft)]">{c.subject}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {c.status === "active" ? (
                    <span className="rounded-md bg-[var(--lp-accent)] px-1.5 py-0.5 text-[8px] font-semibold text-white">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-md bg-[var(--lp-paper-2)] px-1.5 py-0.5 text-[8px] font-semibold text-[var(--lp-ink-soft)]">
                      Archived
                    </span>
                  )}
                  {c.overdue && (
                    <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-[8px] font-semibold text-white">
                      Overdue
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="px-3 pb-2">
              <p className="mt-0.5 line-clamp-2 text-[9px] text-[var(--lp-ink-soft)]">{c.description}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[8.5px] text-[var(--lp-ink-soft)]">
                <span className={`inline-flex items-center gap-1 ${c.dueRed ? "text-red-500" : ""}`}>
                  <Calendar className="h-2.5 w-2.5" /> {c.due}
                </span>
                <span className="inline-flex items-center gap-1">
                  <BadgeCheck className="h-2.5 w-2.5" /> Completed: {c.completed} students
                </span>
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="h-2.5 w-2.5" /> Avg progress: {c.avg}%
                </span>
              </div>
              {/* teacher action row */}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 border-t border-[var(--lp-rule)] pt-1.5">
                <span className="inline-flex items-center gap-0.5 text-[8.5px] text-[var(--lp-ink-soft)]">
                  <BookOpen className="h-2.5 w-2.5" /> View session
                </span>
                <span className="inline-flex items-center gap-0.5 text-[8.5px] text-[var(--lp-ink-soft)]">
                  <Pencil className="h-2.5 w-2.5" /> Edit
                </span>
                <span className="inline-flex items-center gap-0.5 text-[8.5px] text-[var(--lp-ink-soft)]">
                  {c.status === "active" ? <Archive className="h-2.5 w-2.5" /> : <ArchiveRestore className="h-2.5 w-2.5" />}
                  {c.archiveLabel}
                </span>
                <span className="inline-flex items-center gap-0.5 text-[8.5px] text-red-500">
                  <Trash2 className="h-2.5 w-2.5" /> Delete
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </MockupFrame>
  );
}

/* ── 8a. VOCABULARY — Words table screen (faithful, static) ── */
// Mirrors the My Vocabulary page with the Words tab active: page header (title +
// stat cards) + the Review Auto Select pill toolbar (sits ABOVE the tab strip,
// left of Export) + 7-tab strip + sortable word table + pagination.
export function WordsTableMockup() {
  // Overview stat cards (word stats — the page header on the Words tab).
  // The Total Words card breaks the bank down by source: Own · Teacher · Student.
  const wordStats = [
    { label: "Total Words", value: "128", icon: BookMarked, color: "text-[var(--lp-ink)]", sub: "Own: 96 · Teacher: 20 · Student: 12" },
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
  type Source = "own" | "teacher" | "student";

  // Source badge styles mirror VocabularyTable.tsx: Own = slate,
  // Teacher = purple, Student = blue (student-shared words).
  const sourceStyle: Record<Source, string> = {
    own: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    teacher: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    student: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  };
  const sourceLabel: Record<Source, string> = { own: "Own", teacher: "Teacher", student: "Student" };

  const wordRows: { word: string; pos: string; def: string; zh: string; source: Source; rating: Rating; level: Level }[] = [
    { word: "flourish", pos: "verb", def: "to grow or develop successfully", zh: "茁壯成長", source: "own", rating: "easy", level: "5" },
    { word: "luminous", pos: "adj.", def: "full of light; brightly glowing", zh: "發光的", source: "own", rating: "medium", level: "4" },
    { word: "inefficient", pos: "adj.", def: "not using time or energy well", zh: "效率低的", source: "teacher", rating: "hard", level: "2" },
    { word: "defenders", pos: "noun", def: "people who support or protect", zh: "捍衛者", source: "student", rating: "hard", level: "1" },
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

      {/* toolbar — Review Auto Select pill (left) + Export (right). On the real
          page this row renders ABOVE the tab strip, on Words/Phrases tabs only. */}
      <div className="mt-3 flex items-center gap-2">
        {/* AutoSelectPanel — primary-tinted pill: BookOpen + "Review" label +
            a solid primary "Auto Select" trigger with a chevron */}
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--lp-accent)]/25 bg-[var(--lp-accent)]/5 py-0.5 pl-2 pr-0.5 shadow-sm">
          <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--lp-accent)]">
            <BookOpen className="h-3 w-3" />
            Review
          </span>
          <span className="inline-flex items-center gap-0.5 rounded-md bg-[var(--lp-accent)] px-1.5 py-1 text-[9px] font-medium text-white shadow-sm">
            Auto Select
            <ChevronDown className="h-2.5 w-2.5" />
          </span>
        </span>
        <span className="flex-1" />
        <span className="inline-flex items-center gap-1 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2 py-1 text-[10px] text-[var(--lp-ink)]">
          <Download className="h-3 w-3" /> Export
        </span>
      </div>

      {/* tab strip — 7 tabs match the real page; Words active */}
      <div className="mt-2.5 flex flex-wrap gap-1 border-b border-[var(--lp-rule)]">
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
                  <span className={`inline-flex rounded px-1.5 py-0.5 text-[8px] font-medium ${sourceStyle[r.source]}`}>
                    {sourceLabel[r.source]}
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

/* ── 8c. VOCABULARY — Student analytics (faithful, static) ──
// Mirrors /vocabulary?view=analytics (staff view) with the Overview tab
// active, split across two shorter slides: shared chrome (page header +
// My vocabulary/Student analytics switch, the staff filter bar, the
// Overview/Review sessions/Activity tabs + time range), then the top half of
// the Overview tab per slide — stat cards, the daily-activity chart, the
// mastery distribution and review modes, then review-accuracy history,
// most-missed words and the per-student table with the footnote. */

/** Shared slide chrome — page header, scope switch, staff filter bar and the
    tab row (Overview active) every Overview-tab card sits under. */
function VocabularyAnalyticsSlide({ children }: { children: React.ReactNode }) {
  return (
    <MockupFrame label="STUDENT ANALYTICS · Mr.🆖 ProReader">
      {/* Page header + My vocabulary / Student analytics switch (SegmentedTabs) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--lp-ink)]">
          <BarChart3 className="h-4 w-4 text-indigo-500" />
          Student analytics
          <HelpCircle className="h-3 w-3 text-muted-foreground" />
        </h3>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <span className="rounded-md px-2.5 py-1 text-[9.5px] font-medium text-muted-foreground">
            My vocabulary
          </span>
          <span className="rounded-md bg-background px-2.5 py-1 text-[9.5px] font-medium text-[var(--lp-ink)] shadow-sm">
            Student analytics
          </span>
        </div>
      </div>

      {/* Staff filter bar — scope label + class & student pickers */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-2 py-1.5">
        <span className="flex items-center gap-1 text-[8.5px] font-medium text-muted-foreground">
          <Users className="h-3 w-3" />
          Students in your classes
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="inline-flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-1 text-[9px] text-[var(--lp-ink)]">
            My Classes
            <ChevronsUpDown className="h-2.5 w-2.5 text-muted-foreground" />
          </span>
          <span className="inline-flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-1 text-[9px] text-[var(--lp-ink)]">
            All students
            <ChevronsUpDown className="h-2.5 w-2.5 text-muted-foreground" />
          </span>
        </div>
      </div>

      {/* Overview / Review sessions / Activity + time range */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <span className="rounded-md bg-background px-2.5 py-1 text-[9.5px] font-medium text-[var(--lp-ink)] shadow-sm">
            Overview
          </span>
          <span className="rounded-md px-2.5 py-1 text-[9.5px] font-medium text-muted-foreground">
            Review sessions
          </span>
          <span className="rounded-md px-2.5 py-1 text-[9.5px] font-medium text-muted-foreground">
            Activity
          </span>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {["All time", "7 days", "30 days", "90 days"].map((r, i) => (
            <span
              key={r}
              className={`rounded-md px-2 py-1 text-[8.5px] font-medium ${
                i === 2
                  ? "bg-background text-[var(--lp-ink)] shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {r}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2">{children}</div>
    </MockupFrame>
  );
}

/** Percent badge — green ≥ 80, amber ≥ 50, red below. */
const vaPctBadge = (v: number) =>
  `rounded-full px-1.5 py-0.5 text-[8px] font-semibold tabular-nums ${
    v >= 80
      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
      : v >= 50
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
  }`;

/* Slide 1/2 — stat cards · Daily activity · Mastery levels + Review modes */
export function VocabularyAnalyticsOverviewMockup() {
  // 8 overview stat cards — mirrors Stat in LearnDashboardView.tsx + the icon/
  // tone choices in VocabularyDashboardView.tsx.
  const stats: { icon: typeof BookMarked; tone: string; label: string; value: string; hint?: string }[] = [
    { icon: BookMarked, tone: "text-primary", label: "Word bank", value: "372", hint: "358 words · 14 phrases" },
    { icon: Trophy, tone: "text-green-500", label: "Mastered (L5)", value: "118", hint: "32% of the word bank" },
    { icon: AlarmClock, tone: "text-orange-500", label: "Due for review", value: "27", hint: "41 rated hard" },
    { icon: Brain, tone: "text-violet-500", label: "Average level", value: "2.6", hint: "0 (new) to 5 (mastered)" },
    { icon: Target, tone: "text-indigo-500", label: "Review sessions", value: "146", hint: "78% average accuracy" },
    { icon: Layers, tone: "text-sky-500", label: "Words reviewed", value: "1,284" },
    { icon: Plus, tone: "text-emerald-500", label: "Words added", value: "96" },
    { icon: Activity, tone: "text-rose-500", label: "Active days", value: "18" },
  ];

  // Daily activity — stacked reviewed/added bars + accuracy line. Colours
  // mirror COLORS in VocabularyDashboardView.tsx.
  const days = ["10-18", "10-19", "10-20", "10-21", "10-22", "10-23", "10-24"];
  const reviewed = [18, 26, 14, 32, 21, 38, 27];
  const added = [4, 2, 7, 1, 6, 3, 2];
  const accLine = "12,36 48,30 84,41 120,26 156,33 192,20 228,29";

  // Mastery levels — one bar per level, colours mirror LEVEL_COLORS.
  const levels = [
    { label: "New", count: 24, fill: "#9ca3af" },
    { label: "L1", count: 38, fill: "#ef4444" },
    { label: "L2", count: 71, fill: "#f97316" },
    { label: "L3", count: 62, fill: "#eab308" },
    { label: "L4", count: 59, fill: "#3b82f6" },
    { label: "L5", count: 118, fill: "#22c55e" },
  ];

  // Review modes table rows.
  const modes = [
    { mode: "Flashcards", icon: Layers, sessions: 82, reviewed: 712, acc: 81 },
    { mode: "Quiz", icon: ClipboardList, sessions: 39, reviewed: 356, acc: 74 },
    { mode: "Spelling", icon: SpellCheck, sessions: 25, reviewed: 216, acc: 76 },
  ];

  return (
    <VocabularyAnalyticsSlide>

        {/* Stat grid */}
        <div className="grid grid-cols-4 gap-1.5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border bg-muted/40 px-2 py-1.5">
              <p className="flex items-center gap-1 text-[8px] text-muted-foreground">
                <s.icon className={`h-2.5 w-2.5 ${s.tone}`} />
                {s.label}
              </p>
              <p className="mt-0.5 text-[13px] font-semibold leading-tight tabular-nums text-[var(--lp-ink)]">
                {s.value}
              </p>
              {s.hint && <p className="text-[7.5px] leading-tight text-muted-foreground">{s.hint}</p>}
            </div>
          ))}
        </div>

        {/* Daily activity — stacked bars (reviewed/added) + accuracy line */}
        <div className="rounded-lg border p-2">
          <p className="mb-1 text-[9.5px] font-semibold text-muted-foreground">Daily activity</p>
          <svg viewBox="0 0 264 96" className="w-full">
            {[20, 42, 64].map((y) => (
              <line key={y} x1="6" y1={y} x2="258" y2={y} stroke="var(--lp-rule)" strokeDasharray="2 2" strokeWidth="0.5" opacity="0.6" />
            ))}
            <line x1="6" y1="78" x2="258" y2="78" stroke="var(--lp-rule)" strokeWidth="0.7" />
            {reviewed.map((rv, i) => {
              const x = 10 + i * 36;
              const hR = rv * 1.5;
              const hA = added[i] * 1.5;
              return (
                <g key={i}>
                  <rect x={x} y={78 - hR} width="16" height={hR} fill="#38bdf8" rx="1" />
                  <rect x={x} y={78 - hR - hA} width="16" height={hA} fill="#6366f1" rx="1" />
                </g>
              );
            })}
            <polyline points={accLine} fill="none" stroke="#f97316" strokeWidth="1.6" />
            {days.map((d, i) => (
              <text key={d} x={18 + i * 36} y={88} textAnchor="middle" fontSize="6" fill="var(--lp-ink-soft)">
                {d}
              </text>
            ))}
          </svg>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
            {[
              { c: "#38bdf8", l: "Words reviewed" },
              { c: "#6366f1", l: "Words added" },
              { c: "#f97316", l: "Accuracy" },
            ].map((x) => (
              <span key={x.l} className="inline-flex items-center gap-0.5 text-[7.5px] text-[var(--lp-ink-soft)]">
                <span className="h-1.5 w-1.5 rounded-sm" style={{ background: x.c }} />
                {x.l}
              </span>
            ))}
          </div>
        </div>

        {/* Mastery distribution + review modes */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border p-2">
            <p className="mb-1 text-[9.5px] font-semibold text-muted-foreground">
              Mastery levels (current word bank)
            </p>
            <svg viewBox="0 0 200 100" className="w-full">
              {[24, 46, 68].map((y) => (
                <line key={y} x1="8" y1={y} x2="192" y2={y} stroke="var(--lp-rule)" strokeDasharray="2 2" strokeWidth="0.5" opacity="0.6" />
              ))}
              <line x1="8" y1="84" x2="192" y2="84" stroke="var(--lp-rule)" strokeWidth="0.7" />
              {levels.map((lv, i) => {
                const barH = (lv.count / 118) * 66;
                return (
                  <g key={lv.label}>
                    <rect x={16 + i * 30} y={84 - barH} width="18" height={barH} fill={lv.fill} rx="1.5" />
                    <text x={25 + i * 30} y={94} textAnchor="middle" fontSize="7" fill="var(--lp-ink-soft)">
                      {lv.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="rounded-lg border p-2">
            <p className="mb-1 text-[9.5px] font-semibold text-muted-foreground">Review modes</p>
            <table className="w-full text-[8.5px]">
              <thead>
                <tr className="border-b text-left uppercase tracking-wide text-muted-foreground">
                  <th className="py-1 pr-2 font-medium">Mode</th>
                  <th className="py-1 pr-2 font-medium">Sessions</th>
                  <th className="py-1 pr-2 font-medium">Reviewed</th>
                  <th className="py-1 font-medium">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {modes.map((m) => {
                  const Icon = m.icon;
                  return (
                    <tr key={m.mode} className="border-b last:border-0">
                      <td className="py-1 pr-2">
                        <span className="flex items-center gap-1 font-medium text-[var(--lp-ink)]">
                          <Icon className="h-2.5 w-2.5 text-muted-foreground" />
                          {m.mode}
                        </span>
                      </td>
                      <td className="py-1 pr-2 tabular-nums">{m.sessions}</td>
                      <td className="py-1 pr-2 tabular-nums">{m.reviewed}</td>
                      <td className="py-1">
                        <span className={vaPctBadge(m.acc)}>{m.acc}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
    </VocabularyAnalyticsSlide>
  );
}

/* Slide 2/2 — Review accuracy · Most missed words · Per-student table */
export function VocabularyAnalyticsStudentsMockup() {
  // Accuracy-over-time line (per review session).
  const historyPts = [72, 78, 69, 81, 76, 84, 79, 86];

  // Most missed words (checkbox + accuracy PercentBadge).
  const hardWords = [
    { word: "necessary", wrong: 9, attempts: 14, learners: 6 },
    { word: "receive", wrong: 7, attempts: 11, learners: 5 },
    { word: "rhythm", wrong: 6, attempts: 8, learners: 3 },
    { word: "beautiful", wrong: 3, attempts: 8, learners: 3 },
  ];

  // Per-student table — Due > 0 renders orange, Trend green, ghost "Vocabulary" action.
  const students = [
    { name: "Chloe Chan", email: "chloe.chan@school.edu.hk", bank: "96", phrases: "3 phrases", mastered: 34, due: 6, sessions: 22, acc: 84, trend: "+6", last: "31/10 14:32" },
    { name: "Marcus Wong", email: "marcus.wong@school.edu.hk", bank: "88", phrases: "5 phrases", mastered: 25, due: 9, sessions: 18, acc: 76, trend: "+4", last: "30/10 16:05" },
    { name: "Ka Yan Lam", email: "kayan.lam@school.edu.hk", bank: "74", phrases: null, mastered: 19, due: 12, sessions: 14, acc: 63, trend: "+2", last: "29/10 09:47" },
  ];

  return (
    <VocabularyAnalyticsSlide>
        {/* Review accuracy over time */}
        <div className="rounded-lg border p-2">
          <p className="mb-1 text-[9.5px] font-semibold text-muted-foreground">
            Review accuracy over time
          </p>
          <svg viewBox="0 0 264 80" className="w-full">
            {[16, 34, 52].map((y) => (
              <line key={y} x1="6" y1={y} x2="258" y2={y} stroke="var(--lp-rule)" strokeDasharray="2 2" strokeWidth="0.5" opacity="0.6" />
            ))}
            <line x1="6" y1="68" x2="258" y2="68" stroke="var(--lp-rule)" strokeWidth="0.7" />
            <polyline
              points={historyPts
                .map((v, i) => `${10 + i * 35},${68 - ((v - 60) / 40) * 52}`)
                .join(" ")}
              fill="none"
              stroke="#6366f1"
              strokeWidth="1.6"
            />
            {historyPts.map((v, i) => (
              <circle
                key={i}
                cx={10 + i * 35}
                cy={68 - ((v - 60) / 40) * 52}
                r="2"
                fill="#6366f1"
              />
            ))}
          </svg>
        </div>

        {/* Most missed words */}
        <div className="overflow-hidden rounded-lg border">
          <div className="flex items-center gap-2 px-2 pt-1.5">
            <p className="text-[9.5px] font-semibold text-muted-foreground">Most missed words</p>
            <span className="flex-1" />
            <span className="inline-flex items-center gap-1 rounded-md border border-[var(--lp-rule)] px-1.5 py-0.5 text-[8.5px] font-medium text-[var(--lp-ink)]">
              <ListPlus className="h-2.5 w-2.5" />
              Add to review list
            </span>
          </div>
          <table className="w-full text-[8.5px]">
            <thead>
              <tr className="border-b bg-muted/40 text-left uppercase tracking-wide text-muted-foreground">
                <th className="w-6 px-2 py-1" />
                <th className="px-2 py-1 font-medium">Word</th>
                <th className="px-2 py-1 font-medium">Missed</th>
                <th className="px-2 py-1 font-medium">Students who missed it</th>
                <th className="px-2 py-1 font-medium">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {hardWords.map((w) => (
                <tr key={w.word} className="border-b last:border-0">
                  <td className="px-2 py-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm border border-muted-foreground/50" />
                  </td>
                  <td className="px-2 py-1 font-medium text-[var(--lp-ink)]">{w.word}</td>
                  <td className="px-2 py-1 tabular-nums">{w.wrong}/{w.attempts}</td>
                  <td className="px-2 py-1 tabular-nums">{w.learners}</td>
                  <td className="px-2 py-1">
                    <span className={vaPctBadge(Math.round(((w.attempts - w.wrong) / w.attempts) * 100))}>
                      {Math.round(((w.attempts - w.wrong) / w.attempts) * 100)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Per-student table */}
        <div className="space-y-1">
          <p className="text-[9.5px] font-semibold text-muted-foreground">Students</p>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-[8.5px]">
              <thead>
                <tr className="border-b bg-muted/40 text-left uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-1 font-medium">Student</th>
                  <th className="px-2 py-1 font-medium">Word bank</th>
                  <th className="px-2 py-1 font-medium">Mastered</th>
                  <th className="px-2 py-1 font-medium">Due</th>
                  <th className="px-2 py-1 font-medium">Sessions</th>
                  <th className="px-2 py-1 font-medium">Accuracy</th>
                  <th className="px-2 py-1 font-medium">Trend</th>
                  <th className="px-2 py-1 font-medium">Last active</th>
                  <th className="px-2 py-1" />
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.name} className="border-b last:border-0">
                    <td className="max-w-[7rem] px-2 py-1">
                      <span className="block truncate font-medium text-[var(--lp-ink)]">{s.name}</span>
                      <span className="block truncate text-[7.5px] text-muted-foreground">{s.email}</span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-1 tabular-nums">
                      {s.bank}
                      {s.phrases && <span className="ml-1 text-[7.5px] text-muted-foreground">({s.phrases})</span>}
                    </td>
                    <td className="px-2 py-1 tabular-nums">{s.mastered}</td>
                    <td className="px-2 py-1 font-medium tabular-nums text-orange-600 dark:text-orange-400">
                      {s.due}
                    </td>
                    <td className="px-2 py-1 tabular-nums">{s.sessions}</td>
                    <td className="px-2 py-1">
                      <span className={vaPctBadge(s.acc)}>{s.acc}%</span>
                    </td>
                    <td className="px-2 py-1 font-medium tabular-nums text-green-600 dark:text-green-400">
                      {s.trend}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1 text-[8px] text-muted-foreground">{s.last}</td>
                    <td className="whitespace-nowrap px-2 py-1 text-right">
                      <span className="inline-flex items-center gap-0.5 text-[8.5px] text-[var(--lp-ink-soft)]">
                        <Eye className="h-2.5 w-2.5" />
                        Vocabulary
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footnote — mirrors vocabulary.analytics.note */}
        <p className="text-[7.5px] leading-snug text-[var(--lp-ink-soft)]">
          Word bank figures show the current state of each student&apos;s vocabulary; sessions,
          accuracy and activity cover the selected time range. Accuracy is the share of correct
          answers across review sessions.
        </p>
    </VocabularyAnalyticsSlide>
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

/* Shared collapsed Text Difficulty bar — the difficulty panel now sits at the
   top of the Text Analysis & Adaptation section, above the tabs. Mirrors the
   header row of TextDifficultyAnalyzer.tsx in its collapsed state (cards and
   CEFR highlighter hidden, "Show" still offered). */
function TextDifficultyBar() {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--lp-rule)] bg-[var(--lp-paper-2)]/40 px-2.5 py-2">
      <BarChart3 className="h-3.5 w-3.5 text-[var(--lp-ink-soft)]" />
      <span className="font-display text-[10px] font-semibold text-[var(--lp-ink)]">Text Difficulty Analysis</span>
      <span className="ml-auto inline-flex items-center gap-1 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2 py-1 text-[10px] text-[var(--lp-ink)]">
        <Gauge className="h-3 w-3" /> Analyze
      </span>
      <span className="inline-flex items-center gap-1 rounded-md border border-[var(--lp-rule)] bg-[var(--lp-surface)] px-2 py-1 text-[10px] text-[var(--lp-ink)]">
        <Eye className="h-3 w-3" /> Show
      </span>
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

/* ── Slide 4. Text Analysis — Original tab ──
   Difficulty bar above the tabs (new order), 2 paragraphs, highlighted yellow
   chips, glossary popover underneath, floating selection toolbar above the
   text body. */
export function UnderstandOriginalMockup() {
  return (
    <MockupFrame label="TEXT ANALYSIS · Mr.🆖 ProReader">
      <TextAnalysisHeader />
      <TextDifficultyBar />
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

/* ── Slide 5. Text Analysis — Adapted tab ── */
export function UnderstandAdaptedMockup() {
  return (
    <MockupFrame label="TEXT ANALYSIS · Mr.🆖 ProReader">
      <TextAnalysisHeader />
      <TextDifficultyBar />
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

/* ── Slide 6. Text Analysis — Simplified tab ── */
export function UnderstandSimplifiedMockup() {
  return (
    <MockupFrame label="TEXT ANALYSIS · Mr.🆖 ProReader">
      <TextAnalysisHeader />
      <TextDifficultyBar />
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

/* ── Slide 3. Text Difficulty Analysis + CEFR Word Highlight ──
   The difficulty panel now sits at the TOP of the Text Analysis &
   Adaptation section, above the three text tabs (see AdaptedText.tsx) —
   mocked here with the section header above and the tab strip below. */
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
    <MockupFrame label="TEXT ANALYSIS · Mr.🆖 ProReader">
      <TextAnalysisHeader />

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

      {/* the three text tabs follow below the difficulty panel */}
      <div className="mt-3">
        <TextAnalysisTabs active="original" />
      </div>
    </MockupFrame>
  );
}

/* ════════════════════════════════════════════════════════════════
   CHAPTER 06 — GRAMMAR CHECK (from reading to writing)
   Faithful, static mockups of /grammar-check and its "Learn from
   your mistakes" session, mirroring:
     1. ReviewStage.tsx + ScanViewer.tsx   — scan ↔ transcript review
     2. ResultsView.tsx + ErrorSpan.tsx + CorrectionCard.tsx
     3. LessonView.tsx (+ LearnPath sidebar)
     4. PracticePlayer.tsx + ExerciseCard.tsx (practice mode)
     5. QuizPlayer.tsx + ExerciseCard.tsx (quiz mode)
     6. LanguageCheckHome.tsx + StaffLearning.tsx + LearnDashboardView.tsx
   ════════════════════════════════════════════════════════════════ */

/* Category styles for the corrections shown — faithful subset of
   LANGUAGE_CHECK_CATEGORY_STYLES (src/constants/languageCheck.ts). */
const LC_STYLE = {
  svo: {
    highlight: "bg-red-200 dark:bg-red-900/70",
    badge: "bg-red-600 text-white",
    dot: "bg-red-500",
    border: "border-l-red-500",
    label: "Subject-verb agreement",
  },
  plural: {
    highlight: "bg-yellow-200 dark:bg-yellow-800/70",
    badge: "bg-yellow-600 text-white",
    dot: "bg-yellow-500",
    border: "border-l-yellow-500",
    label: "Plurals & countability",
  },
  chinglish: {
    highlight:
      "bg-[#f7cdee] dark:bg-[#57194c] underline decoration-dotted decoration-2 underline-offset-4 decoration-[#b6209b]",
    badge: "bg-[#8b1876] text-white",
    dot: "bg-[#b6209b]",
    border: "border-l-[#b6209b]",
    label: "Chinglish (literal translation)",
  },
  choice: {
    highlight: "bg-teal-200 dark:bg-teal-900/70",
    badge: "bg-teal-600 text-white",
    dot: "bg-teal-500",
    border: "border-l-teal-500",
    label: "Word choice",
  },
  wform: {
    highlight: "bg-emerald-200 dark:bg-emerald-900/70",
    badge: "bg-emerald-600 text-white",
    dot: "bg-emerald-500",
    border: "border-l-emerald-500",
    label: "Word form",
  },
  tense: {
    highlight: "bg-orange-200 dark:bg-orange-900/70",
    badge: "bg-orange-600 text-white",
    dot: "bg-orange-500",
    border: "border-l-orange-500",
    label: "Tense / time frame",
  },
} as const;

type LcCategory = keyof typeof LC_STYLE;

/* Inline highlight — mirrors ErrorSpan (ErrorSpan.tsx): rounded chip with the
   category highlight + superscript number; `active` adds the selection ring. */
function LcSpan({
  cat,
  n,
  active = false,
  children,
}: {
  cat: LcCategory;
  n: number;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`rounded-md border border-black/10 px-1 py-0.5 box-decoration-clone dark:border-white/10 ${LC_STYLE[cat].highlight} ${
        active ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
      }`}
    >
      {children}
      <sup className="ml-0.5 text-[0.6em] font-semibold opacity-80">({n})</sup>
    </span>
  );
}

/* Legend chip — mirrors the ResultsView legend buttons (dot + label + count). */
function LcLegendChip({ cat, count }: { cat: LcCategory; count: number }) {
  const s = LC_STYLE[cat];
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[9px] text-[var(--lp-ink)]">
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      <span>{s.label}</span>
      <span className="font-semibold tabular-nums text-muted-foreground">{count}</span>
    </span>
  );
}

/* The transcribed essay — the same text in every slide of this chapter. */
const LC_TRANSCRIPT_P1 =
  "Everyone know that plastic takes hundreds of years to break down. Every year, million of plastic bottles are thrown away and we continue to cause serious pollution to the environment. The government should introduce a levy on plastic bags as soon as possible.";
const LC_TRANSCRIPT_P2 =
  "However, many citizens think recycling is troublesome. They rather throw everything into one bin than wash and separate their rubbish. If we do not act now, the situation will become more and more worse.";

/* ── 06 · 1. GRAMMAR CHECK — transcription review stage (faithful, static) ──
   Mirrors ReviewStage.tsx: step indicator, hint + verify switch + action row,
   and the scan ↔ transcript split panes. */
export function LanguageCheckTranscribeMockup() {
  return (
    <MockupFrame label="GRAMMAR CHECK · Mr.🆖 ProReader">
      <div className="space-y-2.5">
        {/* Step indicator — Scan ✓ · Review transcript (current) · Corrections */}
        <ol className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <li className="flex items-center gap-1.5 text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-white">
              <Check className="h-3 w-3" />
            </span>
            Scan
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-px w-4 bg-border" aria-hidden />
            <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-[var(--lp-ink)]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs tabular-nums text-primary-foreground">
                2
              </span>
              Review transcript
            </span>
          </li>
          <li className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-px w-4 bg-border" aria-hidden />
            <span className="flex items-center gap-1.5 rounded-full px-2 py-0.5 opacity-50">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs tabular-nums">
                3
              </span>
              Corrections
            </span>
          </li>
        </ol>

        {/* Hint + verify switch + actions */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <p className="text-[10px] text-muted-foreground">
            Compare the transcript with the original scan and fix any misread words.
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground">
              <span className="inline-flex h-3.5 w-6 items-center rounded-full bg-primary px-0.5">
                <span className="ml-auto h-2.5 w-2.5 rounded-full bg-white" />
              </span>
              Double-check transcription
            </span>
            <span className="inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-medium text-[var(--lp-ink)]">
              <RefreshCw className="mr-1 h-3 w-3" />
              Re-transcribe
            </span>
            <span className="inline-flex items-center rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground">
              <SpellCheck className="mr-1 h-3 w-3" />
              Run grammar check
            </span>
          </div>
        </div>

        {/* Scan ↔ transcript split — ResizablePanelGroup on desktop */}
        <div className="grid grid-cols-2 gap-2">
          {/* ScanViewer pane: page nav + zoom toolbar over the photographed page */}
          <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-muted/40">
            <div className="flex items-center justify-between border-b bg-background/80 px-1.5 py-1">
              <div className="flex items-center gap-0.5">
                <ChevronLeft className="h-3 w-3 text-muted-foreground/40" />
                <span className="px-1 text-[9px] tabular-nums text-muted-foreground">Page 1 / 2</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <ZoomOut className="h-3 w-3" />
                <ZoomIn className="h-3 w-3" />
                <RotateCcw className="h-3 w-3" />
              </div>
            </div>
            <div
              className="min-h-0 flex-1 px-3 py-2"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(transparent, transparent 19px, rgba(59,130,246,0.18) 19px, rgba(59,130,246,0.18) 20px)",
                fontFamily: "'Bradley Hand','Segoe Script','Comic Sans MS',cursive",
              }}
            >
              <p className="text-[10px] italic leading-[20px] text-slate-700 dark:text-slate-200">
                {LC_TRANSCRIPT_P1}
              </p>
              <p className="mt-5 text-right text-[10px] italic leading-[20px] text-slate-400 dark:text-slate-500">
                … continued on page 2
              </p>
            </div>
          </div>

          {/* Transcript pane: editable textarea, spell-check suppressed */}
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-[var(--lp-ink)]">Transcript</p>
              <p className="text-[9px] text-muted-foreground">78 words</p>
            </div>
            <div className="min-h-0 flex-1 rounded-md border px-2.5 py-2">
              <p className="whitespace-pre-wrap text-[9.5px] leading-relaxed text-[var(--lp-ink)]">
                {LC_TRANSCRIPT_P1}
                {"\n\n"}
                {LC_TRANSCRIPT_P2}
                <span className="ml-px inline-block h-3 w-px animate-pulse bg-[var(--lp-ink)] align-middle" />
              </p>
            </div>
            <p className="text-[9px] text-muted-foreground">Separate paragraphs with a blank line.</p>
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

/* ── 06 · 2. GRAMMAR CHECK — checked results + correction popover (faithful) ──
   Mirrors the results workspace: toolbar, ResultsSummary line, two-tier legend,
   the highlighted essay with an open ErrorSpan popover, and CorrectionCards. */
export function LanguageCheckResultsMockup() {
  return (
    <MockupFrame label="GRAMMAR CHECK · Mr.🆖 ProReader">
      <div className="space-y-2.5">
        {/* Toolbar — ExplanationLanguageToggle · Learn · Export · More */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2 py-1 text-[9px] text-[var(--lp-ink)]">
            <span className="font-semibold">English</span>
            <span className="inline-flex h-3.5 w-6 items-center rounded-full bg-muted-foreground/30 px-0.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            <span className="text-muted-foreground">繁體中文</span>
          </span>
          <span className="inline-flex items-center rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground">
            <GraduationCap className="mr-1 h-3 w-3" />
            Learn from mistakes
          </span>
          <span className="inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-medium text-[var(--lp-ink)]">
            <Download className="mr-1 h-3 w-3" />
            Export to Word
          </span>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border text-muted-foreground">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </span>
        </div>

        {/* ResultsSummary line */}
        <p className="text-[10px] text-muted-foreground">
          <span className="font-medium text-[var(--lp-ink)]">5 corrections · 1 suggestion</span>
          <span className="mx-1.5">·</span>
          Model: claude-sonnet-5-5
        </p>

        {/* Two-tier legend — errors, then optional-expression suggestions */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-0.5 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
              Errors
            </span>
            <LcLegendChip cat="svo" count={1} />
            <LcLegendChip cat="plural" count={1} />
            <LcLegendChip cat="choice" count={1} />
            <LcLegendChip cat="wform" count={1} />
            <span className="text-[8px] text-muted-foreground">Hide group</span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-0.5 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
              Suggestions
            </span>
            <LcLegendChip cat="chinglish" count={1} />
            <span className="text-[8px] text-muted-foreground">Hide group</span>
          </div>
        </div>

        {/* Highlighted essay (left) + correction cards (right) */}
        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_42%]">
          <div className="min-w-0 rounded-xl border bg-card p-3">
            <div className="relative pt-[6.75rem]">
              {/* Open ErrorSpan popover — side="top", arrow pointing at mistake ① */}
              <div className="absolute inset-x-2 top-0 z-20 rounded-xl border bg-popover p-2.5 text-popover-foreground shadow-xl">
                <p className="text-[9px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                  Subject-verb agreement{" "}
                  <span className="font-semibold text-indigo-400">(1)</span>
                </p>
                <div className="mt-1.5 rounded-lg bg-muted px-2 py-1 text-[10px]">
                  <span className="font-medium text-muted-foreground">Correction:</span>{" "}
                  <span className="font-semibold text-green-700 dark:text-green-400">knows</span>
                </div>
                <p className="mt-1.5 text-[10px] leading-snug">
                  “Everyone” is singular, so the verb takes -s: everyone knows. Chinese verbs never
                  change form, so the -s is easy to drop.
                </p>
                <span className="absolute bottom-[-4px] left-6 h-2 w-2 rotate-45 border-b border-r border-border bg-popover" />
              </div>

              <p className="whitespace-pre-wrap break-words text-[11.5px] leading-[1.7rem]" lang="en">
                Everyone <LcSpan cat="svo" n={1} active>know</LcSpan> that plastic takes hundreds of
                years to break down. Every year, <LcSpan cat="plural" n={2}>million of</LcSpan>{" "}
                plastic bottles are thrown away and we continue to{" "}
                <LcSpan cat="chinglish" n={3}>cause serious pollution to the environment</LcSpan>.
                The government should introduce a levy on plastic bags as soon as possible.
                {"\n\n"}
                However, many citizens think recycling is troublesome.{" "}
                <LcSpan cat="choice" n={4}>They rather throw</LcSpan> everything into one bin than
                wash and separate their rubbish. If we do not act now, the situation will become{" "}
                <LcSpan cat="wform" n={5}>more and more worse</LcSpan>.
              </p>
            </div>
          </div>

          {/* CorrectionCard column — cross-linked to the highlights */}
          <div className="flex min-w-0 flex-col gap-2">
            {/* Card ① — active (selected from the highlight above) */}
            <div
              className="rounded-xl border border-l-4 bg-card p-2.5 shadow-sm ring-2 ring-primary"
              style={{ borderLeftColor: "#ef4444" }}
            >
              <div className="flex items-center gap-1.5">
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[8px] font-bold text-white">
                  1
                </span>
                <p className="text-[10px] font-medium text-muted-foreground">
                  Subject-verb agreement
                </p>
              </div>
              <p className="mt-1.5 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                Original
              </p>
              <p className="mt-0.5 text-[10px] leading-snug">
                Everyone{" "}
                <span className="rounded bg-red-100 px-0.5 font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                  know
                </span>{" "}
                that plastic takes hundreds of years to break down.
              </p>
              <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
                <span className="rounded bg-red-100 px-1 py-0.5 font-semibold text-red-700 line-through decoration-red-700/70 dark:bg-red-950 dark:text-red-300">
                  know
                </span>
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="rounded bg-green-100 px-1 py-0.5 font-medium text-green-800 dark:bg-green-950 dark:text-green-300">
                  knows
                </span>
              </div>
              <p className="mt-1.5 text-[8px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400">
                Corrections
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-green-700 dark:text-green-400">
                Everyone <span className="font-semibold">knows</span> that plastic takes hundreds of
                years to break down.
              </p>
              <p className="mt-1.5 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                Explanation
              </p>
              <p className="mt-0.5 text-[10px] leading-snug">
                Chinese verbs never change form, so the third-person -s is easy to drop.
              </p>
            </div>

            {/* Card ② */}
            <div className="rounded-xl border border-l-4 bg-card p-2.5 shadow-sm" style={{ borderLeftColor: "#eab308" }}>
              <div className="flex items-center gap-1.5">
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-yellow-600 px-1 text-[8px] font-bold text-white">
                  2
                </span>
                <p className="text-[10px] font-medium text-muted-foreground">Plurals & countability</p>
              </div>
              <p className="mt-1.5 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                Original
              </p>
              <p className="mt-0.5 text-[10px] leading-snug">
                Every year,{" "}
                <span className="rounded bg-red-100 px-0.5 font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                  million of
                </span>{" "}
                plastic bottles are thrown away…
              </p>
              <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
                <span className="rounded bg-red-100 px-1 py-0.5 font-semibold text-red-700 line-through decoration-red-700/70 dark:bg-red-950 dark:text-red-300">
                  million
                </span>
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="rounded bg-green-100 px-1 py-0.5 font-medium text-green-800 dark:bg-green-950 dark:text-green-300">
                  millions
                </span>
              </div>
              <p className="mt-1.5 text-[8px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400">
                Corrections
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-green-700 dark:text-green-400">
                Every year, <span className="font-semibold">millions of</span> plastic bottles are
                thrown away…
              </p>
              <p className="mt-1.5 text-[10px] leading-snug">
                “Millions of” is the fixed plural form for large, unspecified numbers.
              </p>
            </div>

            {/* Card ③ — suggestion tier, cropped by the scroll edge */}
            <div className="overflow-hidden rounded-xl border border-l-4 bg-card p-2.5 shadow-sm" style={{ borderLeftColor: "#b6209b", maxHeight: "2.6rem" }}>
              <div className="flex items-center gap-1.5">
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#8b1876] px-1 text-[8px] font-bold text-white">
                  3
                </span>
                <p className="text-[10px] font-medium text-muted-foreground">
                  Chinglish (literal translation)
                </p>
                <span className="ml-auto rounded-full border border-dashed px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Suggestion
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

/* ── Learn-session chrome shared by slides 3-5 — LearnWorkspace header
   (LearnContainer.tsx) + LearnPath sidebar. ────────────────────────────── */
const LEARN_STAGE_ICONS = { lesson: BookOpen, practice: PenLine, quiz: Trophy } as const;

function LearnPathMock({
  active,
  practicePct = null,
  lessonDone = false,
  practiceDone = false,
}: {
  active: { unit: number; stage: keyof typeof LEARN_STAGE_ICONS };
  /** Practice % shown beside unit 0's practice row (null = not finished). */
  practicePct?: number | null;
  lessonDone?: boolean;
  practiceDone?: boolean;
}) {
  const units: { cat: LcCategory; label: string }[] = [
    { cat: "svo", label: "Subject-verb agreement" },
    { cat: "tense", label: "Tense / time frame" },
    { cat: "chinglish", label: "Chinglish (literal trans.)" },
  ];
  const stages: (keyof typeof LEARN_STAGE_ICONS)[] = ["lesson", "practice", "quiz"];

  return (
    <nav className="space-y-1.5" aria-label="Learning path">
      <ol className="space-y-1.5">
        {units.map((u, ui) => {
          const unitActive = ui === active.unit;
          return (
            <li
              key={u.cat}
              className={`rounded-xl border bg-card p-1.5 ${
                unitActive ? "shadow-md ring-1 ring-primary/40" : ""
              }`}
            >
              <p className="mb-1 flex items-center gap-1 text-[9px] font-semibold text-[var(--lp-ink)]">
                <span className={`h-2 w-2 shrink-0 rounded-full ${LC_STYLE[u.cat].dot}`} />
                <span className="min-w-0 flex-1 truncate">{u.label}</span>
              </p>
              <ul className="space-y-0.5">
                {stages.map((stage) => {
                  const Icon = LEARN_STAGE_ICONS[stage];
                  const isActive = unitActive && active.stage === stage;
                  // Stage locks: lesson opens freely; practice follows it;
                  // quiz opens only once practice is done (stageUnlocked()).
                  const unlocked =
                    stage === "lesson" ||
                    (ui === 0 && (stage === "practice" || (stage === "quiz" && practiceDone)));
                  const done =
                    ui === 0 &&
                    ((stage === "lesson" && lessonDone) ||
                      (stage === "practice" && practiceDone));
                  const pct = ui === 0 && stage === "practice" ? practicePct : null;
                  return (
                    <li key={stage}>
                      <span
                        className={`flex w-full items-center gap-1 rounded-lg px-1.5 py-1 text-left text-[9px] ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : unlocked
                              ? "text-[var(--lp-ink)]"
                              : "text-muted-foreground/60"
                        }`}
                      >
                        {unlocked ? (
                          <Icon className="h-2.5 w-2.5 shrink-0" />
                        ) : (
                          <Lock className="h-2.5 w-2.5 shrink-0" />
                        )}
                        <span className="flex-1 capitalize">{stage}</span>
                        {pct !== null && (
                          <span className="text-[8px] font-semibold tabular-nums">{pct}%</span>
                        )}
                        {done && pct === null && <Check className="h-2.5 w-2.5 shrink-0" />}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
      <span className="flex w-full items-center gap-1.5 rounded-xl border px-2 py-1.5 text-[9px] font-semibold text-muted-foreground/60">
        <Lock className="h-2.5 w-2.5" />
        Summary
      </span>
    </nav>
  );
}

function LearnChrome({
  path,
  children,
}: {
  path: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      {/* Workspace header */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground">
          <ArrowLeft className="h-3 w-3" />
          Back to results
        </span>
        <div className="flex min-w-[7rem] flex-1 items-center gap-1.5">
          <GraduationCap className="h-3.5 w-3.5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold leading-tight text-[var(--lp-ink)]">
              Learn from your mistakes
            </p>
            <p className="truncate text-[8px] text-muted-foreground">
              The Problem with Plastic · Secondary 4
            </p>
          </div>
        </div>
        <span className="text-[8px] text-muted-foreground">Saved</span>
        <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[8.5px] font-medium text-[var(--lp-ink)]">
          <FileDown className="h-3 w-3" />
          Export to Word
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[8.5px] text-[var(--lp-ink)]">
          <span className="font-semibold">English</span>
          <span className="inline-flex h-3 w-5 items-center rounded-full bg-muted-foreground/30 px-0.5">
            <span className="h-2 w-2 rounded-full bg-white" />
          </span>
          <span className="text-muted-foreground">繁體中文</span>
        </span>
      </div>
      <div className="grid grid-cols-[7.75rem_minmax(0,1fr)] gap-2.5">
        {path}
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

/* ── 06 · 3. LEARN — the lesson stage (faithful, static) ──
   Mirrors LessonView.tsx: header card, the learner's own mistakes with marked
   sentences + diff chips, the rule with pattern + examples, a wrong/right
   contrast, and the "Start practice" button. */
export function LearnLessonMockup() {
  return (
    <MockupFrame label="LEARN FROM YOUR MISTAKES · Mr.🆖 ProReader">
      <LearnChrome
        path={
          <LearnPathMock
            active={{ unit: 0, stage: "lesson" }}
            lessonDone={false}
            practiceDone={false}
          />
        }
      >
        <div className="space-y-2.5">
          {/* Lesson header card */}
          <header className="space-y-1.5 rounded-2xl border border-l-8 bg-card p-3" style={{ borderLeftColor: "#ef4444" }}>
            <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
              Lesson · Subject-verb agreement
            </p>
            <h3 className="text-sm font-bold leading-tight text-[var(--lp-ink)]">
              Everyone is singular
            </h3>
            <p className="flex items-start gap-1.5 text-[10.5px] leading-snug text-[var(--lp-ink)]">
              <Target className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              <span>
                With <em>everyone</em>, <em>each</em> and <em>every one</em>, the verb is singular.
              </span>
            </p>
            <p className="text-[9px] text-muted-foreground">
              This single mark covers many of the points lost in the Language domain.
            </p>
          </header>

          {/* Your mistakes — start from the learner's own sentences */}
          <section className="space-y-1.5">
            <h4 className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground">
              <TriangleAlert className="h-3 w-3 text-rose-500" />
              Your 3 mistakes
            </h4>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="space-y-1 rounded-xl border bg-card p-2">
                <p className="text-[9.5px] leading-snug text-muted-foreground" lang="en">
                  “My teacher always{" "}
                  <span className="font-medium text-[var(--lp-ink)] underline decoration-red-500 decoration-2 underline-offset-2">
                    give
                  </span>{" "}
                  us homework.”
                </p>
                <div className="flex items-center gap-1 text-[9px]">
                  <span className="rounded bg-red-100 px-1 py-0.5 font-semibold text-red-700 line-through decoration-red-700/70 dark:bg-red-950 dark:text-red-300">
                    give
                  </span>
                  <ArrowRight className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                  <span className="rounded bg-green-100 px-1 py-0.5 font-medium text-green-800 dark:bg-green-950 dark:text-green-300">
                    gives
                  </span>
                </div>
                <p className="text-[8.5px] leading-snug">
                  <em>My teacher</em> is third-person singular.
                </p>
              </div>
              <div className="space-y-1 rounded-xl border bg-card p-2">
                <p className="text-[9.5px] leading-snug text-muted-foreground" lang="en">
                  “Everyone{" "}
                  <span className="font-medium text-[var(--lp-ink)] underline decoration-red-500 decoration-2 underline-offset-2">
                    know
                  </span>{" "}
                  the answer.”
                </p>
                <div className="flex items-center gap-1 text-[9px]">
                  <span className="rounded bg-red-100 px-1 py-0.5 font-semibold text-red-700 line-through decoration-red-700/70 dark:bg-red-950 dark:text-red-300">
                    know
                  </span>
                  <ArrowRight className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                  <span className="rounded bg-green-100 px-1 py-0.5 font-medium text-green-800 dark:bg-green-950 dark:text-green-300">
                    knows
                  </span>
                </div>
                <p className="text-[8.5px] leading-snug">
                  <em>Everyone</em> feels plural but takes a singular verb.
                </p>
              </div>
            </div>
          </section>

          {/* The rule */}
          <section className="space-y-1.5">
            <h4 className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground">
              <BookOpenCheck className="h-3 w-3 text-primary" />
              The rule
            </h4>
            <div className="space-y-1.5 rounded-xl border bg-card p-2.5">
              <div className="flex items-start gap-1.5">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                  1
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="text-[10px] font-semibold text-[var(--lp-ink)]">
                    Singular subjects take a singular verb
                  </p>
                  <p className="text-[9.5px] leading-snug text-[var(--lp-ink)]">
                    Third-person singular subjects — he, she, it, everyone, each — add -s to the
                    present-simple verb.
                  </p>
                </div>
              </div>
              <p className="rounded-lg bg-muted px-2 py-1 font-mono text-[9px]" lang="en">
                Everyone / Each / Every one + verb-s
              </p>
              <ul className="space-y-1">
                <li
                  lang="en"
                  className="rounded-md border-l-4 border-green-500 bg-green-50 px-2 py-1 text-[10px] dark:bg-green-950/30"
                >
                  Everyone knows the answer.
                </li>
                <li
                  lang="en"
                  className="rounded-md border-l-4 border-green-500 bg-green-50 px-2 py-1 text-[10px] dark:bg-green-950/30"
                >
                  My teacher gives us homework every day.
                </li>
              </ul>
            </div>
          </section>

          {/* Common mistakes — wrong / right contrast */}
          <section className="space-y-1.5">
            <h4 className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground">
              <TriangleAlert className="h-3 w-3 text-amber-500" />
              Common mistakes
            </h4>
            <div className="overflow-hidden rounded-xl border text-[10px]" lang="en">
              <p className="flex items-start gap-1.5 bg-red-50 px-2.5 py-1.5 dark:bg-red-950/40">
                <span className="mt-0.5 text-[7px] font-bold uppercase text-red-600 dark:text-red-400">
                  Wrong
                </span>
                <span className="text-muted-foreground line-through">Everyone know the answer.</span>
              </p>
              <p className="flex items-start gap-1.5 bg-green-50 px-2.5 py-1.5 dark:bg-green-950/40">
                <span className="mt-0.5 text-[7px] font-bold uppercase text-green-600 dark:text-green-400">
                  Right
                </span>
                <span className="font-medium">Everyone knows the answer.</span>
              </p>
              <p className="border-t bg-card px-2.5 py-1.5 text-[9px] text-muted-foreground">
                Chinese verbs never change form — English adds -s after he / she / it and everyone.
              </p>
            </div>
          </section>

          <div className="flex justify-end pt-0.5">
            <span className="inline-flex items-center rounded-md bg-primary px-2.5 py-1.5 text-[10px] font-medium text-primary-foreground">
              Start practice
              <ArrowRight className="ml-1 h-3 w-3" />
            </span>
          </div>
        </div>
      </LearnChrome>
    </MockupFrame>
  );
}

/* ── 06 · 4. LEARN — practice stage (faithful, static) ──
   Mirrors PracticePlayer + ExerciseCard in practice mode: progress row, type
   pills, fill-blank input graded wrong, hint, "Not quite" feedback with model
   answer, Try again / Show answer. */
export function LearnPracticeMockup() {
  return (
    <MockupFrame label="LEARN FROM YOUR MISTAKES · Mr.🆖 ProReader">
      <LearnChrome
        path={
          <LearnPathMock
            active={{ unit: 0, stage: "practice" }}
            lessonDone
            practiceDone={false}
          />
        }
      >
        <div className="space-y-2">
          {/* Progress row */}
          <div className="flex items-center gap-2">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted-foreground/20">
              <span className="block h-full rounded-full bg-primary" style={{ width: "20%" }} />
            </span>
            <span className="text-[9px] font-medium tabular-nums text-muted-foreground">1/5</span>
          </div>

          {/* ExerciseCard — practice mode, graded wrong on the first try */}
          <article className="space-y-2 rounded-2xl border bg-card p-3 shadow-sm">
            <header className="flex flex-wrap items-center gap-1.5 text-[8.5px]">
              <span className="rounded-full bg-muted px-2 py-0.5 font-semibold tabular-nums text-[var(--lp-ink)]">
                1 of 5
              </span>
              <span className="rounded-full border px-2 py-0.5 text-muted-foreground">
                Fill in the blank
              </span>
            </header>

            <p className="text-[9px] font-medium text-muted-foreground">
              Type the missing word or words.
            </p>

            {/* FillBlankInput — the typed answer was marked wrong (red) */}
            <p className="text-[12px] leading-[2rem] text-[var(--lp-ink)]" lang="en">
              Everyone{" "}
              <span className="mx-0.5 inline-block min-w-[3.5rem] rounded-md border-0 border-b-2 border-red-500 bg-red-100 px-1 py-0.5 text-center text-[11px] dark:bg-red-950/50">
                know
              </span>{" "}
              the answer to this question.
            </p>

            {/* Hint — shown after a wrong attempt */}
            <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[9.5px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <Lightbulb className="mt-0.5 h-3 w-3 shrink-0" />
              <span>Third-person singular subjects need verb + -s.</span>
            </p>

            {/* Feedback — "Not quite" + model answer */}
            <div className="space-y-1.5 rounded-xl border border-red-500/60 bg-red-50 p-2.5 dark:bg-red-950/30">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--lp-ink)]">
                <CircleAlert className="h-3.5 w-3.5 text-red-600" />
                Not quite
              </p>
              <p className="text-[9.5px]">
                <span className="font-semibold">Model answer: </span>
                <span lang="en" className="font-medium">
                  knows
                </span>
              </p>
              <p className="text-[9px] text-muted-foreground">
                “Everyone” is singular, so the verb takes -s: everyone knows.
              </p>
            </div>

            <footer className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center rounded-md border px-2 py-1 text-[9.5px] font-medium text-[var(--lp-ink)]">
                <RotateCcw className="mr-1 h-3 w-3" />
                Try again
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-1 text-[9.5px] text-muted-foreground">
                <Eye className="h-3 w-3" />
                Show answer
              </span>
            </footer>
          </article>

          <span className="inline-flex items-center px-1 py-0.5 text-[9px] text-muted-foreground">
            Previous exercise
          </span>
        </div>
      </LearnChrome>
    </MockupFrame>
  );
}

/* ── 06 · 5. LEARN — quiz stage (faithful, static) ──
   Mirrors QuizPlayer + ExerciseCard in quiz mode: progress row, choice
   question with a picked option, and a single "Submit answer" — no hints,
   no feedback until the review at the end. */
export function LearnQuizMockup() {
  const options = ["take", "takes", "taking", "took"];
  const picked = "take";
  return (
    <MockupFrame label="LEARN FROM YOUR MISTAKES · Mr.🆖 ProReader">
      <LearnChrome
        path={
          <LearnPathMock
            active={{ unit: 0, stage: "quiz" }}
            lessonDone
            practiceDone
            practicePct={100}
          />
        }
      >
        <div className="space-y-2">
          {/* Progress row */}
          <div className="flex items-center gap-2">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted-foreground/20">
              <span className="block h-full rounded-full bg-primary" style={{ width: "50%" }} />
            </span>
            <span className="text-[9px] font-medium tabular-nums text-muted-foreground">3/6</span>
          </div>

          {/* ExerciseCard — quiz mode: one submission, no hint */}
          <article className="space-y-2 rounded-2xl border bg-card p-3 shadow-sm">
            <header className="flex flex-wrap items-center gap-1.5 text-[8.5px]">
              <span className="rounded-full bg-muted px-2 py-0.5 font-semibold tabular-nums text-[var(--lp-ink)]">
                3 of 6
              </span>
              <span className="rounded-full border px-2 py-0.5 text-muted-foreground">Choose</span>
            </header>

            <p className="text-[9px] font-medium text-muted-foreground">Choose the best answer.</p>

            {/* Prompt with a BlankText gap */}
            <p className="text-[12px] font-medium leading-relaxed text-[var(--lp-ink)]" lang="en">
              Everyone in my class{" "}
              <span
                aria-label="blank"
                className="mx-0.5 inline-block w-12 translate-y-0.5 border-b-2 border-[var(--lp-ink)]/60"
              />{" "}
              part in the beach clean-up.
            </p>

            {/* ChoiceInput radiogroup — one option picked */}
            <div className="grid gap-1.5">
              {options.map((option, i) => {
                const isPicked = option === picked;
                const letter = String.fromCharCode(65 + i);
                return (
                  <span
                    key={option}
                    className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[11px] text-[var(--lp-ink)] ${
                      isPicked ? "border-primary bg-primary/10" : ""
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-semibold ${
                        isPicked ? "border-primary bg-primary text-primary-foreground" : ""
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="min-w-0 flex-1 break-words">{option}</span>
                  </span>
                );
              })}
            </div>

            <footer className="flex flex-wrap items-center">
              <span className="ml-auto inline-flex items-center rounded-md bg-primary px-2.5 py-1.5 text-[9.5px] font-medium text-primary-foreground">
                Submit answer
              </span>
            </footer>
          </article>
        </div>
      </LearnChrome>
    </MockupFrame>
  );
}

/* ── 06 · 6. GRAMMAR CHECK — Student learning overview (faithful, static) ──
   Mirrors /grammar-check?view=students&tab=learning: scope switch, section
   tabs, staff filter bar, Overview/Sessions/Activity tabs + range, the stat
   grid, the activity chart and the per-topic + per-student tables. */
export function LanguageCheckStaffOverviewMockup() {
  /* Activity per day — stacked practice/quizzes bars + average-quiz line.
     Colours mirror CHART_COLORS in LearnDashboardView.tsx. */
  const days = ["10-25", "10-26", "10-27", "10-28", "10-29", "10-30", "10-31"];
  const practice = [12, 8, 15, 9, 18, 14, 11];
  const quizzes = [3, 2, 4, 2, 5, 3, 4];
  const avgLine = "18,30.4 54,29 90,26.2 126,28.3 162,22.7 198,24.1 234,21.3";

  const topics = [
    { cat: "svo" as LcCategory, learners: 14, quizzes: 22, latest: 87, delta: 9, acc: 81, bar: [12, 2, 0] },
    { cat: "tense" as LcCategory, learners: 11, quizzes: 15, latest: 72, delta: 6, acc: 74, bar: [7, 4, 1] },
    { cat: "chinglish" as LcCategory, learners: 9, quizzes: 12, latest: 55, delta: 4, acc: 66, bar: [3, 5, 3] },
  ];
  const students = [
    { name: "Chloe Chan", email: "chloe.chan@school.edu", sessions: "5/6", quizzes: 9, avg: 88, delta: 12, acc: 84, weak: "Tense / time frame", weakPct: 72, weakCat: "tense" as LcCategory, time: "2 h 41 min", last: "31/10 14:32" },
    { name: "Marcus Wong", email: "marcus.wong@school.edu", sessions: "4/5", quizzes: 8, avg: 76, delta: 8, acc: 79, weak: "Chinglish (literal trans.)", weakPct: 55, weakCat: "chinglish" as LcCategory, time: "1 h 58 min", last: "30/10 16:05" },
    { name: "Ka Yan Lam", email: "kayan.lam@school.edu", sessions: "4/4", quizzes: 6, avg: 64, delta: 5, acc: 71, weak: "Chinglish (literal trans.)", weakPct: 58, weakCat: "chinglish" as LcCategory, time: "1 h 12 min", last: "29/10 09:47" },
  ];

  const stats: { icon: typeof BookOpenCheck; tone: string; label: string; value: string; hint?: string }[] = [
    { icon: BookOpenCheck, tone: "text-primary", label: "Sessions started", value: "24", hint: "18 completed" },
    { icon: PenLine, tone: "text-sky-500", label: "Practice answers", value: "312", hint: "78% right first time" },
    { icon: Trophy, tone: "text-indigo-500", label: "Quizzes finished", value: "41", hint: "average 76%" },
    { icon: TrendingUp, tone: "text-green-500", label: "Improvement", value: "+12", hint: "points gained on retaken topics" },
    { icon: Award, tone: "text-green-500", label: "Secure topics", value: "9", hint: "4 developing · 2 need review" },
    { icon: Target, tone: "text-amber-500", label: "Lessons read", value: "35" },
    { icon: Activity, tone: "text-rose-500", label: "Active days", value: "12" },
    { icon: Clock, tone: "text-violet-500", label: "Time on task", value: "6 h 24 min", hint: "estimated from activity" },
  ];

  return (
    <MockupFrame label="STUDENT LEARNING · Mr.🆖 ProReader">
      <div className="space-y-2">
        {/* Page header + staff scope switch */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--lp-ink)]">
            <SpellCheck className="h-4 w-4 text-primary" />
            Grammar Check
          </h3>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <span className="rounded-md px-2.5 py-1 text-[9.5px] font-medium text-muted-foreground">
              My work
            </span>
            <span className="rounded-md bg-background px-2.5 py-1 text-[9.5px] font-medium text-[var(--lp-ink)] shadow-sm">
              My students
            </span>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex items-center gap-1 border-b">
          <span className="-mb-px flex items-center gap-1 border-b-2 border-transparent px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground">
            <FileText className="h-3 w-3" />
            Student essays
          </span>
          <span className="-mb-px flex items-center gap-1 border-b-2 border-primary px-2.5 py-1.5 text-[10px] font-medium text-[var(--lp-ink)]">
            <GraduationCap className="h-3 w-3" />
            Student learning
          </span>
        </div>

        {/* Shared staff filter bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-2 py-1.5">
          <span className="flex items-center gap-1 text-[8.5px] font-medium text-muted-foreground">
            <Users className="h-3 w-3" />
            Students in your classes
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="inline-flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-1 text-[9px] text-[var(--lp-ink)]">
              My Classes
              <ChevronsUpDown className="h-2.5 w-2.5 text-muted-foreground" />
            </span>
            <span className="inline-flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-1 text-[9px] text-[var(--lp-ink)]">
              All students
              <ChevronsUpDown className="h-2.5 w-2.5 text-muted-foreground" />
            </span>
          </div>
        </div>

        {/* Overview / Sessions / Activity + time range */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <span className="rounded-md bg-background px-2.5 py-1 text-[9.5px] font-medium text-[var(--lp-ink)] shadow-sm">
              Overview
            </span>
            <span className="rounded-md px-2.5 py-1 text-[9.5px] font-medium text-muted-foreground">
              Sessions
            </span>
            <span className="rounded-md px-2.5 py-1 text-[9.5px] font-medium text-muted-foreground">
              Activity
            </span>
          </div>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {["All time", "7 days", "30 days", "90 days"].map((r, i) => (
              <span
                key={r}
                className={`rounded-md px-2 py-1 text-[8.5px] font-medium ${
                  i === 2
                    ? "bg-background text-[var(--lp-ink)] shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-4 gap-1.5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border bg-muted/40 px-2 py-1.5">
              <p className="flex items-center gap-1 text-[8px] text-muted-foreground">
                <s.icon className={`h-2.5 w-2.5 ${s.tone}`} />
                {s.label}
              </p>
              <p className="mt-0.5 text-[13px] font-semibold leading-tight tabular-nums text-[var(--lp-ink)]">
                {s.value}
              </p>
              {s.hint && <p className="text-[7.5px] leading-tight text-muted-foreground">{s.hint}</p>}
            </div>
          ))}
        </div>

        {/* Activity per day — stacked bars + average line */}
        <div className="rounded-lg border p-2">
          <p className="mb-1 text-[9.5px] font-semibold text-muted-foreground">Activity per day</p>
          <svg viewBox="0 0 264 96" className="w-full">
            {[20, 42, 64].map((y) => (
              <line key={y} x1="6" y1={y} x2="258" y2={y} stroke="var(--lp-rule)" strokeDasharray="2 2" strokeWidth="0.5" opacity="0.6" />
            ))}
            <line x1="6" y1="78" x2="258" y2="78" stroke="var(--lp-rule)" strokeWidth="0.7" />
            {practice.map((p, i) => {
              const x = 10 + i * 36;
              const hP = p * 2.4;
              const hQ = quizzes[i] * 2.4;
              return (
                <g key={i}>
                  <rect x={x} y={78 - hP} width="16" height={hP} fill="#38bdf8" rx="1" />
                  <rect x={x} y={78 - hP - hQ} width="16" height={hQ} fill="#6366f1" rx="1" />
                </g>
              );
            })}
            <polyline points={avgLine} fill="none" stroke="#f97316" strokeWidth="1.6" />
            {days.map((d, i) => (
              <text key={d} x={18 + i * 36} y={88} textAnchor="middle" fontSize="6" fill="var(--lp-ink-soft)">
                {d}
              </text>
            ))}
          </svg>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
            {[
              { c: "#38bdf8", l: "Practice answers" },
              { c: "#6366f1", l: "Quizzes finished" },
              { c: "#f97316", l: "Average quiz score" },
            ].map((x) => (
              <span key={x.l} className="inline-flex items-center gap-0.5 text-[7.5px] text-[var(--lp-ink-soft)]">
                <span className="h-1.5 w-1.5 rounded-sm" style={{ background: x.c }} />
                {x.l}
              </span>
            ))}
          </div>
        </div>

        {/* Per-topic mastery table */}
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-[8.5px]">
            <thead>
              <tr className="border-b bg-muted/40 text-left uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-1 font-medium">Topic</th>
                <th className="px-2 py-1 font-medium">Learners</th>
                <th className="px-2 py-1 font-medium">Quizzes</th>
                <th className="px-2 py-1 font-medium">Latest score</th>
                <th className="px-2 py-1 font-medium">Impr.</th>
                <th className="px-2 py-1 font-medium">Practice</th>
                <th className="px-2 py-1 font-medium">Mastery</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((t) => {
                const total = t.bar[0] + t.bar[1] + t.bar[2];
                return (
                  <tr key={t.cat} className="border-b last:border-0">
                    <td className="px-2 py-1">
                      <span className="flex items-center gap-1 font-medium text-[var(--lp-ink)]">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${LC_STYLE[t.cat].dot}`} />
                        {LC_STYLE[t.cat].label}
                      </span>
                    </td>
                    <td className="px-2 py-1 tabular-nums">{t.learners}</td>
                    <td className="px-2 py-1 tabular-nums">{t.quizzes}</td>
                    <td className="px-2 py-1">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold tabular-nums ${
                          t.latest >= 80
                            ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                            : t.latest >= 50
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                        }`}
                      >
                        {t.latest}%
                      </span>
                    </td>
                    <td className="px-2 py-1 font-medium tabular-nums text-green-600 dark:text-green-400">
                      +{t.delta}
                    </td>
                    <td className="px-2 py-1 tabular-nums">{t.acc}%</td>
                    <td className="px-2 py-1">
                      <span className="flex h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <span style={{ width: `${(t.bar[0] / total) * 100}%`, background: "#22c55e" }} />
                        <span style={{ width: `${(t.bar[1] / total) * 100}%`, background: "#f59e0b" }} />
                        <span style={{ width: `${(t.bar[2] / total) * 100}%`, background: "#ef4444" }} />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Per-student table */}
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-[8.5px]">
            <thead>
              <tr className="border-b bg-muted/40 text-left uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-1 font-medium">Student</th>
                <th className="px-2 py-1 font-medium">Sessions</th>
                <th className="px-2 py-1 font-medium">Quizzes</th>
                <th className="px-2 py-1 font-medium">Average</th>
                <th className="px-2 py-1 font-medium">Impr.</th>
                <th className="px-2 py-1 font-medium">Practice</th>
                <th className="px-2 py-1 font-medium">Weakest topic</th>
                <th className="px-2 py-1 font-medium">Time on task</th>
                <th className="px-2 py-1 font-medium">Last active</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.name} className="border-b last:border-0">
                  <td className="max-w-[6.5rem] px-2 py-1">
                    <span className="block truncate font-medium text-[var(--lp-ink)]">{s.name}</span>
                    <span className="block truncate text-[7.5px] text-muted-foreground">{s.email}</span>
                  </td>
                  <td className="px-2 py-1 tabular-nums">{s.sessions}</td>
                  <td className="px-2 py-1 tabular-nums">{s.quizzes}</td>
                  <td className="px-2 py-1">
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold tabular-nums ${
                        s.avg >= 80
                          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {s.avg}%
                    </span>
                  </td>
                  <td className="px-2 py-1 font-medium tabular-nums text-green-600 dark:text-green-400">
                    +{s.delta}
                  </td>
                  <td className="px-2 py-1 tabular-nums">{s.acc}%</td>
                  <td className="px-2 py-1">
                    <span className="flex items-center gap-1 text-[8px]">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${LC_STYLE[s.weakCat].dot}`} />
                      <span className="truncate">{s.weak}</span>
                      <span className="tabular-nums text-muted-foreground">{s.weakPct}%</span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-1 text-[8px]">{s.time}</td>
                  <td className="whitespace-nowrap px-2 py-1 text-[8px] text-muted-foreground">{s.last}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend + practice note */}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[7.5px] text-[var(--lp-ink-soft)]">
          {[
            { c: "#22c55e", l: "Secure" },
            { c: "#f59e0b", l: "Developing" },
            { c: "#ef4444", l: "Needs review" },
          ].map((m) => (
            <span key={m.l} className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.c }} />
              {m.l}
            </span>
          ))}
          <span>
            Practice accuracy is self-reported by the learner&apos;s browser; quiz scores are
            re-marked by the server.
          </span>
        </p>
      </div>
    </MockupFrame>
  );
}
