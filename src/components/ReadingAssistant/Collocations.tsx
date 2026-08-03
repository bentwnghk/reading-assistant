"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Combine,
  LoaderCircle,
  Plus,
  Check,
  Languages,
  AlertCircle,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GuideDialog from "@/components/Internal/GuideDialog";
import { useReadingStore } from "@/store/reading";
import { useSettingStore } from "@/store/setting";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { generateSignature } from "@/utils/signature";
import { speakWord, stopSpeaking, unlockAudio } from "@/utils/tts";

function Collocations() {
  const { t } = useTranslation();
  const { extractedText, collocations, id } = useReadingStore();
  const { activeGenerations, generateCollocations } = useReadingAssistant();
  const isGenerating = !!activeGenerations["collocations"];
  const {
    mode,
    accessPassword,
    ttsVoice,
    ttsPlaybackRate,
    openaicompatibleApiKey,
    openaicompatibleApiProxy,
  } = useSettingStore();
  const [addedChunks, setAddedChunks] = useState<Set<string>>(new Set());
  const [addingAll, setAddingAll] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleSpeak = useCallback(
    async (chunk: string) => {
      if (!chunk) return;
      await unlockAudio();
      await speakWord({
        word: chunk,
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

  async function addPhrase(chunkText: string) {
    const chunk = collocations.find((c) => c.chunk === chunkText);
    if (!chunk) return;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (mode === "proxy") {
      headers["x-access-signature"] = generateSignature(accessPassword, Date.now());
    }
    try {
      const res = await fetch("/api/vocabulary/phrase", {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId: id || undefined,
          phrases: [
            {
              chunk: chunk.chunk,
              pattern: chunk.pattern,
              meaning: chunk.meaning,
              meaningZh: chunk.meaningZh,
              example: chunk.example,
            },
          ],
        }),
      });
      if (res.ok) {
        setAddedChunks((prev) => new Set(prev).add(chunkText));
        toast.success(t("reading.collocations.added", { chunk: chunkText }));
      } else {
        toast.error(t("reading.collocations.addError"));
      }
    } catch {
      toast.error(t("reading.collocations.addError"));
    }
  }

  async function addAll() {
    if (collocations.length === 0) return;
    setAddingAll(true);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (mode === "proxy") {
      headers["x-access-signature"] = generateSignature(accessPassword, Date.now());
    }
    try {
      const res = await fetch("/api/vocabulary/phrase", {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId: id || undefined,
          phrases: collocations.map((c) => ({
            chunk: c.chunk,
            pattern: c.pattern,
            meaning: c.meaning,
            meaningZh: c.meaningZh,
            example: c.example,
          })),
        }),
      });
      if (res.ok) {
        setAddedChunks(new Set(collocations.map((c) => c.chunk)));
        toast.success(t("reading.collocations.addAllSuccess"));
      } else {
        toast.error(t("reading.collocations.addError"));
      }
    } catch {
      toast.error(t("reading.collocations.addError"));
    } finally {
      setAddingAll(false);
    }
  }

  return (
    <section className="p-4 border rounded-md mt-4">
      <div className="flex flex-wrap md:flex-nowrap items-center justify-between border-b pb-4 mb-4 gap-2">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Combine className="h-5 w-5 text-muted-foreground" />
          {t("reading.collocations.title")}
          <GuideDialog
            titleKey="reading.collocations.help.title"
            introKey="reading.collocations.help.intro"
            itemsBaseKey="reading.collocations.help.items"
            items={[
              { key: "chunks", icon: Combine, bgClass: "bg-primary/10", iconClass: "text-primary" },
              { key: "contrast", icon: AlertCircle, bgClass: "bg-rose-500/10", iconClass: "text-rose-500" },
              { key: "phrases", icon: Languages, bgClass: "bg-amber-500/10", iconClass: "text-amber-500" },
            ]}
            stepsTitleKey="reading.collocations.help.stepsTitle"
            stepsKeys={[
              "reading.collocations.help.steps.s1",
              "reading.collocations.help.steps.s2",
              "reading.collocations.help.steps.s3",
            ]}
            tipTitleKey="reading.collocations.help.tipTitle"
            tipContentKey="reading.collocations.help.tipContent"
          />
        </h3>
        <div className="flex items-center gap-2 ml-auto">
          {collocations.length > 0 && (
            <Button onClick={addAll} disabled={isGenerating || addingAll} size="sm" variant="ghost">
              {addingAll ? <LoaderCircle className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              {t("reading.collocations.addAll")}
            </Button>
          )}
          <Button
            onClick={() => generateCollocations()}
            disabled={isGenerating}
            size="sm"
            variant={collocations.length > 0 ? "secondary" : "default"}
          >
            {isGenerating ? (
              <>
                <LoaderCircle className="h-4 w-4 mr-1 animate-spin" />
                {t("reading.collocations.generating")}
              </>
            ) : collocations.length > 0 ? (
              <>
                <Combine className="h-4 w-4 mr-1" />
                {t("reading.collocations.regenerate")}
              </>
            ) : (
              <>
                <Combine className="h-4 w-4 mr-1" />
                {t("reading.collocations.generate")}
              </>
            )}
          </Button>
        </div>
      </div>

      {collocations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Combine className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("reading.collocations.emptyTip")}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {collocations.map((chunk) => {
            const added = addedChunks.has(chunk.chunk);
            return (
              <div key={chunk.id} className="rounded-md border p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSpeak(chunk.chunk)}
                      className="shrink-0 mt-0.5 rounded-md p-1 hover:bg-accent"
                      aria-label={t("reading.collocations.listen", { chunk: chunk.chunk })}
                    >
                      <Volume2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <span className="font-medium">{chunk.chunk}</span>
                  </div>
                  <span className="shrink-0 text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">
                    {chunk.pattern}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{chunk.meaning}</p>
                <p className="text-xs text-muted-foreground">{chunk.meaningZh}</p>
                {chunk.contrastNote && (
                  <div className="flex items-start gap-2 rounded-md bg-rose-500/5 border border-rose-500/20 p-2">
                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-xs">{chunk.contrastNote}</p>
                  </div>
                )}
                {chunk.example && (
                  <p className="text-xs italic text-muted-foreground">&ldquo;{chunk.example}&rdquo;</p>
                )}
                <div className="mt-auto pt-1">
                  <Button
                    onClick={() => addPhrase(chunk.chunk)}
                    disabled={added}
                    size="sm"
                    variant={added ? "outline" : "secondary"}
                    className="w-full"
                  >
                    {added ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        {t("reading.collocations.addedButton")}
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        {t("reading.collocations.addToPhrases")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default Collocations;
