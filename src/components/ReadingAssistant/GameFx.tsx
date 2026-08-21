"use client";

/**
 * Shared game "juice" components for the spelling games (solo + multiplayer)
 * and reusable by other games (grammar, quizzes).
 *
 * - PointPopup: floating "+100 / +N⚡ / +N🔥" score-breakdown badges that pop
 *   in staggered and drift away. Remount per word via a changing `key`.
 * - AnimatedScore: odometer-style count-up score display.
 * - StreakFlame: tiered streak indicator (flame grows + gains a label at
 *   3/5/8/10 — "Heating Up" → "Unstoppable").
 * - MilestoneBanner: one-shot centered banner ("5 in a row!", "New personal
 *   best!"). Remount per event via a changing `key`.
 *
 * All motion is disabled under `prefers-reduced-motion` (see globals.css) and
 * the components degrade to static content + the same auto-dismiss timers.
 */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarCheck, Flame, Lightbulb, Zap } from "lucide-react";
import { cn } from "@/utils/style";

const FX = "reading.glossary.spelling.fx";

/**
 * Default i18n namespace for the translated FX strings ("Perfect!", streak
 * tier labels). The wording is fully generic, but games that carry their own
 * fx subtree (grammar: `reading.grammar.games.fx`) can pass `fxPrefix` to
 * PointPopup / StreakFlame — omitting it keeps the spelling namespace and
 * is a no-op for existing spelling callers.
 */
export const GRAMMAR_FX = "reading.grammar.games.fx";

/** Streak counts that trigger a milestone banner + streak SFX + confetti
 *  (matches StreakFlame's tier thresholds below). Shared by solo + battle. */
export const STREAK_MILESTONES = [3, 5, 8, 10];

/**
 * Small canvas-confetti burst (dynamically imported — keeps the library out of
 * the main bundle). Respects reduced motion both here and via
 * `disableForReducedMotion`. Use sparingly: milestones, new-best, and result
 * screens — NOT every word (confetti fatigue is real).
 */
export function burstConfetti(options?: {
  count?: number;
  spread?: number;
  colors?: string[];
  originY?: number;
}): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  import("canvas-confetti")
    .then((mod) => {
      mod.default({
        particleCount: options?.count ?? 30,
        spread: options?.spread ?? 60,
        origin: { y: options?.originY ?? 0.4 },
        colors: options?.colors ?? ["#fbbf24", "#f97316", "#facc15"],
        disableForReducedMotion: true,
      });
    })
    .catch(() => {});
}

// ── PointPopup ─────────────────────────────────────────────────────────────

export interface PointBreakdown {
  /** Base points for a correct answer (0 when wrong). */
  base: number;
  /** Speed bonus points (0 when untimed / wrong). */
  timeBonus: number;
  /** Streak bonus points (0 when streak < 3 / hint-aided / wrong). */
  streakBonus: number;
  /** Hint penalty as a POSITIVE number (0 when no hints used). */
  hintPenalty: number;
  /** Final awarded points (already floored at the game's minimum). */
  total: number;
  /** True for a fast, hint-free answer — shows a gold "Perfect!" badge. */
  perfect?: boolean;
}

/**
 * Floating score breakdown. Mount with a fresh `key` for each scored answer;
 * it dismisses itself after the float-fade animation (~1.4s). Position it in
 * an absolutely-positionable parent via `className` (defaults to top-right).
 */
export function PointPopup({
  breakdown,
  className,
  fxPrefix = FX,
}: {
  breakdown: PointBreakdown;
  className?: string;
  /** i18n prefix for the "Perfect!" badge (defaults to the spelling fx tree). */
  fxPrefix?: string;
}) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const tm = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(tm);
  }, []);

  if (!visible) return null;

  const items: { key: string; content: React.ReactNode; className: string }[] = [];
  if (breakdown.base > 0) {
    items.push({
      key: "base",
      content: `+${breakdown.base}`,
      className: "bg-primary text-primary-foreground",
    });
  }
  if (breakdown.timeBonus > 0) {
    items.push({
      key: "time",
      content: (
        <>
          <Zap className="h-3 w-3" />+{breakdown.timeBonus}
        </>
      ),
      className: "bg-sky-500 text-white",
    });
  }
  if (breakdown.streakBonus > 0) {
    items.push({
      key: "streak",
      content: (
        <>
          <Flame className="h-3 w-3" />+{breakdown.streakBonus}
        </>
      ),
      className: "bg-orange-500 text-white",
    });
  }
  if (breakdown.hintPenalty > 0) {
    items.push({
      key: "hint",
      content: (
        <>
          <Lightbulb className="h-3 w-3" />−{breakdown.hintPenalty}
        </>
      ),
      className: "bg-muted text-muted-foreground",
    });
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute right-3 top-3 z-10 flex flex-col items-end gap-1",
        className,
      )}
      aria-hidden="true"
    >
      {breakdown.perfect && (
        <span
          className="animate-pop-in rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-amber-950 shadow-md"
          style={{ animationDelay: "180ms" }}
        >
          {t(`${fxPrefix}.perfect`)}
        </span>
      )}
      {items.map((item, i) => (
        <span
          key={item.key}
          className={cn(
            "animate-pop-in inline-flex items-center gap-0.5 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums shadow-md",
            item.className,
          )}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {item.content}
        </span>
      ))}
    </div>
  );
}

// ── AnimatedScore ──────────────────────────────────────────────────────────

/**
 * Score display that counts up from its previous value (~500ms, eased).
 * Decreases (e.g. a new game) and reduced-motion snap instantly.
 */
export function AnimatedScore({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;

    if (to <= from) {
      setDisplay(to);
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(to);
      return;
    }

    const duration = 500;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return <span className={cn("tabular-nums", className)}>{display}</span>;
}

// ── StreakFlame ────────────────────────────────────────────────────────────

const STREAK_TIERS = [
  { min: 10, labelKey: "unstoppable", flameClass: "h-6 w-6 text-red-600 dark:text-red-400", pulse: true },
  { min: 8, labelKey: "blazing", flameClass: "h-6 w-6 text-red-500 dark:text-red-400", pulse: true },
  { min: 5, labelKey: "onFire", flameClass: "h-5 w-5 text-orange-600 dark:text-orange-400", pulse: true },
  { min: 3, labelKey: "heatingUp", flameClass: "h-5 w-5 text-orange-500 dark:text-orange-400", pulse: false },
] as const;

/**
 * Tiered streak indicator. Renders nothing below a 2-streak (matching the
 * previous plain-flame display); from 3 the flame grows, gains a pulsing
 * animation (5+) and an escalating label (3/5/8/10).
 */
export function StreakFlame({
  streak,
  className,
  fxPrefix = FX,
}: {
  streak: number;
  className?: string;
  /** i18n prefix for the tier labels (defaults to the spelling fx tree). */
  fxPrefix?: string;
}) {
  const { t } = useTranslation();
  if (streak < 2) return null;

  const tier = STREAK_TIERS.find((tr) => streak >= tr.min) ?? null;
  const flameClass = tier?.flameClass ?? "h-4 w-4 text-orange-500 dark:text-orange-400";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Flame className={cn(flameClass, tier?.pulse && "animate-flame-pulse")} />
      <span className="text-sm font-semibold text-orange-500 tabular-nums">{streak}</span>
      {tier && (
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
          {t(`${fxPrefix}.streakTier.${tier.labelKey}`)}
        </span>
      )}
    </div>
  );
}

// ── MilestoneBanner ────────────────────────────────────────────────────────

/**
 * One-shot centered milestone banner ("5 in a row!", "New personal best!").
 * Mount with a fresh `key` per event; pops in, then drifts away and unmounts
 * (~2.4s total). The parent must be `relative` (or pass a positioning class).
 */
export function MilestoneBanner({ message, className }: { message: string; className?: string }) {
  const [leaving, setLeaving] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1400);
    const t2 = setTimeout(() => setVisible(false), 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2",
        className,
      )}
      role="status"
    >
      <div
        className={cn(
          "rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1.5 text-sm font-bold text-white shadow-lg",
          leaving ? "animate-float-fade" : "animate-pop-in",
        )}
      >
        {message}
      </div>
    </div>
  );
}

// ── SrsUpdateCard ──────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

/**
 * "Spaced repetition updated" reward card for the spelling result screens.
 * Summarizes the per-word SRS outcomes: how many words leveled up (correct
 * answers advance the Leitner box) and when the next reviews are scheduled,
 * bucketed by day. Renders nothing when there are no outcomes (e.g. an
 * entry point whose onWordResult is fire-and-forget).
 */
export function SrsUpdateCard({
  outcomes,
  className,
}: {
  outcomes: VocabularySrsOutcome[];
  className?: string;
}) {
  const { t } = useTranslation();
  if (outcomes.length === 0) return null;

  const leveledUp = outcomes.filter((o) => o.correct).length;

  // Bucket next reviews by whole days (0 = today/soon).
  const buckets = new Map<number, number>();
  for (const o of outcomes) {
    if (typeof o.nextReviewAt !== "number") continue;
    const days = Math.max(0, Math.round((o.nextReviewAt - Date.now()) / DAY_MS));
    buckets.set(days, (buckets.get(days) ?? 0) + 1);
  }
  const schedule = [...buckets.entries()].sort((a, b) => a[0] - b[0]);

  return (
    <div className={cn("animate-pop-in rounded-xl border bg-muted/40 p-4 space-y-2", className)}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <CalendarCheck className="h-4 w-4 text-emerald-500" />
        {t(`${FX}.srs.title`)}
      </div>
      <p className="text-sm text-muted-foreground">
        {t(`${FX}.srs.leveledUp`, { count: leveledUp })}
      </p>
      {schedule.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {schedule.map(([days, count]) => (
            <span
              key={days}
              className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
            >
              {count} · {days === 0 ? t(`${FX}.srs.today`) : t(`${FX}.srs.inDays`, { count: days })}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
