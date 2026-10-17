import { create } from "zustand";
import type { LanguageCheckCategory } from "@/constants/languageCheck";
import type { LearnErrorSample, LearnExercise, LearnLesson } from "@/utils/languageCheckLearn";
import { mergeUnit, type UnitIncoming } from "@/utils/languageCheckLearnMerge";
import { practiceProgress, quizProgress } from "@/utils/languageCheckLearnProgress";
import type {
  LearnEventInput,
  LearnLocation,
  LearnPatch,
  LearnSessionStatus,
  LearnSessionWire,
  LearnStage,
  LearnSyncResponse,
  LearnUnitPatch,
  LearnUnitWire,
  PracticeResult,
  QuizResult,
} from "@/utils/languageCheckLearnWire";

/**
 * "Learn from your mistakes" session store.
 *
 * The DATABASE is the source of truth (a session is reachable from any device
 * and visible to teachers); this store is the in-memory working copy plus a
 * small sync engine that saves deltas to `/api/language-check/learn/[id]`.
 * Everything that must survive SPA navigation lives here at module scope
 * (AGENTS Architectural Rules §A): generation state, the abort controller and
 * the pending-save queue, so a lesson keeps generating — and keeps being saved —
 * after the learner navigates away. The store is cleared on sign-out / account
 * switch via `useLanguageCheckStore.reset()`.
 *
 * Saving: every mutation marks what changed; changes are coalesced for a short
 * debounce, then sent as a delta. The server merges them into the stored
 * session (never deleting content, first quiz answer final, quizzes re-graded)
 * and answers with the merged state, which is reconciled back here — so two
 * devices converge instead of overwriting each other. Failures retry with
 * backoff; leaving or hiding the page flushes with `keepalive`.
 */

export type { LearnStage, LearnLocation, PracticeResult, QuizResult };
export type LearnStageStatus = "idle" | "loading" | "ready" | "error";

export interface LearnStageState<T> {
  status: LearnStageStatus;
  data: T | null;
  error: string | null;
}

export interface LearnUnit {
  category: LanguageCheckCategory;
  mistakeCount: number;
  samples: LearnErrorSample[];
  lesson: LearnStageState<LearnLesson>;
  practice: LearnStageState<LearnExercise[]>;
  quiz: LearnStageState<LearnExercise[]>;
  lessonSeen: boolean;
  practiceResults: Record<string, PracticeResult>;
  quizResults: Record<string, QuizResult>;
  /** Prompts of quiz rounds already taken, so a new round never repeats them. */
  previousQuizPrompts: string[];
  quizRound: number;
}

export interface LearnSession {
  /** The server-side session id. */
  key: string;
  essayId: string | null;
  essayTitle: string;
  age: number;
  status: LearnSessionStatus;
  units: LearnUnit[];
  current: LearnLocation;
}

export type LearnSyncStatus = "idle" | "saving" | "error";

interface LearnState {
  session: LearnSession | null;
  /** Save state of the open session (drives the "Saved / Saving…" chip). */
  sync: LearnSyncStatus;
  lastSavedAt: number | null;
}

interface LearnActions {
  start: (session: LearnSession) => void;
  setCurrent: (key: string, location: LearnLocation) => void;
  patchUnit: (
    key: string,
    category: string,
    patch: (unit: LearnUnit) => Partial<LearnUnit>,
  ) => void;
  markLessonSeen: (key: string, category: string) => void;
  recordPractice: (
    key: string,
    category: string,
    id: string,
    patch: (prev: PracticeResult | undefined) => PracticeResult,
  ) => void;
  recordQuiz: (key: string, category: string, id: string, result: QuizResult) => void;
  /** Queues a behavioural event for the activity log (deduped server-side by `key`). */
  logEvent: (key: string, event: LearnEventInput) => void;
  /**
   * Saves everything pending now (or `keepalive` when the page is going away).
   * Resolves true once nothing is left unsaved, false if the server could not
   * be reached (the work stays queued and retries).
   */
  flush: (opts?: { keepalive?: boolean }) => Promise<boolean>;
  /** Pulls the server state into the open session (other devices' progress). */
  pull: (key: string) => Promise<void>;
  reset: () => void;
}

export const emptyStage = <T,>(): LearnStageState<T> => ({
  status: "idle",
  data: null,
  error: null,
});

export function createUnit(
  category: LanguageCheckCategory,
  mistakeCount: number,
  samples: LearnErrorSample[],
): LearnUnit {
  return {
    category,
    mistakeCount,
    samples,
    lesson: emptyStage(),
    practice: emptyStage(),
    quiz: emptyStage(),
    lessonSeen: false,
    practiceResults: {},
    quizResults: {},
    previousQuizPrompts: [],
    quizRound: 1,
  };
}

// ─── Wire conversion ─────────────────────────────────────────────────────────

function stageFrom<T>(data: T | null): LearnStageState<T> {
  return data ? { status: "ready", data, error: null } : emptyStage<T>();
}

export function unitFromWire(w: LearnUnitWire): LearnUnit {
  return {
    category: w.category,
    mistakeCount: w.mistakeCount,
    samples: w.samples,
    lesson: stageFrom(w.lesson),
    practice: stageFrom(w.practice),
    quiz: stageFrom(w.quiz),
    lessonSeen: w.lessonSeen,
    practiceResults: w.practiceResults,
    quizResults: w.quizResults,
    previousQuizPrompts: w.previousQuizPrompts,
    quizRound: w.quizRound,
  };
}

export function sessionFromWire(w: LearnSessionWire): LearnSession {
  return {
    key: w.id,
    essayId: w.essayId,
    essayTitle: w.essayTitle,
    age: w.age,
    status: w.status,
    units: w.units.map(unitFromWire),
    current: w.current,
  };
}

/** The content/progress of a local unit in the shape `mergeUnit` understands. */
function incomingOf(u: LearnUnit): UnitIncoming {
  return {
    lesson: u.lesson.data,
    practice: u.practice.data,
    quiz: u.quiz.data,
    lessonSeen: u.lessonSeen,
    practiceResults: u.practiceResults,
    quizResults: u.quizResults,
    previousQuizPrompts: u.previousQuizPrompts,
    quizRound: u.quizRound,
  };
}

/**
 * Folds the server's copy of a unit into the local one. The server wins on
 * conflict; local work the server has not seen yet is kept (so a save that is
 * still queued is never lost). A stage that is generating locally stays
 * "loading" — a response must not cancel a spinner.
 */
function reconcileUnit(local: LearnUnit, server: LearnUnitWire): LearnUnit {
  const merged = mergeUnit(server, incomingOf(local));
  const stage = <T,>(current: LearnStageState<T>, data: T | null): LearnStageState<T> =>
    current.status === "loading"
      ? { ...current, data: data ?? current.data }
      : data
        ? { status: "ready", data, error: null }
        : current.status === "error"
          ? current
          : emptyStage<T>();
  return {
    ...local,
    lesson: stage(local.lesson, merged.lesson),
    practice: stage(local.practice, merged.practice),
    quiz: stage(local.quiz, merged.quiz),
    lessonSeen: merged.lessonSeen,
    practiceResults: merged.practiceResults,
    quizResults: merged.quizResults,
    previousQuizPrompts: merged.previousQuizPrompts,
    quizRound: merged.quizRound,
  };
}

/** The learner's position is owned by the tab they are in; only progress is merged. */
function reconcileSession(local: LearnSession, server: LearnSessionWire): LearnSession {
  return {
    ...local,
    essayId: server.essayId,
    status: server.status,
    units: local.units.map((u) => {
      const s = server.units.find((x) => x.category === u.category);
      return s ? reconcileUnit(u, s) : u;
    }),
  };
}

// ─── Abort registry (module scope: survives component unmount) ───────────────
let controller: AbortController | null = null;

export function getLearnAbort(): AbortController {
  if (!controller || controller.signal.aborted) controller = new AbortController();
  return controller;
}

export function abortLearn(): void {
  if (controller && !controller.signal.aborted) controller.abort();
  controller = null;
}

// ─── Pending saves (module scope: survives component unmount) ────────────────

interface UnitDirty {
  lesson: boolean;
  practice: boolean;
  quiz: boolean;
  lessonSeen: boolean;
  /** A retake (or any change to the round bookkeeping): resend the round's state. */
  round: boolean;
  practiceIds: Set<string>;
  quizIds: Set<string>;
}

interface Pending {
  /** Latest local copy (immutable snapshots, so holding it is cheap). */
  session: LearnSession;
  current: boolean;
  units: Map<string, UnitDirty>;
  events: LearnEventInput[];
  inflight: Promise<void> | null;
  attempts: number;
  timer: ReturnType<typeof setTimeout> | null;
}

const SAVE_DEBOUNCE_MS = 700;
const RETRY_DELAYS_MS = [3_000, 8_000, 20_000, 45_000];
const KEEPALIVE_LIMIT_CHARS = 60_000;
const BASE = "/api/language-check/learn";

const pending = new Map<string, Pending>();
let lifecycleWired = false;

const emptyDirty = (): UnitDirty => ({
  lesson: false,
  practice: false,
  quiz: false,
  lessonSeen: false,
  round: false,
  practiceIds: new Set(),
  quizIds: new Set(),
});

function pendingFor(session: LearnSession): Pending {
  let p = pending.get(session.key);
  if (!p) {
    p = {
      session,
      current: false,
      units: new Map(),
      events: [],
      inflight: null,
      attempts: 0,
      timer: null,
    };
    pending.set(session.key, p);
  }
  p.session = session;
  return p;
}

function dirtyUnit(p: Pending, category: string): UnitDirty {
  let d = p.units.get(category);
  if (!d) {
    d = emptyDirty();
    p.units.set(category, d);
  }
  return d;
}

function hasPending(p: Pending): boolean {
  return p.current || p.units.size > 0 || p.events.length > 0;
}

function buildUnitPatch(unit: LearnUnit, d: UnitDirty): LearnUnitPatch | null {
  const out: LearnUnitPatch = { category: unit.category };
  let any = false;
  if (d.lesson && unit.lesson.data) {
    out.lesson = unit.lesson.data;
    any = true;
  }
  if (d.practice && unit.practice.data) {
    out.practice = unit.practice.data;
    any = true;
  }
  if (d.quiz && unit.quiz.data) {
    out.quiz = unit.quiz.data;
    any = true;
  }
  if (d.lessonSeen && unit.lessonSeen) {
    out.lessonSeen = true;
    any = true;
  }
  if (d.practiceIds.size) {
    const picked: Record<string, PracticeResult> = {};
    for (const id of d.practiceIds) {
      if (unit.practiceResults[id]) picked[id] = unit.practiceResults[id];
    }
    if (Object.keys(picked).length) {
      out.practiceResults = picked;
      any = true;
    }
  }
  if (d.round || d.quiz || d.quizIds.size) {
    // The round always travels with quiz content/answers: the server decides
    // whether they belong to the stored round or to a newer one.
    out.quizRound = unit.quizRound;
    any = true;
    if (d.round) {
      out.quizResults = { ...unit.quizResults };
      out.previousQuizPrompts = unit.previousQuizPrompts;
    } else if (d.quizIds.size) {
      const picked: Record<string, QuizResult> = {};
      for (const id of d.quizIds) {
        if (unit.quizResults[id]) picked[id] = unit.quizResults[id];
      }
      out.quizResults = picked;
    }
  }
  return any ? out : null;
}

function mergeBack(p: Pending, snap: Pick<Pending, "current" | "units" | "events">): void {
  p.current ||= snap.current;
  for (const [category, d] of snap.units) {
    const into = dirtyUnit(p, category);
    into.lesson ||= d.lesson;
    into.practice ||= d.practice;
    into.quiz ||= d.quiz;
    into.lessonSeen ||= d.lessonSeen;
    into.round ||= d.round;
    d.practiceIds.forEach((id) => into.practiceIds.add(id));
    d.quizIds.forEach((id) => into.quizIds.add(id));
  }
  p.events = [...snap.events, ...p.events];
}

function schedule(key: string, delay: number): void {
  const p = pending.get(key);
  if (!p) return;
  if (p.timer) clearTimeout(p.timer);
  p.timer = setTimeout(() => {
    p.timer = null;
    void saveSession(key);
  }, delay);
}

function wireLifecycle(): void {
  if (lifecycleWired || typeof window === "undefined") return;
  lifecycleWired = true;
  const flushAll = (keepalive: boolean) => {
    for (const key of pending.keys()) void saveSession(key, { keepalive });
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAll(true);
  });
  window.addEventListener("pagehide", () => flushAll(true));
  window.addEventListener("online", () => flushAll(false));
}

type Setter = (partial: Partial<LearnState>) => void;
let setState: Setter = () => undefined;
let getState: () => LearnState = () => ({ session: null, sync: "idle", lastSavedAt: null });

function setSync(key: string, sync: LearnSyncStatus, savedAt?: number): void {
  if (getState().session?.key !== key) return;
  setState({ sync, ...(savedAt ? { lastSavedAt: savedAt } : {}) });
}

/** Sends the pending delta of one session; reconciles the merged state back. */
function saveSession(key: string, opts: { keepalive?: boolean } = {}): Promise<void> {
  const p = pending.get(key);
  if (!p) return Promise.resolve();
  if (p.inflight) return p.inflight;
  if (p.timer) {
    clearTimeout(p.timer);
    p.timer = null;
  }
  if (!hasPending(p)) {
    pending.delete(key);
    return Promise.resolve();
  }
  p.inflight = send(key, p, opts).finally(() => {
    p.inflight = null;
  });
  return p.inflight;
}

async function send(key: string, p: Pending, opts: { keepalive?: boolean }): Promise<void> {
  const snap = { current: p.current, units: p.units, events: p.events };
  p.current = false;
  p.units = new Map();
  p.events = [];

  const patch: LearnPatch = {};
  if (snap.current) patch.current = p.session.current;
  const unitPatches = [...snap.units]
    .map(([category, d]) => {
      const unit = p.session.units.find((u) => u.category === category);
      return unit ? buildUnitPatch(unit, d) : null;
    })
    .filter((u): u is LearnUnitPatch => u !== null);
  if (unitPatches.length) patch.units = unitPatches;
  if (snap.events.length) patch.events = snap.events;

  setSync(key, "saving");
  try {
    const body = JSON.stringify(patch);
    const res = await fetch(`${BASE}/${key}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: !!opts.keepalive && body.length < KEEPALIVE_LIMIT_CHARS,
    });
    if (res.status === 404) {
      // Deleted on another device: nothing left to save to.
      pending.delete(key);
      setSync(key, "error");
      return;
    }
    if (res.status === 400 || res.status === 413) {
      // The server will never accept this delta; retrying would loop forever.
      console.error("Language check learn save rejected:", res.status);
      p.attempts = 0;
      setSync(key, "error");
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = (await res.json()) as LearnSyncResponse;
    p.attempts = 0;
    const current = getState().session;
    if (current?.key === key) {
      setState({ session: reconcileSession(current, data.session) });
    }
    setSync(key, hasPending(p) ? "saving" : "idle", Date.now());
  } catch {
    mergeBack(p, snap);
    const delay = RETRY_DELAYS_MS[Math.min(p.attempts, RETRY_DELAYS_MS.length - 1)];
    p.attempts += 1;
    setSync(key, "error");
    schedule(key, delay);
    return;
  }
  if (hasPending(p)) schedule(key, SAVE_DEBOUNCE_MS);
  else pending.delete(key);
}

function mapUnit(
  session: LearnSession,
  category: string,
  fn: (unit: LearnUnit) => LearnUnit,
): LearnSession {
  return {
    ...session,
    units: session.units.map((u) => (u.category === category ? fn(u) : u)),
  };
}

/** Marks what a unit mutation changed (by reference) so only that is saved. */
function trackUnitChange(session: LearnSession, prev: LearnUnit, next: LearnUnit): void {
  const lesson = prev.lesson.data !== next.lesson.data;
  const practice = prev.practice.data !== next.practice.data;
  const quiz = prev.quiz.data !== next.quiz.data;
  const round =
    prev.quizRound !== next.quizRound || prev.previousQuizPrompts !== next.previousQuizPrompts;
  if (!lesson && !practice && !quiz && !round) return;
  const d = dirtyUnit(pendingFor(session), next.category);
  d.lesson ||= lesson;
  d.practice ||= practice;
  d.quiz ||= quiz;
  d.round ||= round;
  schedule(session.key, SAVE_DEBOUNCE_MS);
}

export const useLanguageCheckLearnStore = create<LearnState & LearnActions>()((set, get) => {
  setState = set;
  getState = get;
  wireLifecycle();

  return {
    session: null,
    sync: "idle",
    lastSavedAt: null,

    start: (session) => {
      const previous = get().session;
      // A queued save of the session being left must not wait for its timer.
      if (previous && previous.key !== session.key && pending.has(previous.key)) {
        void saveSession(previous.key);
      }
      set({ session, sync: "idle", lastSavedAt: null });
    },

    setCurrent: (key, current) => {
      const s = get().session;
      if (s?.key !== key) return;
      const session = { ...s, current };
      set({ session });
      pendingFor(session).current = true;
      schedule(key, SAVE_DEBOUNCE_MS);
    },

    patchUnit: (key, category, patch) => {
      const s = get().session;
      if (s?.key !== key) return;
      const prev = s.units.find((u) => u.category === category);
      if (!prev) return;
      const next: LearnUnit = { ...prev, ...patch(prev) };
      const session = mapUnit(s, category, () => next);
      set({ session });
      trackUnitChange(session, prev, next);
    },

    markLessonSeen: (key, category) => {
      const s = get().session;
      if (s?.key !== key) return;
      const prev = s.units.find((u) => u.category === category);
      if (!prev || prev.lessonSeen) return;
      const session = mapUnit(s, category, (u) => ({ ...u, lessonSeen: true }));
      set({ session });
      dirtyUnit(pendingFor(session), category).lessonSeen = true;
      schedule(key, SAVE_DEBOUNCE_MS);
    },

    recordPractice: (key, category, id, patch) => {
      const s = get().session;
      if (s?.key !== key) return;
      const session = mapUnit(s, category, (u) => ({
        ...u,
        practiceResults: { ...u.practiceResults, [id]: patch(u.practiceResults[id]) },
      }));
      set({ session });
      dirtyUnit(pendingFor(session), category).practiceIds.add(id);
      schedule(key, SAVE_DEBOUNCE_MS);
    },

    recordQuiz: (key, category, id, result) => {
      const s = get().session;
      if (s?.key !== key) return;
      const session = mapUnit(s, category, (u) => ({
        ...u,
        quizResults: { ...u.quizResults, [id]: result },
      }));
      set({ session });
      dirtyUnit(pendingFor(session), category).quizIds.add(id);
      // An answer is final and completes quizzes: save without the debounce.
      schedule(key, 0);
    },

    logEvent: (key, event) => {
      const s = get().session;
      if (s?.key !== key) return;
      const p = pendingFor(s);
      if (p.events.some((e) => e.key === event.key)) return;
      p.events.push(event);
      schedule(key, SAVE_DEBOUNCE_MS);
    },

    flush: async (opts) => {
      for (const key of [...pending.keys()]) {
        // A save may be in flight while newer changes queue behind it.
        for (let i = 0; i < 4 && pending.has(key); i++) {
          await saveSession(key, opts);
          if ((pending.get(key)?.attempts ?? 0) > 0) return false;
        }
      }
      return pending.size === 0;
    },

    pull: async (key) => {
      // Never pull over unsaved work: save first, the response is the pull.
      const p = pending.get(key);
      if (p && hasPending(p)) {
        await saveSession(key);
        return;
      }
      try {
        const res = await fetch(`${BASE}/${key}`);
        if (!res.ok) return;
        const { session: server } = (await res.json()) as { session: LearnSessionWire };
        const local = get().session;
        if (local?.key !== key || pending.has(key)) return;
        set({ session: reconcileSession(local, server) });
      } catch {
        // offline: keep the local copy
      }
    },

    reset: () => {
      abortLearn();
      for (const p of pending.values()) if (p.timer) clearTimeout(p.timer);
      pending.clear();
      set({ session: null, sync: "idle", lastSavedAt: null });
      try {
        // Legacy per-tab mirror from before sessions were stored server-side.
        sessionStorage.removeItem("languageCheckLearn");
      } catch {
        // storage unavailable
      }
    },
  };
});

// ─── Derived progress (pure; shared by the path, the player and the summary) ──

export function practiceDone(unit: LearnUnit): boolean {
  const p = practiceProgress(unit.practice.data, unit.practiceResults);
  return p.total > 0 && p.completed === p.total;
}

export function quizDone(unit: LearnUnit): boolean {
  return quizProgress(unit.quiz.data, unit.quizResults).percent !== null;
}

export function unitDone(unit: LearnUnit): boolean {
  return quizDone(unit);
}

/** Percentage of practice credit earned from first attempts. */
export function practicePercent(unit: LearnUnit): number | null {
  return practiceProgress(unit.practice.data, unit.practiceResults).percent;
}

export function quizPercent(unit: LearnUnit): number | null {
  return quizProgress(unit.quiz.data, unit.quizResults).percent;
}

/** Whether a stage may be opened (lessons are always open; the rest unlock in order). */
export function stageUnlocked(unit: LearnUnit, stage: LearnStage): boolean {
  if (stage === "lesson") return true;
  if (stage === "practice") return unit.lessonSeen;
  return practiceDone(unit);
}
