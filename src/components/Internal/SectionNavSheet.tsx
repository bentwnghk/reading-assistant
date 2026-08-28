"use client";
import { useTranslation } from "react-i18next";
import { useRouter, usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  BarChart3,
  BookMarked,
  BookOpen,
  BookOpenCheck,
  Check,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  ImageIcon,
  Layers,
  Library,
  MessageCircle,
  Sparkles,
  Trophy,
  Upload,
  User,
  Waypoints,
  X,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReadingStore } from "@/store/reading";
import { useVocabularyStore } from "@/store/vocabulary";
import { useAssignmentsStore } from "@/store/assignments";
import { useGlobalStore } from "@/store/global";
import { grammarGameBestScore } from "@/utils/sessionMetrics";
import { cn } from "@/utils/style";

interface SectionNavSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ReadingStoreState = ReturnType<typeof useReadingStore.getState>;

interface SectionItem {
  id: string;
  icon: LucideIcon;
  labelKey: string;
  checkCompleted: (store: ReadingStoreState) => boolean;
  // Optional "started but not finished" state — renders a half tick instead of
  // no mark at all.
  checkPartial?: (store: ReadingStoreState) => boolean;
  isAccessible: (store: ReadingStoreState) => boolean;
}

// Partial-completion mark — "乄", a check-like glyph visually distinct from
// the full ✓.
function HalfCheck() {
  return (
    <span
      className="flex h-4 w-4 shrink-0 items-center justify-center text-base leading-none text-primary font-semibold"
      aria-hidden="true"
    >
      乄
    </span>
  );
}

const sections: SectionItem[] = [
  {
    id: "section-student-info",
    icon: User,
    labelKey: "toc.studentInfo",
    checkCompleted: () => true,
    isAccessible: () => true,
  },
  {
    id: "section-upload",
    icon: Upload,
    labelKey: "toc.upload",
    checkCompleted: (store: ReadingStoreState) => !!store.extractedText,
    isAccessible: () => true,
  },
  {
    id: "section-pre-reading",
    icon: Sparkles,
    labelKey: "toc.preReading",
    // Full completion mirrors WorkflowProgress: scaffolding generated AND the
    // student submitted a prediction. Scaffolding alone is only "partial".
    checkCompleted: (store: ReadingStoreState) =>
      !!store.preReading && store.studentPrediction.trim().length > 0,
    checkPartial: (store: ReadingStoreState) => !!store.preReading,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-summary",
    icon: FileText,
    labelKey: "toc.summary",
    checkCompleted: (store: ReadingStoreState) => !!store.summary,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-mindmap",
    icon: Waypoints,
    labelKey: "toc.mindmap",
    checkCompleted: (store: ReadingStoreState) => !!store.mindMap,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-visualization",
    icon: ImageIcon,
    labelKey: "toc.visualization",
    checkCompleted: (store: ReadingStoreState) => !!store.visualizationImage,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-adapted",
    icon: BookOpen,
    labelKey: "toc.adapted",
    // Full completion mirrors WorkflowProgress's steps for this section:
    // adapted text AND sentence analysis AND word highlighting. Having the
    // adapted text alone is only "partial".
    checkCompleted: (store: ReadingStoreState) =>
      !!store.adaptedText &&
      Object.keys(store.analyzedSentences).length > 0 &&
      store.highlightedWords.length > 0,
    checkPartial: (store: ReadingStoreState) => !!store.adaptedText,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-glossary",
    icon: BookMarked,
    labelKey: "toc.glossary",
    // Full completion mirrors WorkflowProgress's steps for this section:
    // glossary extracted AND spelling game played AND vocab quiz done.
    // Extracting the glossary alone is only "partial".
    checkCompleted: (store: ReadingStoreState) =>
      store.glossary.length > 0 &&
      store.spellingGameBestScore > 0 &&
      store.vocabularyQuizScore > 0,
    checkPartial: (store: ReadingStoreState) => store.glossary.length > 0,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-collocations",
    icon: Layers,
    labelKey: "toc.collocations",
    checkCompleted: (store: ReadingStoreState) => store.collocations.length > 0,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-test",
    icon: ClipboardCheck,
    labelKey: "toc.test",
    // Full completion mirrors WorkflowProgress: testCompleted. Questions
    // generated but not yet answered is only "partial".
    checkCompleted: (store: ReadingStoreState) => store.testCompleted,
    checkPartial: (store: ReadingStoreState) => store.readingTest.length > 0,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-grammar",
    icon: BookOpenCheck,
    labelKey: "toc.grammar",
    // Full completion mirrors WorkflowProgress's two grammar steps: quiz done
    // AND a grammar game played. Extracting topics alone is only "partial".
    checkCompleted: (store: ReadingStoreState) =>
      store.grammarTopics.length > 0 &&
      store.grammarQuizCompleted &&
      store.grammarQuizScore > 0 &&
      grammarGameBestScore({
        grammarScrambleHighScore: store.grammarScrambleHighScore,
        grammarWorkshopHighScore: store.grammarWorkshopHighScore,
        grammarSurgeryHighScore: store.grammarSurgeryHighScore,
        grammarRouletteHighScore: store.grammarRouletteHighScore,
        grammarDuelHighScore: store.grammarDuelHighScore,
      }) > 0,
    checkPartial: (store: ReadingStoreState) => store.grammarTopics.length > 0,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
];

interface PageLink {
  href: string;
  icon: LucideIcon;
  labelKey: string;
  separatorAbove?: boolean;
  // Dialog entries (Learning Journey / Teacher Dashboard) open a dialog via
  // the global store instead of navigating; `href` is a stable key, not a
  // route. When `roles` is set, the entry renders only for those roles.
  openDashboard?: boolean;
  openTeacherDashboard?: boolean;
  roles?: UserRole[];
}

const pageLinks: PageLink[] = [
  {
    href: "/vocabulary",
    icon: Library,
    labelKey: "vocabulary.title",
  },
  {
    href: "/assignments",
    icon: ClipboardList,
    labelKey: "assignments.navTitle",
  },
  {
    href: "dashboard",
    icon: BarChart3,
    labelKey: "dashboard.title",
    openDashboard: true,
    separatorAbove: true,
  },
  {
    href: "teacher-dashboard",
    icon: GraduationCap,
    labelKey: "teacherDashboard.title",
    openTeacherDashboard: true,
    roles: ["teacher", "admin", "super-admin"],
  },
  {
    href: "/leaderboard",
    icon: Trophy,
    labelKey: "leaderboard.title",
  },
];

function SectionNavSheet({ open, onOpenChange }: SectionNavSheetProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const store = useReadingStore();
  const dueForReviewCount = useVocabularyStore((s) => s.dueForReviewCount);
  const overdueCount = useAssignmentsStore((s) => s.overdueCount);
  const setOpenDashboard = useGlobalStore((s) => s.setOpenDashboard);
  const setOpenTeacherDashboard = useGlobalStore((s) => s.setOpenTeacherDashboard);
  const setOpenTutorChat = useGlobalStore((s) => s.setOpenTutorChat);
  const pageBadges: Record<string, number> = {
    "/vocabulary": dueForReviewCount,
    "/assignments": overdueCount,
    "/leaderboard": 0,
  };
  const isHome = pathname === "/";

  function handleSectionClick(id: string, accessible: boolean) {
    if (!accessible) return;
    if (isHome) {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      // Section anchors only exist on the home page — deep-link back via the
      // ?goto= param (handled in page.tsx after the store is restored).
      router.push(`/?goto=${id}`);
    }
    onOpenChange(false);
  }

  function handleTutorClick() {
    // The tutor chat needs extracted text (same gate as the section items) and
    // its UI only renders on the home page — navigate home first when opened
    // elsewhere; the persisted openTutorChat flag opens the chat on arrival.
    if (!store.extractedText) return;
    if (!isHome) {
      router.push("/");
    }
    setOpenTutorChat(true);
    onOpenChange(false);
  }

  function handlePageLinkClick(page: PageLink) {
    if (page.openDashboard) {
      setOpenDashboard(true);
      onOpenChange(false);
      return;
    }
    if (page.openTeacherDashboard) {
      setOpenTeacherDashboard(true);
      onOpenChange(false);
      return;
    }
    if (pathname !== page.href) {
      router.push(page.href);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    onOpenChange(false);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[85vw] flex-col border-r bg-background shadow-lg duration-200",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left"
          )}
        >
          <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
            <div>
              <DialogPrimitive.Title className="text-left text-xl font-semibold flex items-center gap-1.5">
                <span className="text-blue-600 dark:text-blue-400">Mr.</span>
                <span className="text-2xl leading-none">🆖</span>
                <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-500 dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400 bg-clip-text text-transparent font-bold relative overflow-hidden">
                  ProReader
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-white/20 to-transparent bg-[length:200%_100%] animate-shimmer" />
                </span>
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-muted-foreground mt-1.5">
                {t("toc.description")}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
          <ScrollArea className="flex-1 min-h-0 border-t">
            <nav className="space-y-1 p-2">
              {sections.map((section) => {
                const Icon = section.icon;
                const isCompleted = section.checkCompleted(store);
                const isPartial =
                  !isCompleted && !!section.checkPartial?.(store);
                const isAccessible = section.isAccessible(store);
                return (
                  <button
                    key={section.id}
                    onClick={() => handleSectionClick(section.id, isAccessible)}
                    disabled={!isAccessible}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      !isAccessible && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-inherit"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1">{t(section.labelKey)}</span>
                    {isCompleted ? (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      isPartial && <HalfCheck />
                    )}
                  </button>
                );
              })}
              <div className="my-2 border-t" />
              <button
                onClick={handleTutorClick}
                disabled={!store.extractedText}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !store.extractedText && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-inherit"
                )}
              >
                <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">{t("reading.tutor.title")}</span>
              </button>
              <div className="my-2 border-t" />
              {pageLinks
                .filter((page) => !page.roles || (role && page.roles.includes(role)))
                .map((page) => {
                const Icon = page.icon;
                const isCurrent = !page.openDashboard && !page.openTeacherDashboard && pathname === page.href;
                const badgeCount = pageBadges[page.href] ?? 0;
                const badgeTone = page.href === "/vocabulary" ? "bg-orange-500" : "bg-red-500";
                return (
                  <div key={page.href} className="w-full">
                    {page.separatorAbove && <div className="my-2 border-t" />}
                    <button
                      onClick={() => handlePageLinkClick(page)}
                      title={
                        page.href === "/vocabulary" && badgeCount > 0
                          ? t("vocabulary.dueBadgeHint", { count: badgeCount })
                          : undefined
                      }
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isCurrent && "bg-accent text-accent-foreground font-medium"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1">{t(page.labelKey)}</span>
                      {badgeCount > 0 ? (
                        <span
                          className={cn(
                            "flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white",
                            badgeTone
                          )}
                        >
                          {badgeCount > 9 ? "9+" : badgeCount}
                        </span>
                      ) : (
                        isCurrent && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )
                      )}
                    </button>
                  </div>
                );
              })}
            </nav>
          </ScrollArea>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default SectionNavSheet;
