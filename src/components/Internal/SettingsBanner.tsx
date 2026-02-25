"use client";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/Internal/Button";
import { useSettingStore } from "@/store/setting";
import { useGlobalStore } from "@/store/global";

function SettingsBanner() {
  const { t } = useTranslation();
  const { openaicompatibleApiKey, accessPassword } = useSettingStore();
  const { setOpenSetting } = useGlobalStore();

  if (openaicompatibleApiKey || accessPassword) return null;

  return (
    <div className="bg-amber-100 dark:bg-amber-900/30 border-b-2 border-amber-400 dark:border-amber-600 px-4 py-3 -mx-4 mb-4 print:hidden">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {t("settingsBanner.message")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 border-amber-500 dark:border-amber-600 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800"
          onClick={() => setOpenSetting(true)}
        >
          {t("settingsBanner.openSettings")}
        </Button>
      </div>
    </div>
  );
}

export default SettingsBanner;
