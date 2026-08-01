"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Sparkles,
  ImageIcon,
  LoaderCircle,
  Volume2,
  ZoomIn,
  X,
  Target,
  Lightbulb,
  BookOpen,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GuideDialog from "@/components/Internal/GuideDialog";
import { useReadingStore } from "@/store/reading";
import { useSettingStore } from "@/store/setting";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { speakWord, stopSpeaking, unlockAudio } from "@/utils/tts";
import { cn } from "@/utils/style";

function PreReading() {
  const { t } = useTranslation();
  const {
    extractedText,
    docTitle,
    preReading,
    preReadingImage,
    studentPrediction,
    predictionRating,
    summary,
    setStudentPrediction,
    setPredictionRating,
  } = useReadingStore();
  const { activeGenerations, generatePreReading, generatePreReadingImage } = useReadingAssistant();
  const isGenerating = !!activeGenerations["pre-reading"];
  const isGeneratingImage = !!activeGenerations["pre-reading-image"];

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
  const [zoomed, setZoomed] = useState(false);

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
            disabled={isGenerating || isGeneratingImage}
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
          {/* Prediction illustration (optional, on-demand) */}
          <div>
            {preReadingImage ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setZoomed(true)}
                  className="relative group cursor-pointer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preReadingImage}
                    alt={t("reading.preReading.imageAlt")}
                    className="max-w-full h-auto rounded-md border shadow-sm"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-md flex items-center justify-center">
                    <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4 border border-dashed rounded-md">
                <ImageIcon className="h-8 w-8 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground text-center px-4">
                  {t("reading.preReading.imageTip")}
                </p>
                <Button
                  onClick={() => generatePreReadingImage()}
                  disabled={isGeneratingImage}
                  size="sm"
                  variant="outline"
                >
                  {isGeneratingImage ? (
                    <>
                      <LoaderCircle className="h-4 w-4 mr-1 animate-spin" />
                      {t("reading.preReading.imageGenerating")}
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-4 w-4 mr-1" />
                      {t("reading.preReading.generateImage")}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Prediction prompt + capture */}
          <div className="rounded-md border p-3 bg-amber-500/5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h4 className="font-medium text-sm">{preReading.predictionPrompt}</h4>
            </div>
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
            {docTitle && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("reading.preReading.titleHint", { title: docTitle })}
              </p>
            )}
          </div>

          {/* Purpose */}
          <div className="rounded-md border p-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-primary" />
              <h4 className="font-medium text-sm">{t("reading.preReading.purposeLabel")}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{preReading.purpose}</p>
          </div>

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

      {zoomed && preReadingImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setZoomed(false)}
          >
            <X className="h-8 w-8" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preReadingImage}
            alt={t("reading.preReading.imageAlt")}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}

export default PreReading;
