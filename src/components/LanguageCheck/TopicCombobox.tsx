"use client";
import React from "react";
import { BookMarked, ChevronsUpDown, Layers } from "lucide-react";
import { cn } from "@/utils/style";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { commandFilter } from "@/components/Internal/ClassCombobox";

interface TopicComboboxProps {
  topics: LanguageCheckStaffTopic[];
  /** Selected topic id, or null for "all topics". */
  value: string | null;
  onChange: (topicId: string | null) => void;
  /** Accessible name for the trigger button. */
  ariaLabel?: string;
  placeholder?: string;
  /** Pinned "all" option at the bottom that emits null. */
  allLabel?: string;
  emptyLabel?: string;
  searchPlaceholder?: string;
  /** Trigger label for a `value` that is not in `topics` (e.g. a topic kept
   *  open while the filters exclude it), so it need not be listed. */
  customLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Single-select writing-topic picker for the staff essay log — mirrors the
 * ClassCombobox / StudentCombobox UX (searchable cmdk list, selected marker,
 * pinned null-emitting "all" option).
 */
export default function TopicCombobox({
  topics,
  value,
  onChange,
  ariaLabel,
  placeholder,
  allLabel,
  emptyLabel,
  searchPlaceholder,
  customLabel,
  disabled = false,
  className,
}: TopicComboboxProps) {
  const [open, setOpen] = React.useState(false);
  // Search value = the title only, never the id — cmdk fuzzy-matches by
  // subsequence, so a UUID in the value makes any short query match
  // unrelated topics via its hex characters (same trap as ClassCombobox).
  const options = React.useMemo(
    () =>
      topics.map((t) => ({
        ...t,
        keywords: (t.title || "").toLowerCase(),
      })),
    [topics],
  );
  const selected = options.find((t) => t.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "h-9 w-56 justify-between font-normal",
            !selected && !(value != null && customLabel) && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {selected
              ? selected.title
              : value != null && customLabel
                ? customLabel
                : placeholder ?? ""}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(22rem,calc(100vw-2rem))] p-0"
        align="start"
        // Same scroll-lock guards as ClassCombobox (portaled content inside
        // dialogs / scroll-locked pages).
        onTouchMoveCapture={(e) => e.stopPropagation()}
        onWheelCapture={(e) => e.stopPropagation()}
      >
        <Command filter={commandFilter}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-72">
            {options.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                {emptyLabel}
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyLabel}</CommandEmpty>
                {options.map((topic) => (
                  <CommandItem
                    key={topic.id}
                    value={topic.keywords}
                    onSelect={() => {
                      onChange(topic.id);
                      setOpen(false);
                    }}
                  >
                    <BookMarked className="h-4 w-4 shrink-0 opacity-60" />
                    <span className="flex-1 truncate">{topic.title}</span>
                    <span className="h-4 w-4 shrink-0">
                      {value === topic.id && (
                        <Layers className="h-4 w-4 text-primary" />
                      )}
                    </span>
                  </CommandItem>
                ))}
              </>
            )}
          </CommandList>
          {allLabel && (
            <div className="border-t p-1">
              <CommandItem
                value={allLabel}
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <BookMarked className="h-4 w-4 shrink-0 opacity-60" />
                <span className="flex-1">{allLabel}</span>
              </CommandItem>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
