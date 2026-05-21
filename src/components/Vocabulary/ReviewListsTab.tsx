"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Trash2,
  Share2,
  ArrowUpDown,
  LoaderCircle,
  ListChecks,
  Pencil,
  X,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Search } from "lucide-react";
import { cn } from "@/utils/style";
import type { ShareTargetGroup } from "@/lib/shared-sessions";

type ReviewListSummary = {
  id: string;
  name: string;
  wordCount: number;
  createdAt: number;
};

interface ReviewListsTabProps {
  onReviewList?: (listId: string) => void;
}

function ReviewListsTab({ onReviewList }: ReviewListsTabProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const isTeacherOrAbove =
    session?.user?.role === "teacher" ||
    session?.user?.role === "admin" ||
    session?.user?.role === "super-admin";
  const [lists, setLists] = useState<ReviewListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<"name" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [shareList, setShareList] = useState<ReviewListSummary | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareGroups, setShareGroups] = useState<ShareTargetGroup[]>([]);
  const [shareSelectedIds, setShareSelectedIds] = useState<Set<string>>(
    new Set()
  );
  const [shareSearch, setShareSearch] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareSending, setShareSending] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editWords, setEditWords] = useState<ReviewListWord[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLists = useCallback(async () => {
    try {
      const res = await fetch("/api/review-lists");
      if (!res.ok) return;
      const data = await res.json();
      setLists(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/review-lists?id=${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success(t("vocabulary.reviewLists.deleted"));
      setLists((prev) => prev.filter((l) => l.id !== deleteId));
    } catch {
      toast.error(t("vocabulary.reviewLists.deleteError"));
    }
    setDeleteId(null);
  };

  const openShare = useCallback(
    (list: ReviewListSummary) => {
      setShareList(list);
      setShareOpen(true);
      setShareSelectedIds(new Set());
      setShareSearch("");
      setShareLoading(true);
      fetch("/api/shares/targets")
        .then((r) => (r.ok ? r.json() : []))
        .then((data: ShareTargetGroup[]) => setShareGroups(data))
        .catch(() => setShareGroups([]))
        .finally(() => setShareLoading(false));
    },
    []
  );

  const openEdit = useCallback(async (list: ReviewListSummary) => {
    setEditId(list.id);
    setEditName(list.name);
    setEditWords([]);
    setEditOpen(true);
    setEditLoading(true);
    try {
      const res = await fetch(`/api/review-lists/${list.id}`);
      if (res.ok) {
        const data = await res.json();
        setEditName(data.name || list.name);
        setEditWords(data.words || []);
      }
    } catch {
    } finally {
      setEditLoading(false);
    }
  }, []);

  const handleEditRemoveWord = useCallback((index: number) => {
    setEditWords((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editId || !editName.trim() || editWords.length === 0) return;
    setEditSaving(true);
    try {
      const res = await fetch("/api/review-lists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, name: editName.trim(), words: editWords }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("vocabulary.reviewLists.saved"));
      setEditOpen(false);
      fetchLists();
    } catch {
      toast.error(t("vocabulary.reviewLists.saveError"));
    } finally {
      setEditSaving(false);
    }
  }, [editId, editName, editWords, fetchLists, t]);

  const hasSchools = shareGroups.some((g) => g.schoolId);

  const filteredShareGroups = (() => {
    if (!shareSearch.trim()) return shareGroups;
    const q = shareSearch.toLowerCase();
    return shareGroups
      .map((g) => ({
        ...g,
        users: g.users.filter(
          (u) =>
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.users.length > 0);
  })();

  const shareAllIds = new Set(
    filteredShareGroups.flatMap((g) => g.users.map((u) => u.id))
  );
  const shareAllSelected =
    shareAllIds.size > 0 && [...shareAllIds].every((id) => shareSelectedIds.has(id));

  const handleShare = async () => {
    if (!shareList || shareSelectedIds.size === 0) return;
    setShareSending(true);
    try {
      const res = await fetch("/api/review-lists/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listId: shareList.id,
          recipientIds: [...shareSelectedIds],
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(
        t("vocabulary.reviewLists.shareSuccess", { count: data.inserted })
      );
      setShareOpen(false);
    } catch {
      toast.error(t("vocabulary.reviewLists.shareError"));
    } finally {
      setShareSending(false);
    }
  };

  const sortedLists = [...lists].sort((a, b) => {
    let cmp = 0;
    if (sortField === "name") {
      cmp = a.name.localeCompare(b.name);
    } else {
      cmp = a.createdAt - b.createdAt;
    }
    return sortOrder === "desc" ? -cmp : cmp;
  });

  const totalListPages = Math.max(1, Math.ceil(sortedLists.length / pageSize));
  const safeListPage = Math.min(currentPage, totalListPages);
  const pagedLists = sortedLists.slice(
    (safeListPage - 1) * pageSize,
    safeListPage * pageSize
  );

  const handleSort = (field: "name" | "date") => {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>{t("vocabulary.reviewLists.empty")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("name")}
                  className="-ml-3"
                >
                  {t("vocabulary.reviewLists.colName")}
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="w-[100px]">
                {t("vocabulary.reviewLists.colWords")}
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("date")}
                  className="-ml-3"
                >
                  {t("vocabulary.reviewLists.colDate")}
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="w-[140px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedLists.map((list) => (
              <TableRow key={list.id}>
                <TableCell className="font-medium">{list.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {list.wordCount}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(list.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title={t("vocabulary.reviewLists.review")}
                      onClick={() => onReviewList?.(list.id)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title={t("vocabulary.reviewLists.edit")}
                      onClick={() => openEdit(list)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {isTeacherOrAbove && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={t("vocabulary.reviewLists.share")}
                        onClick={() => openShare(list)}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      title={t("vocabulary.reviewLists.delete")}
                      onClick={() => setDeleteId(list.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {sortedLists.length > pageSize && (
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              {t("vocabulary.rowsPerPage")}:
            </span>
            {[10, 20, 30, 50].map((size) => (
              <button
                key={size}
                onClick={() => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-2 py-0.5 text-xs rounded transition-colors",
                  pageSize === size
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {size}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={safeListPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalListPages }, (_, i) => i + 1)
              .filter((p) => {
                if (totalListPages <= 7) return true;
                if (p === 1 || p === totalListPages) return true;
                return Math.abs(p - safeListPage) <= 1;
              })
              .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) {
                  acc.push("ellipsis");
                }
                acc.push(p);
                return acc;
              }, [])
              .map((item, i) =>
                item === "ellipsis" ? (
                  <span
                    key={`e${i}`}
                    className="text-xs text-muted-foreground px-1"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setCurrentPage(item)}
                    className={cn(
                      "h-7 w-7 text-xs rounded transition-colors",
                      safeListPage === item
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {item}
                  </button>
                )
              )}
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={safeListPage >= totalListPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("vocabulary.reviewLists.confirmDelete")}</DialogTitle>
            <DialogDescription>
              {t("vocabulary.reviewLists.confirmDeleteDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t("share.close")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t("vocabulary.reviewLists.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("vocabulary.reviewLists.shareTitle")}</DialogTitle>
            <DialogDescription>
              {shareList?.name} ({shareList?.wordCount}{" "}
              {t("vocabulary.reviewLists.colWords").toLowerCase()})
            </DialogDescription>
          </DialogHeader>

          {shareLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : shareGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("vocabulary.share.noTargets")}
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={shareSearch}
                  onChange={(e) => setShareSearch(e.target.value)}
                  placeholder={t("vocabulary.share.searchUsers")}
                  className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {filteredShareGroups.length > 1 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={shareAllSelected}
                    onCheckedChange={() =>
                      setShareSelectedIds(
                        shareAllSelected ? new Set() : shareAllIds
                      )
                    }
                  />
                  <span className="text-sm">
                    {shareAllSelected
                      ? t("share.deselectAll")
                      : t("share.selectAll")}
                  </span>
                </div>
              )}

              <ScrollArea className="max-h-64">
                <div className="space-y-4 pr-3">
                  {(() => {
                    const schoolMap = new Map<
                      string | undefined,
                      typeof filteredShareGroups
                    >();
                    if (hasSchools) {
                      for (const g of filteredShareGroups) {
                        if (!schoolMap.has(g.schoolId))
                          schoolMap.set(g.schoolId, []);
                        schoolMap.get(g.schoolId)!.push(g);
                      }
                    }

                    const blocks = hasSchools
                      ? [...schoolMap.entries()].map(
                          ([schoolId, groups]) => ({
                            schoolId,
                            schoolName: groups[0]?.schoolName,
                            groups,
                          })
                        )
                      : [
                          {
                            schoolId: undefined,
                            schoolName: undefined,
                            groups: filteredShareGroups,
                          },
                        ];

                    return blocks.map((block) => (
                      <div key={block.schoolId ?? "__none__"}>
                        {hasSchools && (
                          <div className="flex items-center gap-2 mb-2 pb-1 border-b">
                            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-semibold">
                              {block.schoolName || "Other"}
                            </span>
                          </div>
                        )}
                        <div className="space-y-3">
                          {block.groups.map((group) => {
                            const groupIds = group.users.map((u) => u.id);
                            const allSel = groupIds.every((id) =>
                              shareSelectedIds.has(id)
                            );
                            const someSel =
                              groupIds.some((id) =>
                                shareSelectedIds.has(id)
                              ) && !allSel;

                            return (
                              <div key={group.classId || group.label}>
                                {(block.groups.length > 1 || hasSchools) && (
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <Checkbox
                                      checked={
                                        allSel ? true : someSel ? "indeterminate" : false
                                      }
                                      onCheckedChange={() => {
                                        setShareSelectedIds((prev) => {
                                          const next = new Set(prev);
                                          if (allSel) {
                                            groupIds.forEach((id) =>
                                              next.delete(id)
                                            );
                                          } else {
                                            groupIds.forEach((id) =>
                                              next.add(id)
                                            );
                                          }
                                          return next;
                                        });
                                      }}
                                    />
                                    <span className="text-sm font-medium">
                                      {group.classId
                                        ? t("share.classGroup", {
                                            name: group.label,
                                          })
                                        : group.label}
                                    </span>
                                  </div>
                                )}
                                <div className="space-y-1">
                                  {group.users.map((user) => (
                                    <div
                                      key={user.id}
                                      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                                    >
                                      <Checkbox
                                        id={`rl-user-${user.id}`}
                                        checked={shareSelectedIds.has(
                                          user.id
                                        )}
                                        onCheckedChange={() => {
                                          setShareSelectedIds((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(user.id)) {
                                              next.delete(user.id);
                                            } else {
                                              next.add(user.id);
                                            }
                                            return next;
                                          });
                                        }}
                                      />
                                      <label
                                        htmlFor={`rl-user-${user.id}`}
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
                    ));
                  })()}
                </div>
              </ScrollArea>
            </>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShareOpen(false)}
              disabled={shareSending}
            >
              {t("share.close")}
            </Button>
            <Button
              onClick={handleShare}
              disabled={shareSending || shareSelectedIds.size === 0 || shareLoading}
            >
              {shareSending
                ? t("vocabulary.share.sharing")
                : t("vocabulary.share.share")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("vocabulary.reviewLists.editTitle")}</DialogTitle>
            <DialogDescription>
              {t("vocabulary.reviewLists.editDescription")}
            </DialogDescription>
          </DialogHeader>

          {editLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3 flex-1 min-h-0 overflow-y-auto px-1">
              <div>
                <label className="text-sm font-medium">
                  {t("vocabulary.reviewLists.listName")}
                </label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t("vocabulary.reviewLists.listNamePlaceholder")}
                  className="mt-1"
                  maxLength={200}
                />
              </div>

              <div className="flex flex-col min-h-0">
                <label className="text-sm font-medium text-muted-foreground mb-1">
                  {t("vocabulary.reviewLists.words")} ({editWords.length})
                </label>
                <div className="border rounded-md overflow-hidden max-h-64 min-h-0 overflow-y-auto">
                  <div className="divide-y">
                    {editWords.map((w, i) => (
                      <div
                        key={`${w.word}-${i}`}
                        className="flex items-center gap-2 text-sm py-2 px-3 hover:bg-muted min-w-0"
                      >
                        <span className="font-medium shrink-0">{w.word}</span>
                        <span className="text-muted-foreground truncate min-w-0 flex-1">
                          {w.chineseDefinition}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleEditRemoveWord(i)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    {editWords.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        {t("vocabulary.reviewLists.noWords")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={editSaving}
            >
              {t("share.close")}
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={
                editSaving || editLoading || !editName.trim() || editWords.length === 0
              }
            >
              {editSaving
                ? t("vocabulary.reviewLists.saving")
                : t("vocabulary.reviewLists.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ReviewListsTab;
