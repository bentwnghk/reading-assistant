type PronunciationWordStatus = "correct" | "uncertain" | "mispronounced" | "missed" | "extra";

interface PronunciationWord {
  original: string;
  heard?: string;
  status: PronunciationWordStatus;
  confidence?: number;
}

interface PronunciationResult {
  words: PronunciationWord[];
  accuracy: number;
  correctCount: number;
  uncertainCount: number;
  mispronouncedCount: number;
  missedCount: number;
  extraCount: number;
  totalWords: number;
  transcript: string;
  paragraphIndex: number;
  timestamp: number;
}

const CONFIDENCE_THRESHOLD = 0.4;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function buildLcsTable(a: string[], b: string[]): number[][] {
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

function doubleMetaphone(word: string): [string, string] {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return ["", ""];

  const isVowel = (c: string) => "aeiouy".includes(c);
  let primary = "";
  let secondary = "";
  let index = 0;

  const current = () => w[index] || "";
  const next = () => w[index + 1] || "";
  const nextNext = () => w[index + 2] || "";
  const peek = (offset: number) => w[index + offset] || "";
  const atEnd = (offset = 0) => index + offset >= w.length;

  if (w.startsWith("ae")) {
    primary += "e";
    secondary += "e";
    index += 2;
  } else if (w.startsWith("gn") || w.startsWith("kn") || w.startsWith("pn") || w.startsWith("wr")) {
    index += 1;
  } else if (w.startsWith("x")) {
    primary += "s";
    secondary += "s";
    index += 1;
  } else {
    index += 0;
  }

  while (!atEnd()) {
    const c = current();

    if (isVowel(c)) {
      if (index === 0 || !isVowel(peek(-1))) {
        primary += "a";
        secondary += "a";
      }
      index++;
      continue;
    }

    switch (c) {
      case "b":
        if (!(peek(-1) === "m" && atEnd())) {
          primary += "p";
          secondary += "p";
        }
        index++;
        break;
      case "c":
        if (peek(1) === "h") {
          if (index === 0 && isVowel(nextNext())) {
            primary += "k";
            secondary += "k";
          } else {
            primary += "x";
            secondary += "x";
          }
          index += 2;
        } else if (peek(1) === "i" && (peek(2) === "a" || peek(2) === "o")) {
          primary += "s";
          secondary += "s";
          index += 2;
        } else if (peek(1) === "e" || peek(1) === "i" || peek(1) === "y") {
          if (peek(1) === "e" && peek(2) === "i") {
            primary += "s";
            secondary += "s";
            index += 2;
          } else {
            primary += "s";
            secondary += "s";
            index++;
          }
        } else {
          primary += "k";
          secondary += "k";
          index++;
        }
        break;
      case "d":
        if (peek(1) === "g" && (peek(2) === "e" || peek(2) === "i" || peek(2) === "y")) {
          primary += "j";
          secondary += "j";
          index += 2;
        } else {
          primary += "t";
          secondary += "t";
          index++;
        }
        break;
      case "f":
        primary += "f";
        secondary += "f";
        index++;
        break;
      case "g":
        if (peek(1) === "h") {
          if (index > 0 && !isVowel(peek(-1))) {
            index += 2;
          } else {
            primary += "k";
            secondary += "k";
            index += 2;
          }
        } else if (peek(1) === "n") {
          if (index === 1 && isVowel(peek(2)) && !isVowel(nextNext())) {
            primary += "n";
            secondary += "n";
            index += 2;
          } else if (atEnd(2) && peek(2) === "i" && !isVowel(peek(3))) {
            primary += "n";
            secondary += "n";
            index += 2;
          } else {
            index++;
          }
        } else {
          primary += "k";
          secondary += "k";
          index++;
        }
        break;
      case "h":
        if (isVowel(peek(-1)) || isVowel(next())) {
          primary += "h";
          secondary += "h";
        }
        index++;
        break;
      case "j":
        primary += "j";
        secondary += "j";
        index++;
        break;
      case "k":
        if (peek(-1) !== "c") {
          primary += "k";
          secondary += "k";
        }
        index++;
        break;
      case "l":
        primary += "l";
        secondary += "l";
        index++;
        break;
      case "m":
        primary += "m";
        secondary += "m";
        index++;
        break;
      case "n":
        primary += "n";
        secondary += "n";
        index++;
        break;
      case "p":
        if (peek(1) === "h") {
          primary += "f";
          secondary += "f";
          index += 2;
        } else {
          primary += "p";
          secondary += "p";
          index++;
        }
        break;
      case "q":
        primary += "k";
        secondary += "k";
        index++;
        break;
      case "r":
        primary += "r";
        secondary += "r";
        index++;
        break;
      case "s":
        if (peek(1) === "h") {
          primary += "x";
          secondary += "x";
          index += 2;
        } else if (peek(1) === "i" && (peek(2) === "a" || peek(2) === "o" || peek(2) === "u")) {
          primary += "x";
          secondary += "x";
          index += 2;
        } else {
          primary += "s";
          secondary += "s";
          index++;
        }
        break;
      case "t":
        if (peek(1) === "h") {
          primary += "0";
          secondary += "0";
          index += 2;
        } else if (peek(1) === "i" && (peek(2) === "a" || peek(2) === "o")) {
          primary += "x";
          secondary += "x";
          index += 2;
        } else {
          primary += "t";
          secondary += "t";
          index++;
        }
        break;
      case "v":
        primary += "f";
        secondary += "f";
        index++;
        break;
      case "w":
      case "y":
        if (isVowel(next())) {
          primary += c;
          secondary += c;
        }
        index++;
        break;
      case "z":
        primary += "s";
        secondary += "s";
        index++;
        break;
      default:
        index++;
    }
  }

  return [primary, secondary];
}

function phoneticMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const [a1] = doubleMetaphone(a);
  const [b1] = doubleMetaphone(b);
  if (a1 && b1 && a1 === b1) return true;
  return false;
}

interface WhisperWord {
  word: string;
  start?: number;
  end?: number;
  probability?: number;
}

interface VerboseTranscriptionResponse {
  text?: string;
  words?: WhisperWord[];
}

export function compareText(
  original: string,
  transcript: string,
  paragraphIndex: number,
  sttResponse?: VerboseTranscriptionResponse
): PronunciationResult {
  const origTokens = tokenize(original);
  const heardTokens = tokenize(transcript);

  const wordConfidences: Record<number, number> = {};
  if (sttResponse?.words) {
    let heardIdx = 0;
    for (const ww of sttResponse.words) {
      const wwToken = tokenize(ww.word);
      for (const _ of wwToken) {
        if (ww.probability !== undefined) {
          wordConfidences[heardIdx] = ww.probability;
        }
        heardIdx++;
      }
    }
  }

  if (origTokens.length === 0) {
    return {
      words: [],
      accuracy: 0,
      correctCount: 0,
      uncertainCount: 0,
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

  const matchedOrig = new Map<number, number>();
  for (const [o, h] of matches) {
    matchedOrig.set(o, h);
  }
  const matchedHeard = new Set(matches.map(([, h]) => h));

  const words: PronunciationWord[] = [];
  let correctCount = 0;
  let uncertainCount = 0;

  for (let i = 0; i < origTokens.length; i++) {
    if (matchedOrig.has(i)) {
      const heardIdx = matchedOrig.get(i)!;
      const confidence = wordConfidences[heardIdx];
      const isLowConfidence = confidence !== undefined && confidence < CONFIDENCE_THRESHOLD;

      if (isLowConfidence) {
        words.push({
          original: origTokens[i],
          status: "uncertain",
          confidence,
        });
        uncertainCount++;
      } else {
        words.push({
          original: origTokens[i],
          status: "correct",
          confidence,
        });
        correctCount++;
      }
    } else {
      const bestMispronounced = heardTokens.find((ht, hi) => {
        if (matchedHeard.has(hi)) return false;
        return phoneticMatch(origTokens[i], ht);
      });

      if (bestMispronounced) {
        words.push({
          original: origTokens[i],
          heard: bestMispronounced,
          status: "mispronounced",
        });
      } else {
        words.push({ original: origTokens[i], status: "missed" });
      }
    }
  }

  for (let j = 0; j < heardTokens.length; j++) {
    if (!matchedHeard.has(j)) {
      words.push({ original: "", heard: heardTokens[j], status: "extra" });
    }
  }

  const mispronouncedCount = words.filter((w) => w.status === "mispronounced").length;
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
    uncertainCount,
    mispronouncedCount,
    missedCount,
    extraCount,
    totalWords: origTokens.length,
    transcript,
    paragraphIndex,
    timestamp: Date.now(),
  };
}

export type { PronunciationWord, PronunciationResult, PronunciationWordStatus, WhisperWord, VerboseTranscriptionResponse };
