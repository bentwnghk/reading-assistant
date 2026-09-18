import { describe, expect, it } from "vitest";

import { computeBattleSessionAttribution } from "./battleAttribution";

const TEXT = `
  Every spring the birds migrate north. The long migration crosses oceans
  and deserts. Scientists study their migration routes carefully. A
  well-known researcher runs a station in the hills, where she watches the
  birds and takes notes about their habits and classes them by species.
`;

const GLOSSARY = ["migrate", "migration", "researcher", "carefully", "desert", "species"];

function attribute(battleWords: string[], opts?: Partial<Parameters<typeof computeBattleSessionAttribution>[0]>) {
  return computeBattleSessionAttribution({
    sessionId: "session-1",
    battleWords,
    glossaryWords: opts?.glossaryWords ?? GLOSSARY,
    extractedText: opts?.extractedText ?? TEXT,
    ...opts,
  });
}

describe("stemming collapses inflections", () => {
  it("matches migrated/running/runs against migrate/run text", () => {
    // Only 1 of 2 words is in the glossary verbatim, but both occur in the
    // text (migrate → migrated; runs/run appear in the text) — full match.
    const r = attribute(["migrated", "runs"]);
    expect(r.overlap).toBe(1);
    expect(r.belongsToSession).toBe(true); // n < 3 → full match required, and it is full
  });

  it("matches classes against class via un-doubling", () => {
    const r = attribute(["classes", "species", "desert", "researcher", "migration"]);
    expect(r.overlap).toBe(1);
    expect(r.belongsToSession).toBe(true);
  });
});

describe("threshold rules", () => {
  it("n=1 attributes only on a match", () => {
    expect(attribute(["migration"]).belongsToSession).toBe(true);
    expect(attribute(["xylophone"]).belongsToSession).toBe(false);
  });

  it("n=2 requires a full match", () => {
    expect(attribute(["migration", "xylophone"]).belongsToSession).toBe(false);
    expect(attribute(["migration", "species"]).belongsToSession).toBe(true);
  });

  it("n=4 requires at least 3 hits (floor of 3 beats half)", () => {
    expect(attribute(["migration", "species", "desert", "elephant"]).belongsToSession).toBe(true);
    expect(attribute(["migration", "species", "elephant", "giraffe"]).belongsToSession).toBe(false);
  });

  it("large battles need a majority", () => {
    const six = ["migration", "species", "desert", "ocean", "notes", "habits"];
    expect(attribute(six).belongsToSession).toBe(true);
    const sixMid = ["migration", "species", "desert", "ocean", "notes", "parliament"];
    expect(attribute(sixMid).belongsToSession).toBe(true); // 5/6
    const sixLow = ["migration", "species", "parliament", "bureaucracy", "legislation", "elephant"];
    expect(attribute(sixLow).belongsToSession).toBe(false); // 2/6
  });
});

describe("foreign battles are not attributed", () => {
  it("unrelated vocabulary-bank words", () => {
    const r = attribute(["parliament", "bureaucracy", "legislation", "consequence", "ambivalent"]);
    expect(r.overlap).toBeLessThan(0.5);
    expect(r.belongsToSession).toBe(false);
  });

  it("no active session", () => {
    const r = computeBattleSessionAttribution({
      sessionId: null,
      battleWords: GLOSSARY,
      glossaryWords: GLOSSARY,
      extractedText: TEXT,
    });
    expect(r.belongsToSession).toBe(false);
    expect(r.overlap).toBe(0);
  });
});

describe("text-occurrence fallback", () => {
  it("attributes when the glossary is empty but the words occur in the text", () => {
    const r = attribute(["spring", "ocean", "notes", "habits", "watches"], { glossaryWords: [] });
    expect(r.overlap).toBe(1);
    expect(r.belongsToSession).toBe(true);
  });

  it("attributes when neither glossary nor text is available… not", () => {
    const r = attribute(GLOSSARY, { glossaryWords: [], extractedText: "" });
    expect(r.belongsToSession).toBe(false);
  });

  it("same-text class battle with drifted glossaries still matches", () => {
    // The invitee's glossary (from their own AI extraction) differs from the
    // host's battled words — but the words occur in the shared text.
    const r = attribute(
      ["oceans", "deserts", "routes", "researcher", "station", "species", "migration", "carefully"],
      { glossaryWords: [] },
    );
    expect(r.belongsToSession).toBe(true);
  });
});

describe("phrases", () => {
  it("a phrase hits when all its tokens occur in the text", () => {
    const r = attribute(["well-known researcher", "migration routes", "takes notes"]);
    expect(r.overlap).toBe(1);
    expect(r.belongsToSession).toBe(true);
  });

  it("a phrase with a foreign token misses", () => {
    const r = attribute(["well-known researcher", "parliament routes", "takes notes"]);
    expect(r.belongsToSession).toBe(false); // 2/3 < full match for n=3? ceil(3/2)=2, floor 3 → needs 3
  });
});
