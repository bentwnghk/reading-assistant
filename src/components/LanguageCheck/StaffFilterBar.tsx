"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { ClassCombobox } from "@/components/Internal/ClassCombobox";
import StudentCombobox from "@/components/LanguageCheck/StudentCombobox";

export interface StaffSelection {
  classId: string | null;
  userId: string | null;
}

export const EMPTY_STAFF_SELECTION: StaffSelection = { classId: null, userId: null };

interface StaffFilterBarProps {
  role: string | undefined;
  value: StaffSelection;
  onChange: (next: StaffSelection) => void;
}

/**
 * One class + student selection for every staff tab (essays AND learning), so
 * a teacher can pick a student once and flip between their essays and their
 * learning progress. Options are scoped by role (teacher → own classes, admin →
 * school, super-admin → everyone) and the student list narrows by class only,
 * never by the selected student, so switching stays possible.
 */
export default function StaffFilterBar({ role, value, onChange }: StaffFilterBarProps) {
  const { t } = useTranslation();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [users, setUsers] = useState<LanguageCheckStaffUser[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/classes");
        if (res.ok) setClasses((await res.json()) as ClassInfo[]);
      } catch {
        // Non-fatal: the student filter still works without the class picker.
      }
    })();
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const qs = value.classId ? `?classId=${encodeURIComponent(value.classId)}` : "";
        const res = await fetch(`/api/language-check/staff/students${qs}`, {
          signal: ac.signal,
        });
        if (!res.ok) return;
        const body = (await res.json()) as { users: LanguageCheckStaffUser[] };
        setUsers(body.users);
      } catch {
        // Aborted or offline — keep the previous options.
      }
    })();
    return () => ac.abort();
  }, [value.classId]);

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
          />
        </div>
      </div>
    </div>
  );
}
