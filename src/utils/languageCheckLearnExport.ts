import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  HeightRule,
  LeaderType,
  LineRuleType,
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
  VerticalAlign,
  WidthType,
  type ParagraphChild,
} from "docx";
import { saveAs } from "file-saver";
import { DEFAULT_CATEGORY_STYLE, LANGUAGE_CHECK_CATEGORY_STYLES, type LanguageCheckCategory } from "@/constants/languageCheck";
import { diffChanges } from "@/utils/languageCheck";
import {
  exerciseInstructionKey,
  exerciseTypeKey,
  levelKeyForAge,
  mistakeMark,
  pickLang,
  splitAtBlanks,
  type LearnExercise,
  type LearnLesson,
} from "@/utils/languageCheckLearn";
import { exerciseSolution } from "@/utils/languageCheckLearnGrade";
import type { LearnSessionWire, LearnUnitWire } from "@/utils/languageCheckLearnWire";

/**
 * Word export of a "Learn from your mistakes" session: cover, then per topic the
 * Lesson, Practice and Quiz laid out like the on-screen cards (same colours,
 * same order). `withAnswers` switches between a blank worksheet and an answer
 * key (correct options, filled gaps, model answers, explanations). Pure: builds
 * a `Document`; `exportLearnDocx` below saves it.
 */

type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface LearnExportOptions {
  session: LearnSessionWire;
  language: "en" | "zh";
  withAnswers: boolean;
  t: Translate;
  categoryLabel: (category: string) => string;
  /** Overridable for tests. */
  now?: Date;
}

// ─── Palette (the Tailwind slate / red / green / amber / sky shades the screen uses) ─

const C = {
  ink: "0F172A",
  body: "1E293B",
  muted: "64748B",
  line: "E2E8F0",
  soft: "F1F5F9",
  white: "FFFFFF",
  red: "B91C1C",
  redSoft: "FEE2E2",
  redBg: "FEF2F2",
  green: "166534",
  greenBar: "22C55E",
  greenSoft: "DCFCE7",
  greenBg: "F0FDF4",
  amber: "D97706",
  amberInk: "78350F",
  amberBg: "FFFBEB",
  amberLine: "FCD34D",
  sky: "0369A1",
  skyBg: "F0F9FF",
  skyLine: "7DD3FC",
} as const;

const PAGE_WIDTH = 11906;
const MARGIN = 1134;
const WIDTH = PAGE_WIDTH - MARGIN * 2;
const FONT = { ascii: "Calibri", hAnsi: "Calibri", eastAsia: "Microsoft JhengHei" };
const MONO = { ascii: "Consolas", hAnsi: "Consolas", eastAsia: "Microsoft JhengHei" };
const BLANK = "\u00A0".repeat(16);

// ─── Building blocks ─────────────────────────────────────────────────────────

const NONE = { style: BorderStyle.NONE, size: 0, color: C.white } as const;
const line = (color: string, size = 6) => ({ style: BorderStyle.SINGLE, size, color }) as const;
const shade = (fill: string) => ({ type: ShadingType.CLEAR, fill, color: "auto" }) as const;

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
    mono?: boolean;
    caps?: boolean;
    spacing?: number;
    chip?: string;
  } = {},
): TextRun {
  return new TextRun({
    text: text,
    bold: o.bold,
    italics: o.italics,
    color: o.color ?? C.body,
    size: o.size,
    strike: o.strike,
    underline: o.underline ? {} : undefined,
    shading: o.fill ? shade(o.fill) : undefined,
    font: o.mono ? MONO : undefined,
    allCaps: o.caps,
    characterSpacing: o.spacing,
    border: o.chip ? line(o.chip, 4) : undefined,
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
    bottom?: string;
  } = {},
): Paragraph {
  return new Paragraph({
    children,
    keepNext: o.keepNext,
    alignment: o.align,
    shading: o.fill ? shade(o.fill) : undefined,
    indent: o.indent ? { left: o.indent } : undefined,
    border: {
      ...(o.bar ? { left: { style: BorderStyle.SINGLE, size: 24, color: o.bar, space: 8 } } : {}),
      ...(o.bottom ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: o.bottom, space: 8 } } : {}),
    },
    spacing: { before: o.before ?? 0, after: o.after ?? 80, line: o.line ?? 288 },
  });
}

/** A thin unshaded paragraph: separates tables (Word merges adjacent ones) and shaded blocks. */
function gap(height = 140): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: "", size: 2 })],
    spacing: { before: 0, after: 0, line: height, lineRule: LineRuleType.EXACT },
  });
}

interface BoxOptions {
  fill?: string;
  border?: string;
  bar?: string;
  barSize?: number;
  pad?: number;
  cantSplit?: boolean;
}

function cellBorders(o: BoxOptions) {
  const edge = o.border ? line(o.border) : NONE;
  return {
    top: edge,
    bottom: edge,
    right: edge,
    left: o.bar ? line(o.bar, o.barSize ?? 36) : edge,
  };
}

function boxCell(children: Paragraph[], o: BoxOptions, width = WIDTH): TableCell {
  const pad = o.pad ?? 170;
  return new TableCell({
    children,
    width: { size: width, type: WidthType.DXA },
    shading: o.fill ? shade(o.fill) : undefined,
    borders: cellBorders(o),
    margins: { top: pad - 40, bottom: pad - 40, left: pad + 30, right: pad },
    verticalAlign: VerticalAlign.TOP,
  });
}

/** A card: one bordered, optionally tinted cell with an optional coloured left bar. */
function box(children: Paragraph[], o: BoxOptions = {}): Table {
  return new Table({
    width: { size: WIDTH, type: WidthType.DXA },
    columnWidths: [WIDTH],
    layout: TableLayoutType.FIXED,
    borders: {
      top: NONE,
      bottom: NONE,
      left: NONE,
      right: NONE,
      insideHorizontal: NONE,
      insideVertical: NONE,
    },
    rows: [new TableRow({ cantSplit: o.cantSplit ?? true, children: [boxCell(children, o)] })],
  });
}

/** Stacked rows that read as one card (wrong / right / why). */
function stack(
  rows: { children: Paragraph[]; fill?: string }[],
  border: string,
): Table {
  return new Table({
    width: { size: WIDTH, type: WidthType.DXA },
    columnWidths: [WIDTH],
    layout: TableLayoutType.FIXED,
    borders: {
      top: NONE,
      bottom: NONE,
      left: NONE,
      right: NONE,
      insideHorizontal: NONE,
      insideVertical: NONE,
    },
    rows: rows.map(
      (r, i) =>
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              children: r.children,
              width: { size: WIDTH, type: WidthType.DXA },
              shading: r.fill ? shade(r.fill) : undefined,
              borders: {
                left: line(border),
                right: line(border),
                top: i === 0 ? line(border) : i === 1 ? NONE : line(border),
                bottom: i === rows.length - 1 ? line(border) : NONE,
              },
              margins: { top: 90, bottom: 90, left: 200, right: 200 },
            }),
          ],
        }),
    ),
  });
}

function sectionTitle(text: string, tone: string): Paragraph {
  return para(
    [
      run("■ ", { color: tone, size: 18 }),
      run(text, { bold: true, color: C.muted, size: 19, caps: true, spacing: 24 }),
    ],
    { before: 300, after: 130, keepNext: true },
  );
}

/**
 * Writing lines: a tab with an underscore leader runs to the right edge. (Bottom
 * borders on neighbouring paragraphs would be merged by Word into one line.)
 */
function ruledLines(count: number): Paragraph[] {
  return Array.from(
    { length: count },
    () =>
      new Paragraph({
        tabStops: [
          { type: TabStopType.RIGHT, position: WIDTH - 520, leader: LeaderType.UNDERSCORE },
        ],
        spacing: { before: 200, after: 0, line: 300 },
        children: [new TextRun({ children: ["\t"], color: "94A3B8", size: 22 })],
      }),
  );
}

/** Small rounded-looking label: "1 of 6", "Fill in the blank". */
function chips(...labels: { text: string; strong?: boolean }[]): ParagraphChild[] {
  return labels.flatMap((l, i) => [
    ...(i > 0 ? [run("  ", { size: 18 })] : []),
    l.strong
      ? run(` ${l.text} `, { bold: true, size: 18, fill: C.soft, color: C.ink })
      : run(` ${l.text} `, { size: 18, color: C.muted, chip: C.line }),
  ]);
}

function categoryHex(category: string): string {
  return (
    LANGUAGE_CHECK_CATEGORY_STYLES[category as LanguageCheckCategory] ?? DEFAULT_CATEGORY_STYLE
  ).hex;
}

// ─── Lesson ──────────────────────────────────────────────────────────────────

function lessonBlocks(
  unit: LearnUnitWire,
  lesson: LearnLesson,
  ctx: Ctx,
): (Paragraph | Table)[] {
  const { t, language } = ctx;
  const out: (Paragraph | Table)[] = [];
  const hex = categoryHex(unit.category);
  const title = pickLang(lesson.title, lesson.titleZh, language) || ctx.categoryLabel(unit.category);
  const why = pickLang(lesson.whyItMatters, lesson.whyItMattersZh, language);

  out.push(
    box(
      [
        para(
          [
            run(
              `${t("languageCheck.learn.lesson.label")} · ${ctx.categoryLabel(unit.category)}`,
              { bold: true, color: C.muted, size: 18, caps: true, spacing: 24 },
            ),
          ],
          { after: 60 },
        ),
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 0, after: 100 },
          children: [run(title, { bold: true, color: C.ink, size: 40 })],
        }),
        para(
          [
            run("◎  ", { color: C.ink, size: 26 }),
            run(pickLang(lesson.summary, lesson.summaryZh, language), { size: 26 }),
          ],
          { after: why ? 100 : 0, line: 312 },
        ),
        ...(why ? [para([run(why, { color: C.muted, size: 21 })], { after: 0 })] : []),
      ],
      { border: C.line, bar: hex, barSize: 48, pad: 230 },
    ),
    gap(),
  );

  if (unit.samples.length > 0) {
    out.push(
      sectionTitle(
        t("languageCheck.learn.lesson.yourMistakes", { count: unit.mistakeCount }),
        "F43F5E",
      ),
      mistakesGrid(unit, ctx),
    );
  }

  out.push(sectionTitle(t("languageCheck.learn.lesson.theRule"), C.ink));
  lesson.rules.forEach((rule, i) => {
    const heading = pickLang(rule.heading, rule.headingZh, language);
    const inside: Paragraph[] = [
      para(
        [
          run(` ${i + 1} `, { bold: true, color: C.white, fill: C.ink, size: 22 }),
          ...(heading ? [run("  "), run(heading, { bold: true, color: C.ink, size: 25 })] : []),
        ],
        { after: 100 },
      ),
      para([run(pickLang(rule.explanation, rule.explanationZh, language), { size: 23 })], {
        after: rule.pattern || rule.examples.length ? 110 : 0,
        line: 312,
      }),
    ];
    if (rule.pattern) {
      inside.push(
        para([run(` ${rule.pattern} `, { mono: true, size: 21, color: C.ink })], {
          fill: C.soft,
          after: rule.examples.length ? 0 : 0,
          line: 320,
        }),
      );
      if (rule.examples.length) inside.push(gap(100));
    }
    rule.examples.forEach((example, j) => {
      inside.push(
        para([run(example, { size: 23 })], {
          fill: C.greenBg,
          bar: C.greenBar,
          indent: 160,
          after: 0,
          line: 330,
        }),
      );
      if (j < rule.examples.length - 1) inside.push(gap(70));
    });
    out.push(box(inside, { border: C.line, cantSplit: true }), gap());
  });

  if (lesson.contrasts.length > 0) {
    out.push(sectionTitle(t("languageCheck.learn.lesson.commonMistakes"), "F59E0B"));
    for (const pair of lesson.contrasts) {
      const why2 = pickLang(pair.why, pair.whyZh, language);
      out.push(
        stack(
          [
            {
              fill: C.redBg,
              children: [
                para(
                  [
                    run(`${t("languageCheck.learn.lesson.wrong")}   `, {
                      bold: true,
                      color: C.red,
                      size: 16,
                      caps: true,
                    }),
                    run(pair.wrong, { color: C.muted, strike: true, size: 23 }),
                  ],
                  { after: 0, keepNext: true },
                ),
              ],
            },
            {
              fill: C.greenBg,
              children: [
                para(
                  [
                    run(`${t("languageCheck.learn.lesson.right")}   `, {
                      bold: true,
                      color: C.green,
                      size: 16,
                      caps: true,
                    }),
                    run(pair.right, { bold: true, color: C.ink, size: 23 }),
                  ],
                  { after: 0, keepNext: why2 !== "" },
                ),
              ],
            },
            ...(why2
              ? [{ children: [para([run(why2, { color: C.muted, size: 20 })], { after: 0 })] }]
              : []),
          ],
          C.line,
        ),
        gap(110),
      );
    }
  }

  if (lesson.chineseTransfer) {
    out.push(
      sectionTitle(t("languageCheck.learn.lesson.chineseTransfer"), "0EA5E9"),
      box(
        [
          para(
            [
              run(
                pickLang(
                  lesson.chineseTransfer.explanation,
                  lesson.chineseTransfer.explanationZh,
                  language,
                ),
                { size: 23 },
              ),
            ],
            { after: 0, line: 312 },
          ),
        ],
        { fill: C.skyBg, border: C.skyLine },
      ),
      gap(),
    );
  }

  if (lesson.tips.length > 0) {
    out.push(sectionTitle(t("languageCheck.learn.lesson.tips"), "F59E0B"));
    for (const tip of lesson.tips) {
      out.push(
        box(
          [
            para(
              [
                run("●  ", { color: C.amber, size: 20 }),
                run(pickLang(tip.tip, tip.tipZh, language), { size: 23 }),
              ],
              { after: 0 },
            ),
          ],
          { fill: C.amberBg, border: C.line, pad: 130 },
        ),
        gap(90),
      );
    }
  }
  return out;
}

/** The learner's own mistakes: two cards per row, like the on-screen grid. */
function mistakesGrid(unit: LearnUnitWire, ctx: Ctx): Table {
  const { t } = ctx;
  const gutter = 200;
  const col = Math.floor((WIDTH - gutter) / 2);
  const samples = unit.samples.slice(0, 4);

  const card = (sample: (typeof samples)[number]): TableCell => {
    const changes = diffChanges(sample.original, sample.correction);
    // The quoted sentence with the mistake marked like the card on screen:
    // wrong words underlined in red, a missing word/phrase as a red ^.
    const mark = mistakeMark(sample);
    const quote: ParagraphChild[] = [run("“", { color: C.muted, size: 21 })];
    if (mark?.kind === "underline") {
      quote.push(
        run(mark.before, { color: C.muted, size: 21 }),
        run(mark.mistake, { color: C.red, size: 21, underline: true }),
        run(mark.after, { color: C.muted, size: 21 }),
      );
    } else if (mark?.kind === "insert") {
      // Separate the caret from the word before it (no double space).
      const caret = (mark.before && !/\s$/.test(mark.before) ? " " : "") + "^";
      quote.push(
        run(mark.before, { color: C.muted, size: 21 }),
        run(caret, { bold: true, color: C.red, size: 21 }),
        run(mark.after, { color: C.muted, size: 21 }),
      );
    } else {
      quote.push(run(sample.sentence, { color: C.muted, size: 21 }));
    }
    quote.push(run("”", { color: C.muted, size: 21 }));
    const kids: Paragraph[] = [
      para(quote, { after: 110 }),
      ...changes.map((c) =>
        para(
          [
            c.removed
              ? run(` ${c.removed} `, { bold: true, color: C.red, fill: C.redSoft, strike: true, size: 21 })
              : run(` ${t("languageCheck.results.insert")} `, { italics: true, color: C.muted, fill: C.soft, size: 19 }),
            run("   →   ", { color: C.muted, size: 21 }),
            c.added
              ? run(` ${c.added} `, { bold: true, color: C.green, fill: C.greenSoft, size: 21 })
              : run(` ${t("languageCheck.results.delete")} `, { italics: true, color: C.muted, fill: C.soft, size: 19 }),
          ],
          { after: 70 },
        ),
      ),
    ];
    if (sample.explanation) {
      kids.push(para([run(sample.explanation, { size: 21 })], { before: 40, after: 0, line: 276 }));
    }
    return boxCell(kids, { border: C.line, pad: 140 }, col);
  };

  const empty = (width: number) =>
    new TableCell({
      children: [gap(20)],
      width: { size: width, type: WidthType.DXA },
      borders: { top: NONE, bottom: NONE, left: NONE, right: NONE },
    });

  const rows: TableRow[] = [];
  for (let i = 0; i < samples.length; i += 2) {
    rows.push(
      new TableRow({
        cantSplit: true,
        children: [
          card(samples[i]),
          empty(gutter),
          samples[i + 1] ? card(samples[i + 1]) : empty(col),
        ],
      }),
    );
    if (i + 2 < samples.length) {
      rows.push(
        new TableRow({
          height: { value: 140, rule: HeightRule.EXACT },
          children: [empty(col), empty(gutter), empty(col)],
        }),
      );
    }
  }
  return new Table({
    width: { size: WIDTH, type: WidthType.DXA },
    columnWidths: [col, gutter, col],
    layout: TableLayoutType.FIXED,
    borders: {
      top: NONE,
      bottom: NONE,
      left: NONE,
      right: NONE,
      insideHorizontal: NONE,
      insideVertical: NONE,
    },
    rows,
  });
}

// ─── Exercises (practice + quiz) ─────────────────────────────────────────────

function alsoAccepted(options: string[], ctx: Ctx): Paragraph[] {
  const extra = options.filter(Boolean);
  if (extra.length === 0) return [];
  return [
    para(
      [
        run(`${ctx.t("languageCheck.learnExport.alsoAccepted")}: `, { color: C.muted, size: 20 }),
        run(extra.join(" / "), { color: C.muted, size: 20 }),
      ],
      { after: 60 },
    ),
  ];
}

function prompt(item: LearnExercise, ctx: Ctx): Paragraph[] {
  const { t } = ctx;
  const out: Paragraph[] = [];
  const key = exerciseInstructionKey(item);
  if (key) {
    out.push(
      para(
        [run(t(`languageCheck.learn.exercise.instructions.${key}`), { bold: true, color: C.muted, size: 21 })],
        { after: 110, keepNext: true },
      ),
    );
  }
  if (item.type === "choice") {
    out.push(
      para(
        splitAtBlanks(item.question).flatMap((part, i, all) => [
          run(part, { bold: true, size: 26 }),
          ...(i < all.length - 1 ? [run(BLANK.slice(0, 8), { size: 26, underline: true })] : []),
        ]),
        { after: 120, line: 312, keepNext: true },
      ),
    );
  }
  if (item.type === "reorder" && item.context) {
    out.push(para([run(item.context, { italics: true, color: C.muted, size: 23 })], { after: 110 }));
  }
  if (item.type === "rewrite" || item.type === "compose") {
    out.push(para([run(item.instruction, { bold: true, size: 24 })], { after: 110, keepNext: true }));
    if (item.type === "rewrite" && item.source) {
      out.push(
        para([run(item.source, { size: 26 })], {
          fill: C.soft,
          bar: "94A3B8",
          indent: 160,
          before: 20,
          after: 120,
          line: 330,
        }),
      );
    }
  }
  return out;
}

function answerArea(item: LearnExercise, ctx: Ctx): Paragraph[] {
  const { t, withAnswers } = ctx;
  switch (item.type) {
    case "choice":
      return item.options.map((option, i) => {
        const right = withAnswers && option === item.answer;
        return para(
          [
            run(` ${String.fromCharCode(65 + i)} `, {
              bold: true,
              size: 22,
              color: right ? C.green : C.ink,
              chip: right ? C.greenBar : "94A3B8",
              fill: right ? C.greenSoft : undefined,
            }),
            run("   "),
            run(option, { size: 24, bold: right }),
            ...(right ? [run("   ✓", { bold: true, color: C.green, size: 24 })] : []),
          ],
          {
            fill: right ? C.greenBg : undefined,
            bar: right ? C.greenBar : undefined,
            indent: right ? 160 : 0,
            after: 70,
            before: 30,
            line: 300,
          },
        );
      });

    case "fill-blank": {
      const parts = splitAtBlanks(item.sentence);
      const sentence = para(
        parts.flatMap((part, i) => [
          run(part, { size: 26 }),
          ...(i < parts.length - 1
            ? [
                withAnswers
                  ? run(` ${item.answers[i][0]} `, {
                      bold: true,
                      color: C.green,
                      fill: C.greenSoft,
                      size: 26,
                      underline: true,
                    })
                  : run(BLANK, { size: 26, underline: true }),
              ]
            : []),
        ]),
        { after: 100, line: 400 },
      );
      return [
        sentence,
        ...(withAnswers
          ? item.answers.flatMap((a, i) =>
              alsoAccepted(
                a.slice(1).map((x) => (item.answers.length > 1 ? `(${i + 1}) ${x}` : x)),
                ctx,
              ),
            )
          : []),
      ];
    }

    case "reorder":
      return [
        para(
          [
            ...item.tokens.flatMap((token, i) => [
              ...(i > 0 ? [run("  ", { size: 26 })] : []),
              run(` ${token} `, { size: 25, fill: C.soft, chip: "94A3B8" }),
            ]),
          ],
          { after: 130, line: 440 },
        ),
        ...(withAnswers
          ? [
              para([run(item.answer, { bold: true, color: C.green, size: 25 })], {
                fill: C.greenBg,
                bar: C.greenBar,
                indent: 160,
                after: 80,
                line: 320,
              }),
              ...alsoAccepted(item.alternatives, ctx),
            ]
          : ruledLines(2)),
      ];

    case "error-correction":
    case "proofread": {
      if (!withAnswers) {
        return [
          para([run(item.passage, { size: 26 })], { after: 140, line: 400 }),
          para([run(t("languageCheck.learn.exercise.yourFixes"), { bold: true, color: C.muted, size: 19, caps: true, spacing: 20 })], {
            after: 0,
            keepNext: true,
          }),
          ...ruledLines(item.type === "proofread" ? 4 : 1),
        ];
      }
      const marked: ParagraphChild[] = [];
      let cursor = 0;
      for (const e of item.errors) {
        marked.push(run(item.passage.slice(cursor, e.start), { size: 26 }));
        marked.push(run(e.wrong, { color: C.red, fill: C.redSoft, strike: true, bold: true, size: 26 }));
        marked.push(
          run(` ${e.right[0] || t("languageCheck.results.delete")} `, {
            color: C.green,
            fill: C.greenSoft,
            bold: true,
            size: 26,
          }),
        );
        cursor = e.end;
      }
      marked.push(run(item.passage.slice(cursor), { size: 26 }));
      return [para(marked, { after: 120, line: 420 })];
    }

    case "rewrite":
      return withAnswers
        ? [
            para([run(item.answers[0], { bold: true, color: C.green, size: 25 })], {
              fill: C.greenBg,
              bar: C.greenBar,
              indent: 160,
              after: 80,
              line: 320,
            }),
            ...alsoAccepted(item.answers.slice(1), ctx),
          ]
        : ruledLines(3);

    case "compose":
      return withAnswers
        ? [
            para([run(item.modelAnswer, { bold: true, color: C.green, size: 25 })], {
              fill: C.greenBg,
              bar: C.greenBar,
              indent: 160,
              after: 100,
              line: 320,
            }),
            para(
              [
                run(`${t("languageCheck.learnExport.criteria")}: `, { bold: true, color: C.muted, size: 20 }),
                run(item.criteria, { color: C.muted, size: 20 }),
              ],
              { after: 60 },
            ),
          ]
        : ruledLines(6);
  }
}

/** Model solution + rule behind it, as shown after answering on screen. */
function solutionNotes(item: LearnExercise, ctx: Ctx): Paragraph[] {
  const { t } = ctx;
  const out: Paragraph[] = [];
  const explanation = pickLang(item.explanation, item.explanationZh, ctx.language);
  const label =
    item.type === "choice"
      ? t("languageCheck.learn.exercise.correctAnswer")
      : t("languageCheck.learn.exercise.modelAnswer");
  const showLine = item.type === "error-correction" || item.type === "proofread";
  if (showLine) {
    out.push(
      para(
        [
          run(`${label}: `, { bold: true, size: 22 }),
          run(exerciseSolution(item), { bold: true, color: C.green, size: 22 }),
        ],
        { fill: C.greenBg, bar: C.greenBar, indent: 160, after: 80, line: 300 },
      ),
    );
  }
  if (explanation) {
    out.push(para([run(explanation, { color: C.muted, size: 21 })], { after: 60, line: 288 }));
  }
  if (showLine && (item.type === "error-correction" || item.type === "proofread")) {
    for (const e of item.errors) {
      const note = pickLang(e.explanation, e.explanationZh, ctx.language);
      out.push(
        para(
          [
            run(e.wrong, { color: C.red, bold: true, strike: true, size: 21 }),
            run("  →  ", { color: C.muted, size: 21 }),
            run(e.right[0] || t("languageCheck.results.delete"), { color: C.green, bold: true, size: 21 }),
            ...(note ? [run(` — ${note}`, { color: C.muted, size: 21 })] : []),
          ],
          { after: 40 },
        ),
      );
    }
  }
  return out;
}

function exerciseCard(
  item: LearnExercise,
  index: number,
  total: number,
  mode: "practice" | "quiz",
  ctx: Ctx,
): (Paragraph | Table)[] {
  const { t, withAnswers } = ctx;
  const body: Paragraph[] = [
    para(
      chips(
        {
          text: t("languageCheck.learn.exercise.counter", { current: index + 1, total }),
          strong: true,
        },
        { text: t(`languageCheck.learn.exercise.types.${exerciseTypeKey(item.type)}`) },
      ),
      { after: 150, keepNext: true },
    ),
    ...prompt(item, ctx),
    ...answerArea(item, ctx),
  ];
  if (mode === "practice" && item.hint) {
    body.push(
      para(
        [
          run(`${t("languageCheck.learn.exercise.hint")}: `, { bold: true, color: C.amberInk, size: 21 }),
          run(item.hint, { color: C.amberInk, size: 21 }),
        ],
        { fill: C.amberBg, before: 60, after: 60, line: 288 },
      ),
    );
  }
  if (withAnswers) body.push(...solutionNotes(item, ctx));
  return [box(body, { border: C.line, pad: 190 }), gap(170)];
}

// ─── Stages, cover, document ─────────────────────────────────────────────────

interface Ctx {
  t: Translate;
  language: "en" | "zh";
  withAnswers: boolean;
  categoryLabel: (category: string) => string;
}

function stageBanner(
  unit: LearnUnitWire,
  stage: "practice" | "quiz",
  description: string,
  ctx: Ctx,
): (Paragraph | Table)[] {
  const { t } = ctx;
  return [
    new Paragraph({
      pageBreakBefore: true,
      children: [new TextRun({ text: "", size: 2 })],
      spacing: { before: 0, after: 0, line: 20, lineRule: LineRuleType.EXACT },
    }),
    box(
      [
        para(
          [
            run(`${t(`languageCheck.learn.path.${stage}`)} · ${ctx.categoryLabel(unit.category)}`, {
              bold: true,
              color: C.muted,
              size: 18,
              caps: true,
              spacing: 24,
            }),
          ],
          { after: 60 },
        ),
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 0, after: 80 },
          children: [
            run(
              stage === "practice"
                ? t("languageCheck.learnExport.practiceTitle")
                : t("languageCheck.learn.quiz.introTitle"),
              { bold: true, color: C.ink, size: 40 },
            ),
          ],
        }),
        para([run(description, { color: C.muted, size: 22 })], { after: 0 }),
      ],
      { border: C.line, bar: categoryHex(unit.category), barSize: 48, pad: 230 },
    ),
    gap(220),
  ];
}

function missing(text: string): (Paragraph | Table)[] {
  return [
    box([para([run(text, { italics: true, color: C.muted, size: 22 })], { after: 0, align: AlignmentType.CENTER })], {
      border: C.line,
    }),
    gap(),
  ];
}

function unitBlocks(unit: LearnUnitWire, ctx: Ctx): (Paragraph | Table)[] {
  const { t } = ctx;
  const out: (Paragraph | Table)[] = [];

  if (unit.lesson) out.push(...lessonBlocks(unit, unit.lesson, ctx));
  else out.push(...missing(t("languageCheck.learnData.detail.noLesson")));

  const practice = unit.practice ?? [];
  out.push(
    ...stageBanner(
      unit,
      "practice",
      t("languageCheck.learnExport.practiceIntro", { count: practice.length }),
      ctx,
    ),
  );
  if (practice.length === 0) out.push(...missing(t("languageCheck.learnData.detail.noPractice")));
  practice.forEach((item, i) =>
    out.push(...exerciseCard(item, i, practice.length, "practice", ctx)),
  );

  const quiz = unit.quiz ?? [];
  out.push(
    ...stageBanner(
      unit,
      "quiz",
      t("languageCheck.learn.quiz.introBody", { count: quiz.length }),
      ctx,
    ),
  );
  if (quiz.length === 0) out.push(...missing(t("languageCheck.learnData.detail.noQuiz")));
  quiz.forEach((item, i) => out.push(...exerciseCard(item, i, quiz.length, "quiz", ctx)));
  return out;
}

function cover(session: LearnSessionWire, ctx: Ctx, date: string): (Paragraph | Table)[] {
  const { t } = ctx;
  const level = t(`reading.levels.${levelKeyForAge(session.age)}`);
  const title = session.essayTitle || t("languageCheck.list.untitled");
  const out: (Paragraph | Table)[] = [
    new Paragraph({
      spacing: { before: 600, after: 60 },
      children: [
        run(t("languageCheck.learn.title"), { bold: true, color: C.muted, size: 24, caps: true, spacing: 40 }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { before: 0, after: 160 },
      children: [run(title, { bold: true, color: C.ink, size: 64 })],
    }),
    para(
      [
        ctx.withAnswers
          ? run(` ${t("languageCheck.learnExport.versionAnswers")} `, {
              bold: true,
              color: C.green,
              fill: C.greenSoft,
              size: 20,
              caps: true,
              spacing: 16,
            })
          : run(` ${t("languageCheck.learnExport.versionStudent")} `, {
              bold: true,
              color: C.ink,
              fill: C.soft,
              size: 20,
              caps: true,
              spacing: 16,
            }),
        run(
          `    ${t("languageCheck.learnExport.subtitle", { count: session.units.length, level, date })}`,
          { color: C.muted, size: 22 },
        ),
      ],
      { after: 100, bottom: C.line },
    ),
    sectionTitle(t("languageCheck.learnExport.topics"), C.ink),
  ];
  session.units.forEach((unit, i) => {
    const counts = [
      unit.lesson ? t("languageCheck.learn.path.lesson") : null,
      unit.practice?.length
        ? `${t("languageCheck.learn.path.practice")} (${unit.practice.length})`
        : null,
      unit.quiz?.length ? `${t("languageCheck.learn.path.quiz")} (${unit.quiz.length})` : null,
    ].filter(Boolean);
    out.push(
      box(
        [
          para(
            [
              run(`${i + 1}.  `, { bold: true, color: C.muted, size: 24 }),
              run(ctx.categoryLabel(unit.category), { bold: true, color: C.ink, size: 26 }),
              run(
                `     ${t("languageCheck.learnExport.mistakes", { count: unit.mistakeCount })}`,
                { color: C.muted, size: 21 },
              ),
            ],
            { after: counts.length ? 40 : 0 },
          ),
          ...(counts.length
            ? [para([run(counts.join("  ·  "), { color: C.muted, size: 20 })], { after: 0, indent: 400 })]
            : []),
        ],
        { border: C.line, bar: categoryHex(unit.category), barSize: 36, pad: 130 },
      ),
      gap(100),
    );
  });
  return out;
}

export function buildLearnDocx({
  session,
  language,
  withAnswers,
  t,
  categoryLabel,
  now = new Date(),
}: LearnExportOptions): Document {
  const ctx: Ctx = { t, language, withAnswers, categoryLabel };
  const date = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const title = session.essayTitle || t("languageCheck.list.untitled");

  const children: (Paragraph | Table)[] = [...cover(session, ctx, date)];
  session.units.forEach((unit, i) => {
    // Every topic starts on a fresh page; its first block is the lesson header.
    children.push(
      new Paragraph({
        pageBreakBefore: true,
        children: [new TextRun({ text: "", size: 2 })],
        spacing: { before: 0, after: 0, line: 20, lineRule: LineRuleType.EXACT },
      }),
      ...unitBlocks(unit, ctx),
    );
    void i;
  });
  children.push(
    para(
      [
        run(t("languageCheck.export.generatedBy", { date }), { italics: true, color: C.muted, size: 18 }),
      ],
      { before: 360, align: AlignmentType.CENTER },
    ),
  );

  const versionLabel = withAnswers
    ? t("languageCheck.learnExport.versionAnswers")
    : t("languageCheck.learnExport.versionStudent");

  return new Document({
    creator: "Mr.🆖 ProReader",
    title: `${t("languageCheck.learn.title")} – ${title}`,
    styles: {
      default: { document: { run: { font: FONT, size: 22, color: C.body } } },
      paragraphStyles: [
        {
          id: "Title",
          name: "Title",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { bold: true, size: 64, color: C.ink },
        },
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { bold: true, size: 40, color: C.ink },
          paragraph: { keepNext: true },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: 16838 },
            margin: { top: 1300, bottom: 1200, left: MARGIN, right: MARGIN, header: 560, footer: 520 },
          },
        },
        headers: {
          default: new Header({
            children: [
              para(
                [
                  run(t("languageCheck.learn.title"), { bold: true, color: C.ink, size: 18 }),
                  run(`   ·   ${title}`, { color: C.muted, size: 18 }),
                ],
                { after: 0, bottom: C.line },
              ),
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
                  run(versionLabel, { color: C.muted, size: 18 }),
                  new TextRun({
                    color: C.muted,
                    size: 18,
                    children: [
                      "\t",
                      `${t("languageCheck.learnExport.page")} `,
                      PageNumber.CURRENT,
                      " / ",
                      PageNumber.TOTAL_PAGES,
                    ],
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

/** Builds the Word file and hands it to the browser as a download. */
export async function exportLearnDocx(options: LearnExportOptions): Promise<void> {
  const doc = buildLearnDocx(options);
  const blob = await Packer.toBlob(doc);
  const safe =
    (options.session.essayTitle || "essay").replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 60) ||
    "essay";
  saveAs(
    blob,
    `${safe} - learn from mistakes${options.withAnswers ? " - model answers" : ""}.docx`,
  );
}
