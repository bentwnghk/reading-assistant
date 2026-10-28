"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { ClassCombobox } from "@/components/Internal/ClassCombobox";
import StudentCombobox from "@/components/LanguageCheck/StudentCombobox";

export interface StaffSelection {
  /**
   * "__mine__" (My Classes — the classes the viewer teaches), a class id, or
   * null (All Classes). Only produced when `allowMine` is set.
   */
  classId: string | null;
  userId: string | null;
}

export const EMPTY_STAFF_SELECTION: StaffSelection = { classId: null, userId: null };

interface StaffFilterBarProps {
  role: string | undefined;
  value: StaffSelection;
  onChange: (next: StaffSelection) => void;
  /** Student options endpoint (`?classId=`/`?mine=` is appended). Defaults to Language Check's. */
  studentsEndpoint?: string;
  /**
   * Offer a "My Classes" option (classes the viewer teaches) and make it the
   * default — like the "Check an essay for" picker — so admins/super-admins
   * who teach land on their own classes instead of every class in scope.
   * Consumers must translate "__mine__" the same way (mine=1).
   */
  allowMine?: boolean;
}

/**
 * One class + student selection for every staff tab (essays AND learning), so
 * a teacher can pick a student once and flip between their essays and their
 * learning progress. Options are scoped by role (teacher → own classes, admin →
 * school, super-admin → everyone) and the student list narrows by class only,
 * never by the selected student, so switching stays possible.
 */
export default function StaffFilterBar({
  role,
  value,
  onChange,
  studentsEndpoint = "/api/language-check/staff/students",
  allowMine = false,
}: StaffFilterBarProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const myId = session?.user?.id;
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [users, setUsers] = useState<LanguageCheckStaffUser[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Classes the caller teaches — drives the "My Classes" option, which is
  // also the DEFAULT. Same derivation as the Teacher Dashboard and the
  // "Check an essay for" picker.
  const myClasses = classes.filter((c) => !!c.teacherId && c.teacherId === myId);

  // Latest classId without re-running the default-adoption effect below.
  const classIdRef = useRef(value.classId);
  useEffect(() => {
    classIdRef.current = value.classId;
  }, [value.classId]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/classes");
        if (!res.ok) return;
        const list = (await res.json()) as ClassInfo[];
        setClasses(list);
        // Adopt "My Classes" as the default once options arrive, but only
        // while nothing has been picked ("All Classes" can only be chosen
        // after this runs, so a deliberate pick is never overridden).
        if (
          allowMine &&
          classIdRef.current === null &&
          list.some((c) => c.teacherId && c.teacherId === myId)
        ) {
          onChange({ classId: "__mine__", userId: null });
        }
      } catch {
        // Non-fatal: the student filter still works without the class picker.
      }
    })();
    // Mount-time fetch: re-running it when `onChange` changes identity could
    // re-adopt the "My Classes" default over a deliberate "All Classes" pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowMine, myId]);

  useEffect(() => {
    const ac = new AbortController();
    let superseded = false;
    setIsLoadingStudents(true);
    void (async () => {
      try {
        // "My Classes" = the caller's own classes (students endpoint narrows
        // by the teacher's classes); a plain class id narrows to that class.
        const qs =
          value.classId === "__mine__"
            ? "?mine=1"
            : value.classId
              ? `?classId=${encodeURIComponent(value.classId)}`
              : "";
        const res = await fetch(`${studentsEndpoint}${qs}`, {
          signal: ac.signal,
        });
        if (!res.ok) return;
        const body = (await res.json()) as { users: LanguageCheckStaffUser[] };
        setUsers(body.users);
      } catch {
        // Aborted or offline — keep the previous options.
      } finally {
        // A request aborted because the class changed must not clear the
        // spinner of the request that replaced it.
        if (!superseded) setIsLoadingStudents(false);
      }
    })();
    return () => {
      superseded = true;
      ac.abort();
    };
  }, [value.classId, studentsEndpoint]);

  const scopeLabel =
    role === "teacher"
      ? t("languageCheck.staff.scopeTeacher")
      : role === "admin"
        ? t("languageCheck.staff.scopeSchool")
        : t("languageCheck.staff.scopeAll");

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Users className="h-4 w-4" />
        {scopeLabel}
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-56">
          <ClassCombobox
            classes={classes}
            value={value.classId}
            onChange={(classId) =>
              // A student picked under another class may not belong to this one.
              onChange({ classId, userId: null })
            }
            allowAll
            allowMine={allowMine && myClasses.length > 0}
          />
        </div>
        <div className="w-full sm:w-56">
          <StudentCombobox
            users={users}
            value={value.userId}
            onChange={(userId) => onChange({ ...value, userId })}
            placeholder={t("languageCheck.staff.allStudents")}
            allLabel={t("languageCheck.staff.allStudents")}
            emptyLabel={t("languageCheck.staff.noStudents")}
            searchPlaceholder={t("languageCheck.staff.searchStudents")}
            loading={isLoadingStudents}
            loadingLabel={t("languageCheck.staff.loadingStudents")}
          />
        </div>
      </div>
    </div>
  );
}
