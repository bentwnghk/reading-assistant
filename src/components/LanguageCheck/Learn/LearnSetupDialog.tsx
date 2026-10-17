"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { GraduationCap, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/utils/style";
import {
  LANGUAGE_CHECK_LEARN_MAX_AGE,
  LANGUAGE_CHECK_LEARN_MAX_CATEGORIES,
  LANGUAGE_CHECK_LEARN_MIN_AGE,
  isExpressionCategory,
  type LanguageCheckCategory,
} from "@/constants/languageCheck";
import {
  categoryStyle,
  useCategoryLabel,
} from "@/components/LanguageCheck/shared";
import useLanguageCheckLearn from "@/hooks/useLanguageCheckLearn";
import { useLanguageCheckStore } from "@/store/languageCheck";
import { countByCategory, learnUrl, levelKeyForAge } from "@/utils/languageCheckLearn";

interface LearnSetupDialogProps {
  essay: LanguageCheckEssay;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Step 1 of "Learn from your mistakes": choose which error categories to
 * study and the learner's level. Starting hands over to the learning page;
 * everything else (generation, progress) lives in the learn store.
 */
export default function LearnSetupDialog({ essay, open, onOpenChange }: LearnSetupDialogProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const categoryLabel = useCategoryLabel();
  const { begin } = useLanguageCheckLearn();
  const learnAge = useLanguageCheckStore((s) => s.learnAge);
  const setLearnAge = useLanguageCheckStore((s) => s.setLearnAge);

  const counts = countByCategory(essay.corrections);
  const errors = counts.filter((c) => !isExpressionCategory(c.category));
  const suggestions = counts.filter((c) => isExpressionCategory(c.category));
  const max = LANGUAGE_CHECK_LEARN_MAX_CATEGORIES;

  // Default to the most frequent error categories (suggestions are opt-in).
  const [selected, setSelected] = useState<LanguageCheckCategory[]>(() =>
    (errors.length > 0 ? errors : suggestions).slice(0, 2).map((c) => c.category),
  );

  const [starting, setStarting] = useState(false);
  const atLimit = selected.length >= max;

  function toggle(category: LanguageCheckCategory) {
    setSelected((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : prev.length >= max
          ? prev
          : [...prev, category],
    );
  }

  function pickTop(n: number) {
    setSelected(
      [...errors, ...suggestions].slice(0, Math.min(n, max)).map((c) => c.category),
    );
  }

  async function start() {
    if (selected.length === 0 || starting) return;
    setStarting(true);
    try {
      const result = await begin(essay, selected, learnAge);
      if (!result) return;
      if (result.resumed) toast.info(t("languageCheck.learn.setup.resumed"));
      onOpenChange(false);
      router.push(learnUrl(result.id));
    } finally {
      setStarting(false);
    }
  }

  function renderRow({ category, count }: { category: LanguageCheckCategory; count: number }) {
    const checked = selected.includes(category);
    const disabled = !checked && atLimit;
    const id = `learn-cat-${category}`;
    return (
      <label
        key={category}
        htmlFor={id}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
          checked ? "border-primary bg-primary/5" : "hover:bg-accent",
          disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
        )}
      >
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={() => toggle(category)}
        />
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", categoryStyle(category).dot)} />
        <span className="min-w-0 flex-1 text-sm font-medium">{categoryLabel(category)}</span>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
          {t("languageCheck.learn.setup.mistakes", { count })}
        </span>
      </label>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl grid-rows-[auto_minmax(0,1fr)_auto]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {t("languageCheck.learn.setup.title")}
          </DialogTitle>
          <DialogDescription>{t("languageCheck.learn.setup.description")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-5 overflow-y-auto pr-1">
          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{t("languageCheck.learn.setup.chooseTitle")}</h3>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => pickTop(3)}>
                  {t("languageCheck.learn.setup.pickTop", { count: 3 })}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setSelected([])}
                  disabled={selected.length === 0}
                >
                  {t("languageCheck.learn.setup.clear")}
                </Button>
              </div>
            </div>
            {errors.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("languageCheck.results.tierErrors")}
                </p>
                {errors.map(renderRow)}
              </div>
            )}
            {suggestions.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("languageCheck.results.tierSuggestions")}
                </p>
                {suggestions.map(renderRow)}
              </div>
            )}
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {atLimit
                ? t("languageCheck.learn.setup.limit", { max })
                : t("languageCheck.learn.setup.selected", { count: selected.length, max })}
            </p>
          </section>

          <section className="space-y-3 rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{t("languageCheck.learn.setup.levelTitle")}</h3>
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                {t(`reading.levels.${levelKeyForAge(learnAge)}`)}
              </span>
            </div>
            <Slider
              min={LANGUAGE_CHECK_LEARN_MIN_AGE}
              max={LANGUAGE_CHECK_LEARN_MAX_AGE}
              step={1}
              value={[learnAge]}
              onValueChange={([v]) => setLearnAge(v)}
              aria-label={t("languageCheck.learn.setup.levelTitle")}
            />
            <p className="text-xs text-muted-foreground">
              {t("languageCheck.learn.setup.levelHint", { age: learnAge })}
            </p>
          </section>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("languageCheck.cancel")}
          </Button>
          <Button type="button" onClick={() => void start()} disabled={selected.length === 0 || starting}>
            {starting && <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />}
            {t("languageCheck.learn.setup.start")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
