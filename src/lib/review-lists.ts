import { getPool } from "./db";
import { getShareTargets } from "./shared-sessions";

export async function createReviewList(
  userId: string,
  name: string,
  words: ReviewListWord[]
): Promise<ReviewList> {
  const pool = getPool();
  const now = Date.now();
  const id = crypto.randomUUID();

  await pool.query(
    `INSERT INTO review_lists (id, name, words, word_count, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6)`,
    [id, name, JSON.stringify(words), words.length, userId, now]
  );

  return {
    id,
    name,
    words,
    wordCount: words.length,
    createdBy: userId,
    createdByName: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getReviewLists(userId: string): Promise<ReviewList[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT rl.id, rl.name, rl.words, rl.word_count, rl.created_by,
            u.name AS created_by_name, rl.created_at, rl.updated_at
     FROM review_lists rl
     LEFT JOIN users u ON rl.created_by = u.id
     WHERE rl.created_by = $1
     ORDER BY rl.created_at DESC`,
    [userId]
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    words: typeof r.words === "string" ? JSON.parse(r.words) : r.words,
    wordCount: Number(r.word_count),
    createdBy: r.created_by,
    createdByName: r.created_by_name,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  }));
}

export async function getReviewList(
  userId: string,
  listId: string
): Promise<ReviewList | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT rl.id, rl.name, rl.words, rl.word_count, rl.created_by,
            u.name AS created_by_name, rl.created_at, rl.updated_at
     FROM review_lists rl
     LEFT JOIN users u ON rl.created_by = u.id
     WHERE rl.id = $1 AND rl.created_by = $2`,
    [listId, userId]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    name: r.name,
    words: typeof r.words === "string" ? JSON.parse(r.words) : r.words,
    wordCount: Number(r.word_count),
    createdBy: r.created_by,
    createdByName: r.created_by_name,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

export async function deleteReviewList(
  userId: string,
  listId: string
): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query(
    `DELETE FROM review_lists WHERE id = $1 AND created_by = $2`,
    [listId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function updateReviewList(
  userId: string,
  listId: string,
  name: string,
  words: ReviewListWord[]
): Promise<ReviewList | null> {
  const pool = getPool();
  const now = Date.now();
  const result = await pool.query(
    `UPDATE review_lists SET name = $3, words = $4, word_count = $5, updated_at = $6
     WHERE id = $1 AND created_by = $2
     RETURNING id, name, words, word_count, created_by, created_at, updated_at`,
    [listId, userId, name, JSON.stringify(words), words.length, now]
  );
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    id: r.id,
    name: r.name,
    words: typeof r.words === "string" ? JSON.parse(r.words) : r.words,
    wordCount: Number(r.word_count),
    createdBy: r.created_by,
    createdByName: null,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

export async function shareReviewList(
  senderId: string,
  recipientIds: string[],
  listId: string,
  role: "super-admin" | "admin" | "teacher"
): Promise<{ inserted: number }> {
  const pool = getPool();

  const { rows: listRows } = await pool.query(
    `SELECT name, word_count FROM review_lists WHERE id = $1 AND created_by = $2`,
    [listId, senderId]
  );
  if (listRows.length === 0) return { inserted: 0 };

  const listName = listRows[0].name;
  const wordCount = Number(listRows[0].word_count);

  const targets = await getShareTargets(senderId, role);
  const allowedIds = new Set(
    targets.flatMap((g) => g.users.map((u) => u.id))
  );

  let inserted = 0;
  for (const recipientId of recipientIds) {
    if (recipientId === senderId || !allowedIds.has(recipientId)) continue;

    const result = await pool.query(
      `INSERT INTO shared_review_lists (sender_id, recipient_id, review_list_id, review_list_name, word_count)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [senderId, recipientId, listId, listName, wordCount]
    );
    inserted += result.rowCount ?? 0;
  }

  return { inserted };
}

export async function getPendingReviewListShares(
  recipientId: string
): Promise<SharedReviewList[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT srl.id, srl.sender_id, u.name AS sender_name,
            srl.review_list_id, srl.review_list_name, srl.word_count,
            srl.status, srl.created_at
     FROM shared_review_lists srl
     JOIN users u ON srl.sender_id = u.id
     WHERE srl.recipient_id = $1 AND srl.status = 'pending'
     ORDER BY srl.created_at DESC`,
    [recipientId]
  );
  return rows.map((r) => ({
    id: r.id,
    senderId: r.sender_id,
    senderName: r.sender_name || r.sender_id,
    reviewListId: r.review_list_id,
    reviewListName: r.review_list_name,
    wordCount: Number(r.word_count),
    status: r.status,
    createdAt: r.created_at,
  }));
}

export async function getPendingReviewListShareCount(
  recipientId: string
): Promise<number> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM shared_review_lists
     WHERE recipient_id = $1 AND status = 'pending'`,
    [recipientId]
  );
  return rows[0]?.count ?? 0;
}

export async function acceptReviewListShare(
  shareId: string,
  recipientId: string
): Promise<ReviewListWord[] | null> {
  const pool = getPool();

  const { rows: shareRows } = await pool.query(
    `SELECT srl.review_list_id, srl.status
     FROM shared_review_lists srl
     WHERE srl.id = $1 AND srl.recipient_id = $2 AND srl.status = 'pending'`,
    [shareId, recipientId]
  );
  if (shareRows.length === 0) return null;

  const listId = shareRows[0].review_list_id;

  const { rows: listRows } = await pool.query(
    `SELECT words FROM review_lists WHERE id = $1`,
    [listId]
  );
  if (listRows.length === 0) return null;

  const words =
    typeof listRows[0].words === "string"
      ? JSON.parse(listRows[0].words)
      : listRows[0].words;

  await pool.query(
    `UPDATE shared_review_lists SET status = 'accepted', updated_at = NOW() WHERE id = $1`,
    [shareId]
  );

  return words;
}

export async function rejectReviewListShare(
  shareId: string,
  recipientId: string
): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query(
    `UPDATE shared_review_lists SET status = 'rejected', updated_at = NOW()
     WHERE id = $1 AND recipient_id = $2 AND status = 'pending'`,
    [shareId, recipientId]
  );
  return (result.rowCount ?? 0) > 0;
}
