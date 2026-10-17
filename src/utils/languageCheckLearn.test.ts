import { describe, expect, it } from "vitest";
import {
  buildErrorSamples,
  countByCategory,
  levelKeyForAge,
  parseExercises,
  parseLesson,
  splitAtBlanks,
  type FillBlankExercise,
  type FindFixExercise,
  type ReorderExercise,
} from "./languageCheckLearn";
import {
  correctedPassage,
  exerciseSolution,
  gradeChoice,
  gradeFillBlank,
  gradeFindFix,
  gradeReorder,
  masteryFor,
  matchesAny,
  normalizeAnswer,
  percentScore,
  runsFromMarks,
  tokenizePassage,
} from "./languageCheckLearnGrade";
import {
  LANGUAGE_CHECK_CATEGORIES,
  LEARN_CATEGORY_FOCUS,
  LEARN_CATEGORY_TYPES,
} from "@/constants/languageCheck";

const ALL = [
  "choice",
  "fill-blank",
  "reorder",
  "error-correction",
  "rewrite",
  "compose",
  "proofread",
] as const;

function parse(items: unknown[], allowed: readonly (typeof ALL)[number][] = ALL) {
  return parseExercises(items, { idPrefix: "x", allowed, max: 20 });
}

describe("category tables", () => {
  it("cover every category", () => {
    for (const c of LANGUAGE_CHECK_CATEGORIES) {
      expect(LEARN_CATEGORY_FOCUS[c]).toBeTruthy();
      expect(LEARN_CATEGORY_TYPES[c].length).toBeGreaterThan(0);
    }
  });
});

describe("levelKeyForAge", () => {
  it("clamps to the known range", () => {
    expect(levelKeyForAge(8)).toBe("primary3");
    expect(levelKeyForAge(15)).toBe("form4");
    expect(levelKeyForAge(30)).toBe("dse");
    expect(levelKeyForAge(2)).toBe("primary3");
  });
});

describe("parseLesson", () => {
  it("accepts a minimal lesson and drops malformed sub-items", () => {
    const lesson = parseLesson({
      summary: "Add -s for he/she/it.",
      rules: [{ heading: "Rule", explanation: "x", examples: ["She runs.", 5] }, "bad"],
      contrasts: [{ wrong: "She run.", right: "She runs." }, { wrong: "" }],
      chineseTransfer: { explanation: "", explanationZh: "" },
    });
    expect(lesson.rules).toHaveLength(1);
    expect(lesson.rules[0].examples).toEqual(["She runs."]);
    expect(lesson.contrasts).toHaveLength(1);
    expect(lesson.chineseTransfer).toBeNull();
    expect(lesson.tips).toEqual([]);
  });

  it("rejects a lesson with no usable rules", () => {
    expect(() => parseLesson({ summary: "x", rules: [] })).toThrow();
  });
});

describe("parseExercises", () => {
  it("validates choice answers and keeps all options", () => {
    const { items, dropped } = parse([
      { type: "choice", question: "She ___ home.", options: ["go", "goes"], answer: "goes" },
      { type: "choice", question: "bad", options: ["a", "b"], answer: "c" },
      { type: "choice", question: "dup", options: ["a", "a"], answer: "a" },
    ]);
    expect(items).toHaveLength(1);
    expect(dropped).toBe(2);
    const choice = items[0];
    expect(choice.type === "choice" && [...choice.options].sort()).toEqual(["go", "goes"]);
  });

  it("normalises fill-blank answers and checks the blank count", () => {
    const { items, dropped } = parse([
      { type: "fill-blank", sentence: "She ___ to school.", answers: ["goes", "walks"] },
      { type: "fill-blank", sentence: "___ and ___ are fun.", answers: [["Tom"], ["Ann", "Anna"]] },
      { type: "fill-blank", sentence: "Only one ___ here.", answers: [["a"], ["b"]] },
      { type: "fill-blank", sentence: "No gap here.", answers: ["x"] },
    ]);
    expect(dropped).toBe(2);
    const [one, two] = items as FillBlankExercise[];
    expect(one.answers).toEqual([["goes", "walks"]]);
    expect(two.answers).toEqual([["Tom"], ["Ann", "Anna"]]);
  });

  it("shuffles reorder tokens without changing them", () => {
    const { items } = parse([{ type: "reorder", answer: "I always do my homework.", alternatives: [] }]);
    const item = items[0] as ReorderExercise;
    expect([...item.tokens].sort()).toEqual(["I", "always", "do", "homework.", "my"]);
  });

  it("rejects reorder sentences that are too short", () => {
    expect(parse([{ type: "reorder", answer: "Hi there." }]).items).toHaveLength(0);
  });

  it("anchors proofreading errors and drops unanchorable ones", () => {
    const { items } = parse([
      {
        type: "proofread",
        passage: "He go to school. She like cats.",
        errors: [
          { wrong: "go", right: ["goes"] },
          { wrong: "like", right: "likes" },
          { wrong: "missing words", right: ["x"] },
          { wrong: "cats", right: ["cats"] },
        ],
      },
    ]);
    const item = items[0] as FindFixExercise;
    expect(item.errors.map((e) => e.wrong)).toEqual(["go", "like"]);
    expect(item.passage.slice(item.errors[0].start, item.errors[0].end)).toBe("go");
  });

  it("drops a proofreading item with no anchorable error", () => {
    expect(
      parse([{ type: "error-correction", passage: "Fine text.", errors: [{ wrong: "zzz", right: ["y"] }] }])
        .items,
    ).toHaveLength(0);
  });

  it("filters by allowed type, caps the count, assigns ids and rejects non-lists", () => {
    const raw = [
      { type: "compose", instruction: "Write.", criteria: "c", modelAnswer: "m" },
      { type: "choice", question: "q", options: ["a", "b"], answer: "a" },
      { type: "choice", question: "q2", options: ["a", "b"], answer: "b" },
      { type: "unknown" },
    ];
    const res = parseExercises(raw, { idPrefix: "quiz", allowed: ["choice"], max: 1 });
    expect(res.items.map((i) => i.id)).toEqual(["quiz-1"]);
    expect(res.dropped).toBe(3);
    expect(() => parseExercises("nope", { idPrefix: "x", allowed: ["choice"], max: 1 })).toThrow();
    expect(
      parseExercises({ exercises: [raw[1]] }, { idPrefix: "x", allowed: ["choice"], max: 3 }).items,
    ).toHaveLength(1);
  });
});

describe("normalizeAnswer / matchesAny", () => {
  it("ignores case, spacing and final punctuation unless strict", () => {
    expect(normalizeAnswer("  She   Goes. ")).toBe("she goes");
    expect(matchesAny("she goes", ["She goes."])).toBe(true);
    expect(matchesAny("", ["x"])).toBe(false);
    expect(normalizeAnswer("It’s fine")).toBe("it's fine");
  });

  it("is exact for strict categories", () => {
    expect(matchesAny("i like hong kong.", ["I like Hong Kong."], true)).toBe(false);
    expect(matchesAny("I like Hong Kong.", ["I like Hong Kong."], true)).toBe(true);
    expect(matchesAny("I like Hong Kong .", ["I like Hong Kong."], true)).toBe(true);
  });
});

describe("gradeChoice / gradeFillBlank / gradeReorder", () => {
  it("grades a choice", () => {
    const item = parse([{ type: "choice", question: "q", options: ["a", "b"], answer: "a" }]).items[0];
    if (item.type !== "choice") throw new Error();
    expect(gradeChoice(item, "a").correct).toBe(true);
    expect(gradeChoice(item, "b").score).toBe(0);
  });

  it("gives partial credit for multi-blank items", () => {
    const item = parse([
      { type: "fill-blank", sentence: "___ and ___ play.", answers: [["Tom"], ["Ann", "Anna"]] },
    ]).items[0] as FillBlankExercise;
    expect(gradeFillBlank(item, ["tom", "anna"]).correct).toBe(true);
    const partial = gradeFillBlank(item, ["tom", "bob"]);
    expect(partial.score).toBe(0.5);
    expect(partial.correct).toBe(false);
    expect(partial.detail).toEqual({ kind: "fill-blank", blanks: [true, false] });
  });

  it("accepts alternative orderings", () => {
    const item = parse([
      {
        type: "reorder",
        answer: "I always do my homework.",
        alternatives: ["Always I do my homework."],
      },
    ]).items[0] as ReorderExercise;
    expect(gradeReorder(item, ["I", "always", "do", "my", "homework."]).correct).toBe(true);
    expect(gradeReorder(item, ["Always", "I", "do", "my", "homework."]).correct).toBe(true);
    expect(gradeReorder(item, ["my", "I", "do", "always", "homework."]).correct).toBe(false);
  });
});

describe("proofreading", () => {
  const item = parse([
    {
      type: "proofread",
      passage: "He go to school. She like cats very much.",
      errors: [
        { wrong: "go", right: ["goes"] },
        { wrong: "like", right: ["likes"] },
      ],
    },
  ]).items[0] as FindFixExercise;
  const tokens = tokenizePassage(item.passage);
  const idx = (word: string) => tokens.find((t) => t.text === word)!.index;

  it("tokenises words and punctuation", () => {
    expect(tokens.map((t) => t.text).slice(0, 5)).toEqual(["He", "go", "to", "school", "."]);
  });

  it("groups adjacent marks into one run", () => {
    const runs = runsFromMarks(item.passage, tokens, [idx("to"), idx("school"), idx("She")]);
    expect(runs.map((r) => r.text)).toEqual(["to school", "She"]);
  });

  it("scores detection and fix, and counts false alarms", () => {
    const perfect = gradeFindFix(item, [idx("go"), idx("like")], {
      [idx("go")]: "goes",
      [idx("like")]: "likes",
    });
    expect(perfect.correct).toBe(true);
    expect(perfect.score).toBe(1);

    const foundNotFixed = gradeFindFix(item, [idx("go"), idx("like")], {});
    expect(foundNotFixed.correct).toBe(false);
    expect(foundNotFixed.score).toBeCloseTo(0.4);

    const withFalseAlarm = gradeFindFix(item, [idx("go"), idx("cats")], { [idx("go")]: "goes" });
    expect(withFalseAlarm.detail).toMatchObject({ falseRuns: [idx("cats")] });
    expect(withFalseAlarm.correct).toBe(false);
    expect(withFalseAlarm.score).toBeCloseTo(0.5 - 0.1);

    expect(gradeFindFix(item, [], {}).score).toBe(0);
  });

  it("accepts a wider mark than the error, as long as the edit is right", () => {
    const multi = parse([
      {
        type: "error-correction",
        passage: "I went to shop yesterday.",
        errors: [{ wrong: "to shop", right: ["to the shop"] }],
      },
    ]).items[0] as FindFixExercise;
    const t = tokenizePassage(multi.passage);
    const shop = t.find((x) => x.text === "shop")!.index;
    // Only "shop" is marked, and the learner types "the shop".
    expect(gradeFindFix(multi, [shop], { [shop]: "the shop" }).correct).toBe(true);
    expect(gradeFindFix(multi, [shop], { [shop]: "shops" }).correct).toBe(false);
  });

  it("builds the corrected passage", () => {
    expect(correctedPassage(item)).toBe("He goes to school. She likes cats very much.");
    expect(exerciseSolution(item)).toBe("He goes to school. She likes cats very much.");
  });
});

describe("misc helpers", () => {
  it("splits at blanks", () => {
    expect(splitAtBlanks("a ___ b ____ c")).toEqual(["a ", " b ", " c"]);
  });

  it("scores and masters", () => {
    expect(percentScore([1, 0.5, 0], 4)).toBe(38);
    expect(percentScore([], 0)).toBe(0);
    expect(masteryFor(80)).toBe("secure");
    expect(masteryFor(60)).toBe("developing");
    expect(masteryFor(10)).toBe("review");
  });

  it("collects distinct mistakes with context", () => {
    const text = "He go home. She go out. They go away.";
    const mk = (start: number, original: string, correction: string): LanguageCheckError => ({
      id: String(start),
      start,
      end: start + original.length,
      original,
      correction,
      category: "subject-verb-agreement",
      explanation: "add -s",
      explanationZh: "",
    });
    const essay = {
      checkedText: text,
      corrections: [mk(3, "go", "goes"), mk(15, "go", "goes"), mk(27, "go away", "goes away")],
    };
    const samples = buildErrorSamples(essay, "subject-verb-agreement");
    // The repeated "go -> goes" collapses into one sample.
    expect(samples).toHaveLength(2);
    expect(samples[0].sentence).toContain("He go home.");
    expect(buildErrorSamples(essay, "tense")).toEqual([]);
    expect(countByCategory(essay.corrections)).toEqual([
      { category: "subject-verb-agreement", count: 3 },
    ]);
  });
});
