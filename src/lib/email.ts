import { MailtrapClient } from "mailtrap"

let client: MailtrapClient | null = null

function getClient(): MailtrapClient {
  if (!client) {
    const token = process.env.MAILTRAP_API_KEY
    if (!token) {
      throw new Error("MAILTRAP_API_KEY is not configured")
    }

    const isSandbox = process.env.MAILTRAP_USE_SANDBOX === "true"
    const inboxId = isSandbox
      ? Number(process.env.MAILTRAP_INBOX_ID)
      : undefined

    client = new MailtrapClient({
      token,
      sandbox: isSandbox,
      testInboxId: inboxId,
    })
  }
  return client
}

function getSenderEmail(): string {
  return process.env.MAILTRAP_SENDER_EMAIL || "read@mr5ai.com"
}

function getSenderName(): string {
  return process.env.MAILTRAP_SENDER_NAME || "Mr.🆖 ProReader"
}

export interface SendEmailOptions {
  to: { email: string; name?: string }[]
  subject: string
  html: string
  text?: string
  category?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  try {
    const mailtrap = getClient()

    await mailtrap.send({
      from: {
        name: getSenderName(),
        email: getSenderEmail(),
      },
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || "",
      category: options.category,
    })

    console.log(
      `[email] Sent to ${options.to.map((r) => r.email).join(", ")} — "${options.subject}"`
    )
  } catch (error) {
    console.error("[email] Failed to send:", error)
    throw error
  }
}

export function isMailtrapConfigured(): boolean {
  return !!process.env.MAILTRAP_API_KEY
}
