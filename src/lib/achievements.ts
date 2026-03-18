import { getClient } from "./db"

export type AchievementType =
  | "sessions_read"
  | "vocabulary_collected"
  | "flashcard_reviews"
  | "mindmaps_generated"
  | "adapted_texts"
  | "simplified_texts"
  | "sentences_analyzed"
  | "tests_completed"
  | "targeted_practices"
  | "spelling_challenges"
  | "vocabulary_quizzes"
  | "ai_tutor_questions"

export interface AchievementMilestone {
  target: number
  unlocked: boolean
  unlockedAt?: number
}

export interface Achievement {
  type: AchievementType
  currentProgress: number
  milestones: AchievementMilestone[]
  icon: string
  color: string
}

export interface AchievementsResponse {
  achievements: Achievement[]
  totalUnlocked: number
  totalMilestones: number
}

export interface NewlyUnlockedAchievement {
  type: AchievementType
  milestone: number
  icon: string
  color: string
}

const ACHIEVEMENT_CONFIG: Record<AchievementType, {
  icon: string
  color: string
  activityTypes: string[]
  initialMilestone: number
  countField?: string
}> = {
  sessions_read: {
    icon: "BookOpen",
    color: "blue",
    activityTypes: ["session_create"],
    initialMilestone: 5,
  },
  vocabulary_collected: {
    icon: "BookText",
    color: "green",
    activityTypes: ["glossary_add"],
    initialMilestone: 50,
    countField: "wordCount",
  },
  flashcard_reviews: {
    icon: "Layers",
    color: "indigo",
    activityTypes: ["flashcard_review"],
    initialMilestone: 50,
    countField: "cardsReviewed",
  },
  mindmaps_generated: {
    icon: "Network",
    color: "purple",
    activityTypes: ["mindmap_generate"],
    initialMilestone: 5,
  },
  adapted_texts: {
    icon: "FileEdit",
    color: "orange",
    activityTypes: ["adapted_text_generate"],
    initialMilestone: 5,
  },
  simplified_texts: {
    icon: "FileMinus",
    color: "teal",
    activityTypes: ["simplified_text_generate"],
    initialMilestone: 5,
  },
  sentences_analyzed: {
    icon: "Search",
    color: "pink",
    activityTypes: ["sentence_analyze"],
    initialMilestone: 5,
  },
  tests_completed: {
    icon: "FileCheck",
    color: "blue",
    activityTypes: ["test_complete"],
    initialMilestone: 5,
  },
  targeted_practices: {
    icon: "Target",
    color: "red",
    activityTypes: ["targeted_practice_complete"],
    initialMilestone: 5,
  },
  spelling_challenges: {
    icon: "PenTool",
    color: "pink",
    activityTypes: ["spelling_complete"],
    initialMilestone: 5,
  },
  vocabulary_quizzes: {
    icon: "Brain",
    color: "purple",
    activityTypes: ["quiz_complete"],
    initialMilestone: 5,
  },
  ai_tutor_questions: {
    icon: "Sparkles",
    color: "cyan",
    activityTypes: ["ai_tutor_question"],
    initialMilestone: 5,
  },
}

function generateMilestones(
  currentProgress: number,
  initialMilestone: number,
  unlockedMilestones: number[]
): AchievementMilestone[] {
  const milestones: AchievementMilestone[] = []
  let target = initialMilestone
  const bufferMilestones = 3

  const highestUnlocked = unlockedMilestones.length > 0
    ? Math.max(...unlockedMilestones)
    : 0

  let count = 0
  while (count < bufferMilestones) {
    const isUnlocked = currentProgress >= target || unlockedMilestones.includes(target)
    const unlockedAt = isUnlocked ? Date.now() : undefined

    milestones.push({
      target,
      unlocked: isUnlocked,
      unlockedAt,
    })

    if (target > Math.max(currentProgress, highestUnlocked)) {
      count++
    }

    target *= 2
  }

  return milestones
}

export async function getAchievementProgress(userId: string): Promise<AchievementsResponse> {
  const client = await getClient()

  try {
    let unlockedResult: { rows: { achievement_type: string; milestone: number }[] } = { rows: [] }
    try {
      unlockedResult = await client.query(
        `SELECT achievement_type, milestone, unlocked_at
         FROM user_achievements
         WHERE user_id = $1`,
        [userId]
      )
    } catch (error: unknown) {
      const pgCode = (error as { code?: string })?.code
      if (pgCode === "42P01") {
        console.warn("[achievements] user_achievements table not found — run add-achievements.sql migration")
        // Fall through with empty rows — will return 0 unlocked milestones
      } else {
        throw error
      }
    }

    const unlockedMap = new Map<AchievementType, number[]>()
    for (const row of unlockedResult.rows) {
      const type = row.achievement_type as AchievementType
      if (!unlockedMap.has(type)) {
        unlockedMap.set(type, [])
      }
      unlockedMap.get(type)!.push(row.milestone)
    }

    const progressResult = await client.query(
      `SELECT activity_type, COUNT(*) as count,
              COALESCE(SUM((details->>'wordCount')::int), 0) as word_count,
              COALESCE(SUM((details->>'cardsReviewed')::int), 0) as cards_reviewed
       FROM activity_logs
       WHERE user_id = $1
       GROUP BY activity_type`,
      [userId]
    )

    const progressMap = new Map<string, number>()
    for (const row of progressResult.rows) {
      const activityType = row.activity_type
      const config = Object.values(ACHIEVEMENT_CONFIG).find(c =>
        c.activityTypes.includes(activityType)
      )

      if (config) {
        if (config.countField === "wordCount") {
          progressMap.set(activityType, parseInt(row.word_count) || 0)
        } else if (config.countField === "cardsReviewed") {
          progressMap.set(activityType, parseInt(row.cards_reviewed) || 0)
        } else {
          progressMap.set(activityType, parseInt(row.count) || 0)
        }
      }
    }

    const achievements: Achievement[] = []
    let totalUnlocked = 0
    let totalMilestones = 0

    for (const [type, config] of Object.entries(ACHIEVEMENT_CONFIG) as [AchievementType, typeof ACHIEVEMENT_CONFIG[AchievementType]][]) {
      let currentProgress = 0
      for (const activityType of config.activityTypes) {
        currentProgress += progressMap.get(activityType) || 0
      }

      const unlockedMilestones = unlockedMap.get(type) || []
      const milestones = generateMilestones(currentProgress, config.initialMilestone, unlockedMilestones)

      totalUnlocked += milestones.filter(m => m.unlocked).length
      totalMilestones += milestones.length

      achievements.push({
        type,
        currentProgress,
        milestones,
        icon: config.icon,
        color: config.color,
      })
    }

    return { achievements, totalUnlocked, totalMilestones }
  } finally {
    client.release()
  }
}

export async function checkAndUnlockAchievements(
  userId: string,
  activityType: string
): Promise<NewlyUnlockedAchievement[]> {
  const config = Object.entries(ACHIEVEMENT_CONFIG).find(([, cfg]) =>
    cfg.activityTypes.includes(activityType)
  )

  // No achievement tracks this activity type — skip entirely, no DB call needed
  if (!config) return []

  const client = await getClient()

  try {
    const [achievementType, achievementConfig] = config as [AchievementType, typeof ACHIEVEMENT_CONFIG[AchievementType]]

    let currentProgress: number
    if (achievementConfig.countField) {
      // Use a quoted identifier-safe approach — countField is internal/trusted
      const fieldName = achievementConfig.countField
      const progressResult = await client.query(
        `SELECT COALESCE(SUM((details->>$3)::int), 0) as total
         FROM activity_logs
         WHERE user_id = $1 AND activity_type = ANY($2::text[])`,
        [userId, achievementConfig.activityTypes, fieldName]
      )
      currentProgress = parseInt(progressResult.rows[0]?.total) || 0
    } else {
      const progressResult = await client.query(
        `SELECT COUNT(*) as count
         FROM activity_logs
         WHERE user_id = $1 AND activity_type = ANY($2::text[])`,
        [userId, achievementConfig.activityTypes]
      )
      currentProgress = parseInt(progressResult.rows[0]?.count) || 0
    }

    const unlockedResult = await client.query(
      `SELECT milestone FROM user_achievements
       WHERE user_id = $1 AND achievement_type = $2`,
      [userId, achievementType]
    )

    const unlockedMilestones = unlockedResult.rows.map((r: { milestone: number }) => r.milestone)
    const newlyUnlocked: NewlyUnlockedAchievement[] = []

    let target = achievementConfig.initialMilestone
    while (target <= currentProgress) {
      if (!unlockedMilestones.includes(target)) {
        await client.query(
          `INSERT INTO user_achievements (user_id, achievement_type, milestone, unlocked_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (user_id, achievement_type, milestone) DO NOTHING`,
          [userId, achievementType, target]
        )

        newlyUnlocked.push({
          type: achievementType,
          milestone: target,
          icon: achievementConfig.icon,
          color: achievementConfig.color,
        })
      }
      target *= 2
    }

    return newlyUnlocked
  } catch (error: unknown) {
    // Gracefully handle the case where the migration hasn't been applied yet
    // (e.g. "relation user_achievements does not exist" — PostgreSQL code 42P01)
    const pgCode = (error as { code?: string })?.code
    if (pgCode === "42P01") {
      console.warn("[achievements] user_achievements table not found — run add-achievements.sql migration")
      return []
    }
    throw error
  } finally {
    client.release()
  }
}

export async function getVocabularyCount(userId: string): Promise<number> {
  const client = await getClient()

  try {
    const result = await client.query(
      `SELECT COALESCE(SUM(jsonb_array_length(glossary)), 0) as total_words
       FROM reading_sessions
       WHERE user_id = $1`,
      [userId]
    )

    return parseInt(result.rows[0]?.total_words) || 0
  } finally {
    client.release()
  }
}

export { ACHIEVEMENT_CONFIG }
