"use client";
import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Download,
  FileText,
  LayoutGrid,
  PenLine,
  ArrowLeftRight,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useVocabularyStore } from "@/store/vocabulary";

function ExportPanel({ entryType = "word" }: { entryType?: "word" | "phrase" }) {
  const { t } = useTranslation();
  const { selectedWordIds, words } = useVocabularyStore();
  const [exporting, setExporting] = useState<string | null>(null);

  const scopedWords = useMemo(
    () =>
      words.filter((w) =>
        entryType === "phrase"
          ? w.entryType === "phrase"
          : w.entryType !== "phrase",
      ),
    [words, entryType],
  );
  const selectedWords = scopedWords.filter((w) => selectedWordIds.has(w.id));
  const targetWords = selectedWords.length > 0 ? selectedWords : scopedWords;

  const handleExport = useCallback(
    async (type: "glossary" | "flashcard" | "fillblank" | "matching") => {
      setExporting(type);
      try {
        const {
          exportGlossaryDocx,
          exportFlashcardPdf,
          exportFillInBlankDocx,
          exportMatchingDocx,
        } = await import("@/utils/vocabularyExport");

        switch (type) {
          case "glossary":
            await exportGlossaryDocx(targetWords);
            break;
          case "flashcard":
            await exportFlashcardPdf(targetWords);
            break;
          case "fillblank":
            await exportFillInBlankDocx(targetWords);
            break;
          case "matching":
            await exportMatchingDocx(targetWords);
            break;
        }
      } catch (error) {
        console.error("Export failed:", error);
      } finally {
        setExporting(null);
      }
    },
    [targetWords]
  );

  const exports: {
    key: "glossary" | "flashcard" | "fillblank" | "matching";
    label: string;
    desc: string;
    icon: React.ReactNode;
    ext: string;
  }[] = [
    {
      key: "glossary",
      label: t("vocabulary.export.glossary"),
      desc: t("vocabulary.export.glossaryDesc"),
      icon: <FileText className="h-4 w-4" />,
      ext: "DOCX",
    },
    {
      key: "flashcard",
      label: t("vocabulary.export.flashcard"),
      desc: t("vocabulary.export.flashcardDesc"),
      icon: <LayoutGrid className="h-4 w-4" />,
      ext: "PDF",
    },
    {
      key: "fillblank",
      label: t("vocabulary.export.fillblank"),
      desc: t("vocabulary.export.fillblankDesc"),
      icon: <PenLine className="h-4 w-4" />,
      ext: "DOCX",
    },
    {
      key: "matching",
      label: t("vocabulary.export.matching"),
      desc: t("vocabulary.export.matchingDesc"),
      icon: <ArrowLeftRight className="h-4 w-4" />,
      ext: "DOCX",
    },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Download className="h-4 w-4 mr-1" />
          {t("vocabulary.export.title")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-1">
          <p className="text-sm font-medium mb-2">
            {selectedWords.length > 0
              ? t(
                  entryType === "phrase"
                    ? "vocabulary.export.selectedPhrases"
                    : "vocabulary.export.selectedWords",
                  {
                    count: selectedWords.length,
                  },
                )
              : t(
                  entryType === "phrase"
                    ? "vocabulary.export.allPhrases"
                    : "vocabulary.export.allWords",
                  { count: scopedWords.length },
                )}
          </p>
          {exports.map((e) => (
            <button
              key={e.key}
              onClick={() => handleExport(e.key)}
              disabled={exporting !== null}
              className="w-full text-left px-3 py-2 text-sm rounded-md transition-colors hover:bg-muted flex items-start gap-2.5 disabled:opacity-50"
            >
              <span className="mt-0.5 text-muted-foreground">
                {exporting === e.key ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  e.icon
                )}
              </span>
              <span className="flex-1">
                <span className="font-medium">{e.label}</span>
                <span className="ml-1.5 text-[10px] text-muted-foreground uppercase">
                  .{e.ext}
                </span>
                <br />
                <span className="text-xs text-muted-foreground">
                  {e.desc}
                </span>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default ExportPanel;
