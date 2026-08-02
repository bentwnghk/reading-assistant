"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Sparkles,
  LoaderCircle,
  Volume2,
  Target,
  Lightbulb,
  BookOpen,
  Star,
  Eye,
  ChevronDown,
  Heading,
  Pilcrow,
  ListTree,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GuideDialog from "@/components/Internal/GuideDialog";
import { useReadingStore } from "@/store/reading";
import { useSettingStore } from "@/store/setting";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { speakWord, stopSpeaking, unlockAudio } from "@/utils/tts";
import { extractSkimExcerpts } from "@/utils/text";
import { cn } from "@/utils/style";

const EXCERPT_MAX_CHARS = 300;

function trimExcerpt(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= EXCERPT_MAX_CHARS) return clean;
  return `${clean.slice(0, EXCERPT_MAX_CHARS).trimEnd()}…`;
}

interface SkimHelperProps {
  text: string;
  title?: string;
}

function SkimHelper({ text, title }: SkimHelperProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const excerpts = useMemo(() => extractSkimExcerpts(text), [text]);

  const subheadings = useMemo(
    () =>
      title
        ? excerpts.subheadings.filter((h) => h.trim() !== title.trim())
        : excerpts.subheadings,
    [excerpts.subheadings, title],
  );

  // Drop topic sentences already shown verbatim inside the first/last paragraph
  // excerpts to avoid repeating the same sentence twice in the panel.
  const topicSentences = useMemo(() => {
    let list = excerpts.topicSentences;
    if (excerpts.firstParagraph && list.length > 0) {
      list = list.slice(1);
    }
    if (excerpts.lastParagraph && list.length > 0) {
      list = list.slice(0, -1);
    }
    return list;
  }, [excerpts.topicSentences, excerpts.firstParagraph, excerpts.lastParagraph]);

  const hasAny =
    !!title ||
    !!excerpts.firstParagraph ||
    subheadings.length > 0 ||
    topicSentences.length > 0 ||
    !!excerpts.lastParagraph;
  if (!hasAny) return null;

  const items: { icon: typeof Eye; label: string; node: React.ReactNode }[] = [];
  if (title) {
    items.push({
      icon: Heading,
      label: t("reading.preReading.skim.title"),
      node: <p className="font-medium">{title}</p>,
    });
  }
  if (excerpts.firstParagraph) {
    items.push({
      icon: Pilcrow,
      label: t("reading.preReading.skim.firstParagraph"),
      node: <p className="text-muted-foreground">{trimExcerpt(excerpts.firstParagraph)}</p>,
    });
  }
  if (subheadings.length > 0) {
    items.push({
      icon: ListTree,
      label: t("reading.preReading.skim.headings"),
      node: (
        <ul className="list-disc pl-5 text-muted-foreground">
          {subheadings.slice(0, 10).map((h, i) => (
            <li key={`${h}-${i}`}>{h}</li>
          ))}
        </ul>
      ),
    });
  }
  if (topicSentences.length > 0) {
    items.push({
      icon: ListTree,
      label: t("reading.preReading.skim.topicSentences"),
      node: (
        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
          {topicSentences.map((s, i) => (
            <li key={`${s}-${i}`}>{s}</li>
          ))}
        </ul>
      ),
    });
  }
  if (excerpts.lastParagraph) {
    items.push({
      icon: FileText,
      label: t("reading.preReading.skim.lastParagraph"),
      node: <p className="text-muted-foreground">{trimExcerpt(excerpts.lastParagraph)}</p>,
    });
  }

  return (
    <div className="mb-3 rounded-md border border-amber-500/30 bg-background/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        aria-expanded={open}
      >
        <Eye className="h-4 w-4 text-amber-500 shrink-0" />
        <span className="text-xs font-medium">{t("reading.preReading.skimLabel")}</span>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {t("reading.preReading.skimHint")}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 ml-auto transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="space-y-3 px-3 pb-3 text-sm">
          <p className="text-xs text-muted-foreground">{t("reading.preReading.skimGuide")}</p>
          {items.map(({ icon: Icon, label, node }, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </span>
              </div>
              {node}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PreReading() {
  const { t } = useTranslation();
  const {
    extractedText,
    docTitle,
    preReading,
    studentPrediction,
    predictionRating,
    summary,
    setStudentPrediction,
    setPredictionRating,
  } = useReadingStore();
  const { activeGenerations, generatePreReading } = useReadingAssistant();
  const isGenerating = !!activeGenerations["pre-reading"];

  const {
    mode,
    accessPassword,
    ttsVoice,
    ttsPlaybackRate,
    openaicompatibleApiKey,
    openaicompatibleApiProxy,
  } = useSettingStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Local state for the prediction textarea; synced to the store on blur to
  // avoid firing a persistence write on every keystroke.
  const [predictionDraft, setPredictionDraft] = useState(studentPrediction || "");

  useEffect(() => {
    setPredictionDraft(studentPrediction || "");
  }, [studentPrediction]);

  const handleSpeak = useCallback(
    async (word: string) => {
      if (!word) return;
      // The click is a user gesture — unlock the AudioContext (idempotent) so
      // programmatic playback is permitted afterwards. See tts.ts Lesson 27.
      await unlockAudio();
      await speakWord({
        word,
        voice: ttsVoice,
        speed: ttsPlaybackRate,
        mode,
        openaicompatibleApiKey,
        openaicompatibleApiProxy,
        accessPassword,
        audioRef,
        onError: (msg) => toast.error(msg),
      });
    },
    [ttsVoice, ttsPlaybackRate, mode, openaicompatibleApiKey, openaicompatibleApiProxy, accessPassword],
  );

  useEffect(() => () => stopSpeaking(), []);

  if (!extractedText) {
    return null;
  }

  const showCompare = !!summary && !!(studentPrediction || "").trim();

  const ratingLabels = [
    { value: 1, key: "reading.preReading.rating.notClose", icon: "😕" },
    { value: 2, key: "reading.preReading.rating.somewhat", icon: "🙂" },
    { value: 3, key: "reading.preReading.rating.veryClose", icon: "🎯" },
  ];

  return (
    <section className="p-4 border rounded-md mt-4">
      <div className="flex flex-wrap md:flex-nowrap items-center justify-between border-b pb-4 mb-4 gap-2">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          {t("reading.preReading.title")}
          <GuideDialog
            titleKey="reading.preReading.help.title"
            introKey="reading.preReading.help.intro"
            itemsBaseKey="reading.preReading.help.items"
            items={[
              { key: "activate", icon: Lightbulb, bgClass: "bg-amber-500/10", iconClass: "text-amber-500" },
              { key: "predict", icon: Sparkles, bgClass: "bg-primary/10", iconClass: "text-primary" },
              { key: "preteach", icon: BookOpen, bgClass: "bg-blue-500/10", iconClass: "text-blue-500" },
            ]}
            stepsTitleKey="reading.preReading.help.stepsTitle"
            stepsKeys={[
              "reading.preReading.help.steps.s1",
              "reading.preReading.help.steps.s2",
              "reading.preReading.help.steps.s3",
            ]}
            tipTitleKey="reading.preReading.help.tipTitle"
            tipContentKey="reading.preReading.help.tipContent"
          />
        </h3>
        <div className="flex items-center gap-2 ml-auto">
          <Button
            onClick={() => generatePreReading()}
            disabled={isGenerating}
            size="sm"
            variant={preReading ? "secondary" : "default"}
          >
            {isGenerating ? (
              <>
                <LoaderCircle className="h-4 w-4 mr-1 animate-spin" />
                {t("reading.preReading.generating")}
              </>
            ) : preReading ? (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                {t("reading.preReading.regenerate")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                {t("reading.preReading.generate")}
              </>
            )}
          </Button>
        </div>
      </div>

      {!preReading ? (
        <div className="text-center py-8 text-muted-foreground">
          <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("reading.preReading.emptyTip")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Activation prompts */}
          {preReading.activationPrompts.length > 0 && (
            <div className="rounded-md border p-3">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <h4 className="font-medium text-sm">{t("reading.preReading.activationLabel")}</h4>
              </div>
              <ul className="space-y-2">
                {preReading.activationPrompts.map((prompt, i) => (
                  <li key={i} className="text-sm">
                    <p>{prompt}</p>
                    {preReading.activationPromptZh?.[i] && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {preReading.activationPromptZh[i]}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Background note */}
          {!!preReading.backgroundNote && (
            <div className="rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium text-sm">{t("reading.preReading.backgroundLabel")}</h4>
              </div>
              <p className="text-sm text-muted-foreground">{preReading.backgroundNote}</p>
            </div>
          )}

          {/* Purpose */}
          <div className="rounded-md border p-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-primary" />
              <h4 className="font-medium text-sm">{t("reading.preReading.purposeLabel")}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{preReading.purpose}</p>
          </div>

          {/* Pre-teach words */}
          {preReading.preTeachWords.length > 0 && (
            <div className="rounded-md border p-3">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4 text-blue-500" />
                <h4 className="font-medium text-sm">{t("reading.preReading.preTeachLabel")}</h4>
              </div>
              <ul className="space-y-2">
                {preReading.preTeachWords.map((w) => (
                  <li key={w.word} className="text-sm flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => handleSpeak(w.word)}
                      className="shrink-0 mt-0.5 rounded-md p-1 hover:bg-accent"
                      aria-label={t("reading.preReading.listen", { word: w.word })}
                    >
                      <Volume2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <div>
                      <span className="font-medium">{w.word}</span>
                      {w.syllabification && (
                        <span className="text-xs text-muted-foreground ml-2">{w.syllabification}</span>
                      )}
                      {w.partOfSpeech && (
                        <span className="text-xs italic text-muted-foreground ml-1">({w.partOfSpeech})</span>
                      )}
                      <p className="text-muted-foreground">{w.englishDefinition}</p>
                      <p className="text-xs text-muted-foreground">{w.chineseDefinition}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Prediction prompt + capture (placed right before the comparison card) */}
          <div className="rounded-md border p-3 bg-amber-500/5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h4 className="font-medium text-sm">{preReading.predictionPrompt}</h4>
            </div>

            {/* Skim the text first — prediction is a skimming skill, not a title-only guess */}
            <SkimHelper text={extractedText} title={docTitle || undefined} />

            <textarea
              className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={t("reading.preReading.predictionPlaceholder")}
              value={predictionDraft}
              onChange={(e) => setPredictionDraft(e.target.value)}
              onBlur={() => {
                if (predictionDraft !== (studentPrediction || "")) {
                  setStudentPrediction(predictionDraft);
                }
              }}
            />
          </div>

          {/* Prediction comparison (only after the summary is generated) */}
          {showCompare && (
            <div className="rounded-md border p-3 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <h4 className="font-medium text-sm">{t("reading.preReading.compareLabel")}</h4>
              </div>
              <p className="text-sm mb-1 font-medium">{t("reading.preReading.yourPrediction")}</p>
              <p className="text-sm text-muted-foreground mb-3 italic">&ldquo;{studentPrediction}&rdquo;</p>
              <p className="text-sm mb-2">{t("reading.preReading.compareQuestion")}</p>
              <div className="flex gap-2">
                {ratingLabels.map(({ value, key, icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPredictionRating(value)}
                    className={cn(
                      "flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition-colors",
                      predictionRating === value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent",
                    )}
                  >
                    <span>{icon}</span>
                    {t(key)}
                    {predictionRating === value && <Star className="h-3 w-3 fill-current" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default PreReading;
