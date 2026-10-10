"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Popover, PopoverAnchor } from "@/components/ui/popover";
import { cn } from "@/utils/style";
import {
  categoryStyle,
  explanationFor,
  useCategoryLabel,
} from "@/components/LanguageCheck/shared";
import type { ExplanationLanguage } from "@/store/languageCheck";

interface ErrorSpanProps {
  error: LanguageCheckError;
  number: number;
  text: string;
  language: ExplanationLanguage;
  active: boolean;
  onSelect: (id: string) => void;
}

const OPEN_DELAY = 120;
const CLOSE_DELAY = 180;

/**
 * Inline highlight with an interactive popover card. Mouse: hover-intent.
 * Touch / keyboard: tap, Enter or Space toggles. The popover never steals
 * focus, so hovering over text does not scroll the page.
 */
export default function ErrorSpan({
  error,
  number,
  text,
  language,
  active,
  onSelect,
}: ErrorSpanProps) {
  const { t } = useTranslation();
  const label = useCategoryLabel()(error.category);
  const style = categoryStyle(error.category);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerType = useRef<string>("mouse");

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const schedule = (next: boolean, delay: number) => {
    clearTimer();
    timer.current = setTimeout(() => setOpen(next), delay);
  };
  useEffect(() => clearTimer, []);

  const explanation = explanationFor(error, language);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <span
          ref={anchorRef}
          id={`lc-err-${error.id}`}
          role="button"
          tabIndex={0}
          aria-label={`${label} (${number})`}
          data-error-id={error.id}
          className={cn(
            "cursor-pointer rounded-md border border-black/10 px-1 py-0.5 transition-shadow dark:border-white/10",
            "box-decoration-clone",
            style.highlight,
            (active || open) && "ring-2 ring-primary ring-offset-1 ring-offset-background",
          )}
          onPointerDown={(e) => {
            pointerType.current = e.pointerType;
          }}
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") schedule(true, OPEN_DELAY);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") schedule(false, CLOSE_DELAY);
          }}
          onClick={() => {
            clearTimer();
            onSelect(error.id);
            setOpen((o) => (pointerType.current === "mouse" ? true : !o));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(error.id);
              setOpen((o) => !o);
            }
          }}
        >
          {text}
          <sup className="ml-0.5 text-[0.6em] font-semibold opacity-80">
            ({number})
          </sup>
        </span>
      </PopoverAnchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="top"
          align="center"
          sideOffset={8}
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            // Clicking the anchor itself must not dismiss-then-reopen.
            if (anchorRef.current?.contains(e.target as Node)) e.preventDefault();
          }}
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") clearTimer();
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") schedule(false, CLOSE_DELAY);
          }}
          className="z-[60] w-[min(26rem,calc(100vw-1.5rem))] rounded-xl border bg-popover p-4 text-popover-foreground shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            {label}{" "}
            <span className="font-semibold text-indigo-400">({number})</span>
          </p>
          <div className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="font-medium text-muted-foreground">
              {t("languageCheck.results.correctionLabel")}
            </span>{" "}
            {error.correction ? (
              <span className="font-semibold text-green-700 dark:text-green-400">
                {error.correction}
              </span>
            ) : (
              <span className="italic text-muted-foreground">
                {t("languageCheck.results.delete")}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm leading-relaxed">
            {explanation || t("languageCheck.results.noExplanation")}
          </p>
          <PopoverPrimitive.Arrow
            width={16}
            height={9}
            className="fill-popover stroke-border"
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </Popover>
  );
}
