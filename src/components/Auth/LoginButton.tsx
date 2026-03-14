"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { LogIn, LogOut } from "lucide-react"

export function LoginButton() {
  const { t } = useTranslation()
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <Button disabled>{t("header.auth.loading")}</Button>
  }

  if (session) {
    return (
      <Button onClick={() => signOut()} variant="outline" size="sm">
        <LogOut className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">{t("header.auth.signOut")}</span>
      </Button>
    )
  }

    return (
      <Button onClick={() => signIn("google")} size="sm">
        <LogIn className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">{t("header.auth.signIn")}</span>
    </Button>
  )
}
