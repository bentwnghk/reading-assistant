import ExcelJS from "exceljs"
import { saveAs } from "file-saver"

/**
 * Excel export for an assignment roster. Produces one sheet with one row per
 * student plus a header block describing the assignment metadata (title,
 * subject, due date, average progress).
 *
 * Styled consistently with `teacherDashboardExcel.ts` (same color palette and
 * score-cell coloring rules: green ≥ 70, red < 50, neutral in between).
 */

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF2D5A8A" },
}
const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 11,
  name: "Calibri",
}
const HEADER_ALIGNMENT: Partial<ExcelJS.Alignment> = {
  vertical: "middle",
  horizontal: "center",
  wrapText: true,
}
const ALT_ROW_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF5F9FC" },
}
const META_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE8F0F8" },
}
const GREEN_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFC6EFCE" },
}
const GREEN_FONT: Partial<ExcelJS.Font> = { color: { argb: "FF006100" } }
const RED_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFC7CE" },
}
const RED_FONT: Partial<ExcelJS.Font> = { color: { argb: "FF9C0006" } }

function colorScoreCell(cell: ExcelJS.Cell, score: number | null | undefined): void {
  if (score == null) {
    cell.value = "-"
    return
  }
  cell.value = score
  if (score >= 70) {
    cell.fill = GREEN_FILL
    cell.font = GREEN_FONT
  } else if (score < 50) {
    cell.fill = RED_FILL
    cell.font = RED_FONT
  }
}

function autoFitColumns(sheet: ExcelJS.Worksheet, maxWidth = 36): void {
  sheet.columns.forEach((col) => {
    let max = 10
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const v = cell.value
      const len =
        typeof v === "string"
          ? v.length
          : typeof v === "number"
            ? String(v).length
            : v instanceof Date
              ? 10
              : 8
      if (len > max) max = len
    })
    col.width = Math.min(max + 2, maxWidth)
  })
}

interface ExportOptions {
  assignment: {
    title: string
    subject?: string
    description?: string
    dueDate?: string | null
    avgProgress?: number
  }
  submissions: Array<{
    studentName?: string | null
    studentEmail?: string | null
    progress: number
    testScore?: number | null
    testCompleted?: boolean
    vocabularyQuizScore?: number | null
    spellingGameBestScore?: number | null
    grammarQuizScore?: number | null
    grammarGameBestScore?: number | null
    lastViewedAt?: string | null
  }>
  locale?: string
  t: (key: string, opts?: Record<string, unknown>) => string
  filename?: string
}

export async function exportAssignmentRoster(opts: ExportOptions): Promise<void> {
  const { assignment, submissions, locale = "en-US", t, filename } = opts

  const wb = new ExcelJS.Workbook()
  wb.creator = "Mr.🆖 ProReader"
  wb.created = new Date()

  const sheet = wb.addWorksheet("Assignment", {
    views: [{ state: "frozen", ySplit: 6 }],
  })

  // ─── Metadata block (rows 1–4) ────────────────────────────────────────────
  sheet.mergeCells("A1:H1")
  const titleCell = sheet.getCell("A1")
  titleCell.value = assignment.title
  titleCell.font = { bold: true, size: 16, color: { argb: "FF2D5A8A" } }
  titleCell.alignment = { vertical: "middle", horizontal: "left" }
  sheet.getRow(1).height = 24

  const metaRows: Array<[string, string | number]> = [
    [t("assignments.create.subjectLabel"), assignment.subject || "-"],
    [
      t("assignments.create.dueDateLabel"),
      assignment.dueDate
        ? new Date(assignment.dueDate).toLocaleDateString(locale, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : t("assignments.studentView.noDueDate"),
    ],
    [
      t("assignments.teacherView.avgProgress", {
        progress: assignment.avgProgress ?? 0,
      }),
      `${assignment.avgProgress ?? 0}%`,
    ],
  ]
  if (assignment.description) {
    metaRows.push([t("assignments.create.descriptionLabel"), assignment.description])
  }

  for (let i = 0; i < metaRows.length; i++) {
    const row = sheet.getRow(2 + i)
    const [label, value] = metaRows[i]
    const labelCell = row.getCell(1)
    labelCell.value = label
    labelCell.font = { bold: true }
    labelCell.fill = META_FILL
    sheet.mergeCells(`B${2 + i}:H${2 + i}`)
    const valueCell = row.getCell(2)
    valueCell.value = value
    valueCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true }
  }

  // Blank row before the table header
  const headerRowNum = 2 + metaRows.length + 1
  const headerRow = sheet.getRow(headerRowNum)
  const headers = [
    t("assignments.teacherView.student") || "Student",
    t("assignments.teacherView.progressCol"),
    t("assignments.teacherView.testScoreCol"),
    t("assignments.teacherView.vocabCol"),
    t("assignments.teacherView.spellingCol"),
    t("assignments.teacherView.grammarQuizCol"),
    t("assignments.teacherView.grammarGameCol"),
    t("assignments.teacherView.lastViewedCol"),
  ]
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
  })
  headerRow.height = 32
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.alignment = HEADER_ALIGNMENT
  })

  // ─── Data rows ────────────────────────────────────────────────────────────
  const sorted = [...submissions].sort((a, b) =>
    (a.studentName || a.studentEmail || "").localeCompare(
      b.studentName || b.studentEmail || "",
    ),
  )

  sorted.forEach((s, idx) => {
    const row = sheet.getRow(headerRowNum + 1 + idx)
    row.getCell(1).value = s.studentName || s.studentEmail || "—"
    if (s.studentEmail && s.studentName) {
      row.getCell(1).note = s.studentEmail
    }

    const progressCell = row.getCell(2)
    progressCell.value = s.progress / 100
    progressCell.numFmt = "0%"
    if (s.progress >= 70) {
      progressCell.fill = GREEN_FILL
      progressCell.font = GREEN_FONT
    } else if (s.progress < 50) {
      progressCell.fill = RED_FILL
      progressCell.font = RED_FONT
    }

    colorScoreCell(row.getCell(3), s.testScore)
    colorScoreCell(row.getCell(4), s.vocabularyQuizScore)
    colorScoreCell(row.getCell(5), s.spellingGameBestScore)
    colorScoreCell(row.getCell(6), s.grammarQuizScore)
    colorScoreCell(row.getCell(7), s.grammarGameBestScore)

    row.getCell(8).value = s.lastViewedAt
      ? new Date(s.lastViewedAt).toLocaleString(locale, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Hong_Kong",
        })
      : "-"

    if (idx % 2 === 1) {
      for (let i = 1; i <= 8; i++) {
        const cell = row.getCell(i)
        const fill = cell.fill as ExcelJS.Fill | undefined
        if (
          !fill ||
          fill.type !== "pattern" ||
          (fill.fgColor?.argb ?? "") === "FFFFFFFF"
        ) {
          cell.fill = ALT_ROW_FILL
        }
      }
    }
  })

  // Column widths
  sheet.columns = [
    { width: 28 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 22 },
  ]
  autoFitColumns(sheet)

  // ─── Write to file ────────────────────────────────────────────────────────
  const safeTitle = assignment.title.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 50) || "assignment"
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = await wb.xlsx.writeBuffer()
  saveAs(
    new Blob([blob], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename || `assignment_${safeTitle}_${stamp}.xlsx`,
  )
}
