"use client";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Mic,
  MicOff,
  Loader2,
  RotateCcw,
  ChevronRight,
  HelpCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useReadingStore } from "@/store/reading";
import { useReadingAloud } from "@/hooks/useReadingAloud";
import { cn } from "@/utils/style";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ReadingAloud() {
  const { t } = useTranslation();
  const { extractedText, pronunciationAttempts } = useReadingStore();

  const {
    isRecording,
    isTranscribing,
    recordingDuration,
    result,
    error,
    startRecording,
    stopRecording,
    clearResult,
    bestScores: _bestScores,
  } = useReadingAloud();

  const [selectedParagraph, setSelectedParagraph] = useState<string>("-1");

  const paragraphs = useMemo(() => {
    if (!extractedText) return [];
    return extractedText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }, [extractedText]);

  const paragraphOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: "-1", label: t("reading.readingAloud.fullText") },
    ];
    paragraphs.forEach((p, i) => {
      const preview = p.length > 40 ? p.substring(0, 40) + "..." : p;
      opts.push({
        value: String(i),
        label: `${t("reading.readingAloud.paragraph", { number: i + 1 })}: ${preview}`,
      });
    });
    return opts;
  }, [paragraphs, t]);

  const selectedParagraphIndex = parseInt(selectedParagraph, 10);
  const displayText =
    selectedParagraphIndex < 0 ? extractedText : paragraphs[selectedParagraphIndex] || "";

  const hasText = !!extractedText;

  const accuracyColor = (acc: number) => {
    if (acc >= 90) return "text-green-600 dark:text-green-400";
    if (acc >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const wordStatusStyle: Record<string, string> = {
    correct: "text-green-700 dark:text-green-400",
    missed: "text-red-600 dark:text-red-400 line-through opacity-70",
    extra: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-0.5 rounded",
  };

  return (
    <section id="section-reading-aloud">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mic className="h-5 w-5 text-muted-foreground" />
              {t("reading.readingAloud.title")}
            </CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[380px]" align="start">
                <div className="space-y-3 text-sm">
                  <h4 className="font-semibold text-base">
                    {t("reading.readingAloud.help.title")}
                  </h4>
                  <p className="text-muted-foreground">
                    {t("reading.readingAloud.help.purpose")}
                  </p>
                  <div className="space-y-2">
                    <h5 className="font-medium">
                      {t("reading.readingAloud.help.howToUse.title")}
                    </h5>
                    <p className="text-muted-foreground">
                      {t("reading.readingAloud.help.howToUse.desc")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h5 className="font-medium">
                      {t("reading.readingAloud.help.tips.title")}
                    </h5>
                    <ul className="text-muted-foreground list-disc list-inside space-y-1">
                      <li>{t("reading.readingAloud.help.tips.tip1")}</li>
                      <li>{t("reading.readingAloud.help.tips.tip2")}</li>
                      <li>{t("reading.readingAloud.help.tips.tip3")}</li>
                    </ul>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasText ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("reading.readingAloud.noText")}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Select
                  value={selectedParagraph}
                  onValueChange={(v) => {
                    setSelectedParagraph(v);
                    clearResult();
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paragraphOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border p-3 min-h-[80px] max-h-[200px] overflow-y-auto bg-muted/30 text-sm leading-relaxed">
                {displayText}
              </div>

              <div className="flex flex-col items-center gap-3">
                {!isRecording && !isTranscribing && (
                  <Button
                    onClick={() => startRecording(selectedParagraphIndex)}
                    disabled={isRecording || isTranscribing || !displayText}
                    size="lg"
                    className="gap-2"
                  >
                    <Mic className="h-5 w-5" />
                    {t("reading.readingAloud.startRecording")}
                  </Button>
                )}

                {isRecording && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-red-500">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                      </span>
                      <span className="text-sm font-medium">
                        {t("reading.readingAloud.recording")}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDuration(recordingDuration)}
                      </span>
                    </div>
                    <Button
                      onClick={stopRecording}
                      variant="destructive"
                      size="lg"
                      className="gap-2"
                    >
                      <MicOff className="h-5 w-5" />
                      {t("reading.readingAloud.stopRecording")}
                    </Button>
                  </div>
                )}

                {isTranscribing && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">
                      {t("reading.readingAloud.transcribing")}
                    </span>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{t(error)}</span>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {t("reading.readingAloud.accuracy")}:
                      </span>
                      <span className={cn("text-2xl font-bold", accuracyColor(result.accuracy))}>
                        {result.accuracy}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearResult}
                        className="gap-1"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {t("reading.readingAloud.tryAgain")}
                      </Button>
                      {selectedParagraphIndex >= 0 &&
                        selectedParagraphIndex < paragraphs.length - 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedParagraph(String(selectedParagraphIndex + 1));
                              clearResult();
                            }}
                            className="gap-1"
                          >
                            {t("reading.readingAloud.nextParagraph")}
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                    </div>
                  </div>

                  <Progress value={result.accuracy} className="h-2" />

                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                      {result.correctCount} {t("reading.readingAloud.correct")}
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5 text-red-600" />
                      {result.missedCount} {t("reading.readingAloud.missed")}
                    </span>
                    {result.extraCount > 0 && (
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        {result.extraCount} {t("reading.readingAloud.extra")}
                      </span>
                    )}
                  </div>

                  <div className="rounded-md border p-3 bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-2">
                      {t("reading.readingAloud.wordComparison")}
                    </p>
                    <p className="text-sm leading-relaxed">
                      {result.words.map((w, i) => {
                        const isExtra = w.status === "extra";
                        const displayText = isExtra
                          ? `[${w.heard || ""}]`
                          : w.original;
                        const space = i > 0 ? " " : "";
                        return (
                          <span key={i} className={wordStatusStyle[w.status]}>
                            {space}{displayText}
                          </span>
                        );
                      })}
                    </p>
                  </div>
                </div>
              )}

              {pronunciationAttempts.length > 0 && !result && (
                <div className="text-xs text-muted-foreground text-center">
                  {t("reading.readingAloud.totalAttempts", {
                    count: pronunciationAttempts.length,
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
