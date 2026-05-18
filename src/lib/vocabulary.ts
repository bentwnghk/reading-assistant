import { getPool } from "./db";

function rowToVocabularyWord(row: Record<string, unknown>): VocabularyWord {
  return {
    id: row.id as string,
    word: row.word as string,
    syllabification: (row.syllabification as string) || "",
    partOfSpeech: (row.part_of_speech as string) || "",
    englishDefinition: (row.english_definition as string) || "",
    chineseDefinition: (row.chinese_definition as string) || "",
    example: (row.example as string) || "",
    rating: (row.rating as GlossaryRating) || null,
    masteryLevel: (row.mastery_level as number) as VocabularyMasteryLevel,
    reviewCount: (row.review_count as number) || 0,
    correctCount: (row.correct_count as number) || 0,
    lastReviewedAt: Number(row.last_reviewed_at) || 0,
    nextReviewAt: Number(row.next_review_at) || 0,
    sourceSessionIds: Array.isArray(row.source_session_ids)
      ? (row.source_session_ids as string[])
      : [],
    createdAt: Number(row.created_at) || 0,
    updatedAt: Number(row.updated_at) || 0,
  };
}

export async function getUserVocabulary(
  userId: string
): Promise<VocabularyWord[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT * FROM user_vocabulary WHERE user_id = $1 ORDER BY word ASC`,
    [userId]
  );
  return rows.map(rowToVocabularyWord);
}

export async function getVocabularyDueForReview(
  userId: string,
  limit: number = 50
): Promise<VocabularyWord[]> {
  const pool = getPool();
  const now = Date.now();
  const { rows } = await pool.query(
    `SELECT * FROM user_vocabulary
     WHERE user_id = $1 AND next_review_at > 0 AND next_review_at <= $2
     ORDER BY next_review_at ASC, mastery_level ASC
     LIMIT $3`,
    [userId, now, limit]
  );
  return rows.map(rowToVocabularyWord);
}

export async function getVocabularyStats(
  userId: string
): Promise<VocabularyStats> {
  const pool = getPool();
  const now = Date.now();
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) AS total_words,
        COUNT(*) FILTER (WHERE next_review_at = 0 OR next_review_at <= $2) AS due_for_review,
       COUNT(*) FILTER (WHERE mastery_level = 5) AS mastered,
       COUNT(*) FILTER (WHERE mastery_level = 0 AND review_count = 0) AS new_words,
       COUNT(*) FILTER (WHERE rating = 'hard') AS hard,
       COUNT(*) FILTER (WHERE rating = 'medium') AS medium,
       COUNT(*) FILTER (WHERE rating = 'easy') AS easy,
       COUNT(*) FILTER (WHERE rating IS NULL) AS unrated
     FROM user_vocabulary WHERE user_id = $1`,
    [userId, now]
  );
  const r = rows[0];
  return {
    totalWords: Number(r.total_words),
    dueForReview: Number(r.due_for_review),
    mastered: Number(r.mastered),
    newWords: Number(r.new_words),
    hard: Number(r.hard),
    medium: Number(r.medium),
    easy: Number(r.easy),
    unrated: Number(r.unrated),
  };
}

export async function upsertVocabularyFromGlossary(
  userId: string,
  glossary: GlossaryEntry[],
  ratings: Record<string, GlossaryRating>,
  sessionId: string
): Promise<void> {
  const pool = getPool();
  const now = Date.now();

  for (const entry of glossary) {
    const word = entry.word.toLowerCase();
    const rating = ratings[entry.word] || null;

    await pool.query(
      `INSERT INTO user_vocabulary (
        user_id, word, syllabification, part_of_speech,
        english_definition, chinese_definition, example,
        rating, source_session_ids, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $10)
      ON CONFLICT (user_id, word) DO UPDATE SET
        syllabification = COALESCE(NULLIF(EXCLUDED.syllabification, ''), user_vocabulary.syllabification),
        part_of_speech = COALESCE(NULLIF(EXCLUDED.part_of_speech, ''), user_vocabulary.part_of_speech),
        english_definition = COALESCE(NULLIF(EXCLUDED.english_definition, ''), user_vocabulary.english_definition),
        chinese_definition = COALESCE(NULLIF(EXCLUDED.chinese_definition, ''), user_vocabulary.chinese_definition),
        example = COALESCE(NULLIF(EXCLUDED.example, ''), user_vocabulary.example),
        rating = CASE
          WHEN user_vocabulary.rating IS NULL THEN EXCLUDED.rating
          WHEN EXCLUDED.rating IS NULL THEN user_vocabulary.rating
          WHEN EXCLUDED.rating = 'hard' THEN 'hard'
          WHEN EXCLUDED.rating = 'medium' AND user_vocabulary.rating != 'hard' THEN 'medium'
          WHEN user_vocabulary.rating IS NULL THEN EXCLUDED.rating
          ELSE user_vocabulary.rating
        END,
        source_session_ids = (
          SELECT jsonb_agg(DISTINCT elem) FROM jsonb_array_elements(
            user_vocabulary.source_session_ids || EXCLUDED.source_session_ids
          ) elem
        ),
        updated_at = $10`,
      [
        userId,
        word,
        entry.syllabification || "",
        entry.partOfSpeech || "",
        entry.englishDefinition || "",
        entry.chineseDefinition || "",
        entry.example || "",
        rating,
        JSON.stringify([sessionId]),
        now,
      ]
    );
  }
}

export async function updateVocabularyRating(
  userId: string,
  word: string,
  rating: GlossaryRating
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE user_vocabulary SET rating = $3, updated_at = $4
     WHERE user_id = $1 AND word = $2`,
    [userId, word.toLowerCase(), rating, Date.now()]
  );
}

export async function updateVocabularyReview(
  userId: string,
  word: string,
  correct: boolean,
  masteryLevel: VocabularyMasteryLevel,
  nextReviewAt: number
): Promise<void> {
  const pool = getPool();
  const now = Date.now();
  await pool.query(
    `UPDATE user_vocabulary SET
      review_count = review_count + 1,
      correct_count = correct_count + CASE WHEN $3 THEN 1 ELSE 0 END,
      last_reviewed_at = $6,
      mastery_level = $4,
      next_review_at = $5,
      updated_at = $6
     WHERE user_id = $1 AND word = $2`,
    [userId, word.toLowerCase(), correct, masteryLevel, nextReviewAt, now]
  );
}

export async function deleteVocabularyBySession(
  userId: string,
  sessionId: string
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `DELETE FROM user_vocabulary
     WHERE user_id = $1
       AND source_session_ids @> $2::jsonb
       AND jsonb_array_length(source_session_ids) = 1`,
    [userId, JSON.stringify([sessionId])]
  );

  await pool.query(
    `UPDATE user_vocabulary
     SET source_session_ids = (
       SELECT jsonb_agg(elem) FROM jsonb_array_elements(source_session_ids) elem WHERE elem != $2::jsonb
     ),
     updated_at = $3
     WHERE user_id = $1
       AND source_session_ids @> $4::jsonb`,
    [
      userId,
      JSON.stringify(sessionId),
      Date.now(),
      JSON.stringify([sessionId]),
    ]
  );
}

export async function createReviewSession(
  userId: string,
  mode: VocabularyReviewMode,
  results: VocabularyReviewResult[]
): Promise<string> {
  const pool = getPool();
  const now = Date.now();
  const sessionId = crypto.randomUUID();

  const totalWords = results.length;
  const correctCount = results.filter((r) => r.correct).length;
  const accuracy = totalWords > 0 ? Math.round((correctCount / totalWords) * 100) : 0;

  await pool.query(
    `INSERT INTO vocabulary_review_sessions (id, user_id, mode, total_words, correct_count, accuracy, started_at, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [sessionId, userId, mode, totalWords, correctCount, accuracy, now - 60000, now]
  );

  if (results.length > 0) {
    const values = results
      .map(
        (_, i) =>
          `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`
      )
      .join(", ");
    const params = results.flatMap((r) => [
      crypto.randomUUID(),
      sessionId,
      r.word,
      r.correct,
      r.masteryAfter,
    ]);
    await pool.query(
      `INSERT INTO vocabulary_review_results (id, session_id, word, correct, mastery_after)
       VALUES ${values}`,
      params
    );
  }

  return sessionId;
}

export async function getReviewSessions(
  userId: string,
  limit: number = 20
): Promise<VocabularyReviewSession[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, mode, total_words, correct_count, accuracy, started_at, completed_at
     FROM vocabulary_review_sessions
     WHERE user_id = $1
     ORDER BY completed_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows.map((r) => ({
    id: r.id,
    mode: r.mode,
    totalWords: Number(r.total_words),
    correctCount: Number(r.correct_count),
    accuracy: Number(r.accuracy),
    startedAt: Number(r.started_at),
    completedAt: Number(r.completed_at),
  }));
}

export async function getReviewSessionDetail(
  userId: string,
  sessionId: string
): Promise<VocabularyReviewSession | null> {
  const pool = getPool();

  const { rows: sessionRows } = await pool.query(
    `SELECT id, mode, total_words, correct_count, accuracy, started_at, completed_at
     FROM vocabulary_review_sessions
     WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );

  if (sessionRows.length === 0) return null;

  const s = sessionRows[0];

  const { rows: resultRows } = await pool.query(
    `SELECT word, correct, mastery_after
     FROM vocabulary_review_results
     WHERE session_id = $1
     ORDER BY word`,
    [sessionId]
  );

  return {
    id: s.id,
    mode: s.mode,
    totalWords: Number(s.total_words),
    correctCount: Number(s.correct_count),
    accuracy: Number(s.accuracy),
    startedAt: Number(s.started_at),
    completedAt: Number(s.completed_at),
    results: resultRows.map((r) => ({
      word: r.word,
      correct: r.correct,
      masteryBefore: 0,
      masteryAfter: Number(r.mastery_after),
    })),
  };
}
