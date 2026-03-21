import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { z } from "zod"
import { Uint8ArrayReader, TextWriter, ZipReader, configure as zipConfigure } from "@zip.js/zip.js"
import type { FileEntry } from "@zip.js/zip.js"
import { createRepositoryText } from "@/lib/repository"
import { getSchoolForUser } from "@/lib/users"

// Disable Web Workers — unavailable in the Next.js Node.js runtime.
// Disable CompressionStream — Next.js polyfills it incorrectly in some Node
// environments, causing "h is not a function" or similar stream errors.
zipConfigure({ useWebWorkers: false, useCompressionStream: false })

// ── Zod schema (matches the export shape from GET /api/repository/export) ────

const repositoryImportSchema = z.object({
  version: z.string(),
  exportedAt: z.number().optional(),
  texts: z.array(
    z.object({
      name: z.string().min(1),
      title: z.string().optional().default(""),
      extractedText: z.string().min(1),
      originalImages: z.array(z.string()).optional().default([]),
      isPublic: z.boolean().optional().default(false),
    })
  ),
})

/**
 * POST /api/repository/import
 *
 * Admin-only endpoint. Accepts either:
 *   - A multipart/form-data request with a `file` field containing a .zip
 *     backup (produced by GET /api/repository/export), or
 *   - A raw JSON body (legacy plain .json format, for backward compatibility).
 *
 * Each text entry is inserted via the existing createRepositoryText helper.
 * Already-existing texts are NOT deduplicated — this is an additive import.
 */
export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // ── Parse incoming payload (ZIP or JSON) ────────────────────────────────
  let body: unknown
  const contentType = request.headers.get("content-type") ?? ""

  if (contentType.includes("multipart/form-data")) {
    // ZIP file upload via form-data
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
    }

    const file = formData.get("file")
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    try {
      // Convert Blob → Uint8Array — Uint8ArrayReader is the Node.js-safe
      // alternative to BlobReader, which depends on browser Blob internals.
      const arrayBuffer = await file.arrayBuffer()
      const zipReader = new ZipReader(new Uint8ArrayReader(new Uint8Array(arrayBuffer)))
      const entries = await zipReader.getEntries()
      const jsonEntry = entries.find((e) => e.filename === "repository.json") as FileEntry | undefined
      if (!jsonEntry) {
        return NextResponse.json(
          { error: "repository.json not found inside ZIP" },
          { status: 422 }
        )
      }
      const jsonText = await jsonEntry.getData(new TextWriter())
      await zipReader.close()
      body = JSON.parse(jsonText)
    } catch {
      return NextResponse.json({ error: "Failed to read ZIP file" }, { status: 400 })
    }
  } else {
    // Legacy: raw JSON body (.json backups produced by the old client-side export)
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
  }

  // ── Validate payload ─────────────────────────────────────────────────────
  const parsed = repositoryImportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid import file format", details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { texts } = parsed.data
  if (texts.length === 0) {
    return NextResponse.json({ error: "No texts found in import file" }, { status: 422 })
  }

  // ── Insert each text ─────────────────────────────────────────────────────
  const schoolId = await getSchoolForUser(session.user.id)

  let successCount = 0
  let failCount = 0

  for (const textItem of texts) {
    try {
      await createRepositoryText(session.user.id, schoolId, {
        name: textItem.name,
        title: textItem.title ?? "",
        extractedText: textItem.extractedText,
        isPublic: textItem.isPublic ?? false,
        images: textItem.originalImages ?? [],
      })
      successCount++
    } catch (err) {
      console.error("Repository import: failed to insert text:", textItem.name, err)
      failCount++
    }
  }

  if (successCount === 0) {
    return NextResponse.json({ error: "All texts failed to import" }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    summary: {
      total: texts.length,
      imported: successCount,
      failed: failCount,
    },
  })
}
