"use client";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { useReadingStore } from "@/store/reading";
import { cn } from "@/utils/style";

function WorkflowProgress() {
  const { t } = useTranslation();
  const { extractedText, summary, adaptedText, mindMap, glossary, highlightedWords, analyzedSentences, spellingGameBestScore, vocabularyQuizScore, testCompleted } = useReadingStore();

  const steps = [
    { key: "upload", label: t("reading.workflow.upload"), completed: !!extractedText, sectionId: "section-upload" },
    { key: "summary", label: t("reading.workflow.summary"), completed: !!summary, sectionId: "section-summary" },
    { key: "mindmap", label: t("reading.workflow.mindmap"), completed: !!mindMap, sectionId: "section-mindmap" },
    { key: "adapt", label: t("reading.workflow.adapt"), completed: !!adaptedText, sectionId: "section-adapted" },
    { key: "test", label: t("reading.workflow.test"), completed: testCompleted, sectionId: "section-test" },
    { key: "analyze", label: t("reading.workflow.analyze"), completed: Object.keys(analyzedSentences).length > 0, sectionId: "section-adapted" },
    { key: "highlight", label: t("reading.workflow.highlight"), completed: highlightedWords.length > 0, sectionId: "section-adapted" },
    { key: "glossary", label: t("reading.workflow.glossary"), completed: glossary.length > 0, sectionId: "section-glossary" },
    { key: "spelling", label: t("reading.workflow.spelling"), completed: spellingGameBestScore > 0, sectionId: "section-glossary" },
    { key: "vocabQuiz", label: t("reading.workflow.vocabQuiz"), completed: vocabularyQuizScore > 0, sectionId: "section-glossary" },
  ];

  const handleStepClick = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <section className="p-4 border rounded-md mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">
          {t("reading.workflow.title")}
        </h3>
        <span className="text-sm text-muted-foreground">
          {t("reading.workflow.progress", { percent: progress })}
        </span>
      </div>

      <div className="w-full bg-muted rounded-full h-2 mb-4">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex justify-between gap-1">
        {steps.map((step, index) => (
          <div
            key={step.key}
            onClick={() => handleStepClick(step.sectionId)}
            className={cn(
              "flex-1 flex flex-col items-center cursor-pointer",
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                step.completed
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {step.completed ? (
                <Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            <span className={cn(
              "text-xs mt-1 text-center hidden sm:block",
              step.completed ? "text-primary font-medium" : "text-muted-foreground"
            )}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default WorkflowProgress;
