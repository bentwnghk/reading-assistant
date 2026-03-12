"use client"

import { Suspense, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"

function SignInRedirect() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  useEffect(() => {
    signIn("google", { callbackUrl })
  }, [callbackUrl])

  return null
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm">Redirecting to sign in...</p>
      <Suspense>
        <SignInRedirect />
      </Suspense>
    </div>
  )
}
