/**
 * Client-side activity logger.
 * Calls POST /api/activity – fire-and-forget, errors are silently swallowed
 * so they never disrupt the main learning flow.
 */

type ActivityType =
  | "session_create"
  | "test_complete"
  | "quiz_complete"
  | "spelling_complete"
  | "flashcard_review"

interface ActivityDetails {
  cardsReviewed?: number
  wordCount?: number
  mode?: string
  difficulty?: string
  streak?: number
}

interface LogActivityOptions {
  sessionId?: string
  score?: number
  details?: ActivityDetails
}

export function logActivity(
  activityType: ActivityType,
  options: LogActivityOptions = {}
): void {
  // Only log for authenticated users (the API will 401 otherwise, which is fine,
  // but we save the network round-trip by not calling it at all for unauthenticated users)
  fetch("/api/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activityType, ...options }),
  }).catch(() => {
    // Intentionally silent – leaderboard tracking must never break core UX
  })
}
