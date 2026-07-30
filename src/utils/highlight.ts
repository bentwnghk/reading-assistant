function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightTextAndSentences(
  text: string,
  words: string[],
  analyzedSentences: Record<string, SentenceAnalysis>,
  glossaryMap?: Map<string, GlossaryEntry>
): { html: string; sentenceList: string[] } {
  let result = text;
  const sentenceList: string[] = [];

  const analyzedKeys = Object.keys(analyzedSentences);
  if (analyzedKeys.length > 0) {
    const sortedSentences = analyzedKeys
      .map((key) => analyzedSentences[key].sentence)
      .filter((s) => s.length > 10)
      .sort((a, b) => b.length - a.length);

    for (const sentence of sortedSentences) {
      const sentenceIndex = sentenceList.length;
      sentenceList.push(sentence);
      const escaped = escapeRegExp(sentence);
      const pattern = new RegExp(`(${escaped})`, "g");
      result = result.replace(
        pattern,
        `<span class="analyzed-sentence border-b-2 border-blue-500 dark:border-blue-400 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950" data-idx="${sentenceIndex}">$1</span>`
      );
    }
  }

  if (words.length > 0) {
    const sortedWords = [...words].sort((a, b) => b.length - a.length);
    const escapedWords = sortedWords.map(escapeRegExp);
    const wordPattern = new RegExp(`(${escapedWords.join("|")})`, "gi");

    result = result.replace(/<[^>]+>|([^<]+)/g, (match, textContent) => {
      if (textContent) {
        return textContent.replace(
          wordPattern,
          (matchedWord: string) => {
            const entry = glossaryMap?.get(matchedWord.toLowerCase());
            if (entry) {
              return `<mark class="bg-yellow-200 dark:bg-yellow-400 px-0.5 rounded cursor-pointer" data-glossary-word="${matchedWord}">${matchedWord}<sup class="glossary-indicator inline-flex items-center justify-center min-w-[14px] h-[14px] text-[8px] leading-none rounded-full bg-amber-500/80 dark:bg-amber-600/80 text-white font-bold cursor-pointer select-none ml-0.5 align-super" aria-hidden="true"></sup></mark>`;
            }
            return `<mark class="bg-yellow-200 dark:bg-yellow-400 px-0.5 rounded">${matchedWord}</mark>`;
          }
        );
      }
      return match;
    });
  }

  return { html: result, sentenceList };
}
