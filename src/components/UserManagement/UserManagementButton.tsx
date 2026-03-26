"use client"

import { useSession } from "next-auth/react"
import { useTranslation } from "react-i18next"
import { Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import UserManagementPanel from "./UserManagementPanel"
import { useState } from "react"

export function UserManagementButton() {
  const { t } = useTranslation()
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)

  if (status !== "authenticated" || !session?.user?.role) {
    return null
  }

  const role = session.user.role
  if (role === "student") {
    return null
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="mr-2"
      >
        <Users className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">{t("userManagement.title")}</span>
      </Button>
      <UserManagementPanel open={open} onClose={() => setOpen(false)} />
    </>
  )
}
