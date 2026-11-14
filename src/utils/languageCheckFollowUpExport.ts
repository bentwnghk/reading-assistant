import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LeaderType,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TabStopType,
  TextRun,
  WidthType,
  type ParagraphChild,
} from "docx";
import { saveAs } from "file-saver";
import {
  DEFAULT_CATEGORY_STYLE,
  LANGUAGE_CHECK_CATEGORY_STYLES,
  type LanguageCheckCategory,
} from "@/constants/languageCheck";
import { pickLang, splitAtBlanks, type LearnExercise } from "@/utils/languageCheckLearn";

/**
 * Word export of the class "follow-up exercise" worksheet: a short error summary
 * (mistake categories, wrong vs right, tips) + 10 "Fix the error" / "Fill in the
 * blank" questions on exactly those patterns + a compact teacher answer key.
 * Pure: builds a `Document`; `exportFollowUpDocx` saves it.
 */

type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface FollowUpItem {
  exercise: LearnExercise;
  category: string;
}

export interface FollowUpExportOptions {
  report: LanguageCheckAiReport;
  items: FollowUpItem[];
  language: "en" | "zh";
  t: Translate;
  categoryLabel: (category: string) => string;
  now?: Date;
}

const C = {
  ink: "0F172A",
  body: "1E293B",
  muted: "64748B",
  line: "E2E8F0",
  soft: "F1F5F9",
  white: "FFFFFF",
  red: "B91C1C",
  redBg: "FEF2F2",
  green: "166534",
  greenBg: "F0FDF4",
  amberInk: "78350F",
  amberBg: "FFFBEB",
} as const;

const PAGE_WIDTH = 11906;
const MARGIN = 1134;
const WIDTH = PAGE_WIDTH - MARGIN * 2;
const FONT = { ascii: "Calibri", hAnsi: "Calibri", eastAsia: "Microsoft JhengHei" };
const BLANK = "\u00A0".repeat(18);

const NONE = { style: BorderStyle.NONE, size: 0, color: C.white } as const;
const edge = (color: string, size = 6) => ({ style: BorderStyle.SINGLE, size, color }) as const;
const shade = (fill: string) => ({ type: ShadingType.CLEAR, fill, color: "auto" }) as const;
const NO_BORDERS = {
  top: NONE,
  bottom: NONE,
  left: NONE,
  right: NONE,
  insideHorizontal: NONE,
  insideVertical: NONE,
};

function run(
  text: string,
  o: {
    bold?: boolean;
    italics?: boolean;
    color?: string;
    size?: number;
    strike?: boolean;
    underline?: boolean;
    fill?: string;
    caps?: boolean;
    spacing?: number;
  } = {},
): TextRun {
  return new TextRun({
    text,
    bold: o.bold,
    italics: o.italics,
    color: o.color ?? C.body,
    size: o.size,
    strike: o.strike,
    underline: o.underline ? {} : undefined,
    shading: o.fill ? shade(o.fill) : undefined,
    allCaps: o.caps,
    characterSpacing: o.spacing,
  });
}

function para(
  children: ParagraphChild[],
  o: {
    after?: number;
    before?: number;
    line?: number;
    keepNext?: boolean;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    fill?: string;
    bar?: string;
    indent?: number;
  } = {},
): Paragraph {
  return new Paragraph({
    children,
    keepNext: o.keepNext,
    alignment: o.align,
    shading: o.fill ? shade(o.fill) : undefined,
    indent: o.indent ? { left: o.indent } : undefined,
    border: o.bar ? { left: { style: BorderStyle.SINGLE, size: 24, color: o.bar, space: 8 } } : {},
    spacing: { before: o.before ?? 0, after: o.after ?? 80, line: o.line ?? 288 },
  });
}

function gap(height = 120): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: "", size: 2 })],
    spacing: { before: 0, after: height, line: 20 },
  });
}

function box(children: Paragraph[], o: { fill?: string; border?: string; bar?: string } = {}): Table {
  const b = o.border ? edge(o.border) : NONE;
  return new Table({
    width: { size: WIDTH, type: WidthType.DXA },
    columnWidths: [WIDTH],
    layout: TableLayoutType.FIXED,
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            children,
            width: { size: WIDTH, type: WidthType.DXA },
            shading: o.fill ? shade(o.fill) : undefined,
            borders: { top: b, bottom: b, right: b, left: o.bar ? edge(o.bar, 36) : b },
            margins: { top: 130, bottom: 130, left: 200, right: 180 },
          }),
        ],
      }),
    ],
  });
}

function sectionBanner(title: string, sub: string, color: string = C.ink): Paragraph[] {
  return [
    para([run(title, { bold: true, color, size: 32 })], { before: 120, after: 40, keepNext: true }),
    ...(sub ? [para([run(sub, { color: C.muted, size: 21 })], { after: 140, keepNext: true })] : []),
  ];
}

function ruledLines(count: number): Paragraph[] {
  return Array.from(
    { length: count },
    () =>
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: WIDTH - 520, leader: LeaderType.UNDERSCORE }],
        spacing: { before: 200, after: 0, line: 300 },
        children: [new TextRun({ children: ["\t"], color: "94A3B8", size: 22 })],
      }),
  );
}

function categoryHex(category: string): string {
  return (LANGUAGE_CHECK_CATEGORY_STYLES[category as LanguageCheckCategory] ?? DEFAULT_CATEGORY_STYLE).hex;
}

/** Sentence with the wrong words struck through (red) or the correction in bold (green). */
function sentenceRuns(
  e: { before?: string; after?: string; original: string; correction: string },
  kind: "wrong" | "right",
  deleteLabel: string,
): ParagraphChild[] {
  const mid =
    kind === "wrong"
      ? run(e.original, { color: C.red, bold: true, strike: true, size: 22 })
      : run(e.correction || deleteLabel, { color: C.green, bold: true, size: 22 });
  return [run(e.before ?? "", { size: 22 }), mid, run(e.after ?? "", { size: 22 })];
}

// ─── Part 1: summary ─────────────────────────────────────────────────────────

function summaryBlocks(
  report: LanguageCheckAiReport,
  mistakes: LanguageCheckAiInsights["mistakes"],
  o: Pick<FollowUpExportOptions, "t" | "language" | "categoryLabel">,
): (Paragraph | Table)[] {
  const { t, language, categoryLabel } = o;
  const out: (Paragraph | Table)[] = [
    ...sectionBanner(t("languageCheck.followUp.part1"), t("languageCheck.followUp.part1Hint")),
  ];
  const half = Math.floor(WIDTH / 2);

  mistakes.forEach((m, i) => {
    const hex = categoryHex(m.category);
    const examples = (report.categories.find((c) => c.category === m.category)?.examples ?? []).slice(0, 2);
    const inner: (Paragraph | Table)[] = [
      para(
        [
          run(`${i + 1}. `, { bold: true, color: hex, size: 26 }),
          run(m.title, { bold: true, color: C.ink, size: 26 }),
          run(`   ${categoryLabel(m.category)}`, { color: C.muted, size: 19 }),
        ],
        { after: 60, keepNext: true },
      ),
      para([run(m.rule, { size: 22 })], { after: 100, line: 300, keepNext: examples.length > 0 }),
    ];
    if (examples.length > 0) {
      inner.push(
        new Table({
          width: { size: WIDTH - 420, type: WidthType.DXA },
          columnWidths: [half - 210, half - 210],
          layout: TableLayoutType.FIXED,
          borders: NO_BORDERS,
          rows: [
            new TableRow({
              cantSplit: true,
              children: [
                ["wrong", C.red, C.redBg],
                ["right", C.green, C.greenBg],
              ].map(
                ([kind, tone, bg]) =>
                  new TableCell({
                    width: { size: half - 210, type: WidthType.DXA },
                    shading: shade(bg),
                    borders: { top: NONE, bottom: NONE, right: NONE, left: edge(tone, 24) },
                    margins: { top: 70, bottom: 70, left: 140, right: 100 },
                    children: [
                      para(
                        [
                          run(`${kind === "wrong" ? "✗" : "✓"} ${t(`languageCheck.followUp.${kind}`)}`, {
                            bold: true,
                            color: tone,
                            size: 16,
                            caps: true,
                            spacing: 20,
                          }),
                        ],
                        { after: 30 },
                      ),
                      ...examples.map((e, j) =>
                        para(sentenceRuns(e, kind as "wrong" | "right", t("languageCheck.results.delete")), {
                          after: j < examples.length - 1 ? 70 : 0,
                          line: 280,
                        }),
                      ),
                    ],
                  }),
              ),
            }),
          ],
        }) as unknown as Paragraph,
      );
      const why = examples
        .map((e) => pickLang(e.explanation, e.explanationZh, language))
        .find(Boolean);
      if (why) inner.push(para([run(why, { color: C.muted, size: 20, italics: true })], { before: 80, after: 0 }));
    }
    inner.push(
      para(
        [
          run(`${t("languageCheck.followUp.tip")}: `, { bold: true, color: C.amberInk, size: 21 }),
          run(m.tip, { color: C.amberInk, size: 21 }),
        ],
        { fill: C.amberBg, before: 100, after: 0, line: 288 },
      ),
    );
    out.push(box(inner as Paragraph[], { border: C.line, bar: hex }), gap());
  });
  return out;
}

// ─── Part 2: exercises ───────────────────────────────────────────────────────

function exerciseBlock(
  item: LearnExercise,
  n: number,
  category: string,
  o: Pick<FollowUpExportOptions, "t" | "categoryLabel">,
): (Paragraph | Table)[] {
  const { t, categoryLabel } = o;
  const head = para(
    [
      run(` ${n} `, { bold: true, color: C.white, fill: C.ink, size: 22 }),
      run(`   ${categoryLabel(category)}`, { color: C.muted, size: 18 }),
    ],
    { after: 100, keepNext: true },
  );
  const body: Paragraph[] = [head];
  if (item.type === "fill-blank") {
    const parts = splitAtBlanks(item.sentence);
    body.push(
      para(
        parts.flatMap((p, i) => [
          run(p, { size: 25 }),
          ...(i < parts.length - 1 ? [run(BLANK, { size: 25, underline: true })] : []),
        ]),
        { after: 60, line: 380 },
      ),
    );
    if (item.hint) {
      body.push(
        para(
          [
            run(`${t("languageCheck.learn.exercise.hint")}: `, { bold: true, color: C.amberInk, size: 19 }),
            run(item.hint, { color: C.amberInk, size: 19 }),
          ],
          { before: 40, after: 0 },
        ),
      );
    }
  } else if (item.type === "error-correction") {
    body.push(
      para([run(item.passage, { size: 25 })], { after: 80, line: 380, keepNext: true }),
      para(
        [run(t("languageCheck.followUp.rewriteCorrect"), { bold: true, color: C.muted, size: 18, caps: true, spacing: 16 })],
        { after: 0, keepNext: true },
      ),
      ...ruledLines(1),
    );
  }
  return [box(body, { border: C.line }), gap(110)];
}

// ─── Answer key ──────────────────────────────────────────────────────────────

function keyCell(children: Paragraph[], width: number, fill?: string): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: fill ? shade(fill) : undefined,
    borders: { top: edge(C.line), bottom: edge(C.line), left: edge(C.line), right: edge(C.line) },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children,
  });
}

function answerOf(item: LearnExercise, deleteLabel: string): { text: string; alt: string[] } {
  if (item.type === "fill-blank") {
    return {
      text: item.answers.map((a) => a[0]).join("  /  "),
      alt: item.answers.flatMap((a) => a.slice(1)),
    };
  }
  if (item.type === "error-correction") {
    const e = item.errors[0];
    return { text: `${e.wrong}  →  ${e.right[0] || deleteLabel}`, alt: e.right.slice(1) };
  }
  return { text: "", alt: [] };
}

function answerKey(
  items: FollowUpItem[],
  o: Pick<FollowUpExportOptions, "t" | "language">,
): (Paragraph | Table)[] {
  const { t, language } = o;
  const w = [620, 3700, WIDTH - 620 - 3700];
  const del = t("languageCheck.results.delete");
  const header = new TableRow({
    tableHeader: true,
    children: [
      keyCell([para([run("#", { bold: true, size: 19 })], { after: 0 })], w[0], C.soft),
      keyCell([para([run(t("languageCheck.followUp.answer"), { bold: true, size: 19 })], { after: 0 })], w[1], C.soft),
      keyCell([para([run(t("languageCheck.followUp.why"), { bold: true, size: 19 })], { after: 0 })], w[2], C.soft),
    ],
  });
  const rows = items.map(({ exercise }, i) => {
    const a = answerOf(exercise, del);
    const why =
      pickLang(exercise.explanation, exercise.explanationZh, language) ||
      (exercise.type === "error-correction"
        ? pickLang(exercise.errors[0].explanation, exercise.errors[0].explanationZh, language)
        : "");
    return new TableRow({
      cantSplit: true,
      children: [
        keyCell([para([run(String(i + 1), { bold: true, size: 20 })], { after: 0 })], w[0]),
        keyCell(
          [
            para([run(a.text, { bold: true, color: C.green, size: 20 })], { after: a.alt.length ? 20 : 0 }),
            ...(a.alt.length
              ? [
                  para(
                    [
                      run(`${t("languageCheck.learnExport.alsoAccepted")}: ${a.alt.join(" / ")}`, {
                        color: C.muted,
                        size: 17,
                      }),
                    ],
                    { after: 0 },
                  ),
                ]
              : []),
          ],
          w[1],
        ),
        keyCell([para([run(why, { color: C.muted, size: 18 })], { after: 0, line: 252 })], w[2]),
      ],
    });
  });
  return [
    new Paragraph({
      pageBreakBefore: true,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: "", size: 2 })],
    }),
    ...sectionBanner(t("languageCheck.followUp.answerKey"), t("languageCheck.followUp.answerKeyHint"), C.green),
    new Table({
      width: { size: WIDTH, type: WidthType.DXA },
      columnWidths: w,
      layout: TableLayoutType.FIXED,
      rows: [header, ...rows],
    }),
  ];
}

// ─── Document ────────────────────────────────────────────────────────────────

export function buildFollowUpDocx({
  report,
  items,
  language,
  t,
  categoryLabel,
  now = new Date(),
}: FollowUpExportOptions): Document {
  const date = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const topic = report.base.topic;
  const errorCats = new Set(report.categories.filter((c) => !c.expression).map((c) => c.category));
  const covered = new Set(items.map((i) => i.category));
  const errorMistakes = report.insights.mistakes.filter((m) => errorCats.has(m.category));
  const mistakes = [...(errorMistakes.length ? errorMistakes : report.insights.mistakes)].sort(
    (a, b) => Number(covered.has(b.category)) - Number(covered.has(a.category)),
  );
  const o = { t, language, categoryLabel };

  const fix = items.filter((i) => i.exercise.type === "error-correction");
  const fill = items.filter((i) => i.exercise.type === "fill-blank");
  const ordered = [...fix, ...fill];

  const children: (Paragraph | Table)[] = [
    para([run(t("languageCheck.followUp.docLabel"), { bold: true, color: C.muted, size: 22, caps: true, spacing: 40 })], {
      after: 40,
    }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { before: 0, after: 80 },
      children: [run(t("languageCheck.followUp.docTitle"), { bold: true, color: C.ink, size: 52 })],
    }),
    para(
      [
        run(topic.title, { color: C.muted, size: 24 }),
        ...(topic.className ? [run(`   ·   ${topic.className}`, { color: C.muted, size: 24 })] : []),
      ],
      { after: 160 },
    ),
    new Table({
      width: { size: WIDTH, type: WidthType.DXA },
      columnWidths: [Math.floor(WIDTH * 0.5), Math.floor(WIDTH * 0.25), WIDTH - Math.floor(WIDTH * 0.5) - Math.floor(WIDTH * 0.25)],
      layout: TableLayoutType.FIXED,
      borders: NO_BORDERS,
      rows: [
        new TableRow({
          children: ["name", "class", "date"].map((k, i) =>
            new TableCell({
              width: { size: [Math.floor(WIDTH * 0.5), Math.floor(WIDTH * 0.25), WIDTH - Math.floor(WIDTH * 0.75)][i], type: WidthType.DXA },
              borders: { top: NONE, left: NONE, right: NONE, bottom: edge("94A3B8", 8) },
              margins: { top: 140, bottom: 40, left: 0, right: 160 },
              children: [para([run(`${t(`languageCheck.followUp.${k}`)}:`, { color: C.muted, size: 20 })], { after: 0 })],
            }),
          ),
        }),
      ],
    }),
    gap(200),
    ...summaryBlocks(report, mistakes, o),
    new Paragraph({
      pageBreakBefore: true,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: "", size: 2 })],
    }),
    ...sectionBanner(
      t("languageCheck.followUp.part2"),
      t("languageCheck.followUp.part2Hint", { count: ordered.length }),
    ),
  ];

  let n = 0;
  const section = (label: string, instr: string, list: FollowUpItem[]) => {
    if (list.length === 0) return;
    children.push(
      para([run(label, { bold: true, color: C.ink, size: 26 })], { before: 120, after: 30, keepNext: true }),
      para([run(instr, { color: C.muted, size: 20 })], { after: 120, keepNext: true }),
    );
    for (const it of list) {
      n += 1;
      children.push(...exerciseBlock(it.exercise, n, it.category, o));
    }
  };
  section(t("languageCheck.followUp.sectionA"), t("languageCheck.followUp.instructionA"), fix);
  section(t("languageCheck.followUp.sectionB"), t("languageCheck.followUp.instructionB"), fill);

  children.push(...answerKey(ordered, o));
  children.push(
    para([run(t("languageCheck.export.generatedBy", { date }), { italics: true, color: C.muted, size: 18 })], {
      before: 300,
      align: AlignmentType.CENTER,
    }),
  );

  return new Document({
    creator: "Mr.🆖 ProReader",
    title: `${t("languageCheck.followUp.docTitle")} – ${topic.title}`,
    styles: {
      default: { document: { run: { font: FONT, size: 22, color: C.body } } },
      paragraphStyles: [
        { id: "Title", name: "Title", basedOn: "Normal", next: "Normal", quickFormat: true, run: { bold: true, size: 52, color: C.ink } },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: 16838 },
            margin: { top: 1200, bottom: 1100, left: MARGIN, right: MARGIN, header: 560, footer: 520 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                spacing: { after: 0 },
                border: { bottom: edge(C.line) },
                children: [
                  run(t("languageCheck.followUp.docTitle"), { bold: true, color: C.ink, size: 18 }),
                  run(`   ·   ${topic.title}`, { color: C.muted, size: 18 }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: WIDTH }],
                spacing: { before: 0, after: 0 },
                children: [
                  run(date, { color: C.muted, size: 18 }),
                  new TextRun({
                    color: C.muted,
                    size: 18,
                    children: ["\t", `${t("languageCheck.learnExport.page")} `, PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES],
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}

export async function exportFollowUpDocx(options: FollowUpExportOptions): Promise<void> {
  const blob = await Packer.toBlob(buildFollowUpDocx(options));
  const safe =
    options.report.base.topic.title.replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 60) || "topic";
  saveAs(blob, `${safe} - follow-up exercise.docx`);
}
