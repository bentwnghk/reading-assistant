"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, Pencil, Trash2, ArrowUpDown, School, ChevronLeft, ChevronRight } from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import type { SchoolInfo } from "@/lib/users"

type SortField = "name" | "domain" | "userCount"
type SortOrder = "asc" | "desc"

export default function SchoolList() {
  const { t } = useTranslation()
  const [schools, setSchools] = useState<SchoolInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState<SchoolInfo | null>(null)
  const [nameInput, setNameInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const loadSchools = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/schools")
      if (response.ok) {
        setSchools(await response.json())
      } else {
        toast.error(t("userManagement.loadFailed"))
      }
    } catch (error) {
      console.error("Failed to load schools:", error)
      toast.error(t("userManagement.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadSchools()
  }, [loadSchools])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const sortedSchools = useMemo(() => {
    return [...schools].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "domain":
          comparison = a.domain.localeCompare(b.domain)
          break
        case "userCount":
          comparison = (a.userCount ?? 0) - (b.userCount ?? 0)
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })
  }, [schools, sortField, sortOrder])

  const totalPages = Math.max(1, Math.ceil(sortedSchools.length / PAGE_SIZE))
  const paginatedSchools = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return sortedSchools.slice(start, start + PAGE_SIZE)
  }, [sortedSchools, page])

  useEffect(() => {
    setPage(1)
  }, [sortField, sortOrder])

  const openEditDialog = (school: SchoolInfo) => {
    setSelectedSchool(school)
    setNameInput(school.name)
    setEditDialogOpen(true)
  }

  const handleSave = async () => {
    if (!nameInput.trim()) {
      toast.error(t("userManagement.schools.nameRequired"))
      return
    }
    if (!selectedSchool) return

    setSaving(true)
    try {
      const response = await fetch(`/api/schools/${selectedSchool.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.trim() }),
      })

      if (response.ok) {
        toast.success(t("userManagement.schools.updated"))
        setEditDialogOpen(false)
        // Optimistic update
        setSchools(schools.map(s =>
          s.id === selectedSchool.id ? { ...s, name: nameInput.trim() } : s
        ))
      } else {
        toast.error(t("userManagement.schools.saveFailed"))
      }
    } catch (error) {
      console.error("Failed to update school:", error)
      toast.error(t("userManagement.schools.saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (school: SchoolInfo) => {
    if (!confirm(t("userManagement.schools.deleteConfirm", { name: school.name }))) return

    try {
      const response = await fetch(`/api/schools/${school.id}`, { method: "DELETE" })
      if (response.ok) {
        toast.success(t("userManagement.schools.deleted"))
        setSchools(schools.filter(s => s.id !== school.id))
      } else {
        toast.error(t("userManagement.schools.deleteFailed"))
      }
    } catch (error) {
      console.error("Failed to delete school:", error)
      toast.error(t("userManagement.schools.deleteFailed"))
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("userManagement.schools.description")}</p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button variant="ghost" size="sm" onClick={() => handleSort("name")}>
                {t("userManagement.schools.name")}
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" size="sm" onClick={() => handleSort("domain")}>
                {t("userManagement.schools.domain")}
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-center">
              <Button variant="ghost" size="sm" onClick={() => handleSort("userCount")}>
                {t("userManagement.schools.users")}
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>{t("userManagement.schools.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedSchools.map((school) => (
            <TableRow key={school.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <School className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{school.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono text-xs">
                  @{school.domain}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary">{school.userCount ?? 0}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(school)}
                    title={t("userManagement.schools.edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                    onClick={() => handleDelete(school)}
                    title={t("userManagement.schools.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {sortedSchools.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {t("userManagement.schools.noSchools")}
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("userManagement.schools.edit")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">
                {t("userManagement.schools.domain")}
              </label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  @{selectedSchool?.domain}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {t("userManagement.schools.domainReadOnly")}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t("userManagement.schools.name")}</label>
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={t("userManagement.schools.namePlaceholder")}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
              {t("userManagement.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t("userManagement.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
