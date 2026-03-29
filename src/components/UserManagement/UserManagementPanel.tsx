"use client"

import { useRef, useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useTranslation } from "react-i18next"
import { Download, Info, Loader2, Mail, Upload } from "lucide-react"
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

  const role = session?.user?.role
  const isSuperAdmin = role === "super-admin"
  const isAdmin = role === "admin"
  const isTeacher = role === "teacher"
  const currentUserId = session?.user?.id

  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const importFileRef = useRef<HTMLInputElement>(null)

  const defaultTab = useMemo(() => {
    if (isSuperAdmin) return "schools"
    if (isAdmin) return "users"
    return "students"
  }, [isSuperAdmin, isAdmin])

  const handleClose = (open: boolean) => {
    if (!open) onClose()
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch("/api/admin/export")
      if (!res.ok) {
        toast.error(t("userManagement.exportImport.exportFailed"))
        return
      }
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

  const handleImportClick = () => {
    importFileRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
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
        const formData = new FormData()
        formData.append("file", file)
        res = await fetch("/api/admin/import", {
          method: "POST",
          body: formData,
        })
      } else {
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
        toast.success(
          t("userManagement.exportImport.importSuccessFull", {
            schools: s.schoolsUpserted,
            users: s.usersUpserted,
            classes: s.classesUpserted,
            sessions: s.sessionsUpserted,
          })
        )
      } else {
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

  const handleSendTestReminder = async () => {
    setSendingTest(true)
    try {
      const res = await fetch("/api/reminders/test", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || t("reminder.testSendFailed"))
        return
      }
      toast.success(t("reminder.testSent", { email: data.sentTo }))
    } catch {
      toast.error(t("reminder.testSendFailed"))
    } finally {
      setSendingTest(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>{t("userManagement.title")}</DialogTitle>
            {isSuperAdmin && (
              <div className="flex items-center gap-1 pr-6">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button tabIndex={-1} className="p-1 rounded hover:bg-muted cursor-pointer">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-64 text-center">
                      {t("userManagement.exportImport.tooltip")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

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

                <input
                  ref={importFileRef}
                  type="file"
                  accept=".zip,application/zip,.json,application/json"
                  className="hidden"
                  onChange={handleFileSelected}
                />

                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSendTestReminder}
                        disabled={exporting || importing || sendingTest}
                      >
                        {sendingTest ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4 mr-1" />
                        )}
                        {t("reminder.sendTest")}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-64 text-center">
                      {t("reminder.sendTestTip")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </DialogHeader>
        <Tabs defaultValue={defaultTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full justify-start">
            {isSuperAdmin && (
              <TabsTrigger value="schools">{t("userManagement.tabs.schools")}</TabsTrigger>
            )}
            {(isSuperAdmin || isAdmin) && (
              <TabsTrigger value="users">{t("userManagement.tabs.users")}</TabsTrigger>
            )}
            <TabsTrigger value="classes">{t("userManagement.tabs.classes")}</TabsTrigger>
            {(isSuperAdmin || isAdmin || isTeacher) && (
              <TabsTrigger value="students">{t("userManagement.tabs.studentData")}</TabsTrigger>
            )}
            {(isSuperAdmin || isAdmin || isTeacher) && (
              <TabsTrigger value="aiQuestions">{t("userManagement.tabs.aiQuestions")}</TabsTrigger>
            )}
          </TabsList>
          <div className="flex-1 overflow-auto mt-4">
            {isSuperAdmin && (
              <TabsContent value="schools" className="mt-0">
                <SchoolList />
              </TabsContent>
            )}
            {(isSuperAdmin || isAdmin) && (
              <TabsContent value="users" className="mt-0">
                <UserList isSuperAdmin={isSuperAdmin} />
              </TabsContent>
            )}
            <TabsContent value="classes" className="mt-0">
              <ClassList isSuperAdmin={isSuperAdmin} isAdmin={isAdmin} currentUserId={currentUserId} />
            </TabsContent>
            {(isSuperAdmin || isAdmin || isTeacher) && (
              <TabsContent value="students" className="mt-0">
                <StudentDataView isSuperAdmin={isSuperAdmin} isAdmin={isAdmin} currentUserId={currentUserId} />
              </TabsContent>
            )}
            {(isSuperAdmin || isAdmin || isTeacher) && (
              <TabsContent value="aiQuestions" className="mt-0">
                <AiQuestionsView isSuperAdmin={isSuperAdmin} isAdmin={isAdmin} />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
