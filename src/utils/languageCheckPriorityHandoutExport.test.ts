import { describe, expect, it } from "vitest";
import { Packer } from "docx";
import { buildPriorityHandoutDocx } from "@/utils/languageCheckPriorityHandoutExport";
import { parseExercises, parseHandout } from "@/utils/languageCheckLearn";

describe("buildPriorityHandoutDocx", () => {
  it("builds a document with notes, exercises and answer key", async () => {
    const lesson = parseHandout({
      title: "Subject-verb agreement",
      summary: "The verb must match its subject.",
      goal: "I can match verbs to subjects.",
      rules: [{ heading: "Add -s", explanation: "He/she/it takes -s.", pattern: "he + verb-s", examples: ["He plays."] }],
      contrasts: [{ wrong: "He play.", right: "He plays.", why: "Third person." }],
      tips: [{ tip: "Circle the subject." }],
      tryIt: { instruction: "Swap sentences with a partner." },
    });
    const { items } = parseExercises(
      [
        { type: "choice", question: "She ___ tennis.", options: ["play", "plays"], answer: "plays", hint: "who?", explanation: "she + s" },
        { type: "fill-blank", sentence: "He ___ (go) home.", answers: [["goes"]], explanation: "x" },
        { type: "error-correction", passage: "He play well.", errors: [{ wrong: "play", right: ["plays"] }] },
      ],
      { idPrefix: "t", allowed: ["choice", "fill-blank", "error-correction"], max: 10 },
    );
    expect(items).toHaveLength(3);
    const doc = buildPriorityHandoutDocx({
      report: { base: { topic: { title: "Topic", className: "4A", essayType: "dse-part-a" } } } as unknown as LanguageCheckAiReport,
      priority: { title: "Agreement", why: "w", activity: "a", minutes: 15 },
      index: 1,
      handout: { lesson, exercises: items },
      language: "en",
      age: 15,
      t: (k) => k,
      categoryLabel: (c) => c,
    });
    const blob = await Packer.toBuffer(doc);
    expect(blob.byteLength).toBeGreaterThan(5000);
  });
});
