"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { useTranslation } from "react-i18next"
import { Mail, CheckCircle, XCircle, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const status = searchParams.get("status")
  const { t } = useTranslation()

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            {t("reminder.unsubscribeSuccessTitle")}
          </h1>
          <p className="mb-8 text-muted-foreground">
            {t("reminder.unsubscribeSuccessMessage")}
          </p>
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              {t("reminder.backToHome")}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  if (status === "invalid") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            {t("reminder.unsubscribeInvalidTitle")}
          </h1>
          <p className="mb-8 text-muted-foreground">
            {t("reminder.unsubscribeInvalidMessage")}
          </p>
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              {t("reminder.backToHome")}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Mail className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          {t("reminder.unsubscribePageTitle")}
        </h1>
        <p className="mb-8 text-muted-foreground">
          {t("reminder.unsubscribePageMessage")}
        </p>
        <Button asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            {t("reminder.backToHome")}
          </Link>
        </Button>
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  )
}
