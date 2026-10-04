import { useSettingStore, enforceRestrictedModels } from "@/store/setting"

/**
 * Client-side free-trial activation shared by the onboarding wizard and the
 * settings banner (single implementation — both entry points must behave
 * identically).
 *
 * POSTs /api/trial, switches the user onto Free (proxy) billing mode so AI
 * requests ride the identity-bound ticket, refreshes the ticket immediately
 * (so AI works without waiting for the next periodic AuthProvider refresh),
 * and keeps the /api/trial mirror fields in the setting store up to date for
 * every outcome (active / already used / feature disabled).
 *
 * Returns the outcome; callers surface their own toasts and step transitions.
 */
export type ActivateTrialResult =
  | { ok: true; expiresAt: string }
  | { ok: false; reason: "used" | "disabled" | "failed" }

export async function activateFreeTrial(
  role?: string | null
): Promise<ActivateTrialResult> {
  let response: Response
  try {
    response = await fetch("/api/trial", { method: "POST" })
  } catch {
    return { ok: false, reason: "failed" }
  }

  if (response.status === 409) {
    // One trial per user, ever — the existing row has already expired.
    useSettingStore.setState({ trialUsed: true })
    return { ok: false, reason: "used" }
  }
  if (response.status === 403) {
    // FREE_TRIAL_DAYS not configured on this deployment.
    useSettingStore.setState({ trialEnabled: false })
    return { ok: false, reason: "disabled" }
  }
  if (!response.ok) {
    return { ok: false, reason: "failed" }
  }

  const data = (await response.json().catch(() => ({}))) as {
    active?: boolean
    expiresAt?: string | null
  }
  if (!data.active) {
    return { ok: false, reason: "failed" }
  }

  // Ride the identity-bound free-access ticket in proxy mode (same path as
  // FREE_ACCESS_EMAILS users) — no password or API key needed.
  useSettingStore.getState().update({ mode: "proxy" })
  enforceRestrictedModels(role)
  useSettingStore.getState().syncNow()
  useSettingStore.setState({
    trialActive: true,
    trialExpiresAt: data.expiresAt || "",
    trialUsed: true,
  })
  fetch("/api/free-access/ticket").catch(() => {})

  return { ok: true, expiresAt: data.expiresAt || "" }
}
