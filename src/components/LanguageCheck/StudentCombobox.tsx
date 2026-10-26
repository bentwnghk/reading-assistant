"use client";
import React from "react";
import { ChevronsUpDown, GraduationCap, Layers, LoaderCircle } from "lucide-react";
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

interface StudentComboboxProps {
  users: LanguageCheckStaffUser[];
  /** Selected user id, or null for "all students" / "my own". */
  value: string | null;
  onChange: (userId: string | null) => void;
  placeholder?: string;
  /** Pinned "all" option at the bottom that emits null. */
  allLabel?: string;
  emptyLabel?: string;
  searchPlaceholder?: string;
  /** While true a spinner row replaces the options. */
  loading?: boolean;
  loadingLabel?: string;
  /** Pinned "my own" option at the top that emits null (e.g. "My vocabulary"
   *  on /vocabulary); the trigger shows `mineLabel` when value is null.
   *  Pass at most one of allowMine / allLabel — both emit null. */
  allowMine?: boolean;
  mineLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Single-select student picker for staff filter bars — mirrors the
 * ClassCombobox UX of the User Management "Student Data" tab (searchable
 * cmdk list, selected marker, pinned null-emitting option).
 */
export default function StudentCombobox({
  users,
  value,
  onChange,
  placeholder,
  allLabel,
  emptyLabel,
  searchPlaceholder,
  loading = false,
  loadingLabel,
  allowMine = false,
  mineLabel,
  disabled = false,
  className,
}: StudentComboboxProps) {
  const [open, setOpen] = React.useState(false);
  // Search value = name + email, never the id — cmdk fuzzy-matches by
  // subsequence, so a UUID in the value makes any short query match
  // unrelated users via its hex characters (same trap as ClassCombobox).
  const options = React.useMemo(
    () => users.map((u) => ({ ...u, keywords: `${u.name} ${u.email}`.toLowerCase() })),
    [users],
  );
  const selected = options.find((u) => u.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selected && !(allowMine && value == null) && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {selected
              ? selected.name
              : allowMine && value == null
                ? mineLabel
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
          {allowMine && (
            <div className="border-b">
              <CommandItem
                value={mineLabel ?? ""}
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <GraduationCap className="h-4 w-4 shrink-0 opacity-60" />
                <span className="flex-1">{mineLabel}</span>
                {value == null && <Layers className="h-4 w-4 text-primary" />}
              </CommandItem>
            </div>
          )}
          <CommandList className="max-h-72">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {loadingLabel}
              </div>
            ) : options.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                {emptyLabel}
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyLabel}</CommandEmpty>
                {options.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.keywords}
                    onSelect={() => {
                      onChange(user.id);
                      setOpen(false);
                    }}
                  >
                    <GraduationCap className="h-4 w-4 shrink-0 opacity-60" />
                    <span className="flex-1 truncate">{user.name}</span>
                    <span className="max-w-28 truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                    <span className="h-4 w-4 shrink-0">
                      {value === user.id && <Layers className="h-4 w-4 text-primary" />}
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
                <GraduationCap className="h-4 w-4 shrink-0 opacity-60" />
                <span className="flex-1">{allLabel}</span>
              </CommandItem>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
