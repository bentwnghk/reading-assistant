import { describe, expect, it } from "vitest";
import { mergeSplitGlossaryEntries } from "@/utils/vocabulary";

const entry = (word: string, englishDefinition = `definition of ${word}`): GlossaryEntry => ({
  word,
  partOfSpeech: "noun",
  englishDefinition,
  chineseDefinition: "釋義",
});

const PHRASE = "agriculture, fisheries and conservation department";

describe("mergeSplitGlossaryEntries", () => {
  it("stitches a comma-containing highlighted phrase that the model split into fragments", () => {
    const highlighted = [PHRASE];
    const entries = [
      entry("agriculture"),
      entry("fisheries and conservation department", "The HK government department."),
    ];

    const result = mergeSplitGlossaryEntries(entries, highlighted);

    expect(result).toHaveLength(1);
    expect(result[0].word).toBe(PHRASE);
    // The last fragment carries the head noun — its definition fields win.
    expect(result[0].englishDefinition).toBe("The HK government department.");
    expect(result[0].partOfSpeech).toBe("noun");
  });

  it("matches fragments that kept a trailing comma", () => {
    const highlighted = [PHRASE];
    const entries = [entry("agriculture,"), entry("fisheries and conservation department")];

    const result = mergeSplitGlossaryEntries(entries, highlighted);

    expect(result).toHaveLength(1);
    expect(result[0].word).toBe(PHRASE);
  });

  it("merges runs longer than two fragments", () => {
    const highlighted = [PHRASE];
    const entries = [
      entry("agriculture"),
      entry("fisheries"),
      entry("and conservation department"),
    ];

    const result = mergeSplitGlossaryEntries(entries, highlighted);

    expect(result).toHaveLength(1);
    expect(result[0].word).toBe(PHRASE);
  });

  it("merges in place, preserving surrounding entries and order", () => {
    const highlighted = ["sustainability", PHRASE];
    const entries = [
      entry("sustainability"),
      entry("agriculture"),
      entry("fisheries and conservation department"),
    ];

    const result = mergeSplitGlossaryEntries(entries, highlighted);

    expect(result.map((e) => e.word)).toEqual(["sustainability", PHRASE]);
  });

  it("uses the canonical highlighted term as the merged word", () => {
    const highlighted = ["Agriculture, Fisheries and Conservation Department"];
    const entries = [entry("agriculture"), entry("fisheries and conservation department")];

    const result = mergeSplitGlossaryEntries(entries, highlighted);

    expect(result[0].word).toBe("Agriculture, Fisheries and Conservation Department");
  });

  it("leaves a correct single-entry response untouched", () => {
    const highlighted = [PHRASE, "sustainability"];
    const entries = [entry(PHRASE), entry("sustainability")];

    const result = mergeSplitGlossaryEntries(entries, highlighted);

    expect(result).toEqual(entries);
  });

  it("leaves entries alone when the fragments match no highlighted phrase", () => {
    const highlighted = [PHRASE];
    const entries = [entry("agriculture"), entry("sustainability")];

    const result = mergeSplitGlossaryEntries(entries, highlighted);

    expect(result).toEqual(entries);
  });

  it("passes entries through when no highlighted term contains a comma", () => {
    const highlighted = ["fisheries", "conservation"];
    const entries = [entry("fisheries"), entry("conservation")];

    const result = mergeSplitGlossaryEntries(entries, highlighted);

    expect(result).toEqual(entries);
  });

  it("handles empty inputs", () => {
    expect(mergeSplitGlossaryEntries([], [PHRASE])).toEqual([]);
    expect(mergeSplitGlossaryEntries([entry("agriculture")], [])).toHaveLength(1);
    expect(mergeSplitGlossaryEntries([entry("agriculture")], ["sustainability"])).toHaveLength(1);
  });
});
