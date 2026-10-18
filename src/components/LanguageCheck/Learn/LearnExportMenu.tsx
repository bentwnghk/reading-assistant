"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { FileDown, FileText, KeyRound, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCategoryLabel } from "@/components/LanguageCheck/shared";
import { useLanguageCheckStore, type ExplanationLanguage } from "@/store/languageCheck";
import { useLanguageCheckLearnStore } from "@/store/languageCheckLearn";
import { exportLearnDocx } from "@/utils/languageCheckLearnExport";
import { canExportLearnSession } from "@/utils/languageCheckLearnProgress";
import { parseError } from "@/utils/error";
import type { LearnSessionStatus, LearnSessionWire } from "@/utils/languageCheckLearnWire";

interface LearnExportMenuProps {
  sessionId: string;
  status: LearnSessionStatus;
  /** Endpoint returning `{ session }` with the full content (default: the learner's own). */
  endpoint?: string;
  /** Language of the explanations; defaults to the Language Check preference. */
  language?: ExplanationLanguage;
  /** Save pending work first (the session open in this browser). */
  flushFirst?: boolean;
  iconOnly?: boolean;
  variant?: "outline" | "ghost" | "default";
}

/**
 * "Export to Word" dropdown for one learning session: the student worksheet or
 * the version with model answers. Learners can export only a completed session;
 * staff any time (the server enforces the same rule, so this only mirrors it).
 */
export default function LearnExportMenu({
  sessionId,
  status,
  endpoint,
  language,
  flushFirst = false,
  iconOnly = false,
  variant = "outline",
}: LearnExportMenuProps) {
  const { t } = useTranslation();
  const { data: auth } = useSession();
  const categoryLabel = useCategoryLabel();
  const preferred = useLanguageCheckStore((s) => s.explanationLanguage);
  const [busy, setBusy] = useState(false);
  const allowed = canExportLearnSession(auth?.user?.role, status);

  async function run(withAnswers: boolean) {
    setBusy(true);
    try {
      if (flushFirst) await useLanguageCheckLearnStore.getState().flush();
      const res = await fetch(endpoint ?? `/api/language-check/learn/${sessionId}/export`);
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      await exportLearnDocx({
        session: (body as { session: LearnSessionWire }).session,
        language: language ?? preferred,
        withAnswers,
        t,
        categoryLabel,
      });
    } catch (e) {
      toast.error(`${t("languageCheck.learnExport.failed")} ${parseError(e)}`);
    } finally {
      setBusy(false);
    }
  }

  const label = t("languageCheck.learnExport.button");
  const trigger = (
    <Button
      variant={variant}
      size={iconOnly ? "icon" : "sm"}
      disabled={!allowed || busy}
      title={allowed ? label : t("languageCheck.learnExport.unavailable")}
      aria-label={label}
      className={iconOnly ? undefined : "gap-1.5"}
    >
      {busy ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      {!iconOnly && label}
    </Button>
  );

  // A disabled button swallows hover, so the explanation rides on a wrapper.
  if (!allowed) {
    return (
      <span title={t("languageCheck.learnExport.unavailable")} className="inline-flex">
        {trigger}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuItem className="items-start gap-3 py-2" onSelect={() => void run(false)}>
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex flex-col">
            <span className="font-medium">{t("languageCheck.learnExport.student")}</span>
            <span className="text-xs text-muted-foreground">
              {t("languageCheck.learnExport.studentHint")}
            </span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem className="items-start gap-3 py-2" onSelect={() => void run(true)}>
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
          <span className="flex flex-col">
            <span className="font-medium">{t("languageCheck.learnExport.answers")}</span>
            <span className="text-xs text-muted-foreground">
              {t("languageCheck.learnExport.answersHint")}
            </span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
