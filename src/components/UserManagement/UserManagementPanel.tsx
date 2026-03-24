"use client"

import { useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslation } from "react-i18next"
import { Download, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import UserList from "./UserList"
import ClassList from "./ClassList"
import StudentDataView from "./StudentDataView"
import SchoolList from "./SchoolList"
import AiQuestionsView from "./AiQuestionsView"

interface UserManagementPanelProps {
  open: boolean
  onClose: () => void
}

export default function UserManagementPanel({ open, onClose }: UserManagementPanelProps) {
  const { t } = useTranslation()
  const { data: session } = useSession()

  const isAdmin = session?.user?.role === "admin"
  const isTeacher = session?.user?.role === "teacher"

  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const importFileRef = useRef<HTMLInputElement>(null)

  const handleClose = (open: boolean) => {
    if (!open) onClose()
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch("/api/admin/export")
      if (!res.ok) {
        toast.error(t("userManagement.exportImport.exportFailed"))
        return
      }
      // Server returns a ZIP blob; derive filename from Content-Disposition.
      const disposition = res.headers.get("content-disposition") ?? ""
      const nameMatch = disposition.match(/filename="([^"]+)"/)
      const now = new Date()
      const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
      const filename = nameMatch?.[1] ?? `mrng-proreader-full-backup-${ts}.zip`

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t("userManagement.exportImport.exportSuccess"))
    } catch {
      toast.error(t("userManagement.exportImport.exportFailed"))
    } finally {
      setExporting(false)
    }
  }

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImportClick = () => {
    importFileRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset input so the same file can be re-selected if needed
    e.target.value = ""
    if (!file) return

    const isZip = file.name.endsWith(".zip") || file.type === "application/zip"
    const isJson = file.name.endsWith(".json") || file.type === "application/json"

    if (!isZip && !isJson) {
      toast.error(t("userManagement.exportImport.wrongFileType"))
      return
    }

    if (!confirm(t("userManagement.exportImport.importConfirm"))) return

    setImporting(true)
    try {
      let res: Response

      if (isZip) {
        // v2 full backup: send ZIP as multipart/form-data
        const formData = new FormData()
        formData.append("file", file)
        res = await fetch("/api/admin/import", {
          method: "POST",
          body: formData,
        })
      } else {
        // Legacy v1: parse JSON and post as application/json
        let payload: unknown
        try {
          const text = await file.text()
          payload = JSON.parse(text)
        } catch {
          toast.error(t("userManagement.exportImport.importInvalidFile"))
          return
        }
        res = await fetch("/api/admin/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = (err as { error?: string }).error || t("userManagement.exportImport.importFailed")
        toast.error(msg)
        return
      }

      const result = await res.json()
      const s = result.summary
      if (s.sessionsUpserted !== undefined) {
        // v2 full backup — show reading-history counts
        toast.success(
          t("userManagement.exportImport.importSuccessFull", {
            schools: s.schoolsUpserted,
            users: s.usersUpserted,
            classes: s.classesUpserted,
            sessions: s.sessionsUpserted,
          })
        )
      } else {
        // v1 user-management only
        toast.success(
          t("userManagement.exportImport.importSuccess", {
            schools: s.schoolsUpserted,
            users: s.usersUpserted,
            classes: s.classesUpserted,
            memberships: s.membershipsUpserted,
          })
        )
      }
    } catch {
      toast.error(t("userManagement.exportImport.importFailed"))
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>{t("userManagement.title")}</DialogTitle>
            {isAdmin && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 pr-6">
                      {/* Export */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        disabled={exporting || importing}
                      >
                        {exporting ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-1" />
                        )}
                        {exporting
                          ? t("userManagement.exportImport.exporting")
                          : t("userManagement.exportImport.export")}
                      </Button>

                      {/* Import */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleImportClick}
                        disabled={exporting || importing}
                      >
                        {importing ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-1" />
                        )}
                        {importing
                          ? t("userManagement.exportImport.importing")
                          : t("userManagement.exportImport.import")}
                      </Button>

                      {/* Hidden file input — accepts v2 ZIP or legacy JSON */}
                      <input
                        ref={importFileRef}
                        type="file"
                        accept=".zip,application/zip,.json,application/json"
                        className="hidden"
                        onChange={handleFileSelected}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-64 text-center">
                    {t("userManagement.exportImport.tooltip")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </DialogHeader>
        <Tabs defaultValue="students" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full justify-start">
            {isAdmin && (
              <TabsTrigger value="schools">{t("userManagement.tabs.schools")}</TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="users">{t("userManagement.tabs.users")}</TabsTrigger>
            )}
            <TabsTrigger value="classes">{t("userManagement.tabs.classes")}</TabsTrigger>
            {(isAdmin || isTeacher) && (
              <TabsTrigger value="students">{t("userManagement.tabs.studentData")}</TabsTrigger>
            )}
            {(isAdmin || isTeacher) && (
              <TabsTrigger value="aiQuestions">{t("userManagement.tabs.aiQuestions")}</TabsTrigger>
            )}
          </TabsList>
          <div className="flex-1 overflow-auto mt-4">
            {isAdmin && (
              <TabsContent value="schools" className="mt-0">
                <SchoolList />
              </TabsContent>
            )}
            {isAdmin && (
              <TabsContent value="users" className="mt-0">
                <UserList />
              </TabsContent>
            )}
            <TabsContent value="classes" className="mt-0">
              <ClassList isAdmin={isAdmin} currentUserId={session?.user?.id} />
            </TabsContent>
            {(isAdmin || isTeacher) && (
              <TabsContent value="students" className="mt-0">
                <StudentDataView isAdmin={isAdmin} currentUserId={session?.user?.id} />
              </TabsContent>
            )}
            {(isAdmin || isTeacher) && (
              <TabsContent value="aiQuestions" className="mt-0">
                <AiQuestionsView isAdmin={isAdmin} />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
