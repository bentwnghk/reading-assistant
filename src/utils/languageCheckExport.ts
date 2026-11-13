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
  LANGUAGE_ASSESSMENT_MAX,
  LANGUAGE_CHECK_CATEGORY_STYLES,
  assessmentOverallMax,
  assessmentSchemeOf,
  isExpressionCategory,
  type LanguageCheckCategory,
} from "@/constants/languageCheck";
import {
  CONTENT_ASSESSMENT_DIMENSIONS,
  JS_CONTENT_DIMENSIONS,
  JS_FEATURES_DIMENSIONS,
  JS_LANGUAGE_DIMENSIONS,
  JS_ORGANIZATION_DIMENSIONS,
  LANGUAGE_ASSESSMENT_DIMENSIONS,
  ORGANIZATION_ASSESSMENT_DIMENSIONS,
  TSA_CONTENT_DIMENSIONS,
  TSA_FEATURES_DIMENSIONS,
  TSA_LANGUAGE_DIMENSIONS,
  TSA_ORGANIZATION_DIMENSIONS,
} from "@/constants/readingPrompts";
import { applyCorrections, buildSegments } from "@/utils/languageCheck";

type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface LanguageCheckExportOptions {
  essay: LanguageCheckEssay;
  /** Language of the grammar notes. */
  language: "en" | "zh";
  t: Translate;
  categoryLabel: (category: string) => string;
  /**
   * Selected sections in the order they should appear. Unavailable sections
   * are skipped; omitted = every available section in default order. The
   * title/subtitle, student block and footer are always included.
   */
  sections?: readonly LanguageCheckExportSection[];
}

/** Sections of the Word export the reader can pick and reorder, in default order. */
export const LANGUAGE_CHECK_EXPORT_SECTIONS = [
  "assessment",
  "marked",
  "notes",
  "corrected",
  "polished",
  "enhanced-light",
  "enhanced-heavy",
] as const;

export type LanguageCheckExportSection = (typeof LANGUAGE_CHECK_EXPORT_SECTIONS)[number];

/**
 * Sections this essay can actually fill. Assessment / Marked / Corrected are
 * always offered (the export action only exists on checked essays);
 * "polished" needs expression suggestions, "notes" needs corrections, and
 * the enhanced essays must have been generated first.
 */
export function availableLanguageCheckExportSections(
  essay: LanguageCheckEssay,
): LanguageCheckExportSection[] {
  const enhanced = essay.enhanced;
  const available = new Set<LanguageCheckExportSection>([
    "assessment",
    "marked",
    "corrected",
  ]);
  if (essay.corrections.some((e) => isExpressionCategory(e.category))) {
    available.add("polished");
  }
  if (essay.corrections.length > 0) available.add("notes");
  if (enhanced && enhanced.light.trim().length > 0) available.add("enhanced-light");
  if (enhanced && enhanced.heavy.trim().length > 0) available.add("enhanced-heavy");
  return LANGUAGE_CHECK_EXPORT_SECTIONS.filter((s) => available.has(s));
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

/** Word document: header (mandatory), the picked sections in order, notes, footer. */
export async function exportLanguageCheckDocx({
  essay,
  language,
  t,
  categoryLabel,
  sections,
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

  // AI Writing Assessment — the document's first content section. Bullets
  // follow the explanation-language switch like the on-screen panel, with a
  // fallback to the other language when one is empty.
  const assessment = essay.assessment;
  const pickText = (b: { en: string; zh: string }): string =>
    (language === "zh" ? b.zh : b.en).trim() || (b.en || b.zh).trim();
  const assessmentBlocks: Paragraph[] = [
    new Paragraph({
      text: t("languageCheck.export.scores"),
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
            text: `${assessment.overall} / ${assessmentOverallMax(assessmentSchemeOf(assessment.scheme))}`,
            bold: true,
            size: 32,
          }),
        ],
      }),
      ...[
        ...(assessment.content
          ? [{ key: "content", ...assessment.content, subScores: assessment.content.scores }]
          : []),
        {
          key: "language",
          score: assessment.languageScore ?? assessment.overall,
          subScores: assessment.scores as Record<string, number> | undefined,
          strengths: assessment.strengths,
          weaknesses: assessment.weaknesses,
        },
        ...(assessment.organization
          ? [{ key: "organization", ...assessment.organization, subScores: assessment.organization.scores }]
          : []),
        ...(assessment.features
          ? [{ key: "features", ...assessment.features, subScores: assessment.features.scores }]
          : []),
      ].flatMap((c) => [
        new Paragraph({
          spacing: { before: 280, after: 80 },
          children: [
            new TextRun({
              text: `${t(`languageCheck.assessment.criteria.${c.key}`)}: `,
              bold: true,
              size: 26,
            }),
            new TextRun({
              text: `${c.score} / ${
                LANGUAGE_ASSESSMENT_MAX[assessmentSchemeOf(assessment.scheme)][
                  c.key as "content" | "language" | "organization" | "features"
                ]
              }`,
              bold: true,
              size: 26,
            }),
          ],
        }),
        ...(c.subScores
          ? (assessment.scheme === "tsa"
              ? c.key === "content"
                ? TSA_CONTENT_DIMENSIONS
                : c.key === "organization"
                  ? TSA_ORGANIZATION_DIMENSIONS
                  : c.key === "features"
                    ? TSA_FEATURES_DIMENSIONS
                    : TSA_LANGUAGE_DIMENSIONS
              : assessment.scheme === "js"
              ? c.key === "content"
                ? JS_CONTENT_DIMENSIONS
                : c.key === "organization"
                  ? JS_ORGANIZATION_DIMENSIONS
                  : c.key === "features"
                    ? JS_FEATURES_DIMENSIONS
                    : JS_LANGUAGE_DIMENSIONS
              : c.key === "content"
                ? CONTENT_ASSESSMENT_DIMENSIONS
                : c.key === "organization"
                  ? ORGANIZATION_ASSESSMENT_DIMENSIONS
                  : LANGUAGE_ASSESSMENT_DIMENSIONS
            ).map(
              (d: string) =>
                new Paragraph({
                  spacing: { after: 60 },
                  children: [
                    new TextRun({
                      text: `${t(`languageCheck.assessment.dim.${d}`)}: `,
                      color: "404040",
                    }),
                    new TextRun({
                      text: `${c.subScores?.[d] ?? "–"} / ${
                        LANGUAGE_ASSESSMENT_MAX[assessmentSchemeOf(assessment.scheme)][
                          c.key as "content" | "language" | "organization" | "features"
                        ]
                      }`,
                      bold: true,
                    }),
                  ],
                }),
            )
          : []),
        new Paragraph({
          spacing: { before: 160, after: 80 },
          children: [
            new TextRun({
              text: t("languageCheck.assessment.strengths"),
              bold: true,
              color: GREEN,
            }),
          ],
        }),
        ...c.strengths.map((b) => bullet(pickText(b), GREEN)),
        new Paragraph({
          spacing: { before: 160, after: 80 },
          children: [
            new TextRun({
              text: t("languageCheck.assessment.weaknesses"),
              bold: true,
              color: AMBER,
            }),
          ],
        }),
        ...c.weaknesses.map((b) => bullet(pickText(b), AMBER)),
      ]),
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

  // 4. Section blocks the reader can pick from, in default document order.
  //    Each starts with its own H1 (the assessment block carries its own).
  const sectionHeading = (text: string): Paragraph =>
    new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 400 } });

  const enhancedFootnote = (meta: {
    generatedAt: number;
    model: string;
  }): Paragraph =>
    new Paragraph({
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: [
            t("languageCheck.enhanced.generatedOn", { date: formatDate(meta.generatedAt) }),
            meta.model
              ? t("languageCheck.results.checkedWith", { model: meta.model })
              : "",
          ]
            .filter(Boolean)
            .join(" · "),
          italics: true,
          size: 18,
          color: "7F7F7F",
        }),
      ],
    });

  const enhanced = essay.enhanced;
  const sectionBlocks = new Map<LanguageCheckExportSection, Paragraph[]>();
  sectionBlocks.set("assessment", assessmentBlocks);
  sectionBlocks.set("marked", [
    sectionHeading(t("languageCheck.export.marked")),
    ...toParagraphs(markedParts),
  ]);
  sectionBlocks.set("corrected", [
    sectionHeading(t("languageCheck.export.corrected")),
    ...toParagraphs(cleanParts),
  ]);
  if (hasSuggestions) {
    sectionBlocks.set("polished", [
      sectionHeading(t("languageCheck.export.polished")),
      ...toParagraphs(polishedParts),
    ]);
  }
  if (notes.length > 0) {
    sectionBlocks.set("notes", [sectionHeading(t("languageCheck.export.notes")), ...notes]);
  }
  if (enhanced && enhanced.light.trim().length > 0) {
    sectionBlocks.set("enhanced-light", [
      sectionHeading(t("languageCheck.export.enhancedLight")),
      ...toParagraphs([{ text: enhanced.light, make: (x) => new TextRun({ text: x }) }]),
      enhancedFootnote(enhanced),
    ]);
  }
  if (enhanced && enhanced.heavy.trim().length > 0) {
    sectionBlocks.set("enhanced-heavy", [
      sectionHeading(t("languageCheck.export.enhancedHeavy")),
      ...toParagraphs([{ text: enhanced.heavy, make: (x) => new TextRun({ text: x }) }]),
      enhancedFootnote(enhanced),
    ]);
  }

  // Selected sections render in the caller's order; unavailable ones are
  // skipped silently.
  const requested = sections ?? LANGUAGE_CHECK_EXPORT_SECTIONS;
  const sectionChildren = requested
    .filter((s) => sectionBlocks.has(s))
    .flatMap((s) => sectionBlocks.get(s) as Paragraph[]);

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
          ...sectionChildren,
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
  saveAs(blob, `${safeName} - writing assessment.docx`);
}
