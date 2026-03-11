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
      <Button onClick={() => signOut()} variant="outline">
        <LogOut className="mr-2 h-4 w-4" />
        {t("header.auth.signOut")}
      </Button>
    )
  }

  return (
    <Button onClick={() => signIn("google")}>
      <LogIn className="mr-2 h-4 w-4" />
      {t("header.auth.signIn")}
    </Button>
  )
}
