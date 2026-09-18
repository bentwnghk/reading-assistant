"use client"

import { useTranslation } from "react-i18next"
import {
  Check,
  ClipboardList,
  FileText,
  Gamepad2,
  Keyboard,
  Loader2,
  Swords,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * Shared per-question drill-down dialogs for a student's session results
 * (reading test, vocabulary quiz, grammar quiz, spelling, grammar games).
 * Render questions with the student's answers color-coded green/red —
 * extracted from the User Management Student Data tab so the assignment
 * details roster table can reuse the exact same drill-down UX.
 */

function isGrammarAnswerCorrect(q: GrammarQuizQuestion): boolean {
  if (q.type === "rewrite" || q.type === "fill-in") {
    return (q.earnedPoints ?? 0) >= q.points
  }
  const ua = q.userAnswer?.toLowerCase().trim()
  const ca = q.correctAnswer.toLowerCase().trim()
  return ua === ca || ua === ca.charAt(0)
}

function isReadingTestAnswerCorrect(q: ReadingTestQuestion): boolean {
  if (q.type === "short-answer") {
    return (q.earnedPoints ?? 0) >= q.points
  }
  const ua = q.userAnswer?.toLowerCase().trim().replace(/[-\s]+/g, "-")
  const ca = q.correctAnswer.toLowerCase().trim().replace(/[-\s]+/g, "-")
  if (q.type === "multiple-choice" || q.type === "inference" || q.type === "vocab-context" || q.type === "referencing") {
    return ua === ca || ua === ca.charAt(0)
  }
  return ua === ca
}

export interface VocabQuizDrillDownData {
  title: string
  student?: string
  score?: number
  questions?: VocabularyQuizQuestion[]
}

export interface GrammarQuizDrillDownData {
  title: string
  student?: string
  score?: number
  questions?: GrammarQuizQuestion[]
}

export interface ReadingTestDrillDownData {
  title: string
  student?: string
  score?: number
  questions?: ReadingTestQuestion[]
}

export interface SpellingDrillDownData {
  title: string
  student?: string
  score?: number
  accuracy?: number
  results?: SpellingResultEntry[]
}

export interface GrammarGameDrillDownData {
  title: string
  student?: string
  score?: number
  accuracy?: number
  results?: GrammarResultEntry[]
}

export function VocabQuizDrillDownDialog({
  data,
  onClose,
}: {
  data: VocabQuizDrillDownData | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={!!data} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <ClipboardList className="h-5 w-5 shrink-0" />
            <span className="truncate">{data?.title}</span>
            {data?.score !== undefined && (
              <Badge variant={data.score >= 70 ? "default" : "destructive"} className="ml-auto">
                {data.score}%
              </Badge>
            )}
          </DialogTitle>
          {data?.student && (
            <DialogDescription>{data.student}</DialogDescription>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto mt-2 space-y-3">
          {data?.questions === undefined ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : data.questions.length > 0 ? (
            data.questions.map((q, idx) => {
              const isCorrect = q.userAnswer === q.correctAnswer
              return (
                <div key={q.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-muted-foreground shrink-0 mt-0.5">Q{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{q.question}</p>
                      <div className="mt-2 space-y-1">
                        {q.options.map((opt) => {
                          const isUserAnswer = opt === q.userAnswer
                          const isCorrectAnswer = opt === q.correctAnswer
                          return (
                            <div
                              key={opt}
                              className={`text-xs px-2 py-1 rounded flex items-center gap-1.5 ${
                                isCorrectAnswer
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium"
                                  : isUserAnswer
                                    ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {isCorrectAnswer && <Check className="h-3 w-3 shrink-0" />}
                              {isUserAnswer && !isCorrectAnswer && <X className="h-3 w-3 shrink-0" />}
                              <span>{opt}</span>
                            </div>
                          )
                        })}
                      </div>
                      {q.userAnswer === undefined && (
                        <p className="text-xs text-red-500 dark:text-red-400 italic mt-1">{t("userManagement.studentData.noAnswer")}</p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {isCorrect ? (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-red-500 dark:text-red-400" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("userManagement.studentData.noVocabQuiz")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function GrammarQuizDrillDownDialog({
  data,
  onClose,
}: {
  data: GrammarQuizDrillDownData | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={!!data} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <ClipboardList className="h-5 w-5 shrink-0" />
            <span className="truncate">{data?.title}</span>
            {data?.score !== undefined && (
              <Badge variant={data.score >= 70 ? "default" : "destructive"} className="ml-auto">
                {data.score}%
              </Badge>
            )}
          </DialogTitle>
          {data?.student && (
            <DialogDescription>{data.student}</DialogDescription>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto mt-2 space-y-3">
          {data?.questions === undefined ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : data.questions.length > 0 ? (
            data.questions.map((q, idx) => {
              const hasOptions = q.options && q.options.length > 0
              const isCorrect = isGrammarAnswerCorrect(q)
              return (
                <div key={q.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-muted-foreground shrink-0 mt-0.5">Q{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      {q.topicName && <span className="text-xs text-muted-foreground">{q.topicName}</span>}
                      <p className="text-sm font-medium">{q.question}</p>
                      <div className="mt-2 space-y-1">
                        {hasOptions ? (
                          q.options!.map((opt) => {
                            const optLetter = opt.charAt(0).toUpperCase()
                            const isUserAnswer = opt === q.userAnswer || optLetter === q.userAnswer?.toUpperCase().trim()
                            const isCorrectAnswer = opt === q.correctAnswer || optLetter === q.correctAnswer.toUpperCase().trim()
                            return (
                              <div key={opt} className={`text-xs px-2 py-1 rounded flex items-center gap-1.5 ${isCorrectAnswer ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium" : isUserAnswer ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" : "text-muted-foreground"}`}>
                                {isCorrectAnswer && <Check className="h-3 w-3 shrink-0" />}
                                {isUserAnswer && !isCorrectAnswer && <X className="h-3 w-3 shrink-0" />}
                                <span>{opt}</span>
                              </div>
                            )
                          })
                        ) : (
                          <div className="space-y-1">
                            {q.userAnswer !== undefined && (
                              <div className={`text-xs px-2 py-1 rounded flex items-center gap-1.5 ${isCorrect ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}>
                                {isCorrect ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
                                <span>{q.userAnswer}</span>
                              </div>
                            )}
                            {!isCorrect && (
                              <div className="text-xs px-2 py-1 rounded flex items-center gap-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                                <Check className="h-3 w-3 shrink-0" />
                                <span>{q.correctAnswer}</span>
                              </div>
                            )}
                            {q.userAnswer === undefined && <p className="text-xs text-red-500 dark:text-red-400 italic">{t("userManagement.studentData.noAnswer")}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {isCorrect ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <X className="h-4 w-4 text-red-500 dark:text-red-400" />}
                      {q.earnedPoints !== undefined && <span className="text-xs text-muted-foreground block mt-1">{q.earnedPoints}/{q.points}</span>}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("userManagement.studentData.noGrammarQuiz")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ReadingTestDrillDownDialog({
  data,
  onClose,
}: {
  data: ReadingTestDrillDownData | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={!!data} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <FileText className="h-5 w-5 shrink-0" />
            <span className="truncate">{data?.title}</span>
            {data?.score !== undefined && (
              <Badge variant={data.score >= 70 ? "default" : "destructive"} className="ml-auto">
                {data.score}%
              </Badge>
            )}
          </DialogTitle>
          {data?.student && (
            <DialogDescription>{data.student}</DialogDescription>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto mt-2 space-y-3">
          {data?.questions === undefined ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : data.questions.length > 0 ? (
            data.questions.map((q, idx) => {
              const hasOptions = q.options && q.options.length > 0
              const isCorrect = isReadingTestAnswerCorrect(q)
              return (
                <div key={q.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-muted-foreground shrink-0 mt-0.5">Q{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{q.question}</p>
                      <div className="mt-2 space-y-1">
                        {hasOptions ? (
                          q.options!.map((opt) => {
                            const optLetter = opt.charAt(0).toUpperCase()
                            const isUserAnswer = opt === q.userAnswer || optLetter === q.userAnswer?.toUpperCase().trim()
                            const isCorrectAnswer = opt === q.correctAnswer || optLetter === q.correctAnswer.toUpperCase().trim()
                            return (
                              <div key={opt} className={`text-xs px-2 py-1 rounded flex items-center gap-1.5 ${isCorrectAnswer ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium" : isUserAnswer ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" : "text-muted-foreground"}`}>
                                {isCorrectAnswer && <Check className="h-3 w-3 shrink-0" />}
                                {isUserAnswer && !isCorrectAnswer && <X className="h-3 w-3 shrink-0" />}
                                <span>{opt}</span>
                              </div>
                            )
                          })
                        ) : (
                          <div className="space-y-1">
                            {q.userAnswer !== undefined && (
                              <div className={`text-xs px-2 py-1 rounded flex items-center gap-1.5 ${isCorrect ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}>
                                {isCorrect ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
                                <span>{q.userAnswer}</span>
                              </div>
                            )}
                            {!isCorrect && (
                              <div className="text-xs px-2 py-1 rounded flex items-center gap-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                                <Check className="h-3 w-3 shrink-0" />
                                <span>{q.correctAnswer}</span>
                              </div>
                            )}
                            {q.userAnswer === undefined && <p className="text-xs text-red-500 dark:text-red-400 italic">{t("userManagement.studentData.noAnswer")}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {isCorrect ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <X className="h-4 w-4 text-red-500 dark:text-red-400" />}
                      {q.earnedPoints !== undefined && <span className="text-xs text-muted-foreground block mt-1">{q.earnedPoints}/{q.points}</span>}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("userManagement.studentData.noReadingTest")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Badge for spelling drill-downs whose latest record came from a multiplayer
 * battle. Entries are tagged `source: "battle"` + the session-overlap
 * fraction when persisted (SpellingBattleFlow), so a teacher can tell at a
 * glance that the score was a battle and how much of it was this text's
 * words — an attributed battle at e.g. 60% means the rest came from the
 * host's selection. Renders nothing for solo/legacy records.
 */
export function BattleSourceBadge({ results }: { results?: SpellingResultEntry[] }) {
  const { t } = useTranslation()
  const battle = results?.find((r) => r.source === "battle")
  if (!battle) return null
  const overlap = Math.round((battle.overlap ?? 0) * 100)
  return (
    <Badge variant="outline" className="shrink-0 gap-1 whitespace-nowrap">
      <Swords className="h-3 w-3" />
      {t("userManagement.spellingBattleSource", { overlap })}
    </Badge>
  )
}

export function SpellingDrillDownDialog({
  data,
  onClose,
}: {
  data: SpellingDrillDownData | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={!!data} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <Keyboard className="h-5 w-5 shrink-0" />
            <span className="truncate">{data?.title}</span>
            {data?.score !== undefined && (
              <Badge variant="secondary" className="ml-auto">
                {data.score}
              </Badge>
            )}
            {data?.accuracy !== undefined && data.accuracy > 0 && (
              <Badge variant={data.accuracy >= 70 ? "default" : "destructive"}>
                {data.accuracy}%
              </Badge>
            )}
            <BattleSourceBadge results={data?.results} />
          </DialogTitle>
          {data?.student && (
            <DialogDescription>{data.student}</DialogDescription>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto mt-2 space-y-3">
          {data?.results === undefined ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : data.results.length > 0 ? (
            data.results.map((r, idx) => (
              <div key={`${r.word}-${idx}`} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-muted-foreground shrink-0 mt-0.5">W{idx + 1}</span>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium">{r.word}</p>
                    {r.mode && (
                      <span className="text-xs text-muted-foreground">{t(`reading.glossary.spelling.modes.${r.mode}`)}</span>
                    )}
                    {r.userAnswer ? (
                      <div className={`text-xs px-2 py-1 rounded flex items-center gap-1.5 ${r.correct ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}>
                        {r.correct ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
                        <span>{r.userAnswer}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-red-500 dark:text-red-400 italic">{t("userManagement.studentData.noAnswer")}</p>
                    )}
                    {!r.correct && (
                      <div className="text-xs px-2 py-1 rounded flex items-center gap-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                        <Check className="h-3 w-3 shrink-0" />
                        {/* Fill-blanks: the correct answer is just the blanked
                         *  letters the player had to type, not the whole word
                         *  (falls back to the word for battle/legacy entries
                         *  recorded without blankPositions). */}
                        <span className="break-words">
                          {r.mode === "fill-blanks" && r.blankPositions?.length
                            ? r.blankPositions.map((p) => r.word[p]).join("")
                            : r.word}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {r.correct ? (
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <X className="h-4 w-4 text-red-500 dark:text-red-400" />
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("userManagement.studentData.noSpellingResults")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function GrammarGameDrillDownDialog({
  data,
  onClose,
}: {
  data: GrammarGameDrillDownData | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={!!data} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <Gamepad2 className="h-5 w-5 shrink-0" />
            <span className="truncate">{data?.title}</span>
            {data?.score !== undefined && (
              <Badge variant="secondary" className="ml-auto">
                {data.score}
              </Badge>
            )}
            {data?.accuracy !== undefined && data.accuracy > 0 && (
              <Badge variant={data.accuracy >= 70 ? "default" : "destructive"}>
                {data.accuracy}%
              </Badge>
            )}
          </DialogTitle>
          {data?.student && (
            <DialogDescription>{data.student}</DialogDescription>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto mt-2 space-y-3">
          {data?.results === undefined ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : data.results.length > 0 ? (
            data.results.map((r, idx) => (
              <div key={`${r.game}-${idx}`} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-muted-foreground shrink-0 mt-0.5">Q{idx + 1}</span>
                  <div className="flex-1 min-w-0 space-y-1">
                    {r.game && (
                      <span className="text-xs text-muted-foreground">{t(`reading.grammar.games.${r.game}.name`)}</span>
                    )}
                    <p className="text-sm font-medium break-words whitespace-pre-wrap">{r.question}</p>
                    {r.userAnswer ? (
                      <div className={`text-xs px-2 py-1 rounded flex items-center gap-1.5 ${r.correct ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}>
                        {r.correct ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
                        <span className="break-words">{r.userAnswer}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-red-500 dark:text-red-400 italic">{t("userManagement.studentData.noAnswer")}</p>
                    )}
                    {!r.correct && r.correctAnswer && (
                      <div className="text-xs px-2 py-1 rounded flex items-center gap-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                        <Check className="h-3 w-3 shrink-0" />
                        <span className="break-words">{r.correctAnswer}</span>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {r.correct ? (
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <X className="h-4 w-4 text-red-500 dark:text-red-400" />
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("userManagement.studentData.noGrammarGameResults")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
