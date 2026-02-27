"use client";
import { useTranslation } from "react-i18next";
import { Lightbulb, HelpCircle, BookOpen, MessageSquareQuote, ImagePlus, LightbulbIcon, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickQuestionItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  question: string;
  action?: "text" | "upload-image";
}

interface QuickQuestionsProps {
  onSelectQuestion: (question: string, action?: "text" | "upload-image") => void;
  disabled?: boolean;
}

function QuickQuestions({ onSelectQuestion, disabled }: QuickQuestionsProps) {
  const { t } = useTranslation();

  const quickQuestions: QuickQuestionItem[] = [
    {
      icon: Lightbulb,
      label: t("reading.tutor.quickQuestions.mainIdea"),
      question: t("reading.tutor.quickQuestions.mainIdeaQuestion"),
    },
    {
      icon: HelpCircle,
      label: t("reading.tutor.quickQuestions.summarize"),
      question: t("reading.tutor.quickQuestions.summarizeQuestion"),
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
    {
      icon: ImagePlus,
      label: t("reading.tutor.quickQuestions.helpWithImageStepByStep"),
      question: t("reading.tutor.quickQuestions.helpWithImageStepByStepQuestion"),
      action: "upload-image",
    },
    {
      icon: LightbulbIcon,
      label: t("reading.tutor.quickQuestions.helpWithImageHint"),
      question: t("reading.tutor.quickQuestions.helpWithImageHintQuestion"),
      action: "upload-image",
    },
    {
      icon: Target,
      label: t("reading.tutor.quickQuestions.helpWithImageAnswer"),
      question: t("reading.tutor.quickQuestions.helpWithImageAnswerQuestion"),
      action: "upload-image",
    },
  ];

  return (
    <div className="flex flex-wrap gap-2 p-3 border-t border-border bg-muted/30">
      <span className="text-xs text-muted-foreground flex items-center gap-1 w-full mb-1">
        <Lightbulb className="w-3 h-3" />
        {t("reading.tutor.quickQuestions.title")}
      </span>
      {quickQuestions.map((q, index) => (
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
  );
}

export default QuickQuestions;
