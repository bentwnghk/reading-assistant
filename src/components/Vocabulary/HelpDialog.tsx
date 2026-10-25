"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  BookMarked,
  BookOpen,
  Brain,
  CheckCircle2,
  ClipboardList,
  Clock,
  Combine,
  Eye,
  FileDown,
  Flame,
  Gauge,
  HelpCircle,
  History,
  Layers,
  ListChecks,
  Lock,
  RotateCcw,
  Share2,
  Shuffle,
  Sparkles,
  SpellCheck,
  Table,
  Trash2,
  TrendingDown,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/utils/style";

type HelpTab = "overview" | "review" | "extras" | "analytics";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Teachers/admins/super-admins also see the staff-only entries (view student data, Student analytics). */
  isTeacherOrAbove: boolean;
}

function HelpRow({
  icon: Icon,
  tone,
  name,
  desc,
}: {
  icon: LucideIcon;
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

/**
 * "My Vocabulary Guide" — shared by the word bank (VocabularyContainer) and
 * both analytics views (VocabularyHome), so the guide is reachable from every
 * /vocabulary view. Staff-gated entries describe teacher-only features.
 */
export default function HelpDialog({
  open,
  onOpenChange,
  isTeacherOrAbove,
}: HelpDialogProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<HelpTab>("overview");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scrollbar-hide max-h-[80vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            {t("vocabulary.help.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(["overview", "review", "extras", "analytics"] as const).map((x) => (
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
              {t(`vocabulary.help.tabs.${x}`)}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {t("vocabulary.help.overview.intro")}
            </p>
            <HelpRow
              icon={BookMarked}
              tone="bg-indigo-500/10 text-indigo-500"
              name={t("vocabulary.help.overview.stats.total.name")}
              desc={t("vocabulary.help.overview.stats.total.desc")}
            />
            <HelpRow
              icon={Clock}
              tone="bg-orange-500/10 text-orange-500"
              name={t("vocabulary.help.overview.stats.due.name")}
              desc={t("vocabulary.help.overview.stats.due.desc")}
            />
            <HelpRow
              icon={CheckCircle2}
              tone="bg-green-500/10 text-green-500"
              name={t("vocabulary.help.overview.stats.mastered.name")}
              desc={t("vocabulary.help.overview.stats.mastered.desc")}
            />
            <HelpRow
              icon={Brain}
              tone="bg-blue-500/10 text-blue-500"
              name={t("vocabulary.help.overview.stats.new.name")}
              desc={t("vocabulary.help.overview.stats.new.desc")}
            />
            <HelpRow
              icon={Table}
              tone="bg-primary/10 text-primary"
              name={t("vocabulary.help.overview.table.title")}
              desc={t("vocabulary.help.overview.table.desc")}
            />
            <HelpRow
              icon={Combine}
              tone="bg-cyan-500/10 text-cyan-500"
              name={t("vocabulary.help.overview.phrases.name")}
              desc={t("vocabulary.help.overview.phrases.desc")}
            />
            <HelpRow
              icon={BookOpen}
              tone="bg-purple-500/10 text-purple-500"
              name={t("vocabulary.help.overview.studyPlan.name")}
              desc={t("vocabulary.help.overview.studyPlan.desc")}
            />
            <HelpTip
              title={t("vocabulary.help.overview.clickableStats.name")}
              desc={t("vocabulary.help.overview.clickableStats.desc")}
            />
          </div>
        )}

        {tab === "review" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {t("vocabulary.help.review.intro")}
            </p>
            <HelpRow
              icon={Layers}
              tone="bg-indigo-500/10 text-indigo-500"
              name={t("vocabulary.help.review.flashcard.name")}
              desc={t("vocabulary.help.review.flashcard.desc")}
            />
            <div className="ml-4 grid grid-cols-2 gap-2">
              {(["again", "hard", "good", "easy"] as const).map((key) => (
                <div key={key} className="flex gap-2 rounded-md bg-muted/30 p-2">
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      key === "again" && "bg-rose-500/10 text-rose-500",
                      key === "hard" && "bg-orange-500/10 text-orange-500",
                      key === "good" && "bg-blue-500/10 text-blue-500",
                      key === "easy" && "bg-green-500/10 text-green-500",
                    )}
                  >
                    {key === "again" ? (
                      <RotateCcw className="h-3.5 w-3.5" />
                    ) : (
                      key.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-semibold">
                      {t(`vocabulary.help.review.${key}.name`)}
                    </span>
                    <p className="text-[10px] leading-tight text-muted-foreground">
                      {t(`vocabulary.help.review.${key}.desc`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <HelpRow
              icon={ClipboardList}
              tone="bg-purple-500/10 text-purple-500"
              name={t("vocabulary.help.review.quiz.name")}
              desc={t("vocabulary.help.review.quiz.desc")}
            />
            <HelpRow
              icon={SpellCheck}
              tone="bg-pink-500/10 text-pink-500"
              name={t("vocabulary.help.review.spelling.name")}
              desc={t("vocabulary.help.review.spelling.desc")}
            />
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs">
                <span className="font-semibold">
                  {t("vocabulary.help.review.srs.title")}
                </span>{" "}
                <span className="text-muted-foreground">
                  {t("vocabulary.help.review.srs.desc")}
                </span>
              </p>
            </div>
          </div>
        )}

        {tab === "extras" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {t("vocabulary.help.extras.intro")}
            </p>
            <HelpRow
              icon={Zap}
              tone="bg-yellow-500/10 text-yellow-500"
              name={t("vocabulary.help.extras.autoSelect.name")}
              desc={t("vocabulary.help.extras.autoSelect.desc")}
            />
            <div className="ml-4 grid grid-cols-2 gap-2">
              {(
                [
                  { key: "due", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
                  { key: "hardest", icon: Flame, color: "text-rose-500", bg: "bg-rose-500/10" },
                  { key: "newest", icon: Sparkles, color: "text-sky-500", bg: "bg-sky-500/10" },
                  { key: "random", icon: Shuffle, color: "text-violet-500", bg: "bg-violet-500/10" },
                  { key: "weakest", icon: TrendingDown, color: "text-amber-500", bg: "bg-amber-500/10" },
                ] as { key: string; icon: typeof Clock; color: string; bg: string }[]
              ).map(({ key, icon: Icon, color, bg }) => (
                <div key={key} className="flex gap-2 rounded-md bg-muted/30 p-2">
                  <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", bg, color)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold">
                      {t(`vocabulary.help.extras.autoSelect.strategies.${key}.name`)}
                    </span>
                    <p className="text-[10px] leading-tight text-muted-foreground">
                      {t(`vocabulary.help.extras.autoSelect.strategies.${key}.desc`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <HelpRow
              icon={FileDown}
              tone="bg-teal-500/10 text-teal-500"
              name={t("vocabulary.help.extras.export.name")}
              desc={t("vocabulary.help.extras.export.desc")}
            />
            <HelpRow
              icon={ListChecks}
              tone="bg-cyan-500/10 text-cyan-500"
              name={t("vocabulary.help.extras.reviewLists.name")}
              desc={t("vocabulary.help.extras.reviewLists.desc")}
            />
            <HelpRow
              icon={Share2}
              tone="bg-blue-500/10 text-blue-500"
              name={t("vocabulary.help.extras.share.name")}
              desc={t("vocabulary.help.extras.share.desc")}
            />
            <HelpRow
              icon={History}
              tone="bg-slate-500/10 text-slate-500"
              name={t("vocabulary.help.extras.history.name")}
              desc={t("vocabulary.help.extras.history.desc")}
            />
            <HelpRow
              icon={Trash2}
              tone="bg-red-500/10 text-red-500"
              name={t("vocabulary.help.extras.deleteWords.name")}
              desc={t("vocabulary.help.extras.deleteWords.desc")}
            />
            {isTeacherOrAbove && (
              <HelpRow
                icon={Eye}
                tone="bg-amber-500/10 text-amber-500"
                name={t("vocabulary.help.extras.studentView.name")}
                desc={t("vocabulary.help.extras.studentView.desc")}
              />
            )}
            <HelpTip
              title={t("vocabulary.help.extras.tip.title")}
              desc={t("vocabulary.help.extras.tip.content")}
            />
          </div>
        )}

        {tab === "analytics" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {t("vocabulary.help.analytics.intro")}
            </p>
            <HelpRow
              icon={BarChart3}
              tone="bg-indigo-500/10 text-indigo-500"
              name={t("vocabulary.help.analytics.switch.name")}
              desc={t("vocabulary.help.analytics.switch.desc")}
            />
            <HelpRow
              icon={Gauge}
              tone="bg-sky-500/10 text-sky-500"
              name={t("vocabulary.help.analytics.cards.name")}
              desc={t("vocabulary.help.analytics.cards.desc")}
            />
            <HelpRow
              icon={TrendingUp}
              tone="bg-emerald-500/10 text-emerald-500"
              name={t("vocabulary.help.analytics.charts.name")}
              desc={t("vocabulary.help.analytics.charts.desc")}
            />
            <HelpRow
              icon={Clock}
              tone="bg-orange-500/10 text-orange-500"
              name={t("vocabulary.help.analytics.range.name")}
              desc={t("vocabulary.help.analytics.range.desc")}
            />
            {!isTeacherOrAbove && (
              <HelpRow
                icon={Lock}
                tone="bg-violet-500/10 text-violet-500"
                name={t("vocabulary.help.analytics.private.name")}
                desc={t("vocabulary.help.analytics.private.desc")}
              />
            )}
            {isTeacherOrAbove && (
              <HelpRow
                icon={Eye}
                tone="bg-amber-500/10 text-amber-500"
                name={t("vocabulary.help.analytics.staff.name")}
                desc={t("vocabulary.help.analytics.staff.desc")}
              />
            )}
            <HelpTip
              title={t("vocabulary.help.analytics.tip.title")}
              desc={t("vocabulary.help.analytics.tip.content")}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
