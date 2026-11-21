"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { ArrowRightLeft, LoaderCircle } from "lucide-react";
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
import { ClassCombobox } from "@/components/Internal/ClassCombobox";
import StudentCombobox from "@/components/LanguageCheck/StudentCombobox";
import { useLanguageCheckStore } from "@/store/languageCheck";
import { parseError } from "@/utils/error";

/** Same sentinel the upload picker's class dropdown uses for "My Classes". */
const MY_CLASSES = "__mine__";

interface MoveEssayDialogProps {
  /** Essay to transfer; null while the dialog is closed. */
  essay: LanguageCheckEssaySummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Staff remediation for a mis-attributed essay: hand it to the right student
 * after the fact (e.g. "Check an essay for" was left on "Myself", or the
 * wrong learner was picked). The transcript, corrections, assessment and
 * scan stay exactly as they are — only ownership moves — and the caller
 * remains the recorded uploader, so the essay stays in their list with the
 * "For <name>" chip. Requires an explicit student pick, mirroring the
 * upload picker: nothing is pre-selected to move to.
 */
export default function MoveEssayDialog({
  essay,
  open,
  onOpenChange,
}: MoveEssayDialogProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const move = useLanguageCheckStore((s) => s.moveEssay);
  const myId = session?.user?.id;
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<LanguageCheckStaffUser[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [classId, setClassId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  const myClasses = classes.filter((c) => !!c.teacherId && c.teacherId === myId);

  // Fresh pick every time the dialog opens — never carry a target over from
  // a previous move (the same rule the upload picker's post-upload reset).
  useEffect(() => {
    if (!open) return;
    setClassId(null);
    setStudentId(null);
    setMoving(false);
  }, [open, essay?.id]);

  // Class options — same source + "My Classes" default adoption as the
  // upload picker (deliberate picks, made after options arrive, win).
  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const res = await fetch("/api/classes");
        if (!res.ok) return;
        const list = (await res.json()) as ClassInfo[];
        setClasses(list);
        if (list.some((c) => c.teacherId && c.teacherId === myId)) {
          setClassId((prev) => (prev === null ? MY_CLASSES : prev));
        }
      } catch {
        // Non-fatal: the student picker still works without the class filter.
      }
    })();
  }, [open, myId]);

  // Student options, narrowed by the class selection.
  useEffect(() => {
    if (!open) return;
    const ac = new AbortController();
    let superseded = false;
    setStudentsLoading(true);
    void (async () => {
      try {
        const qs = new URLSearchParams({ all: "1" });
        if (classId === MY_CLASSES) qs.set("mine", "1");
        else if (classId) qs.set("classId", classId);
        const res = await fetch(
          `/api/writing-assessment/staff/students?${qs.toString()}`,
          { signal: ac.signal },
        );
        if (!res.ok) return;
        const body = (await res.json()) as { users: LanguageCheckStaffUser[] };
        if (!superseded) setStudents(body.users);
      } catch {
        // Aborted or offline — keep the previous options.
      } finally {
        if (!superseded) setStudentsLoading(false);
      }
    })();
    return () => {
      superseded = true;
      ac.abort();
    };
  }, [open, classId]);

  const target = students.find((s) => s.id === studentId) ?? null;
  // Moving to the essay's current owner is a no-op — disable instead of
  // letting the server 400 it.
  const unchanged = !!essay?.ownerId && studentId === essay.ownerId;

  async function confirmMove() {
    if (!essay || !studentId || unchanged) return;
    setMoving(true);
    try {
      await move(essay.id, studentId);
      toast.success(
        t("languageCheck.list.moved", {
          name: target?.name ?? essay.ownerName ?? "",
        }),
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(parseError(error));
    } finally {
      setMoving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("languageCheck.list.moveTitle")}</DialogTitle>
          <DialogDescription>
            {t("languageCheck.list.moveDesc", {
              title: essay?.title || t("languageCheck.list.untitled"),
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <ClassCombobox
            classes={classes}
            value={classId}
            onChange={(next) => {
              // A student picked under another class may not belong to this one.
              setClassId(next);
              setStudentId(null);
            }}
            allowAll
            allowMine={myClasses.length > 0}
          />
          <StudentCombobox
            users={students}
            value={studentId}
            onChange={setStudentId}
            placeholder={t("languageCheck.upload.studentPlaceholder")}
            emptyLabel={t("languageCheck.staff.noStudents")}
            searchPlaceholder={t("languageCheck.staff.searchStudents")}
            loading={studentsLoading}
            loadingLabel={t("languageCheck.staff.loadingStudents")}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={moving} onClick={() => onOpenChange(false)}>
            {t("languageCheck.cancel")}
          </Button>
          <Button disabled={!studentId || unchanged || moving} onClick={confirmMove}>
            {moving ? (
              <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRightLeft className="mr-1.5 h-4 w-4" />
            )}
            {t("languageCheck.list.moveConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
