"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  BookOpen,
  LoaderCircle,
  Globe,
  Building2,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useReadingStore } from "@/store/reading";
import dynamic from "next/dynamic";

const RepositoryUploadDialog = dynamic(
  () => import("@/components/ReadingAssistant/RepositoryUploadDialog"),
  { ssr: false }
);

// ─── Types ────────────────────────────────────────────────────────────────────

type SortField = "name" | "createdByName" | "createdAt" | "isPublic";
type SortDir = "asc" | "desc";
type VisibilityFilter = "all" | "public" | "school";

// ─── Sort-header button ───────────────────────────────────────────────────────

function SortButton({
  field,
  current,
  dir,
  label,
  onSort,
}: {
  field: SortField;
  current: SortField;
  dir: SortDir;
  label: string;
  onSort: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors select-none"
      onClick={() => onSort(field)}
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );
}

// ─── Row-level action dialogs ─────────────────────────────────────────────────

interface RowActionsProps {
  item: RepositoryTextListItem;
  isAdmin: boolean;
  onDeleted: (id: string) => void;
  onRenamed: (id: string, newName: string) => void;
}

function RowActions({ item, isAdmin, onDeleted, onRenamed }: RowActionsProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newName, setNewName] = useState(item.name);
  const { loadFromRepository } = useReadingStore();

  const handleLoad = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/repository/${item.id}`);
      if (!res.ok) throw new Error("Failed to load");
      const text: RepositoryText = await res.json();
      loadFromRepository(text);
    } catch {
      toast.error(t("reading.repository.loadError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/repository/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(t("reading.repository.deleteSuccess"));
      onDeleted(item.id);
    } catch {
      toast.error(t("reading.repository.deleteError"));
    } finally {
      setDeleteOpen(false);
    }
  };

  const handleRename = async () => {
    if (!newName.trim()) return;
    setIsRenaming(true);
    try {
      const res = await fetch(`/api/repository/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to rename");
      toast.success(t("reading.repository.renameSuccess"));
      onRenamed(item.id, newName.trim());
      setRenameOpen(false);
    } catch {
      toast.error(t("reading.repository.renameError"));
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <div className="flex items-center gap-1 justify-end">
      {isAdmin && (
        <>
          {/* Rename */}
          <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title={t("reading.repository.rename")}
                onClick={() => setNewName(item.name)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("reading.repository.renameTitle")}</DialogTitle>
                <DialogDescription>
                  {t("reading.repository.renameDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="rename-input">{t("reading.repository.newName")}</Label>
                <Input
                  id="rename-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename();
                  }}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRenameOpen(false)}>
                  {t("reading.repository.cancel")}
                </Button>
                <Button onClick={handleRename} disabled={isRenaming || !newName.trim()}>
                  {isRenaming && <LoaderCircle className="h-4 w-4 animate-spin mr-1" />}
                  {t("reading.repository.renameSave")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete */}
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                title={t("reading.repository.delete")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {t("reading.repository.deleteConfirm", { name: item.name })}
                </DialogTitle>
                <DialogDescription>
                  {t("reading.repository.deleteDesc")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  {t("reading.repository.cancel")}
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  {t("reading.repository.delete")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Load */}
      <Button size="sm" onClick={handleLoad} disabled={isLoading} className="gap-1.5">
        {isLoading ? (
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <BookOpen className="h-3.5 w-3.5" />
        )}
        {isLoading
          ? t("reading.repository.loading")
          : t("reading.repository.loadText")}
      </Button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function TextRepository() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [items, setItems] = useState<RepositoryTextListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Filter state
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");

  // Sort state
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/repository");
      if (!res.ok) throw new Error("Fetch failed");
      const data: RepositoryTextListItem[] = await res.json();
      setItems(data);
    } catch {
      toast.error(t("reading.repository.fetchError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleUploaded = (item: RepositoryTextListItem) => {
    setItems((prev) => [item, ...prev]);
  };

  const handleDeleted = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleRenamed = (id: string, newName: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: newName } : item))
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const processedItems = useMemo(() => {
    let result = items;

    // Text search
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          (item.createdByName ?? "").toLowerCase().includes(q)
      );
    }

    // Visibility filter
    if (visibilityFilter === "public") {
      result = result.filter((item) => item.isPublic);
    } else if (visibilityFilter === "school") {
      result = result.filter((item) => !item.isPublic);
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === "createdByName") {
        cmp = (a.createdByName ?? "").localeCompare(b.createdByName ?? "");
      } else if (sortField === "createdAt") {
        cmp = a.createdAt - b.createdAt;
      } else if (sortField === "isPublic") {
        // public (true=1) before school-only (false=0) when asc
        cmp = (a.isPublic ? 1 : 0) - (b.isPublic ? 1 : 0);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [items, search, visibilityFilter, sortField, sortDir]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("reading.repository.searchPlaceholder")}
            className="pl-8"
          />
        </div>

        <Select
          value={visibilityFilter}
          onValueChange={(v) => setVisibilityFilter(v as VisibilityFilter)}
        >
          <SelectTrigger className="w-[140px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("reading.repository.filterAll")}</SelectItem>
            <SelectItem value="public">{t("reading.repository.filterPublic")}</SelectItem>
            <SelectItem value="school">{t("reading.repository.filterSchool")}</SelectItem>
          </SelectContent>
        </Select>

        {isAdmin && (
          <Button
            size="sm"
            onClick={() => setUploadOpen(true)}
            className="gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" />
            {t("reading.repository.uploadNew")}
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <span className="text-sm">{t("reading.repository.loading")}</span>
        </div>
      ) : processedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
          <BookOpen className="h-10 w-10 opacity-30" />
          <p className="text-sm">
            {isAdmin && items.length === 0
              ? t("reading.repository.noTextsAdmin")
              : t("reading.repository.noTexts")}
          </p>
        </div>
      ) : (
        <div className="rounded-md border max-h-[480px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="min-w-[160px]">
                <SortButton
                  field="name"
                  current={sortField}
                  dir={sortDir}
                  label={t("reading.repository.colName")}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="w-[130px]">
                <SortButton
                  field="createdByName"
                  current={sortField}
                  dir={sortDir}
                  label={t("reading.repository.colCreator")}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="w-[110px]">
                <SortButton
                  field="createdAt"
                  current={sortField}
                  dir={sortDir}
                  label={t("reading.repository.colDate")}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="w-[110px]">
                <SortButton
                  field="isPublic"
                  current={sortField}
                  dir={sortDir}
                  label={t("reading.repository.colVisibility")}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="w-[1%] text-right">
                {t("reading.repository.colActions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedItems.map((item) => (
              <TableRow key={item.id}>
                {/* Name + AI title */}
                <TableCell>
                  <p className="font-medium text-sm leading-snug">{item.name}</p>
                  {item.title && item.title !== item.name && (
                    <p
                      className="text-xs text-muted-foreground truncate max-w-[240px]"
                      title={item.title}
                    >
                      {item.title}
                    </p>
                  )}
                </TableCell>

                {/* Creator */}
                <TableCell className="text-sm text-muted-foreground">
                  {item.createdByName ?? "—"}
                </TableCell>

                {/* Created date */}
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {new Date(item.createdAt).toLocaleDateString()}
                </TableCell>

                {/* Visibility */}
                <TableCell>
                  {item.isPublic ? (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Globe className="h-3 w-3" />
                      {t("reading.repository.public")}
                    </Badge>
                  ) : item.schoolName ? (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Building2 className="h-3 w-3" />
                      {item.schoolName}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Building2 className="h-3 w-3" />
                      {t("reading.repository.school")}
                    </Badge>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <RowActions
                    item={item}
                    isAdmin={isAdmin}
                    onDeleted={handleDeleted}
                    onRenamed={handleRenamed}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      )}

      {/* Admin upload dialog */}
      {isAdmin && (
        <RepositoryUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onUploaded={handleUploaded}
        />
      )}
    </div>
  );
}

export default TextRepository;
