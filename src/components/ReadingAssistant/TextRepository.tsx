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
  Users,
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
      visibility: z.enum(["class", "school", "public"]).optional().default("school"),
    })
  ),
});

type TextVisibility = 'class' | 'school' | 'public'
type SortField = "name" | "createdByName" | "createdAt" | "visibility";
type SortDir = "asc" | "desc";
type VisibilityFilter = "all" | "public" | "school" | "class";

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

function VisibilityBadge({ visibility, schoolName, t }: { 
  visibility: TextVisibility; 
  schoolName?: string | null;
  t: (key: string) => string;
}) {
  if (visibility === "public") {
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <Globe className="h-3 w-3" />
        {t("reading.repository.visibilityPublic")}
      </Badge>
    );
  }
  if (visibility === "school") {
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <Building2 className="h-3 w-3" />
        {schoolName || t("reading.repository.visibilitySchool")}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-xs bg-muted">
      <Users className="h-3 w-3" />
      {t("reading.repository.visibilityClass")}
    </Badge>
  );
}

function VisibilityIcon({ visibility }: { visibility: TextVisibility }) {
  if (visibility === "public") {
    return <Globe className="h-4 w-4 text-blue-500" />;
  }
  if (visibility === "school") {
    return <Building2 className="h-4 w-4 text-muted-foreground" />;
  }
  return <Users className="h-4 w-4 text-muted-foreground" />;
}

interface EditTextDialogProps {
  item: RepositoryTextListItem;
  userRole: string;
  userId: string;
  onUpdated: (id: string, patch: Partial<Pick<RepositoryTextListItem, "visibility">>) => void;
}

function EditTextDialog({ item, userRole, userId, onUpdated }: EditTextDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const [extractedText, setExtractedText] = useState("");
  const [visibility, setVisibility] = useState<TextVisibility>(item.visibility);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canChangeVisibility = 
    userRole === "super-admin" || 
    (userRole === "admin" && item.schoolId) ||
    (item.createdBy === userId);

  const canSetPublic = userRole === "super-admin";
  const canSetSchool = userRole === "super-admin" || userRole === "admin";

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
        setVisibility(data.visibility);
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
        body: JSON.stringify({ extractedText, visibility }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      toast.success(t("reading.repository.editSuccess"));
      onUpdated(item.id, { visibility });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("reading.repository.editError"));
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

          {canChangeVisibility && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <VisibilityIcon visibility={visibility} />
                {t("reading.repository.visibility")}
              </div>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as TextVisibility)}
                disabled={isFetching || isSaving}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="class">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {t("reading.repository.visibilityClass")}
                    </div>
                  </SelectItem>
                  {canSetSchool && (
                    <SelectItem value="school">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {t("reading.repository.visibilitySchool")}
                      </div>
                    </SelectItem>
                  )}
                  {canSetPublic && (
                    <SelectItem value="public">
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5" />
                        {t("reading.repository.visibilityPublic")}
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
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

interface RowActionsProps {
  item: RepositoryTextListItem;
  canEdit: boolean;
  canDelete: boolean;
  userRole: string;
  userId: string;
  onDeleted: (id: string) => void;
  onRenamed: (id: string, newName: string) => void;
  onUpdated: (id: string, patch: Partial<Pick<RepositoryTextListItem, "visibility">>) => void;
  onTextLoaded?: () => void;
}

function RowActions({ 
  item, 
  canEdit, 
  canDelete, 
  userRole, 
  userId, 
  onDeleted, 
  onRenamed, 
  onUpdated, 
  onTextLoaded 
}: RowActionsProps) {
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
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success(t("reading.repository.deleteSuccess"));
      onDeleted(item.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("reading.repository.deleteError"));
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
      {canEdit && (
        <>
          <EditTextDialog 
            item={item} 
            userRole={userRole} 
            userId={userId} 
            onUpdated={onUpdated} 
          />

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
        </>
      )}

      {canDelete && (
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
      )}

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

interface TextRepositoryProps {
  onTextLoaded?: () => void;
}

function TextRepository({ onTextLoaded }: TextRepositoryProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const userRole = session?.user?.role || "student";
  const userId = session?.user?.id || "";
  const isAdmin = userRole === "admin" || userRole === "super-admin";
  const isTeacher = userRole === "teacher";
  const canUpload = isAdmin || isTeacher;

  const [items, setItems] = useState<RepositoryTextListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");

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
    patch: Partial<Pick<RepositoryTextListItem, "visibility">>
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
          visibility: text.visibility,
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
              visibility: textItem.visibility,
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

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          (item.createdByName ?? "").toLowerCase().includes(q)
      );
    }

    if (visibilityFilter === "public") {
      result = result.filter((item) => item.visibility === "public");
    } else if (visibilityFilter === "school") {
      result = result.filter((item) => item.visibility === "school");
    } else if (visibilityFilter === "class") {
      result = result.filter((item) => item.visibility === "class");
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === "createdByName") {
        cmp = (a.createdByName ?? "").localeCompare(b.createdByName ?? "");
      } else if (sortField === "createdAt") {
        cmp = a.createdAt - b.createdAt;
      } else if (sortField === "visibility") {
        const order = { class: 0, school: 1, public: 2 };
        cmp = order[a.visibility] - order[b.visibility];
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [items, search, visibilityFilter, sortField, sortDir]);

  return (
    <div className="space-y-4">
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
            <SelectItem value="class">{t("reading.repository.filterClass")}</SelectItem>
          </SelectContent>
        </Select>

        {canUpload && (
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

      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <span className="text-sm">{t("reading.repository.loading")}</span>
        </div>
      ) : processedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
          <BookOpen className="h-10 w-10 opacity-30" />
          <p className="text-sm">
            {canUpload && items.length === 0
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
                    field="visibility"
                    current={sortField}
                    dir={sortDir}
                    label={t("reading.repository.colVisibility")}
                    onSort={handleSort}
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedItems.map((item) => {
                const isOwner = item.createdBy === userId;
                const canEdit = isOwner || isAdmin;
                const canDelete = isOwner || isAdmin;
                
                return (
                  <TableRow key={item.id}>
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

                    <TableCell className="text-right">
                      <RowActions
                        item={item}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        userRole={userRole}
                        userId={userId}
                        onDeleted={handleDeleted}
                        onRenamed={handleRenamed}
                        onUpdated={handleUpdated}
                        onTextLoaded={onTextLoaded}
                      />
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {item.createdByName ?? "—"}
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </TableCell>

                    <TableCell>
                      <VisibilityBadge 
                        visibility={item.visibility} 
                        schoolName={item.schoolName}
                        t={t}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {canUpload && (
        <RepositoryUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onUploaded={handleUploaded}
        />
      )}

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
