"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowUpDown,
  BookOpen,
  Brain,
  Building2,
  CreditCard,
  Download,
  Filter,
  GraduationCap,
  HelpCircle,
  Layers,
  Mail,
  MousePointer,
  School,
  Search,
  Shield,
  Upload,
  Users,
  UserCog,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/utils/style";

interface UserManagementGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type HelpTab = "tabs" | "features";

const TAB_ITEMS: { key: string; icon: React.ElementType; bgClass: string; iconClass: string }[] = [
  { key: "schools", icon: School, bgClass: "bg-violet-500/10", iconClass: "text-violet-500" },
  { key: "users", icon: Users, bgClass: "bg-blue-500/10", iconClass: "text-blue-500" },
  { key: "classes", icon: GraduationCap, bgClass: "bg-emerald-500/10", iconClass: "text-emerald-500" },
  { key: "classMembers", icon: UserCog, bgClass: "bg-teal-500/10", iconClass: "text-teal-500" },
  { key: "studentData", icon: BookOpen, bgClass: "bg-indigo-500/10", iconClass: "text-indigo-500" },
  { key: "aiQuestions", icon: Brain, bgClass: "bg-purple-500/10", iconClass: "text-purple-500" },
  { key: "subscriptions", icon: CreditCard, bgClass: "bg-amber-500/10", iconClass: "text-amber-500" },
];

const FEATURE_ITEMS: { key: string; icon: React.ElementType; bgClass: string; iconClass: string }[] = [
  { key: "sorting", icon: ArrowUpDown, bgClass: "bg-slate-500/10", iconClass: "text-slate-500" },
  { key: "filtering", icon: Filter, bgClass: "bg-cyan-500/10", iconClass: "text-cyan-500" },
  { key: "pagination", icon: Layers, bgClass: "bg-orange-500/10", iconClass: "text-orange-500" },
  { key: "roleManagement", icon: Shield, bgClass: "bg-rose-500/10", iconClass: "text-rose-500" },
  { key: "schoolAssignment", icon: Building2, bgClass: "bg-violet-500/10", iconClass: "text-violet-500" },
  { key: "bulkActions", icon: Users, bgClass: "bg-red-500/10", iconClass: "text-red-500" },
  { key: "search", icon: Search, bgClass: "bg-blue-500/10", iconClass: "text-blue-500" },
  { key: "dateRange", icon: MousePointer, bgClass: "bg-teal-500/10", iconClass: "text-teal-500" },
  { key: "exportImport", icon: Download, bgClass: "bg-green-500/10", iconClass: "text-green-500" },
  { key: "testEmails", icon: Mail, bgClass: "bg-pink-500/10", iconClass: "text-pink-500" },
  { key: "excelExport", icon: Upload, bgClass: "bg-emerald-500/10", iconClass: "text-emerald-500" },
];

function IconCard({
  icon: Icon,
  bgClass,
  iconClass,
  name,
  desc,
}: {
  icon: React.ElementType;
  bgClass: string;
  iconClass: string;
  name: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
      <div className={cn("shrink-0 w-10 h-10 rounded-full flex items-center justify-center", bgClass)}>
        <Icon className={cn("h-5 w-5", iconClass)} />
      </div>
      <div>
        <h4 className="font-semibold text-sm">{name}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

export default function UserManagementGuide({
  open,
  onOpenChange,
}: UserManagementGuideProps) {
  const { t } = useTranslation();
  const [helpTab, setHelpTab] = useState<HelpTab>("tabs");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            {t("userManagement.help.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setHelpTab("tabs")}
            className={cn(
              "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
              helpTab === "tabs"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("userManagement.help.tabs.tabs")}
          </button>
          <button
            onClick={() => setHelpTab("features")}
            className={cn(
              "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
              helpTab === "features"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("userManagement.help.tabs.features")}
          </button>
        </div>

        {helpTab === "tabs" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {t("userManagement.help.tabsContent.intro")}
            </p>

            {TAB_ITEMS.map((item) => (
              <IconCard
                key={item.key}
                icon={item.icon}
                bgClass={item.bgClass}
                iconClass={item.iconClass}
                name={t(`userManagement.help.tabsContent.items.${item.key}.name`)}
                desc={t(`userManagement.help.tabsContent.items.${item.key}.desc`)}
              />
            ))}

            <div className="mt-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t("userManagement.help.tabsContent.tip.title")}
                </span>{" "}
                {t("userManagement.help.tabsContent.tip.content")}
              </p>
            </div>
          </div>
        )}

        {helpTab === "features" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {t("userManagement.help.featuresContent.intro")}
            </p>

            {FEATURE_ITEMS.map((item) => (
              <IconCard
                key={item.key}
                icon={item.icon}
                bgClass={item.bgClass}
                iconClass={item.iconClass}
                name={t(`userManagement.help.featuresContent.items.${item.key}.name`)}
                desc={t(`userManagement.help.featuresContent.items.${item.key}.desc`)}
              />
            ))}

            <div className="mt-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t("userManagement.help.featuresContent.tip.title")}
                </span>{" "}
                {t("userManagement.help.featuresContent.tip.content")}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
