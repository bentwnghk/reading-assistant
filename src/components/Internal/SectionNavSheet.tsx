"use client";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  BarChart3,
  BookMarked,
  BookOpen,
  BookOpenCheck,
  Check,
  ChevronDown,
  Circle,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  HelpCircle,
  ImageIcon,
  Layers,
  Library,
  MessageCircle,
  SpellCheck,
  Sparkles,
  Trophy,
  Upload,
  User,
  Waypoints,
  PanelLeftClose,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import AgeSlider from "@/components/Internal/AgeSlider";
import { useReadingStore } from "@/store/reading";
import { useVocabularyStore } from "@/store/vocabulary";
import { useAssignmentsStore } from "@/store/assignments";
import {
  clampNavSidebarWidth,
  NAV_SIDEBAR_DEFAULT_WIDTH,
  NAV_SIDEBAR_MAX_WIDTH,
  NAV_SIDEBAR_MIN_WIDTH,
  useGlobalStore,
} from "@/store/global";
import { calculateProgress } from "@/utils/progress";
import { grammarGameBestScore } from "@/utils/sessionMetrics";
import { cn } from "@/utils/style";

interface SectionNavSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ReadingStoreState = ReturnType<typeof useReadingStore.getState>;

interface SectionActivity {
  // i18n key of the human instruction shown in the help popover.
  labelKey: string;
  done: (store: ReadingStoreState) => boolean;
}

interface SectionItem {
  id: string;
  icon: LucideIcon;
  labelKey: string;
  // Ordered steps a student must finish to earn the section's full tick. The
  // tick itself is derived from this list, so the tick and the "what's left"
  // help popover can never drift apart.
  activities: SectionActivity[];
  // Optional "started but not finished" state — renders a half tick instead of
  // no mark at all.
  checkPartial?: (store: ReadingStoreState) => boolean;
  isAccessible: (store: ReadingStoreState) => boolean;
}

// Partial-completion mark — "乄", a check-like glyph visually distinct from
// the full ✓. Same amber family as the help icons and the current-task box.
function HalfCheck() {
  return (
    <span
      className="flex h-4 w-4 shrink-0 items-center justify-center text-base leading-none text-amber-500 font-semibold dark:text-amber-400"
      aria-hidden="true"
    >
      乄
    </span>
  );
}

const sections: SectionItem[] = [
  {
    id: "section-upload",
    icon: Upload,
    labelKey: "toc.upload",
    activities: [
      {
        labelKey: "toc.activities.upload",
        done: (store: ReadingStoreState) => !!store.extractedText,
      },
    ],
    isAccessible: () => true,
  },
  {
    id: "section-pre-reading",
    icon: Sparkles,
    labelKey: "toc.preReading",
    // Scaffolding generated, then the student submitted a prediction.
    // Scaffolding alone is only "partial".
    activities: [
      {
        labelKey: "toc.activities.preReadingScaffold",
        done: (store: ReadingStoreState) => !!store.preReading,
      },
      {
        labelKey: "toc.activities.preReadingPrediction",
        done: (store: ReadingStoreState) =>
          store.studentPrediction.trim().length > 0,
      },
    ],
    checkPartial: (store: ReadingStoreState) => !!store.preReading,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-summary",
    icon: FileText,
    labelKey: "toc.summary",
    activities: [
      {
        labelKey: "toc.activities.summary",
        done: (store: ReadingStoreState) => !!store.summary,
      },
    ],
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-mindmap",
    icon: Waypoints,
    labelKey: "toc.mindmap",
    activities: [
      {
        labelKey: "toc.activities.mindmap",
        done: (store: ReadingStoreState) => !!store.mindMap,
      },
    ],
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-visualization",
    icon: ImageIcon,
    labelKey: "toc.visualization",
    activities: [
      {
        labelKey: "toc.activities.visualization",
        done: (store: ReadingStoreState) => !!store.visualizationImage,
      },
    ],
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-adapted",
    icon: BookOpen,
    labelKey: "toc.adapted",
    // Mirrors the 15-step checks in utils/progress.ts for this section:
    // adapted text AND sentence analysis AND word highlighting. Having the
    // adapted text alone is only "partial".
    activities: [
      {
        labelKey: "toc.activities.adaptText",
        done: (store: ReadingStoreState) => !!store.adaptedText,
      },
      {
        labelKey: "toc.activities.analyzeSentence",
        done: (store: ReadingStoreState) =>
          Object.keys(store.analyzedSentences).length > 0,
      },
      {
        labelKey: "toc.activities.highlightWords",
        done: (store: ReadingStoreState) => store.highlightedWords.length > 0,
      },
    ],
    checkPartial: (store: ReadingStoreState) => !!store.adaptedText,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-glossary",
    icon: BookMarked,
    labelKey: "toc.glossary",
    // Mirrors the 15-step checks in utils/progress.ts for this section:
    // glossary extracted AND spelling game played AND vocab quiz done.
    // Extracting the glossary alone is only "partial".
    activities: [
      {
        labelKey: "toc.activities.extractGlossary",
        done: (store: ReadingStoreState) => store.glossary.length > 0,
      },
      {
        labelKey: "toc.activities.playSpelling",
        done: (store: ReadingStoreState) => store.spellingGameBestScore > 0,
      },
      {
        labelKey: "toc.activities.vocabQuiz",
        done: (store: ReadingStoreState) => store.vocabularyQuizScore > 0,
      },
    ],
    checkPartial: (store: ReadingStoreState) => store.glossary.length > 0,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-collocations",
    icon: Layers,
    labelKey: "toc.collocations",
    activities: [
      {
        labelKey: "toc.activities.extractCollocations",
        done: (store: ReadingStoreState) => store.collocations.length > 0,
      },
    ],
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-test",
    icon: ClipboardCheck,
    labelKey: "toc.test",
    // Mirrors the 15-step checks in utils/progress.ts: generate the
    // questions, then complete the test. Questions generated but not yet
    // answered is only "partial".
    activities: [
      {
        labelKey: "toc.activities.generateTest",
        done: (store: ReadingStoreState) => store.readingTest.length > 0,
      },
      {
        labelKey: "toc.activities.completeTest",
        done: (store: ReadingStoreState) => store.testCompleted,
      },
    ],
    checkPartial: (store: ReadingStoreState) => store.readingTest.length > 0,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-grammar",
    icon: BookOpenCheck,
    labelKey: "toc.grammar",
    // Mirrors the 15-step checks in utils/progress.ts for the two grammar
    // steps: analyse the topics, complete the quiz AND play a grammar game.
    // Extracting topics alone is only "partial".
    activities: [
      {
        labelKey: "toc.activities.grammarTopics",
        done: (store: ReadingStoreState) => store.grammarTopics.length > 0,
      },
      {
        labelKey: "toc.activities.grammarQuiz",
        done: (store: ReadingStoreState) =>
          store.grammarQuizCompleted && store.grammarQuizScore > 0,
      },
      {
        labelKey: "toc.activities.grammarGame",
        done: (store: ReadingStoreState) =>
          grammarGameBestScore({
            grammarScrambleHighScore: store.grammarScrambleHighScore,
            grammarWorkshopHighScore: store.grammarWorkshopHighScore,
            grammarSurgeryHighScore: store.grammarSurgeryHighScore,
            grammarRouletteHighScore: store.grammarRouletteHighScore,
            grammarDuelHighScore: store.grammarDuelHighScore,
          }) > 0,
      },
    ],
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
    href: "/writing-assessment",
    icon: SpellCheck,
    labelKey: "languageCheck.navTitle",
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

/** The "Mr.🆖 ProReader" wordmark shared by the drawer title and the
 *  desktop sidebar header. `compact` renders the desktop sidebar variant one
 *  step smaller — that is what lets the show/hide button stay clear of the
 *  wordmark at the sidebar's narrower default/minimum widths. */
function BrandText({ compact = false }: { compact?: boolean }) {
  const titleSize = compact ? "text-lg" : "text-xl";
  const markSize = compact ? "text-xl" : "text-2xl";
  return (
    <>
      <span className={cn("text-blue-600 dark:text-blue-400", titleSize)}>Mr.</span>
      <span className={cn("leading-none", markSize)}>🆖</span>
      <span
        className={cn(
          "bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-500 dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400 bg-clip-text text-transparent font-bold relative overflow-hidden",
          titleSize
        )}
      >
        ProReader
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-white/20 to-transparent bg-[length:200%_100%] animate-shimmer" />
      </span>
    </>
  );
}

/**
 * Drag handle on the right edge of the desktop sidebar. Pointer capture keeps
 * the drag alive even when the pointer races ahead of the 6px strip; arrow
 * keys nudge the width for keyboard users; double-click resets to default.
 */
function SidebarResizeHandle({
  width,
  onWidthChange,
}: {
  width: number;
  onWidthChange: (width: number) => void;
}) {
  const { t } = useTranslation();
  const dragStart = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    dragStart.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: width,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    // Global cursor + text-selection lock while dragging (globals.css).
    document.documentElement.classList.add("nav-sidebar-resizing");
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = dragStart.current;
    if (!start) return;
    onWidthChange(clampNavSidebarWidth(start.startWidth + event.clientX - start.startX));
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    dragStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    document.documentElement.classList.remove("nav-sidebar-resizing");
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    // 16px per key press — coarse enough to feel responsive, fine enough
    // to reach every width between the clamps.
    const step = event.key === "ArrowLeft" ? -16 : event.key === "ArrowRight" ? 16 : 0;
    if (step === 0) return;
    event.preventDefault();
    onWidthChange(clampNavSidebarWidth(width + step));
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={t("toc.resizeSidebar")}
      aria-valuenow={width}
      aria-valuemin={NAV_SIDEBAR_MIN_WIDTH}
      aria-valuemax={NAV_SIDEBAR_MAX_WIDTH}
      tabIndex={0}
      title={t("toc.resizeSidebar")}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={handleKeyDown}
      onDoubleClick={() => onWidthChange(NAV_SIDEBAR_DEFAULT_WIDTH)}
      className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize touch-none select-none bg-transparent transition-colors hover:bg-primary/30 focus-visible:outline-none focus-visible:bg-primary/40 active:bg-primary/50"
    />
  );
}

/**
 * The nav entries themselves (reading-workflow sections, tutor chat, page
 * links). Shared verbatim by the mobile drawer and the desktop sidebar so
 * the two never drift. `onNavigate` fires after an entry is activated —
 * the drawer closes itself, the desktop sidebar stays put so it keeps
 * working side by side with the page content. Rows use compact spacing
 * (py-1.5 / space-y-0.5 / my-1) on both surfaces so the long menu fits
 * more items before it needs to scroll.
 */
function NavMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const store = useReadingStore();
  // Completion percentage for the current reading text — the same 15-step
  // figure shown in the box below the Grammar row and used by the dashboards,
  // from the documented single source of truth (utils/progress.ts).
  const progressPercent = calculateProgress(store);
  // Whether the User Info item's inline age panel is expanded. Ephemeral UI —
  // component-local state is fine (the menu remounts on SPA navigation).
  const [userInfoOpen, setUserInfoOpen] = useState(false);
  const dueForReviewCount = useVocabularyStore((s) => s.dueForReviewCount);
  const pendingAssignmentCount = useAssignmentsStore((s) => s.pendingAssignmentCount);
  const setOpenDashboard = useGlobalStore((s) => s.setOpenDashboard);
  const setOpenTeacherDashboard = useGlobalStore((s) => s.setOpenTeacherDashboard);
  const setOpenTutorChat = useGlobalStore((s) => s.setOpenTutorChat);
  const pageBadges: Record<string, number> = {
    "/vocabulary": dueForReviewCount,
    "/assignments": pendingAssignmentCount,
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
    onNavigate?.();
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
    onNavigate?.();
  }

  function handlePageLinkClick(page: PageLink) {
    if (page.openDashboard) {
      setOpenDashboard(true);
      onNavigate?.();
      return;
    }
    if (page.openTeacherDashboard) {
      setOpenTeacherDashboard(true);
      onNavigate?.();
      return;
    }
    if (pathname !== page.href) {
      router.push(page.href);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    onNavigate?.();
  }

  return (
    <nav className="space-y-0.5 p-2" aria-label={t("toc.title")}>
      {/* User Info: expands in place instead of scrolling to a home-page
          section — the User Information section was removed from the main
          page. Shared by the desktop sidebar and the mobile drawer (both
          render NavMenu). The inline slider edits the reading store's
          `studentAge` directly, so it stays in sync with the Settings
          dialog's User Info tab. */}
      <div>
        <button
          onClick={() => setUserInfoOpen((v) => !v)}
          aria-expanded={userInfoOpen}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-left transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <User className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1">{t("toc.studentInfo")}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              userInfoOpen && "rotate-180"
            )}
          />
        </button>
        {userInfoOpen && (
          <div className="px-3 pb-2 pt-1">
            {/* px-2 py-1: the label hugs the card's top edge so the
                expanded card takes as little vertical space as possible
                in the narrow sidebar/drawer. */}
            <div className="rounded-md border bg-muted/30 px-2 py-1">
              <AgeSlider compact />
            </div>
          </div>
        )}
      </div>
      {sections.map((section) => {
        const Icon = section.icon;
        // The full tick means every listed activity is done — the same list
        // the help popover walks through, so the two can never drift apart.
        const isCompleted = section.activities.every(
          (activity) => activity.done(store)
        );
        const isPartial =
          !isCompleted && !!section.checkPartial?.(store);
        const isAccessible = section.isAccessible(store);
        // Sections with unfinished activities get a help icon explaining what
        // is still missing for the full tick: immediately to the left of the
        // half tick when one is shown, otherwise in the slot where a tick
        // would be displayed.
        const showHelp = !isCompleted;
        return (
          <div
            key={section.id}
            role="button"
            tabIndex={isAccessible ? 0 : -1}
            aria-disabled={!isAccessible}
            onClick={() => handleSectionClick(section.id, isAccessible)}
            onKeyDown={(event) => {
              // Enter/Space on the row navigates — but not when the event
              // comes from the help button inside it (that opens the popover).
              if (event.target !== event.currentTarget) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleSectionClick(section.id, isAccessible);
              }
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-left transition-colors cursor-pointer",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              !isAccessible && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-inherit"
            )}
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">{t(section.labelKey)}</span>
            <span className="flex items-center gap-1 shrink-0">
              {showHelp && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={(event) => event.stopPropagation()}
                      aria-label={t("toc.activityHelpAria", { label: t(section.labelKey) })}
                      title={t("toc.activityHelpAria", { label: t(section.labelKey) })}
                      className="rounded-sm text-amber-500 transition-colors hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="right"
                    align="start"
                    sideOffset={8}
                    collisionPadding={12}
                    className="z-[60] w-60 p-3"
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                      {t("toc.activityHelpTitle")}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {section.activities.map((activity) => {
                        const done = activity.done(store);
                        return (
                          <li
                            key={activity.labelKey}
                            className="flex items-start gap-1.5 text-sm leading-snug"
                          >
                            {done ? (
                              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                            ) : (
                              <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            )}
                            <span className={done ? "text-muted-foreground" : undefined}>
                              {t(activity.labelKey)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </PopoverContent>
                </Popover>
              )}
              {isCompleted ? (
                // Full tick: green = done. HalfCheck stays amber (in progress),
                // matching the help icons.
                <Check className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
              ) : (
                isPartial && <HalfCheck />
              )}
            </span>
          </div>
        );
      })}
      {/* Current-task box directly below the last section (Grammar): the
          current reading text's completion percentage in a tight bordered
          box. Amber — the help icons' palette — while work remains; green
          once every activity is done (100%). Incomplete sections carry a
          help icon (click for the checklist) — the box shows the overall
          figure. */}
      <div
        className={cn(
          "mx-3 mt-0.5 mb-1.5 rounded-md border px-2.5 py-1 text-xs",
          progressPercent >= 100
            ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300"
            : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        )}
      >
        {t("toc.currentTaskProgress", { percent: progressPercent })}
      </div>
      <div className="my-1 border-t" />
      <button
        onClick={handleTutorClick}
        disabled={!store.extractedText}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-left transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !store.extractedText && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-inherit"
        )}
      >
        <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1">{t("reading.tutor.title")}</span>
      </button>
      <div className="my-1 border-t" />
      {pageLinks
        .filter((page) => !page.roles || (role && page.roles.includes(role)))
        .map((page) => {
        const Icon = page.icon;
        const isCurrent = !page.openDashboard && !page.openTeacherDashboard && pathname === page.href;
        const badgeCount = pageBadges[page.href] ?? 0;
        const badgeTone = page.href === "/vocabulary" ? "bg-orange-500" : "bg-red-500";
        return (
          <div key={page.href} className="w-full">
            {page.separatorAbove && <div className="my-1 border-t" />}
            <button
              onClick={() => handlePageLinkClick(page)}
              title={
                page.href === "/vocabulary" && badgeCount > 0
                  ? t("vocabulary.dueBadgeHint", { count: badgeCount })
                  : undefined
              }
              className={cn(
                "w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-left transition-colors",
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
  );
}

function SectionNavSheet({ open, onOpenChange }: SectionNavSheetProps) {
  const { t } = useTranslation();
  const navSidebarOpen = useGlobalStore((s) => s.navSidebarOpen);
  const navSidebarWidth = useGlobalStore((s) => s.navSidebarWidth);
  const setNavSidebarOpen = useGlobalStore((s) => s.setNavSidebarOpen);
  const setNavSidebarWidth = useGlobalStore((s) => s.setNavSidebarWidth);

  // Mirror the desktop sidebar state onto <html> so the page content — which
  // lives outside this component's tree, as a sibling of the Header on every
  // page — can make room for it: `--nav-sidebar-w` drives body padding-left
  // and `nav-sidebar-open` gates it to lg+ viewports (see globals.css). The
  // classes live on <html> (not in React state) so they survive the Header
  // remounting on every SPA navigation.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--nav-sidebar-w", `${clampNavSidebarWidth(navSidebarWidth)}px`);
    const wasOpen = root.classList.contains("nav-sidebar-open");
    root.classList.toggle("nav-sidebar-open", navSidebarOpen);
    // Animate only open/close toggles — width changes come from live
    // drag-resizing and must apply instantly, or the content visibly lags
    // behind the sidebar edge. (On a fresh load `wasOpen` is always false,
    // so an expanded sidebar slides content over once, deliberately.)
    if (wasOpen === navSidebarOpen) return;
    root.classList.add("nav-sidebar-anim");
    const timeout = window.setTimeout(() => root.classList.remove("nav-sidebar-anim"), 250);
    return () => {
      window.clearTimeout(timeout);
      root.classList.remove("nav-sidebar-anim");
    };
  }, [navSidebarOpen, navSidebarWidth]);

  // When the Header unmounts (pages without one, e.g. /privacy-policy), stop
  // reserving space for the sidebar. React runs unmount cleanups before the
  // next page's Header mounts its own sync effect, so in-app navigation never
  // sees a gap. `--nav-sidebar-w` is reset too — it is only meaningful while
  // a sidebar can exist.
  useEffect(() => {
    return () => {
      const root = document.documentElement;
      root.classList.remove("nav-sidebar-open", "nav-sidebar-anim", "nav-sidebar-resizing");
      root.style.removeProperty("--nav-sidebar-w");
    };
  }, []);

  return (
    <>
      {/* Desktop (lg+): persistent sidebar docked to the left edge, working
          side by side with the page content (which is padded via body). It
          stays mounted even when collapsed so the slide transition works;
          `inert` keeps its buttons out of the tab order while hidden. */}
      <aside
        inert={!navSidebarOpen}
        aria-label={t("toc.title")}
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden w-[var(--nav-sidebar-w)] flex-col border-r bg-background shadow-sm print:hidden",
          "lg:flex motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out",
          navSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Same height as the header's content row (lg:h-14) with the same
            safe-area top padding, so this row's bottom border lines up exactly
            with the header's border-b instead of floating a few px off.
            Horizontal clearance for the show/hide button comes from the compact
            wordmark + px-3, keeping it clear at the narrow default/minimum
            widths (default 232 / min 224). While the sidebar is expanded this
            row is the ONLY place the brand and the toggle appear — the header
            hides its duplicates — so the wordmark is a home link here, taking
            over that role from the header brand. */}
        <div className="flex items-center justify-between gap-1.5 px-3 shrink-0 pt-[calc(env(safe-area-inset-top,0px)+var(--ios-status-bar-gap))] h-[calc(env(safe-area-inset-top,0px)+var(--ios-status-bar-gap)+3.5rem)]">
          <h2 className="text-left text-lg font-semibold flex items-center gap-1.5">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <BrandText compact />
            </Link>
          </h2>
          {/* Expand/collapse toggle — replaces the old close button. Collapses
              the sidebar; the Header's hamburger (or this button, once
              re-expanded via the hamburger) brings it back. */}
          <button
            type="button"
            onClick={() => setNavSidebarOpen(false)}
            title={t("toc.hideSidebar")}
            aria-label={t("toc.hideSidebar")}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
        <ScrollArea className="flex-1 min-h-0 border-t">
          {/* The desktop sidebar stays open after navigation — no onNavigate. */}
          <NavMenu />
        </ScrollArea>
        <SidebarResizeHandle width={navSidebarWidth} onWidthChange={setNavSidebarWidth} />
      </aside>

      {/* Mobile (<lg): the original slide-in drawer. `lg:hidden` is a safety
          net for a drawer left open while the viewport grows past lg — the
          hamburger itself only opens this on <lg viewports. */}
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className={cn(
              "fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[85vw] flex-col border-r bg-background shadow-lg duration-200",
              "data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left",
              "lg:hidden"
            )}
          >
            <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
              <div>
                <DialogPrimitive.Title className="text-left text-xl font-semibold flex items-center gap-1.5">
                  <BrandText />
                </DialogPrimitive.Title>
              </div>
              <DialogPrimitive.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <PanelLeftClose className="h-4 w-4" />
                <span className="sr-only">{t("toc.hideSidebar")}</span>
              </DialogPrimitive.Close>
            </div>
            <ScrollArea className="flex-1 min-h-0 border-t">
              <NavMenu onNavigate={() => onOpenChange(false)} />
            </ScrollArea>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

export default SectionNavSheet;
