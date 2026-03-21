"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { z } from "zod";
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
  FileText,
  Download,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { downloadFile } from "@/utils/file";
import dynamic from "next/dynamic";

const RepositoryUploadDialog = dynamic(
  () => import("@/components/ReadingAssistant/RepositoryUploadDialog"),
  { ssr: false }
);

const repositoryExportSchema = z.object({
  version: z.string(),
  exportedAt: z.number().optional(),
  texts: z.array(
    z.object({
      name: z.string().min(1),
      title: z.string().optional().default(""),
      extractedText: z.string().min(1),
      originalImages: z.array(z.string()).optional().default([]),
      isPublic: z.boolean().optional().default(false),
    })
  ),
});

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

// ─── Edit-text dialog ─────────────────────────────────────────────────────────

interface EditTextDialogProps {
  item: RepositoryTextListItem;
  onUpdated: (id: string, patch: Partial<Pick<RepositoryTextListItem, "isPublic">>) => void;
}

function EditTextDialog({ item, onUpdated }: EditTextDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // Dialog-local state
  const [extractedText, setExtractedText] = useState("");
  const [isPublic, setIsPublic] = useState(item.isPublic);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch full text when dialog opens
  useEffect(() => {
    if (!open) return;
    setIsFetching(true);
    fetch(`/api/repository/${item.id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<RepositoryText>;
      })
      .then((data) => {
        setExtractedText(data.extractedText);
        setIsPublic(data.isPublic);
      })
      .catch(() => toast.error(t("reading.repository.loadError")))
      .finally(() => setIsFetching(false));
  }, [open, item.id, t]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/repository/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extractedText, isPublic }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("reading.repository.editSuccess"));
      onUpdated(item.id, { isPublic });
      setOpen(false);
    } catch {
      toast.error(t("reading.repository.editError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title={t("reading.repository.editTitle")}
        >
          <FileText className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("reading.repository.editTitle")}</DialogTitle>
          <DialogDescription>
            {item.name}
            {item.title && item.title !== item.name && (
              <span className="text-muted-foreground"> — {item.title}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 min-h-0">
          {/* Extracted text */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-extracted-text">
              {t("reading.repository.editExtractedText")}
            </Label>
            {isFetching ? (
              <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span className="text-sm">{t("reading.repository.loading")}</span>
              </div>
            ) : (
              <Textarea
                id="edit-extracted-text"
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                disabled={isSaving}
                className="min-h-[280px] resize-y text-sm leading-relaxed"
              />
            )}
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              {isPublic ? (
                <Globe className="h-4 w-4 text-blue-500" />
              ) : (
                <Building2 className="h-4 w-4 text-muted-foreground" />
              )}
              {t("reading.repository.isPublic")}
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
              disabled={isFetching || isSaving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            {t("reading.repository.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isFetching || isSaving || !extractedText.trim()}>
            {isSaving && <LoaderCircle className="h-4 w-4 animate-spin mr-1.5" />}
            {isSaving
              ? t("reading.repository.editSaving")
              : t("reading.repository.editSave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Row-level action buttons ─────────────────────────────────────────────────

interface RowActionsProps {
  item: RepositoryTextListItem;
  isAdmin: boolean;
  onDeleted: (id: string) => void;
  onRenamed: (id: string, newName: string) => void;
  onUpdated: (id: string, patch: Partial<Pick<RepositoryTextListItem, "isPublic">>) => void;
  onTextLoaded?: () => void;
}

function RowActions({ item, isAdmin, onDeleted, onRenamed, onUpdated, onTextLoaded }: RowActionsProps) {
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
      onTextLoaded?.();
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
          {/* Edit extracted text + visibility */}
          <EditTextDialog item={item} onUpdated={onUpdated} />

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

interface TextRepositoryProps {
  onTextLoaded?: () => void;
}

function TextRepository({ onTextLoaded }: TextRepositoryProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [items, setItems] = useState<RepositoryTextListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUpdated = (
    id: string,
    patch: Partial<Pick<RepositoryTextListItem, "isPublic">>
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const handleExport = async () => {
    if (processedItems.length === 0) {
      toast.error(t("reading.repository.exportError"));
      return;
    }

    setIsExporting(true);
    try {
      const texts: z.infer<typeof repositoryExportSchema>["texts"] = [];

      for (const item of processedItems) {
        const res = await fetch(`/api/repository/${item.id}`);
        if (!res.ok) continue;
        const text: RepositoryText = await res.json();
        texts.push({
          name: text.name,
          title: text.title || "",
          extractedText: text.extractedText,
          originalImages: text.originalImages || [],
          isPublic: text.isPublic,
        });
      }

      const exportData = {
        version: "1.0",
        exportedAt: Date.now(),
        texts,
      };

      const dateStr = new Date().toISOString().slice(0, 10);
      downloadFile(
        JSON.stringify(exportData, null, 2),
        `mrng-proreader-text-repository-export-${dateStr}.json`,
        "application/json;charset=utf-8"
      );

      toast.success(t("reading.repository.exportSuccess", { count: texts.length }));
    } catch {
      toast.error(t("reading.repository.exportError"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (file: File) => {
    setIsImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = repositoryExportSchema.safeParse(parsed);

      if (!result.success) {
        toast.error(t("reading.repository.importInvalid"));
        return;
      }

      const { texts } = result.data;

      if (texts.length === 0) {
        toast.error(t("reading.repository.importNoTexts"));
        return;
      }

      let successCount = 0;
      for (const textItem of texts) {
        try {
          const res = await fetch("/api/repository", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: textItem.name,
              title: textItem.title,
              extractedText: textItem.extractedText,
              isPublic: textItem.isPublic,
              images: textItem.originalImages,
            }),
          });
          if (res.ok) successCount++;
        } catch {
          // Continue with next item
        }
      }

      if (successCount > 0) {
        toast.success(
          t("reading.repository.importSuccess", {
            count: successCount,
            total: texts.length,
          })
        );
        fetchItems();
      } else {
        toast.error(t("reading.repository.importError"));
      }
    } catch {
      toast.error(t("reading.repository.importInvalid"));
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImport(file);
      e.target.value = "";
    }
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
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="gap-1.5 shrink-0"
            >
              {isImporting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isImporting
                ? t("reading.repository.importing")
                : t("reading.repository.import")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              disabled={isExporting || processedItems.length === 0}
              className="gap-1.5 shrink-0"
            >
              {isExporting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isExporting
                ? t("reading.repository.exporting")
                : t("reading.repository.export")}
            </Button>
            <Button
              size="sm"
              onClick={() => setUploadOpen(true)}
              className="gap-1.5 shrink-0"
            >
              <Plus className="h-4 w-4" />
              {t("reading.repository.uploadNew")}
            </Button>
          </>
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
        <div className="rounded-md border max-h-[360px] overflow-y-auto">
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
                <TableHead className="w-[1%] text-right">
                  {t("reading.repository.colActions")}
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

                  {/* Actions */}
                  <TableCell className="text-right">
                    <RowActions
                      item={item}
                      isAdmin={isAdmin}
                      onDeleted={handleDeleted}
                      onRenamed={handleRenamed}
                      onUpdated={handleUpdated}
                      onTextLoaded={onTextLoaded}
                    />
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

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

export default TextRepository;
