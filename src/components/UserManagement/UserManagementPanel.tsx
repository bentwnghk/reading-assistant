"use client"

import { useSession } from "next-auth/react"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import UserList from "./UserList"
import ClassList from "./ClassList"
import StudentDataView from "./StudentDataView"
import SchoolList from "./SchoolList"

interface UserManagementPanelProps {
  open: boolean
  onClose: () => void
}

export default function UserManagementPanel({ open, onClose }: UserManagementPanelProps) {
  const { t } = useTranslation()
  const { data: session } = useSession()

  const isAdmin = session?.user?.role === "admin"
  const isTeacher = session?.user?.role === "teacher"

  const handleClose = (open: boolean) => {
    if (!open) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("userManagement.title")}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="classes" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full justify-start">
            {isAdmin && (
              <TabsTrigger value="users">{t("userManagement.tabs.users")}</TabsTrigger>
            )}
            <TabsTrigger value="classes">{t("userManagement.tabs.classes")}</TabsTrigger>
            {(isAdmin || isTeacher) && (
              <TabsTrigger value="students">{t("userManagement.tabs.studentData")}</TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="schools">{t("userManagement.tabs.schools")}</TabsTrigger>
            )}
          </TabsList>
          <div className="flex-1 overflow-auto mt-4">
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
            {isAdmin && (
              <TabsContent value="schools" className="mt-0">
                <SchoolList />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
