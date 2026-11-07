"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { BookOpen, LoaderCircle, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useLanguageCheck from "@/hooks/useLanguageCheck";
import { useReadingStore } from "@/store/reading";
import { SegmentedTabs } from "@/components/LanguageCheck/shared";

interface EnhancedEssayPanelProps {
  essay: Pick<
    LanguageCheckEssay,
    "id" | "checkedText" | "transcript" | "corrections"
  > &
    Partial<
      Pick<
        LanguageCheckEssay,
        "title" | "topic" | "essayType" | "questionImage" | "enhanced"
      >
    >;
  /** Persists freshly generated essays; throwing shows a toast (result is still shown). */
  onSave: (enhanced: LanguageCheckEnhanced) => Promise<void>;
  /**
   * Whether an essay that already carries enhanced essays may be generated
   * again. False for students in the owner workspace — their saved result
   * stays visible but becomes read-only (only staff may regenerate). Saving
   * the FIRST generation is always allowed. Defaults to true (staff log).
   */
  allowRegenerate?: boolean;
}

type Version = "light" | "heavy";

/**
 * Third results tab: light (polish) and heavy (HKDSE 5**) enhanced essays.
 * Nothing is generated until the user presses Generate.
 */
export default function EnhancedEssayPanel({
  essay,
  allowRegenerate = true,
  onSave,
}: EnhancedEssayPanelProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { enhanceEssay } = useLanguageCheck();
  const loadFromWriting = useReadingStore((s) => s.loadFromWriting);
  const [fresh, setFresh] = useState<{
    id: string;
    value: LanguageCheckEnhanced;
  } | null>(null);
  const result = fresh && fresh.id === essay.id ? fresh.value : (essay.enhanced ?? null);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState<Version>("light");
  const [confirmLoad, setConfirmLoad] = useState(false);
  // Once enhanced essays exist, running again is a staff-only action.
  const canRun = !result || allowRegenerate;

  async function run() {
    if (loading) return;
    setLoading(true);
    const id = essay.id;
    try {
      const r = await enhanceEssay(essay);
      setFresh({ id, value: r });
      try {
        await onSave(r);
      } catch {
        toast.error(t("languageCheck.enhanced.saveError"));
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) {
        toast.error(e instanceof Error ? e.message : t("languageCheck.enhanced.error"));
      }
    } finally {
      setLoading(false);
    }
  }

  // Loads the currently displayed version (light/heavy) into the main page's
  // Select Text section as a fresh reading session marked "From Writing", so
  // the rest of the reading pipeline (mind map, adapted text, …) can run on
  // it. Deep-links straight to the section.
  function doLoadToReading() {
    if (!result) return;
    loadFromWriting(
      essay.title?.trim() || t("languageCheck.list.untitled"),
      result[version],
    );
    toast.success(t("languageCheck.enhanced.loadedToReading"));
    router.push("/?goto=section-upload");
  }

  function handleLoadToReading() {
    // loadFromWriting calls abortAllGenerations(), which would cancel an
    // in-flight reading generation — confirm first. Existing content alone is
    // not a reason to block: pressing the button signals intent to replace it
    // (mirrors the TextRepository / AiTextGenerator load guards).
    const hasActiveGen = Object.values(
      useReadingStore.getState().activeGenerations,
    ).some(Boolean);
    if (hasActiveGen) {
      setConfirmLoad(true);
      return;
    }
    doLoadToReading();
  }

  return (
    <div className="shrink-0 overflow-hidden rounded-xl border bg-gradient-to-br from-amber-50 to-rose-50 p-4 dark:from-amber-950/30 dark:to-rose-950/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Wand2 className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{t("languageCheck.enhanced.title")}</p>
            <p className="break-words text-xs text-muted-foreground">
              {t("languageCheck.enhanced.subtitle")}
              {result &&
                ` · ${t("languageCheck.enhanced.generatedOn", {
                  date: new Date(result.generatedAt).toLocaleString(),
                })}`}
            </p>
          </div>
        </div>
        {canRun && (
          <Button
            size="lg"
            onClick={run}
            disabled={loading}
            variant={result ? "outline" : "default"}
            className={result ? undefined : "bg-amber-600 text-white hover:bg-amber-700"}
          >
            {loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading
              ? t("languageCheck.enhanced.working")
              : result
                ? t("languageCheck.enhanced.again")
                : t("languageCheck.enhanced.button")}
          </Button>
        )}
      </div>

      {result && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedTabs
              value={version}
              onChange={setVersion}
              ariaLabel={t("languageCheck.enhanced.switchLabel")}
              className="w-fit"
              options={[
                { value: "light", label: t("languageCheck.enhanced.light") },
                { value: "heavy", label: t("languageCheck.enhanced.heavy") },
              ]}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadToReading}
              className="gap-1.5"
            >
              <BookOpen className="h-3.5 w-3.5" />
              {t("languageCheck.enhanced.loadToReading")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t(`languageCheck.enhanced.${version}Desc`)}
          </p>
          <div className="rounded-xl border bg-card p-5 sm:p-8">
            <p
              className="whitespace-pre-wrap break-words text-lg leading-[2.4rem]"
              lang="en"
            >
              {result[version]}
            </p>
          </div>
        </div>
      )}

      <Dialog open={confirmLoad} onOpenChange={setConfirmLoad}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("history.confirmSwitchTitle")}</DialogTitle>
            <DialogDescription>{t("history.confirmSwitchDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLoad(false)}>
              {t("setting.cancel")}
            </Button>
            <Button
              onClick={() => {
                setConfirmLoad(false);
                doLoadToReading();
              }}
            >
              {t("history.confirmSwitch")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
