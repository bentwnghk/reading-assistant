import type { SettingStore } from "@/store/setting"

interface FreeAccessConfig {
  /** Full email addresses granted free (proxy) access. */
  addresses: Set<string>
  /** Email domains granted free (proxy) access. */
  domains: Set<string>
}

/**
 * Parses FREE_ACCESS_EMAILS — a comma-separated list of full email addresses
 * (user@host) and/or domains (@host or host), matched case-insensitively.
 * Example: "@school.edu,user@gmail.com"
 */
export function getFreeAccessConfig(): FreeAccessConfig {
  const entries = (process.env.FREE_ACCESS_EMAILS || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)

  const addresses = new Set<string>()
  const domains = new Set<string>()
  for (const entry of entries) {
    if (entry.startsWith("@")) {
      if (entry.length > 1) domains.add(entry.slice(1))
    } else if (entry.includes("@")) {
      addresses.add(entry)
    } else {
      domains.add(entry)
    }
  }
  return { addresses, domains }
}

/**
 * Whether this email is whitelisted for identity-bound free (proxy) AI access.
 * Must stay Edge-safe (no DB / auth imports) if ever used outside Node routes.
 */
export function isFreeAccessEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  const { addresses, domains } = getFreeAccessConfig()
  if (addresses.has(normalized)) return true
  const atIndex = normalized.lastIndexOf("@")
  if (atIndex === -1) return false
  return domains.has(normalized.slice(atIndex + 1))
}

/**
 * Defaults whitelisted users onto Free (proxy) billing mode. The Access
 * Password is deliberately NOT injected — access is granted identity-bound via
 * a session-bound ticket cookie (see src/utils/free-access-ticket.ts), so the
 * shared password never reaches the client. `accessPassword` is left untouched
 * for users who typed their own.
 */
export function applyFreeAccessSettings(
  settings: Partial<SettingStore>,
  email: string | null | undefined
): { settings: Partial<SettingStore>; changed: boolean } {
  if (!isFreeAccessEmail(email)) {
    return { settings, changed: false }
  }
  if (settings.mode === "proxy") {
    return { settings, changed: false }
  }
  return {
    settings: { ...settings, mode: "proxy" },
    changed: true,
  }
}
