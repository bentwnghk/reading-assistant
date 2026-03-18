type ActivityType =
  | "session_create"
  | "test_complete"
  | "quiz_complete"
  | "spelling_complete"
  | "flashcard_review"
  | "mindmap_generate"
  | "adapted_text_generate"
  | "simplified_text_generate"
  | "sentence_analyze"
  | "targeted_practice_complete"
  | "glossary_add"
  | "ai_tutor_question"

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

export interface NewlyUnlockedAchievement {
  type: string
  milestone: number
  icon: string
  color: string
}

type AchievementUnlockCallback = (achievements: NewlyUnlockedAchievement[]) => void

let achievementCallback: AchievementUnlockCallback | null = null

export function setAchievementUnlockCallback(callback: AchievementUnlockCallback | null): void {
  achievementCallback = callback
}

export function logActivity(
  activityType: ActivityType,
  options: LogActivityOptions = {}
): void {
  console.log("[activityLogger] logActivity called with:", { activityType, options });
  fetch("/api/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activityType, ...options }),
  })
    .then(res => res.json())
    .then(data => {
      console.log("[activityLogger] Response from API:", { newlyUnlocked: data.newlyUnlocked, callbackExists: !!achievementCallback });
      if (data.newlyUnlocked && data.newlyUnlocked.length > 0 && achievementCallback) {
        console.log("[activityLogger] Calling achievementCallback with:", data.newlyUnlocked);
        achievementCallback(data.newlyUnlocked as NewlyUnlockedAchievement[])
      }
    })
    .catch((err) => {
      console.error("[activityLogger] Error:", err);
    })
}
