"use client";

import { useEffect } from "react";

/**
 * Print always renders the light version of the page, whatever theme is on
 * screen — dark backgrounds in a printout waste ink and the light design is
 * the print-appropriate one. CSS alone cannot do this: Tailwind's `dark:`
 * variants key off the `.dark` class on `<html>` (next-themes
 * `attribute="class"`), and no selector can un-apply an ancestor's class. So
 * for the duration of printing we drop `.dark` — and next-themes'
 * `style.colorScheme` hint, which would otherwise keep the UA painting a dark
 * canvas behind the page — and restore exactly what was removed afterwards.
 *
 * `beforeprint`/`afterprint` cover every path into the print dialog: the
 * page's own Print button (`window.print()`), Ctrl/Cmd+P and the browser
 * menu. next-themes is never told anything — its state stays consistent
 * because the class is back exactly as it found it. Same technique as the
 * Daily Word calendar print (DailyWordCard.tsx).
 */
export function usePrintLightTheme(): void {
  useEffect(() => {
    const root = document.documentElement;
    let wasDark = false;
    let prevScheme: string | null = null;
    const before = () => {
      wasDark = root.classList.contains("dark");
      if (wasDark) root.classList.remove("dark");
      if (root.style.colorScheme && root.style.colorScheme !== "light") {
        prevScheme = root.style.colorScheme;
        root.style.colorScheme = "light";
      }
    };
    const after = () => {
      if (wasDark && !root.classList.contains("dark")) root.classList.add("dark");
      if (prevScheme !== null) {
        root.style.colorScheme = prevScheme;
        prevScheme = null;
      }
      wasDark = false;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
      // Unmount mid-preview (afterprint may never fire): restore anyway.
      after();
    };
  }, []);
}
