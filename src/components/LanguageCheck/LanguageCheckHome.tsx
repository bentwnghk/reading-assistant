"use client";
import { useState, type ComponentProps } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { GraduationCap, HelpCircle, SpellCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import EssayList from "@/components/LanguageCheck/EssayList";
import HelpDialog from "@/components/LanguageCheck/HelpDialog";
import MyLearning from "@/components/LanguageCheck/Learn/MyLearning";
import StaffLearning from "@/components/LanguageCheck/Learn/StaffLearning";
import StaffEssayLog from "@/components/LanguageCheck/StaffEssayLog";
import StaffFilterBar, {
  EMPTY_STAFF_SELECTION,
  type StaffSelection,
} from "@/components/LanguageCheck/StaffFilterBar";
import { SegmentedTabs } from "@/components/LanguageCheck/shared";
import { cn } from "@/utils/style";

type Scope = "mine" | "students";
type Section = "essays" | "learning";

const SECTIONS: Section[] = ["essays", "learning"];

/**
 * Landing view of /language-check.
 *
 *   Student   →  [ Essays | Learning ]
 *   Staff     →  [ My work | My students ]  +  [ Essays | Learning ]
 *                (+ one shared class/student filter on "My students")
 *
 * Both audiences get the same two sections ("the work" and "what was learned
 * from it"), so staff see the student view of the page mirrored for their
 * learners. The scope and section live in the URL (`?view=students&tab=learning`)
 * so a reload, a shared link or the browser's back button keeps the place.
 */
export default function LanguageCheckHome({
  essayListProps,
}: {
  essayListProps: ComponentProps<typeof EssayList>;
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
  const section: Section = params.get("tab") === "learning" ? "learning" : "essays";

  function navigate(next: { view?: Scope; tab?: Section }) {
    const q = new URLSearchParams(params.toString());
    const view = next.view ?? scope;
    const tab = next.tab ?? section;
    if (view === "students") q.set("view", "students");
    else q.delete("view");
    if (tab === "learning") q.set("tab", "learning");
    else q.delete("tab");
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
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
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {t("languageCheck.subtitle")}
          </p>
        </div>
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

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-1 border-b">
          {SECTIONS.map((x) => (
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
              {x === "learning" && <GraduationCap className="h-4 w-4" />}
              {t(`languageCheck.page.sections.${scope}.${x}`)}
            </button>
          ))}
        </div>

        {scope === "mine" ? (
          section === "essays" ? (
            <EssayList {...essayListProps} />
          ) : (
            <MyLearning />
          )
        ) : (
          <>
            <StaffFilterBar role={role} value={selection} onChange={setSelection} />
            {section === "essays" ? (
              <StaffEssayLog classId={selection.classId} userId={selection.userId} />
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
