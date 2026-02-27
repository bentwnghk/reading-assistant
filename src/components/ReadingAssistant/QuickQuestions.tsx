"use client";
import { useTranslation } from "react-i18next";
import { Lightbulb, HelpCircle, BookOpen, MessageSquareQuote } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickQuestionsProps {
  onSelectQuestion: (question: string) => void;
  disabled?: boolean;
}

function QuickQuestions({ onSelectQuestion, disabled }: QuickQuestionsProps) {
  const { t } = useTranslation();

  const quickQuestions = [
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
          onClick={() => onSelectQuestion(q.question)}
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
