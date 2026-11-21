"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import {
  ImageIcon,
  LoaderCircle,
  Pencil,
  Plus,
  School,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClassCombobox } from "@/components/Internal/ClassCombobox";
import TopicFormDialog from "@/components/LanguageCheck/TopicFormDialog";
import { useLanguageCheckStore } from "@/store/languageCheck";
import { LANGUAGE_CHECK_ESSAY_TYPE_GUIDANCE } from "@/constants/languageCheck";
import { formatDateTime } from "@/utils/formatDate";
import { parseError } from "@/utils/error";

/**
 * Topic Library: the user's own saved writing topics plus topics created
 * for the classes they are in / teach / supervise (shown with their class
 * and creator — only the creator can edit or delete). Topics can be
 * created before any essay and picked to scan one. A class filter and a
 * word search (topic text or class) narrow the list client-side, mirroring
 * the staff views' filters.
 */
export default function TopicLibrary({
  onUseTopic,
}: {
  /** Called with the chosen topic after "Use for upload" (navigates to the
   *  upload view; the container auto-scopes the class dropdown to it). */
  onUseTopic: (topic: LanguageCheckTopicSummary) => void;
}) {
  const { t } = useTranslation();
  const { data: session } = useSession();
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
  // Class filter (null = all, "__none__" = personal topics) and a word
  // search across title, topic text and class name — the same client-side
  // filtering the staff views use for their topic lists (TopicReports).
  const [classId, setClassId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [classes, setClasses] = useState<ClassInfo[]>([]);

  useEffect(() => {
    loadTopics().catch((e) => toast.error(parseError(e)));
  }, [loadTopics]);

  // Class filter options, fetched once (non-fatal on failure — the search
  // still filters). /api/classes mirrors the topics' visibility scope
  // exactly (student → their classes, teacher → taught, admin → school,
  // super-admin → all), so every option can match library topics.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/classes");
        if (!res.ok) return;
        const list = (await res.json()) as ClassInfo[];
        if (!cancelled) setClasses(list);
      } catch {
        // Non-fatal: the library still works without the class filter.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleTopics = useMemo(() => {
    const q = query.trim().toLowerCase();
    return topics.filter((topic) => {
      if (classId === "__none__") {
        // Personal topics only (created without a class target).
        if (topic.classId) return false;
      } else if (classId && topic.classId !== classId) {
        return false;
      }
      if (!q) return true;
      return (
        topic.title.toLowerCase().includes(q) ||
        topic.topic.toLowerCase().includes(q) ||
        (topic.className ?? "").toLowerCase().includes(q)
      );
    });
  }, [topics, classId, query]);

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
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-56">
              <ClassCombobox
                classes={classes}
                value={classId}
                onChange={setClassId}
                allowAll
                allowNone
                allLabel={t("languageCheck.topics.allClasses")}
                noneLabel={t("languageCheck.topics.noneClass")}
              />
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("languageCheck.topics.search")}
                aria-label={t("languageCheck.topics.search")}
                className="h-9 pl-8"
              />
            </div>
          </div>

          {visibleTopics.length === 0 ? (
            <p className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
              {t("languageCheck.topics.emptyFilter")}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {visibleTopics.map((topic) => {
                const own = topic.userId === session?.user?.id;
                return (
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
                        {topic.classId && topic.className && (
                          <span
                            className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                            title={t("languageCheck.topics.classTopicTitle")}
                          >
                            <School className="h-3 w-3" />
                            {topic.className}
                          </span>
                        )}
                        {!own && topic.creatorName && (
                          <span className="text-[11px] text-muted-foreground">
                            {t("languageCheck.topics.by", { name: topic.creatorName })}
                          </span>
                        )}
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
                          onUseTopic(topic);
                        }}
                      >
                        <Upload className="mr-1.5 h-4 w-4" />
                        {t("languageCheck.topics.use")}
                      </Button>
                      {own && (
                        <>
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
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
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
