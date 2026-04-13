import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import dayjs from "dayjs"
import type { TeacherDashboardMetrics } from "./teacherDashboardMetrics"

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ChartImageData {
  title: string
  base64: string // PNG image, base64-encoded (no data URI prefix)
  width: number  // original capture width in px
  height: number // original capture height in px
}

export interface TeacherDashboardExportOptions {
  metrics: TeacherDashboardMetrics
  chartImages: ChartImageData[]
  className?: string
  schoolName?: string
  filename?: string
}

// ─── Shared styles ────────────────────────────────────────────────────────────

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
const HEADER_BORDER: Partial<ExcelJS.Borders> = {
  bottom: { style: "medium", color: { argb: "FF1A3D5C" } },
}

const ALT_ROW_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF5F9FC" },
}
const ACCENT_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE8F0F8" },
}
const GREEN_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFC6EFCE" },
}
const GREEN_FONT: Partial<ExcelJS.Font> = { color: { argb: "FF006100" }, bold: true }
const RED_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFC7CE" },
}
const RED_FONT: Partial<ExcelJS.Font> = { color: { argb: "FF9C0006" }, bold: true }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyHeaderStyle(row: ExcelJS.Row): void {
  row.height = 28
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.alignment = HEADER_ALIGNMENT
    cell.border = HEADER_BORDER
  })
}

function applyDataCellStyle(
  cell: ExcelJS.Cell,
  colNumber: number,
  isAltRow: boolean,
  nameColIndex = 1
): void {
  cell.font = { size: 10, name: "Calibri" }
  cell.alignment = {
    vertical: "middle",
    horizontal: colNumber === nameColIndex ? "left" : "center",
  }
  cell.border = { bottom: { style: "thin", color: { argb: "FFD9D9D9" } } }
  if (isAltRow) cell.fill = ALT_ROW_FILL
}

function applyFooterRowStyle(row: ExcelJS.Row, nameColIndex = 1): void {
  row.height = 24
  row.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 11, name: "Calibri", color: { argb: "FF2D5A8A" } }
    cell.alignment = {
      vertical: "middle",
      horizontal: colNumber === nameColIndex ? "left" : "center",
    }
    cell.fill = ACCENT_FILL
    cell.border = { top: { style: "medium", color: { argb: "FF2D5A8A" } } }
  })
}

function colourScoreCell(cell: ExcelJS.Cell, threshold = 70): void {
  if (typeof cell.value !== "number") return
  cell.numFmt = '0"%"'
  if (cell.value >= threshold) {
    cell.fill = GREEN_FILL
    cell.font = { ...(cell.font as ExcelJS.Font), ...GREEN_FONT }
  } else {
    cell.fill = RED_FILL
    cell.font = { ...(cell.font as ExcelJS.Font), ...RED_FONT }
  }
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

// ─── Sheet builders ───────────────────────────────────────────────────────────

function buildChartsSheet(
  workbook: ExcelJS.Workbook,
  chartImages: ChartImageData[],
  schoolName?: string,
  className?: string
): void {
  const sheet = workbook.addWorksheet("Charts")
  sheet.columns = [{ width: 120 }]

  // Report title
  const titleRow = sheet.addRow(["Mr.\uD83C\uDD96 ProReader \u2014 Teacher Dashboard Charts"])
  titleRow.height = 36
  titleRow.getCell(1).font = { bold: true, size: 18, color: { argb: "FF2D5A8A" }, name: "Calibri" }
  titleRow.getCell(1).alignment = { vertical: "middle" }

  sheet.addRow([])

  if (schoolName) {
    const r = sheet.addRow([`School: ${schoolName}`])
    r.height = 20
    r.getCell(1).font = { size: 11, color: { argb: "FF444444" }, name: "Calibri" }
  }
  if (className) {
    const r = sheet.addRow([`Class: ${className}`])
    r.height = 20
    r.getCell(1).font = { size: 11, color: { argb: "FF444444" }, name: "Calibri" }
  }
  const genRow = sheet.addRow([`Generated: ${dayjs().format("YYYY-MM-DD HH:mm:ss")}`])
  genRow.height = 18
  genRow.getCell(1).font = { size: 10, color: { argb: "FF888888" }, italic: true, name: "Calibri" }

  sheet.addRow([])

  // Each chart: label row + reserved rows for image
  // Row height: 15 pt ≈ 20 px at 96 dpi
  const ROW_HEIGHT_PT = 15
  const ROW_HEIGHT_PX = 20
  const DISPLAY_WIDTH_PX = 880

  for (const chart of chartImages) {
    // ── Label row ──────────────────────────────────────────────────────────
    const labelRow = sheet.addRow([chart.title])
    labelRow.height = 24
    const labelCell = labelRow.getCell(1)
    labelCell.font = { bold: true, size: 12, color: { argb: "FF2D5A8A" }, name: "Calibri" }
    labelCell.fill = ACCENT_FILL
    labelCell.alignment = { vertical: "middle" }

    // ── Image placement ────────────────────────────────────────────────────
    // tl.row is 0-based; sheet.rowCount after addRow is 1-based count,
    // so the image starts at index (rowCount - 1) i.e. overlapping the label row end
    // We want to start BELOW the label row → use rowCount (0-based = after label)
    const imageStartRow = sheet.rowCount // 0-based index of the row AFTER the label

    const aspectRatio = chart.height / chart.width
    const displayHeight = Math.round(DISPLAY_WIDTH_PX * aspectRatio)
    const rowsNeeded = Math.ceil(displayHeight / ROW_HEIGHT_PX) + 2

    for (let i = 0; i < rowsNeeded; i++) {
      const r = sheet.addRow([])
      r.height = ROW_HEIGHT_PT
    }

    const imageId = workbook.addImage({ base64: chart.base64, extension: "png" })
    sheet.addImage(imageId, {
      tl: { col: 0, row: imageStartRow },
      ext: { width: DISPLAY_WIDTH_PX, height: displayHeight },
    })

    // Gap between charts
    sheet.addRow([])
    sheet.addRow([])
  }
}

function buildStudentOverviewSheet(
  workbook: ExcelJS.Workbook,
  metrics: TeacherDashboardMetrics
): void {
  const sheet = workbook.addWorksheet("Student Overview", {
    views: [{ state: "frozen", ySplit: 1 }],
  })

  const headers = [
    "Student",
    "Reading Texts",
    "Total Vocabulary",
    "Avg Progress",
    "Avg Test Score",
    "Avg Quiz Score",
    "Avg Spelling",
    "Total AI Actions",
  ]
  sheet.columns = headers.map((h) => ({ header: h, width: 20 }))
  applyHeaderStyle(sheet.getRow(1))

  metrics.students.forEach((s, idx) => {
    const avgTest = average(s.testScores)
    const avgQuiz = average(s.quizScores)
    const avgSpelling = average(s.spellingScores)
    const totalAi = Object.values(s.aiUsage).reduce((a, b) => a + b, 0)

    const row = sheet.addRow([
      s.userName,
      s.totalReadingTexts,
      s.totalVocabulary,
      s.avgProgress,
      avgTest ?? "-",
      avgQuiz ?? "-",
      avgSpelling ?? "-",
      totalAi,
    ])
    row.height = 22

    const isAlt = idx % 2 === 1
    row.eachCell((cell, colNumber) => applyDataCellStyle(cell, colNumber, isAlt))

    // Progress (col 4)
    const progressCell = row.getCell(4)
    if (typeof progressCell.value === "number") {
      progressCell.numFmt = '0"%"'
      if (progressCell.value >= 70) {
        progressCell.fill = GREEN_FILL
        progressCell.font = { ...(progressCell.font as ExcelJS.Font), ...GREEN_FONT }
      } else if (progressCell.value < 50) {
        progressCell.fill = RED_FILL
        progressCell.font = { ...(progressCell.font as ExcelJS.Font), ...RED_FONT }
      }
    }

    // Test score (col 5), Quiz score (col 6)
    colourScoreCell(row.getCell(5))
    colourScoreCell(row.getCell(6))
  })

  // Class average footer
  const allTest = metrics.students.flatMap((s) => s.testScores)
  const allQuiz = metrics.students.flatMap((s) => s.quizScores)
  const allSpelling = metrics.students.flatMap((s) => s.spellingScores)

  const footerRow = sheet.addRow([
    "Class Average",
    metrics.classAvgReadingTexts,
    metrics.classAvgVocabulary,
    metrics.classAvgProgress,
    average(allTest) ?? "-",
    average(allQuiz) ?? "-",
    average(allSpelling) ?? "-",
    "",
  ])
  applyFooterRowStyle(footerRow)
  const fpCell = footerRow.getCell(4)
  if (typeof fpCell.value === "number") fpCell.numFmt = '0"%"'
  ;[5, 6].forEach((col) => {
    const cell = footerRow.getCell(col)
    if (typeof cell.value === "number") cell.numFmt = '0"%"'
  })

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  }

  // Auto column width
  autoFitColumns(sheet)
}

function buildAiFeaturesSheet(
  workbook: ExcelJS.Workbook,
  metrics: TeacherDashboardMetrics
): void {
  const sheet = workbook.addWorksheet("AI Features", {
    views: [{ state: "frozen", ySplit: 1 }],
  })

  const headers = [
    "Student",
    "Summary",
    "Mind Map",
    "Adapted Text",
    "Simplified Text",
    "Sentence Analysis",
    "Glossary",
    "Tutor Questions",
    "Total",
  ]
  sheet.columns = headers.map((h) => ({ header: h, width: 18 }))
  applyHeaderStyle(sheet.getRow(1))

  metrics.students.forEach((s, idx) => {
    const total = Object.values(s.aiUsage).reduce((a, b) => a + b, 0)
    const row = sheet.addRow([
      s.userName,
      s.aiUsage.summary,
      s.aiUsage.mindMap,
      s.aiUsage.adaptedText,
      s.aiUsage.simplifiedText,
      s.aiUsage.sentenceAnalysis,
      s.aiUsage.glossary,
      s.aiUsage.tutorQuestion,
      total,
    ])
    row.height = 22
    const isAlt = idx % 2 === 1
    row.eachCell((cell, colNumber) => applyDataCellStyle(cell, colNumber, isAlt))
    // Bold total
    const totalCell = row.getCell(9)
    totalCell.font = { bold: true, size: 10, name: "Calibri" }
  })

  // Class totals footer
  const t = metrics.classTotalAiUsage
  const grandTotal = Object.values(t).reduce((a, b) => a + b, 0)
  const footerRow = sheet.addRow([
    "Class Total",
    t.summary,
    t.mindMap,
    t.adaptedText,
    t.simplifiedText,
    t.sentenceAnalysis,
    t.glossary,
    t.tutorQuestion,
    grandTotal,
  ])
  applyFooterRowStyle(footerRow)

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  }

  autoFitColumns(sheet)
}

function buildScoreDetailsSheet(
  workbook: ExcelJS.Workbook,
  metrics: TeacherDashboardMetrics
): void {
  const sheet = workbook.addWorksheet("Score Details", {
    views: [{ state: "frozen", ySplit: 1 }],
  })

  const headers = [
    "Student",
    "Tests Taken",
    "Avg Test Score",
    "Test Pass Rate",
    "Quiz Attempts",
    "Avg Quiz Score",
    "Spelling Attempts",
    "Avg Spelling",
    "Best Spelling",
  ]
  sheet.columns = headers.map((h) => ({ header: h, width: 20 }))
  applyHeaderStyle(sheet.getRow(1))

  metrics.students.forEach((s, idx) => {
    const avgTest = average(s.testScores)
    const testPassRate =
      s.testScores.length > 0
        ? Math.round((s.testScores.filter((v) => v >= 70).length / s.testScores.length) * 100)
        : null
    const avgQuiz = average(s.quizScores)
    const avgSpelling = average(s.spellingScores)
    const bestSpelling = s.spellingScores.length > 0 ? Math.max(...s.spellingScores) : null

    const row = sheet.addRow([
      s.userName,
      s.testScores.length,
      avgTest ?? "-",
      testPassRate !== null ? testPassRate : "-",
      s.quizScores.length,
      avgQuiz ?? "-",
      s.spellingScores.length,
      avgSpelling ?? "-",
      bestSpelling ?? "-",
    ])
    row.height = 22
    const isAlt = idx % 2 === 1
    row.eachCell((cell, colNumber) => applyDataCellStyle(cell, colNumber, isAlt))

    colourScoreCell(row.getCell(3)) // avg test
    colourScoreCell(row.getCell(4)) // pass rate
    colourScoreCell(row.getCell(6)) // avg quiz
  })

  // Class averages footer
  const allTest = metrics.students.flatMap((s) => s.testScores)
  const allQuiz = metrics.students.flatMap((s) => s.quizScores)
  const allSpelling = metrics.students.flatMap((s) => s.spellingScores)
  const classTestPassRate =
    allTest.length > 0
      ? Math.round((allTest.filter((v) => v >= 70).length / allTest.length) * 100)
      : null

  const footerRow = sheet.addRow([
    "Class Average",
    metrics.students.reduce((sum, s) => sum + s.testScores.length, 0),
    average(allTest) ?? "-",
    classTestPassRate !== null ? classTestPassRate : "-",
    metrics.students.reduce((sum, s) => sum + s.quizScores.length, 0),
    average(allQuiz) ?? "-",
    metrics.students.reduce((sum, s) => sum + s.spellingScores.length, 0),
    average(allSpelling) ?? "-",
    allSpelling.length > 0 ? Math.max(...allSpelling) : "-",
  ])
  applyFooterRowStyle(footerRow)
  ;[3, 4, 6].forEach((col) => {
    const cell = footerRow.getCell(col)
    if (typeof cell.value === "number") cell.numFmt = '0"%"'
  })

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  }

  autoFitColumns(sheet)
}

function autoFitColumns(sheet: ExcelJS.Worksheet): void {
  const colWidths: number[] = []
  sheet.eachRow((row) => {
    row.eachCell((cell, colNumber) => {
      const len = cell.value ? String(cell.value).length * 1.2 + 2 : 0
      const capped = Math.min(Math.max(len, 10), 50)
      if (!colWidths[colNumber - 1] || capped > colWidths[colNumber - 1]) {
        colWidths[colNumber - 1] = capped
      }
    })
  })
  colWidths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = Math.max(width, 12)
  })
}

// ─── Main export function ────────────────────────────────────────────────────

export async function exportTeacherDashboardToExcel(
  options: TeacherDashboardExportOptions
): Promise<void> {
  const { metrics, chartImages, className, schoolName, filename } = options

  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Mr.\uD83C\uDD96 ProReader"
  workbook.created = new Date()

  // Sheet order: Charts first, then data sheets
  buildChartsSheet(workbook, chartImages, schoolName, className)
  buildStudentOverviewSheet(workbook, metrics)
  buildAiFeaturesSheet(workbook, metrics)
  buildScoreDetailsSheet(workbook, metrics)

  // Generate filename
  const safeName = className
    ? className.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "-")
    : "Dashboard"
  const baseFilename = `Mr.NG-ProReader-${safeName}-${dayjs().format("YYYY-MM-DD-HHmmss")}`
  const exportFilename = filename ?? `${baseFilename}.xlsx`

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  saveAs(blob, exportFilename)
}
