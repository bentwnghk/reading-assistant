import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import dayjs from "dayjs"

interface SessionWithSchool {
  id: string
  userId: string
  userName?: string
  userEmail?: string
  docTitle: string
  studentAge: number
  extractedText?: string
  summary?: string
  testScore?: number
  testCompleted?: boolean
  vocabularyQuizScore?: number
  spellingGameBestScore?: number
  spellingGameAccuracy?: number
  grammarQuizScore?: number
  grammarQuizCompleted?: boolean
  grammarGameBestScore?: number
  grammarGameAccuracy?: number
  glossaryCount: number
  progress: number
  createdAt: number
  updatedAt: number
  schoolName?: string
}

interface ExportOptions {
  sessions: SessionWithSchool[]
  isAdmin: boolean
  filename?: string
  schoolName?: string
  className?: string
  spellingAttemptsByUser?: Record<string, number>
  /** Row-subject label ("Student" by default; pass "Teacher" for the teacher data export). */
  subjectLabel?: string
  /** Selected teacher name (teacher data export only). */
  teacherName?: string
}

interface SchoolBreakdownStats {
  count: number
  avgProgress: number
  avgVocabulary: number
  vocabularyCompletedCount: number
  avgSpellingScore: number
  spellingCompletedCount: number
  avgQuizScore: number
  quizCompletedCount: number
  avgTestScore: number
  testCompletedCount: number
  passRate: number
  avgGrammarQuizScore: number
  grammarQuizCompletedCount: number
}

interface SummaryStats {
  totalSessions: number
  avgProgress: number
  avgTestScore: number
  testCompletedCount: number
  passRate: number
  avgVocabulary: number
  vocabularyCompletedCount: number
  avgSpellingScore: number
  spellingCompletedCount: number
  avgSpellingAccuracy: number
  avgQuizScore: number
  quizCompletedCount: number
  avgGrammarQuizScore: number
  grammarQuizCompletedCount: number
  schoolBreakdown: Map<string, SchoolBreakdownStats>
}

function calculateSummaryStats(
  sessions: SessionWithSchool[],
  spellingAttemptsByUser?: Record<string, number>
): SummaryStats {
  const totalSessions = sessions.length

  if (totalSessions === 0) {
    return {
      totalSessions: 0,
      avgProgress: 0,
      avgTestScore: 0,
      testCompletedCount: 0,
      passRate: 0,
      avgVocabulary: 0,
      vocabularyCompletedCount: 0,
      avgSpellingScore: 0,
      spellingCompletedCount: 0,
      avgSpellingAccuracy: 0,
      avgQuizScore: 0,
      quizCompletedCount: 0,
      grammarQuizCompletedCount: 0,
      avgGrammarQuizScore: 0,
      schoolBreakdown: new Map(),
    }
  }

  const totalProgress = sessions.reduce((sum, s) => sum + s.progress, 0)
  const testCompletedSessions = sessions.filter(s => s.testCompleted && s.testScore !== undefined)
  const totalTestScore = testCompletedSessions.reduce((sum, s) => sum + (s.testScore || 0), 0)
  const passedTests = testCompletedSessions.filter(s => (s.testScore || 0) >= 70).length

  const vocabularySessions = sessions.filter(s => s.glossaryCount > 0)
  const totalVocabulary = vocabularySessions.reduce((sum, s) => sum + s.glossaryCount, 0)

  const spellingCompletedSessions = sessions.filter(s => s.spellingGameBestScore !== undefined && s.spellingGameBestScore > 0)
  const totalSpellingScore = spellingCompletedSessions.reduce((sum, s) => sum + (s.spellingGameBestScore || 0), 0)
  const spellingAccuracySessions = sessions.filter(s => s.spellingGameAccuracy !== undefined && s.spellingGameAccuracy > 0)
  const totalSpellingAccuracy = spellingAccuracySessions.reduce((sum, s) => sum + (s.spellingGameAccuracy || 0), 0)

  const quizCompletedSessions = sessions.filter(s => s.vocabularyQuizScore !== undefined && s.vocabularyQuizScore > 0)
  const totalQuizScore = quizCompletedSessions.reduce((sum, s) => sum + (s.vocabularyQuizScore || 0), 0)

  const grammarQuizCompletedSessions = sessions.filter(s => s.grammarQuizCompleted && (s.grammarQuizScore || 0) > 0)
  const totalGrammarQuizScore = grammarQuizCompletedSessions.reduce((sum, s) => sum + (s.grammarQuizScore || 0), 0)

  const schoolBreakdown = new Map<string, {
    count: number
    totalProgress: number
    totalTestScore: number
    testCount: number
    passedTests: number
    vocabularyCompletedCount: number
    totalVocabulary: number
    spellingCompletedCount: number
    totalSpellingScore: number
    quizCompletedCount: number
    totalQuizScore: number
    grammarQuizCompletedCount: number
    totalGrammarQuizScore: number
  }>()
  sessions.forEach(s => {
    const school = s.schoolName || "Unknown"
    const existing = schoolBreakdown.get(school) || {
      count: 0, totalProgress: 0, totalTestScore: 0, testCount: 0, passedTests: 0,
      vocabularyCompletedCount: 0, totalVocabulary: 0,
      spellingCompletedCount: 0, totalSpellingScore: 0,
      quizCompletedCount: 0, totalQuizScore: 0,
      grammarQuizCompletedCount: 0, totalGrammarQuizScore: 0,
    }
    existing.count++
    existing.totalProgress += s.progress
    if (s.testCompleted && s.testScore !== undefined) {
      existing.totalTestScore += s.testScore
      existing.testCount++
      if (s.testScore >= 70) existing.passedTests++
    }
    if (s.glossaryCount > 0) {
      existing.vocabularyCompletedCount++
      existing.totalVocabulary += s.glossaryCount
    }
    if (s.spellingGameBestScore !== undefined && s.spellingGameBestScore > 0) {
      existing.spellingCompletedCount++
      existing.totalSpellingScore += s.spellingGameBestScore
    }
    if (s.vocabularyQuizScore !== undefined && s.vocabularyQuizScore > 0) {
      existing.quizCompletedCount++
      existing.totalQuizScore += s.vocabularyQuizScore
    }
    if (s.grammarQuizCompleted && (s.grammarQuizScore || 0) > 0) {
      existing.grammarQuizCompletedCount++
      existing.totalGrammarQuizScore += s.grammarQuizScore!
    }
    schoolBreakdown.set(school, existing)
  })

  const schoolBreakdownFinal = new Map<string, SchoolBreakdownStats>()
  const schoolSpellingAttempts = new Map<string, number>()
  if (spellingAttemptsByUser) {
    const userSchoolMap = new Map<string, string>()
    for (const s of sessions) {
      if (!userSchoolMap.has(s.userId)) {
        userSchoolMap.set(s.userId, s.schoolName || "Unknown")
      }
    }
    for (const [userId, count] of Object.entries(spellingAttemptsByUser)) {
      const school = userSchoolMap.get(userId) || "Unknown"
      schoolSpellingAttempts.set(school, (schoolSpellingAttempts.get(school) || 0) + count)
    }
  }
  schoolBreakdown.forEach((value, key) => {
    schoolBreakdownFinal.set(key, {
      count: value.count,
      avgProgress: Math.round(value.totalProgress / value.count),
      avgVocabulary: value.vocabularyCompletedCount > 0 ? Math.round(value.totalVocabulary / value.vocabularyCompletedCount) : 0,
      vocabularyCompletedCount: value.vocabularyCompletedCount,
      avgSpellingScore: value.spellingCompletedCount > 0 ? Math.round(value.totalSpellingScore / value.spellingCompletedCount) : 0,
      spellingCompletedCount: spellingAttemptsByUser
        ? (schoolSpellingAttempts.get(key) || 0)
        : value.spellingCompletedCount,
      avgQuizScore: value.quizCompletedCount > 0 ? Math.round(value.totalQuizScore / value.quizCompletedCount) : 0,
      quizCompletedCount: value.quizCompletedCount,
      avgGrammarQuizScore: value.grammarQuizCompletedCount > 0 ? Math.round(value.totalGrammarQuizScore / value.grammarQuizCompletedCount) : 0,
      grammarQuizCompletedCount: value.grammarQuizCompletedCount,
      avgTestScore: value.testCount > 0 ? Math.round(value.totalTestScore / value.testCount) : 0,
      testCompletedCount: value.testCount,
      passRate: value.testCount > 0 ? Math.round((value.passedTests / value.testCount) * 100) : 0,
    })
  })

  return {
    totalSessions,
    avgProgress: Math.round(totalProgress / totalSessions),
    avgTestScore: testCompletedSessions.length > 0 ? Math.round(totalTestScore / testCompletedSessions.length) : 0,
    testCompletedCount: testCompletedSessions.length,
    passRate: testCompletedSessions.length > 0 ? Math.round((passedTests / testCompletedSessions.length) * 100) : 0,
    avgVocabulary: vocabularySessions.length > 0 ? Math.round(totalVocabulary / vocabularySessions.length) : 0,
    vocabularyCompletedCount: vocabularySessions.length,
    avgSpellingScore: spellingCompletedSessions.length > 0 ? Math.round(totalSpellingScore / spellingCompletedSessions.length) : 0,
    spellingCompletedCount: spellingAttemptsByUser
      ? Object.values(spellingAttemptsByUser).reduce((sum, n) => sum + n, 0)
      : spellingCompletedSessions.length,
    avgSpellingAccuracy: spellingAccuracySessions.length > 0 ? Math.round(totalSpellingAccuracy / spellingAccuracySessions.length) : 0,
    avgQuizScore: quizCompletedSessions.length > 0 ? Math.round(totalQuizScore / quizCompletedSessions.length) : 0,
    quizCompletedCount: quizCompletedSessions.length,
    avgGrammarQuizScore: grammarQuizCompletedSessions.length > 0 ? Math.round(totalGrammarQuizScore / grammarQuizCompletedSessions.length) : 0,
    grammarQuizCompletedCount: grammarQuizCompletedSessions.length,
    schoolBreakdown: schoolBreakdownFinal,
  }
}

export async function exportStudentDataToExcel(options: ExportOptions): Promise<void> {
  const { sessions, isAdmin, filename, schoolName, className, teacherName, spellingAttemptsByUser } = options
  const subjectLabel = options.subjectLabel || "Student"

  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Mr.🆖 ProReader"
  workbook.created = new Date()

  const dataSheet = workbook.addWorksheet(`${subjectLabel} Data`, {
    views: [{ state: "frozen", ySplit: 1 }],
  })

  const headers = isAdmin
    ? ["School", subjectLabel, "Email", "Reading Text", "Learning Progress", "Vocabulary Count", "Spelling Challenge", "Spelling Challenge Accuracy", "Vocabulary Quiz", "Grammar Quiz", "Grammar Game", "Grammar Game Accuracy", "Reading Test", "Last Update"]
    : [subjectLabel, "Email", "Reading Text", "Learning Progress", "Vocabulary Count", "Spelling Challenge", "Spelling Challenge Accuracy", "Vocabulary Quiz", "Grammar Quiz", "Grammar Game", "Grammar Game Accuracy", "Reading Test", "Last Update"]

  dataSheet.columns = headers.map(header => ({
    header,
    width: 18,
  }))

  const headerRow = dataSheet.getRow(1)
  headerRow.height = 28
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2D5A8A" },
    }
    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 11,
      name: "Calibri",
    }
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    }
    cell.border = {
      bottom: { style: "medium", color: { argb: "FF1A3D5C" } },
    }
  })

  const greenFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFC6EFCE" },
  }
  const greenFont: Partial<ExcelJS.Font> = {
    color: { argb: "FF006100" },
    bold: true,
  }
  const redFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFC7CE" },
  }
  const redFont: Partial<ExcelJS.Font> = {
    color: { argb: "FF9C0006" },
    bold: true,
  }
  const altRowFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF5F9FC" },
  }

  sessions.forEach((session, index) => {
    const rowData = isAdmin
      ? [
          session.schoolName || "-",
          session.userName || "-",
          session.userEmail || "-",
          session.docTitle,
          session.progress,
          session.glossaryCount,
          session.spellingGameBestScore || "-",
          (session.spellingGameAccuracy || 0) > 0 ? `${session.spellingGameAccuracy}%` : "-",
          session.vocabularyQuizScore !== undefined && session.vocabularyQuizScore > 0 ? session.vocabularyQuizScore : "-",
          session.grammarQuizCompleted && (session.grammarQuizScore || 0) > 0 ? session.grammarQuizScore : "-",
          (session.grammarGameBestScore || 0) > 0 ? session.grammarGameBestScore : "-",
          (session.grammarGameAccuracy || 0) > 0 ? `${session.grammarGameAccuracy}%` : "-",
          session.testCompleted && session.testScore !== undefined ? session.testScore : "-",
          dayjs(session.updatedAt).format("YYYY-MM-DD HH:mm"),
        ]
      : [
          session.userName || "-",
          session.userEmail || "-",
          session.docTitle,
          session.progress,
          session.glossaryCount,
          session.spellingGameBestScore || "-",
          (session.spellingGameAccuracy || 0) > 0 ? `${session.spellingGameAccuracy}%` : "-",
          session.vocabularyQuizScore !== undefined && session.vocabularyQuizScore > 0 ? session.vocabularyQuizScore : "-",
          session.grammarQuizCompleted && (session.grammarQuizScore || 0) > 0 ? session.grammarQuizScore : "-",
          (session.grammarGameBestScore || 0) > 0 ? session.grammarGameBestScore : "-",
          (session.grammarGameAccuracy || 0) > 0 ? `${session.grammarGameAccuracy}%` : "-",
          session.testCompleted && session.testScore !== undefined ? session.testScore : "-",
          dayjs(session.updatedAt).format("YYYY-MM-DD HH:mm"),
        ]

    const row = dataSheet.addRow(rowData)
    row.height = 22

    const isAltRow = index % 2 === 1

    row.eachCell((cell, colNumber) => {
      const docTitleColIndex = isAdmin ? 4 : 3
      cell.alignment = {
        vertical: "middle",
        horizontal: colNumber === docTitleColIndex ? "left" : "center",
      }
      cell.font = {
        size: 10,
        name: "Calibri",
      }
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
      }

      if (isAltRow) {
        cell.fill = altRowFill
      }

      const progressColIndex = isAdmin ? 5 : 4
      const spellingAccuracyColIndex = isAdmin ? 8 : 7
      const quizColIndex = isAdmin ? 9 : 8
      const grammarColIndex = isAdmin ? 10 : 9
      const grammarGameColIndex = isAdmin ? 11 : 10
      const grammarGameAccuracyColIndex = isAdmin ? 12 : 11
      const testColIndex = isAdmin ? 13 : 12

      if (colNumber === progressColIndex && typeof cell.value === "number") {
        cell.numFmt = "0\"%\""
        if (cell.value >= 70) {
          cell.fill = greenFill
          cell.font = { ...cell.font as ExcelJS.Font, ...greenFont }
        } else if (cell.value < 50) {
          cell.fill = redFill
          cell.font = { ...cell.font as ExcelJS.Font, ...redFont }
        }
      }

      if (colNumber === testColIndex && typeof cell.value === "number") {
        cell.numFmt = "0\"%\""
        if (cell.value >= 70) {
          cell.fill = greenFill
          cell.font = { ...cell.font as ExcelJS.Font, ...greenFont }
        } else {
          cell.fill = redFill
          cell.font = { ...cell.font as ExcelJS.Font, ...redFont }
        }
      }

      if (colNumber === quizColIndex && typeof cell.value === "number") {
        cell.numFmt = "0\"%\""
        if (cell.value >= 70) {
          cell.fill = greenFill
          cell.font = { ...cell.font as ExcelJS.Font, ...greenFont }
        } else {
          cell.fill = redFill
          cell.font = { ...cell.font as ExcelJS.Font, ...redFont }
        }
      }

      if (colNumber === grammarColIndex && typeof cell.value === "number") {
        cell.numFmt = "0\"%\""
        if (cell.value >= 70) {
          cell.fill = greenFill
          cell.font = { ...cell.font as ExcelJS.Font, ...greenFont }
        } else {
          cell.fill = redFill
          cell.font = { ...cell.font as ExcelJS.Font, ...redFont }
        }
      }

      if (colNumber === grammarGameColIndex && typeof cell.value === "number") {
        if (cell.value >= 70) {
          cell.fill = greenFill
          cell.font = { ...cell.font as ExcelJS.Font, ...greenFont }
        }
      }

      if ((colNumber === grammarGameAccuracyColIndex || colNumber === spellingAccuracyColIndex) && typeof cell.value === "string" && cell.value !== "-") {
        const accVal = parseInt(cell.value, 10)
        if (!isNaN(accVal)) {
          if (accVal >= 70) {
            cell.fill = greenFill
            cell.font = { ...cell.font as ExcelJS.Font, ...greenFont }
          } else {
            cell.fill = redFill
            cell.font = { ...cell.font as ExcelJS.Font, ...redFont }
          }
        }
      }
    })
  })

  dataSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  }

  const colWidths: number[] = []
  dataSheet.eachRow((row, _rowNum) => {
    row.eachCell((cell, colNumber) => {
      const cellValue = cell.value ? String(cell.value) : ""
      const cellWidth = Math.min(Math.max(cellValue.length * 1.2 + 2, 10), 50)
      if (!colWidths[colNumber - 1] || cellWidth > colWidths[colNumber - 1]) {
        colWidths[colNumber - 1] = cellWidth
      }
    })
  })
  colWidths.forEach((width, index) => {
    dataSheet.getColumn(index + 1).width = Math.max(width, 12)
  })

  const summarySheet = workbook.addWorksheet("Summary")
  const stats = calculateSummaryStats(sessions, spellingAttemptsByUser)

  summarySheet.columns = [
    { width: 40 },
    { width: 25 },
  ]

  const titleRow = summarySheet.addRow([`Mr.🆖 ProReader ${subjectLabel} Data Report`])
  titleRow.height = 32
  titleRow.getCell(1).font = {
    bold: true,
    size: 18,
    color: { argb: "FF2D5A8A" },
    name: "Calibri",
  }
  titleRow.getCell(1).alignment = { vertical: "middle" }

  summarySheet.addRow([])
  if (schoolName || className || teacherName) {
    if (schoolName) {
      const schoolRow = summarySheet.addRow(["School:", schoolName])
      schoolRow.getCell(1).font = { bold: true, size: 11, color: { argb: "FF666666" } }
      schoolRow.getCell(2).font = { size: 11, color: { argb: "FF333333" } }
    }
    if (className) {
      const classRow = summarySheet.addRow(["Class:", className])
      classRow.getCell(1).font = { bold: true, size: 11, color: { argb: "FF666666" } }
      classRow.getCell(2).font = { size: 11, color: { argb: "FF333333" } }
    }
    if (teacherName) {
      const teacherRow = summarySheet.addRow(["Teacher:", teacherName])
      teacherRow.getCell(1).font = { bold: true, size: 11, color: { argb: "FF666666" } }
      teacherRow.getCell(2).font = { size: 11, color: { argb: "FF333333" } }
    }
    summarySheet.addRow([])
  }
  const dateRow = summarySheet.addRow(["Generated:", dayjs().format("YYYY-MM-DD HH:mm:ss")])
  dateRow.getCell(1).font = { bold: true, size: 10, color: { argb: "FF666666" } }
  dateRow.getCell(2).font = { size: 10, color: { argb: "FF666666" } }

  summarySheet.addRow([])
  summarySheet.addRow([])

  const statsHeader = summarySheet.addRow(["Statistics Overview"])
  statsHeader.height = 24
  statsHeader.getCell(1).font = {
    bold: true,
    size: 14,
    color: { argb: "FF2D5A8A" },
    name: "Calibri",
  }

  summarySheet.addRow([])

 const statsData: [string, string | number][] = [
    ["Total Reading Sessions", stats.totalSessions],
    ["Average Learning Progress", `${stats.avgProgress}%`],
    ["Sessions with Vocabulary", stats.vocabularyCompletedCount],
    ["Average Vocabulary Collected", stats.avgVocabulary],
    ["Spelling Challenges Completed", stats.spellingCompletedCount],
    ["Average Spelling Challenge Score (Completed)", stats.avgSpellingScore],
    ["Average Spelling Challenge Accuracy (Completed)", `${stats.avgSpellingAccuracy}%`],
    ["Vocabulary Quizzes Completed", stats.quizCompletedCount],
    ["Average Vocabulary Quiz Score (Completed)", `${stats.avgQuizScore}%`],
    ["Grammar Quizzes Completed", stats.grammarQuizCompletedCount],
    ["Average Grammar Quiz Score (Completed)", `${stats.avgGrammarQuizScore}%`],
    ["Reading Tests Completed", stats.testCompletedCount],
    ["Average Reading Test Score (Completed)", `${stats.avgTestScore}%`],
    ["Reading Test Pass Rate (≥70%)", `${stats.passRate}%`],
  ]

  statsData.forEach(([label, value]) => {
    const row = summarySheet.addRow([label, value])
    row.getCell(1).font = { size: 11, name: "Calibri" }
    row.getCell(2).font = { bold: true, size: 11, name: "Calibri" }
    row.getCell(2).alignment = { horizontal: "right" }
    row.height = 20
  })

  if (isAdmin && stats.schoolBreakdown.size > 0) {
    summarySheet.addRow([])
    summarySheet.addRow([])

    const schoolHeader = summarySheet.addRow(["Breakdown by School"])
    schoolHeader.height = 24
    schoolHeader.getCell(1).font = {
      bold: true,
      size: 14,
      color: { argb: "FF2D5A8A" },
      name: "Calibri",
    }

    summarySheet.addRow([])

    const schoolTableHeader = summarySheet.addRow([
      "School Name", "Sessions", "Avg Progress", "Sessions with Vocabulary", "Avg Vocabulary Collected",
      "Spelling Challenges Completed", "Avg Spelling Score", "Vocabulary Quizzes Completed", "Avg Quiz Score",
      "Grammar Quizzes Completed", "Avg Grammar Quiz Score",
      "Reading Tests Completed", "Avg Test Score", "Pass Rate (≥70%)",
    ])
    schoolTableHeader.height = 22
    schoolTableHeader.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2D5A8A" },
      }
      cell.font = {
        bold: true,
        color: { argb: "FFFFFFFF" },
        size: 10,
        name: "Calibri",
      }
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
    })

    summarySheet.columns = [
      { width: 30 },
      { width: 12 },
      { width: 14 },
      { width: 22 },
      { width: 22 },
      { width: 26 },
      { width: 18 },
      { width: 26 },
      { width: 16 },
      { width: 22 },
      { width: 16 },
      { width: 18 },
    ]

    const sortedSchools = Array.from(stats.schoolBreakdown.entries()).sort((a, b) => b[1].count - a[1].count)

    sortedSchools.forEach(([schoolName, schoolStats], index) => {
      const row = summarySheet.addRow([
        schoolName, schoolStats.count, `${schoolStats.avgProgress}%`,
        schoolStats.vocabularyCompletedCount, schoolStats.avgVocabulary,
        schoolStats.spellingCompletedCount, schoolStats.avgSpellingScore,
        schoolStats.quizCompletedCount, `${schoolStats.avgQuizScore}%`,
        schoolStats.grammarQuizCompletedCount, `${schoolStats.avgGrammarQuizScore}%`,
        schoolStats.testCompletedCount, `${schoolStats.avgTestScore}%`, `${schoolStats.passRate}%`,
      ])
      row.height = 20
      row.eachCell((cell) => {
        cell.font = { size: 10, name: "Calibri" }
        cell.alignment = { horizontal: "center", vertical: "middle" }
        if (index % 2 === 1) {
          cell.fill = altRowFill
        }
      })
    })
  }

  summarySheet.addRow([])
  summarySheet.addRow([])
  const footerRow = summarySheet.addRow(["Report generated by Mr.🆖 ProReader"])
  footerRow.getCell(1).font = {
    italic: true,
    size: 9,
    color: { argb: "FF999999" },
    name: "Calibri",
  }

  const baseFilename = className
    ? `Mr.NG-ProReader-${className.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "-")}-${dayjs().format("YYYY-MM-DD-HHmmss")}`
    : teacherName
      ? `Mr.NG-ProReader-${teacherName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "-")}-${dayjs().format("YYYY-MM-DD-HHmmss")}`
      : `Mr.NG-ProReader-${subjectLabel.toLowerCase()}-data-${dayjs().format("YYYY-MM-DD-HHmmss")}`
  const exportFilename = filename || `${baseFilename}.xlsx`

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  saveAs(blob, exportFilename)
}
