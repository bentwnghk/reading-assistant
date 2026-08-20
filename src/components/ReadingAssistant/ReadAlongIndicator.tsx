"use client";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Square, Volume2 } from "lucide-react";
import { useReadingStore } from "@/store/reading";
import { stopReadAlong } from "@/utils/tts";
import { splitSentences } from "@/utils/sentences";

/**
 * Floating "now reading" pill shown while read-along (bimodal TTS) playback is
 * active. Lets the user stop playback from anywhere on the page without
 * scrolling back up to the Original tab's Stop button.
 *
 * Reads `readAlongPlaying`/`readAlongIndex` from the reading store (not props)
 * so it stays correct wherever the user has scrolled. Playback itself stops
 * automatically when AdaptedText unmounts (SPA navigation), which also hides
 * this pill. Positioned bottom-left to avoid the Toc/TutorChat FAB stack on
 * the bottom-right.
 */
function ReadAlongIndicator() {
  const { t } = useTranslation();
  const { extractedText, readAlongPlaying, readAlongIndex, setReadAlong } =
    useReadingStore();

  const totalSentences = useMemo(
    () => (readAlongPlaying && extractedText ? splitSentences(extractedText).length : 0),
    [readAlongPlaying, extractedText]
  );

  if (!readAlongPlaying) return null;

  const handleStop = () => {
    stopReadAlong();
    setReadAlong(null, false);
  };

  return (
    <div
      className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-full border bg-background/95 pl-4 pr-1.5 py-1.5 shadow-lg backdrop-blur print:hidden"
      role="status"
      aria-live="polite"
    >
      <Volume2 className="h-4 w-4 shrink-0 text-primary ra-pulse" />
      <span className="text-xs font-medium text-foreground whitespace-nowrap">
        {readAlongIndex !== null && totalSentences > 0
          ? t("reading.readAlong.nowPlaying", {
              current: readAlongIndex + 1,
              total: totalSentences,
            })
          : t("reading.readAlong.nowPlayingShort")}
      </span>
      <span className="text-[10px] text-muted-foreground hidden md:inline whitespace-nowrap">
        {t("reading.readAlong.escHint")}
      </span>
      <button
        onClick={handleStop}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleStop();
        }}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/90"
        title={t("reading.readAlong.stop")}
        aria-label={t("reading.readAlong.stop")}
      >
        <Square className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default ReadAlongIndicator;
