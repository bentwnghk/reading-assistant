"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CloudOff, GraduationCap, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import LearnPath from "@/components/LanguageCheck/Learn/LearnPath";
import LearnSummary from "@/components/LanguageCheck/Learn/LearnSummary";
import LessonView from "@/components/LanguageCheck/Learn/LessonView";
import PracticePlayer from "@/components/LanguageCheck/Learn/PracticePlayer";
import QuizPlayer from "@/components/LanguageCheck/Learn/QuizPlayer";
import StageStatus from "@/components/LanguageCheck/Learn/StageStatus";
import { useCategoryLabel } from "@/components/LanguageCheck/shared";
import useLanguageCheckLearn from "@/hooks/useLanguageCheckLearn";
import { useLanguageCheckStore } from "@/store/languageCheck";
import {
  quizDone,
  stageUnlocked,
  useLanguageCheckLearnStore,
  type LearnLocation,
  type LearnSession,
} from "@/store/languageCheckLearn";
import { learnUrl, levelKeyForAge } from "@/utils/languageCheckLearn";

export default function LearnContainer() {
  const router = useRouter();
  const params = useSearchParams();
  const wanted = params.get("session");
  const session = useLanguageCheckLearnStore((s) => s.session);
  const { openSession } = useLanguageCheckLearn();
  const pull = useLanguageCheckLearnStore((s) => s.pull);
  const [failed, setFailed] = useState(false);
  const requested = useRef<string | null>(null);

  // The database is the source of truth: open the session named in the URL
  // (a reload, another device, a bookmark), or pick up progress made elsewhere
  // when it is already in memory. No id and nothing in memory → back to the list.
  useEffect(() => {
    if (!wanted) {
      if (session) router.replace(learnUrl(session.key));
      else router.replace("/language-check?tab=learning");
      return;
    }
    if (requested.current === wanted) return;
    requested.current = wanted;
    if (useLanguageCheckLearnStore.getState().session?.key === wanted) {
      void pull(wanted);
      return;
    }
    void openSession(wanted).then((id) => {
      if (!id) setFailed(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted]);

  useEffect(() => {
    if (failed) router.replace("/language-check?tab=learning");
  }, [failed, router]);

  if (!session || (wanted && session.key !== wanted)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <LearnWorkspace key={session.key} session={session} />;
}

function SaveStatus() {
  const { t } = useTranslation();
  const sync = useLanguageCheckLearnStore((s) => s.sync);
  const lastSavedAt = useLanguageCheckLearnStore((s) => s.lastSavedAt);
  const flush = useLanguageCheckLearnStore((s) => s.flush);
  if (sync === "error") {
    return (
      <button
        type="button"
        onClick={() => void flush()}
        className="flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/5 px-2.5 py-1 text-xs text-amber-700 dark:text-amber-400"
        title={t("languageCheck.learn.sync.retryHint")}
      >
        <CloudOff className="h-3.5 w-3.5" />
        {t("languageCheck.learn.sync.error")}
      </button>
    );
  }
  if (sync === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        {t("languageCheck.learn.sync.saving")}
      </span>
    );
  }
  return lastSavedAt ? (
    <span className="text-xs text-muted-foreground" role="status">
      {t("languageCheck.learn.sync.saved")}
    </span>
  ) : null;
}

function LearnWorkspace({ session }: { session: LearnSession }) {
  const { t } = useTranslation();
  const router = useRouter();
  const categoryLabel = useCategoryLabel();
  const { ensureLesson, ensurePractice, ensureQuiz } = useLanguageCheckLearn();
  const setCurrent = useLanguageCheckLearnStore((s) => s.setCurrent);
  const markLessonSeen = useLanguageCheckLearnStore((s) => s.markLessonSeen);
  const logEvent = useLanguageCheckLearnStore((s) => s.logEvent);
  const flush = useLanguageCheckLearnStore((s) => s.flush);
  const language = useLanguageCheckStore((s) => s.explanationLanguage);
  const setLanguage = useLanguageCheckStore((s) => s.setExplanationLanguage);

  const { key, current } = session;
  const here = current === "summary" ? null : current;
  const unit = here ? session.units[here.unit] : null;
  const stage = here?.stage;

  // Make sure whatever the learner is looking at exists. Generation is
  // idempotent (guards on status), and also resumes after a reload.
  useEffect(() => {
    if (!unit || !stage) return;
    if (stage === "lesson") {
      void ensureLesson(key, unit.category);
      // A lesson that was prefetched (or restored) still needs its practice warmed.
      if (unit.lesson.status === "ready") void ensurePractice(key, unit.category);
    }
    if (stage === "practice") void ensurePractice(key, unit.category);
    if (stage === "quiz") void ensureQuiz(key, unit.category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, unit?.category, stage]);

  // Looking at the summary is part of the activity log (once per session).
  useEffect(() => {
    if (current === "summary") {
      logEvent(key, { type: "summary_viewed", key: `sv:${key}` });
    }
  }, [current, key, logEvent]);

  // Keep the page title and scroll position sensible when the step changes.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [current]);

  function go(location: LearnLocation) {
    setCurrent(key, location);
  }

  /** Next unfinished unit after this one (wrapping round), else the summary. */
  function unitAfter(unitIndex: number): LearnLocation {
    const n = session.units.length;
    for (let step = 1; step < n; step++) {
      const i = (unitIndex + step) % n;
      if (!quizDone(session.units[i])) return { unit: i, stage: "lesson" };
    }
    return "summary";
  }

  function leave() {
    void flush();
    router.push("/language-check");
  }

  const level = t(`reading.levels.${levelKeyForAge(session.age)}`);
  const unitIndex = here?.unit ?? 0;
  const isLastUnit = unitAfter(unitIndex) === "summary";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={leave}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t("languageCheck.learn.backToResults")}
        </Button>
        <div className="flex min-w-[12rem] flex-1 items-center gap-2">
          <GraduationCap className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight">
              {t("languageCheck.learn.title")}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {session.essayTitle || t("languageCheck.list.untitled")} · {level}
            </p>
          </div>
        </div>
        <SaveStatus />
        <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm">
          <span className={language === "en" ? "font-semibold" : "text-muted-foreground"}>English</span>
          <Switch
            checked={language === "zh"}
            onCheckedChange={(c) => setLanguage(c ? "zh" : "en")}
            aria-label={t("languageCheck.results.explanationLanguage")}
          />
          <span className={language === "zh" ? "font-semibold" : "text-muted-foreground"}>繁體中文</span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <LearnPath session={session} onGo={go} />
        </aside>

        <main className="min-w-0">
          {current === "summary" ? (
            <LearnSummary
              session={session}
              onReview={(i) => go({ unit: i, stage: "lesson" })}
              onBackToEssay={leave}
            />
          ) : unit && stage === "lesson" ? (
            unit.lesson.data ? (
              <LessonView
                unit={unit}
                lesson={unit.lesson.data}
                language={language}
                categoryLabel={categoryLabel(unit.category)}
                onContinue={() => {
                  markLessonSeen(key, unit.category);
                  go({ unit: unitIndex, stage: "practice" });
                }}
              />
            ) : (
              <StageStatus
                stage={unit.lesson}
                loadingKey="languageCheck.learn.loading.lesson"
                onRetry={() => void ensureLesson(key, unit.category)}
              />
            )
          ) : unit && stage === "practice" ? (
            stageUnlocked(unit, "practice") ? (
              <PracticePlayer
                sessionKey={key}
                unit={unit}
                language={language}
                onContinue={() => go({ unit: unitIndex, stage: "quiz" })}
              />
            ) : (
              <Locked onGo={() => go({ unit: unitIndex, stage: "lesson" })} />
            )
          ) : unit && stage === "quiz" ? (
            stageUnlocked(unit, "quiz") ? (
              <QuizPlayer
                sessionKey={key}
                unit={unit}
                language={language}
                nextLabel={
                  isLastUnit
                    ? t("languageCheck.learn.quiz.seeSummary")
                    : t("languageCheck.learn.quiz.nextTopic")
                }
                onNext={() => go(unitAfter(unitIndex))}
              />
            ) : (
              <Locked onGo={() => go({ unit: unitIndex, stage: "practice" })} />
            )
          ) : null}
        </main>
      </div>
    </div>
  );
}

function Locked({ onGo }: { onGo: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center">
      <p className="text-muted-foreground">{t("languageCheck.learn.locked")}</p>
      <Button variant="outline" onClick={onGo}>
        {t("languageCheck.learn.goBack")}
      </Button>
    </div>
  );
}
