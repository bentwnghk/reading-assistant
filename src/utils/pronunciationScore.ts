type PronunciationWordStatus = "correct" | "mispronounced" | "missed" | "extra";

interface PronunciationWord {
  original: string;
  heard?: string;
  status: PronunciationWordStatus;
}

interface PronunciationResult {
  words: PronunciationWord[];
  accuracy: number;
  correctCount: number;
  mispronouncedCount: number;
  missedCount: number;
  extraCount: number;
  totalWords: number;
  transcript: string;
  paragraphIndex: number;
  timestamp: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function buildLcsTable(
  a: string[],
  b: string[]
): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp;
}

function backtrackLcs(
  a: string[],
  b: string[],
  dp: number[][]
): [number, number][] {
  const matches: [number, number][] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      matches.unshift([i - 1, j - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return matches;
}

export function compareText(
  original: string,
  transcript: string,
  paragraphIndex: number
): PronunciationResult {
  const origTokens = tokenize(original);
  const heardTokens = tokenize(transcript);

  if (origTokens.length === 0) {
    return {
      words: [],
      accuracy: 0,
      correctCount: 0,
      mispronouncedCount: 0,
      missedCount: 0,
      extraCount: 0,
      totalWords: 0,
      transcript,
      paragraphIndex,
      timestamp: Date.now(),
    };
  }

  const dp = buildLcsTable(origTokens, heardTokens);
  const matches = backtrackLcs(origTokens, heardTokens, dp);

  const matchedOrig = new Set(matches.map(([o]) => o));
  const matchedHeard = new Set(matches.map(([, h]) => h));

  const words: PronunciationWord[] = [];
  let correctCount = 0;

  for (let i = 0; i < origTokens.length; i++) {
    if (matchedOrig.has(i)) {
      words.push({ original: origTokens[i], status: "correct" });
      correctCount++;
    } else {
      words.push({ original: origTokens[i], status: "missed" });
    }
  }

  for (let j = 0; j < heardTokens.length; j++) {
    if (!matchedHeard.has(j)) {
      words.push({ original: "", heard: heardTokens[j], status: "extra" });
    }
  }

  const mispronouncedCount = words.filter(
    (w) => w.status === "mispronounced"
  ).length;
  const missedCount = words.filter((w) => w.status === "missed").length;
  const extraCount = words.filter((w) => w.status === "extra").length;

  const accuracy =
    origTokens.length > 0
      ? Math.round((correctCount / origTokens.length) * 100)
      : 0;

  return {
    words,
    accuracy,
    correctCount,
    mispronouncedCount,
    missedCount,
    extraCount,
    totalWords: origTokens.length,
    transcript,
    paragraphIndex,
    timestamp: Date.now(),
  };
}

export type { PronunciationWord, PronunciationResult, PronunciationWordStatus };
