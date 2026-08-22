"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, LoaderCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVocabularyStore } from "@/store/vocabulary";
import { cn } from "@/utils/style";

interface ScopedStudent {
  id: string;
  name: string | null;
  email: string | null;
  classId: string | null;
  className: string | null;
  teacherId: string | null;
  teacherName: string | null;
  schoolId: string | null;
  schoolName: string | null;
}

interface StudentViewFiltersProps {
  role: "teacher" | "admin" | "super-admin";
}

const studentLabel = (s: ScopedStudent) =>
  s.name?.trim() || s.email || s.id;

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
  const [classFilter, setClassFilter] = useState<string>("all");
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
    () => students.some((s) => !s.classId),
    [students]
  );

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students) {
      if (s.classId && s.className) map.set(s.classId, s.className);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  const classFiltered = useMemo(() => {
    if (classFilter === "all") return students;
    if (classFilter === "none") return students.filter((s) => !s.classId);
    return students.filter((s) => s.classId === classFilter);
  }, [students, classFilter]);

  const teacherOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of classFiltered) {
      if (s.teacherId && s.teacherName) map.set(s.teacherId, s.teacherName);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [classFiltered]);

  const teacherFiltered = useMemo(() => {
    if (!showTeacherFilter || teacherFilter === "all") return classFiltered;
    return classFiltered.filter((s) => s.teacherId === teacherFilter);
  }, [classFiltered, teacherFilter, showTeacherFilter]);

  const studentOptions = useMemo(() => {
    const list = [...teacherFiltered];
    // Keep the currently viewed student selectable even if it falls outside
    // the active filters, so the Select never shows a raw id.
    if (viewingUserId && !list.some((s) => s.id === viewingUserId)) {
      const current = students.find((s) => s.id === viewingUserId);
      if (current) list.unshift(current);
    }
    return list;
  }, [teacherFiltered, viewingUserId, students]);

  const groupedBySchool = useMemo(() => {
    if (!isSuperAdmin || schoolFilter !== "all") return null;
    const groups = new Map<string, { label: string; students: ScopedStudent[] }>();
    for (const s of studentOptions) {
      const key = s.schoolId || "__none__";
      const label = s.schoolName || t("vocabulary.studentView.noSchool");
      const group = groups.get(key) || { label, students: [] };
      group.students.push(s);
      groups.set(key, group);
    }
    return [...groups.entries()].map(([key, group]) => ({
      key,
      ...group,
    }));
  }, [isSuperAdmin, schoolFilter, studentOptions, t]);

  const handleStudentChange = (value: string) => {
    if (value === "my") {
      fetchVocabulary(null);
      return;
    }
    const student = students.find((s) => s.id === value);
    fetchVocabulary(value, student ? studentLabel(student) : value);
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
            setClassFilter("all");
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

      <Select
        value={classFilter}
        onValueChange={(v) => {
          setClassFilter(v);
          setTeacherFilter("all");
        }}
      >
        <SelectTrigger className={selectTriggerClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-w-[calc(100vw-3rem)]">
          <SelectItem value="all">
            {t("vocabulary.studentView.allClasses")}
          </SelectItem>
          {hasNoClassStudents && (
            <SelectItem value="none">
              {t("vocabulary.studentView.noClass")}
            </SelectItem>
          )}
          {classOptions.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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

      <Select
        value={viewingUserId ?? "my"}
        onValueChange={handleStudentChange}
      >
        <SelectTrigger
          className={cn(selectTriggerClass, "sm:w-[220px] font-medium")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-w-[calc(100vw-3rem)] max-h-[50vh]">
          <SelectItem value="my">
            {t("vocabulary.studentView.myVocabulary")}
          </SelectItem>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              {t("vocabulary.studentView.loading")}
            </div>
          ) : studentOptions.length === 0 ? (
            <div className="py-4 px-2 text-sm text-muted-foreground text-center">
              {t("vocabulary.studentView.noStudents")}
            </div>
          ) : groupedBySchool ? (
            groupedBySchool.map((group) => (
              <SelectGroup key={group.key}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {studentLabel(s)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))
          ) : (
            studentOptions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {studentLabel(s)}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export default StudentViewFilters;
