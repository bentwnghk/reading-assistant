export interface ReminderEmailParams {
  userName: string
  daysInactive: number
  lastActivityDate: string
  lastActivityType: string
  appUrl: string
  unsubscribeUrl: string
}

const ACTIVITY_DISPLAY_NAMES: Record<string, string> = {
  session_create: "started a reading session",
  test_complete: "completed a reading test",
  quiz_complete: "took a vocabulary quiz",
  spelling_complete: "played a spelling game",
  flashcard_review: "reviewed flashcards",
  mindmap_generate: "generated a mind map",
  adapted_text_generate: "adapted reading text",
  simplified_text_generate: "simplified reading text",
  sentence_analyze: "analyzed sentences",
  targeted_practice_complete: "completed targeted practice",
  glossary_add: "built a vocabulary glossary",
  ai_tutor_question: "asked the AI tutor",
}

export function getActivityDisplayName(activityType: string): string {
  return ACTIVITY_DISPLAY_NAMES[activityType] || "used the app"
}

export function buildReminderEmailHtml(params: ReminderEmailParams): string {
  const {
    userName,
    daysInactive,
    lastActivityDate,
    lastActivityType,
    appUrl,
    unsubscribeUrl,
  } = params

  const displayName = userName || "there"
  const lastActivity = getActivityDisplayName(lastActivityType)
  const dayText = daysInactive === 1 ? "1 day" : `${daysInactive} days`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>We miss you! Come back to Reading Assistant</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f5f7;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a855f7 100%);border-radius:16px 16px 0 0;padding:40px 32px;text-align:center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">
                      📚 Reading Assistant
                    </h1>
                    <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:16px;">
                      Your learning companion
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">

                <!-- Greeting -->
                <tr>
                  <td style="padding-bottom:24px;">
                    <h2 style="margin:0;color:#1f2937;font-size:24px;font-weight:600;">
                      Hi ${displayName}, we miss you! 👋
                    </h2>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom:24px;">
                    <p style="margin:0;color:#4b5563;font-size:16px;line-height:1.6;">
                      It's been a while since your last learning session. We noticed you haven't visited Reading Assistant recently, and we'd love to help you get back on track!
                    </p>
                  </td>
                </tr>

                <!-- Inactivity Card -->
                <tr>
                  <td style="padding-bottom:32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:20px 24px;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <p style="margin:0 0 8px;color:#92400e;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
                            Time since last activity
                          </p>
                          <p style="margin:0 0 4px;color:#78350f;font-size:36px;font-weight:700;">
                            ${dayText}
                          </p>
                          <p style="margin:0;color:#92400e;font-size:14px;">
                            You last ${lastActivity} on ${lastActivityDate}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Motivational Message -->
                <tr>
                  <td style="padding-bottom:32px;">
                    <p style="margin:0;color:#4b5563;font-size:16px;line-height:1.6;">
                      Consistency is the key to improvement! Even just 10 minutes a day can make a huge difference in your reading skills. Here's what you can do today:
                    </p>
                  </td>
                </tr>

                <!-- Feature Highlights -->
                <tr>
                  <td style="padding-bottom:32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50%" style="padding:8px 8px 8px 0;vertical-align:top;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0fdf4;border-radius:10px;padding:16px;">
                            <tr>
                              <td style="padding:16px;">
                                <p style="margin:0 0 4px;font-size:20px;">📖</p>
                                <p style="margin:0 0 4px;color:#166534;font-size:14px;font-weight:600;">Read & Summarize</p>
                                <p style="margin:0;color:#15803d;font-size:12px;line-height:1.4;">Upload text and get AI-powered summaries</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td width="50%" style="padding:8px 0 8px 8px;vertical-align:top;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eff6ff;border-radius:10px;padding:16px;">
                            <tr>
                              <td style="padding:16px;">
                                <p style="margin:0 0 4px;font-size:20px;">🧠</p>
                                <p style="margin:0 0 4px;color:#1e40af;font-size:14px;font-weight:600;">Mind Maps</p>
                                <p style="margin:0;color:#2563eb;font-size:12px;line-height:1.4;">Visualize concepts with mind maps</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding:8px 8px 8px 0;vertical-align:top;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fefce8;border-radius:10px;padding:16px;">
                            <tr>
                              <td style="padding:16px;">
                                <p style="margin:0 0 4px;font-size:20px;">📝</p>
                                <p style="margin:0 0 4px;color:#854d0e;font-size:14px;font-weight:600;">Vocabulary Glossary</p>
                                <p style="margin:0;color:#a16207;font-size:12px;line-height:1.4;">Build and review your word collection</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td width="50%" style="padding:8px 0 8px 8px;vertical-align:top;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fdf2f8;border-radius:10px;padding:16px;">
                            <tr>
                              <td style="padding:16px;">
                                <p style="margin:0 0 4px;font-size:20px;">🗂️</p>
                                <p style="margin:0 0 4px;color:#9d174d;font-size:14px;font-weight:600;">Flashcards</p>
                                <p style="margin:0;color:#be185d;font-size:12px;line-height:1.4;">Review and master new vocabulary</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding:8px 8px 8px 0;vertical-align:top;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f9ff;border-radius:10px;padding:16px;">
                            <tr>
                              <td style="padding:16px;">
                                <p style="margin:0 0 4px;font-size:20px;">✏️</p>
                                <p style="margin:0 0 4px;color:#0c4a6e;font-size:14px;font-weight:600;">Spelling Games</p>
                                <p style="margin:0;color:#0369a1;font-size:12px;line-height:1.4;">Practice spelling in a fun way</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td width="50%" style="padding:8px 0 8px 8px;vertical-align:top;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#faf5ff;border-radius:10px;padding:16px;">
                            <tr>
                              <td style="padding:16px;">
                                <p style="margin:0 0 4px;font-size:20px;">🎯</p>
                                <p style="margin:0 0 4px;color:#6b21a8;font-size:14px;font-weight:600;">Quizzes & Tests</p>
                                <p style="margin:0;color:#7c3aed;font-size:12px;line-height:1.4;">Test your reading comprehension</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <a href="${appUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:#ffffff;text-decoration:none;font-size:18px;font-weight:600;padding:16px 48px;border-radius:12px;box-shadow:0 4px 14px rgba(99,102,241,0.35);">
                      Continue Learning →
                    </a>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom:0;">
                    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;text-align:center;">
                      Pick up right where you left off, or start something new. Your learning journey awaits!
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:24px 32px;border-radius:0 0 16px 16px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">
              <p style="margin:0 0 12px;text-align:center;color:#9ca3af;font-size:12px;line-height:1.5;">
                This reminder was sent because you have email notifications enabled in Reading Assistant.
              </p>
              <p style="margin:0;text-align:center;">
                <a href="${unsubscribeUrl}"
                   style="color:#9ca3af;font-size:12px;text-decoration:underline;">
                  Unsubscribe from reminder emails
                </a>
                <span style="color:#d1d5db;font-size:12px;"> · </span>
                <a href="${appUrl}"
                   style="color:#9ca3af;font-size:12px;text-decoration:underline;">
                  Manage preferences
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildReminderEmailText(params: ReminderEmailParams): string {
  const { userName, daysInactive, lastActivityDate, lastActivityType, appUrl, unsubscribeUrl } = params
  const displayName = userName || "there"
  const lastActivity = getActivityDisplayName(lastActivityType)
  const dayText = daysInactive === 1 ? "1 day" : `${daysInactive} days`

  return [
    `Hi ${displayName}, we miss you!`,
    "",
    `It's been ${dayText} since you last ${lastActivity} on ${lastActivityDate}.`,
    "",
    "Consistency is the key to improvement! Even just 10 minutes a day can make a huge difference in your reading skills.",
    "",
    "Here's what you can do today:",
    "  - Read & Summarize: Upload text and get AI-powered summaries",
    "  - Mind Maps: Visualize concepts with mind maps",
    "  - Vocabulary Glossary: Build and review your word collection",
    "  - Flashcards: Review and master new vocabulary",
    "  - Spelling Games: Practice spelling in a fun way",
    "  - Quizzes & Tests: Test your reading comprehension",
    "",
    `Continue Learning: ${appUrl}`,
    "",
    "---",
    "This reminder was sent because you have email notifications enabled.",
    `Unsubscribe: ${unsubscribeUrl}`,
    `Manage preferences: ${appUrl}`,
  ].join("\n")
}
