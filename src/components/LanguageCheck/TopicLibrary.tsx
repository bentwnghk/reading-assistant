"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImageIcon, LoaderCircle, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TopicFormDialog from "@/components/LanguageCheck/TopicFormDialog";
import { useLanguageCheckStore } from "@/store/languageCheck";
import { LANGUAGE_CHECK_ESSAY_TYPE_GUIDANCE } from "@/constants/languageCheck";
import { formatDateTime } from "@/utils/formatDate";
import { parseError } from "@/utils/error";

/**
 * Topic Library: create, edit, delete saved writing topics, or pick one to
 * scan an essay for. Standalone — topics can be created before any essay.
 */
export default function TopicLibrary({
  onUseTopic,
}: {
  /** Called after a topic is chosen for upload (navigates to the upload view). */
  onUseTopic: () => void;
}) {
  const { t } = useTranslation();
  const topics = useLanguageCheckStore((s) => s.topics);
  const loading = useLanguageCheckStore((s) => s.topicsLoading);
  const loaded = useLanguageCheckStore((s) => s.topicsLoaded);
  const loadTopics = useLanguageCheckStore((s) => s.loadTopics);
  const removeTopic = useLanguageCheckStore((s) => s.removeTopic);
  const select = useLanguageCheckStore((s) => s.selectTopic);
  const [editing, setEditing] = useState<LanguageCheckTopicSummary | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<LanguageCheckTopicSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTopics().catch((e) => toast.error(parseError(e)));
  }, [loadTopics]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await removeTopic(toDelete.id);
      setToDelete(null);
    } catch (error) {
      toast.error(parseError(error));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t("languageCheck.topics.intro")}
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          {t("languageCheck.topics.new")}
        </Button>
      </div>

      {loading && !loaded ? (
        <div className="flex justify-center py-8">
          <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : topics.length === 0 ? (
        <p className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          {t("languageCheck.topics.empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {topics.map((topic) => (
            <li
              key={topic.id}
              className="flex flex-wrap items-start gap-3 rounded-lg border bg-card px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium">{topic.title}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {LANGUAGE_CHECK_ESSAY_TYPE_GUIDANCE[topic.essayType].label}
                  </span>
                  {topic.hasQuestionImage && (
                    <span
                      className="flex items-center gap-1 text-[11px] text-muted-foreground"
                      title={t("languageCheck.topics.hasImage")}
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      {t("languageCheck.topics.hasImage")}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-muted-foreground">
                  {topic.topic}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatDateTime(topic.updatedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="sm"
                  onClick={() => {
                    select(topic.id);
                    onUseTopic();
                  }}
                >
                  <Upload className="mr-1.5 h-4 w-4" />
                  {t("languageCheck.topics.use")}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title={t("languageCheck.topics.edit")}
                  onClick={() => {
                    setEditing(topic);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  title={t("languageCheck.topics.delete")}
                  onClick={() => setToDelete(topic)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <TopicFormDialog open={formOpen} onOpenChange={setFormOpen} topic={editing} />

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && !deleting && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("languageCheck.topics.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("languageCheck.topics.deleteDesc", { title: toDelete?.title ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={deleting} onClick={() => setToDelete(null)}>
              {t("languageCheck.cancel")}
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={confirmDelete}>
              {deleting && <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />}
              {t("languageCheck.topics.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
