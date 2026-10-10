import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  type ParagraphChild,
} from "docx";
import { saveAs } from "file-saver";
import {
  DEFAULT_CATEGORY_STYLE,
  LANGUAGE_CHECK_CATEGORY_STYLES,
  type LanguageCheckCategory,
} from "@/constants/languageCheck";
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
    markedParts.push({
      text: " ",
      make: () =>
        new TextRun({ text: `[${seg.number}]`, superScript: true, color: "7F7F7F" }),
    });
  }

  // 2. Clean corrected essay.
  const corrected = applyCorrections(text, errors);
  const cleanParts = [{ text: corrected, make: (x: string) => new TextRun({ text: x }) }];

  // 3. Numbered notes.
  const notes: Paragraph[] = errors.map((e, i) => {
    const style =
      LANGUAGE_CHECK_CATEGORY_STYLES[e.category as LanguageCheckCategory] ??
      DEFAULT_CATEGORY_STYLE;
    const explanation =
      (language === "zh" ? e.explanationZh : e.explanation).trim() ||
      (e.explanation || e.explanationZh).trim();
    return new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({ text: `${i + 1}. `, bold: true }),
        new TextRun({ text: categoryLabel(e.category), bold: true, color: style.hex }),
        new TextRun({ text: "  " }),
        new TextRun({ text: e.original, strike: true, color: RED }),
        new TextRun({ text: "  →  " }),
        new TextRun({
          text: e.correction || t("languageCheck.results.deleteShort"),
          bold: true,
          color: GREEN,
        }),
        ...(explanation
          ? [new TextRun({ text: explanation, break: 1, italics: true, color: "404040" })]
          : []),
      ],
    });
  });

  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const title = essay.title || t("languageCheck.list.untitled");

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
          new Paragraph({
            text: t("languageCheck.export.marked"),
            heading: HeadingLevel.HEADING_1,
          }),
          ...toParagraphs(markedParts),
          new Paragraph({
            text: t("languageCheck.export.corrected"),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400 },
          }),
          ...toParagraphs(cleanParts),
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
  saveAs(blob, `${safeName} - language check.docx`);
}
