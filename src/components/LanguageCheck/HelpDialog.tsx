"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  ClipboardList,
  Cloud,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  GraduationCap,
  HelpCircle,
  ImagePlus,
  Languages,
  Route,
  ShieldCheck,
  SpellCheck,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/utils/style";
import {
  LANGUAGE_CHECK_ILLEGIBLE_MARKER,
  LANGUAGE_CHECK_LEARN_MAX_CATEGORIES,
  LANGUAGE_CHECK_MAX_PAGES,
  LANGUAGE_CHECK_RETENTION_DAYS,
} from "@/constants/languageCheck";

type HelpTab = "overview" | "transcript" | "results" | "learning";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isStaff: boolean;
}

function HelpRow({
  icon: Icon,
  tone,
  name,
  desc,
}: {
  icon: typeof ImagePlus;
  tone: string;
  name: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg bg-muted/50 p-3">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          tone,
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h4 className="text-sm font-semibold">{name}</h4>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function HelpTip({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{title}</span> {desc}
      </p>
    </div>
  );
}

/** Help guide — mirrors the /vocabulary help dialog pattern. */
export default function HelpDialog({ open, onOpenChange, isStaff }: HelpDialogProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<HelpTab>("overview");
  const marker = LANGUAGE_CHECK_ILLEGIBLE_MARKER;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scrollbar-hide max-h-[80vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            {t("languageCheck.help.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(["overview", "transcript", "results", "learning"] as const).map((x) => (
            <button
              key={x}
              onClick={() => setTab(x)}
              className={cn(
                "flex-1 rounded-md py-1.5 text-sm font-medium transition-colors",
                tab === x
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`languageCheck.help.tabs.${x}`)}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {t("languageCheck.help.overview.intro")}
            </p>
            <HelpRow
              icon={BookOpen}
              tone="bg-emerald-500/10 text-emerald-500"
              name={t("languageCheck.help.overview.sections.name")}
              desc={t("languageCheck.help.overview.sections.desc")}
            />
            <HelpRow
              icon={ImagePlus}
              tone="bg-indigo-500/10 text-indigo-500"
              name={t("languageCheck.help.overview.upload.name")}
              desc={t("languageCheck.help.overview.upload.desc", {
                max: LANGUAGE_CHECK_MAX_PAGES,
              })}
            />
            <HelpRow
              icon={FileText}
              tone="bg-blue-500/10 text-blue-500"
              name={t("languageCheck.help.overview.statuses.name")}
              desc={t("languageCheck.help.overview.statuses.desc")}
            />
            <HelpRow
              icon={Clock}
              tone="bg-orange-500/10 text-orange-500"
              name={t("languageCheck.help.overview.retention.name")}
              desc={t("languageCheck.help.overview.retention.desc", {
                days: LANGUAGE_CHECK_RETENTION_DAYS,
              })}
            />
            {isStaff && (
              <HelpRow
                icon={Users}
                tone="bg-amber-500/10 text-amber-500"
                name={t("languageCheck.help.overview.staff.name")}
                desc={t("languageCheck.help.overview.staff.desc")}
              />
            )}
            <HelpTip
              title={t("languageCheck.help.overview.tip.title")}
              desc={t("languageCheck.help.overview.tip.desc")}
            />
          </div>
        )}

        {tab === "transcript" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {t("languageCheck.help.transcript.intro")}
            </p>
            <HelpRow
              icon={Eye}
              tone="bg-cyan-500/10 text-cyan-500"
              name={t("languageCheck.help.transcript.review.name")}
              desc={t("languageCheck.help.transcript.review.desc")}
            />
            <HelpRow
              icon={ShieldCheck}
              tone="bg-green-500/10 text-green-500"
              name={t("languageCheck.help.transcript.verify.name")}
              desc={t("languageCheck.help.transcript.verify.desc")}
            />
            <HelpRow
              icon={HelpCircle}
              tone="bg-amber-500/10 text-amber-500"
              name={t("languageCheck.help.transcript.illegible.name", { marker })}
              desc={t("languageCheck.help.transcript.illegible.desc", { marker })}
            />
            <HelpTip
              title={t("languageCheck.help.transcript.tip.title")}
              desc={t("languageCheck.help.transcript.tip.desc")}
            />
          </div>
        )}

        {tab === "results" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {t("languageCheck.help.results.intro")}
            </p>
            <HelpRow
              icon={SpellCheck}
              tone="bg-rose-500/10 text-rose-500"
              name={t("languageCheck.help.results.tiers.name")}
              desc={t("languageCheck.help.results.tiers.desc")}
            />
            <HelpRow
              icon={Filter}
              tone="bg-violet-500/10 text-violet-500"
              name={t("languageCheck.help.results.filter.name")}
              desc={t("languageCheck.help.results.filter.desc")}
            />
            <HelpRow
              icon={Languages}
              tone="bg-sky-500/10 text-sky-500"
              name={t("languageCheck.help.results.language.name")}
              desc={t("languageCheck.help.results.language.desc")}
            />
            <HelpRow
              icon={Download}
              tone="bg-teal-500/10 text-teal-500"
              name={t("languageCheck.help.results.export.name")}
              desc={t("languageCheck.help.results.export.desc")}
            />
            <HelpTip
              title={t("languageCheck.help.results.tip.title")}
              desc={t("languageCheck.help.results.tip.desc")}
            />
          </div>
        )}

        {tab === "learning" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {t("languageCheck.help.learning.intro")}
            </p>
            <HelpRow
              icon={GraduationCap}
              tone="bg-emerald-500/10 text-emerald-500"
              name={t("languageCheck.help.learning.topics.name")}
              desc={t("languageCheck.help.learning.topics.desc", {
                max: LANGUAGE_CHECK_LEARN_MAX_CATEGORIES,
              })}
            />
            <HelpRow
              icon={Route}
              tone="bg-fuchsia-500/10 text-fuchsia-500"
              name={t("languageCheck.help.learning.path.name")}
              desc={t("languageCheck.help.learning.path.desc")}
            />
            <HelpRow
              icon={Cloud}
              tone="bg-cyan-500/10 text-cyan-500"
              name={t("languageCheck.help.learning.saved.name")}
              desc={t("languageCheck.help.learning.saved.desc")}
            />
            {isStaff && (
              <HelpRow
                icon={ClipboardList}
                tone="bg-amber-500/10 text-amber-500"
                name={t("languageCheck.help.learning.staff.name")}
                desc={t("languageCheck.help.learning.staff.desc")}
              />
            )}
            <HelpTip
              title={t("languageCheck.help.learning.tip.title")}
              desc={t("languageCheck.help.learning.tip.desc")}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
