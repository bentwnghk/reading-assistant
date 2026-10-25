"use client";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { SegmentedTabs } from "@/components/LanguageCheck/shared";
import { useVocabularyStore } from "@/store/vocabulary";
import VocabularyContainer from "./VocabularyContainer";
import StaffVocabularyAnalytics from "./Analytics/StaffVocabularyAnalytics";

type View = "mine" | "analytics";

/**
 * /vocabulary entry. Students get the word bank as before. Teachers, admins and
 * super-admins additionally get a "Student analytics" view (`?view=analytics`)
 * next to their own vocabulary, so reload / back / shared links keep the place.
 */
export default function VocabularyHome() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const role = session?.user?.role;
  const isStaff = role === "teacher" || role === "admin" || role === "super-admin";
  const view: View = isStaff && params.get("view") === "analytics" ? "analytics" : "mine";

  function go(next: View) {
    const q = new URLSearchParams(params.toString());
    if (next === "analytics") q.set("view", "analytics");
    else q.delete("view");
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  if (!isStaff) return <VocabularyContainer />;

  return (
    <>
      <div className="mx-auto flex max-w-screen-lg items-center justify-end px-4 pt-4">
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
                  {t("vocabulary.analytics.view.analytics")}
                </span>
              ),
            },
          ]}
        />
      </div>
      {view === "mine" ? (
        <VocabularyContainer />
      ) : (
        <div className="mx-auto max-w-screen-lg px-4 py-4">
          <h1 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            {t("vocabulary.analytics.title")}
          </h1>
          <StaffVocabularyAnalytics
            role={role}
            onOpenStudent={(userId, name) => {
              void useVocabularyStore.getState().fetchVocabulary(userId, name);
              go("mine");
            }}
          />
        </div>
      )}
    </>
  );
}
