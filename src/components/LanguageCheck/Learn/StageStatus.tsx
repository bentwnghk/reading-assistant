"use client";
import { useTranslation } from "react-i18next";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LearnStageState } from "@/store/languageCheckLearn";

/** Loading / error placeholder for a stage that has no content yet. */
export default function StageStatus({
  stage,
  loadingKey,
  onRetry,
}: {
  stage: LearnStageState<unknown>;
  loadingKey: string;
  onRetry: () => void;
}) {
  const { t } = useTranslation();

  if (stage.status === "error") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-300/60 bg-red-50 p-10 text-center dark:border-red-900 dark:bg-red-950/30">
        <CircleAlert className="h-8 w-8 text-red-600" />
        <p className="font-medium">{t("languageCheck.learn.loading.failed")}</p>
        {stage.error && <p className="max-w-md text-sm text-muted-foreground">{stage.error}</p>}
        <Button variant="outline" onClick={onRetry}>
          {t("languageCheck.learn.loading.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-12 text-center"
    >
      <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      <p className="font-medium">{t(loadingKey)}</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t("languageCheck.learn.loading.hint")}
      </p>
    </div>
  );
}
