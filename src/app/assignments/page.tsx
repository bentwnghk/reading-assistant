"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import dynamic from "next/dynamic"
import { useSettingStore } from "@/store/setting"
import { useTheme } from "next-themes"
import { useLayoutEffect } from "react"

const Header = dynamic(() => import("@/components/Internal/Header"))
const AssignmentsList = dynamic(
  () => import("@/components/Assignments/AssignmentsList"),
  { ssr: false },
)

export default function AssignmentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { theme } = useSettingStore()
  const { setTheme } = useTheme()

  useLayoutEffect(() => {
    setTheme(theme)
  }, [theme, setTheme])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/")
    }
  }, [status, router])

  if (status === "loading" || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-lg:max-w-screen-md max-w-screen-lg mx-auto px-4 py-6">
        <AssignmentsList />
      </div>
    </div>
  )
}
