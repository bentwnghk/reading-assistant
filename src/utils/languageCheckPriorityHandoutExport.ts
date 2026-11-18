import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LineRuleType,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TabStopType,
  TextRun,
  type ParagraphChild,
} from "docx";
import { saveAs } from "file-saver";
import {
  C,
  FONT,
  MARGIN,
  PAGE_WIDTH,
  WIDTH,
  answerArea,
  box,
  chips,
  gap,
  para,
  prompt,
  run,
  sectionTitle,
  solutionNotes,
  stack,
  type Ctx,
  type Translate,
} from "@/utils/languageCheckLearnExport";
import {
  exerciseTypeKey,
  levelKeyForAge,
  pickLang,
  type PriorityHandout,
} from "@/utils/languageCheckLearn";

/**
 * Word export of a student handout built from ONE "Teaching priorities" card:
 * a banner with the learning goal, learning notes (key idea, rules, wrong vs
 * right, Chinese-transfer note, self-check tips), a "Try it" task, a
 * 10-question exercise sheet and a separate answer-key page. It reuses the
 * visual building blocks of the "Learn from mistakes" export so both look alike.
 */

export interface PriorityHandoutExportOptions {
  report: LanguageCheckAiReport;
  priority: LanguageCheckAiInsights["priorities"][number];
  /** 1-based position on the report, shown as the big number. */
  index: number;
  handout: PriorityHandout;
  language: "en" | "zh";
  age: number;
  schoolName?: string;
  t: Translate;
  categoryLabel: (category: string) => string;
  now?: Date;
}

const ACCENT = "EA580C";
const ACCENT_BG = "FFF7ED";
const ACCENT_LINE = "FDBA74";

const pageBreak = (): Paragraph =>
  new Paragraph({
    pageBreakBefore: true,
    children: [new TextRun({ text: "", size: 2 })],
    spacing: { before: 0, after: 0, line: 20, lineRule: LineRuleType.EXACT },
  });

function banner(o: PriorityHandoutExportOptions, title: string, date: string): (Paragraph | Table)[] {
  const { t, handout, language, index } = o;
  const goal = pickLang(handout.lesson.goal, handout.lesson.goalZh, language);
  const topic = o.report.base.topic;
  const level = t(`reading.levels.${levelKeyForAge(o.age)}`);
  const out: (Paragraph | Table)[] = [
    para(
      [
        run(o.schoolName || t("languageCheck.priorityHandout.docLabel"), {
          bold: true,
          color: C.muted,
          size: 22,
          caps: true,
          spacing: 40,
        }),
      ],
      { after: 60 },
    ),
    box(
      [
        para(
          [
            run(` ${t("languageCheck.priorityHandout.focus", { number: index })} `, {
              bold: true,
              color: C.white,
              fill: ACCENT,
              size: 20,
              caps: true,
              spacing: 16,
            }),
            run(`   ${topic.title}${topic.className ? `  ·  ${topic.className}` : ""}`, { color: C.muted, size: 20 }),
          ],
          { after: 100 },
        ),
        new Paragraph({
          heading: HeadingLevel.TITLE,
          spacing: { before: 0, after: 100 },
          children: [run(title, { bold: true, color: C.ink, size: 52 })],
        }),
        ...(goal
          ? [
              para(
                [
                  run(`🎯  ${t("languageCheck.priorityHandout.goal")}: `, { bold: true, color: ACCENT, size: 24 }),
                  run(goal, { bold: true, color: C.ink, size: 24 }),
                ],
                { after: 0, line: 312 },
              ),
            ]
          : []),
      ],
      { border: ACCENT_LINE, fill: ACCENT_BG, bar: ACCENT, barSize: 60, pad: 250 },
    ),
    gap(140),
    para(
      [
        run(`${t("languageCheck.followUp.name")}: `, { color: C.muted, size: 21 }),
        run("\u00A0".repeat(30), { underline: true, size: 21 }),
        run(`    ${t("languageCheck.followUp.class")}: `, { color: C.muted, size: 21 }),
        run("\u00A0".repeat(14), { underline: true, size: 21 }),
        run(`    ${t("languageCheck.followUp.date")}: `, { color: C.muted, size: 21 }),
        run("\u00A0".repeat(16), { underline: true, size: 21 }),
      ],
      { before: 60, after: 60 },
    ),
    para([run(`${level}  ·  ${date}`, { color: C.muted, size: 18 })], { after: 40 }),
  ];
  return out;
}

function notes(o: PriorityHandoutExportOptions): (Paragraph | Table)[] {
  const { t, language, handout } = o;
  const lesson = handout.lesson;
  const out: (Paragraph | Table)[] = [];
  const summary = pickLang(lesson.summary, lesson.summaryZh, language);
  const why = pickLang(lesson.whyItMatters, lesson.whyItMattersZh, language);

  out.push(
    sectionTitle(t("languageCheck.priorityHandout.notes"), ACCENT),
    box(
      [
        para(
          [
            run("💡  ", { size: 28 }),
            run(t("languageCheck.priorityHandout.bigIdea"), { bold: true, color: C.muted, size: 18, caps: true, spacing: 24 }),
          ],
          { after: 60 },
        ),
        para([run(summary, { bold: true, color: C.ink, size: 28 })], { after: why ? 100 : 0, line: 330 }),
        ...(why
          ? [
              para(
                [
                  run(`${t("languageCheck.priorityHandout.whyMatters")}  `, { bold: true, color: C.amberInk, size: 21 }),
                  run(why, { color: C.amberInk, size: 21 }),
                ],
                { fill: C.amberBg, before: 60, after: 0, line: 300 },
              ),
            ]
          : []),
      ],
      { border: C.line, bar: C.amber, barSize: 48, pad: 220 },
    ),
    gap(),
  );

  lesson.rules.forEach((rule, i) => {
    const heading = pickLang(rule.heading, rule.headingZh, language);
    const inside: Paragraph[] = [
      para(
        [
          run(` ${i + 1} `, { bold: true, color: C.white, fill: ACCENT, size: 22 }),
          ...(heading ? [run("  "), run(heading, { bold: true, color: C.ink, size: 26 })] : []),
        ],
        { after: 100, keepNext: true },
      ),
      para([run(pickLang(rule.explanation, rule.explanationZh, language), { size: 23 })], {
        after: rule.pattern || rule.examples.length ? 110 : 0,
        line: 312,
      }),
    ];
    if (rule.pattern) {
      inside.push(
        para(
          [run("🧩  ", { size: 22 }), run(` ${rule.pattern} `, { bold: true, color: C.ink, size: 23, fill: C.soft })],
          { after: 0, line: 330 },
        ),
      );
      if (rule.examples.length) inside.push(gap(100));
    }
    rule.examples.forEach((example, j) => {
      inside.push(
        para([run("✓  ", { color: C.green, bold: true, size: 22 }), run(example, { size: 23 })], {
          fill: C.greenBg,
          bar: C.greenBar,
          indent: 160,
          after: 0,
          line: 330,
        }),
      );
      if (j < rule.examples.length - 1) inside.push(gap(70));
    });
    out.push(box(inside, { border: C.line }), gap());
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
                    run(`✗  ${t("languageCheck.learn.lesson.wrong")}   `, { bold: true, color: C.red, size: 16, caps: true }),
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
                    run(`✓  ${t("languageCheck.learn.lesson.right")}   `, { bold: true, color: C.green, size: 16, caps: true }),
                    run(pair.right, { bold: true, color: C.ink, size: 23 }),
                  ],
                  { after: 0, keepNext: why2 !== "" },
                ),
              ],
            },
            ...(why2 ? [{ children: [para([run(why2, { color: C.muted, size: 20 })], { after: 0 })] }] : []),
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
              run("🌏  ", { size: 23 }),
              run(
                pickLang(lesson.chineseTransfer.explanation, lesson.chineseTransfer.explanationZh, language),
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
    out.push(
      box(
        [
          para([run(`✅  ${t("languageCheck.priorityHandout.checklist")}`, { bold: true, color: C.ink, size: 24 })], {
            after: 80,
            keepNext: true,
          }),
          ...lesson.tips.map((tip) =>
            para(
              [run("☐  ", { color: C.amber, size: 24 }), run(pickLang(tip.tip, tip.tipZh, language), { size: 23 })],
              { after: 60, line: 300 },
            ),
          ),
        ],
        { fill: C.amberBg, border: C.amberLine, pad: 190 },
      ),
      gap(),
    );
  }

  const tryIt = lesson.tryIt && pickLang(lesson.tryIt.instruction, lesson.tryIt.instructionZh, language);
  if (tryIt) {
    out.push(
      box(
        [
          para(
            [
              run(`✏️  ${t("languageCheck.priorityHandout.tryIt")}`, { bold: true, color: ACCENT, size: 24 }),
              run(`   ${t("languageCheck.aiReport.minutes", { count: Math.min(o.priority.minutes, 10) })}`, {
                color: C.muted,
                size: 19,
              }),
            ],
            { after: 80, keepNext: true },
          ),
          para([run(tryIt, { size: 23 })], { after: 0, line: 312 }),
        ],
        { fill: C.skyBg, border: C.skyLine, bar: "0EA5E9", barSize: 36, pad: 190 },
      ),
      gap(),
    );
  }
  return out;
}

function typeLabel(t: Translate, type: PriorityHandout["exercises"][number]["type"]): string {
  return t(`languageCheck.learn.exercise.types.${exerciseTypeKey(type)}`);
}

function exercises(o: PriorityHandoutExportOptions, ctx: Ctx): (Paragraph | Table)[] {
  const { t, handout } = o;
  const total = handout.exercises.length;
  const out: (Paragraph | Table)[] = [
    pageBreak(),
    sectionTitle(t("languageCheck.priorityHandout.exercises"), ACCENT),
    para([run(t("languageCheck.priorityHandout.exercisesHint", { count: total }), { color: C.muted, size: 21 })], {
      after: 140,
    }),
  ];
  handout.exercises.forEach((item, i) => {
    const body: Paragraph[] = [
      para(
        chips(
          { text: t("languageCheck.learn.exercise.counter", { current: i + 1, total }), strong: true },
          { text: typeLabel(t, item.type) },
        ),
        { after: 150, keepNext: true },
      ),
      ...prompt(item, ctx),
      ...answerArea(item, ctx),
    ];
    if (item.hint) {
      body.push(
        para(
          [
            run(`💡 ${t("languageCheck.learn.exercise.hint")}: `, { bold: true, color: C.amberInk, size: 21 }),
            run(item.hint, { color: C.amberInk, size: 21 }),
          ],
          { fill: C.amberBg, before: 60, after: 60, line: 288 },
        ),
      );
    }
    out.push(box(body, { border: C.line, pad: 190 }), gap(170));
  });
  return out;
}

function answerKey(o: PriorityHandoutExportOptions, ctx: Ctx): (Paragraph | Table)[] {
  const { t, handout } = o;
  const total = handout.exercises.length;
  const out: (Paragraph | Table)[] = [
    pageBreak(),
    box(
      [
        para([run(t("languageCheck.followUp.answerKey"), { bold: true, color: C.green, size: 36 })], { after: 40 }),
        para([run(t("languageCheck.priorityHandout.answerKeyHint"), { color: C.muted, size: 21 })], { after: 0 }),
      ],
      { fill: C.greenBg, border: C.greenSoft, bar: C.greenBar, barSize: 48, pad: 200 },
    ),
    gap(180),
  ];
  handout.exercises.forEach((item, i) => {
    out.push(
      box(
        [
          para(
            chips(
              { text: t("languageCheck.learn.exercise.counter", { current: i + 1, total }), strong: true },
              { text: typeLabel(t, item.type) },
            ),
            { after: 110, keepNext: true },
          ),
          ...prompt(item, ctx),
          ...answerArea(item, ctx),
          ...solutionNotes(item, ctx),
        ],
        { border: C.line, pad: 150 },
      ),
      gap(120),
    );
  });
  return out;
}

export function buildPriorityHandoutDocx(o: PriorityHandoutExportOptions): Document {
  const { t, language, handout, now = new Date() } = o;
  const date = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const title =
    pickLang(handout.lesson.title, handout.lesson.titleZh, language) || o.priority.title;
  const docLabel = t("languageCheck.priorityHandout.docLabel");
  const studentCtx: Ctx = {
    t,
    language,
    withAnswers: false,
    studentWork: false,
    categoryLabel: o.categoryLabel,
  };
  const keyCtx: Ctx = { ...studentCtx, withAnswers: true };

  const children: (Paragraph | Table)[] = [
    ...banner(o, title, date),
    ...notes(o),
    ...exercises(o, studentCtx),
    ...answerKey(o, keyCtx),
    para([run(t("languageCheck.export.generatedBy", { date }), { italics: true, color: C.muted, size: 18 })], {
      before: 300,
      align: AlignmentType.CENTER,
    }),
  ];

  const headerRuns: ParagraphChild[] = [
    run(docLabel, { bold: true, color: C.ink, size: 18 }),
    run(`   ·   ${title}`, { color: C.muted, size: 18 }),
  ];

  return new Document({
    creator: "Mr.🆖 ProReader",
    title: `${docLabel} – ${title}`,
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
        headers: { default: new Header({ children: [para(headerRuns, { after: 0, bottom: C.line })] }) },
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

export async function exportPriorityHandoutDocx(options: PriorityHandoutExportOptions): Promise<void> {
  const blob = await Packer.toBlob(buildPriorityHandoutDocx(options));
  const clean = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 50);
  const topic = clean(options.report.base.topic.title) || "topic";
  const focus = clean(options.priority.title) || `priority ${options.index}`;
  saveAs(blob, `${topic} - handout ${options.index} - ${focus}.docx`);
}
