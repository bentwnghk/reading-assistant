"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, PartyPopper } from "lucide-react";
import { useReadingStore } from "@/store/reading";
import { cn } from "@/utils/style";

function WorkflowProgress() {
  const { t } = useTranslation();
  const { extractedText, summary, adaptedText, mindMap, glossary, highlightedWords, analyzedSentences, spellingGameBestScore, vocabularyQuizScore, testCompleted } = useReadingStore();
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasShownConfetti, setHasShownConfetti] = useState(false);
  const confettiRef = useRef<HTMLDivElement>(null);

  const steps = [
    { key: "upload", label: t("reading.workflow.upload"), completed: !!extractedText },
    { key: "summary", label: t("reading.workflow.summary"), completed: !!summary },
    { key: "mindmap", label: t("reading.workflow.mindmap"), completed: !!mindMap },
    { key: "adapt", label: t("reading.workflow.adapt"), completed: !!adaptedText },
    { key: "test", label: t("reading.workflow.test"), completed: testCompleted },
    { key: "analyze", label: t("reading.workflow.analyze"), completed: Object.keys(analyzedSentences).length > 0 },
    { key: "highlight", label: t("reading.workflow.highlight"), completed: highlightedWords.length > 0 },
    { key: "glossary", label: t("reading.workflow.glossary"), completed: glossary.length > 0 },
    { key: "spelling", label: t("reading.workflow.spelling"), completed: spellingGameBestScore > 0 },
    { key: "vocabQuiz", label: t("reading.workflow.vocabQuiz"), completed: vocabularyQuizScore > 0 },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = Math.round((completedCount / steps.length) * 100);
  const isComplete = completedCount === steps.length;

  useEffect(() => {
    if (isComplete && !hasShownConfetti) {
      setShowCelebration(true);
      setHasShownConfetti(true);
      createConfetti();
      const timer = setTimeout(() => setShowCelebration(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, hasShownConfetti]);

  const createConfetti = () => {
    if (!confettiRef.current) return;
    
    const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
    const container = confettiRef.current;
    
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement("div");
      confetti.style.cssText = `
        position: absolute;
        width: ${Math.random() * 10 + 5}px;
        height: ${Math.random() * 10 + 5}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        left: ${Math.random() * 100}%;
        top: -20px;
        border-radius: ${Math.random() > 0.5 ? "50%" : "2px"};
        animation: confetti-fall ${Math.random() * 2 + 2}s ease-out forwards;
        animation-delay: ${Math.random() * 0.5}s;
        pointer-events: none;
      `;
      container.appendChild(confetti);
      
      setTimeout(() => confetti.remove(), 4000);
    }
  };

  return (
    <section className="section-card section-header-accent mt-4 relative overflow-hidden">
      <div ref={confettiRef} className="absolute inset-0 pointer-events-none" />
      
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          {t("reading.workflow.title")}
          {isComplete && (
            <span className="animate-fade-in-scale">
              <PartyPopper className="h-5 w-5 text-green-500" />
            </span>
          )}
        </h3>
        <span className="text-sm text-muted-foreground">
          {t("reading.workflow.progress", { percent: progress })}
        </span>
      </div>

      <div className="w-full bg-muted rounded-full h-2 mb-4 overflow-hidden">
        <div
          className={cn(
            "h-2 rounded-full transition-all duration-500 ease-out",
            isComplete 
              ? "bg-gradient-to-r from-green-500 to-emerald-500" 
              : "bg-primary"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="relative">
        <div className="absolute top-4 left-0 right-0 flex justify-between px-4 pointer-events-none">
          {steps.slice(0, -1).map((step, index) => (
            <div
              key={`line-${step.key}`}
              className={cn(
                "flex-1 h-0.5 mx-2 transition-colors duration-300",
                step.completed && steps[index + 1]?.completed
                  ? "bg-primary"
                  : step.completed
                  ? "bg-primary/50"
                  : "bg-muted"
              )}
            />
          ))}
        </div>

        <div className="flex justify-between gap-1 relative z-10">
          {steps.map((step, index) => (
            <div
              key={step.key}
              className={cn(
                "flex-1 flex flex-col items-center animate-fade-in-up opacity-0",
                `stagger-${Math.min(index + 1, 5)}`
              )}
              style={{ animationFillMode: "forwards" }}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300",
                  step.completed
                    ? "bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/30"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step.completed ? (
                  <Check className="h-4 w-4 animate-fade-in-scale" />
                ) : (
                  index + 1
                )}
              </div>
              <span className={cn(
                "text-xs mt-1 text-center hidden sm:block transition-colors duration-300",
                step.completed ? "text-primary font-medium" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in-scale">
          <div className="text-center p-4">
            <PartyPopper className="h-12 w-12 mx-auto mb-2 text-green-500 animate-bounce" />
            <p className="font-semibold text-lg">{t("reading.workflow.complete")}</p>
            <p className="text-sm text-muted-foreground">{t("reading.workflow.congratulations")}</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default WorkflowProgress;
