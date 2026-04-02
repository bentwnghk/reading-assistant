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
}

type SubscriptionEmailType =
  | "payment_failed"
  | "trial_ending"
  | "subscription_activated"
  | "subscription_canceled"
  | "subscription_renewed"

interface SubscriptionEmailStrings {
  htmlTitle: string
  subject: (plan: string) => string
  greeting: (name: string) => string
  body: string
  actionText: string
  actionUrl: string
  footerNote: string
}

const STRINGS: Record<
  string,
  Record<SubscriptionEmailType, SubscriptionEmailStrings>
> = {
  "en-US": {
    payment_failed: {
      htmlTitle: "Payment Failed - Mr.\u{1F196} ProReader",
      subject: (plan) =>
        `Payment failed for your ${plan} ProReader subscription`,
      greeting: (name) => `Hi ${name},`,
      body: `We were unable to process your payment for the Mr.\u{1F196} ProReader subscription. This could be due to an expired card, insufficient funds, or a bank decline.\n\nTo avoid service interruption, please update your payment method as soon as possible.`,
      actionText: "Update Payment Method",
      actionUrl: "{{portalUrl}}",
      footerNote:
        "If you believe this is an error or need assistance, please contact support.",
    },
    trial_ending: {
      htmlTitle: "Trial Ending Soon - Mr.\u{1F196} ProReader",
      subject: (plan) =>
        `Your ${plan} ProReader trial ends soon`,
      greeting: (name) => `Hi ${name},`,
      body: `Your free trial for the Mr.\u{1F196} ProReader subscription is ending soon. After the trial ends, you'll be charged the regular subscription fee.\n\nWe hope you've enjoyed the ProReader experience! Your subscription will continue automatically unless you cancel before the trial ends.`,
      actionText: "Manage Subscription",
      actionUrl: "{{portalUrl}}",
      footerNote:
        "You can cancel anytime before the trial ends at no charge.",
    },
    subscription_activated: {
      htmlTitle: "Welcome to ProReader! - Mr.\u{1F196} ProReader",
      subject: (plan) =>
        `Welcome! Your ${plan} ProReader subscription is active`,
      greeting: (name) => `Hi ${name},`,
      body: `Welcome to Mr.\u{1F196} ProReader! Your subscription is now active and you have full access to all ProReader features.\n\nThank you for choosing ProReader. We're excited to be part of your learning journey!`,
      actionText: "Start Learning",
      actionUrl: "{{appUrl}}",
      footerNote:
        "You can manage your subscription anytime from Settings.",
    },
    subscription_canceled: {
      htmlTitle: "Subscription Canceled - Mr.\u{1F196} ProReader",
      subject: (plan) =>
        `Your ${plan} ProReader subscription has been canceled`,
      greeting: (name) => `Hi ${name},`,
      body: `Your Mr.\u{1F196} ProReader subscription has been canceled as requested. You'll still have access until the end of your current billing period.\n\nWe'd love to have you back! You can reactivate your subscription anytime from Settings.`,
      actionText: "Reactivate Subscription",
      actionUrl: "{{appUrl}}/settings",
      footerNote:
        "If you changed your mind, you can reactivate before the period ends.",
    },
    subscription_renewed: {
      htmlTitle: "Subscription Renewed - Mr.\u{1F196} ProReader",
      subject: (plan) =>
        `Your ${plan} ProReader subscription has been renewed`,
      greeting: (name) => `Hi ${name},`,
      body: `Your Mr.\u{1F196} ProReader subscription has been successfully renewed. Thank you for continuing your learning journey with us!\n\nYou have full access to all ProReader features. Happy learning!`,
      actionText: "Start Learning",
      actionUrl: "{{appUrl}}",
      footerNote:
        "You can manage your subscription from Settings.",
    },
  },
  "zh-HK": {
    payment_failed: {
      htmlTitle: "\u{4ED8}\u{6B3E}\u{5931}\u{6557} - Mr.\u{1F196} ProReader",
      subject: (plan) =>
        `\u{60A8}\u{7684} ${plan} ProReader \u{8A02}\u{95B1}\u{4ED8}\u{6B3E}\u{5931}\u{6555}`,
      greeting: (name) => `\u{55E8} ${name}\u{FF0C}`,
      body: `\u{6211}\u{5011}\u{7121}\u{6CD5}\u{8655}\u{7406}\u{60A8}\u{7684} Mr.\u{1F196} ProReader \u{8A02}\u{95B1}\u{4ED8}\u{6B3E}\u{3002}\u{9019}\u{53EF}\u{80FD}\u{662F}\u{56E0}\u{70BA}\u{4FE1}\u{7528}\u{5361}\u{904E}\u{671F}\u{3001}\u{9910}\u{984D}\u{4E0D}\u{8DB3}\u{6216}\u{9280}\u{884C}\u{62D2}\u{7D55}\u{3002}\n\n\u{70BA}\u{907F}\u{514D}\u{670D}\u{52D9}\u{4E2D}\u{65B7}\u{FF0C}\u{8ACB}\u{5118}\u{5FEB}\u{66F4}\u{65B0}\u{60A8}\u{7684}\u{4ED8}\u{6B3E}\u{65B9}\u{5F0F}\u{3002}`,
      actionText: "\u{66F4}\u{65B0}\u{4ED8}\u{6B3E}\u{65B9}\u{5F0F}",
      actionUrl: "{{portalUrl}}",
      footerNote:
        "\u{5982}\u{60A8}\u{8A8D}\u{70BA}\u{9019}\u{662F}\u{932F}\u{8AA4}\u{6216}\u{9700}\u{8981}\u{5354}\u{52A9}\u{FF0C}\u{8ACB}\u{806F}\u{7D61}\u{652F}\u{63F4}\u{3002}",
    },
    trial_ending: {
      htmlTitle: "\u{8A66}\u{7528}\u{671F}\u{5373}\u{5C07}\u{7D50}\u{675F} - Mr.\u{1F196} ProReader",
      subject: (plan) =>
        `\u{60A8}\u{7684} ${plan} ProReader \u{8A66}\u{7528}\u{671F}\u{5373}\u{5C07}\u{7D50}\u{675F}`,
      greeting: (name) => `\u{55E8} ${name}\u{FF0C}`,
      body: `\u{60A8}\u{7684} Mr.\u{1F196} ProReader \u{8A02}\u{95B1}\u{514D}\u{8CBB}\u{8A66}\u{7528}\u{671F}\u{5373}\u{5C07}\u{7D50}\u{675F}\u{3002}\u{8A66}\u{7528}\u{671F}\u{7D50}\u{675F}\u{5F8C}\u{FF0C}\u{60A8}\u{5C07}\u{88AB}\u{6536}\u{53D6}\u{6B63}\u{5E38}\u{8A02}\u{95B1}\u{8CBB}\u{7528}\u{3002}\n\n\u{5E0C}\u{671B}\u{60A8}\u{559C}\u{6B61} ProReader \u{7684}\u{9AD4}\u{9A57}\u{FF01}\u{9664}\u{975E}\u{60A8}\u{5728}\u{8A66}\u{7528}\u{671F}\u{7D50}\u{675F}\u{524D}\u{53D6}\u{6D88}\u{FF0C}\u{5426}\u{5247}\u{8A02}\u{95B1}\u{5C07}\u{81EA}\u{52D5}\u{7E8C}\u{671F}\u{3002}`,
      actionText: "\u{7BA1}\u{7406}\u{8A02}\u{95B1}",
      actionUrl: "{{portalUrl}}",
      footerNote:
        "\u{60A8}\u{53EF}\u{4EE5}\u{5728}\u{8A66}\u{7528}\u{671F}\u{7D50}\u{675F}\u{524D}\u{4EFB}\u{4F55}\u{6642}\u{5019}\u{53D6}\u{6D88}\u{FF0C}\u{4E0D}\u{6703}\u{88AB}\u{6536}\u{8CBB}\u{3002}",
    },
    subscription_activated: {
      htmlTitle: "\u{6B61}\u{8FCE}\u{4F7F}\u{7528} ProReader\u{FF01} - Mr.\u{1F196} ProReader",
      subject: (plan) =>
        `\u{6B61}\u{8FCE}\u{FF01}\u{60A8}\u{7684} ${plan} ProReader \u{8A02}\u{95B1}\u{5DF2}\u{555F}\u{7528}`,
      greeting: (name) => `\u{55E8} ${name}\u{FF0C}`,
      body: `\u{6B61}\u{8FCE}\u{4F7F}\u{7528} Mr.\u{1F196} ProReader\u{FF01}\u{60A8}\u{7684}\u{8A02}\u{95B1}\u{73B0}\u{5DF2}\u{555F}\u{7528}\u{FF0C}\u{60A8}\u{53EF}\u{4EE5}\u{5B8C}\u{5168}\u{5B58}\u{53D6}\u{6240}\u{6709} ProReader \u{529F}\u{80FD}\u{3002}\n\n\u{611F}\u{8B1D}\u{60A8}\u{9078}\u{64C7} ProReader\u{3002}\u{6211}\u{5011}\u{5F88}\u{8208}\u{596E}\u{80FD}\u{966A}\u{4F34}\u{60A8}\u{7684}\u{5B78}\u{7FD2}\u{4E4B}\u{65C5}\u{FF01}`,
      actionText: "\u{958B}\u{59CB}\u{5B78}\u{7FD2}",
      actionUrl: "{{appUrl}}",
      footerNote:
        "\u{60A8}\u{53EF}\u{4EE5}\u{96A8}\u{6642}\u{5728}\u{8A2D}\u{5B9A}\u{4E2D}\u{7BA1}\u{7406}\u{60A8}\u{7684}\u{8A02}\u{95B1}\u{3002}",
    },
    subscription_canceled: {
      htmlTitle: "\u{8A02}\u{95B1}\u{5DF2}\u{53D6}\u{6D88} - Mr.\u{1F196} ProReader",
      subject: (plan) =>
        `\u{60A8}\u{7684} ${plan} ProReader \u{8A02}\u{95B1}\u{5DF2}\u{53D6}\u{6D88}`,
      greeting: (name) => `\u{55E8} ${name}\u{FF0C}`,
      body: `\u{60A8}\u{7684} Mr.\u{1F196} ProReader \u{8A02}\u{95B1}\u{5DF2}\u{6839}\u{64DA}\u{8981}\u{6C42}\u{53D6}\u{6D88}\u{3002}\u{60A8}\u{5728}\u{7576}\u{524D}\u{8A08}\u{8CBB}\u{671F}\u{7D50}\u{675F}\u{524D}\u{4ECD}\u{53EF}\u{4EE5}\u{7E7C}\u{7E8C}\u{4F7F}\u{7528}\u{3002}\n\n\u{6211}\u{5011}\u{5E0C}\u{671B}\u{60A8}\u{80FD}\u{56DE}\u{4F86}\u{FF01}\u{60A8}\u{53EF}\u{4EE5}\u{96A8}\u{6642}\u{5728}\u{8A2D}\u{5B9A}\u{4E2D}\u{91CD}\u{65B0}\u{555F}\u{7528}\u{8A02}\u{95B1}\u{3002}`,
      actionText: "\u{91CD}\u{65B0}\u{555F}\u{7528}\u{8A02}\u{95B1}",
      actionUrl: "{{appUrl}}/settings",
      footerNote:
        "\u{5982}\u{60A8}\u{6539}\u{8B8A}\u{4E3B}\u{610F}\u{FF0C}\u{53EF}\u{4EE5}\u{5728}\u{8A08}\u{8CBB}\u{671F}\u{7D50}\u{675F}\u{524D}\u{91CD}\u{65B0}\u{555F}\u{7528}\u{3002}",
    },
    subscription_renewed: {
      htmlTitle: "\u{8A02}\u{95B1}\u{5DF2}\u{7E8C}\u{671F} - Mr.\u{1F196} ProReader",
      subject: (plan) =>
        `\u{60A8}\u{7684} ${plan} ProReader \u{8A02}\u{95B1}\u{5DF2}\u{7E8C}\u{671F}`,
      greeting: (name) => `\u{55E8} ${name}\u{FF0C}`,
      body: `\u{60A8}\u{7684} Mr.\u{1F196} ProReader \u{8A02}\u{95B1}\u{5DF2}\u{6210}\u{529F}\u{7E8C}\u{671F}\u{3002}\u{611F}\u{8B1D}\u{60A8}\u{7E7C}\u{7E8C}\u{8207}\u{6211}\u{5011}\u{4E00}\u{8D77}\u{5B78}\u{7FD2}\u{FF01}\n\n\u{60A8}\u{53EF}\u{4EE5}\u{5B8C}\u{5168}\u{5B58}\u{53D6}\u{6240}\u{6709} ProReader \u{529F}\u{80FD}\u{3002}\u{795D}\u{5B78}\u{7FD2}\u{6109}\u{5FEB}\u{FF01}`,
      actionText: "\u{958B}\u{59CB}\u{5B78}\u{7FD2}",
      actionUrl: "{{appUrl}}",
      footerNote:
        "\u{60A8}\u{53EF}\u{4EE5}\u{5728}\u{8A2D}\u{5B9A}\u{4E2D}\u{7BA1}\u{7406}\u{60A8}\u{7684}\u{8A02}\u{95B1}\u{3002}",
    },
  },
}

function resolveLocale(locale: string): string {
  if (locale in STRINGS) return locale
  if (locale.startsWith("zh")) return "zh-HK"
  return "en-US"
}

export function buildSubscriptionEmailHtml(
  params: SubscriptionEmailParams,
  type: SubscriptionEmailType
): string {
  const s = STRINGS[resolveLocale(params.locale)][type]
  const displayName = params.userName || "there"
  const htmlLang = resolveLocale(params.locale) === "zh-HK" ? "zh-Hant" : "en"
  const planLabel =
    params.locale.startsWith("zh")
      ? params.plan === "monthly"
        ? "\u{6708}\u{4ED8}"
        : "\u{5E74}\u{4ED8}"
      : params.plan === "monthly"
        ? "Monthly"
        : "Yearly"

  const actionUrl = s.actionUrl
    .replace("{{portalUrl}}", params.portalUrl || params.appUrl)
    .replace("{{appUrl}}", params.appUrl)

  const bodyParagraphs = s.body
    .split("\n\n")
    .map((p) => `<p style="margin:0 0 16px;color:#4b5563;font-size:16px;line-height:1.6;">${p}</p>`)
    .join("")

  const detailRows: string[] = []
  if (params.nextBillingDate) {
    const nextLabel =
      params.locale.startsWith("zh")
        ? "\u{4E0B}\u{6B21}\u{5E33}\u{55AE}\u{65E5}\u{671F}"
        : "Next billing date"
    detailRows.push(
      `<tr><td style="padding:4px 0;color:#6b7280;font-size:14px;">${nextLabel}</td><td style="padding:4px 0;color:#1f2937;font-size:14px;font-weight:500;text-align:right;">${params.nextBillingDate}</td></tr>`
    )
  }
  if (params.trialEndDate) {
    const trialLabel =
      params.locale.startsWith("zh")
        ? "\u{8A66}\u{7528}\u{671F}\u{7D50}\u{675F}"
        : "Trial ends"
    detailRows.push(
      `<tr><td style="padding:4px 0;color:#6b7280;font-size:14px;">${trialLabel}</td><td style="padding:4px 0;color:#1f2937;font-size:14px;font-weight:500;text-align:right;">${params.trialEndDate}</td></tr>`
    )
  }

  const planLabelStr =
    params.locale.startsWith("zh")
      ? "\u{65B9}\u{6848}"
      : "Plan"

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
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">&#128218; Mr.\u{1F196} ProReader</h1>
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

                ${bodyParagraphs}

                <tr>
                  <td style="padding-bottom:24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;">
                      <tr><td style="padding:4px 0;color:#6b7280;font-size:14px;">${planLabelStr}</td><td style="padding:4px 0;color:#1f2937;font-size:14px;font-weight:500;text-align:right;">${planLabel}</td></tr>
                      ${detailRows.join("\n")}
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom:32px;text-align:center;">
                    <a href="${actionUrl}" style="display:inline-block;background-color:#6366f1;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">
                      ${s.actionText}
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
                Mr.\u{1F196} ProReader
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
  const planLabel =
    params.locale.startsWith("zh")
      ? params.plan === "monthly"
        ? "\u{6708}\u{4ED8}"
        : "\u{5E74}\u{4ED8}"
      : params.plan === "monthly"
        ? "Monthly"
        : "Yearly"

  const actionUrl = s.actionUrl
    .replace("{{portalUrl}}", params.portalUrl || params.appUrl)
    .replace("{{appUrl}}", params.appUrl)

  return `${s.greeting(displayName)}

${s.body}

${params.locale.startsWith("zh") ? "\u{65B9}\u{6848}" : "Plan"}: ${planLabel}
${params.nextBillingDate ? `${params.locale.startsWith("zh") ? "\u{4E0B}\u{6B21}\u{5E33}\u{55AE}\u{65E5}\u{671F}" : "Next billing date"}: ${params.nextBillingDate}` : ""}
${params.trialEndDate ? `${params.locale.startsWith("zh") ? "\u{8A66}\u{7528}\u{671F}\u{7D50}\u{675F}" : "Trial ends"}: ${params.trialEndDate}` : ""}

${s.actionText}: ${actionUrl}

---
${s.footerNote}`
}

export function getSubscriptionEmailSubject(
  locale: string,
  type: SubscriptionEmailType,
  plan: string
): string {
  const s = STRINGS[resolveLocale(locale)][type]
  const planLabel =
    locale.startsWith("zh")
      ? plan === "monthly"
        ? "\u{6708}\u{4ED8}"
        : "\u{5E74}\u{4ED8}"
      : plan === "monthly"
        ? "Monthly"
        : "Yearly"
  return s.subject(planLabel)
}
