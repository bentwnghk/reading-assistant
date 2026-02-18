import { useEffect, useRef } from "react";
import { useReadingStore } from "@/store/reading";
import { useHistoryStore } from "@/store/history";

function useAutoSave() {
  const { id, extractedText } = useReadingStore();
  const prevIdRef = useRef<string>(id);
  const prevExtractedTextRef = useRef<string>(extractedText);

  useEffect(() => {
    const { backup } = useReadingStore.getState();
    const { save, update, history } = useHistoryStore.getState();

    if (!extractedText) {
      return;
    }

    const isNewSession = !prevExtractedTextRef.current && extractedText;
    const sessionData = backup();

    if (isNewSession) {
      const existingInHistory = history.some((item) => item.id === id);
      if (!existingInHistory) {
        save(sessionData);
      }
    } else if (id && prevIdRef.current === id) {
      const existingInHistory = history.some((item) => item.id === id);
      if (existingInHistory) {
        update(id, sessionData);
      }
    }

    prevIdRef.current = id;
    prevExtractedTextRef.current = extractedText;
  }, [id, extractedText]);
}

export default useAutoSave;
