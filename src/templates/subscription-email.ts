export interface SubscriptionEmailParams {
  userName: string
  email: string
  locale: string
  plan: string
  status: string
  appUrl: string
  portalUrl?: string
  nextBillingDate?: string
  trialEndDate?: string
  paymentFailureReason?: string
  cancelAtPeriodEnd?: boolean
  invoiceUrl?: string
  invoiceAmount?: string
  invoiceDate?: string
  invoiceNumber?: string
  schoolName?: string
  totalSeats?: number
  accessEndDate?: string
}

export type SubscriptionEmailType =
  | "payment_failed"
  | "trial_ending"
  | "subscription_activated"
  | "subscription_canceled"
  | "subscription_renewed"
  | "renewal_reminder"
  | "payment_receipt"
  | "school_access_revoked"

interface SubscriptionEmailStrings {
  htmlTitle: string
  subject: (plan: string) => string
  greeting: (name: string, schoolName?: string) => string
  body: string
  bodyExpiring?: string
  actionText: string
  actionTextExpiring?: string
  actionUrl: string
  footerNote: string
}

const STRINGS: Record<
  string,
  Record<SubscriptionEmailType, SubscriptionEmailStrings>
> = {
  "en-US": {
    payment_failed: {
      htmlTitle: "Payment Failed - Mr.🆖 ProReader",
      subject: (plan) =>
        `Payment failed for your ${plan} Mr.🆖 ProReader subscription`,
      greeting: (name) => `Hi ${name},`,
      body: `We were unable to process your payment for the Mr.🆖 ProReader subscription. This could be due to an expired card, insufficient funds, or a bank decline.\n\nTo avoid service interruption, please update your payment method as soon as possible.`,
      actionText: "Update Payment Method",
      actionUrl: "{{portalUrl}}",
      footerNote:
        "If you believe this is an error or need assistance, please contact support.",
    },
    trial_ending: {
      htmlTitle: "Trial Ending Soon - Mr.🆖 ProReader",
      subject: (plan) =>
        `Your ${plan} Mr.🆖 ProReader trial ends soon`,
      greeting: (name) => `Hi ${name},`,
      body: `Your free trial for the Mr.🆖 ProReader subscription is ending soon. After the trial ends, you'll be charged the regular subscription fee.\n\nWe hope you've enjoyed the Mr.🆖 ProReader experience! Your subscription will continue automatically unless you cancel before the trial ends.`,
      actionText: "Manage Subscription",
      actionUrl: "{{portalUrl}}",
      footerNote:
        "You can cancel anytime before the trial ends at no charge.",
    },
    subscription_activated: {
      htmlTitle: "Welcome to Mr.🆖 ProReader! - Mr.🆖 ProReader",
      subject: (plan) =>
        `Welcome! Your ${plan} Mr.🆖 ProReader subscription is active`,
      greeting: (name) => `Hi ${name},`,
      body: `Welcome to Mr.🆖 ProReader! Your subscription is now active and you have full access to all Mr.🆖 ProReader features.\n\nThank you for choosing Mr.🆖 ProReader. We're excited to be part of your learning journey!`,
      actionText: "Start Learning",
      actionUrl: "{{appUrl}}",
      footerNote:
        "You can manage your subscription anytime from Settings.",
    },
    subscription_canceled: {
      htmlTitle: "Subscription Canceled - Mr.🆖 ProReader",
      subject: (plan) =>
        `Your ${plan} Mr.🆖 ProReader subscription has been canceled`,
      greeting: (name) => `Hi ${name},`,
      body: `Your Mr.🆖 ProReader subscription has been canceled as requested. You'll still have access until the end of your current billing period.\n\nWe'd love to have you back! You can reactivate your subscription anytime from Settings.`,
      actionText: "Reactivate Subscription",
      actionUrl: "{{appUrl}}",
      footerNote:
        "If you changed your mind, you can reactivate before the period ends.",
    },
    subscription_renewed: {
      htmlTitle: "Subscription Renewed - Mr.🆖 ProReader",
      subject: (plan) =>
        `Your ${plan} Mr.🆖 ProReader subscription has been renewed`,
      greeting: (name) => `Hi ${name},`,
      body: `Your Mr.🆖 ProReader subscription has been successfully renewed. Thank you for continuing your learning journey with us!\n\nYou have full access to all Mr.🆖 ProReader features. Happy learning!`,
      actionText: "Start Learning",
      actionUrl: "{{appUrl}}",
      footerNote:
        "You can manage your subscription from Settings.",
    },
    renewal_reminder: {
      htmlTitle: "Subscription Renewal Reminder - Mr.🆖 ProReader",
      subject: (plan) =>
        `Your ${plan} Mr.🆖 ProReader subscription will renew in 7 days`,
      greeting: (name) => `Hi ${name},`,
      body: `This is a friendly reminder that your Mr.🆖 ProReader subscription will automatically renew in 7 days. Your payment method on file will be charged for the next billing period.\n\nIf you'd like to make changes to your subscription, you can manage it from your billing portal.`,
      bodyExpiring: `This is a friendly reminder that your Mr.🆖 ProReader subscription will expire in 7 days because it has been set to cancel at the end of the billing period.\n\nIf you'd like to continue using Mr.🆖 ProReader, you can reactivate your subscription before it expires.`,
      actionText: "Manage Subscription",
      actionTextExpiring: "Reactivate Subscription",
      actionUrl: "{{portalUrl}}",
      footerNote:
        "You can manage your subscription anytime from your billing portal.",
    },
    payment_receipt: {
      htmlTitle: "Payment Receipt - Mr.🆖 ProReader",
      subject: (plan) =>
        `Payment Receipt - Your ${plan} Mr.🆖 ProReader subscription`,
      greeting: (name) => `Hi ${name},`,
      body: `Your payment for the Mr.🆖 ProReader subscription has been processed successfully. Thank you for your continued support!\n\nYour receipt is attached to this email as a PDF. You can also view and download it online anytime.`,
      actionText: "View Receipt Online",
      actionUrl: "{{invoiceUrl}}",
      footerNote:
        "If you have any questions about this charge, please contact support.",
    },
    school_access_revoked: {
      htmlTitle: "School Subscription Access Ending - Mr.🆖 ProReader",
      subject: () =>
        `Your school subscription access to Mr.🆖 ProReader will end soon`,
      greeting: (name) => `Hi ${name},`,
      body: `Your school's administrator has removed your access to the Mr.🆖 ProReader school subscription. Your access will end in 2 days.\n\nIf you believe this is a mistake, please contact your school administrator.`,
      actionText: "Learn More",
      actionUrl: "{{appUrl}}",
      footerNote:
        "You can continue using Mr.🆖 ProReader with a personal subscription.",
    },
  },
  "zh-HK": {
    payment_failed: {
      htmlTitle: "付款失敗 - Mr.🆖 ProReader",
      subject: (plan) =>
        `您的 ${plan} Mr.🆖 ProReader 訂閱付款失敗`,
      greeting: (name) => `嗨 ${name}，`,
      body: `我們無法處理您的 Mr.🆖 ProReader 訂閱付款。這可能是因為信用卡過期、餘額不足或銀行拒絕。\n\n為避免服務中斷，請盡快更新您的付款方式。`,
      actionText: "更新付款方式",
      actionUrl: "{{portalUrl}}",
      footerNote:
        "如您認為這是錯誤或需要協助，請聯絡支援。",
    },
    trial_ending: {
      htmlTitle: "試用期即將結束 - Mr.🆖 ProReader",
      subject: (plan) =>
        `您的 ${plan} Mr.🆖 ProReader 試用期即將結束`,
      greeting: (name) => `嗨 ${name}，`,
      body: `您的 Mr.🆖 ProReader 訂閱免費試用期即將結束。試用期結束後，您將被收取正常訂閱費用。\n\n希望您喜歡 Mr.🆖 ProReader 的體驗！除非您在試用期結束前取消，否則訂閱將自動續期。`,
      actionText: "管理訂閱",
      actionUrl: "{{portalUrl}}",
      footerNote:
        "您可以在試用期結束前任何時候取消，不會被收費。",
    },
    subscription_activated: {
      htmlTitle: "歡迎使用 Mr.🆖 ProReader！ - Mr.🆖 ProReader",
      subject: (plan) =>
        `歡迎！您的 ${plan} Mr.🆖 ProReader 訂閱已啟用`,
      greeting: (name) => `嗨 ${name}，`,
      body: `歡迎使用 Mr.🆖 ProReader！您的訂閱現已啟用，您可以完全存取所有 Mr.🆖 ProReader 功能。\n\n感謝您選擇 Mr.🆖 ProReader。我們很興奮能陪伴您的學習之旅！`,
      actionText: "開始學習",
      actionUrl: "{{appUrl}}",
      footerNote:
        "您可以隨時在設定中管理您的訂閱。",
    },
    subscription_canceled: {
      htmlTitle: "訂閱已取消 - Mr.🆖 ProReader",
      subject: (plan) =>
        `您的 ${plan} Mr.🆖 ProReader 訂閱已取消`,
      greeting: (name) => `嗨 ${name}，`,
      body: `您的 Mr.🆖 ProReader 訂閱已根據要求取消。您在當前計費期結束前仍可以繼續使用。\n\n我們希望您能回來！您可以隨時在設定中重新啟用訂閱。`,
      actionText: "重新啟用訂閱",
      actionUrl: "{{appUrl}}",
      footerNote:
        "如您改變主意，可以在計費期結束前重新啟用。",
    },
    subscription_renewed: {
      htmlTitle: "訂閱已續期 - Mr.🆖 ProReader",
      subject: (plan) =>
        `您的 ${plan} Mr.🆖 ProReader 訂閱已續期`,
      greeting: (name) => `嗨 ${name}，`,
      body: `您的 Mr.🆖 ProReader 訂閱已成功續期。感謝您繼續與我們一起學習！\n\n您可以完全存取所有 Mr.🆖 ProReader 功能。祝學習愉快！`,
      actionText: "開始學習",
      actionUrl: "{{appUrl}}",
      footerNote:
        "您可以在設定中管理您的訂閱。",
    },
    renewal_reminder: {
      htmlTitle: "訂閱續期提醒 - Mr.🆖 ProReader",
      subject: (plan) =>
        `您的 ${plan} Mr.🆖 ProReader 訂閱將在 7 天後續期`,
      greeting: (name) => `嗨 ${name}，`,
      body: `這是一個友善提醒，您的 Mr.🆖 ProReader 訂閱將在 7 天後自動續期。您的付款方式將被收取下一個計費期的費用。\n\n如您想更改訂閱設定，可以通過計費管理頁面進行管理。`,
      bodyExpiring: `這是一個友善提醒，您的 Mr.🆖 ProReader 訂閱已設定在計費期結束時取消，將在 7 天後到期。\n\n如您想繼續使用 Mr.🆖 ProReader，可以在到期前重新啟用訂閱。`,
      actionText: "管理訂閱",
      actionTextExpiring: "重新啟用訂閱",
      actionUrl: "{{portalUrl}}",
      footerNote:
        "您可以隨時通過計費管理頁面管理您的訂閱。",
    },
    payment_receipt: {
      htmlTitle: "付款收據 - Mr.🆖 ProReader",
      subject: (plan) =>
        `付款收據 - 您的 ${plan} Mr.🆖 ProReader 訂閱`,
      greeting: (name) => `嗨 ${name}，`,
      body: `您的 Mr.🆖 ProReader 訂閱付款已成功處理。感謝您的支持！\n\n收據已以 PDF 附件形式隨附在此郵件中。您也可以隨時在網上查看和下載。`,
      actionText: "網上查看收據",
      actionUrl: "{{invoiceUrl}}",
      footerNote:
        "如您對此付款有任何疑問，請聯絡支援。",
    },
    school_access_revoked: {
      htmlTitle: "學校訂閱存取即將結束 - Mr.🆖 ProReader",
      subject: () =>
        `您的 Mr.🆖 ProReader 學校訂閱存取即將結束`,
      greeting: (name) => `嗨 ${name}，`,
      body: `您的學校管理員已移除您對 Mr.🆖 ProReader 學校訂閱的存取權限。您的存取權限將在 2 天後結束。\n\n如您認為這是錯誤的，請聯絡您的學校管理員。`,
      actionText: "了解更多",
      actionUrl: "{{appUrl}}",
      footerNote:
        "您可以購買個人訂閱以繼續使用 Mr.🆖 ProReader。",
    },
  },
}

function resolveLocale(locale: string): string {
  if (locale in STRINGS) return locale
  if (locale.startsWith("zh")) return "zh-HK"
  return "en-US"
}

function getPlanLabel(plan: string, locale: string): string {
  return locale.startsWith("zh")
    ? plan === "monthly"
      ? "月付"
      : "年付"
    : plan === "monthly"
      ? "Monthly"
      : "Yearly"
}

function resolveActionUrl(
  actionUrlTemplate: string,
  params: SubscriptionEmailParams
): string {
  return actionUrlTemplate
    .replace("{{portalUrl}}", params.portalUrl || params.appUrl)
    .replace("{{invoiceUrl}}", params.invoiceUrl || params.appUrl)
    .replace("{{appUrl}}", params.appUrl)
}

function buildSchoolDetailRows(params: SubscriptionEmailParams): string {
  if (!params.schoolName) return ""
  const isZh = params.locale.startsWith("zh")
  const rows: string[] = []
  rows.push(
    `<tr><td colspan="2" style="padding:8px 0 4px;color:#6366f1;font-size:13px;font-weight:600;">${isZh ? "學校詳情" : "School Details"}</td></tr>`
  )
  rows.push(
    `<tr><td style="padding:4px 0;color:#6b7280;font-size:14px;">${isZh ? "學校名稱" : "School"}</td><td style="padding:4px 0;color:#1f2937;font-size:14px;font-weight:500;text-align:right;">${params.schoolName}</td></tr>`
  )
  if (params.totalSeats != null) {
    rows.push(
      `<tr><td style="padding:4px 0;color:#6b7280;font-size:14px;">${isZh ? "席位總數" : "Total Seats"}</td><td style="padding:4px 0;color:#1f2937;font-size:14px;font-weight:500;text-align:right;">${params.totalSeats}</td></tr>`
    )
  }
  return rows.join("\n")
}

function buildInvoiceDetailRows(params: SubscriptionEmailParams): string {
  if (!params.invoiceAmount && !params.invoiceDate && !params.invoiceNumber) return ""
  const isZh = params.locale.startsWith("zh")
  const rows: string[] = []
  rows.push(
    `<tr><td colspan="2" style="padding:8px 0 4px;color:#6366f1;font-size:13px;font-weight:600;">${isZh ? "帳單詳情" : "Invoice Details"}</td></tr>`
  )
  if (params.invoiceAmount) {
    rows.push(
      `<tr><td style="padding:4px 0;color:#6b7280;font-size:14px;">${isZh ? "付款金額" : "Amount"}</td><td style="padding:4px 0;color:#1f2937;font-size:14px;font-weight:500;text-align:right;">${params.invoiceAmount}</td></tr>`
    )
  }
  if (params.invoiceDate) {
    rows.push(
      `<tr><td style="padding:4px 0;color:#6b7280;font-size:14px;">${isZh ? "付款日期" : "Date"}</td><td style="padding:4px 0;color:#1f2937;font-size:14px;font-weight:500;text-align:right;">${params.invoiceDate}</td></tr>`
    )
  }
  if (params.invoiceNumber) {
    rows.push(
      `<tr><td style="padding:4px 0;color:#6b7280;font-size:14px;">${isZh ? "發票號碼" : "Invoice"}</td><td style="padding:4px 0;color:#1f2937;font-size:14px;font-weight:500;text-align:right;">${params.invoiceNumber}</td></tr>`
    )
  }
  return rows.join("\n")
}

export function buildSubscriptionEmailHtml(
  params: SubscriptionEmailParams,
  type: SubscriptionEmailType
): string {
  const s = STRINGS[resolveLocale(params.locale)][type]
  const displayName = params.userName || "there"
  const htmlLang = resolveLocale(params.locale) === "zh-HK" ? "zh-Hant" : "en"
  const planLabel = getPlanLabel(params.plan, params.locale)

  const isExpiring = type === "renewal_reminder" && params.cancelAtPeriodEnd === true
  const bodyText = isExpiring && s.bodyExpiring ? s.bodyExpiring : s.body
  const actionText = isExpiring && s.actionTextExpiring ? s.actionTextExpiring : s.actionText

  const actionUrl = resolveActionUrl(s.actionUrl, params)

  const bodyParagraphs = bodyText
    .split("\n\n")
    .map((p) => `<p style="margin:0 0 16px;color:#4b5563;font-size:16px;line-height:1.6;">${p}</p>`)
    .join("")

  const isZh = params.locale.startsWith("zh")
  const detailRows: string[] = []

  if (params.schoolName) {
    detailRows.push(...buildSchoolDetailRows(params).split("\n").filter(Boolean))
  }

  detailRows.push(
    `<tr><td style="padding:4px 0;color:#6b7280;font-size:14px;">${isZh ? "方案" : "Plan"}</td><td style="padding:4px 0;color:#1f2937;font-size:14px;font-weight:500;text-align:right;">${planLabel}</td></tr>`
  )

  if (params.nextBillingDate) {
    detailRows.push(
      `<tr><td style="padding:4px 0;color:#6b7280;font-size:14px;">${isZh ? "下次帳單日期" : "Next billing date"}</td><td style="padding:4px 0;color:#1f2937;font-size:14px;font-weight:500;text-align:right;">${params.nextBillingDate}</td></tr>`
    )
  }
  if (params.trialEndDate) {
    detailRows.push(
      `<tr><td style="padding:4px 0;color:#6b7280;font-size:14px;">${isZh ? "試用期結束" : "Trial ends"}</td><td style="padding:4px 0;color:#1f2937;font-size:14px;font-weight:500;text-align:right;">${params.trialEndDate}</td></tr>`
    )
  }

  if (type === "school_access_revoked" && params.accessEndDate) {
    detailRows.push(
      `<tr><td style="padding:4px 0;color:#6b7280;font-size:14px;">${isZh ? "存取結束日期" : "Access ends"}</td><td style="padding:4px 0;color:#ef4444;font-size:14px;font-weight:500;text-align:right;">${params.accessEndDate}</td></tr>`
    )
  }

  if (type === "payment_receipt") {
    const invoiceRows = buildInvoiceDetailRows(params)
    if (invoiceRows) {
      detailRows.push(...invoiceRows.split("\n").filter(Boolean))
    }
  }

  const headerSubtitle = params.schoolName
    ? `<p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">${isZh ? "學校訂閱" : "School Subscription"} — ${params.schoolName}</p>`
    : ""

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

          <tr>
            <td bgcolor="#6366f1" style="background-color:#6366f1;border-radius:16px 16px 0 0;padding:40px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">&#128218; Mr.🆖 ProReader</h1>
              ${headerSubtitle}
            </td>
          </tr>

          <tr>
            <td style="background-color:#ffffff;padding:40px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">

                <tr>
                  <td style="padding-bottom:24px;">
                    <h2 style="margin:0;color:#1f2937;font-size:24px;font-weight:600;">
                      ${s.greeting(displayName)}
                    </h2>
                  </td>
                </tr>

                <tr>
                  <td>
                    ${bodyParagraphs}
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom:24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;">
                      ${detailRows.join("\n")}
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom:32px;text-align:center;">
                    <a href="${actionUrl}" style="display:inline-block;background-color:#6366f1;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">
                      ${actionText}
                    </a>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top:24px;border-top:1px solid #e5e7eb;">
                    <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
                      ${s.footerNote}
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <tr>
            <td bgcolor="#f9fafb" style="background-color:#f9fafb;border-radius:0 0 16px 16px;padding:24px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                Mr.🆖 ProReader
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

export function buildSubscriptionEmailText(
  params: SubscriptionEmailParams,
  type: SubscriptionEmailType
): string {
  const s = STRINGS[resolveLocale(params.locale)][type]
  const displayName = params.userName || "there"
  const planLabel = getPlanLabel(params.plan, params.locale)

  const isExpiring = type === "renewal_reminder" && params.cancelAtPeriodEnd === true
  const bodyText = isExpiring && s.bodyExpiring ? s.bodyExpiring : s.body

  const actionUrl = resolveActionUrl(s.actionUrl, params)

  const isZh = params.locale.startsWith("zh")
  const lines: string[] = [
    s.greeting(displayName),
    "",
    bodyText,
    "",
  ]

  if (params.schoolName) {
    lines.push(`--- ${isZh ? "學校詳情" : "School Details"} ---`)
    lines.push(`${isZh ? "學校" : "School"}: ${params.schoolName}`)
    if (params.totalSeats != null) {
      lines.push(`${isZh ? "席位總數" : "Total Seats"}: ${params.totalSeats}`)
    }
    lines.push("")
  }

  lines.push(`${isZh ? "方案" : "Plan"}: ${planLabel}`)
  if (params.nextBillingDate) {
    lines.push(`${isZh ? "下次帳單日期" : "Next billing date"}: ${params.nextBillingDate}`)
  }
  if (params.trialEndDate) {
    lines.push(`${isZh ? "試用期結束" : "Trial ends"}: ${params.trialEndDate}`)
  }

  if (type === "school_access_revoked" && params.accessEndDate) {
    lines.push(`${isZh ? "存取結束日期" : "Access ends"}: ${params.accessEndDate}`)
  }

  if (type === "payment_receipt") {
    if (params.invoiceAmount) {
      lines.push(`${isZh ? "付款金額" : "Amount"}: ${params.invoiceAmount}`)
    }
    if (params.invoiceDate) {
      lines.push(`${isZh ? "付款日期" : "Date"}: ${params.invoiceDate}`)
    }
    if (params.invoiceNumber) {
      lines.push(`${isZh ? "發票號碼" : "Invoice"}: ${params.invoiceNumber}`)
    }
  }

  lines.push("")
  lines.push(`${s.actionText}: ${actionUrl}`)
  lines.push("")
  lines.push("---")
  lines.push(s.footerNote)

  return lines.join("\n")
}

export function getSubscriptionEmailSubject(
  locale: string,
  type: SubscriptionEmailType,
  plan: string
): string {
  const s = STRINGS[resolveLocale(locale)][type]
  const planLabel = getPlanLabel(plan, locale)
  return s.subject(planLabel)
}
