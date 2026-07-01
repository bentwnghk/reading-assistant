"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GraduationCap, HelpCircle, Info, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/utils/style";

export interface GuideItem {
  /** Item key used to resolve `${itemsBaseKey}.${key}.name` and `.desc` */
  key: string;
  icon: React.ElementType;
  bgClass: string;
  iconClass: string;
}

export interface GuideDialogProps {
  /** i18n key for the dialog title */
  titleKey: string;
  /** Optional i18n key for the intro paragraph */
  introKey?: string;
  /** Base i18n key that items resolve against, e.g. "reading.summary.help.items" */
  itemsBaseKey?: string;
  items?: GuideItem[];
  /** Optional i18n key for the numbered-steps heading */
  stepsTitleKey?: string;
  /** Ordered list of i18n keys, one per step */
  stepsKeys?: string[];
  /** Optional i18n key for the tip heading */
  tipTitleKey?: string;
  /** Optional i18n key for the tip body text */
  tipContentKey?: string;
  /** Extra classes for the trigger button */
  triggerClassName?: string;
}

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
      <div
        className={cn(
          "shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
          bgClass,
        )}
      >
        <Icon className={cn("h-5 w-5", iconClass)} />
      </div>
      <div>
        <h4 className="font-semibold text-sm">{name}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

/**
 * Reusable help/guide dialog that mirrors the "How It Works" styling used
 * across the app (assignments, dashboard, etc.): a Sparkles-titled modal with
 * feature cards, an optional numbered step list, and an optional tip box.
 * Renders its own HelpCircle trigger and manages open state internally.
 */
export default function GuideDialog({
  titleKey,
  introKey,
  itemsBaseKey,
  items = [],
  stepsTitleKey,
  stepsKeys = [],
  tipTitleKey,
  tipContentKey,
  triggerClassName,
}: GuideDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t(titleKey)}
        className={cn(
          "text-muted-foreground hover:text-foreground transition-colors",
          triggerClassName,
        )}
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t(titleKey)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {introKey && (
              <p className="text-sm text-muted-foreground">{t(introKey)}</p>
            )}

            {items.length > 0 &&
              items.map((item) => (
                <IconCard
                  key={item.key}
                  icon={item.icon}
                  bgClass={item.bgClass}
                  iconClass={item.iconClass}
                  name={t(`${itemsBaseKey}.${item.key}.name`)}
                  desc={t(`${itemsBaseKey}.${item.key}.desc`)}
                />
              ))}

            {stepsKeys.length > 0 && (
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                {stepsTitleKey && (
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    {t(stepsTitleKey)}
                  </h4>
                )}
                <ol className="space-y-2.5">
                  {stepsKeys.map((stepKey, i) => (
                    <li key={stepKey} className="flex gap-2.5">
                      <div className="shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {i + 1}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                        {t(stepKey)}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {tipContentKey && (
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex gap-2">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  {tipTitleKey && (
                    <span className="font-medium text-foreground">
                      {t(tipTitleKey)}{" "}
                    </span>
                  )}
                  {t(tipContentKey)}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
