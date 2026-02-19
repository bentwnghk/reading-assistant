"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { Plus, Volume2, Loader2 } from "lucide-react";
import { useReadingStore } from "@/store/reading";
import { useSettingStore } from "@/store/setting";
import { generateSignature } from "@/utils/signature";
import { completePath } from "@/utils/url";
import { Button } from "@/components/ui/button";

const MagicDown = dynamic(() => import("@/components/MagicDown"));

function ExtractedText() {
  const { t } = useTranslation();
  const { extractedText, highlightedWords, addHighlightedWord, removeHighlightedWord } = useReadingStore();
  const { ttsVoice, mode, openaicompatibleApiKey, accessPassword, openaicompatibleApiProxy } = useSettingStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
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
          y: rect.top - 45,
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

  const handleMouseDown = useCallback((e: MouseEvent | TouchEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".selection-popup")) {
      setSelection(null);
    }
  }, []);

  useEffect(() => {
    isTouchDeviceRef.current = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

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
          value={extractedText}
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
            className="rounded-l-none"
          >
            {isTTSLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{t("reading.extractedText.readAloud")}</span>
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-4">
        {t("reading.extractedText.highlightTip")}
      </p>
    </section>
  );
}

export default ExtractedText;
