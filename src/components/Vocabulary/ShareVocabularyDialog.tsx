"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Search, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ShareTargetGroup } from "@/lib/shared-sessions";

interface ShareVocabularyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedWordIds: Set<string>;
  wordCount: number;
}

export default function ShareVocabularyDialog({
  open,
  onOpenChange,
  selectedWordIds,
  wordCount,
}: ShareVocabularyDialogProps) {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<ShareTargetGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!open) {
      setGroups([]);
      setSelectedIds(new Set());
      setSearch("");
      return;
    }
    setLoading(true);
    fetch("/api/shares/targets")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ShareTargetGroup[]) => setGroups(data))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [open]);

  const hasSchools = groups.some((g) => g.schoolId);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        users: g.users.filter(
          (u) =>
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.users.length > 0);
  }, [groups, search]);

  const filteredGroupedBySchool = useMemo(() => {
    if (!hasSchools)
      return [
        {
          schoolId: undefined,
          schoolName: undefined,
          groups: filteredGroups,
        },
      ];
    const map = new Map<string | undefined, typeof filteredGroups>();
    for (const g of filteredGroups) {
      const key = g.schoolId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    }
    return [...map.entries()].map(([schoolId, groups]) => ({
      schoolId,
      schoolName: groups[0]?.schoolName,
      groups,
    }));
  }, [filteredGroups, hasSchools]);

  const allFilteredIds = useMemo(
    () => new Set(filteredGroups.flatMap((g) => g.users.map((u) => u.id))),
    [filteredGroups]
  );

  const allSelected =
    allFilteredIds.size > 0 &&
    allFilteredIds.size <= selectedIds.size &&
    [...allFilteredIds].every((id) => selectedIds.has(id));

  const toggleUser = useCallback((userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  const toggleGroup = useCallback((group: ShareTargetGroup) => {
    const groupIds = group.users.map((u) => u.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allGroupSelected = groupIds.every((id) => next.has(id));
      if (allGroupSelected) {
        groupIds.forEach((id) => next.delete(id));
      } else {
        groupIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(allFilteredIds);
    }
  }, [allSelected, allFilteredIds]);

  async function handleShare() {
    if (selectedWordIds.size === 0 || selectedIds.size === 0) return;
    setSharing(true);
    try {
      const res = await fetch("/api/vocabulary/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordIds: [...selectedWordIds],
          recipientIds: [...selectedIds],
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to share");
      }
      const data = await res.json();
      const msg =
        data.skipped > 0
          ? t("vocabulary.share.success", { count: data.inserted }) +
            " " +
            t("vocabulary.share.skipped", { count: data.skipped })
          : t("vocabulary.share.success", { count: data.inserted });
      toast.success(msg);
      onOpenChange(false);
    } catch {
      toast.error(t("vocabulary.share.error"));
    } finally {
      setSharing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("vocabulary.share.title")}</DialogTitle>
          <DialogDescription>
            {t("vocabulary.share.description", { count: wordCount })}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t("vocabulary.share.noTargets")}
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("vocabulary.share.searchUsers")}
                className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {filteredGroups.length > 1 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-vocab"
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                />
                <label
                  htmlFor="select-all-vocab"
                  className="text-sm cursor-pointer select-none"
                >
                  {allSelected
                    ? t("share.deselectAll")
                    : t("share.selectAll")}
                </label>
              </div>
            )}

            <ScrollArea className="max-h-64">
              <div className="space-y-4 pr-3">
                {filteredGroupedBySchool.map((schoolBlock) => (
                  <div key={schoolBlock.schoolId ?? "__none__"}>
                    {hasSchools && (
                      <div className="flex items-center gap-2 mb-2 pb-1 border-b">
                        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-semibold">
                          {schoolBlock.schoolName || "Other"}
                        </span>
                      </div>
                    )}
                    <div className="space-y-3">
                      {schoolBlock.groups.map((group) => {
                        const groupIds = group.users.map((u) => u.id);
                        const groupAllSelected = groupIds.every((id) =>
                          selectedIds.has(id)
                        );
                        const groupSomeSelected =
                          groupIds.some((id) => selectedIds.has(id)) &&
                          !groupAllSelected;

                        return (
                          <div key={group.classId || group.label}>
                            {(schoolBlock.groups.length > 1 || hasSchools) && (
                              <div className="flex items-center gap-2 mb-1.5">
                                <Checkbox
                                  id={`vocab-group-${group.classId || group.label}`}
                                  checked={
                                    groupAllSelected
                                      ? true
                                      : groupSomeSelected
                                        ? "indeterminate"
                                        : false
                                  }
                                  onCheckedChange={() => toggleGroup(group)}
                                />
                                <label
                                  htmlFor={`vocab-group-${group.classId || group.label}`}
                                  className="text-sm font-medium cursor-pointer select-none"
                                >
                                  {group.classId
                                    ? t("share.classGroup", {
                                        name: group.label,
                                      })
                                    : group.label}
                                </label>
                              </div>
                            )}
                            <div className="space-y-1">
                              {group.users.map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                                >
                                  <Checkbox
                                    id={`vocab-user-${user.id}`}
                                    checked={selectedIds.has(user.id)}
                                    onCheckedChange={() =>
                                      toggleUser(user.id)
                                    }
                                  />
                                  <label
                                    htmlFor={`vocab-user-${user.id}`}
                                    className="text-sm cursor-pointer select-none flex-1 min-w-0"
                                  >
                                    <span className="truncate block">
                                      {user.name || user.email || user.id}
                                    </span>
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sharing}
          >
            {t("share.close")}
          </Button>
          <Button
            onClick={handleShare}
            disabled={sharing || selectedIds.size === 0 || loading}
          >
            {sharing
              ? t("vocabulary.share.sharing")
              : t("vocabulary.share.share")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
