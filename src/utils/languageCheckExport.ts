import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  UnderlineType,
  type ParagraphChild,
} from "docx";
import { saveAs } from "file-saver";
import {
  DEFAULT_CATEGORY_STYLE,
  LANGUAGE_CHECK_CATEGORY_STYLES,
  isExpressionCategory,
  type LanguageCheckCategory,
} from "@/constants/languageCheck";
import { LANGUAGE_ASSESSMENT_DIMENSIONS } from "@/constants/readingPrompts";
import { applyCorrections, buildSegments } from "@/utils/languageCheck";

type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface LanguageCheckExportOptions {
  essay: LanguageCheckEssay;
  /** Language of the grammar notes. */
  language: "en" | "zh";
  t: Translate;
  categoryLabel: (category: string) => string;
}

const RED = "C00000";
const GREEN = "00803C";
const AMBER = "B45309";

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Bulleted line for the assessment strengths / weaknesses lists. */
function bullet(text: string, color: string): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    indent: { left: 360, hanging: 240 },
    children: [
      new TextRun({ text: "• ", bold: true, color }),
      new TextRun({ text, color: "404040" }),
    ],
  });
}

/** Splits styled runs on newlines into paragraphs (blank lines are dropped). */
function toParagraphs(
  parts: { text: string; make: (text: string) => ParagraphChild }[],
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let runs: ParagraphChild[] = [];
  const flush = () => {
    if (runs.length > 0) {
      paragraphs.push(
        new Paragraph({ children: runs, spacing: { after: 200, line: 360 } }),
      );
    }
    runs = [];
  };
  for (const part of parts) {
    const lines = part.text.split("\n");
    lines.forEach((line, i) => {
      if (i > 0) flush();
      if (line) runs.push(part.make(line));
    });
  }
  flush();
  return paragraphs;
}

/** Word document: marked-up essay (tracked-change style), clean essay, notes. */
export async function exportLanguageCheckDocx({
  essay,
  language,
  t,
  categoryLabel,
}: LanguageCheckExportOptions): Promise<void> {
  const text = essay.checkedText;
  const errors = essay.corrections;
  const segments = buildSegments(text, errors);

  // 1. Marked essay: red strike-through original, green underlined correction.
  const markedParts: { text: string; make: (text: string) => ParagraphChild }[] = [];
  for (const seg of segments) {
    if (seg.kind === "text") {
      markedParts.push({ text: seg.text, make: (x) => new TextRun({ text: x }) });
      continue;
    }
    if (isExpressionCategory(seg.error.category)) {
      // Suggestion: the original stays readable (it is not an error) with a
      // dotted underline in the category colour; the better version follows
      // in italics so it is visibly optional.
      const hex =
        LANGUAGE_CHECK_CATEGORY_STYLES[seg.error.category as LanguageCheckCategory]
          ?.hex ?? DEFAULT_CATEGORY_STYLE.hex;
      markedParts.push({
        text: seg.text,
        make: (x) =>
          new TextRun({
            text: x,
            color: hex,
            underline: { type: UnderlineType.DOTTED, color: hex },
          }),
      });
      if (seg.error.correction) {
        markedParts.push({
          text: seg.error.correction,
          make: (x) =>
            new TextRun({ text: ` ${x}`, color: hex, italics: true, bold: true }),
        });
      }
    } else {
      markedParts.push({
        text: seg.text,
        make: (x) => new TextRun({ text: x, strike: true, color: RED }),
      });
      if (seg.error.correction) {
        markedParts.push({
          text: seg.error.correction,
          make: (x) =>
            new TextRun({
              text: ` ${x}`,
              color: GREEN,
              underline: {},
              bold: true,
            }),
        });
      }
    }
    markedParts.push({
      text: " ",
      make: () =>
        new TextRun({ text: `[${seg.number}]`, superScript: true, color: "7F7F7F" }),
    });
  }

  // 2. Clean corrected essay (errors only) and, when there are suggestions, a
  //    polished version that also applies them.
  const corrected = applyCorrections(text, errors);
  const cleanParts = [{ text: corrected, make: (x: string) => new TextRun({ text: x }) }];
  const hasSuggestions = errors.some((e) => isExpressionCategory(e.category));
  const polishedParts = [
    {
      text: applyCorrections(text, errors, { includeExpression: true }),
      make: (x: string) => new TextRun({ text: x }),
    },
  ];

  // 3. Numbered notes.
  const notes: Paragraph[] = errors.map((e, i) => {
    const style =
      LANGUAGE_CHECK_CATEGORY_STYLES[e.category as LanguageCheckCategory] ??
      DEFAULT_CATEGORY_STYLE;
    const explanation =
      (language === "zh" ? e.explanationZh : e.explanation).trim() ||
      (e.explanation || e.explanationZh).trim();
    const suggestion = isExpressionCategory(e.category);
    return new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({ text: `${i + 1}. `, bold: true }),
        new TextRun({ text: categoryLabel(e.category), bold: true, color: style.hex }),
        ...(suggestion
          ? [
              new TextRun({
                text: ` (${t("languageCheck.results.suggestionTag")})`,
                italics: true,
                color: "7F7F7F",
              }),
            ]
          : []),
        new TextRun({ text: "  " }),
        suggestion
          ? new TextRun({ text: e.original, color: style.hex })
          : new TextRun({ text: e.original, strike: true, color: RED }),
        new TextRun({ text: "  →  " }),
        new TextRun({
          text: e.correction || t("languageCheck.results.deleteShort"),
          bold: true,
          color: suggestion ? style.hex : GREEN,
        }),
        ...(e.alternatives && e.alternatives.length > 0
          ? [
              new TextRun({
                text: `${t("languageCheck.results.alternatives")}: ${e.alternatives.join(" / ")}`,
                break: 1,
                color: "404040",
              }),
            ]
          : []),
        ...(explanation
          ? [new TextRun({ text: explanation, break: 1, italics: true, color: "404040" })]
          : []),
      ],
    });
  });

  const date = formatDate(Date.now());
  const title = essay.title || t("languageCheck.list.untitled");

  // Student header: name, class and email as labelled centred lines (each
  // only when known — the owner row may be gone and a learner may be in no
  // class).
  const studentRows: [string, string][] = (
    [
      [t("languageCheck.export.studentName"), essay.ownerName.trim()],
      [t("languageCheck.export.studentClass"), (essay.ownerClassName ?? "").trim()],
      [t("languageCheck.export.studentEmail"), (essay.ownerEmail ?? "").trim()],
    ] as [string, string][]
  ).filter(([, value]) => value !== "");
  const studentBlock: Paragraph[] = studentRows.map(([label, value], i) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: i === studentRows.length - 1 ? 200 : 40 },
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 20, color: "595959" }),
        new TextRun({ text: value, size: 20, color: "404040" }),
      ],
    }),
  );

  // AI Language assessment — the document's first content section. Bullets
  // follow the explanation-language switch like the on-screen panel, with a
  // fallback to the other language when one is empty.
  const assessment = essay.assessment;
  const pickText = (b: { en: string; zh: string }): string =>
    (language === "zh" ? b.zh : b.en).trim() || (b.en || b.zh).trim();
  const assessmentBlocks: Paragraph[] = [
    new Paragraph({
      text: t("languageCheck.assessment.title"),
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400 },
    }),
  ];
  if (!assessment) {
    assessmentBlocks.push(
      new Paragraph({
        children: [
          new TextRun({
            text: t("languageCheck.export.notAssessed"),
            italics: true,
            color: "7F7F7F",
          }),
        ],
      }),
    );
  } else {
    assessmentBlocks.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `${t("languageCheck.assessment.overall")}: `,
            bold: true,
          }),
          new TextRun({
            text: `${assessment.overall} ${t("languageCheck.assessment.scale")}`,
            bold: true,
            size: 32,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: t("languageCheck.assessment.subScores"),
            bold: true,
            color: "595959",
          }),
        ],
      }),
      ...LANGUAGE_ASSESSMENT_DIMENSIONS.map(
        (d) =>
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: `${t(`languageCheck.assessment.dim.${d}`)}: `,
                color: "404040",
              }),
              new TextRun({
                text: `${assessment.scores[d]} ${t("languageCheck.assessment.scale")}`,
                bold: true,
              }),
            ],
          }),
      ),
      new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [
          new TextRun({
            text: t("languageCheck.assessment.strengths"),
            bold: true,
            color: GREEN,
          }),
        ],
      }),
      ...assessment.strengths.map((b) => bullet(pickText(b), GREEN)),
      new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [
          new TextRun({
            text: t("languageCheck.assessment.weaknesses"),
            bold: true,
            color: AMBER,
          }),
        ],
      }),
      ...assessment.weaknesses.map((b) => bullet(pickText(b), AMBER)),
      new Paragraph({
        spacing: { before: 200 },
        children: [
          new TextRun({
            text: [
              t("languageCheck.assessment.assessedOn", {
                date: formatDate(assessment.assessedAt),
              }),
              assessment.model
                ? t("languageCheck.results.checkedWith", {
                    model: assessment.model,
                  })
                : "",
            ]
              .filter(Boolean)
              .join(" · "),
            italics: true,
            size: 18,
            color: "7F7F7F",
          }),
        ],
      }),
    );
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: { ascii: "Calibri", hAnsi: "Calibri", eastAsia: "Microsoft JhengHei" },
            size: 24,
          },
        },
      },
    },
    sections: [
      {
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: t("languageCheck.export.subtitle", {
                  count: errors.length,
                  date,
                }),
                italics: true,
                color: "595959",
              }),
            ],
          }),
          ...studentBlock,
          ...assessmentBlocks,
          new Paragraph({
            text: t("languageCheck.export.marked"),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400 },
          }),
          ...toParagraphs(markedParts),
          new Paragraph({
            text: t("languageCheck.export.corrected"),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400 },
          }),
          ...toParagraphs(cleanParts),
          ...(hasSuggestions
            ? [
                new Paragraph({
                  text: t("languageCheck.export.polished"),
                  heading: HeadingLevel.HEADING_1,
                  spacing: { before: 400 },
                }),
                ...toParagraphs(polishedParts),
              ]
            : []),
          ...(notes.length > 0
            ? [
                new Paragraph({
                  text: t("languageCheck.export.notes"),
                  heading: HeadingLevel.HEADING_1,
                  spacing: { before: 400 },
                }),
                ...notes,
              ]
            : []),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 600 },
            children: [
              new TextRun({
                text: t("languageCheck.export.generatedBy", { date }),
                italics: true,
                size: 18,
                color: "7F7F7F",
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = title.replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 60) || "essay";
  saveAs(blob, `${safeName} - grammar check.docx`);
}
