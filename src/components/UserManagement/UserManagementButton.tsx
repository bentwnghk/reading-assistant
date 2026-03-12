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

  if (session.user.role === "student") {
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
        <Users className="h-4 w-4 mr-1" />
        {t("userManagement.title")}
      </Button>
      <UserManagementPanel open={open} onClose={() => setOpen(false)} />
    </>
  )
}
