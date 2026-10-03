"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Lightbulb, BookOpen, MessageSquareQuote, ImagePlus, ClipboardCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingStore } from "@/store/setting";
import { cn } from "@/utils/style";

interface QuickQuestionItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  question: string;
  action?: "text" | "upload-image";
  requiresCheatMode?: boolean;
  requiresShowGiveAnswer?: boolean;
}

interface QuickQuestionsProps {
  onSelectQuestion: (question: string, action?: "text" | "upload-image", displayLabel?: string) => void;
  disabled?: boolean;
}

// UI-only collapsed preference (AGENTS.md §A lightweight pattern): module-level
// so it survives dialog remounts and SPA navigation for the session, without
// persisting user data. Defaults to expanded on all devices.
let collapsedState = false;

function QuickQuestions({ onSelectQuestion, disabled }: QuickQuestionsProps) {
  const { t } = useTranslation();
  const { cheatMode, showGiveAnswer } = useSettingStore();
  const [isCollapsed, setIsCollapsed] = useState(collapsedState);

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    collapsedState = next;
    setIsCollapsed(next);
  };

  const mainQuickQuestions: QuickQuestionItem[] = [
    {
      icon: Lightbulb,
      label: t("reading.tutor.quickQuestions.mainIdea"),
      question: t("reading.tutor.quickQuestions.mainIdeaQuestion"),
    },
    {
      icon: BookOpen,
      label: t("reading.tutor.quickQuestions.vocabHelp"),
      question: t("reading.tutor.quickQuestions.vocabHelpQuestion"),
    },
    {
      icon: MessageSquareQuote,
      label: t("reading.tutor.quickQuestions.explain"),
      question: t("reading.tutor.quickQuestions.explainQuestion"),
    },
  ];

  const imageQuickQuestions: QuickQuestionItem[] = [
    {
      icon: ImagePlus,
      label: t("reading.tutor.quickQuestions.helpWithImageHint"),
      question: t("reading.tutor.quickQuestions.helpWithImageHintQuestion"),
      action: "upload-image",
    },
    {
      icon: ImagePlus,
      label: t("reading.tutor.quickQuestions.helpWithImageStepByStep"),
      question: t("reading.tutor.quickQuestions.helpWithImageStepByStepQuestion"),
      action: "upload-image",
      requiresCheatMode: true,
    },
    {
      icon: ImagePlus,
      label: t("reading.tutor.quickQuestions.helpWithImageAnswer"),
      question: t("reading.tutor.quickQuestions.helpWithImageAnswerQuestion"),
      action: "upload-image",
      requiresCheatMode: true,
      requiresShowGiveAnswer: true,
    },
    {
      icon: ClipboardCheck,
      label: t("reading.tutor.quickQuestions.checkAnswer"),
      question: t("reading.tutor.quickQuestions.checkAnswerQuestion"),
      action: "upload-image",
    },
  ];

  const visibleImageQuestions = imageQuickQuestions.filter((q) => {
    if (q.requiresShowGiveAnswer) {
      return cheatMode && showGiveAnswer;
    }
    if (q.requiresCheatMode) {
      return cheatMode;
    }
    return true;
  });

  return (
    <div className="border-t border-border bg-muted/30">
      <button
        type="button"
        onClick={toggleCollapsed}
        onTouchEnd={(e) => { e.preventDefault(); toggleCollapsed(); }}
        aria-expanded={!isCollapsed}
        title={isCollapsed ? t("reading.tutor.quickQuestions.expand") : t("reading.tutor.quickQuestions.collapse")}
        className={cn(
          "flex w-full items-center gap-1 px-3 text-xs text-muted-foreground hover:text-foreground transition-colors",
          isCollapsed ? "py-2" : "pt-3 pb-1"
        )}
      >
        <Lightbulb className="w-3 h-3 flex-shrink-0" />
        <span className="flex-1 text-left">{t("reading.tutor.quickQuestions.title")}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 flex-shrink-0 transition-transform",
            !isCollapsed && "rotate-180"
          )}
        />
      </button>
      {!isCollapsed && (
        <div className="flex flex-col gap-2 px-3 pb-3">
          <div className="flex flex-wrap gap-1">
            {mainQuickQuestions.map((q, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => onSelectQuestion(q.question, q.action, q.label)}
                onTouchEnd={(e) => { e.preventDefault(); onSelectQuestion(q.question, q.action, q.label); }}
                disabled={disabled}
                className="h-7 text-xs px-1.5 gap-0.5"
              >
                <q.icon className="w-3 h-3" />
                {q.label}
              </Button>
            ))}
          </div>
          {visibleImageQuestions.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <ImagePlus className="w-3 h-3" />
                {t("reading.tutor.quickQuestions.imageHelpTitle")}
              </span>
              <div className="flex flex-wrap gap-1">
                {visibleImageQuestions.map((q, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectQuestion(q.question, q.action, q.label)}
                    onTouchEnd={(e) => { e.preventDefault(); onSelectQuestion(q.question, q.action, q.label); }}
                    disabled={disabled}
                    className="h-7 text-xs px-1.5 gap-0.5"
                  >
                    <q.icon className="w-3 h-3" />
                    {q.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default QuickQuestions;
