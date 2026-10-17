import { describe, expect, it } from "vitest";
import { LANGUAGE_CHECK_CATEGORIES } from "@/constants/languageCheck";
import { parseExercises, parseLesson } from "./languageCheckLearn";
import {
  patchBodySchema,
  storedExerciseList,
  MAX_PRACTICE_ITEMS,
} from "./languageCheckLearnStored";

const RAW = [
  { type: "choice", question: "She ___ home.", options: ["go", "goes", "going"], answer: "goes", hint: "h", explanation: "e", explanationZh: "中" },
  { type: "fill-blank", sentence: "He ___ fast and she ___ slowly.", answers: [["runs"], ["walks", "strolls"]], hint: "h" },
  { type: "reorder", context: "At school", answer: "She goes to school every day.", alternatives: ["Every day she goes to school."], hint: "h" },
  { type: "error-correction", passage: "She go to school.", errors: [{ wrong: "go", right: ["goes"], explanation: "e", explanationZh: "中" }] },
  {
    type: "proofread",
    passage: "She go to school. He have a book. They is happy.",
    errors: [
      { wrong: "go", right: ["goes"] },
      { wrong: "have", right: ["has"] },
      { wrong: "is", right: ["are"] },
    ],
  },
  { type: "rewrite", instruction: "Rewrite it.", source: "She go home.", answers: ["She goes home."], criteria: "c" },
  { type: "compose", instruction: "Write.", criteria: "c", modelAnswer: "She goes home." },
];

describe("stored schema accepts everything the AI parser produces", () => {
  const { items, dropped } = parseExercises(RAW, {
    idPrefix: "p0abcd",
    allowed: ["choice", "fill-blank", "reorder", "error-correction", "proofread", "rewrite", "compose"],
    max: 20,
  });

  it("parses every sample type (fixture sanity)", () => {
    expect(dropped).toBe(0);
    expect(items.map((i) => i.type)).toEqual(RAW.map((r) => r.type));
  });

  it("round-trips unchanged — reorder tokens and shuffled options are NOT re-randomised", () => {
    const parsed = storedExerciseList(MAX_PRACTICE_ITEMS).parse(items);
    expect(parsed).toEqual(items);
  });

  it("is also what travels inside a patch body, JSON-serialised", () => {
    const body = JSON.parse(
      JSON.stringify({ units: [{ category: "tense", practice: items, quiz: items.slice(0, 5) }] }),
    );
    expect(patchBodySchema.safeParse(body).success).toBe(true);
  });

  it("rejects malformed content", () => {
    const bad = [{ ...items[0], answer: "not an option" }];
    expect(storedExerciseList(10).safeParse(bad).success).toBe(false);
    expect(storedExerciseList(10).safeParse([items[0], items[0]]).success).toBe(false);
    expect(storedExerciseList(1).safeParse([items[0], { ...items[1] }]).success).toBe(false);
  });
});

describe("lesson", () => {
  it("a parsed lesson is stable under the stored schema", () => {
    const lesson = parseLesson({
      title: "Agreement",
      summary: "Add -s.",
      rules: [{ heading: "Rule", explanation: "Because.", pattern: "he + verb-s", examples: ["She runs."] }],
      contrasts: [{ wrong: "She run.", right: "She runs.", why: "Needs -s." }],
      chineseTransfer: { explanation: "Chinese verbs never change." },
      tips: [{ tip: "Circle the verb." }],
    });
    const res = patchBodySchema.safeParse(
      JSON.parse(JSON.stringify({ units: [{ category: "tense", lesson }] })),
    );
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.units?.[0].lesson).toEqual(lesson);
  });

  it("a lesson with no Chinese-transfer note (null) is accepted", () => {
    const lesson = parseLesson({
      summary: "s",
      rules: [{ heading: "r", explanation: "e" }],
    });
    expect(lesson.chineseTransfer).toBeNull();
    expect(
      patchBodySchema.safeParse(JSON.parse(JSON.stringify({ units: [{ category: "tense", lesson }] }))).success,
    ).toBe(true);
  });
});

describe("patch body", () => {
  it("accepts every category and rejects unknown ones", () => {
    for (const category of LANGUAGE_CHECK_CATEGORIES) {
      expect(patchBodySchema.safeParse({ units: [{ category }] }).success).toBe(true);
    }
    expect(patchBodySchema.safeParse({ units: [{ category: "nope" }] }).success).toBe(false);
  });

  it("only allows client-reportable event types", () => {
    const ok = { events: [{ type: "summary_viewed", key: "k" }] };
    expect(patchBodySchema.safeParse(ok).success).toBe(true);
    // a client can never write an outcome event or a score
    expect(patchBodySchema.safeParse({ events: [{ type: "quiz_completed", key: "k" }] }).success).toBe(false);
    expect(patchBodySchema.safeParse({ events: [{ type: "session_completed", key: "k" }] }).success).toBe(false);
  });

  it("validates location and quiz answers", () => {
    expect(patchBodySchema.safeParse({ current: "summary" }).success).toBe(true);
    expect(patchBodySchema.safeParse({ current: { unit: 9, stage: "quiz" } }).success).toBe(false);
    expect(
      patchBodySchema.safeParse({
        units: [{ category: "tense", quizResults: { q: { answer: { marked: [1], fixes: { 1: "x" } }, score: 1, correct: true } } }],
      }).success,
    ).toBe(true);
    expect(
      patchBodySchema.safeParse({
        units: [{ category: "tense", quizResults: { q: { answer: "x", score: 2, correct: true } } }],
      }).success,
    ).toBe(false);
  });
});
