"use client";
import { useState, type ComponentProps } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { BarChart3, BookMarked, FileText, GraduationCap, HelpCircle, SpellCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import EssayList from "@/components/LanguageCheck/EssayList";
import HelpDialog from "@/components/LanguageCheck/HelpDialog";
import MyLearning from "@/components/LanguageCheck/Learn/MyLearning";
import StaffLearning from "@/components/LanguageCheck/Learn/StaffLearning";
import TopicLibrary from "@/components/LanguageCheck/TopicLibrary";
import TopicReports from "@/components/LanguageCheck/TopicReports";
import StaffEssayLog from "@/components/LanguageCheck/StaffEssayLog";
import StaffFilterBar, {
  EMPTY_STAFF_SELECTION,
  type StaffSelection,
} from "@/components/LanguageCheck/StaffFilterBar";
import { SegmentedTabs } from "@/components/LanguageCheck/shared";
import { cn } from "@/utils/style";

type Scope = "mine" | "students";
type Section = "essays" | "learning" | "topics" | "reports";

const SECTIONS: Section[] = ["reports", "essays", "learning"];
// The Topic Library is personal (not a student-scope view), so it only
// exists next to "My essays" / "My learning". Every "mine" view leads with
// it, mirroring how "My students" leads with Topic reports.
const MINE_SECTIONS: Section[] = ["topics", "essays", "learning"];
// What each scope lands on when no (valid) tab is in the URL: Topic Library
// in "My work" (staff and students alike), Topic reports under "My students".
// The non-default tabs must then be explicit in the URL.
const DEFAULT_SECTION: Record<Scope, Section> = { mine: "topics", students: "reports" };

/**
 * Landing view of /writing-assessment.
 *
 *   Student                →  [ Topics | Essays | Learning ]  (topics default)
 *   Staff → [ My work | My students ]
 *             My work:     [ Topics | Essays | Learning ]   (topics default)
 *             My students: [ Reports | Essays | Learning ]  (reports default)
 *                          + one shared class/student filter
 *
 * Both audiences get the same two sections ("the work" and "what was learned
 * from it"), so staff see the student view of the page mirrored for their
 * learners. Every view leads with its topic-centric tab and lands on it by
 * default — Topic Library in "My work", Topic reports under "My students".
 * The scope and section live in the URL (`?view=students&tab=learning`)
 * so a reload, a shared link or the browser's back button keeps the place.
 */
export default function LanguageCheckHome({
  essayListProps,
  onTopicUsed,
}: {
  essayListProps: ComponentProps<typeof EssayList>;
  /** "Use for upload" in the Topic Library: fired with the chosen topic
   *  before navigating to the upload view (class auto-scoping). */
  onTopicUsed?: (topic: LanguageCheckTopicSummary) => void;
}) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [showHelp, setShowHelp] = useState(false);
  const [selection, setSelection] = useState<StaffSelection>(EMPTY_STAFF_SELECTION);

  const role = session?.user?.role;
  const isStaff = role === "teacher" || role === "admin" || role === "super-admin";

  const scope: Scope = isStaff && params.get("view") === "students" ? "students" : "mine";
  const tab = params.get("tab");
  // A `tab` value is honoured only where it is valid ("essays" and "learning"
  // are valid in every scope; "topics"/"reports" are the defaults of their own
  // scopes and fall through). Anything else falls back to the scope's default.
  const section: Section =
    tab === "essays"
      ? "essays"
      : tab === "learning"
        ? "learning"
        : DEFAULT_SECTION[scope];

  const sections = scope === "mine" ? MINE_SECTIONS : SECTIONS;

  function navigate(next: { view?: Scope; tab?: Section }) {
    const q = new URLSearchParams(params.toString());
    const view = next.view ?? scope;
    const nextTab = next.tab ?? section;
    if (view === "students") q.set("view", "students");
    else q.delete("view");
    const valid: Section[] = view === "mine" ? MINE_SECTIONS : SECTIONS;
    // The default section stays out of the URL; invalid carry-overs when
    // flipping scope (e.g. Topic Library → My students) fall back to it.
    if (nextTab !== DEFAULT_SECTION[view] && valid.includes(nextTab)) q.set("tab", nextTab);
    else q.delete("tab");
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <SpellCheck className="h-6 w-6 text-primary" />
            {t("languageCheck.title")}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowHelp(true)}
              title={t("languageCheck.help.title")}
              aria-label={t("languageCheck.help.title")}
            >
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </Button>
          </h1>
          {isStaff && (
            <SegmentedTabs
              value={scope}
              onChange={(view) => navigate({ view })}
              ariaLabel={t("languageCheck.page.scopeLabel")}
              options={[
                { value: "mine", label: t("languageCheck.page.scope.mine") },
                { value: "students", label: t("languageCheck.page.scope.students") },
              ]}
            />
          )}
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("languageCheck.subtitle")}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-1 border-b">
          {sections.map((x) => (
            <button
              key={x}
              type="button"
              role="tab"
              aria-selected={section === x}
              onClick={() => navigate({ tab: x })}
              className={cn(
                "-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                section === x
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {x === "essays" && <FileText className="h-4 w-4" />}
              {x === "learning" && <GraduationCap className="h-4 w-4" />}
              {x === "topics" && <BookMarked className="h-4 w-4" />}
              {x === "reports" && <BarChart3 className="h-4 w-4" />}
              {x === "topics"
                ? t("languageCheck.topics.tab")
                : t(`languageCheck.page.sections.${scope}.${x}`)}
            </button>
          ))}
        </div>

        {scope === "mine" ? (
          section === "essays" ? (
            <EssayList {...essayListProps} />
          ) : section === "topics" ? (
            <TopicLibrary
              onUseTopic={(topic) => {
                onTopicUsed?.(topic);
                navigate({ tab: "essays" });
              }}
            />
          ) : (
            <MyLearning />
          )
        ) : (
          <>
            {/* Tab intro sits above the shared class/student filter bar — it
                describes the tab, the bar narrows what the tab shows. */}
            <p className="max-w-2xl text-sm text-muted-foreground">
              {section === "essays"
                ? t("languageCheck.staff.intro")
                : section === "reports"
                  ? t("languageCheck.reports.intro")
                  : t("languageCheck.learnData.staffIntro")}
            </p>
            <StaffFilterBar
              role={role}
              value={selection}
              onChange={setSelection}
              allowMine
              hideStudent={section === "reports"}
            />
            {section === "essays" ? (
              <StaffEssayLog classId={selection.classId} userId={selection.userId} />
            ) : section === "reports" ? (
              <TopicReports classId={selection.classId} />
            ) : (
              <StaffLearning
                classId={selection.classId}
                userId={selection.userId}
                onPickStudent={(userId) => setSelection((s) => ({ ...s, userId }))}
              />
            )}
          </>
        )}
      </div>

      <HelpDialog open={showHelp} onOpenChange={setShowHelp} isStaff={isStaff} />
    </div>
  );
}
