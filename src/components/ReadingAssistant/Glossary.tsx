"use client";
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { BookMarked, LoaderCircle, FileDown, FileSpreadsheet, Table, Layers, ClipboardList, SpellCheck, HelpCircle } from "lucide-react";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table as DocxTable,
  TableRow as DocxTableRow,
  TableCell as DocxTableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  HeadingLevel,
  convertInchesToTwip,
  PageOrientation,
} from "docx";
import { saveAs } from "file-saver";
import ExcelJS from "exceljs";
import { Button } from "@/components/ui/button";
import {
  Table as DataTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";

import { cn } from "@/utils/style";
import VocabularyFlashcard from "./VocabularyFlashcard";
import VocabularyQuiz from "./VocabularyQuiz";
import VocabularySpelling from "./VocabularySpelling";

type TabType = "table" | "flashcard" | "quiz" | "spelling";

function Glossary() {
  const { t } = useTranslation();
  const { extractedText, highlightedWords, glossary } = useReadingStore();
  const { status, generateGlossary } = useReadingAssistant();
  const [activeTab, setActiveTab] = useState<TabType>("table");
  
  const isGenerating = status === "glossary";

  const handleDownloadWord = useCallback(async () => {
    if (glossary.length === 0) return;

    const HEADER_SHADING = {
      type: ShadingType.CLEAR,
      fill: "2E74B5",
      color: "auto",
    } as const;
    const ALT_ROW_SHADING = {
      type: ShadingType.CLEAR,
      fill: "EAF2FB",
      color: "auto",
    } as const;
    const THIN_BORDER = { style: BorderStyle.SINGLE, size: 4, color: "C0C0C0" } as const;
    const CELL_BORDERS = {
      top: THIN_BORDER,
      bottom: THIN_BORDER,
      left: THIN_BORDER,
      right: THIN_BORDER,
    };

    try {
      const docTitle = useReadingStore.getState().docTitle || "Glossary";
      const generatedAt = new Date().toLocaleString(undefined, {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });

      const colHeaders = [
        t("reading.glossary.word"),
        t("reading.glossary.syllabification"),
        t("reading.glossary.partOfSpeech"),
        t("reading.glossary.englishDefinition"),
        t("reading.glossary.chineseDefinition"),
        t("reading.glossary.example"),
      ];

      const headerRow = new DocxTableRow({
        tableHeader: true,
        children: colHeaders.map(
          (header) =>
            new DocxTableCell({
              shading: HEADER_SHADING,
              borders: CELL_BORDERS,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: header, bold: true, color: "FFFFFF" }),
                  ],
                  spacing: { before: 60, after: 60 },
                }),
              ],
              width: { size: 100 / 6, type: WidthType.PERCENTAGE },
            })
        ),
      });

      const dataRows = glossary.map((entry, rowIdx) => {
        const isAlt = rowIdx % 2 === 1;
        return new DocxTableRow({
          children: [
            entry.word,
            entry.syllabification || "",
            entry.partOfSpeech || "",
            entry.englishDefinition,
            entry.chineseDefinition,
            entry.example || "",
          ].map(
            (cellText) =>
              new DocxTableCell({
                ...(isAlt ? { shading: ALT_ROW_SHADING } : {}),
                borders: CELL_BORDERS,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: cellText })],
                    spacing: { before: 60, after: 60 },
                  }),
                ],
                width: { size: 100 / 6, type: WidthType.PERCENTAGE },
              })
          ),
        });
      });

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: convertInchesToTwip(1),
                  bottom: convertInchesToTwip(1),
                  left: convertInchesToTwip(1.1),
                  right: convertInchesToTwip(1.1),
                },
                size: { orientation: PageOrientation.PORTRAIT },
              },
            },
            children: [
              new Paragraph({
                text: docTitle.trim(),
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Glossary - Generated by Mr.\uD83C\uDD96 ProReader on ${generatedAt}`,
                    italics: true,
                    color: "595959",
                  }),
                ],
                alignment: AlignmentType.CENTER,
                style: "Subtitle",
                spacing: { after: 320 },
              }),
              new DocxTable({
                rows: [headerRow, ...dataRows],
                width: { size: 100, type: WidthType.PERCENTAGE },
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const safeFileName = docTitle
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
      saveAs(blob, `${safeFileName} - Glossary.docx`);
    } catch (error) {
      console.error("Failed to generate Word document:", error);
    }
  }, [glossary, t]);

  const handleDownloadExcel = useCallback(async () => {
    if (glossary.length === 0) return;

    try {
      const docTitle = useReadingStore.getState().docTitle || "Glossary";
      const generatedAt = new Date().toLocaleString(undefined, {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Mr.🆖 ProReader";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Glossary", {
        properties: { tabColor: { argb: "2E74B5" } },
        pageSetup: {
          paperSize: 9,
          orientation: "landscape",
          fitToPage: true,
        },
        headerFooter: {
          oddHeader: `&C&B&14${docTitle}`,
          oddFooter: `&CGlossary generated by Mr.🆖 ProReader on ${generatedAt}  |  Page &P of &N`,
        },
      });

      const colHeaders = [
        t("reading.glossary.word"),
        t("reading.glossary.syllabification"),
        t("reading.glossary.partOfSpeech"),
        t("reading.glossary.englishDefinition"),
        t("reading.glossary.chineseDefinition"),
        t("reading.glossary.example"),
      ];

      worksheet.columns = [
        { header: colHeaders[0], key: "word", width: 20 },
        { header: colHeaders[1], key: "syllabification", width: 18 },
        { header: colHeaders[2], key: "partOfSpeech", width: 14 },
        { header: colHeaders[3], key: "englishDefinition", width: 40 },
        { header: colHeaders[4], key: "chineseDefinition", width: 30 },
        { header: colHeaders[5], key: "example", width: 45 },
      ];

      glossary.forEach((entry) => {
        worksheet.addRow({
          word: entry.word,
          syllabification: entry.syllabification || "",
          partOfSpeech: entry.partOfSpeech || "",
          englishDefinition: entry.englishDefinition,
          chineseDefinition: entry.chineseDefinition,
          example: entry.example || "",
        });
      });

      const headerRow = worksheet.getRow(1);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "2E74B5" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: "C0C0C0" } },
          left: { style: "thin", color: { argb: "C0C0C0" } },
          bottom: { style: "thin", color: { argb: "C0C0C0" } },
          right: { style: "thin", color: { argb: "C0C0C0" } },
        };
      });

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.height = 24;
        row.eachCell((cell, colNumber) => {
          cell.alignment = { vertical: "middle", wrapText: true };
          cell.border = {
            top: { style: "thin", color: { argb: "C0C0C0" } },
            left: { style: "thin", color: { argb: "C0C0C0" } },
            bottom: { style: "thin", color: { argb: "C0C0C0" } },
            right: { style: "thin", color: { argb: "C0C0C0" } },
          };
          if (rowNumber % 2 === 0) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "EAF2FB" },
            };
          }
          if (colNumber === 5) {
            cell.font = { name: "Microsoft JhengHei", size: 11 };
          } else {
            cell.font = { size: 11 };
          }
        });
      });

      worksheet.views = [{ state: "frozen", ySplit: 1 }];
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: worksheet.rowCount, column: 6 },
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const safeFileName = docTitle
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
      saveAs(blob, `${safeFileName} - Glossary.xlsx`);
    } catch (error) {
      console.error("Failed to generate Excel document:", error);
    }
  }, [glossary, t]);

  if (!extractedText) {
    return null;
  }

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: "table", label: t("reading.glossary.tabTable"), icon: <Table className="h-4 w-4" /> },
    { key: "flashcard", label: t("reading.glossary.tabFlashcard"), icon: <Layers className="h-4 w-4" /> },
    { key: "spelling", label: t("reading.glossary.tabSpelling"), icon: <SpellCheck className="h-4 w-4" /> },
    { key: "quiz", label: t("reading.glossary.tabQuiz"), icon: <ClipboardList className="h-4 w-4" /> },
  ];

  const renderContent = () => {
    if (highlightedWords.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <BookMarked className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("reading.glossary.noHighlightedWords")}</p>
        </div>
      );
    }

    if (glossary.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <BookMarked className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("reading.glossary.emptyTip", { count: highlightedWords.length })}</p>
        </div>
      );
    }

    switch (activeTab) {
      case "flashcard":
        return <VocabularyFlashcard glossary={glossary} />;
      case "quiz":
        return <VocabularyQuiz glossary={glossary} />;
      case "spelling":
        return <VocabularySpelling glossary={glossary} />;
      default:
        return (
          <div className="overflow-x-auto">
            <DataTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">{t("reading.glossary.word")}</TableHead>
                  <TableHead className="w-[100px]">{t("reading.glossary.syllabification")}</TableHead>
                  <TableHead className="w-[80px]">{t("reading.glossary.partOfSpeech")}</TableHead>
                  <TableHead>{t("reading.glossary.englishDefinition")}</TableHead>
                  <TableHead className="w-[200px]">{t("reading.glossary.chineseDefinition")}</TableHead>
                  <TableHead>{t("reading.glossary.example")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {glossary.map((entry) => (
                  <TableRow key={entry.word}>
                    <TableCell className="font-medium">{entry.word}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{entry.syllabification || "-"}</TableCell>
                    <TableCell className="text-muted-foreground italic text-xs">{entry.partOfSpeech || "-"}</TableCell>
                    <TableCell>{entry.englishDefinition}</TableCell>
                    <TableCell className="font-noto-sans-tc">{entry.chineseDefinition}</TableCell>
                    <TableCell className="text-muted-foreground italic">
                      {entry.example || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTable>
          </div>
        );
    }
  };

  return (
    <section className="p-4 border rounded-md mt-4">
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <BookMarked className="h-5 w-5 text-muted-foreground" />
          {t("reading.glossary.title")}
          <Popover>
            <PopoverTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
            </PopoverTrigger>
            <PopoverContent className="w-[400px]" align="start">
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-base">{t("reading.glossary.help.title")}</h4>
                <div className="space-y-2">
                  <p className="text-muted-foreground">{t("reading.glossary.help.purpose")}</p>
                  <p className="text-muted-foreground">{t("reading.glossary.help.features")}</p>
                  <p className="text-muted-foreground">{t("reading.glossary.help.usage")}</p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </h3>
        <div className="flex gap-2">
          {glossary.length > 0 && (
            <>
              <Button
                onClick={handleDownloadWord}
                variant="secondary"
                size="sm"
              >
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">{t("reading.glossary.downloadWord")}</span>
              </Button>
              <Button
                onClick={handleDownloadExcel}
                variant="secondary"
                size="sm"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">{t("reading.glossary.downloadExcel")}</span>
              </Button>

            </>
          )}
          <Button
            onClick={() => generateGlossary()}
            disabled={isGenerating || highlightedWords.length === 0}
            size="sm"
            variant={glossary.length > 0 ? "secondary" : "default"}
          >
            {isGenerating ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>{t("reading.glossary.generating")}</span>
              </>
            ) : glossary.length > 0 ? (
              <>
                <BookMarked className="h-4 w-4" />
                <span>{t("reading.glossary.regenerate")}</span>
              </>
            ) : (
              <>
                <BookMarked className="h-4 w-4" />
                <span>{t("reading.glossary.generate")}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {glossary.length > 0 && (
        <div className="flex gap-1 mb-4 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                "border-b-2 -mb-px",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {renderContent()}
    </section>
  );
}

export default Glossary;
