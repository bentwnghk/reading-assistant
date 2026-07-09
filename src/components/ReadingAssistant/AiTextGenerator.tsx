"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, LoaderCircle, ArrowDown, ArrowUp, RotateCcw, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import {
  READING_TEXT_TYPES,
  READING_TEXT_LENGTHS,
  getAgeLevelMapping,
  CEFR_ORDER,
  type ReadingTextType,
} from "@/constants/readingPrompts";

interface AiTextGeneratorProps {
  onTextLoaded?: () => void;
}

const CEFR_BADGE_COLORS: Record<CEFRLevel, string> = {
  A1: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  A2: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  B1: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  B2: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  C1: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  C2: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

function AiTextGenerator({ onTextLoaded }: AiTextGeneratorProps) {
  const { t } = useTranslation();
  const { studentAge, generatedTextMeta, source, activeGenerations } = useReadingStore();
  const { generateReadingText, regenerateReadingText } = useReadingAssistant();

  const autoCefr = useMemo(() => getAgeLevelMapping(studentAge).cefr, [studentAge]);
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [textTypeId, setTextTypeId] = useState<ReadingTextType>("article");
  const [targetWordCount, setTargetWordCount] = useState<number>(READING_TEXT_LENGTHS[1]);
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>(autoCefr);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const overriddenRef = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Keep the CEFR selector in sync with the student's age unless the user has
  // manually overridden it (advanced/weaker students).
  useEffect(() => {
    if (!overriddenRef.current) setCefrLevel(autoCefr);
  }, [autoCefr]);

  const isGenerating = !!activeGenerations["reading-text"];

  // Acquire a Screen Wake Lock while generating to prevent iOS from suspending
  // the page (long generations can take 20-40s). Released when done.
  const acquireWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      // best-effort
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // ignore
      }
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && isGenerating) {
        await acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isGenerating, acquireWakeLock]);

  useEffect(() => {
    if (isGenerating) {
      acquireWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => {
      releaseWakeLock();
    };
  }, [isGenerating, acquireWakeLock, releaseWakeLock]);

  const runGeneration = useCallback(
    async (params: { cefrOverride?: CEFRLevel } = {}) => {
      const ok = await generateReadingText({
        topic,
        description: description.trim() || undefined,
        textTypeId,
        targetWordCount,
        cefrOverride: params.cefrOverride ?? cefrLevel,
      });
      if (ok) onTextLoaded?.();
    },
    [generateReadingText, topic, description, textTypeId, targetWordCount, cefrLevel, onTextLoaded],
  );

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) {
      setTopic("");
      return;
    }
    // Only warn if an AI generation is actively running — loadGeneratedText
    // calls abortAllGenerations(), which would cancel it. Mirrors the
    // TextRepository load guard. Existing content alone is not a reason to
    // block: the user explicitly clicked "Generate", signalling intent to
    // replace the current text.
    const hasActiveGen = Object.values(useReadingStore.getState().activeGenerations).some(Boolean);
    if (hasActiveGen) {
      setConfirmOverwrite(true);
      return;
    }
    await runGeneration();
  }, [topic, runGeneration]);

  const handleCefrChange = (value: string) => {
    overriddenRef.current = true;
    setCefrLevel(value as CEFRLevel);
  };

  const resetCefrToAuto = () => {
    overriddenRef.current = false;
    setCefrLevel(autoCefr);
  };

  const handleRegenerate = (direction: "easier" | "harder") => {
    regenerateReadingText(direction).then((ok) => {
      if (ok) onTextLoaded?.();
    });
  };

  const showQcCard = source === "ai-generated" && !!generatedTextMeta;
  const longTextNote = targetWordCount >= 700;

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-lg border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="ai-topic">{t("reading.aiGenerate.topicLabel")}</Label>
          <Input
            id="ai-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t("reading.aiGenerate.topicPlaceholder")}
            disabled={isGenerating}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-description">{t("reading.aiGenerate.descriptionLabel")}</Label>
          <Textarea
            id="ai-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("reading.aiGenerate.descriptionPlaceholder")}
            rows={2}
            disabled={isGenerating}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>{t("reading.aiGenerate.textTypeLabel")}</Label>
            <Select
              value={textTypeId}
              onValueChange={(v) => setTextTypeId(v as ReadingTextType)}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {READING_TEXT_TYPES.map((tt) => (
                  <SelectItem key={tt.id} value={tt.id}>
                    {t(tt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("reading.aiGenerate.lengthLabel")}</Label>
            <Select
              value={String(targetWordCount)}
              onValueChange={(v) => setTargetWordCount(Number(v))}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {READING_TEXT_LENGTHS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {t("reading.aiGenerate.approxWords", { count: n })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {longTextNote && (
              <p className="text-xs text-muted-foreground">{t("reading.aiGenerate.longTextNote")}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("reading.aiGenerate.cefrLabel")}</Label>
              {overriddenRef.current && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={resetCefrToAuto}
                  disabled={isGenerating}
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  {t("reading.aiGenerate.reset")}
                </Button>
              )}
            </div>
            <Select
              value={cefrLevel}
              onValueChange={handleCefrChange}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CEFR_ORDER.map((lvl) => (
                  <SelectItem key={lvl} value={lvl}>
                    {lvl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("reading.aiGenerate.cefrAutoHint", { age: studentAge })}
            </p>
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handleGenerate}
          disabled={isGenerating || !topic.trim()}
        >
          {isGenerating ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              {t("reading.aiGenerate.generating")}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              {t("reading.aiGenerate.generateButton")}
            </>
          )}
        </Button>
      </div>

      {showQcCard && generatedTextMeta && (
        <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">{t("reading.aiGenerate.qcTitle")}</h4>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {t("reading.aiGenerate.wordCount")}: {generatedTextMeta.actualWordCount ?? "—"}
            </Badge>
            <Badge variant="secondary">
              {t("reading.aiGenerate.estimatedFkGrade")}:{" "}
              {generatedTextMeta.estimatedFkGrade?.toFixed(1) ?? "—"}
            </Badge>
            <Badge className={CEFR_BADGE_COLORS[generatedTextMeta.cefrLevel] ?? ""}>
              CEFR {generatedTextMeta.cefrLevel}
            </Badge>
            <Badge variant="outline">{generatedTextMeta.textTypeLabel}</Badge>
          </div>

          {generatedTextMeta.newVocabulary && generatedTextMeta.newVocabulary.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                {t("reading.aiGenerate.newVocabulary")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {generatedTextMeta.newVocabulary.map((word, i) => (
                  <Badge key={`${word}-${i}`} variant="outline" className="font-normal">
                    {word}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRegenerate("easier")}
              disabled={isGenerating || generatedTextMeta.cefrLevel === "A1"}
            >
              <ArrowDown className="mr-1.5 h-3.5 w-3.5" />
              {t("reading.aiGenerate.regenerateEasier")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRegenerate("harder")}
              disabled={isGenerating || generatedTextMeta.cefrLevel === "C2"}
            >
              <ArrowUp className="mr-1.5 h-3.5 w-3.5" />
              {t("reading.aiGenerate.regenerateHarder")}
            </Button>
            {isGenerating && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <LoaderCircle className="h-3 w-3 animate-spin" />
                {t("reading.aiGenerate.generating")}
              </span>
            )}
          </div>
        </div>
      )}

      <Dialog open={confirmOverwrite} onOpenChange={setConfirmOverwrite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("history.confirmSwitchTitle")}</DialogTitle>
            <DialogDescription>{t("history.confirmSwitchDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOverwrite(false)}>
              {t("setting.cancel")}
            </Button>
            <Button
              onClick={() => {
                setConfirmOverwrite(false);
                runGeneration();
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

export default AiTextGenerator;
