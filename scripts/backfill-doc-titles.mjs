#!/usr/bin/env node
/**
 * backfill-doc-titles.mjs
 *
 * Backfills the doc_title / title columns with the ACTUAL title extracted from
 * each row's text via an AI call (OpenAI-compatible chat completions). Exam
 * labels like "Part A" / "Text 1" are excluded — the prompt mirrors
 * extractTitleFromTextPrompt in src/constants/readingPrompts.ts (keep in sync).
 *
 * REQUIREMENTS
 *   Run from the project root after `npm install` (needs `pg` + Node 18+ fetch).
 *   Configure via env vars:
 *     DATABASE_URL          PostgreSQL connection string (same as the app)
 *     BACKFILL_AI_BASE_URL  Provider base URL (OpenAI-compatible, NO trailing /chat/completions)
 *     BACKFILL_AI_API_KEY   API key for the provider
 *     BACKFILL_AI_MODEL     Model name (e.g. gemini-2.5-flash, gpt-4o-mini)
 *
 * COMMON PROVIDER BASE URLs
 *   Google:      https://generativelanguage.googleapis.com/v1beta/openai
 *   OpenAI:      https://api.openai.com/v1
 *   OpenRouter:  https://openrouter.ai/api/v1
 *   DeepSeek:    https://api.deepseek.com/v1
 *   xAI:         https://api.x.ai/v1
 *   Mistral:     https://api.mistral.ai/v1
 *
 * FLAGS
 *   --dry-run             Don't write; print what would change
 *   --limit N             Process at most N rows per table (default: all)
 *   --offset N            Skip first N matching rows (default: 0; for resuming)
 *   --concurrency N       Parallel AI calls (default: 3)
 *   --max-chars N         Max chars of text sent per AI call (default: 2000)
 *   --only-empty          Only backfill rows whose current title is blank
 *   --include-repository  Also backfill text_repository.title
 *
 * USAGE
 *   DATABASE_URL=... BACKFILL_AI_BASE_URL=... BACKFILL_AI_API_KEY=... \
 *   BACKFILL_AI_MODEL=gemini-2.5-flash node scripts/backfill-doc-titles.mjs --dry-run
 *
 *   Drop --dry-run once the preview looks right, then run
 *   scripts/backfill-doc-titles-propagate.sql to refresh the denormalized title
 *   copies (shared_sessions, assignments, chat_questions).
 */
import pg from "pg";

const { DATABASE_URL, BACKFILL_AI_BASE_URL, BACKFILL_AI_API_KEY, BACKFILL_AI_MODEL } = process.env;

// ── CLI flags ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const onlyEmpty = args.includes("--only-empty");
const includeRepository = args.includes("--include-repository");

const flagValue = (name, fallback) => {
  const i = args.indexOf(name);
  if (i < 0 || !args[i + 1]) return fallback;
  const n = Number(args[i + 1]);
  return Number.isFinite(n) ? n : fallback;
};
const limit = flagValue("--limit", 0);
const offset = flagValue("--offset", 0);
const concurrency = Math.max(1, flagValue("--concurrency", 3));
const maxChars = Math.max(100, flagValue("--max-chars", 2000));

// ── Validation ─────────────────────────────────────────────────────────────
const missing = [];
if (!DATABASE_URL) missing.push("DATABASE_URL");
if (!BACKFILL_AI_BASE_URL) missing.push("BACKFILL_AI_BASE_URL");
if (!BACKFILL_AI_API_KEY) missing.push("BACKFILL_AI_API_KEY");
if (!BACKFILL_AI_MODEL) missing.push("BACKFILL_AI_MODEL");
if (missing.length) {
  console.error(`Missing required env: ${missing.join(", ")}\nSee file header for usage.`);
  process.exit(1);
}

// ── Prompt (mirrors extractTitleFromTextPrompt — keep in sync) ─────────────
function extractTitlePrompt(text) {
  return `Read the text below and identify its ACTUAL title — the real title the author or publisher gave the passage, exactly as it appears in the text itself.

Return ONLY the title text and nothing else (no explanation, no quotation marks, no trailing period that is not part of the title). If there is no real title, return an empty string.

Strict rules:
- Labels and identifiers are NOT titles. NEVER return any of these as the title: "Part A", "Part B", "Part 1", "Text 1", "Text 2", "Reading Passage 1", "Passage A", "Section A", "Section 1", "Paper 1", "Question 1", or any similar Part/Text/Section/Passage/Paper/Question label — even if it appears at the very top of the text.
- Do NOT return the author's name, a date, a page number, a rubric, or reading instructions.
- Do NOT invent, paraphrase, summarize, or generate a title. Only return a title that literally appears in the text.
- If the text begins with a real title as its heading (a short, title-like line at or near the top that is NOT one of the labels listed above), return that heading exactly as written.
- If the text has NO real title (only labels like "Text 1", or it goes straight into body content with no heading), return an empty string.

<text>
${text}
</text>`;
}

function cleanTitle(raw) {
  return String(raw || "")
    .trim()
    .replace(/^["'“”‘’]|["'“”‘’]$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

// ── AI call (OpenAI-compatible chat completions) ───────────────────────────
const endpoint = BACKFILL_AI_BASE_URL.replace(/\/$/, "") + "/chat/completions";

async function extractTitle(text) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BACKFILL_AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: BACKFILL_AI_MODEL,
      temperature: 0,
      messages: [{ role: "user", content: extractTitlePrompt(text.slice(0, maxChars)) }],
    }),
  });
  if (!res.ok) {
    throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  return cleanTitle(data.choices?.[0]?.message?.content ?? "");
}

// ── Simple concurrency pool ────────────────────────────────────────────────
async function runPool(items, n, worker) {
  const executing = new Set();
  for (const item of items) {
    const p = worker(item).finally(() => executing.delete(p));
    executing.add(p);
    if (executing.size >= n) await Promise.race(executing);
  }
  await Promise.all(executing);
}

// ── Per-table backfill ─────────────────────────────────────────────────────
const { Pool } = pg;
const pool = new Pool({ connectionString: DATABASE_URL, max: Math.max(concurrency + 2, 5) });

async function backfillTable({ table, idCol, textCol, titleCol }) {
  const conditions = [`${textCol} IS NOT NULL`, `length(${textCol}) >= 20`];
  if (onlyEmpty) conditions.push(`(${titleCol} IS NULL OR ${titleCol} = '')`);
  const where = conditions.join(" AND ");
  const limitClause = limit > 0 ? `LIMIT ${limit}` : "";
  const offsetClause = offset > 0 ? `OFFSET ${offset}` : "";

  const { rows } = await pool.query(
    `SELECT ${idCol} AS id, ${titleCol} AS title, ${textCol} AS text
     FROM ${table}
     WHERE ${where}
     ORDER BY ${idCol}
     ${limitClause} ${offsetClause}`,
  );

  console.log(`\n[${table}] ${rows.length} row(s)${dryRun ? " — DRY RUN" : ""}`);

  let changed = 0;
  let skipped = 0;
  let failed = 0;
  let done = 0;

  await runPool(rows, concurrency, async (row) => {
    try {
      const newTitle = await extractTitle(row.text);
      if (!newTitle || newTitle === row.title) {
        skipped++;
      } else {
        if (!dryRun) {
          await pool.query(`UPDATE ${table} SET ${titleCol} = $1 WHERE ${idCol} = $2`, [
            newTitle,
            row.id,
          ]);
        }
        changed++;
        const old = (row.title || "").slice(0, 40) || "(empty)";
        console.log(`  + ${row.id.slice(0, 8)}  "${old}" -> "${newTitle}"`);
      }
    } catch (e) {
      failed++;
      console.error(`  x ${row.id.slice(0, 8)}  ${e.message}`);
    }
    done++;
    if (done % 25 === 0) console.log(`    ... ${done}/${rows.length}`);
  });

  console.log(`[${table}] changed=${changed} skipped=${skipped} failed=${failed}`);
  return changed;
}

// ── Main ───────────────────────────────────────────────────────────────────
const sources = [
  { table: "reading_sessions", idCol: "id", textCol: "extracted_text", titleCol: "doc_title" },
];
if (includeRepository) {
  sources.push({ table: "text_repository", idCol: "id", textCol: "extracted_text", titleCol: "title" });
}

console.log(
  `model=${BACKFILL_AI_MODEL} concurrency=${concurrency} max-chars=${maxChars}` +
    `${dryRun ? " DRY-RUN" : ""}${onlyEmpty ? " only-empty" : ""}`,
);

let total = 0;
try {
  for (const src of sources) {
    total += await backfillTable(src);
  }
  console.log(`\nDone. ${total} row(s) ${dryRun ? "would change" : "changed"}.`);
  console.log("Next: run scripts/backfill-doc-titles-propagate.sql to refresh denormalized copies.");
} finally {
  await pool.end();
}
