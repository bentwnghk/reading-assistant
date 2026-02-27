"use client";
import { useTranslation } from "react-i18next";
import { Lightbulb, BookOpen, MessageSquareQuote, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingStore } from "@/store/setting";

interface QuickQuestionItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  question: string;
  action?: "text" | "upload-image";
  requiresCheatMode?: boolean;
  requiresShowGiveAnswer?: boolean;
}

interface QuickQuestionsProps {
  onSelectQuestion: (question: string, action?: "text" | "upload-image") => void;
  disabled?: boolean;
}

function QuickQuestions({ onSelectQuestion, disabled }: QuickQuestionsProps) {
  const { t } = useTranslation();
  const { cheatMode, showGiveAnswer } = useSettingStore();

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
    <div className="flex flex-col gap-2 p-3 border-t border-border bg-muted/30">
      <div>
        <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
          <Lightbulb className="w-3 h-3" />
          {t("reading.tutor.quickQuestions.title")}
        </span>
        <div className="flex flex-wrap gap-2">
          {mainQuickQuestions.map((q, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => onSelectQuestion(q.question, q.action)}
              disabled={disabled}
              className="h-7 text-xs"
            >
              <q.icon className="w-3 h-3 mr-1" />
              {q.label}
            </Button>
          ))}
        </div>
      </div>
      {visibleImageQuestions.length > 0 && (
        <div>
          <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <ImagePlus className="w-3 h-3" />
            {t("reading.tutor.quickQuestions.imageHelpTitle")}
          </span>
          <div className="flex flex-wrap gap-2">
            {visibleImageQuestions.map((q, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => onSelectQuestion(q.question, q.action)}
                disabled={disabled}
                className="h-7 text-xs"
              >
                <q.icon className="w-3 h-3 mr-1" />
                {q.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default QuickQuestions;
