"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVocabularyStore } from "@/store/vocabulary";
import {
  ClassCombobox,
  type ClassComboboxClass,
} from "@/components/Internal/ClassCombobox";
import StudentCombobox from "@/components/LanguageCheck/StudentCombobox";

interface ScopedStudentClass {
  id: string;
  name: string;
  teacherId: string | null;
  teacherName: string | null;
  subjectName?: string | null;
  gradeName?: string | null;
}

interface ScopedStudent {
  id: string;
  name: string | null;
  email: string | null;
  /** First class (legacy compat) */
  classId: string | null;
  className: string | null;
  teacherId: string | null;
  teacherName: string | null;
  /** All classes the student belongs to (multi-class capable) */
  classes: ScopedStudentClass[];
  schoolId: string | null;
  schoolName: string | null;
}

function studentClasses(s: ScopedStudent): ScopedStudentClass[] {
  if (Array.isArray(s.classes) && s.classes.length > 0) return s.classes;
  if (s.classId) {
    return [{
      id: s.classId,
      name: s.className || s.classId,
      teacherId: s.teacherId,
      teacherName: s.teacherName,
    }];
  }
  return [];
}

const studentLabel = (s: ScopedStudent) =>
  s.name?.trim() || s.email || s.id;

interface StudentViewFiltersProps {
  role: "teacher" | "admin" | "super-admin";
}

function StudentViewFilters({ role }: StudentViewFiltersProps) {
  const { t } = useTranslation();
  const viewingUserId = useVocabularyStore((s) => s.viewingUserId);
  const fetchVocabulary = useVocabularyStore((s) => s.fetchVocabulary);

  const isSuperAdmin = role === "super-admin";
  const showTeacherFilter = role !== "teacher";

  const [students, setStudents] = useState<ScopedStudent[]>([]);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  /** null = all classes; "__none__" = ClassCombobox sentinel for no class. */
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [teacherFilter, setTeacherFilter] = useState<string>("all");

  useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;
    fetch("/api/schools")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) setSchools(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const qs =
      isSuperAdmin && schoolFilter !== "all"
        ? `?schoolId=${encodeURIComponent(schoolFilter)}`
        : "";
    fetch(`/api/vocabulary/students${qs}`)
      .then((r) => (r.ok ? r.json() : { students: [] }))
      .then((data) => {
        if (!cancelled) {
          setStudents(Array.isArray(data.students) ? data.students : []);
        }
      })
      .catch(() => {
        if (!cancelled) setStudents([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, schoolFilter]);

  const hasNoClassStudents = useMemo(
    () => students.some((s) => studentClasses(s).length === 0),
    [students]
  );

  // Class options are derived from the scoped students themselves (not
  // /api/classes): the roster can include co-taught classes that are not
  // the viewer's own, and only classes that actually contain a scoped
  // student are worth filtering by here.
  const comboboxClasses = useMemo<ClassComboboxClass[]>(() => {
    const map = new Map<string, ScopedStudentClass>();
    for (const s of students) {
      for (const c of studentClasses(s)) {
        if (!map.has(c.id)) map.set(c.id, c);
      }
    }
    return [...map.values()].map((c) => ({
      id: c.id,
      name: c.name,
      subjectName: c.subjectName ?? undefined,
      gradeName: c.gradeName ?? undefined,
      teacherName: c.teacherName ?? undefined,
    }));
  }, [students]);

  const classFiltered = useMemo(() => {
    if (classFilter === null) return students;
    if (classFilter === "__none__")
      return students.filter((s) => studentClasses(s).length === 0);
    return students.filter((s) => studentClasses(s).some((c) => c.id === classFilter));
  }, [students, classFilter]);

  const teacherOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of classFiltered) {
      for (const c of studentClasses(s)) {
        if (c.teacherId && c.teacherName) map.set(c.teacherId, c.teacherName);
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [classFiltered]);

  const teacherFiltered = useMemo(() => {
    if (!showTeacherFilter || teacherFilter === "all") return classFiltered;
    return classFiltered.filter((s) =>
      studentClasses(s).some((c) => c.teacherId === teacherFilter)
    );
  }, [classFiltered, teacherFilter, showTeacherFilter]);

  const studentOptions = useMemo(() => {
    const list = [...teacherFiltered];
    // Keep the currently viewed student selectable even if it falls outside
    // the active filters, so the picker never shows a raw id.
    if (viewingUserId && !list.some((s) => s.id === viewingUserId)) {
      const current = students.find((s) => s.id === viewingUserId);
      if (current) list.unshift(current);
    }
    return list;
  }, [teacherFiltered, viewingUserId, students]);

  // Flat {id, name, email} rows for StudentCombobox; the email column is
  // hidden when the display name IS the email (students without a name).
  const comboboxUsers = useMemo<LanguageCheckStaffUser[]>(
    () =>
      studentOptions.map((s) => {
        const name = s.name?.trim();
        return {
          id: s.id,
          name: name || s.email || s.id,
          email: name ? s.email ?? "" : "",
        };
      }),
    [studentOptions]
  );

  const handleStudentChange = (userId: string | null) => {
    if (userId === null) {
      fetchVocabulary(null);
      return;
    }
    const student = students.find((s) => s.id === userId);
    fetchVocabulary(userId, student ? studentLabel(student) : userId);
  };

  const selectTriggerClass =
    "h-9 w-full sm:w-[180px] text-sm font-normal";

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-card border rounded-lg">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
        <Eye className="h-4 w-4 text-amber-500" />
        <span>
          {t("vocabulary.studentView.title")}
        </span>
      </div>

      {isSuperAdmin && (
        <Select
          value={schoolFilter}
          onValueChange={(v) => {
            setSchoolFilter(v);
            setClassFilter(null);
            setTeacherFilter("all");
          }}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-w-[calc(100vw-3rem)]">
            <SelectItem value="all">
              {t("vocabulary.studentView.allSchools")}
            </SelectItem>
            {schools.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="w-full sm:w-[180px]">
        <ClassCombobox
          classes={comboboxClasses}
          value={classFilter}
          onChange={(v) => {
            setClassFilter(v);
            setTeacherFilter("all");
          }}
          allowAll
          allLabel={t("vocabulary.studentView.allClasses")}
          allowNone={hasNoClassStudents}
          noneLabel={t("vocabulary.studentView.noClass")}
          disabled={isLoading}
        />
      </div>

      {showTeacherFilter && (
        <Select
          value={teacherFilter}
          onValueChange={setTeacherFilter}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-w-[calc(100vw-3rem)]">
            <SelectItem value="all">
              {t("vocabulary.studentView.allTeachers")}
            </SelectItem>
            {teacherOptions.map((tc) => (
              <SelectItem key={tc.id} value={tc.id}>
                {tc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="w-full sm:w-[220px]">
        <StudentCombobox
          users={comboboxUsers}
          value={viewingUserId}
          onChange={handleStudentChange}
          allowMine
          mineLabel={t("vocabulary.studentView.myVocabulary")}
          loading={isLoading}
          loadingLabel={t("vocabulary.studentView.loading")}
          emptyLabel={t("vocabulary.studentView.noStudents")}
          searchPlaceholder={t("vocabulary.studentView.searchStudents")}
          className="font-medium"
        />
      </div>
    </div>
  );
}

export default StudentViewFilters;
