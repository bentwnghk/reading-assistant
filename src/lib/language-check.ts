import { getPool } from "./db"
import {
  LANGUAGE_CHECK_MAX_ESSAYS,
  LANGUAGE_CHECK_RETENTION_DAYS,
  type LanguageCheckStatus,
} from "@/constants/languageCheck"

function toMs(value: unknown): number {
  return value ? new Date(value as string).getTime() : 0
}

function arrayOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function mapSummary(row: Record<string, unknown>): LanguageCheckEssaySummary {
  return {
    id: row.id as string,
    title: (row.title as string) || "",
    status: row.status as LanguageCheckEssaySummary["status"],
    pageCount: Number(row.page_count) || 0,
    errorCount: Number(row.error_count) || 0,
    createdAt: toMs(row.created_at),
    updatedAt: toMs(row.updated_at),
  }
}

function mapEssay(row: Record<string, unknown>): LanguageCheckEssay {
  return {
    id: row.id as string,
    title: (row.title as string) || "",
    images: arrayOf<string>(row.images),
    transcript: (row.transcript as string) || "",
    status: row.status as LanguageCheckEssay["status"],
    checkedText: (row.checked_text as string) || "",
    corrections: arrayOf<LanguageCheckError>(row.corrections),
    ocrModel: (row.ocr_model as string) || "",
    checkModel: (row.check_model as string) || "",
    droppedCount: Number(row.dropped_count) || 0,
    createdAt: toMs(row.created_at),
    updatedAt: toMs(row.updated_at),
  }
}

/**
 * Retention sweep. Scans live inside the row (`images` JSONB), so deleting
 * the row deletes them too. Runs opportunistically (list/count) — this app
 * has no scheduler of its own.
 */
export async function deleteExpiredEssays(): Promise<void> {
  await getPool().query(
    `DELETE FROM language_check_essays
     WHERE created_at < now() - make_interval(days => $1)`,
    [LANGUAGE_CHECK_RETENTION_DAYS],
  )
}

/** Lightweight list: never selects images/transcript/corrections payloads. */
export async function listEssays(
  userId: string,
): Promise<LanguageCheckEssaySummary[]> {
  await deleteExpiredEssays()
  const { rows } = await getPool().query(
    `SELECT id, title, status, created_at, updated_at,
            jsonb_array_length(images) AS page_count,
            jsonb_array_length(corrections) AS error_count
     FROM language_check_essays
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT $2`,
    [userId, LANGUAGE_CHECK_MAX_ESSAYS],
  )
  return rows.map(mapSummary)
}

export async function getEssay(
  userId: string,
  id: string,
): Promise<LanguageCheckEssay | null> {
  // Expired essays are purged on direct access too (the list sweep may not
  // have run, e.g. for an id that only lives in the client-side cache).
  await getPool().query(
    `DELETE FROM language_check_essays
     WHERE id = $1 AND user_id = $2
       AND created_at < now() - make_interval(days => $3)`,
    [id, userId, LANGUAGE_CHECK_RETENTION_DAYS],
  )
  const { rows } = await getPool().query(
    `SELECT * FROM language_check_essays WHERE id = $1 AND user_id = $2`,
    [id, userId],
  )
  return rows[0] ? mapEssay(rows[0]) : null
}

export async function countEssays(userId: string): Promise<number> {
  await deleteExpiredEssays()
  const { rows } = await getPool().query(
    `SELECT COUNT(*)::int AS n FROM language_check_essays WHERE user_id = $1`,
    [userId],
  )
  return rows[0]?.n ?? 0
}

export async function createEssay(
  userId: string,
  data: { title: string; images: string[]; ocrModel?: string },
): Promise<LanguageCheckEssay> {
  const { rows } = await getPool().query(
    `INSERT INTO language_check_essays (user_id, title, images, ocr_model)
     VALUES ($1, $2, $3::jsonb, $4)
     RETURNING *`,
    [userId, data.title, JSON.stringify(data.images), data.ocrModel ?? ""],
  )
  return mapEssay(rows[0])
}

export interface EssayPatch {
  title?: string
  transcript?: string
  status?: LanguageCheckStatus
  checkedText?: string
  corrections?: LanguageCheckError[]
  ocrModel?: string
  checkModel?: string
  droppedCount?: number
}

/** Partial update; only the provided fields are written. */
export async function updateEssay(
  userId: string,
  id: string,
  patch: EssayPatch,
): Promise<boolean> {
  const sets: string[] = []
  const values: unknown[] = []
  const add = (column: string, value: unknown, cast = "") => {
    values.push(value)
    sets.push(`${column} = $${values.length}${cast}`)
  }

  if (patch.title !== undefined) add("title", patch.title)
  if (patch.transcript !== undefined) add("transcript", patch.transcript)
  if (patch.status !== undefined) add("status", patch.status)
  if (patch.checkedText !== undefined) add("checked_text", patch.checkedText)
  if (patch.corrections !== undefined)
    add("corrections", JSON.stringify(patch.corrections), "::jsonb")
  if (patch.ocrModel !== undefined) add("ocr_model", patch.ocrModel)
  if (patch.checkModel !== undefined) add("check_model", patch.checkModel)
  if (patch.droppedCount !== undefined) add("dropped_count", patch.droppedCount)

  if (sets.length === 0) return true

  values.push(id, userId)
  const result = await getPool().query(
    `UPDATE language_check_essays SET ${sets.join(", ")}
     WHERE id = $${values.length - 1} AND user_id = $${values.length}`,
    values,
  )
  return (result.rowCount ?? 0) > 0
}

export async function deleteEssay(
  userId: string,
  id: string,
): Promise<boolean> {
  const result = await getPool().query(
    `DELETE FROM language_check_essays WHERE id = $1 AND user_id = $2`,
    [id, userId],
  )
  return (result.rowCount ?? 0) > 0
}
