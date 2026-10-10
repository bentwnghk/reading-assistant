"use client";
import React from "react";
import { ChevronsUpDown, GraduationCap, Layers } from "lucide-react";
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
  /** Selected user id, or null for "all students". */
  value: string | null;
  onChange: (userId: string | null) => void;
  placeholder?: string;
  allLabel?: string;
  emptyLabel?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Single-select student picker for the staff essay log — mirrors the
 * ClassCombobox UX of the User Management "Student Data" tab (searchable
 * cmdk list, "All" option pinned at the bottom, selected marker).
 */
export default function StudentCombobox({
  users,
  value,
  onChange,
  placeholder,
  allLabel,
  emptyLabel,
  searchPlaceholder,
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
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {selected ? selected.name : placeholder ?? ""}
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
          </CommandList>
          <div className="border-t p-1">
            <CommandItem
              value={allLabel ?? ""}
              onSelect={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <GraduationCap className="h-4 w-4 shrink-0 opacity-60" />
              <span className="flex-1">{allLabel}</span>
            </CommandItem>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
