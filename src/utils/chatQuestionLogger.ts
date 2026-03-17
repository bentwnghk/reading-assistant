interface LogChatQuestionOptions {
  questionText: string
  responseText: string
  sessionId?: string
  docTitle?: string
}

export function logChatQuestion(options: LogChatQuestionOptions): void {
  fetch("/api/chat-questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  }).catch(() => {
    // Intentionally silent - tracking must never break core UX
  })
}
