import { describe, expect, it } from "vitest";
import {
  applyCorrections,
  buildSegments,
  chunkParagraphs,
  contextAround,
  deriveTitle,
  diffChanges,
  parseRawErrors,
  resolveErrors,
  splitParagraphs,
  stripJsonFences,
  wordDiff,
  type RawLanguageError,
} from "./languageCheck";

const raw = (o: Partial<RawLanguageError>): RawLanguageError => ({
  paragraph: 1,
  before: "",
  original: "x",
  correction: "y",
  category: "tense",
  explanation: "",
  explanationZh: "",
  alternatives: [],
  ...o,
});

describe("splitParagraphs", () => {
  it("splits on blank lines with correct offsets", () => {
    const text = "First para.\n\nSecond para.\n\n\nThird.";
    const ps = splitParagraphs(text);
    expect(ps.map((p) => p.text)).toEqual(["First para.", "Second para.", "Third."]);
    expect(ps.map((p) => p.index)).toEqual([1, 2, 3]);
    for (const p of ps) expect(text.slice(p.start, p.end)).toBe(p.text);
  });

  it("keeps single newlines inside a paragraph", () => {
    expect(splitParagraphs("a\nb\n\nc")).toHaveLength(2);
  });
});

describe("chunkParagraphs", () => {
  it("never splits a paragraph and respects the word budget", () => {
    const ps = splitParagraphs("one two three\n\nfour five six\n\nseven");
    const chunks = chunkParagraphs(ps, 5);
    expect(chunks.map((c) => c.length)).toEqual([1, 2]);
    expect(chunkParagraphs(ps, 100)).toHaveLength(1);
  });
});

describe("parseRawErrors", () => {
  it("skips invalid items and counts them", () => {
    const { errors, invalid } = parseRawErrors([
      { paragraph: 1, original: "go", correction: "went", category: "tense" },
      { paragraph: 1, original: "a", correction: "b", category: "not-a-category" },
    ]);
    expect(errors).toHaveLength(1);
    expect(invalid).toBe(1);
  });

  it("accepts an { errors: [] } wrapper and rejects non-lists", () => {
    expect(parseRawErrors({ errors: [] }).errors).toEqual([]);
    expect(() => parseRawErrors("nope")).toThrow();
  });
});

describe("resolveErrors", () => {
  const text = "I go to school yesterday.\n\nHe have a dog. He have a cat.";

  it("anchors errors and sorts in reading order", () => {
    const { errors, dropped } = resolveErrors(text, [
      raw({ paragraph: 2, original: "He have", correction: "He has", category: "subject-verb-agreement" }),
      raw({ paragraph: 1, original: "go", correction: "went" }),
    ]);
    expect(dropped).toBe(0);
    expect(errors.map((e) => e.original)).toEqual(["go", "He have"]);
    expect(errors.map((e) => e.id)).toEqual(["e1", "e2"]);
    for (const e of errors) expect(text.slice(e.start, e.end)).toBe(e.original);
  });

  it("uses `before` to pick the right repeat", () => {
    const { errors } = resolveErrors(text, [
      raw({ paragraph: 2, before: "He have a dog.", original: "He have", correction: "He has", category: "subject-verb-agreement" }),
    ]);
    expect(errors[0].start).toBe(text.lastIndexOf("He have"));
  });

  it("gives repeated identical snippets distinct positions", () => {
    const { errors } = resolveErrors(text, [
      raw({ paragraph: 2, original: "He have", correction: "He has", category: "subject-verb-agreement" }),
      raw({ paragraph: 2, original: "He have", correction: "He has", category: "subject-verb-agreement" }),
    ]);
    expect(errors).toHaveLength(2);
    expect(errors[0].start).not.toBe(errors[1].start);
  });

  it("falls back to the whole text when the paragraph index is wrong", () => {
    const { errors } = resolveErrors(text, [
      raw({ paragraph: 9, original: "go to school", correction: "went to school" }),
    ]);
    expect(errors).toHaveLength(1);
  });

  it("drops unanchorable, overlapping and no-op errors", () => {
    const { errors, dropped } = resolveErrors(text, [
      raw({ original: "not in the text", correction: "z" }),
      raw({ original: "go to", correction: "went to" }),
      raw({ original: "to school", correction: "to the school" }),
      raw({ original: "I", correction: "I" }),
    ]);
    expect(errors).toHaveLength(1);
    expect(dropped).toBe(3);
  });
});

describe("segments and applyCorrections", () => {
  it("round-trips the text and applies corrections", () => {
    const text = "I go to school yesterday.";
    const { errors } = resolveErrors(text, [
      raw({ original: "go", correction: "went" }),
      raw({ original: "yesterday", correction: "", category: "redundancy" }),
    ]);
    const segs = buildSegments(text, errors);
    expect(segs.map((s) => s.text).join("")).toBe(text);
    expect(applyCorrections(text, errors)).toBe("I went to school .");
  });
});

describe("wordDiff", () => {
  it("marks removed and added words", () => {
    expect(wordDiff("He have", "He has")).toEqual([
      { type: "same", text: "He" },
      { type: "removed", text: "have" },
      { type: "added", text: "has" },
    ]);
  });

  it("handles pure deletion and pure insertion", () => {
    expect(wordDiff("very very good", "very good").some((t) => t.type === "removed")).toBe(true);
    expect(wordDiff("", "the")).toEqual([{ type: "added", text: "the" }]);
  });
});

describe("misc helpers", () => {
  it("strips json fences", () => {
    expect(stripJsonFences("```json\n[1]\n```")).toBe("[1]");
  });
  it("derives a clipped title", () => {
    expect(deriveTitle("\n  My Holiday \nbody", "Untitled")).toBe("My Holiday");
    expect(deriveTitle("   ", "Untitled")).toBe("Untitled");
    expect(deriveTitle("a".repeat(100), "u").endsWith("…")).toBe(true);
  });
});

describe("diffChanges", () => {
  it("groups replacements like the reference UI chips", () => {
    expect(
      diffChanges(
        "feedback of receiving our service with Toot Restaurant.",
        "feedback regarding our service at Toot Restaurant.",
      ),
    ).toEqual([
      { removed: "of receiving", added: "regarding" },
      { removed: "with", added: "at" },
    ]);
  });

  it("represents deletions and insertions", () => {
    expect(diffChanges("very very good", "very good")).toEqual([
      { removed: "very", added: "" },
    ]);
    expect(diffChanges("went school", "went to school")).toEqual([
      { removed: "", added: "to" },
    ]);
  });
});

describe("contextAround", () => {
  const text = "It was fine. I go to school yesterday. Then I slept.";
  it("returns the surrounding sentence", () => {
    const start = text.indexOf("go");
    const c = contextAround(text, start, start + 2);
    expect(c.match).toBe("go");
    expect(c.before).toBe("I ");
    expect(c.after).toBe(" to school yesterday.");
  });

  it("clips very long sentences with ellipses", () => {
    const long = "word ".repeat(60) + "bad " + "word ".repeat(60);
    const i = long.indexOf("bad");
    const c = contextAround(long, i, i + 3, 20);
    expect(c.before.startsWith("…")).toBe(true);
    expect(c.after.endsWith("…")).toBe(true);
  });
});

describe("expression tier", () => {
  const text = "Because of the reason that he was late, I am angry with him very much.";

  it("parses alternatives leniently (string, null, junk)", () => {
    const base = { paragraph: 1, original: "a", correction: "b", category: "chinglish" };
    const parse = (alternatives: unknown) =>
      parseRawErrors([{ ...base, alternatives }]).errors[0]?.alternatives;
    expect(parse(["x", " y ", ""])).toEqual(["x", "y"]);
    expect(parse("only one")).toEqual(["only one"]);
    expect(parse(null)).toEqual([]);
    expect(parse([1, "ok", {}])).toEqual(["ok"]);
    expect(
      parseRawErrors([{ ...base, alternatives: undefined }]).errors[0]?.alternatives,
    ).toEqual([]);
  });

  it("accepts the new categories and rejects unknown ones per item", () => {
    const { errors, invalid } = parseRawErrors([
      { paragraph: 1, original: "a", correction: "b", category: "unclear-phrasing" },
      { paragraph: 1, original: "a", correction: "b", category: "style" },
    ]);
    expect(errors).toHaveLength(1);
    expect(invalid).toBe(1);
  });

  it("lets genuine errors win over an overlapping suggestion", () => {
    const { errors, dropped } = resolveErrors(text, [
      // Listed first on purpose: the suggestion must still lose.
      raw({
        original: "I am angry with him very much",
        correction: "I am furious with him",
        category: "chinglish",
      }),
      raw({ original: "very much", correction: "extremely", category: "word-choice" }),
    ]);
    expect(errors.map((e) => e.category)).toEqual(["word-choice"]);
    expect(dropped).toBe(1);
  });

  it("keeps non-overlapping suggestions alongside errors, in reading order", () => {
    const { errors } = resolveErrors(text, [
      raw({ original: "am angry", correction: "feel angry", category: "tense" }),
      raw({
        original: "Because of the reason that he was late",
        correction: "Because he was late",
        category: "concision",
        alternatives: ["Since he was late", "Due to his lateness"],
      }),
    ]);
    expect(errors.map((e) => e.category)).toEqual(["concision", "tense"]);
    expect(errors[0]?.alternatives).toEqual(["Since he was late", "Due to his lateness"]);
  });

  it("cleans, dedupes and caps alternatives; ignores them on plain errors", () => {
    const { errors } = resolveErrors(text, [
      raw({
        original: "very much",
        correction: "greatly",
        category: "chinglish",
        alternatives: ["greatly", "VERY MUCH", "deeply", "deeply", "so much", "a lot", "terribly"],
      }),
      raw({ original: "was", correction: "had been", category: "tense", alternatives: ["x"] }),
    ]);
    const chinglish = errors.find((e) => e.category === "chinglish");
    expect(chinglish?.alternatives).toEqual(["deeply", "so much", "a lot"]);
    const tense = errors.find((e) => e.category === "tense");
    expect(tense && "alternatives" in tense).toBe(false);
  });

  it("applyCorrections skips suggestions unless polishing", () => {
    const { errors } = resolveErrors("He go there. It is very good.", [
      raw({ original: "go", correction: "goes", category: "subject-verb-agreement" }),
      raw({ original: "very good", correction: "excellent", category: "vocabulary-upgrade" }),
    ]);
    const t = "He go there. It is very good.";
    expect(applyCorrections(t, errors)).toBe("He goes there. It is very good.");
    expect(applyCorrections(t, errors, { includeExpression: true })).toBe(
      "He goes there. It is excellent.",
    );
  });
});
