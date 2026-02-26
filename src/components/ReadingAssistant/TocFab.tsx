"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu } from "lucide-react";
import TocDrawer from "./TocDrawer";

function TocFab() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors print:hidden flex items-center justify-center"
        title={t("toc.title")}
        aria-label={t("toc.title")}
      >
        <Menu className="h-5 w-5" />
      </button>
      <TocDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default TocFab;
