export interface ReminderEmailParams {
  userName: string
  daysInactive: number
  lastActivityDate: string
  lastActivityType: string
  appUrl: string
  unsubscribeUrl: string
  locale: string
}

export type LocaleKey = "en-US" | "zh-HK"

interface EmailStrings {
  appName: string
  appSubtitle: string
  htmlTitle: string
  greeting: (name: string) => string
  intro: string
  timeSinceLastActivity: string
  youLast: (activity: string, date: string) => string
  day: (n: number) => string
  motivation: string
  featureReadTitle: string
  featureReadDesc: string
  featureMindMapTitle: string
  featureMindMapDesc: string
  featureGlossaryTitle: string
  featureGlossaryDesc: string
  featureFlashcardTitle: string
  featureFlashcardDesc: string
  featureSpellingTitle: string
  featureSpellingDesc: string
  featureQuizTitle: string
  featureQuizDesc: string
  ctaButton: string
  closingMessage: string
  footerNote: string
  unsubscribe: string
  managePreferences: string
  subject: (days: string, activity: string) => string
  activities: Record<string, string>
  textIntro: (days: string, activity: string, date: string) => string
}

const STRINGS: Record<LocaleKey, EmailStrings> = {
  "en-US": {
    appName: "Mr.\u{1F196} ProReader",
    appSubtitle: "Your learning companion",
    htmlTitle: "We miss you! Come back to Mr.\u{1F196} ProReader",
    greeting: (name) => `Hi ${name}, we miss you! \u{1F44B}`,
    intro: "It\u2019s been a while since your last learning session. We noticed you haven\u2019t visited Mr.\u{1F196} ProReader recently, and we\u2019d love to help you get back on track!",
    timeSinceLastActivity: "TIME SINCE LAST ACTIVITY",
    youLast: (activity, date) => `You last ${activity} on ${date}`,
    day: (n) => (n === 1 ? "1 day" : `${n} days`),
    motivation: "Consistency is the key to improvement! Even just 10 minutes a day can make a huge difference in your reading skills. Here\u2019s what you can do today:",
    featureReadTitle: "Read & Summarize",
    featureReadDesc: "Upload text and get AI-powered summaries",
    featureMindMapTitle: "Mind Maps",
    featureMindMapDesc: "Visualize concepts with mind maps",
    featureGlossaryTitle: "Vocabulary Glossary",
    featureGlossaryDesc: "Build and review your word collection",
    featureFlashcardTitle: "Flashcards",
    featureFlashcardDesc: "Review and master new vocabulary",
    featureSpellingTitle: "Spelling Games",
    featureSpellingDesc: "Practice spelling in a fun way",
    featureQuizTitle: "Quizzes & Tests",
    featureQuizDesc: "Test your reading comprehension and vocabulary knowledge",
    ctaButton: "Continue Learning \u2192",
    closingMessage: "Pick up right where you left off, or start something new. Your learning journey awaits!",
    footerNote: "This reminder was sent because you have email notifications enabled in Mr.\u{1F196} ProReader.",
    unsubscribe: "Unsubscribe from reminder emails",
    managePreferences: "Manage preferences",
    subject: (days, activity) => `We miss you! It\u2019s been ${days} since you ${activity}`,
    activities: {
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
    },
    textIntro: (days, activity, date) =>
      `It\u2019s been ${days} since you last ${activity} on ${date}.`,
  },
  "zh-HK": {
    appName: "Mr.\u{1F196} ProReader",
    appSubtitle: "\u{4F60}\u{7684}\u{5B78}\u{7FD2}\u{5925}\u{4F34}",
    htmlTitle: "\u{6211}\u{5011}\u{60F3}\u{4F60}\u{4E86}\u{FF01}\u{56DE}\u{4F86} Mr.\u{1F196} ProReader \u{5427}",
    greeting: (name) => `\u{55E8} ${name}\u{FF0C}\u{6211}\u{5011}\u{60F3}\u{4F60}\u{4E86}\u{FF01}\u{1F44B}`,
    intro: "\u{8DDD}\u{96E2}\u{4E0A}\u{6B21}\u{5B78}\u{7FD2}\u{5DF2}\u{7D93}\u{6709}\u{4E00}\u{6BB5}\u{6642}\u{9593}\u{4E86}\u{3002}\u{6211}\u{5011}\u{767C}\u{73FE}\u{4F60}\u{8FD1}\u{671F}\u{6C92}\u{6709}\u{4F7F}\u{7528} Mr.\u{1F196} ProReader\u{FF0C}\u{5E0C}\u{671B}\u{5E6B}\u{52A9}\u{4F60}\u{91CD}\u{62FE}\u{5B78}\u{7FD2}\u{7BC0}\u{594F}\u{FF01}",
    timeSinceLastActivity: "\u{8DDD}\u{96E2}\u{4E0A}\u{6B21}\u{5B78}\u{7FD2}\u{6D3B}\u{52D5}",
    youLast: (activity, date) => `\u{4F60}\u{4E0A}\u{6B21}${activity}\u{662F}\u{5728} ${date}`,
    day: (n) => (n === 1 ? "1 \u{5929}" : `${n} \u{5929}`),
    motivation: "\u{6301}\u{4E4B}\u{4EE5}\u{6046}\u{662F}\u{9032}\u{6B65}\u{7684}\u{95DC}\u{9375}\u{FF01}\u{6BCF}\u{5929}\u{53EA}\u{9700} 10 \u{5206}\u{9418}\u{5C31}\u{80FD}\u{5927}\u{5E45}\u{63D0}\u{5347}\u{4F60}\u{7684}\u{95B1}\u{8B80}\u{80FD}\u{529B}\u{3002}\u{4EE5}\u{4E0B}\u{662F}\u{4F60}\u{4ECA}\u{5929}\u{53EF}\u{4EE5}\u{505A}\u{7684}\u{4E8B}\u{60C5}\u{FF1A}",
    featureReadTitle: "\u{95B1}\u{8B80}\u{8207}\u{6458}\u{8981}",
    featureReadDesc: "\u{4E0A}\u{50B3}\u{6587}\u{672C}\u{4E26}\u{7372}\u{53D6} AI \u{6458}\u{8981}",
    featureMindMapTitle: "\u{601D}\u{7EF4}\u{5C0E}\u{5716}",
    featureMindMapDesc: "\u{7528}\u{601D}\u{7EF4}\u{5C0E}\u{5716}\u{5177}\u{9AD4}\u{5316}\u{6982}\u{5FF5}",
    featureGlossaryTitle: "\u{8A5E}\u{5F59}\u{8868}",
    featureGlossaryDesc: "\u{5EFA}\u{7ACB}\u{548C}\u{6E29}\u{7FD2}\u{4F60}\u{7684}\u{55AE}\u{5B57}\u{5EAB}",
    featureFlashcardTitle: "\u{751F}\u{5B57}\u{5361}",
    featureFlashcardDesc: "\u{6E29}\u{7FD2}\u{4E26}\u{638C}\u{63E1}\u{65B0}\u{8A5E}\u{5F59}",
    featureSpellingTitle: "\u{62FC}\u{5B57}\u{904A}\u{6232}",
    featureSpellingDesc: "\u{4EE5}\u{6709}\u{8DA3}\u{7684}\u{65B9}\u{5F0F}\u{7DF4}\u{7FD2}\u{62FC}\u{5B57}",
    featureQuizTitle: "\u{6E2C}\u{9A57}\u{8207}\u{8003}\u{8A66}",
    featureQuizDesc: "\u{6E2C}\u8A66\u{4F60}\u{7684}\u{95B1}\u{8B80}\u{7406}\u{89E3}\u{80FD}\u{529B}\u{548C}\u{8A5E}\u{5F59}\u{77E5}\u{8B58}",
    ctaButton: "\u{7E7C}\u{7E8C}\u{5B78}\u{7FD2} \u2192",
    closingMessage: "\u{5F9E}\u{4F60}\u{505C}\u{4E0B}\u{7684}\u{5730}\u{65B9}\u{7E7C}\u{7E8C}\u{FF0C}\u{6216}\u{8005}\u{958B}\u{59CB}\u{65B0}\u{7684}\u{5B78}\u{7FD2}\u{4E4B}\u{65C5}\u{FF01}",
    footerNote: "\u{6B64}\u{63D0}\u{9192}\u{662F}\u{56E0}\u{70BA}\u{4F60}\u{5DF2}\u{5728} Mr.\u{1F196} ProReader \u{4E2D}\u{555F}\u{7528}\u{4E86}\u{96FB}\u{90F5}\u{901A}\u{77E5}\u{3002}",
    unsubscribe: "\u{53D6}\u{6D88}\u{8A02}\u{95B1}\u{63D0}\u{9192}\u{96FB}\u{90F5}",
    managePreferences: "\u{7BA1}\u{7406}\u{8A2D}\u{5B9A}",
    subject: (days, activity) => `\u{6211}\u{5011}\u{60F3}\u{4F60}\u{4E86}\u{FF01}\u{5DF2}\u{7D93} ${days} \u{6C92}\u{6709}${activity}\u{4E86}`,
    activities: {
      session_create: "\u{958B}\u{59CB}\u{95B1}\u{8B80}",
      test_complete: "\u{5B8C}\u{6210}\u{95B1}\u{8B80}\u{6E2C}\u{9A57}",
      quiz_complete: "\u{53C3}\u{52A0}\u{8A5E}\u{5F59}\u{6E2C}\u{9A57}",
      spelling_complete: "\u{73A9}\u{62FC}\u{5B57}\u{904A}\u{6232}",
      flashcard_review: "\u{6E29}\u{7FD2}\u{751F}\u{5B57}\u{5361}",
      mindmap_generate: "\u{751F}\u{6210}\u{601D}\u{7EF4}\u{5C0E}\u{5716}",
      adapted_text_generate: "\u{6539}\u{5BEB}\u{95B1}\u{8B80}\u{6587}\u{672C}",
      simplified_text_generate: "\u{7C21}\u{5316}\u{95B1}\u{8B80}\u{6587}\u{672C}",
      sentence_analyze: "\u{5206}\u{6790}\u{53E5}\u{5B50}",
      targeted_practice_complete: "\u{5B8C}\u{6210}\u{91DD}\u{5C0D}\u{6027}\u{7DF4}\u{7FD2}",
      glossary_add: "\u{5EFA}\u{7ACB}\u{8A5E}\u{5F59}\u{8868}",
      ai_tutor_question: "\u{5411} AI \u{5C0E}\u{5E2B}\u{63D0}\u{554F}",
    },
    textIntro: (days, activity, date) =>
      `\u{5DF2}\u{7D93} ${days} \u{6C92}\u{6709}${activity}\u{4E86}\u{FF0C}\u{4E0A}\u{6B21}\u{662F}\u{5728} ${date}\u{3002}`,
  },
}

export function resolveLocale(locale: string): LocaleKey {
  if (locale in STRINGS) return locale as LocaleKey
  if (locale.startsWith("zh")) return "zh-HK"
  return "en-US"
}

export function getEmailStrings(locale: string): EmailStrings {
  return STRINGS[resolveLocale(locale)]
}

export function getActivityDisplayName(activityType: string, locale: string = "en-US"): string {
  const strings = getEmailStrings(locale)
  return strings.activities[activityType] || strings.activities["session_create"]
}

export function buildReminderEmailHtml(params: ReminderEmailParams): string {
  const {
    userName,
    daysInactive,
    lastActivityDate,
    lastActivityType,
    appUrl,
    unsubscribeUrl,
    locale,
  } = params

  const s = getEmailStrings(locale)
  const displayName = userName || "there"
  const lastActivity = getActivityDisplayName(lastActivityType, locale)
  const dayText = s.day(daysInactive)
  const htmlLang = resolveLocale(locale) === "zh-HK" ? "zh-Hant" : "en"

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${s.htmlTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f5f7;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td bgcolor="#6366f1" style="background-color:#6366f1;border-radius:16px 16px 0 0;padding:40px 32px;text-align:center;">
              <!--[if mso]>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td bgcolor="#6366f1" style="padding:40px 32px;text-align:center;">
              <![endif]-->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">
                      &#128218; ${s.appName}
                    </h1>
                    <p style="margin:8px 0 0;color:#e0e7ff;font-size:16px;">
                      ${s.appSubtitle}
                    </p>
                  </td>
                </tr>
              </table>
              <!--[if mso]>
              </td></tr></table>
              <![endif]-->
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
                      ${s.greeting(displayName)}
                    </h2>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom:24px;">
                    <p style="margin:0;color:#4b5563;font-size:16px;line-height:1.6;">
                      ${s.intro}
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
                            ${s.timeSinceLastActivity}
                          </p>
                          <p style="margin:0 0 4px;color:#78350f;font-size:36px;font-weight:700;">
                            ${dayText}
                          </p>
                          <p style="margin:0;color:#92400e;font-size:14px;">
                            ${s.youLast(lastActivity, lastActivityDate)}
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
                      ${s.motivation}
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
                                <p style="margin:0 0 4px;color:#166534;font-size:14px;font-weight:600;">${s.featureReadTitle}</p>
                                <p style="margin:0;color:#15803d;font-size:12px;line-height:1.4;">${s.featureReadDesc}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td width="50%" style="padding:8px 0 8px 8px;vertical-align:top;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eff6ff;border-radius:10px;padding:16px;">
                            <tr>
                              <td style="padding:16px;">
                                <p style="margin:0 0 4px;font-size:20px;">🧠</p>
                                <p style="margin:0 0 4px;color:#1e40af;font-size:14px;font-weight:600;">${s.featureMindMapTitle}</p>
                                <p style="margin:0;color:#2563eb;font-size:12px;line-height:1.4;">${s.featureMindMapDesc}</p>
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
                                <p style="margin:0 0 4px;color:#854d0e;font-size:14px;font-weight:600;">${s.featureGlossaryTitle}</p>
                                <p style="margin:0;color:#a16207;font-size:12px;line-height:1.4;">${s.featureGlossaryDesc}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td width="50%" style="padding:8px 0 8px 8px;vertical-align:top;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fdf2f8;border-radius:10px;padding:16px;">
                            <tr>
                              <td style="padding:16px;">
                                <p style="margin:0 0 4px;font-size:20px;">🗂️</p>
                                <p style="margin:0 0 4px;color:#9d174d;font-size:14px;font-weight:600;">${s.featureFlashcardTitle}</p>
                                <p style="margin:0;color:#be185d;font-size:12px;line-height:1.4;">${s.featureFlashcardDesc}</p>
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
                                <p style="margin:0 0 4px;color:#0c4a6e;font-size:14px;font-weight:600;">${s.featureSpellingTitle}</p>
                                <p style="margin:0;color:#0369a1;font-size:12px;line-height:1.4;">${s.featureSpellingDesc}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td width="50%" style="padding:8px 0 8px 8px;vertical-align:top;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#faf5ff;border-radius:10px;padding:16px;">
                            <tr>
                              <td style="padding:16px;">
                                <p style="margin:0 0 4px;font-size:20px;">🎯</p>
                                <p style="margin:0 0 4px;color:#6b21a8;font-size:14px;font-weight:600;">${s.featureQuizTitle}</p>
                                <p style="margin:0;color:#7c3aed;font-size:12px;line-height:1.4;">${s.featureQuizDesc}</p>
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
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#6366f1" style="border-radius:12px;">
                          <a href="${appUrl}"
                             style="display:inline-block;background-color:#6366f1;color:#ffffff;text-decoration:none;font-size:18px;font-weight:600;padding:16px 48px;border-radius:12px;">
                            ${s.ctaButton}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom:0;">
                    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;text-align:center;">
                      ${s.closingMessage}
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
                ${s.footerNote}
              </p>
              <p style="margin:0;text-align:center;">
                <a href="${unsubscribeUrl}"
                   style="color:#9ca3af;font-size:12px;text-decoration:underline;">
                  ${s.unsubscribe}
                </a>
                <span style="color:#d1d5db;font-size:12px;"> · </span>
                <a href="${appUrl}"
                   style="color:#9ca3af;font-size:12px;text-decoration:underline;">
                  ${s.managePreferences}
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
  const { userName, daysInactive, lastActivityDate, lastActivityType, appUrl, unsubscribeUrl, locale } = params
  const s = getEmailStrings(locale)
  const displayName = userName || "there"
  const lastActivity = getActivityDisplayName(lastActivityType, locale)
  const dayText = s.day(daysInactive)

  return [
    s.greeting(displayName),
    "",
    s.textIntro(dayText, lastActivity, lastActivityDate),
    "",
    s.motivation,
    "",
    `  - ${s.featureReadTitle}: ${s.featureReadDesc}`,
    `  - ${s.featureMindMapTitle}: ${s.featureMindMapDesc}`,
    `  - ${s.featureGlossaryTitle}: ${s.featureGlossaryDesc}`,
    `  - ${s.featureFlashcardTitle}: ${s.featureFlashcardDesc}`,
    `  - ${s.featureSpellingTitle}: ${s.featureSpellingDesc}`,
    `  - ${s.featureQuizTitle}: ${s.featureQuizDesc}`,
    "",
    `${s.ctaButton}: ${appUrl}`,
    "",
    "---",
    s.footerNote,
    `${s.unsubscribe}: ${unsubscribeUrl}`,
    `${s.managePreferences}: ${appUrl}`,
  ].join("\n")
}
