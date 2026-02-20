"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookMarked, LoaderCircle, Download, Table, Layers, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table as DataTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { downloadFile } from "@/utils/file";
import { cn } from "@/utils/style";
import VocabularyFlashcard from "./VocabularyFlashcard";
import VocabularyQuiz from "./VocabularyQuiz";

type TabType = "table" | "flashcard" | "quiz";

function Glossary() {
  const { t } = useTranslation();
  const { extractedText, highlightedWords, glossary } = useReadingStore();
  const { status, generateGlossary } = useReadingAssistant();
  const [activeTab, setActiveTab] = useState<TabType>("table");
  
  const isGenerating = status === "glossary";

  const handleDownloadCSV = () => {
    if (glossary.length === 0) return;

    const headers = ["Word", "PoS", "English Definition", "Chinese Definition", "Example"];
    const rows = glossary.map((entry) => [
      entry.word,
      entry.partOfSpeech || "",
      `"${entry.englishDefinition.replace(/"/g, '""')}"`,
      `"${entry.chineseDefinition.replace(/"/g, '""')}"`,
      `"${(entry.example || "").replace(/"/g, '""')}"`,
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    downloadFile(csv, "glossary.csv", "text/csv;charset=utf-8");
  };

  if (!extractedText) {
    return null;
  }

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: "table", label: t("reading.glossary.tabTable"), icon: <Table className="h-4 w-4" /> },
    { key: "flashcard", label: t("reading.glossary.tabFlashcard"), icon: <Layers className="h-4 w-4" /> },
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
      default:
        return (
          <div className="overflow-x-auto">
            <DataTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">{t("reading.glossary.word")}</TableHead>
                  <TableHead className="w-[100px]">{t("reading.glossary.partOfSpeech")}</TableHead>
                  <TableHead>{t("reading.glossary.englishDefinition")}</TableHead>
                  <TableHead className="w-[200px]">{t("reading.glossary.chineseDefinition")}</TableHead>
                  <TableHead>{t("reading.glossary.example")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {glossary.map((entry) => (
                  <TableRow key={entry.word}>
                    <TableCell className="font-medium">{entry.word}</TableCell>
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
        <h3 className="font-semibold text-lg">
          {t("reading.glossary.title")}
        </h3>
        <div className="flex gap-2">
          {glossary.length > 0 && (
            <Button
              onClick={handleDownloadCSV}
              variant="secondary"
              size="sm"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t("reading.glossary.download")}</span>
            </Button>
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
