import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getClient, bufferToBase64 } from "@/lib/db"
import { Uint8ArrayWriter, TextReader, ZipWriter, configure as zipConfigure } from "@zip.js/zip.js"

// Disable Web Workers — unavailable in the Next.js Node.js runtime.
// Disable CompressionStream — Next.js polyfills it incorrectly in some Node
// environments, causing "h is not a function" or similar stream errors.
zipConfigure({ useWebWorkers: false, useCompressionStream: false })

/**
 * GET /api/repository/export
 *
 * Admin-only endpoint that exports all text_repository entries (including their
 * images) visible in the admin's scope as a single JSON document compressed
 * inside a .zip file.
 *
 * Export shape (version "1.0"):
 * {
 *   version: "1.0",
 *   exportedAt: <number ms>,
 *   texts: [{
 *     name, title, extractedText,
 *     originalImages,   // base64 data-URIs
 *     isPublic,
 *   }]
 * }
 */
export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const client = await getClient()
  try {
    // Fetch all text_repository rows (admin sees everything)
    const textRows = await client.query(
      `SELECT id, name, title, extracted_text, is_public
       FROM text_repository
       ORDER BY created_at ASC`
    )

    // Fetch all images for those texts in one query, keyed by text_id
    const imageRows = await client.query(
      `SELECT text_id, image_data, image_order, content_type
       FROM text_repository_images
       ORDER BY text_id, image_order ASC`
    )

    // Group images by text_id
    const imagesByTextId = new Map<string, Array<{ image_data: Buffer; image_order: number; content_type: string }>>()
    for (const row of imageRows.rows as Array<{ text_id: string; image_data: Buffer; image_order: number; content_type: string }>) {
      const arr = imagesByTextId.get(row.text_id) ?? []
      arr.push(row)
      imagesByTextId.set(row.text_id, arr)
    }

    // Assemble texts payload
    const texts = (textRows.rows as Array<{ id: string; name: string; title: string; extracted_text: string; is_public: boolean }>).map((row) => {
      const imgs = imagesByTextId.get(row.id) ?? []
      const originalImages = imgs
        .sort((a, b) => a.image_order - b.image_order)
        .map((img) => bufferToBase64(img.image_data, img.content_type ?? "image/png"))
      return {
        name: row.name,
        title: row.title || "",
        extractedText: row.extracted_text,
        originalImages,
        isPublic: Boolean(row.is_public),
      }
    })

    const payload = {
      version: "1.0",
      exportedAt: Date.now(),
      texts,
    }

    // Compress into a ZIP using Uint8ArrayWriter (not BlobWriter — Blob is a
    // browser API unavailable in the Next.js Node.js server runtime).
    const zipWriter = new ZipWriter(new Uint8ArrayWriter())
    await zipWriter.add("repository.json", new TextReader(JSON.stringify(payload)))
    const zipBuffer = await zipWriter.close()

    const now = new Date()
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    const filename = `text-repository-export-${ts}.zip`

    return new Response(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Repository export failed:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  } finally {
    client.release()
  }
}
