"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { User, HelpCircle, Trophy, BarChart3 } from "lucide-react";
import { useReadingStore } from "@/store/reading";
import { useGlobalStore } from "@/store/global";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/utils/style";

function StudentInfo() {
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  const { studentAge, setStudentAge } = useReadingStore();
  const { setOpenDashboard } = useGlobalStore();

  function getFormLevel(age: number): string {
    const levelMap: Record<number, string> = {
      8: t("reading.levels.primary3"),
      9: t("reading.levels.primary4"),
      10: t("reading.levels.primary5"),
      11: t("reading.levels.primary6"),
      12: t("reading.levels.form1"),
      13: t("reading.levels.form2"),
      14: t("reading.levels.form3"),
      15: t("reading.levels.form4"),
      16: t("reading.levels.form5"),
      17: t("reading.levels.form6"),
      18: t("reading.levels.dse"),
    };
    return levelMap[age] || t("reading.levels.form6");
  }

  function getRoleBadgeStyle(role: string): string {
    const styleMap: Record<string, string> = {
      "super-admin": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      teacher: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      student: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
    return styleMap[role] || "bg-muted text-muted-foreground";
  }

  function getLevelColor(age: number): string {
    if (age <= 11) return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    if (age <= 14) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  }

  return (
    <section className="p-4 border rounded-md">
      <div className="flex flex-wrap md:flex-nowrap items-center justify-between border-b pb-4 mb-4 gap-2">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          {t("reading.studentInfo.title")}
          <Popover>
            <PopoverTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
            </PopoverTrigger>
            <PopoverContent className="w-[400px]" align="start">
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-base">{t("reading.studentInfo.help.title")}</h4>
                <div className="space-y-2">
                  <p className="text-muted-foreground">{t("reading.studentInfo.help.ageSlider")}</p>
                  <p className="text-muted-foreground">{t("reading.studentInfo.help.estimatedLevel")}</p>
                  <p className="text-muted-foreground">{t("reading.studentInfo.help.usage")}</p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </h3>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setOpenDashboard(true)}>
            <BarChart3 className="h-4 w-4" />
            <span>{t("dashboard.title")}</span>
          </Button>
          <Button asChild size="sm">
            <Link href="/leaderboard">
              <Trophy className="h-4 w-4" />
              <span>{t("leaderboard.title")}</span>
            </Link>
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        {status === "authenticated" && session?.user?.name && (
          <div className="flex items-center gap-1 text-sm">
            <Label>{t("reading.studentInfo.nameLabel")}:</Label>
            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">{session.user.name}</span>
            {session.user.role && (
              <>
                <span className="text-muted-foreground">({t("reading.studentInfo.roleLabel")}:</span>
                <span className={cn("px-1.5 py-0.5 rounded text-xs font-semibold", getRoleBadgeStyle(session.user.role))}>
                  {t(`reading.studentInfo.roles.${session.user.role}`)}
                </span>
                <span className="text-muted-foreground">)</span>
              </>
            )}
          </div>
        )}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="age-slider">
              {t("reading.studentInfo.ageLabel")}
            </Label>
            <span className="text-lg font-bold text-primary">
              {studentAge} {t("reading.studentInfo.yearsOld")}
            </span>
          </div>
          <Slider
            id="age-slider"
            min={8}
            max={18}
            step={1}
            value={[studentAge]}
            onValueChange={(value) => setStudentAge(value[0])}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>8</span>
            <span>13</span>
            <span>18</span>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
          <span className="text-sm text-muted-foreground">
            {t("reading.studentInfo.estimatedLevel")}:
          </span>
          <span className={cn(
            "px-2 py-1 rounded text-sm font-medium",
            getLevelColor(studentAge)
          )}>
            {getFormLevel(studentAge)}
          </span>
        </div>
      </div>
    </section>
  );
}

export default StudentInfo;
