import { getClient, base64ToBuffer, bufferToBase64 } from "./db"
import { logActivity } from "./activity"
import type { ReadingStore } from "@/store/reading"

export interface SessionWithImages extends ReadingStore {
  userId: string
}

export async function createReadingSession(
  userId: string,
  sessionData: ReadingStore
): Promise<string> {
  const client = await getClient()
  
  try {
    await client.query("BEGIN")
    
    await client.query(
      `INSERT INTO reading_sessions (
        id, user_id, doc_title, student_age, extracted_text, summary,
        adapted_text, simplified_text, highlighted_words, analyzed_sentences,
        mind_map, reading_test, glossary, glossary_ratings, test_score,
        test_completed, test_earned_points, test_total_points, test_show_chinese,
        test_mode, vocabulary_quiz_score, spelling_game_best_score, chat_history,
        original_difficulty, adapted_difficulty, simplified_difficulty,
        include_glossary, include_sentence_analysis,
        grammar_topics, grammar_quiz, grammar_quiz_score, grammar_quiz_completed,
        grammar_quiz_earned_points, grammar_quiz_total_points,
        grammar_generated_at, grammar_quiz_completed_at,
        grammar_highlight_enabled, grammar_highlight_topic_id,
        grammar_scramble_high_score, grammar_workshop_high_score,
        grammar_surgery_high_score, grammar_roulette_high_score,
        grammar_duel_high_score, grammar_game_accuracy,
        grammar_game_completed_at,
        grammar_error_challenges,
        grammar_scramble_challenges, grammar_workshop_challenges,
        grammar_game_questions,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50)`,
      [
        sessionData.id,
        userId,
        sessionData.docTitle,
        sessionData.studentAge,
        sessionData.extractedText,
        sessionData.summary,
        sessionData.adaptedText,
        sessionData.simplifiedText,
        JSON.stringify(sessionData.highlightedWords),
        JSON.stringify(sessionData.analyzedSentences),
        sessionData.mindMap,
        JSON.stringify(sessionData.readingTest),
        JSON.stringify(sessionData.glossary),
        JSON.stringify(sessionData.glossaryRatings),
        sessionData.testScore,
        sessionData.testCompleted,
        sessionData.testEarnedPoints,
        sessionData.testTotalPoints,
        sessionData.testShowChinese,
        sessionData.testMode,
        sessionData.vocabularyQuizScore,
        sessionData.spellingGameBestScore,
        JSON.stringify(sessionData.chatHistory),
        sessionData.originalDifficulty ? JSON.stringify(sessionData.originalDifficulty) : null,
        sessionData.adaptedDifficulty ? JSON.stringify(sessionData.adaptedDifficulty) : null,
        sessionData.simplifiedDifficulty ? JSON.stringify(sessionData.simplifiedDifficulty) : null,
        sessionData.includeGlossary ?? true,
        sessionData.includeSentenceAnalysis ?? true,
        JSON.stringify(sessionData.grammarTopics ?? []),
        JSON.stringify(sessionData.grammarQuiz ?? []),
        sessionData.grammarQuizScore ?? 0,
        sessionData.grammarQuizCompleted ?? false,
        sessionData.grammarQuizEarnedPoints ?? 0,
        sessionData.grammarQuizTotalPoints ?? 0,
        sessionData.grammarGeneratedAt ?? 0,
        sessionData.grammarQuizCompletedAt ?? 0,
        sessionData.grammarHighlightEnabled ?? false,
        sessionData.grammarHighlightTopicId ?? null,
        sessionData.grammarScrambleHighScore ?? 0,
        sessionData.grammarWorkshopHighScore ?? 0,
        sessionData.grammarSurgeryHighScore ?? 0,
        sessionData.grammarRouletteHighScore ?? 0,
        sessionData.grammarDuelHighScore ?? 0,
        sessionData.grammarGameAccuracy ?? 0,
        sessionData.grammarGameCompletedAt ? new Date(sessionData.grammarGameCompletedAt) : null,
        JSON.stringify(sessionData.grammarErrorChallenges ?? []),
        JSON.stringify(sessionData.grammarScrambleChallenges ?? []),
        JSON.stringify(sessionData.grammarWorkshopChallenges ?? []),
        JSON.stringify(sessionData.grammarGameQuestions ?? []),
        new Date(sessionData.createdAt || Date.now()),
      ]
    )
    
    for (let i = 0; i < sessionData.originalImages.length; i++) {
      const imageData = base64ToBuffer(sessionData.originalImages[i])
      await client.query(
        `INSERT INTO reading_images (session_id, user_id, image_data, image_order, file_size)
         VALUES ($1, $2, $3, $4, $5)`,
        [sessionData.id, userId, imageData, i, imageData.length]
      )
    }
    
    await client.query("COMMIT")

    // Log session creation for leaderboard (non-blocking)
    logActivity(userId, "session_create", {
      sessionId: sessionData.id,
      details: { wordCount: sessionData.glossary?.length ?? 0 },
    }).catch(() => {})

    return sessionData.id
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

export async function getUserSessions(userId: string): Promise<SessionWithImages[]> {
  const client = await getClient()
  
  try {
    const result = await client.query(
      `SELECT 
        rs.*,
        COALESCE(
          json_agg(
            json_build_object(
              'image_data', ri.image_data,
              'image_order', ri.image_order,
              'content_type', ri.content_type
            )
            ORDER BY ri.image_order
          ) FILTER (WHERE ri.id IS NOT NULL),
          '[]'::json
        ) as images
       FROM reading_sessions rs
       LEFT JOIN reading_images ri ON rs.id = ri.session_id
       WHERE rs.user_id = $1
       GROUP BY rs.id
       ORDER BY rs.updated_at DESC`,
      [userId]
    )
    
    return result.rows.map(row => ({
      id: row.id,
      docTitle: row.doc_title,
      studentAge: row.student_age,
      source: row.source || ("repository" as const),
      originalImages: row.images.map((img: any) => 
        bufferToBase64(img.image_data, img.content_type)
      ),
      extractedText: row.extracted_text,
      summary: row.summary,
      adaptedText: row.adapted_text,
      simplifiedText: row.simplified_text,
      highlightedWords: row.highlighted_words,
      analyzedSentences: row.analyzed_sentences,
      mindMap: row.mind_map,
      readingTest: row.reading_test,
      glossary: row.glossary,
      glossaryRatings: row.glossary_ratings,
      testScore: row.test_score,
      testCompleted: row.test_completed,
      testEarnedPoints: row.test_earned_points,
      testTotalPoints: row.test_total_points,
      testShowChinese: row.test_show_chinese,
      testMode: row.test_mode,
      vocabularyQuizScore: row.vocabulary_quiz_score,
      spellingGameBestScore: row.spelling_game_best_score,
      flashcardReviewDates: row.flashcard_review_dates ?? [],
      summaryGeneratedAt: Number(row.summary_generated_at ?? 0),
      mindMapGeneratedAt: Number(row.mind_map_generated_at ?? 0),
      adaptedTextGeneratedAt: Number(row.adapted_text_generated_at ?? 0),
      simplifiedTextGeneratedAt: Number(row.simplified_text_generated_at ?? 0),
      glossaryGeneratedAt: Number(row.glossary_generated_at ?? 0),
      spellingGameCompletedAt: Number(row.spelling_game_completed_at ?? 0),
      vocabQuizCompletedAt: Number(row.vocab_quiz_completed_at ?? 0),
      readingTestCompletedAt: Number(row.reading_test_completed_at ?? 0),
      chatHistory: row.chat_history,
      status: "idle" as const,
      error: null,
      originalDifficulty: row.original_difficulty,
      adaptedDifficulty: row.adapted_difficulty,
      simplifiedDifficulty: row.simplified_difficulty,
      includeGlossary: row.include_glossary ?? true,
      includeSentenceAnalysis: row.include_sentence_analysis ?? true,
      grammarTopics: row.grammar_topics ?? [],
      grammarQuiz: row.grammar_quiz ?? [],
      grammarQuizScore: row.grammar_quiz_score ?? 0,
      grammarQuizCompleted: row.grammar_quiz_completed ?? false,
      grammarQuizEarnedPoints: row.grammar_quiz_earned_points ?? 0,
      grammarQuizTotalPoints: row.grammar_quiz_total_points ?? 0,
      grammarGeneratedAt: Number(row.grammar_generated_at ?? 0),
      grammarQuizCompletedAt: Number(row.grammar_quiz_completed_at ?? 0),
      grammarHighlightEnabled: row.grammar_highlight_enabled ?? false,
      grammarHighlightTopicId: row.grammar_highlight_topic_id ?? null,
      grammarScrambleHighScore: row.grammar_scramble_high_score ?? 0,
      grammarWorkshopHighScore: row.grammar_workshop_high_score ?? 0,
      grammarSurgeryHighScore: row.grammar_surgery_high_score ?? 0,
      grammarRouletteHighScore: row.grammar_roulette_high_score ?? 0,
      grammarDuelHighScore: row.grammar_duel_high_score ?? 0,
      grammarGameAccuracy: row.grammar_game_accuracy ?? 0,
      grammarGameCompletedAt: Number(row.grammar_game_completed_at ?? 0),
      grammarErrorChallenges: row.grammar_error_challenges ?? [],
      grammarScrambleChallenges: row.grammar_scramble_challenges ?? [],
      grammarWorkshopChallenges: row.grammar_workshop_challenges ?? [],
      grammarGameQuestions: row.grammar_game_questions ?? [],
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
      userId: row.user_id,
    }))
  } finally {
    client.release()
  }
}

export async function getReadingSession(
  userId: string,
  sessionId: string
): Promise<SessionWithImages | null> {
  const client = await getClient()
  
  try {
    const result = await client.query(
      `SELECT 
        rs.*,
        COALESCE(
          json_agg(
            json_build_object(
              'image_data', ri.image_data,
              'image_order', ri.image_order,
              'content_type', ri.content_type
            )
            ORDER BY ri.image_order
          ) FILTER (WHERE ri.id IS NOT NULL),
          '[]'::json
        ) as images
       FROM reading_sessions rs
       LEFT JOIN reading_images ri ON rs.id = ri.session_id
       WHERE rs.id = $1 AND rs.user_id = $2
       GROUP BY rs.id`,
      [sessionId, userId]
    )
    
    if (result.rows.length === 0) return null
    
    const row = result.rows[0]
    return {
      id: row.id,
      docTitle: row.doc_title,
      studentAge: row.student_age,
      source: row.source || ("repository" as const),
      originalImages: row.images.map((img: any) => 
        bufferToBase64(img.image_data, img.content_type)
      ),
      extractedText: row.extracted_text,
      summary: row.summary,
      adaptedText: row.adapted_text,
      simplifiedText: row.simplified_text,
      highlightedWords: row.highlighted_words,
      analyzedSentences: row.analyzed_sentences,
      mindMap: row.mind_map,
      readingTest: row.reading_test,
      glossary: row.glossary,
      glossaryRatings: row.glossary_ratings,
      testScore: row.test_score,
      testCompleted: row.test_completed,
      testEarnedPoints: row.test_earned_points,
      testTotalPoints: row.test_total_points,
      testShowChinese: row.test_show_chinese,
      testMode: row.test_mode,
      vocabularyQuizScore: row.vocabulary_quiz_score,
      spellingGameBestScore: row.spelling_game_best_score,
      flashcardReviewDates: row.flashcard_review_dates ?? [],
      summaryGeneratedAt: Number(row.summary_generated_at ?? 0),
      mindMapGeneratedAt: Number(row.mind_map_generated_at ?? 0),
      adaptedTextGeneratedAt: Number(row.adapted_text_generated_at ?? 0),
      simplifiedTextGeneratedAt: Number(row.simplified_text_generated_at ?? 0),
      glossaryGeneratedAt: Number(row.glossary_generated_at ?? 0),
      spellingGameCompletedAt: Number(row.spelling_game_completed_at ?? 0),
      vocabQuizCompletedAt: Number(row.vocab_quiz_completed_at ?? 0),
      readingTestCompletedAt: Number(row.reading_test_completed_at ?? 0),
      chatHistory: row.chat_history,
      status: "idle" as const,
      error: null,
      originalDifficulty: row.original_difficulty,
      adaptedDifficulty: row.adapted_difficulty,
      simplifiedDifficulty: row.simplified_difficulty,
      includeGlossary: row.include_glossary ?? true,
      includeSentenceAnalysis: row.include_sentence_analysis ?? true,
      grammarTopics: row.grammar_topics ?? [],
      grammarQuiz: row.grammar_quiz ?? [],
      grammarQuizScore: row.grammar_quiz_score ?? 0,
      grammarQuizCompleted: row.grammar_quiz_completed ?? false,
      grammarQuizEarnedPoints: row.grammar_quiz_earned_points ?? 0,
      grammarQuizTotalPoints: row.grammar_quiz_total_points ?? 0,
      grammarGeneratedAt: Number(row.grammar_generated_at ?? 0),
      grammarQuizCompletedAt: Number(row.grammar_quiz_completed_at ?? 0),
      grammarHighlightEnabled: row.grammar_highlight_enabled ?? false,
      grammarHighlightTopicId: row.grammar_highlight_topic_id ?? null,
      grammarScrambleHighScore: row.grammar_scramble_high_score ?? 0,
      grammarWorkshopHighScore: row.grammar_workshop_high_score ?? 0,
      grammarSurgeryHighScore: row.grammar_surgery_high_score ?? 0,
      grammarRouletteHighScore: row.grammar_roulette_high_score ?? 0,
      grammarDuelHighScore: row.grammar_duel_high_score ?? 0,
      grammarGameAccuracy: row.grammar_game_accuracy ?? 0,
      grammarGameCompletedAt: Number(row.grammar_game_completed_at ?? 0),
      grammarErrorChallenges: row.grammar_error_challenges ?? [],
      grammarScrambleChallenges: row.grammar_scramble_challenges ?? [],
      grammarWorkshopChallenges: row.grammar_workshop_challenges ?? [],
      grammarGameQuestions: row.grammar_game_questions ?? [],
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
      userId: row.user_id,
    }
  } finally {
    client.release()
  }
}

export async function updateReadingSession(
  userId: string,
  sessionId: string,
  sessionData: Partial<ReadingStore>
): Promise<boolean> {
  const client = await getClient()
  
  try {
    await client.query("BEGIN")
    
    const updateFields: string[] = []
    const values: any[] = []
    let paramIndex = 1
    
    const fieldMappings: Record<string, string> = {
      docTitle: "doc_title",
      studentAge: "student_age",
      source: "source",
      extractedText: "extracted_text",
      summary: "summary",
      adaptedText: "adapted_text",
      simplifiedText: "simplified_text",
      highlightedWords: "highlighted_words",
      analyzedSentences: "analyzed_sentences",
      mindMap: "mind_map",
      readingTest: "reading_test",
      glossary: "glossary",
      glossaryRatings: "glossary_ratings",
      testScore: "test_score",
      testCompleted: "test_completed",
      testEarnedPoints: "test_earned_points",
      testTotalPoints: "test_total_points",
      testShowChinese: "test_show_chinese",
      testMode: "test_mode",
      vocabularyQuizScore: "vocabulary_quiz_score",
      spellingGameBestScore: "spelling_game_best_score",
      flashcardReviewDates: "flashcard_review_dates",
      summaryGeneratedAt: "summary_generated_at",
      mindMapGeneratedAt: "mind_map_generated_at",
      adaptedTextGeneratedAt: "adapted_text_generated_at",
      simplifiedTextGeneratedAt: "simplified_text_generated_at",
      glossaryGeneratedAt: "glossary_generated_at",
      spellingGameCompletedAt: "spelling_game_completed_at",
      vocabQuizCompletedAt: "vocab_quiz_completed_at",
      readingTestCompletedAt: "reading_test_completed_at",
      chatHistory: "chat_history",
      originalDifficulty: "original_difficulty",
      adaptedDifficulty: "adapted_difficulty",
      simplifiedDifficulty: "simplified_difficulty",
      includeGlossary: "include_glossary",
      includeSentenceAnalysis: "include_sentence_analysis",
      grammarTopics: "grammar_topics",
      grammarQuiz: "grammar_quiz",
      grammarQuizScore: "grammar_quiz_score",
      grammarQuizCompleted: "grammar_quiz_completed",
      grammarQuizEarnedPoints: "grammar_quiz_earned_points",
      grammarQuizTotalPoints: "grammar_quiz_total_points",
      grammarGeneratedAt: "grammar_generated_at",
      grammarQuizCompletedAt: "grammar_quiz_completed_at",
      grammarHighlightEnabled: "grammar_highlight_enabled",
      grammarHighlightTopicId: "grammar_highlight_topic_id",
      grammarScrambleHighScore: "grammar_scramble_high_score",
      grammarWorkshopHighScore: "grammar_workshop_high_score",
      grammarSurgeryHighScore: "grammar_surgery_high_score",
      grammarRouletteHighScore: "grammar_roulette_high_score",
      grammarDuelHighScore: "grammar_duel_high_score",
      grammarGameAccuracy: "grammar_game_accuracy",
      grammarGameCompletedAt: "grammar_game_completed_at",
      grammarErrorChallenges: "grammar_error_challenges",
      grammarScrambleChallenges: "grammar_scramble_challenges",
      grammarWorkshopChallenges: "grammar_workshop_challenges",
      grammarGameQuestions: "grammar_game_questions",
    }
    
    for (const [key, dbColumn] of Object.entries(fieldMappings)) {
      if (key in sessionData) {
        const value = (sessionData as any)[key]
        updateFields.push(`${dbColumn} = $${paramIndex}`)
        
        if (["highlightedWords", "analyzedSentences", "readingTest", "glossary",
             "glossaryRatings", "chatHistory", "originalDifficulty",
             "adaptedDifficulty", "simplifiedDifficulty", "flashcardReviewDates",
             "grammarTopics", "grammarQuiz", "grammarErrorChallenges",
             "grammarScrambleChallenges", "grammarWorkshopChallenges",
             "grammarGameQuestions"].includes(key)) {
          values.push(value ? JSON.stringify(value) : null)
        } else {
          values.push(value)
        }
        paramIndex++
      }
    }
    
    if (updateFields.length > 0) {
      updateFields.push(`updated_at = NOW()`)
      values.push(sessionId, userId)
      await client.query(
        `UPDATE reading_sessions 
         SET ${updateFields.join(", ")}
         WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
        values
      )
    }
    
    if (sessionData.originalImages !== undefined) {
      await client.query(
        "DELETE FROM reading_images WHERE session_id = $1 AND user_id = $2",
        [sessionId, userId]
      )
      
      for (let i = 0; i < sessionData.originalImages.length; i++) {
        const imageData = base64ToBuffer(sessionData.originalImages[i])
        await client.query(
          `INSERT INTO reading_images (session_id, user_id, image_data, image_order, file_size)
           VALUES ($1, $2, $3, $4, $5)`,
          [sessionId, userId, imageData, i, imageData.length]
        )
      }
    }
    
    await client.query("COMMIT")
    return true
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

export async function deleteReadingSession(
  userId: string,
  sessionId: string
): Promise<boolean> {
  const client = await getClient()
  
  try {
    const result = await client.query(
      "DELETE FROM reading_sessions WHERE id = $1 AND user_id = $2",
      [sessionId, userId]
    )
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}
