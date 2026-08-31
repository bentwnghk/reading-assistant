import { getPool } from "./db";
import type { PoolClient } from "pg";

function rowToVocabularyWord(row: Record<string, unknown>): VocabularyWord {
  const rawCounts = row.srs_counts as { hard?: number; medium?: number } | null;
  return {
    id: row.id as string,
    word: row.word as string,
    syllabification: (row.syllabification as string) || "",
    partOfSpeech: (row.part_of_speech as string) || "",
    englishDefinition: (row.english_definition as string) || "",
    chineseDefinition: (row.chinese_definition as string) || "",
    example: (row.example as string) || "",
    rating: (row.rating as GlossaryRating) || null,
    srsCounts: {
      hard: rawCounts?.hard ?? 0,
      medium: rawCounts?.medium ?? 0,
    },
    masteryLevel: (row.mastery_level as number) as VocabularyMasteryLevel,
    reviewCount: (row.review_count as number) || 0,
    correctCount: (row.correct_count as number) || 0,
    lastReviewedAt: Number(row.last_reviewed_at) || 0,
    nextReviewAt: Number(row.next_review_at) || 0,
    sourceSessionIds: Array.isArray(row.source_session_ids)
      ? (row.source_session_ids as string[])
      : [],
    source: row.shared_by ? "teacher" : "own",
    entryType: ((row.entry_type as string) || "word") as "word" | "phrase",
    sharedBy: (row.shared_by as string) || null,
    createdAt: Number(row.created_at) || 0,
    updatedAt: Number(row.updated_at) || 0,
  };
}

function deriveRatingFromCounts(counts: { hard: number; medium: number }): GlossaryRating | null {
  if (counts.hard === 0 && counts.medium === 0) return "easy";
  if (counts.hard >= counts.medium) return "hard";
  return "medium";
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
     WHERE user_id = $1 AND entry_type = 'word' AND next_review_at > 0 AND next_review_at <= $2
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
        COUNT(*) FILTER (WHERE shared_by IS NULL) AS own_words,
        COUNT(*) FILTER (WHERE shared_by IS NOT NULL) AS teacher_words,
        COUNT(*) FILTER (WHERE next_review_at = 0 OR next_review_at <= $2) AS due_for_review,
        COUNT(*) FILTER (WHERE mastery_level = 5) AS mastered,
        COUNT(*) FILTER (WHERE mastery_level = 0 AND review_count = 0) AS new_words,
        COUNT(*) FILTER (WHERE rating = 'hard') AS hard,
        COUNT(*) FILTER (WHERE rating = 'medium') AS medium,
        COUNT(*) FILTER (WHERE rating = 'easy') AS easy,
        COUNT(*) FILTER (WHERE rating IS NULL) AS unrated
      FROM user_vocabulary WHERE user_id = $1 AND entry_type = 'word'`,
    [userId, now]
  );
  const r = rows[0];
  return {
    totalWords: Number(r.total_words),
    ownWords: Number(r.own_words),
    teacherWords: Number(r.teacher_words),
    dueForReview: Number(r.due_for_review),
    mastered: Number(r.mastered),
    newWords: Number(r.new_words),
    hard: Number(r.hard),
    medium: Number(r.medium),
    easy: Number(r.easy),
    unrated: Number(r.unrated),
  };
}

function isMultiWordEntry(word: string): boolean {
  return word.trim().split(/\s+/).length > 1;
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
    const entryType = isMultiWordEntry(word) ? "phrase" : "word";

    await pool.query(
      `INSERT INTO user_vocabulary (
        user_id, word, syllabification, part_of_speech,
        english_definition, chinese_definition, example,
        rating, source_session_ids, entry_type, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $11)
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
        entry_type = CASE
          WHEN user_vocabulary.entry_type = 'phrase' OR EXCLUDED.entry_type = 'phrase' THEN 'phrase'
          ELSE user_vocabulary.entry_type
        END,
        source_session_ids = (
          SELECT jsonb_agg(DISTINCT elem) FROM jsonb_array_elements(
            user_vocabulary.source_session_ids || EXCLUDED.source_session_ids
          ) elem
        ),
        updated_at = $11`,
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
        entryType,
        now,
      ]
    );
  }
}

type WordData = {
  syllabification: string;
  partOfSpeech: string;
  englishDefinition: string;
  chineseDefinition: string;
  example: string;
  source: VocabularySource;
  sharedBy: string | null;
};

/**
 * Adds (or updates) a collocation chunk in the user's vocabulary as a PHRASE
 * (entry_type='phrase'). Phrases get their own review queue via the Phrases
 * tab. The chunk text is lower-cased to match the user_vocabulary uniqueness
 * constraint (user_id, word).
 */
export async function upsertPhrase(
  userId: string,
  chunk: {
    chunk: string;
    pattern?: string;
    meaning: string;
    meaningZh: string;
    example?: string;
    syllabification?: string;
  },
  sessionId?: string,
): Promise<void> {
  const pool = getPool();
  const now = Date.now();
  const word = chunk.chunk.toLowerCase().trim();
  if (!word) return;

  await pool.query(
    `INSERT INTO user_vocabulary (
        user_id, word, syllabification, part_of_speech,
        english_definition, chinese_definition, example,
        entry_type, source_session_ids, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'phrase', $8::jsonb, $9, $9)
      ON CONFLICT (user_id, word) DO UPDATE SET
        syllabification = COALESCE(NULLIF(EXCLUDED.syllabification, ''), user_vocabulary.syllabification),
        part_of_speech = COALESCE(NULLIF(EXCLUDED.part_of_speech, ''), user_vocabulary.part_of_speech),
        english_definition = COALESCE(NULLIF(EXCLUDED.english_definition, ''), user_vocabulary.english_definition),
        chinese_definition = COALESCE(NULLIF(EXCLUDED.chinese_definition, ''), user_vocabulary.chinese_definition),
        example = COALESCE(NULLIF(EXCLUDED.example, ''), user_vocabulary.example),
        entry_type = 'phrase',
        source_session_ids = (
          SELECT jsonb_agg(DISTINCT elem) FROM jsonb_array_elements(
            user_vocabulary.source_session_ids || EXCLUDED.source_session_ids
          ) elem
        ),
        updated_at = $9`,
    [
      userId,
      word,
      chunk.syllabification || "",
      chunk.pattern || "phrase",
      chunk.meaning,
      chunk.meaningZh,
      chunk.example || "",
      JSON.stringify(sessionId ? [sessionId] : []),
      now,
    ],
  );
}

export async function recordSRSAction(
  userId: string,
  word: string,
  action: SRSAction,
  wordData?: WordData
): Promise<{ id: string; rating: GlossaryRating | null; srsCounts: { hard: number; medium: number }; source: VocabularySource }> {
  const pool = getPool();
  const ratingKey: "hard" | "medium" = (action === "again" || action === "hard") ? "hard" : "medium";
  const normalizedWord = word.toLowerCase();
  const now = Date.now();

  const { rows } = await pool.query(
    `UPDATE user_vocabulary SET
       srs_counts = jsonb_set(srs_counts, ARRAY[$3], ((COALESCE((srs_counts->>$3)::int, 0) + 1)::text)::jsonb),
       updated_at = $4
     WHERE user_id = $1 AND word = $2
     RETURNING id, srs_counts, shared_by`,
    [userId, normalizedWord, ratingKey, now]
  );

  if (rows.length === 0 && wordData) {
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO user_vocabulary (
        id, user_id, word, syllabification, part_of_speech,
        english_definition, chinese_definition, example,
        srs_counts, entry_type, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)`,
      [
        id, userId, normalizedWord,
        wordData.syllabification || "",
        wordData.partOfSpeech || "",
        wordData.englishDefinition || "",
        wordData.chineseDefinition || "",
        wordData.example || "",
        JSON.stringify({ hard: ratingKey === "hard" ? 1 : 0, medium: ratingKey === "medium" ? 1 : 0 }),
        isMultiWordEntry(normalizedWord) ? "phrase" : "word",
        now,
      ]
    );
    const srsCounts = { hard: ratingKey === "hard" ? 1 : 0, medium: ratingKey === "medium" ? 1 : 0 };
    const rating = deriveRatingFromCounts(srsCounts);
    await pool.query(
      `UPDATE user_vocabulary SET rating = $3 WHERE user_id = $1 AND word = $2`,
      [userId, normalizedWord, rating]
    );
    return { id, rating, srsCounts, source: "own" };
  }

  const counts = rows[0]?.srs_counts as { hard: number; medium: number } | undefined;
  const srsCounts = counts ? { hard: counts.hard ?? 0, medium: counts.medium ?? 0 } : { hard: 0, medium: 0 };
  const rating = deriveRatingFromCounts(srsCounts);
  const rowId = rows[0]?.id as string;
  const source: VocabularySource = rows[0]?.shared_by ? "teacher" : "own";

  await pool.query(
    `UPDATE user_vocabulary SET rating = $3 WHERE user_id = $1 AND word = $2`,
    [userId, normalizedWord, rating]
  );

  return { id: rowId, rating, srsCounts, source };
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
  sessionId: string,
  client?: PoolClient
): Promise<void> {
  const exec = client ?? getPool();
  await exec.query(
    `DELETE FROM user_vocabulary
     WHERE user_id = $1
       AND source_session_ids @> $2::jsonb
       AND jsonb_array_length(source_session_ids) = 1
       AND shared_by IS NULL`,
    [userId, JSON.stringify([sessionId])]
  );

  await exec.query(
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
  results: VocabularyReviewResult[],
  ratingCounts?: VocabularyRatingCounts,
  entryType: "word" | "phrase" = "word"
): Promise<string> {
  const pool = getPool();
  const now = Date.now();
  const sessionId = crypto.randomUUID();

  // Clients can't reliably know each word's mastery level — the main-page
  // glossary games and spelling battles review words that live in
  // user_vocabulary, not in any client store, so they send masteryAfter as a
  // placeholder 0. The per-word SRS PATCHes of the same review round have
  // already committed by the time this POST lands, so the authoritative
  // post-review level is simply the row's current mastery_level. Enrich from
  // the DB; keep the client value only for words that were never synced into
  // user_vocabulary.
  let enrichedResults = results;
  if (results.length > 0) {
    const { rows: masteryRows } = await pool.query(
      `SELECT word, mastery_level FROM user_vocabulary
       WHERE user_id = $1 AND word = ANY($2::text[])`,
      [userId, results.map((r) => r.word.toLowerCase())]
    );
    const masteryByWord = new Map<string, number>(
      masteryRows.map((row) => [row.word as string, row.mastery_level as number])
    );
    if (masteryByWord.size > 0) {
      enrichedResults = results.map((r) => ({
        ...r,
        masteryAfter:
          masteryByWord.get(r.word.toLowerCase()) ?? r.masteryAfter,
      }));
    }
  }

  const totalWords = enrichedResults.length;
  const correctCount = enrichedResults.filter((r) => r.correct).length;
  const accuracy = totalWords > 0 ? Math.round((correctCount / totalWords) * 100) : 0;

  const counts: VocabularyRatingCounts | null =
    mode === "flashcard"
      ? ratingCounts ?? {
          again: enrichedResults.filter((r) => r.rating === "again").length,
          hard: enrichedResults.filter((r) => r.rating === "hard").length,
          good: enrichedResults.filter((r) => r.rating === "good").length,
          easy: enrichedResults.filter((r) => r.rating === "easy").length,
        }
      : null;

  await pool.query(
    `INSERT INTO vocabulary_review_sessions (id, user_id, mode, total_words, correct_count, accuracy, rating_counts, entry_type, started_at, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [sessionId, userId, mode, totalWords, correctCount, accuracy, counts ? JSON.stringify(counts) : null, entryType, now - 60000, now]
  );

  if (enrichedResults.length > 0) {
    const values = enrichedResults
      .map(
        (_, i) =>
          `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6}, $${i * 7 + 7})`
      )
      .join(", ");
    const params = enrichedResults.flatMap((r) => [
      crypto.randomUUID(),
      sessionId,
      r.word,
      r.correct,
      r.masteryAfter,
      r.rating || null,
      r.attempts || 1,
    ]);
    await pool.query(
      `INSERT INTO vocabulary_review_results (id, session_id, word, correct, mastery_after, rating, attempts)
       VALUES ${values}`,
      params
    );
  }

  return sessionId;
}

export interface ReviewSessionRecord {
  userId: string;
  mode: VocabularyReviewMode;
  accuracy: number;
  totalWords: number;
  completedAt: number;
}

export async function getSpellingReviewSessionCount(userId: string): Promise<number> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM vocabulary_review_sessions
     WHERE user_id = $1 AND mode = 'spelling'`,
    [userId]
  );
  return rows[0]?.count ?? 0;
}

export async function getReviewSessionsForUsers(
  userIds: string[]
): Promise<ReviewSessionRecord[]> {
  if (userIds.length === 0) return [];
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT user_id, mode, accuracy, total_words, completed_at
     FROM vocabulary_review_sessions
     WHERE user_id = ANY($1::text[])
     ORDER BY completed_at ASC`,
    [userIds]
  );
  return rows.map((r) => ({
    userId: r.user_id as string,
    mode: r.mode as VocabularyReviewMode,
    accuracy: Number(r.accuracy),
    totalWords: Number(r.total_words),
    completedAt: Number(r.completed_at),
  }));
}

export async function getVocabularyCountsForUsers(
  userIds: string[]
): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT user_id, COUNT(*)::int AS word_count
     FROM user_vocabulary
     WHERE user_id = ANY($1::text[]) AND entry_type = 'word'
     GROUP BY user_id`,
    [userIds]
  );
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.user_id as string, parseInt(r.word_count) || 0);
  }
  return map;
}

export async function getReviewSessions(
  userId: string,
  limit: number = 20,
  entryType?: "word" | "phrase"
): Promise<VocabularyReviewSession[]> {
  const pool = getPool();
  let query = `SELECT id, mode, total_words, correct_count, accuracy, rating_counts, entry_type, started_at, completed_at
     FROM vocabulary_review_sessions
     WHERE user_id = $1`;
  const params: unknown[] = [userId];
  if (entryType) {
    query += ` AND entry_type = $${params.length + 1}`;
    params.push(entryType);
  }
  query += ` ORDER BY completed_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const { rows } = await pool.query(query, params);
  return rows.map((r) => ({
    id: r.id,
    mode: r.mode,
    totalWords: Number(r.total_words),
    correctCount: Number(r.correct_count),
    accuracy: Number(r.accuracy),
    ratingCounts: r.rating_counts || undefined,
    entryType: ((r.entry_type as string) || "word") as "word" | "phrase",
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
    `SELECT id, mode, total_words, correct_count, accuracy, rating_counts, entry_type, started_at, completed_at
     FROM vocabulary_review_sessions
     WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );

  if (sessionRows.length === 0) return null;

  const s = sessionRows[0];

  const { rows: resultRows } = await pool.query(
    `SELECT word, correct, mastery_after, rating, attempts
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
    ratingCounts: s.rating_counts || undefined,
    entryType: ((s.entry_type as string) || "word") as "word" | "phrase",
    startedAt: Number(s.started_at),
    completedAt: Number(s.completed_at),
    results: resultRows.map((r) => ({
      word: r.word,
      correct: r.correct,
      masteryBefore: 0,
      masteryAfter: Number(r.mastery_after),
      rating: r.rating || undefined,
      attempts: Number(r.attempts) || undefined,
    })),
  };
}

export async function deleteReviewSession(
  userId: string,
  sessionId: string
): Promise<boolean> {
  const pool = getPool();
  const { rowCount } = await pool.query(
    `DELETE FROM vocabulary_review_sessions WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );
  return (rowCount ?? 0) > 0;
}

export async function shareVocabularyWords(
  senderId: string,
  recipientIds: string[],
  wordIds: string[]
): Promise<{ inserted: number; skipped: number }> {
  const pool = getPool();
  const now = Date.now();

  const { rows: senderRows } = await pool.query(
    `SELECT id, word, syllabification, part_of_speech, english_definition,
            chinese_definition, example, rating
     FROM user_vocabulary
     WHERE user_id = $1 AND id = ANY($2::text[])`,
    [senderId, wordIds]
  );

  if (senderRows.length === 0) {
    return { inserted: 0, skipped: 0 };
  }

  let inserted = 0;
  let skipped = 0;

  for (const recipientId of recipientIds) {
    if (recipientId === senderId) continue;

    const { rows: existing } = await pool.query(
      `SELECT word FROM user_vocabulary WHERE user_id = $1 AND word = ANY($2::text[])`,
      [recipientId, senderRows.map((r) => r.word)]
    );
    const existingWords = new Set(existing.map((r) => r.word));

    for (const row of senderRows) {
      if (existingWords.has(row.word)) {
        skipped++;
        continue;
      }

      await pool.query(
        `INSERT INTO user_vocabulary (
          user_id, word, syllabification, part_of_speech,
          english_definition, chinese_definition, example,
          rating, shared_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
        [
          recipientId,
          row.word,
          row.syllabification || "",
          row.part_of_speech || "",
          row.english_definition || "",
          row.chinese_definition || "",
          row.example || "",
          row.rating || null,
          senderId,
          now,
        ]
      );
      inserted++;
    }
  }

  return { inserted, skipped };
}

export async function getVocabularyWordMastery(
  userId: string,
  word: string
): Promise<{ masteryLevel: VocabularyMasteryLevel } | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT mastery_level FROM user_vocabulary WHERE user_id = $1 AND word = $2`,
    [userId, word.toLowerCase()]
  );
  if (rows.length === 0) return null;
  return { masteryLevel: (rows[0].mastery_level as number) as VocabularyMasteryLevel };
}
