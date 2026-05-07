"use client";
import { useState, useMemo, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { TrashIcon, FileOutput, Download, Upload, Share2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import Fuse from "fuse.js";
import SearchArea from "@/components/Internal/SearchArea";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useReadingStore, type ReadingStore } from "@/store/reading";
import { useHistoryStore, type ReadingHistory } from "@/store/history";
import { markLastOpenedSession } from "@/store/setting";
import { downloadFile } from "@/utils/file";
import ShareSessionDialog from "@/components/Dashboard/ShareSessionDialog";

interface SessionsTabProps {
  onClose: () => void;
}

const PAGE_SIZE = 20;

const readingSessionSchema = z.object({
  id: z.string(),
  docTitle: z.string().optional(),
  studentAge: z.number(),
  originalImage: z.string().optional(),
  extractedText: z.string(),
  summary: z.string().optional(),
  adaptedText: z.string().optional(),
  simplifiedText: z.string().optional(),
  highlightedWords: z.array(z.string()).optional(),
  analyzedSentences: z.record(z.any()).optional(),
  mindMap: z.string().optional(),
  readingTest: z.array(z.any()).optional(),
  glossary: z.array(z.any()).optional(),
  testScore: z.number().optional(),
  testCompleted: z.boolean().optional(),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
});

function formatDate(timestamp: number, locale: string): string {
  return new Date(timestamp).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(timestamp: number, locale: string): string {
  return new Date(timestamp).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calculateProgress(item: ReadingHistory): number {
  const hasExtractedText = !!item.extractedText;
  const steps = [
    hasExtractedText,
    !!item.summary,
    !!item.mindMap,
    !!item.adaptedText,
    item.testCompleted,
    Object.keys(item.analyzedSentences || {}).length > 0,
    (item.highlightedWords || []).length > 0,
    (item.glossary || []).length > 0,
    (item.spellingGameBestScore || 0) > 0,
    (item.vocabularyQuizScore || 0) > 0,
    (item.grammarQuizCompleted) && (item.grammarQuizScore || 0) > 0,
  ];
  const completedCount = steps.filter(Boolean).length;
  return Math.round((completedCount / steps.length) * 100);
}

function SessionsTab({ onClose }: SessionsTabProps) {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { backup, restore, reset } = useReadingStore();
  const { history, save, load, update, remove } = useHistoryStore();
  const [historyList, setHistoryList] = useState<ReadingHistory[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [shareSession, setShareSession] = useState<ReadingHistory | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const showLoadMore = useMemo(() => {
    return history.length > currentPage * PAGE_SIZE;
  }, [history, currentPage]);

  async function importSession(file: File) {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as z.infer<typeof readingSessionSchema>;
      const verifyFormat = readingSessionSchema.safeParse(data);
      if (verifyFormat.success) {
        save(data as ReadingStore);
        toast.message(t("history.importSuccess", { title: file.name }));
      } else {
        console.error(verifyFormat.error);
        toast.error(t("history.importFailed", { title: file.name }));
      }
    } catch (error) {
      console.error(error);
      toast.error(t("history.importFailed", { title: file.name }));
    }
  }

  async function loadHistory(id: string) {
    const { id: currentId } = useReadingStore.getState();
    const data = load(id);
    if (data) {
      if (currentId) {
        update(currentId, backup());
      }
      reset();
      await restore(data);
      markLastOpenedSession(data.id);
    }
    onClose();
  }

  function downloadSession(id: string) {
    const data = load(id);
    if (data) {
      const title = data.docTitle || data.extractedText?.slice(0, 50) || "reading-session";
      downloadFile(
        JSON.stringify(data, null, 4),
        `mrng-proreader-${title}.json`,
        "application/json;charset=utf-8"
      );
    }
  }

  function removeHistory(id: string) {
    remove(id);
  }

  function handleSearch(value: string) {
    const options = { keys: ["extractedText", "summary"] };
    const index = Fuse.createIndex(options.keys, history);
    const fuse = new Fuse(history, options, index);
    const result = fuse.search(value);
    setHistoryList(result.map((v) => v.item));
  }

  async function loadMore() {
    const nextPage = currentPage + 1;
    const total = nextPage * PAGE_SIZE;
    setHistoryList(history.slice(0, total));
    setCurrentPage(nextPage);
  }

  async function handleFileUpload(files: FileList | null) {
    if (files) {
      for (const file of Array.from(files)) {
        await importSession(file);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  useLayoutEffect(() => {
    setHistoryList(history.slice(0, PAGE_SIZE));
  }, [history]);

  return (
    <div className="min-w-0 w-full">
      <div className="flex items-center mb-2 gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0"
          title={t("history.importTip")}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-1" />
          {t("history.import")}
        </Button>
        <div className="flex-1 min-w-0">
          <SearchArea
            onChange={handleSearch}
            onClear={() => setHistoryList(history.slice(0, PAGE_SIZE))}
          />
        </div>
      </div>
      <div className="max-h-[60vh] overflow-y-auto">
        {historyList.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            {t("history.noHistory")}
          </div>
        ) : (
          <>
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("history.name")}</TableHead>
                  <TableHead className="w-16 text-center whitespace-normal break-words">
                    {t("history.progress")}
                  </TableHead>
                  <TableHead className="w-16 text-center whitespace-normal break-words">
                    {t("history.glossaryWords")}
                  </TableHead>
                  <TableHead className="w-16 text-center whitespace-normal break-words">
                    {t("history.spellingScore")}
                  </TableHead>
                  <TableHead className="w-16 text-center whitespace-normal break-words">
                    {t("history.quizScore")}
                  </TableHead>
                  <TableHead className="w-16 text-center whitespace-normal break-words">
                    {t("history.testScore")}
                  </TableHead>
                  <TableHead className="w-16 text-center whitespace-normal break-words">
                    {t("history.grammarQuizScore")}
                  </TableHead>
                  <TableHead className="text-center whitespace-normal break-words">
                    {t("history.date")}
                  </TableHead>
                  <TableHead className="text-center w-32">
                    {t("history.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyList.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p
                        className="truncate w-48 max-lg:max-w-40 max-sm:w-28 cursor-pointer hover:text-blue-500"
                        title={item.docTitle || item.extractedText?.slice(0, 100)}
                        onClick={() => loadHistory(item.id)}
                      >
                        {item.docTitle || item.extractedText?.slice(0, 50) || "Untitled Session"}
                      </p>
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <span className={calculateProgress(item) === 100 ? "text-green-600 dark:text-green-400" : ""}>
                        {calculateProgress(item)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {item.glossary?.length || 0}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {item.spellingGameBestScore || 0}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {item.vocabularyQuizScore !== undefined && item.vocabularyQuizScore !== null ? `${item.vocabularyQuizScore}%` : "0%"}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {item.testCompleted && item.testScore !== undefined ? `${item.testScore}%` : "-"}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {item.grammarQuizCompleted && item.grammarQuizScore > 0 ? `${item.grammarQuizScore}%` : "-"}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <div>{formatDate(item.updatedAt || item.createdAt, i18n.language)}</div>
                      <div className="text-muted-foreground">{formatTime(item.updatedAt || item.createdAt, i18n.language)}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t("history.share")}
                          onClick={() => {
                            setShareSession(item);
                            setShareOpen(true);
                          }}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t("history.load")}
                          onClick={() => loadHistory(item.id)}
                        >
                          <FileOutput className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t("history.export")}
                          onClick={() => downloadSession(item.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          className="text-red-500 hover:text-red-600"
                          variant="ghost"
                          size="icon"
                          title={t("history.delete")}
                          onClick={() => removeHistory(item.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div
              className={
                showLoadMore
                  ? "text-center cursor-pointer text-sm hover:underline underline-offset-4"
                  : "hidden"
              }
              onClick={() => loadMore()}
            >
              {t("history.loadMore")}
            </div>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        multiple
        hidden
        onChange={(ev) => handleFileUpload(ev.target.files)}
      />
      <ShareSessionDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        session={shareSession}
      />
    </div>
  );
}

export default SessionsTab;
