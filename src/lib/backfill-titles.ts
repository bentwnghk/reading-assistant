import { generateText } from "ai";
import { createAIProvider } from "@/utils/reading-assistant/provider";
import { getAIProviderApiKey, getAIProviderBaseURL } from "@/app/api/utils";
import { multiApiKeyPolling } from "@/utils/model";
import { extractTitleFromTextPrompt } from "@/constants/readingPrompts";
import { getPool, getClient } from "@/lib/db";

export interface BackfillOptions {
  provider: string;
  model: string;
  dryRun: boolean;
  onlyEmpty: boolean;
  includeRepository: boolean;
  concurrency: number;
  maxChars: number;
  limit: number;
}

export interface BackfillStats {
  readingSessions: number;
  textRepository: number;
  total: number;
}

export interface BackfillChange {
  id: string;
  from: string;
  to: string;
}

export type BackfillEvent =
  | { type: "table"; table: string; count: number }
  | {
      type: "progress";
      table: string;
      done: number;
      total: number;
      changed: number;
      skipped: number;
      failed: number;
      dryRun: boolean;
      change?: BackfillChange;
      error?: string;
    }
  | { type: "table-done"; table: string; changed: number; skipped: number; failed: number }
  | { type: "fatal"; message: string }
  | { type: "done"; changed: number; skipped: number; failed: number };

export type BackfillEmit = (event: BackfillEvent) => void;

interface TableSource {
  table: string;
  idCol: string;
  textCol: string;
  titleCol: string;
}

const READING_SESSIONS: TableSource = {
  table: "reading_sessions",
  idCol: "id",
  textCol: "extracted_text",
  titleCol: "doc_title",
};
const TEXT_REPOSITORY: TableSource = {
  table: "text_repository",
  idCol: "id",
  textCol: "extracted_text",
  titleCol: "title",
};

function sourcesFor(opts: Pick<BackfillOptions, "includeRepository">): TableSource[] {
  return opts.includeRepository ? [READING_SESSIONS, TEXT_REPOSITORY] : [READING_SESSIONS];
}

function whereClause(src: TableSource, onlyEmpty: boolean): string {
  const conditions = [`${src.textCol} IS NOT NULL`, `length(${src.textCol}) >= 20`];
  if (onlyEmpty) conditions.push(`(${src.titleCol} IS NULL OR ${src.titleCol} = '')`);
  return conditions.join(" AND ");
}

export async function getBackfillStats(
  opts: Pick<BackfillOptions, "onlyEmpty" | "includeRepository">,
): Promise<BackfillStats> {
  const pool = getPool();
  const count = async (src: TableSource): Promise<number> => {
    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM ${src.table} WHERE ${whereClause(src, opts.onlyEmpty)}`,
    );
    return rows[0]?.n ?? 0;
  };
  const readingSessions = await count(READING_SESSIONS);
  const textRepository = opts.includeRepository ? await count(TEXT_REPOSITORY) : 0;
  return { readingSessions, textRepository, total: readingSessions + textRepository };
}

function cleanTitle(raw: string): string {
  return String(raw || "")
    .trim()
    .replace(/^["'“”‘’]|["'“”‘’]$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

async function extractTitle(
  text: string,
  provider: string,
  model: string,
  maxChars: number,
  signal?: AbortSignal,
): Promise<string> {
  const apiKey = multiApiKeyPolling(getAIProviderApiKey(provider));
  const baseURL = getAIProviderBaseURL(provider);
  const aiModel = await createAIProvider({ provider, apiKey, baseURL, model });
  const { text: raw } = await generateText({
    model: aiModel,
    prompt: extractTitleFromTextPrompt(text.slice(0, maxChars)),
    abortSignal: signal,
  });
  return cleanTitle(raw);
}

export async function runBackfill(
  opts: BackfillOptions,
  emit: BackfillEmit,
  signal?: AbortSignal,
): Promise<{ changed: number; skipped: number; failed: number }> {
  const apiKey = getAIProviderApiKey(opts.provider);
  if (!apiKey && opts.provider !== "ollama" && opts.provider !== "pollinations") {
    emit({ type: "fatal", message: `No API key configured for provider "${opts.provider}".` });
    return { changed: 0, skipped: 0, failed: 0 };
  }

  const pool = getPool();
  const sources = sourcesFor(opts);
  const concurrency = Math.max(1, Math.min(opts.concurrency, 10));
  let totalChanged = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const src of sources) {
    if (signal?.aborted) break;

    const limitClause = opts.limit > 0 ? `LIMIT ${opts.limit}` : "";
    const { rows } = await pool.query(
      `SELECT ${src.idCol} AS id, ${src.titleCol} AS title, ${src.textCol} AS text
       FROM ${src.table}
       WHERE ${whereClause(src, opts.onlyEmpty)}
       ORDER BY ${src.idCol}
       ${limitClause}`,
    );

    emit({ type: "table", table: src.table, count: rows.length });

    let changed = 0;
    let skipped = 0;
    let failed = 0;
    let done = 0;
    const executing = new Set<Promise<void>>();

    for (const row of rows) {
      if (signal?.aborted) break;

      const task = (async () => {
        let change: BackfillChange | undefined;
        let error: string | undefined;
        try {
          const newTitle = await extractTitle(row.text, opts.provider, opts.model, opts.maxChars, signal);
          if (!newTitle || newTitle === row.title) {
            skipped++;
          } else {
            if (!opts.dryRun) {
              await pool.query(
                `UPDATE ${src.table} SET ${src.titleCol} = $1 WHERE ${src.idCol} = $2`,
                [newTitle, row.id],
              );
            }
            changed++;
            change = {
              id: String(row.id).slice(0, 8),
              from: (row.title || "").slice(0, 60),
              to: newTitle,
            };
          }
        } catch (e) {
          failed++;
          error = e instanceof Error ? e.message : String(e);
        }
        done++;
        emit({
          type: "progress",
          table: src.table,
          done,
          total: rows.length,
          changed,
          skipped,
          failed,
          dryRun: opts.dryRun,
          change,
          error,
        });
      })().finally(() => executing.delete(task));

      executing.add(task);
      if (executing.size >= concurrency) await Promise.race(executing);
    }
    await Promise.all(executing);

    totalChanged += changed;
    totalSkipped += skipped;
    totalFailed += failed;
    emit({ type: "table-done", table: src.table, changed, skipped, failed });
  }

  emit({ type: "done", changed: totalChanged, skipped: totalSkipped, failed: totalFailed });
  return { changed: totalChanged, skipped: totalSkipped, failed: totalFailed };
}

export interface PropagateResult {
  sharedSessions: number;
  assignments: number;
  chatQuestions: number;
}

export async function propagateTitles(): Promise<PropagateResult> {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    const r1 = await client.query(
      `UPDATE shared_sessions s
       SET doc_title    = rs.doc_title,
           session_data = jsonb_set(s.session_data, '{docTitle}', to_jsonb(rs.doc_title), true)
       FROM reading_sessions rs
       WHERE s.session_id = rs.id
         AND rs.doc_title <> ''
         AND COALESCE(s.doc_title, '') <> rs.doc_title`,
    );
    const r2 = await client.query(
      `UPDATE assignments a
       SET source_doc_title       = rs.doc_title,
           source_session_snapshot = jsonb_set(a.source_session_snapshot, '{docTitle}', to_jsonb(rs.doc_title), true)
       FROM reading_sessions rs
       WHERE a.source_session_id = rs.id
         AND rs.doc_title <> ''
         AND COALESCE(a.source_doc_title, '') <> rs.doc_title`,
    );
    const r3 = await client.query(
      `UPDATE chat_questions c
       SET doc_title = rs.doc_title
       FROM reading_sessions rs
       WHERE c.session_id = rs.id
         AND rs.doc_title <> ''
         AND COALESCE(c.doc_title, '') <> rs.doc_title`,
    );

    await client.query("COMMIT");
    return {
      sharedSessions: r1.rowCount ?? 0,
      assignments: r2.rowCount ?? 0,
      chatQuestions: r3.rowCount ?? 0,
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
