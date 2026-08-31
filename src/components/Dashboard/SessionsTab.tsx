"use client";
import { useState, useMemo, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { TrashIcon, FileOutput, Download, Upload, Share2, GraduationCap } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import Fuse from "fuse.js";
import SearchArea from "@/components/Internal/SearchArea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { calculateProgress } from "@/utils/progress";
import { grammarGameBestScore, formatScore } from "@/utils/sessionMetrics";
import ShareSessionDialog from "@/components/Dashboard/ShareSessionDialog";
import AssignRosterDialog from "@/components/Assignments/AssignRosterDialog";

interface SessionsTabProps {
  onClose: () => void;
}

const PAGE_SIZE = 20;

const readingSessionSchema = z.object({
  id: z.string(),
  docTitle: z.string().optional(),
  studentAge: z.number(),
  source: z.enum(["upload", "repository", "shared", "assignment", "ai-generated"]).optional(),
  originalImage: z.string().optional(),
  originalImages: z.array(z.string()).optional(),
  extractedText: z.string(),
  summary: z.string().optional(),
  adaptedText: z.string().optional(),
  simplifiedText: z.string().optional(),
  highlightedWords: z.array(z.string()).optional(),
  analyzedSentences: z.record(z.any()).optional(),
  mindMap: z.string().optional(),
  readingTest: z.array(z.any()).optional(),
  glossary: z.array(z.any()).optional(),
  glossaryRatings: z.record(z.any()).optional(),
  testScore: z.number().optional(),
  testCompleted: z.boolean().optional(),
  testEarnedPoints: z.number().optional(),
  testTotalPoints: z.number().optional(),
  testShowChinese: z.boolean().optional(),
  testMode: z.enum(["all-at-once", "question-by-question"]).optional(),
  testsCompleted: z.number().optional(),
  vocabularyQuizScore: z.number().optional(),
  vocabQuizzesCompleted: z.number().optional(),
  spellingGameBestScore: z.number().optional(),
  spellingGamesCompleted: z.number().optional(),
  grammarTopics: z.array(z.any()).optional(),
  grammarQuiz: z.array(z.any()).optional(),
  grammarQuizScore: z.number().optional(),
  grammarQuizCompleted: z.boolean().optional(),
  grammarQuizzesCompleted: z.number().optional(),
  grammarQuizEarnedPoints: z.number().optional(),
  grammarQuizTotalPoints: z.number().optional(),
  grammarGeneratedAt: z.number().optional(),
  grammarQuizCompletedAt: z.number().optional(),
  grammarHighlightEnabled: z.boolean().optional(),
  grammarHighlightTopicId: z.string().nullable().optional(),
  grammarScrambleHighScore: z.number().optional(),
  grammarWorkshopHighScore: z.number().optional(),
  grammarSurgeryHighScore: z.number().optional(),
  grammarRouletteHighScore: z.number().optional(),
  grammarDuelHighScore: z.number().optional(),
  grammarGameAccuracy: z.number().optional(),
  grammarGamesCompleted: z.number().optional(),
  grammarGameCompletedAt: z.number().optional(),
  flashcardReviewDates: z.array(z.number()).optional(),
  summaryGeneratedAt: z.number().optional(),
  mindMapGeneratedAt: z.number().optional(),
  adaptedTextGeneratedAt: z.number().optional(),
  simplifiedTextGeneratedAt: z.number().optional(),
  glossaryGeneratedAt: z.number().optional(),
  spellingGameCompletedAt: z.number().optional(),
  vocabQuizCompletedAt: z.number().optional(),
  readingTestCompletedAt: z.number().optional(),
  chatHistory: z.array(z.any()).optional(),
  status: z.string().optional(),
  error: z.string().nullable().optional(),
  originalDifficulty: z.any().nullable().optional(),
  adaptedDifficulty: z.any().nullable().optional(),
  simplifiedDifficulty: z.any().nullable().optional(),
  includeGlossary: z.boolean().optional(),
  includeSentenceAnalysis: z.boolean().optional(),
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

function SessionsTab({ onClose }: SessionsTabProps) {
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();
  const canAssign = !!session?.user?.role && session.user.role !== "student";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { backup, restore, reset } = useReadingStore();
  const { history, save, loadFull, update, remove } = useHistoryStore();
  const [historyList, setHistoryList] = useState<ReadingHistory[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [shareSession, setShareSession] = useState<ReadingHistory | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [assignSession, setAssignSession] = useState<ReadingHistory | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [pendingSwitchId, setPendingSwitchId] = useState<string | null>(null);

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
    const hasActiveGen = Object.values(useReadingStore.getState().activeGenerations).some(Boolean);
    if (hasActiveGen) {
      setPendingSwitchId(id);
      return;
    }
    await doLoadHistory(id);
  }

  async function doLoadHistory(id: string) {
    const { id: currentId } = useReadingStore.getState();
    const data = await loadFull(id);
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

  async function confirmSwitch() {
    const id = pendingSwitchId;
    setPendingSwitchId(null);
    if (id) {
      await doLoadHistory(id);
    }
  }

  async function downloadSession(id: string) {
    const data = await loadFull(id);
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
            <Table className="min-w-[800px]">
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
                    {t("history.spellingAccuracy")}
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
                  <TableHead className="w-16 text-center whitespace-normal break-words">
                    {t("history.grammarGameScore")}
                  </TableHead>
                  <TableHead className="w-16 text-center whitespace-normal break-words">
                    {t("history.grammarGameAccuracy")}
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
                      {formatScore(item.spellingGameBestScore)}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {formatScore(item.spellingGameAccuracy, "%")}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {formatScore(item.vocabularyQuizScore, "%")}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {item.testCompleted && item.testScore !== undefined ? `${item.testScore}%` : "-"}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {item.grammarQuizCompleted ? formatScore(item.grammarQuizScore, "%") : "-"}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {formatScore(grammarGameBestScore(item))}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {formatScore(item.grammarGameAccuracy, "%")}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <div>{formatDate(item.updatedAt || item.createdAt, i18n.language)}</div>
                      <div className="text-muted-foreground">{formatTime(item.updatedAt || item.createdAt, i18n.language)}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        {canAssign && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t("assignments.create.actionTitle")}
                            onClick={() => {
                              setAssignSession(item);
                              setAssignOpen(true);
                            }}
                          >
                            <GraduationCap className="h-4 w-4" />
                          </Button>
                        )}
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
      <AssignRosterDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        session={assignSession}
      />
      <Dialog open={pendingSwitchId !== null} onOpenChange={(open) => { if (!open) setPendingSwitchId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("history.confirmSwitchTitle")}</DialogTitle>
            <DialogDescription>{t("history.confirmSwitchDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingSwitchId(null)}>
              {t("setting.cancel")}
            </Button>
            <Button onClick={confirmSwitch}>
              {t("history.confirmSwitch")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SessionsTab;
