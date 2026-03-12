"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, Plus, Trash2, Search, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import type { ClassMember, UserWithRole } from "@/lib/users"

interface ClassMembersProps {
  classId: string
  isAdmin: boolean
  onMembersChange?: () => void
}

type SortOrder = "asc" | "desc"

export default function ClassMembers({ classId, isAdmin: _isAdmin, onMembersChange }: ClassMembersProps) {
  const { t } = useTranslation()
  const [members, setMembers] = useState<ClassMember[]>([])
  const [availableStudents, setAvailableStudents] = useState<UserWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addingStudentId, setAddingStudentId] = useState("")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")

  const loadMembers = useCallback(async () => {
    try {
      const response = await fetch(`/api/classes/${classId}/members`)
      if (response.ok) {
        setMembers(await response.json())
      }
    } catch (error) {
      console.error("Failed to load members:", error)
    } finally {
      setLoading(false)
    }
  }, [classId])

  const loadAvailableStudents = useCallback(async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const users: UserWithRole[] = await response.json()
        const memberIds = new Set(members.map(m => m.studentId))
        setAvailableStudents(
          users.filter(u => u.role === "student" && !memberIds.has(u.id))
        )
      }
    } catch (error) {
      console.error("Failed to load students:", error)
    }
  }, [members])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const handleSort = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  }

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const comparison = (a.studentName || "").localeCompare(b.studentName || "")
      return sortOrder === "asc" ? comparison : -comparison
    })
  }, [members, sortOrder])

  useEffect(() => {
    if (showAddDialog) {
      loadAvailableStudents()
    }
  }, [showAddDialog, loadAvailableStudents])

  const handleAddStudent = async () => {
    if (!addingStudentId) return

    try {
      const response = await fetch(`/api/classes/${classId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: addingStudentId }),
      })

      if (response.ok) {
        toast.success(t("userManagement.members.studentAdded"))
        setAddingStudentId("")
        setShowAddDialog(false)
        loadMembers()
        onMembersChange?.()
      } else {
        toast.error(t("userManagement.members.addFailed"))
      }
    } catch (error) {
      console.error("Failed to add student:", error)
      toast.error(t("userManagement.members.addFailed"))
    }
  }

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm(t("userManagement.members.removeConfirm"))) return

    try {
      const response = await fetch(
        `/api/classes/${classId}/members?studentId=${studentId}`,
        { method: "DELETE" }
      )

      if (response.ok) {
        toast.success(t("userManagement.members.studentRemoved"))
        loadMembers()
        onMembersChange?.()
      } else {
        toast.error(t("userManagement.members.removeFailed"))
      }
    } catch (error) {
      console.error("Failed to remove student:", error)
      toast.error(t("userManagement.members.removeFailed"))
    }
  }

  const filteredStudents = availableStudents.filter(s =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {t("userManagement.members.description")}
        </p>
        <Button onClick={() => setShowAddDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          {t("userManagement.members.addStudent")}
        </Button>
      </div>

      {showAddDialog && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("userManagement.members.searchStudents")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t("userManagement.cancel")}
            </Button>
          </div>
          {filteredStudents.length > 0 && (
            <div className="max-h-48 overflow-auto border rounded">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                  onClick={() => setAddingStudentId(student.id)}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={student.image || undefined} />
                      <AvatarFallback>{student.name?.[0] || student.email?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm">{student.name || t("userManagement.users.noName")}</div>
                      <div className="text-xs text-muted-foreground">{student.email}</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={addingStudentId === student.id ? "default" : "ghost"}
                  >
                    {addingStudentId === student.id ? t("userManagement.members.selected") : t("userManagement.members.select")}
                  </Button>
                </div>
              ))}
            </div>
          )}
          {filteredStudents.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              {t("userManagement.members.noAvailableStudents")}
            </div>
          )}
          {addingStudentId && (
            <Button onClick={handleAddStudent} className="w-full">
              {t("userManagement.members.confirmAdd")}
            </Button>
          )}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button variant="ghost" size="sm" onClick={handleSort}>
                {t("userManagement.members.student")}
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>{t("userManagement.members.joinedAt")}</TableHead>
            <TableHead>{t("userManagement.members.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedMembers.map((member) => (
            <TableRow key={member.studentId}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.studentImage || undefined} />
                    <AvatarFallback>
                      {member.studentName?.[0] || member.studentEmail?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{member.studentName || t("userManagement.users.noName")}</div>
                    <div className="text-sm text-muted-foreground">{member.studentEmail}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => handleRemoveStudent(member.studentId)}
                  title={t("userManagement.members.remove")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {members.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {t("userManagement.members.noMembers")}
        </div>
      )}
    </div>
  )
}
