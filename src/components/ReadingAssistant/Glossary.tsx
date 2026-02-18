"use client";
import { useTranslation } from "react-i18next";
import { BookOpen, LoaderCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { downloadFile } from "@/utils/file";

function Glossary() {
  const { t } = useTranslation();
  const { extractedText, highlightedWords, glossary } = useReadingStore();
  const { status, generateGlossary } = useReadingAssistant();
  
  const isGenerating = status === "glossary";

  const handleDownloadCSV = () => {
    if (glossary.length === 0) return;

    const headers = ["Word", "English Definition", "Chinese Definition", "Example"];
    const rows = glossary.map((entry) => [
      entry.word,
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

  return (
    <section className="p-4 border rounded-md mt-4">
      <div className="flex items-center justify-between border-b mb-4">
        <h3 className="font-semibold text-lg leading-10">
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
              <span>{t("reading.glossary.download")}</span>
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
                <BookOpen className="h-4 w-4" />
                <span>{t("reading.glossary.regenerate")}</span>
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4" />
                <span>{t("reading.glossary.generate")}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {highlightedWords.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("reading.glossary.noHighlightedWords")}</p>
        </div>
      ) : glossary.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>{t("reading.glossary.emptyTip", { count: highlightedWords.length })}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">{t("reading.glossary.word")}</TableHead>
                <TableHead>{t("reading.glossary.englishDefinition")}</TableHead>
                <TableHead className="w-[200px]">{t("reading.glossary.chineseDefinition")}</TableHead>
                <TableHead>{t("reading.glossary.example")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {glossary.map((entry) => (
                <TableRow key={entry.word}>
                  <TableCell className="font-medium">{entry.word}</TableCell>
                  <TableCell>{entry.englishDefinition}</TableCell>
                  <TableCell className="font-noto-sans-tc">{entry.chineseDefinition}</TableCell>
                  <TableCell className="text-muted-foreground italic">
                    {entry.example || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

export default Glossary;
