"use client";

import { useCallback, useState } from "react";
import { generateText } from "ai";
import useModelProvider from "@/hooks/useAiProvider";
import { useSettingStore } from "@/store/setting";
import {
  contentKey,
  useDailyWordStore,
  type DailyWordContent,
} from "@/store/dailyWord";
import { dailyWordContentSchema } from "@/lib/daily-word-schema";
import { dailyWordPrompt, dailyWordSystemPrompt } from "@/constants/readingPrompts";
import { stripJsonFences } from "@/utils/languageCheck";
import { fetchAppConfig } from "@/utils/app-config";
import { parseError } from "@/utils/error";

const inflight = new Map<string, Promise<DailyWordContent>>();

interface WordInput {
  word: string;
  partOfSpeech: string;
  englishDefinition: string;
  chineseDefinition: string;
  example: string;
}

export function useDailyWordContent() {
  const { createModelProvider } = useModelProvider();
  const [error, setError] = useState<string | null>(null);

  /** Server copy first (so every device shows the same page), else generate + save. */
  const ensure = useCallback(
    async (w: WordInput): Promise<DailyWordContent | null> => {
      const store = useDailyWordStore.getState();
      const existing = await store.loadWordAssets(w.word);
      if (existing) return existing;
      setError(null);

      const key = contentKey(w.word);
      let promise = inflight.get(key);
      if (!promise) {
        promise = (async () => {
          const run = async (model: string) => {
            const provider = await createModelProvider(model);
            const { text } = await generateText({
              model: provider,
              system: dailyWordSystemPrompt(),
              prompt: dailyWordPrompt(
                w.word,
                w.partOfSpeech,
                w.englishDefinition,
                w.chineseDefinition,
                w.example
              ),
            });
            return dailyWordContentSchema.parse(JSON.parse(stripJsonFences(text)));
          };
          const { glossaryModel } = useSettingStore.getState();
          let parsed: DailyWordContent;
          try {
            parsed = await run(glossaryModel);
          } catch (e) {
            const fb = await fetchAppConfig()
              .then((c) => c.fallbackModel)
              .catch(() => undefined);
            if (!fb || fb === glossaryModel) throw e;
            parsed = await run(fb);
          }
          // The server keeps the first page saved (another device may have won).
          const res = await fetch("/api/vocabulary/daily-word/content", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ word: w.word, content: parsed }),
          }).catch(() => null);
          if (res?.ok) {
            const saved = dailyWordContentSchema.safeParse((await res.json()).content);
            if (saved.success) parsed = saved.data;
          }
          useDailyWordStore.getState().setContent(w.word, parsed);
          return parsed;
        })().finally(() => inflight.delete(key));
        inflight.set(key, promise);
      }
      try {
        return await promise;
      } catch (e) {
        setError(parseError(e));
        return null;
      }
    },
    [createModelProvider]
  );

  return { ensure, error };
}
