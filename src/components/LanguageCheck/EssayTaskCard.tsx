"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookMarked, ChevronDown } from "lucide-react";
import { LANGUAGE_CHECK_ESSAY_TYPE_GUIDANCE } from "@/constants/languageCheck";
import { cn } from "@/utils/style";

/** Collapsible summary of the writing task the essay answers. Hidden for older essays with none. */
export default function EssayTaskCard({
  essay,
}: {
  essay: Pick<LanguageCheckEssay, "topic" | "essayType" | "questionImage">;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!essay.topic && !essay.essayType && !essay.questionImage) return null;
  const type = essay.essayType
    ? LANGUAGE_CHECK_ESSAY_TYPE_GUIDANCE[essay.essayType].label
    : "";
  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium"
      >
        <BookMarked className="h-4 w-4 text-muted-foreground" />
        {t("languageCheck.topics.task")}
        {type && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {type}
          </span>
        )}
        <ChevronDown
          className={cn("ml-auto h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t px-4 py-3">
          {essay.topic && (
            <p className="whitespace-pre-line text-sm">{essay.topic}</p>
          )}
          {essay.questionImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={essay.questionImage}
              alt={t("languageCheck.topics.form.image")}
              className="max-h-80 w-fit rounded-md border"
            />
          )}
        </div>
      )}
    </div>
  );
}
