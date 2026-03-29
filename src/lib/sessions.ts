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
        include_glossary, include_sentence_analysis, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)`,
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
        JSON.stringify(sessionData.pronunciationAttempts ?? []),
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
      chatHistory: row.chat_history,
      status: "idle" as const,
      error: null,
      originalDifficulty: row.original_difficulty,
      adaptedDifficulty: row.adapted_difficulty,
      simplifiedDifficulty: row.simplified_difficulty,
      includeGlossary: row.include_glossary ?? true,
      includeSentenceAnalysis: row.include_sentence_analysis ?? true,
      pronunciationAttempts: row.pronunciation_attempts ?? [],
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
      chatHistory: row.chat_history,
      status: "idle" as const,
      error: null,
      originalDifficulty: row.original_difficulty,
      adaptedDifficulty: row.adapted_difficulty,
      simplifiedDifficulty: row.simplified_difficulty,
      includeGlossary: row.include_glossary ?? true,
      includeSentenceAnalysis: row.include_sentence_analysis ?? true,
      pronunciationAttempts: row.pronunciation_attempts ?? [],
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
      chatHistory: "chat_history",
      originalDifficulty: "original_difficulty",
      adaptedDifficulty: "adapted_difficulty",
      simplifiedDifficulty: "simplified_difficulty",
      includeGlossary: "include_glossary",
      includeSentenceAnalysis: "include_sentence_analysis",
      pronunciationAttempts: "pronunciation_attempts",
    }
    
    for (const [key, dbColumn] of Object.entries(fieldMappings)) {
      if (key in sessionData) {
        const value = (sessionData as any)[key]
        updateFields.push(`${dbColumn} = $${paramIndex}`)
        
        if (["highlightedWords", "analyzedSentences", "readingTest", "glossary", 
             "glossaryRatings", "chatHistory", "originalDifficulty", 
             "adaptedDifficulty", "simplifiedDifficulty", "pronunciationAttempts"].includes(key)) {
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
