"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Settings,
  Info,
  BookOpen,
  BookCopy,
  PenTool,
  Volume2,
  Camera,
  Brain,
  Sparkles,
  Gamepad2,
  Layers,
  ClipboardList,
  Upload,
  FileText,
  Target,
  MessageSquareText,
  Zap,
  Cloud,
  Trophy,
  CheckCircle2,
  Star,
  Rocket,
  Download,
  MessageCircle,
  BarChart3,
  Medal,
  Highlighter,
  Users,
  GraduationCap,
  Crown,
  School,
  Bell,
  BookOpenCheck,
  Library,
  LogOut,
  LogIn,
  CircleHelp,
  ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut, signIn } from "next-auth/react";
import { cn } from "@/utils/style";
import { Button } from "@/components/Internal/Button";
import { Button as UiButton } from "@/components/ui/button";
import UserManagementPanel from "@/components/UserManagement/UserManagementPanel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useGlobalStore } from "@/store/global";
import { useReadingStore } from "@/store/reading";
import { markLastOpenedSession } from "@/store/setting";
import { downloadFile } from "@/utils/file";
import { useSharingStore } from "@/store/sharing";
import { useVocabularyStore } from "@/store/vocabulary";

const Setting = dynamic(() => import("@/components/Setting"));
const History = dynamic(() => import("@/components/Dashboard/Dashboard"));
const TeacherDashboard = dynamic(() => import("@/components/TeacherDashboard/TeacherDashboard"));
const SharedSessionDialog = dynamic(() => import("@/components/Dashboard/SharedSessionDialog"));
const ReviewListShareDialog = dynamic(() => import("@/components/Vocabulary/ReviewListShareDialog"));

function getSafeFilename(value: string): string {
  return (
    value
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 80) || "reading-session"
  );
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT"
  );
}

function Header() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openShortcuts, setOpenShortcuts] = useState<boolean>(false);
  const [openAbout, setOpenAbout] = useState<boolean>(false);
  const [openNoPending, setOpenNoPending] = useState<boolean>(false);
  const [openUserManagement, setOpenUserManagement] = useState<boolean>(false);
  const { openSetting, setOpenSetting, openDashboard, setOpenDashboard, openTeacherDashboard, setOpenTeacherDashboard, hasOpenedAbout, setHasOpenedAbout } = useGlobalStore();
  const { pendingCount, fetchPendingCount, setShowSharedDialog } = useSharingStore();
  const {
    pendingReviewListShareCount,
    fetchPendingReviewListShareCount,
  } = useVocabularyStore();
  const totalPending = pendingCount + pendingReviewListShareCount;
  const {
    extractedText,
    summary,
    mindMap,
    adaptedText,
    testCompleted,
    analyzedSentences,
    highlightedWords,
    glossary,
    spellingGameBestScore,
    vocabularyQuizScore,
  } = useReadingStore();

  const isWorkflowComplete = useMemo(
    () =>
      !!extractedText &&
      !!summary &&
      !!mindMap &&
      !!adaptedText &&
      testCompleted &&
      Object.keys(analyzedSentences).length > 0 &&
      highlightedWords.length > 0 &&
      glossary.length > 0 &&
      spellingGameBestScore > 0 &&
      vocabularyQuizScore > 0,
    [
      extractedText,
      summary,
      mindMap,
      adaptedText,
      testCompleted,
      analyzedSentences,
      highlightedWords,
      glossary,
      spellingGameBestScore,
      vocabularyQuizScore,
    ]
  );

  const _showPulseAnimation = !hasOpenedAbout || !isWorkflowComplete;

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchPendingCount();
    fetchPendingReviewListShareCount();
    const interval = setInterval(() => {
      fetchPendingCount();
      fetchPendingReviewListShareCount();
    }, 60_000);
    return () => clearInterval(interval);
  }, [session?.user?.id, fetchPendingCount, fetchPendingReviewListShareCount]);

  const exportSnapshot = useCallback(() => {
    const { backup } = useReadingStore.getState();
    const session = backup();
    const baseName = session.extractedText?.slice(0, 50) || "reading-session";
    downloadFile(
      JSON.stringify(session, null, 2),
      `${getSafeFilename(baseName)}.session.json`,
      "application/json;charset=utf-8"
    );
  }, []);

  const importSnapshot = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const session = JSON.parse(text);
        const { restore } = useReadingStore.getState();
        await restore(session);
        if (session?.id) {
          markLastOpenedSession(session.id);
        }
      } catch (error) {
        console.error(error);
      }
    },
    []
  );

  const openSnapshotImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const shortcuts = useMemo(
    () => [
      {
        key: "Ctrl/Cmd + ,",
        description: t("header.shortcuts.openSetting"),
      },
      {
        key: "Ctrl/Cmd + Shift + H",
        description: t("header.shortcuts.openHistory"),
      },
      {
        key: "Ctrl/Cmd + Shift + E",
        description: t("header.shortcuts.exportSession"),
      },
      {
        key: "Ctrl/Cmd + Shift + O",
        description: t("header.shortcuts.importSession"),
      },
      {
        key: "Ctrl/Cmd + Shift + /",
        description: t("header.shortcuts.toggleHelp"),
      },
    ],
    [t]
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const withModifier = event.metaKey || event.ctrlKey;
      if (!withModifier) return;
      if (isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      if (!event.shiftKey && key === ",") {
        event.preventDefault();
        setOpenSetting(true);
        return;
      }
      if (event.shiftKey && key === "h") {
        event.preventDefault();
        setOpenDashboard(true);
        return;
      }
      if (event.shiftKey && key === "e") {
        event.preventDefault();
        exportSnapshot();
        return;
      }
      if (event.shiftKey && key === "o") {
        event.preventDefault();
        openSnapshotImport();
        return;
      }
      if (event.shiftKey && event.key === "?") {
        event.preventDefault();
        setOpenShortcuts((previous) => !previous);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [exportSnapshot, openSnapshotImport, setOpenDashboard, setOpenSetting]);

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    await importSnapshot(files[0]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b print:hidden">
        <div className="max-lg:max-w-screen-md max-w-screen-lg mx-auto px-4 flex justify-between items-center h-14">
          <Link href="/" className="text-left text-xl font-semibold flex items-center gap-1.5 relative group">
            <BookCopy className="h-5 w-5 text-blue-500 dark:text-blue-400 shrink-0" />
            <span className="text-blue-600 dark:text-blue-400">Mr.</span>
            <span className="text-2xl leading-none">🆖</span>
            <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-500 dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400 bg-clip-text text-transparent font-bold relative overflow-hidden">
              ProReader
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-white/20 to-transparent bg-[length:200%_100%] animate-shimmer" />
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Button
              className="h-8 w-8 relative"
              variant="ghost"
              size="icon"
              title={t("share.bellTitle")}
              onClick={() => {
                if (pendingCount > 0) {
                  setShowSharedDialog(true);
                } else if (pendingReviewListShareCount > 0) {
                  void router.push("/vocabulary?openReviewListShare=1");
                } else {
                  setOpenNoPending(true);
                }
              }}
            >
              <Bell className="h-5 w-5" />
              {totalPending > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {totalPending > 9 ? "9+" : totalPending}
                </span>
              )}
            </Button>
            {pathname === "/vocabulary" ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 opacity-50 cursor-default"
                disabled
              >
                <BookOpen className="h-4 w-4" />
                <span className="text-sm">{t("vocabulary.title")}</span>
              </Button>
            ) : (
              <Link href="/vocabulary" prefetch={false}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5"
                  title={t("vocabulary.title")}
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="text-sm">{t("vocabulary.title")}</span>
                </Button>
              </Link>
            )}
            {pathname === "/assignments" ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 opacity-50 cursor-default"
                disabled
              >
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">{t("assignments.navTitle")}</span>
              </Button>
            ) : (
              <Link href="/assignments" prefetch={false}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5"
                  title={t("assignments.navTitle")}
                >
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">{t("assignments.navTitle")}</span>
                </Button>
              </Link>
            )}
            {session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <UiButton variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? ""} />
                      <AvatarFallback className="text-xs">
                        {session.user.name?.charAt(0)?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                  </UiButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium leading-none">{session.user.name}</p>
                        {session.user.role && (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none",
                            {
                              "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200": session.user.role === "super-admin",
                              "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200": session.user.role === "admin",
                              "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200": session.user.role === "teacher",
                              "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200": session.user.role === "student",
                            }
                          )}>
                            {t(`reading.studentInfo.roles.${session.user.role}`)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setOpenDashboard(true)}>
                    <BarChart3 className="h-4 w-4" />
                    {t("dashboard.title")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/leaderboard")} disabled={pathname === "/leaderboard"}>
                    <Trophy className="h-4 w-4" />
                    {t("leaderboard.title")}
                  </DropdownMenuItem>
                  {session.user.role && session.user.role !== "student" && (
                    <>
                      <DropdownMenuItem onClick={() => setOpenTeacherDashboard(true)}>
                        <GraduationCap className="h-4 w-4" />
                        {t("teacherDashboard.title")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setOpenUserManagement(true)}>
                        <Users className="h-4 w-4" />
                        {t("userManagement.title")}
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={() => setOpenSetting(true)}>
                    <Settings className="h-4 w-4" />
                    {t("setting.title")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setOpenAbout(true);
                      setHasOpenedAbout(true);
                    }}
                  >
                    <Info className="h-4 w-4" />
                    {t("header.about.title")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="h-4 w-4" />
                    {t("header.auth.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => signIn("google")} size="sm" variant="ghost">
                <LogIn className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("header.auth.signIn")}</span>
              </Button>
            )}
          </div>
        </div>
      </header>
      <Dialog open={openShortcuts} onOpenChange={setOpenShortcuts}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("header.shortcuts.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.key}
                className="flex items-center justify-between gap-3 border rounded-md px-3 py-2"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {shortcut.key}
                </span>
                <span>{shortcut.description}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={openAbout} onOpenChange={setOpenAbout}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BookCopy className="h-5 w-5 text-blue-500 dark:text-blue-400" />
              {t("header.about.title")}
            </DialogTitle>
            <p className="text-muted-foreground text-sm mt-1">
              {t("header.about.tagline")}
            </p>
          </DialogHeader>
          <div className="space-y-5 text-sm">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg p-4 border">
              <p className="text-center font-medium text-base">
                {t("header.about.description")}
              </p>
            </div>

            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3 text-base">
                <Star className="h-4 w-4 text-yellow-500" />
                {t("header.about.whyLove.title")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-card border rounded-lg p-3 text-center">
                  <Target className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                  <div className="font-medium text-xs">{t("header.about.whyLove.personalized.title")}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t("header.about.whyLove.personalized.desc")}</div>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1 text-left">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-500" />
                      <span>{t("header.about.whyLove.personalized.features.adaptive")}</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-500" />
                      <span>{t("header.about.whyLove.personalized.features.weakAreas")}</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-500" />
                      <span>{t("header.about.whyLove.personalized.features.smartReview")}</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-card border rounded-lg p-3 text-center">
                  <Trophy className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                  <div className="font-medium text-xs">{t("header.about.whyLove.gamified.title")}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t("header.about.whyLove.gamified.desc")}</div>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1 text-left">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                      <span>{t("header.about.whyLove.gamified.features.games")}</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                      <span>{t("header.about.whyLove.gamified.features.leaderboards")}</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                      <span>{t("header.about.whyLove.gamified.features.achievements")}</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-card border rounded-lg p-3 text-center">
                  <Cloud className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                  <div className="font-medium text-xs">{t("header.about.whyLove.private.title")}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t("header.about.whyLove.private.desc")}</div>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1 text-left">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-500" />
                      <span>{t("header.about.whyLove.private.features.autoSync")}</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-500" />
                      <span>{t("header.about.whyLove.private.features.crossDevice")}</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-500" />
                      <span>{t("header.about.whyLove.private.features.history")}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3 text-base">
                <Sparkles className="h-4 w-4 text-purple-500" />
                {t("header.about.features.title")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <Camera className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.ocr.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.ocr.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <Brain className="h-4 w-4 mt-0.5 text-purple-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.visual.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.visual.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <ImageIcon className="h-4 w-4 mt-0.5 text-sky-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.visualization.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.visualization.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <BarChart3 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.difficulty.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.difficulty.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <Highlighter className="h-4 w-4 mt-0.5 text-sky-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.cefrHighlight.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.cefrHighlight.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <PenTool className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.adaptation.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.adaptation.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <Volume2 className="h-4 w-4 mt-0.5 text-teal-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.tts.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.tts.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <MessageCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.tutor.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.tutor.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <MessageSquareText className="h-4 w-4 mt-0.5 text-orange-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.sentenceAnalysis.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.sentenceAnalysis.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <BookOpen className="h-4 w-4 mt-0.5 text-indigo-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.glossary.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.glossary.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <Layers className="h-4 w-4 mt-0.5 text-cyan-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.flashcard.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.flashcard.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <Gamepad2 className="h-4 w-4 mt-0.5 text-pink-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.spelling.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.spelling.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <ClipboardList className="h-4 w-4 mt-0.5 text-violet-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.quiz.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.quiz.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <Target className="h-4 w-4 mt-0.5 text-red-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.test.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.test.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <BookOpenCheck className="h-4 w-4 mt-0.5 text-fuchsia-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.grammar.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.grammar.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <Gamepad2 className="h-4 w-4 mt-0.5 text-lime-600 dark:text-lime-400 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.grammarGames.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.grammarGames.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <Library className="h-4 w-4 mt-0.5 text-sky-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.vocabularyPage.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.vocabularyPage.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <Medal className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.achievements.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.achievements.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <Trophy className="h-4 w-4 mt-0.5 text-yellow-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.leaderboard.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.leaderboard.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <Download className="h-4 w-4 mt-0.5 text-rose-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.wordExport.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.wordExport.desc")}</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3 text-base">
                <School className="h-4 w-4 text-indigo-500" />
                {t("header.about.roles.title")}
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                {t("header.about.roles.intro")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-4 w-4 text-amber-500" />
                    <span className="font-medium text-sm">{t("header.about.roles.admin.title")}</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• {t("header.about.roles.admin.manageSchools")}</li>
                    <li>• {t("header.about.roles.admin.manageUsers")}</li>
                    <li>• {t("header.about.roles.admin.manageClasses")}</li>
                    <li>• {t("header.about.roles.admin.uploadTexts")}</li>
                  </ul>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-sm">{t("header.about.roles.teacher.title")}</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• {t("header.about.roles.teacher.manageStudents")}</li>
                    <li>• {t("header.about.roles.teacher.uploadTexts")}</li>
                    <li>• {t("header.about.roles.teacher.shareVocabulary")}</li>
                    <li>• {t("header.about.roles.teacher.viewAiQuestions")}</li>
                    <li>• {t("header.about.roles.teacher.exportData")}</li>
                    <li>• {t("header.about.roles.teacher.viewLeaderboard")}</li>
                  </ul>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-sm">{t("header.about.roles.student.title")}</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• {t("header.about.roles.student.learn")}</li>
                    <li>• {t("header.about.roles.student.cloudSync")}</li>
                    <li>• {t("header.about.roles.student.history")}</li>
                    <li>• {t("header.about.roles.student.leaderboard")}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3 text-base">
                <Rocket className="h-4 w-4 text-blue-500" />
                {t("header.about.workflow.title")}
              </h3>
              <div className="bg-card border rounded-lg p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-bold">1</span>
                    <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.upload")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-bold">2</span>
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.summary")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 text-xs font-bold">3</span>
                    <Brain className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.mindmap")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-600 dark:text-sky-300 text-xs font-bold">4</span>
                    <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.visualization")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 text-xs font-bold">5</span>
                    <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.difficulty")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-600 dark:text-sky-300 text-xs font-bold">6</span>
                    <Highlighter className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.cefrHighlight")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 text-xs font-bold">7</span>
                    <PenTool className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.adapt")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 text-xs font-bold">8</span>
                    <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.tutor")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 text-xs font-bold">9</span>
                    <MessageSquareText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.analyze")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300 text-xs font-bold">10</span>
                    <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.highlight")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300 text-xs font-bold">11</span>
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.glossary")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300 text-xs font-bold">12</span>
                    <Gamepad2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.spelling")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300 text-xs font-bold">13</span>
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.vocabQuiz")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 text-xs font-bold">14</span>
                    <Target className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.test")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900 text-fuchsia-600 dark:text-fuchsia-300 text-xs font-bold">15</span>
                    <BookOpenCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.grammar")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-lime-100 dark:bg-lime-900 text-lime-600 dark:text-lime-300 text-xs font-bold">16</span>
                    <Gamepad2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.grammarGames")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-600 dark:text-sky-300 text-xs font-bold">17</span>
                    <Library className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.myVocabulary")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3 text-base">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {t("header.about.skills.title")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {["mainIdea", "detail", "inference", "vocabulary", "purpose", "grammar"].map((skill) => (
                  <span key={skill} className="inline-flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-xs">
                    <span>{t(`header.about.skills.${skill}`)}</span>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3 text-base">
                <CircleHelp className="h-4 w-4 text-blue-500" />
                {t("header.about.faqs.title")}
              </h3>
              <Accordion type="single" collapsible className="space-y-2">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <AccordionItem key={n} value={`faq-${n}`} className="border-b-0">
                    <AccordionTrigger className="px-4 py-3 text-left text-sm font-semibold hover:no-underline hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                      {t(`header.about.faqs.q${n}.q`)}
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div
                        className="text-muted-foreground text-sm [&_p]:mb-2 [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:mb-2 [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:mb-2 [&_li]:mb-1 [&_strong]:text-foreground [&_table]:w-full [&_table]:mb-2 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs"
                        dangerouslySetInnerHTML={{ __html: t(`header.about.faqs.q${n}.a`) }}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <div className="pt-3 border-t text-center">
              <p className="text-muted-foreground text-xs">
                {t("header.about.builtWith")}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={openNoPending} onOpenChange={setOpenNoPending}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("share.noPendingTitle")}</DialogTitle>
            <DialogDescription>
              {t("share.noPendingMessage")}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      <UserManagementPanel open={openUserManagement} onClose={() => setOpenUserManagement(false)} />
      <Setting open={openSetting} onClose={() => setOpenSetting(false)} />
      <History open={openDashboard} onClose={() => setOpenDashboard(false)} />
      <TeacherDashboard open={openTeacherDashboard} onClose={() => setOpenTeacherDashboard(false)} />
      <SharedSessionDialog />
      <ReviewListShareDialog />
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(event) => handleFileUpload(event.target.files)}
      />
    </>
  );
}

export default Header;
