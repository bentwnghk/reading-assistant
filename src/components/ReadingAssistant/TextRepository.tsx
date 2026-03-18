"use client";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Plus, Search, BookOpen, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import dynamic from "next/dynamic";
import RepositoryCard from "@/components/ReadingAssistant/RepositoryCard";

const RepositoryUploadDialog = dynamic(
  () => import("@/components/ReadingAssistant/RepositoryUploadDialog"),
  { ssr: false }
);

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
  const [search, setSearch] = useState("");

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

  const filteredItems = search.trim()
    ? items.filter(
        (item) =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          item.previewText.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("reading.repository.searchPlaceholder")}
            className="pl-8"
          />
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" />
            {t("reading.repository.uploadNew")}
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <span className="text-sm">{t("reading.repository.loading")}</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
          <BookOpen className="h-10 w-10 opacity-30" />
          <p className="text-sm">
            {isAdmin && items.length === 0
              ? t("reading.repository.noTextsAdmin")
              : t("reading.repository.noTexts")}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            {t("reading.repository.selectToRead")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredItems.map((item) => (
              <RepositoryCard
                key={item.id}
                item={item}
                isAdmin={isAdmin}
                onDeleted={handleDeleted}
                onRenamed={handleRenamed}
                onLoaded={() => onTextLoaded?.()}
              />
            ))}
          </div>
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
