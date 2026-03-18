"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  BookOpen,
  Trash2,
  Pencil,
  Globe,
  Building2,
  Image as ImageIcon,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useReadingStore } from "@/store/reading";

interface RepositoryCardProps {
  item: RepositoryTextListItem;
  isAdmin: boolean;
  onDeleted: (id: string) => void;
  onRenamed: (id: string, newName: string) => void;
  onLoaded: () => void;
}

function RepositoryCard({
  item,
  isAdmin,
  onDeleted,
  onRenamed,
  onLoaded,
}: RepositoryCardProps) {
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
      onLoaded();
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

  const isSchoolText = !item.isPublic && item.schoolName;

  return (
    <div className="border rounded-lg p-4 flex flex-col gap-3 bg-card hover:bg-accent/30 transition-colors">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-snug truncate" title={item.name}>
            {item.name}
          </p>
          {item.title && item.title !== item.name && (
            <p className="text-xs text-muted-foreground truncate mt-0.5" title={item.title}>
              {item.title}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {item.isPublic ? (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Globe className="h-3 w-3" />
              {t("reading.repository.public")}
            </Badge>
          ) : isSchoolText ? (
            <Badge variant="outline" className="gap-1 text-xs">
              <Building2 className="h-3 w-3" />
              {item.schoolName}
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Preview text */}
      {item.previewText && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {item.previewText}
          {item.previewText.length >= 200 ? "…" : ""}
        </p>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {item.imageCount > 0 && (
            <span className="flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              {item.imageCount}
            </span>
          )}
          {item.createdByName && (
            <span className="truncate max-w-[120px]" title={item.createdByName}>
              {t("reading.repository.by")} {item.createdByName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Admin-only: rename */}
          {isAdmin && (
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
                  <Button
                    onClick={handleRename}
                    disabled={isRenaming || !newName.trim()}
                  >
                    {isRenaming ? (
                      <LoaderCircle className="h-4 w-4 animate-spin mr-1" />
                    ) : null}
                    {t("reading.repository.renameSave")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Admin-only: delete */}
          {isAdmin && (
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
                  <Button
                    variant="destructive"
                    onClick={() => { handleDelete(); setDeleteOpen(false); }}
                  >
                    {t("reading.repository.delete")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Load button */}
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
      </div>
    </div>
  );
}

export default RepositoryCard;
