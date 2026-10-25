"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedTabs } from "@/components/LanguageCheck/shared";
import { useVocabularyStore } from "@/store/vocabulary";
import VocabularyContainer from "./VocabularyContainer";
import StaffVocabularyAnalytics from "./Analytics/StaffVocabularyAnalytics";
import MyVocabularyAnalytics from "./Analytics/MyVocabularyAnalytics";
import HelpDialog from "./HelpDialog";

type View = "mine" | "analytics";

/**
 * /vocabulary entry. Everyone gets a view switch (`?view=analytics`, so
 * reload / back / shared links keep the place): students between their word
 * bank and "My analytics"; teachers, admins and super-admins between their own
 * word bank and the "Student analytics" panel.
 */
export default function VocabularyHome() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [showHelp, setShowHelp] = useState(false);

  const role = session?.user?.role;
  const isStaff = role === "teacher" || role === "admin" || role === "super-admin";
  const view: View = params.get("view") === "analytics" ? "analytics" : "mine";

  function go(next: View) {
    const q = new URLSearchParams(params.toString());
    if (next === "analytics") q.set("view", "analytics");
    else q.delete("view");
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // The view switch lives in the page-header row, next to the visible title.
  const switcher = (
    <SegmentedTabs
      value={view}
      onChange={go}
      ariaLabel={t("vocabulary.analytics.viewLabel")}
      options={[
        { value: "mine", label: t("vocabulary.analytics.view.mine") },
        {
          value: "analytics",
          label: (
            <span className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" />
              {isStaff
                ? t("vocabulary.analytics.view.analytics")
                : t("vocabulary.analytics.view.myAnalytics")}
            </span>
          ),
        },
      ]}
    />
  );

  // The ? guide is reachable from every /vocabulary view: the word bank
  // (VocabularyContainer) renders its own; this one backs the analytics headers.
  const helpButton = (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={() => setShowHelp(true)}
      title={t("vocabulary.help.title")}
    >
      <HelpCircle className="h-4 w-4 text-muted-foreground" />
    </Button>
  );

  if (view === "mine") return <VocabularyContainer headerSlot={switcher} />;

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-screen-lg px-4 py-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            {t("vocabulary.analytics.myTitle")}
            {helpButton}
          </h1>
          {switcher}
        </div>
        <MyVocabularyAnalytics />
        <HelpDialog open={showHelp} onOpenChange={setShowHelp} isTeacherOrAbove={isStaff} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-lg px-4 py-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <BarChart3 className="h-5 w-5 text-indigo-500" />
          {t("vocabulary.analytics.title")}
          {helpButton}
        </h1>
        {switcher}
      </div>
      <StaffVocabularyAnalytics
        role={role}
        onOpenStudent={(userId, name) => {
          void useVocabularyStore.getState().fetchVocabulary(userId, name);
          go("mine");
        }}
      />
      <HelpDialog open={showHelp} onOpenChange={setShowHelp} isTeacherOrAbove={isStaff} />
    </div>
  );
}
