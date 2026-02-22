"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { Plus, Volume2, Loader2, Brain } from "lucide-react";
import { generateText } from "ai";
import { useReadingStore } from "@/store/reading";
import { useSettingStore } from "@/store/setting";
import { generateSignature } from "@/utils/signature";
import { completePath } from "@/utils/url";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent } from "@/components/ui/popover";
import useModelProvider from "@/hooks/useAiProvider";
import { analyzeSentencePrompt } from "@/constants/readingPrompts";

const MagicDown = dynamic(() => import("@/components/MagicDown"));

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getContextAround(text: string, target: string, charRange: number): string {
  const index = text.indexOf(target);
  if (index === -1) return target;
  
  const start = Math.max(0, index - charRange);
  const end = Math.min(text.length, index + target.length + charRange);
  
  let context = text.slice(start, end);
  if (start > 0) context = "..." + context;
  if (end < text.length) context = context + "...";
  
  return context;
}

function highlightTextAndSentences(
  text: string, 
  words: string[], 
  analyzedSentences: Record<string, SentenceAnalysis>
): string {
  const analyzedKeys = Object.keys(analyzedSentences);
  let result = text;

  if (analyzedKeys.length > 0) {
    const sortedSentences = analyzedKeys
      .map(key => analyzedSentences[key].sentence)
      .filter(s => s.length > 10)
      .sort((a, b) => b.length - a.length);
    
    for (const sentence of sortedSentences) {
      const escaped = escapeRegExp(sentence);
      const pattern = new RegExp(`(${escaped})`, "g");
      result = result.replace(
        pattern,
        `<span class="analyzed-sentence border-b-2 border-blue-500 dark:border-blue-400 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950" data-sentence="${sentence.replace(/"/g, '&quot;')}">$1</span>`
      );
    }
  }

  if (words.length > 0) {
    const sortedWords = [...words].sort((a, b) => b.length - a.length);
    const escapedWords = sortedWords.map(escapeRegExp);
    const pattern = new RegExp(`(${escapedWords.join("|")})`, "gi");

    const parts: string[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(result)) !== null) {
      if (match.index > lastIndex) {
        parts.push(result.slice(lastIndex, match.index));
      }
      parts.push(`<mark class="bg-yellow-200 dark:bg-yellow-400 px-0.5 rounded">${match[0]}</mark>`);
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < result.length) {
      parts.push(result.slice(lastIndex));
    }

    result = parts.join("");
  }

  return result;
}

function ExtractedText() {
  const { t } = useTranslation();
  const { 
    extractedText, 
    highlightedWords, 
    analyzedSentences,
    studentAge,
    addHighlightedWord, 
    removeHighlightedWord,
    setSentenceAnalysis,
    getSentenceAnalysis
  } = useReadingStore();
  const { ttsVoice, mode, openaicompatibleApiKey, accessPassword, openaicompatibleApiProxy, model } = useSettingStore();
  const { createModelProvider } = useModelProvider();
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [activePopover, setActivePopover] = useState<{ sentence: string; x: number; y: number } | null>(null);
  const isTouchDeviceRef = useRef(false);

  const handleSelectionChange = useCallback(() => {
    const selectionObj = window.getSelection();
    const selectedText = selectionObj?.toString().trim();

    if (!selectedText || selectedText.length === 0 || selectedText.length > 4096) {
      setSelection(null);
      return;
    }

    if (selectionObj && selectionObj.rangeCount > 0) {
      const range = selectionObj.getRangeAt(0);
      const container = containerRef.current;

      if (container && container.contains(range.commonAncestorContainer)) {
        const rect = range.getBoundingClientRect();
        setSelection({
          text: selectedText,
          x: rect.left + rect.width / 2,
          y: rect.bottom + 8,
        });
      } else {
        setSelection(null);
      }
    }
  }, []);

  const handleAddWord = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    const selectionObj = window.getSelection();
    const selectedText = selectionObj?.toString().trim() || selection?.text;
    
    if (selectedText) {
      addHighlightedWord(selectedText);
      setSelection(null);
      selectionObj?.removeAllRanges();
    }
  }, [selection, addHighlightedWord]);

  const handleReadAloud = useCallback(async (e?: React.MouseEvent | React.TouchEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    const selectionObj = window.getSelection();
    const selectedText = selectionObj?.toString().trim() || selection?.text;

    if (!selectedText) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsTTSLoading(true);

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      let url: string;
      if (mode === "local") {
        url = `${completePath(openaicompatibleApiProxy, "/v1")}/audio/speech`;
        if (openaicompatibleApiKey) {
          headers["Authorization"] = `Bearer ${openaicompatibleApiKey}`;
        }
      } else {
        url = "/api/ai/openaicompatible/v1/audio/speech";
        if (accessPassword) {
          headers["Authorization"] = `Bearer ${generateSignature(accessPassword, Date.now())}`;
        }
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "tts-1",
          input: selectedText,
          voice: ttsVoice,
          response_format: "mp3",
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`TTS request failed (${response.status}): ${errText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);

      await new Promise<void>((resolve, reject) => {
        const audio = new Audio();
        audioRef.current = audio;

        audio.oncanplay = () => {
          audio.play().then(resolve).catch(reject);
        };

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        audio.onerror = (e) => {
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          reject(new Error(`Audio element error: ${JSON.stringify(e)}`));
        };

        audio.src = audioUrl;
        audio.load();
      });

      setSelection(null);
      selectionObj?.removeAllRanges();
    } catch (error) {
      console.error("TTS error:", error);
    } finally {
      setIsTTSLoading(false);
    }
  }, [selection, ttsVoice, mode, openaicompatibleApiKey, accessPassword, openaicompatibleApiProxy]);

  const handleAnalyzeSentence = useCallback(async (e?: React.MouseEvent | React.TouchEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    const selectionObj = window.getSelection();
    const sentence = selectionObj?.toString().trim() || selection?.text;

    if (!sentence || sentence.length < 5) return;

    const cached = getSentenceAnalysis(sentence);
    if (cached) {
      const rect = selectionObj?.getRangeAt(0)?.getBoundingClientRect();
      setActivePopover({
        sentence,
        x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
        y: rect ? rect.bottom + 8 : 100,
      });
      setSelection(null);
      selectionObj?.removeAllRanges();
      return;
    }

    setIsAnalysisLoading(true);

    try {
      const context = getContextAround(extractedText, sentence, 150);
      const provider = await createModelProvider(model);
      
      const result = await generateText({
        model: provider,
        prompt: analyzeSentencePrompt(studentAge, sentence, context),
      });

      setSentenceAnalysis(sentence, result.text);
      
      const rect = selectionObj?.getRangeAt(0)?.getBoundingClientRect();
      setActivePopover({
        sentence,
        x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
        y: rect ? rect.bottom + 8 : 100,
      });
      setSelection(null);
      selectionObj?.removeAllRanges();
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsAnalysisLoading(false);
    }
  }, [selection, extractedText, studentAge, model, createModelProvider, setSentenceAnalysis, getSentenceAnalysis]);

  const handleMouseDown = useCallback((e: MouseEvent | TouchEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".selection-popup") && !target.closest("[data-radix-popper-content-wrapper]")) {
      setSelection(null);
    }
    if (!target.closest(".analyzed-sentence") && !target.closest("[data-radix-popper-content-wrapper]")) {
      setActivePopover(null);
    }
  }, []);

  const handleAnalyzedSentenceClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const analyzedSpan = target.closest(".analyzed-sentence") as HTMLElement | null;
    
    if (analyzedSpan) {
      e.stopPropagation();
      const sentence = analyzedSpan.getAttribute("data-sentence");
      if (sentence) {
        const rect = analyzedSpan.getBoundingClientRect();
        setActivePopover({
          sentence,
          x: rect.left + rect.width / 2,
          y: rect.bottom + 8,
        });
      }
    }
  }, []);

  useEffect(() => {
    isTouchDeviceRef.current = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

  const highlightedText = useMemo(() => {
    return highlightTextAndSentences(extractedText, highlightedWords, analyzedSentences);
  }, [extractedText, highlightedWords, analyzedSentences]);

  useEffect(() => {
    document.addEventListener("mouseup", handleSelectionChange);
    document.addEventListener("touchend", handleSelectionChange);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("touchstart", handleMouseDown, { passive: true });

    return () => {
      document.removeEventListener("mouseup", handleSelectionChange);
      document.removeEventListener("touchend", handleSelectionChange);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("touchstart", handleMouseDown);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [handleSelectionChange, handleMouseDown]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("click", handleAnalyzedSentenceClick);
      return () => {
        container.removeEventListener("click", handleAnalyzedSentenceClick);
      };
    }
  }, [handleAnalyzedSentenceClick]);

  const activeAnalysis = activePopover ? getSentenceAnalysis(activePopover.sentence) : null;

  if (!extractedText) {
    return null;
  }

  return (
    <section className="p-4 border rounded-md mt-4">
      <h3 className="font-semibold text-lg border-b mb-4 leading-10">
        {t("reading.extractedText.title")}
      </h3>

      {highlightedWords.length > 0 && (
        <div className="mb-4 p-3 bg-muted/50 rounded-md">
          <p className="text-sm font-medium mb-2">
            {t("reading.extractedText.highlightedWords")} ({highlightedWords.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {highlightedWords.map((word) => (
              <span
                key={word}
                className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-sm cursor-pointer hover:opacity-75"
                onClick={() => removeHighlightedWord(word)}
                title={t("reading.extractedText.clickToRemove")}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="prose prose-slate dark:prose-invert max-w-full" ref={containerRef}>
        <MagicDown
          value={highlightedText}
          onChange={() => {}}
          hideTools
          disableMath
        />
      </div>

      {selection && (
        <div
          className="selection-popup fixed z-[9999] shadow-md flex gap-0.5 bg-background border rounded-md p-0.5"
          style={{ left: selection.x, top: selection.y, transform: "translateX(-50%)" }}
        >
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAddWord}
            onTouchEnd={handleAddWord}
            className="rounded-r-none border-r"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("reading.extractedText.addWord")}</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReadAloud}
            onTouchEnd={handleReadAloud}
            disabled={isTTSLoading}
            className="border-r"
          >
            {isTTSLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{t("reading.extractedText.readAloud")}</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAnalyzeSentence}
            onTouchEnd={handleAnalyzeSentence}
            disabled={isAnalysisLoading}
            className="rounded-l-none"
          >
            {isAnalysisLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{t("reading.extractedText.analyze")}</span>
          </Button>
        </div>
      )}

      <Popover open={!!activePopover} onOpenChange={(open) => !open && setActivePopover(null)}>
        {activePopover && (
          <div
            className="fixed"
            style={{ left: activePopover.x, top: activePopover.y, transform: "translateX(-50%)" }}
          >
            <PopoverContent 
              className="w-[90vw] max-w-lg max-h-[70vh] overflow-y-auto"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="prose prose-sm dark:prose-invert max-w-full">
                {activeAnalysis?.analysis ? (
                  <MagicDown
                    value={activeAnalysis.analysis}
                    onChange={() => {}}
                    hideTools
                    disableMath
                  />
                ) : (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>{t("reading.extractedText.analyzing")}</span>
                  </div>
                )}
              </div>
            </PopoverContent>
          </div>
        )}
      </Popover>

      <p className="text-xs text-muted-foreground mt-4">
        {t("reading.extractedText.highlightTip")}
      </p>
    </section>
  );
}

export default ExtractedText;
