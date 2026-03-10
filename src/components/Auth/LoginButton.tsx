"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogIn, LogOut } from "lucide-react"

export function LoginButton() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <Button disabled>Loading...</Button>
  }

  if (session) {
    return (
      <Button onClick={() => signOut()} variant="outline">
        <LogOut className="mr-2 h-4 w-4" />
        Sign Out
      </Button>
    )
  }

  return (
    <Button onClick={() => signIn("google")}>
      <LogIn className="mr-2 h-4 w-4" />
      Sign in with Google
    </Button>
  )
}
