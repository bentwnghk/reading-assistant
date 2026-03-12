"use client";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { User, HelpCircle } from "lucide-react";
import { useReadingStore } from "@/store/reading";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/utils/style";

function StudentInfo() {
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  const { studentAge, setStudentAge } = useReadingStore();

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

  function getLevelColor(age: number): string {
    if (age <= 11) return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    if (age <= 14) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  }

  function formatName(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return name;
    const surname = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(" ");
    return `${surname}, ${firstName}`;
  }

  return (
    <section className="p-4 border rounded-md">
      <h3 className="font-semibold text-lg border-b mb-4 leading-10 flex items-center gap-2">
        <User className="h-5 w-5 text-muted-foreground" />
        {t("reading.studentInfo.title")}
        {status === "authenticated" && session?.user?.name && (
          <span className="text-muted-foreground font-normal">({formatName(session.user.name)})</span>
        )}
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
      <div className="space-y-4">
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
