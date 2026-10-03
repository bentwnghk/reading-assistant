import { useEffect, useRef } from "react";
import { useReadingStore, isStreamingActive, isPendingFullHydration } from "@/store/reading";
import { useHistoryStore } from "@/store/history";

function useAutoSave() {
  const {
    id,
    docTitle,
    extractedText,
    summary,
    adaptedText,
    simplifiedText,
    mindMap,
    readingTest,
    glossary,
    highlightedWords,
    analyzedSentences,
    testScore,
    testCompleted,
    testEarnedPoints,
    testTotalPoints
  } = useReadingStore();
  const prevIdRef = useRef<string>(id);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    const { backup } = useReadingStore.getState();
    const { save, update, history } = useHistoryStore.getState();

    if (!extractedText) {
      return;
    }

    // Skip history saves while a stream is active — extractedText changes on
    // every token, which would trigger a localforage (IndexedDB) write storm
    // and crash iOS Safari. The final save runs when the flag is cleared.
    if (isStreamingActive()) {
      return;
    }

    // Skip while a lightweight-restored session is still waiting for its full
    // server data — a backup() taken now would persist gutted quiz/test arrays
    // and mark the history entry hydrated with incomplete data. The merge in
    // AuthProvider changes these deps, so this effect re-runs when it clears.
    if (isPendingFullHydration()) {
      return;
    }

    const sessionData = backup();
    const existingInHistory = history.some((item) => item.id === id);

    if (!hasInitializedRef.current) {
      if (!existingInHistory) {
        save(sessionData);
      }
      hasInitializedRef.current = true;
    } else if (id && prevIdRef.current === id && existingInHistory) {
      update(id, sessionData);
    }

    prevIdRef.current = id;
  }, [id, docTitle, extractedText, summary, adaptedText, simplifiedText, mindMap, readingTest, glossary, highlightedWords, analyzedSentences, testScore, testCompleted, testEarnedPoints, testTotalPoints]);
}

export default useAutoSave;
