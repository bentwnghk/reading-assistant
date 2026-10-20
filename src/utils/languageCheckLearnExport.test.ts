import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { Packer } from "docx";
import { buildLearnDocx } from "@/utils/languageCheckLearnExport";
import { canExportLearnSession } from "@/utils/languageCheckLearnProgress";
import { parseExercises, parseLesson } from "@/utils/languageCheckLearn";
import type { LearnSessionWire } from "@/utils/languageCheckLearnWire";

const fb = { hint: "Think about who does the action.", explanation: "The verb agrees with its subject.", explanationZh: "動詞須與主語一致。" };

const exercises = parseExercises(
  [
    { type: "choice", question: "She ___ to school every day.", options: ["go", "goes", "going"], answer: "goes", ...fb },
    { type: "fill-blank", sentence: "The students ___ their homework and ___ home.", answers: [["finished", "completed"], ["went"]], ...fb },
    { type: "reorder", context: "A statement about habits.", answer: "He walks to school every morning", alternatives: ["Every morning he walks to school"], ...fb },
    { type: "error-correction", passage: "My brother like playing football after school.", errors: [{ wrong: "like", right: ["likes"], explanation: "Third person singular." }], ...fb },
    { type: "proofread", passage: "She go to school. They was late. He have a dog.", errors: [{ wrong: "go", right: ["goes"], explanation: "she → goes" }, { wrong: "was", right: ["were"], explanation: "they → were" }, { wrong: "have", right: ["has"] }], ...fb },
    { type: "rewrite", instruction: "Rewrite the sentence correctly.", source: "The boys is playing.", answers: ["The boys are playing."], criteria: "Plural subject", ...fb },
    { type: "compose", instruction: "Write two sentences about your family.", criteria: "Correct verb forms", modelAnswer: "My father works in a bank. My mother teaches English.", ...fb },
  ],
  { idPrefix: "p", allowed: ["choice", "fill-blank", "reorder", "error-correction", "proofread", "rewrite", "compose"], max: 10 },
).items;

const lesson = parseLesson({
  title: "Subject-verb agreement",
  titleZh: "主謂一致",
  summary: "A verb must match its subject in number.",
  summaryZh: "動詞必須在數量上與主語一致。",
  whyItMatters: "Mistakes here are easy for readers to notice.",
  rules: [
    { heading: "Third person singular", explanation: "Add -s or -es to the verb when the subject is he, she, it or a singular noun.", pattern: "he/she/it + verb-s", examples: ["She walks to school.", "The dog barks at night."] },
    { heading: "Plural subjects", explanation: "Use the base form with they, we, you and plural nouns.", examples: ["They walk to school."] },
  ],
  contrasts: [{ wrong: "He go to school.", right: "He goes to school.", why: "Singular subject needs -es." }],
  chineseTransfer: { explanation: "Chinese verbs do not change form, so it is easy to forget the -s." },
  tips: [{ tip: "Find the subject first, then check whether it is singular or plural." }],
});

function session(units = 2): LearnSessionWire {
  return {
    id: "s1", essayId: "e1", essayTitle: "My Weekend", age: 13, status: "completed", current: "summary",
    createdAt: 1, updatedAt: 2,
    units: ["subject-verb-agreement", "tense"].slice(0, units).map((category) => ({
      category: category as "tense",
      mistakeCount: 4,
      samples: [
        { original: "go", correction: "goes", explanation: "Third person singular.", sentence: "She go to school by bus every single day." },
        { original: "feedback seriously", correction: "feedback is taken seriously", explanation: "Missing verb.", sentence: "All customers' feedback seriously." },
        { original: "have", correction: "has", explanation: "He needs has.", sentence: "He have a dog." },
        { original: "is", correction: "are", explanation: "", sentence: "The boys is happy." },
      ],
      lesson, practice: exercises, quiz: exercises.filter((e) => e.type !== "compose"),
      lessonSeen: true, practiceResults: {}, quizResults: {}, previousQuizPrompts: [], quizRound: 1,
    })),
  };
}

const t = (key: string, o?: Record<string, unknown>) => `${key.split(".").pop()}${o ? ` ${JSON.stringify(o)}` : ""}`;
const common = { t, categoryLabel: (c: string) => c, now: new Date("2026-10-18") };

async function xmlOf(withAnswers: boolean, units = 2): Promise<string> {
  const buf = await Packer.toBuffer(buildLearnDocx({ session: session(units), language: "en", withAnswers, ...common }));
  const zip = await JSZip.loadAsync(buf);
  return zip.file("word/document.xml")!.async("string");
}

describe("learn docx export", () => {
  it("builds a valid package with lesson, practice and quiz for every topic", async () => {
    const xml = await xmlOf(false);
    expect(xml).toContain("Subject-verb agreement");
    for (const c of ["subject-verb-agreement", "tense"]) expect(xml).toContain(c);
    expect(xml.match(/pageBreakBefore/g)!.length).toBe(6);
    expect(xml).toContain("She walks to school.");
    // The learner's mistakes are underlined inside the quoted sentences (the
    // mistake run is red + underlined; the chip runs are " go " with spaces).
    expect(xml).toMatch(/<w:u [^>]+\/><\/w:rPr><w:t[^>]*>go<\/w:t>/);
    expect(xml).toMatch(/<w:u [^>]+\/><\/w:rPr><w:t[^>]*>have<\/w:t>/);
    // A missing word/phrase shows as a red ^ at the gap, not an underline.
    expect(xml).toMatch(/<w:t[^>]*>\s*\^<\/w:t>/);
    expect(xml).not.toMatch(/<w:u [^>]+\/><\/w:rPr><w:t[^>]*>feedback seriously<\/w:t>/);
  });

  it("the student version hides the answers; the answer version shows them", async () => {
    const blank = await xmlOf(false, 1);
    const key = await xmlOf(true, 1);
    // model answers / solutions appear only in the answer key
    for (const secret of ["My father works in a bank.", "He walks to school every morning", "The boys are playing.", "Also accepted"]) {
      expect(blank).not.toContain(secret);
    }
    for (const shown of ["My father works in a bank.", "He walks to school every morning", "The boys are playing.", "completed", "goes"]) {
      expect(key).toContain(shown);
    }
    expect(key).toContain("The verb agrees with its subject.");
    expect(blank).not.toContain("The verb agrees with its subject.");
  });

  it("hints appear in practice only, not in the quiz", async () => {
    const xml = await xmlOf(false, 1);
    const [beforeQuiz] = xml.split("introTitle");
    expect((beforeQuiz.match(/Think about who does the action\./g) ?? []).length).toBe(7);
    expect((xml.match(/Think about who does the action\./g) ?? []).length).toBe(7);
  });
});

describe("canExportLearnSession", () => {
  it("learners need a completed session; staff always may", () => {
    expect(canExportLearnSession("student", "in_progress")).toBe(false);
    expect(canExportLearnSession("student", "completed")).toBe(true);
    expect(canExportLearnSession(undefined, "in_progress")).toBe(false);
    for (const r of ["teacher", "admin", "super-admin"]) expect(canExportLearnSession(r, "in_progress")).toBe(true);
  });
});
