"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

const en = {
  title: "Privacy Policy",
  effectiveDate: "Effective Date: April 5, 2026",
  backToHome: "Back to Home",
  intro: [
    <>This Privacy Policy describes how <strong>Mr.🆖 ProReader</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, and discloses information about individuals who use our Service. The Service is an AI-powered English reading assistance platform.</>,
    <>Please read this Privacy Policy carefully. By using the Service, you agree to the collection, use, and disclosure of your information as described in this Privacy Policy. If you do not agree, please do not use the Service.</>,
    <>For purposes of this Privacy Policy, &quot;you&quot; and &quot;your&quot; means you as the user of the Service.</>,
  ],
  sections: [
    {
      heading: "1. Changes to This Privacy Policy",
      body: <p>We may modify this Privacy Policy from time to time. If we make material changes, we will update the &quot;Effective Date&quot; at the top of this Privacy Policy and, where appropriate, provide additional notice. Your continued use of the Service after any such changes constitutes your acceptance of the updated Privacy Policy.</p>,
    },
    {
      heading: "2. Information We Collect",
      body: (
        <>
          <h3>Information You Provide to Us</h3>
          <p>Some features of the Service may require you to provide certain information:</p>
          <ul>
            <li><strong>Account Information:</strong> Name, email address, and authentication credentials (e.g., Google sign-in). We use this information to provide and secure your account.</li>
            <li><strong>User Content:</strong> Text, images, and documents you upload or submit to the Service for processing. This includes reading materials you submit for text extraction, summarization, or analysis.</li>
            <li><strong>Student Information:</strong> Reading level, language preferences, and other learning preferences you provide.</li>
            <li><strong>Payment Information:</strong> Billing information processed through a third-party payment processor (e.g., Stripe). We do not store your full payment card details on our servers.</li>
          </ul>
          <h3>Information Collected Automatically</h3>
          <p>We automatically collect certain information when you interact with the Service:</p>
          <ul>
            <li><strong>Usage Data:</strong> Pages visited, features used, session duration, and interaction patterns within the Service.</li>
            <li><strong>Device Information:</strong> Device type, operating system, browser type, and screen resolution.</li>
            <li><strong>Log Data:</strong> IP address, date and time stamps, and error logs.</li>
          </ul>
          <h3>Information From Third Parties</h3>
          <ul>
            <li><strong>Authentication Providers:</strong> When you sign in with Google or other providers, we receive your name and email address from that provider.</li>
            <li><strong>AI Providers:</strong> Your content is sent to third-party AI providers (e.g., Google, OpenAI, Anthropic) for processing. Each provider is subject to their own privacy policy.</li>
            <li><strong>Analytics:</strong> We may use analytics services to understand usage patterns and improve the Service.</li>
          </ul>
        </>
      ),
    },
    {
      heading: "3. How We Use Your Information",
      body: (
        <>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve the Service.</li>
            <li>Process your uploaded content and generate AI-powered outputs.</li>
            <li>Personalize your learning experience and adapt content to your reading level.</li>
            <li>Maintain the security and integrity of your account.</li>
            <li>Process subscription payments and manage billing.</li>
            <li>Send service-related communications (e.g., account updates, security alerts).</li>
            <li>Monitor usage patterns and troubleshoot technical issues.</li>
            <li>Comply with legal obligations.</li>
          </ul>
          <p>We do <strong>not</strong> use your User Content (uploaded texts and documents) to train AI models unless you explicitly opt in.</p>
        </>
      ),
    },
    {
      heading: "4. Cookies and Tracking Technologies",
      body: <p>We use cookies and similar tracking technologies to maintain your session, remember your preferences, and analyze usage patterns. You can control cookie settings through your browser preferences. Note that disabling cookies may affect the functionality of the Service.</p>,
    },
    {
      heading: "5. Disclosure of Your Information",
      body: (
        <>
          <p>We may share your information with the following categories of third parties:</p>
          <ul>
            <li><strong>AI Providers:</strong> Your uploaded content is sent to third-party AI providers solely for the purpose of generating outputs for you.</li>
            <li><strong>Service Providers:</strong> Vendors who help us provide the Service, including cloud hosting, payment processing, and analytics.</li>
            <li><strong>Legal Requirements:</strong> When required by law, legal process, or governmental request.</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
          </ul>
          <p>We do <strong>not</strong> sell your personal information to third parties.</p>
        </>
      ),
    },
    {
      heading: "6. Data Security",
      body: <p>We implement reasonable security measures to protect your information. However, no security measures are completely impenetrable, and we cannot guarantee the absolute security of your data. We recommend that you do not submit highly sensitive or confidential information through the Service.</p>,
    },
    {
      heading: "7. Data Retention",
      body: <p>We retain your information for as long as your account is active or as needed to provide the Service. If you delete your account, we will delete your personal information from our servers within 30 days, except where retention is required by law.</p>,
    },
    {
      heading: "8. Third-Party Links",
      body: <p>The Service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review the privacy policies of any third-party services you access.</p>,
    },
    {
      heading: "9. Children&apos;s Privacy",
      body: <p>Children under the age of 13 are not permitted to use the Service, and we do not knowingly collect personal information from children under 13. If we become aware that we have collected information from a child under 13, we will take steps to delete such information. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.</p>,
    },
    {
      heading: "10. Data Transfers",
      body: <p>Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. By using the Service, you consent to such transfers. We take appropriate safeguards to ensure your information is protected during such transfers.</p>,
    },
    {
      heading: "11. Your Rights and Choices",
      body: (
        <>
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of the personal information we hold about you.</li>
            <li><strong>Correction:</strong> Request that we correct inaccurate personal information.</li>
            <li><strong>Deletion:</strong> Request that we delete your personal information.</li>
            <li><strong>Portability:</strong> Request a copy of your data in a machine-readable format.</li>
            <li><strong>Objection:</strong> Object to our processing of your personal information in certain circumstances.</li>
            <li><strong>Withdraw Consent:</strong> Withdraw any consent you have previously given us.</li>
          </ul>
          <p>You can exercise these rights by contacting us at the email address below. We may need to verify your identity before processing your request. You may also delete your account through the app settings.</p>
        </>
      ),
    },
    {
      heading: "12. Contact Us",
      body: (
        <>
          <p>If you have any questions about this Privacy Policy or our data practices, please contact us at:</p>
          <ul>
            <li>Email: <a href="mailto:support@mr5ai.com">support@mr5ai.com</a></li>
            <li>Website: <a href="https://api.mr5ai.com/" target="_blank" rel="noopener noreferrer">https://api.mr5ai.com/</a></li>
          </ul>
        </>
      ),
    },
  ],
};

const zhHK = {
  title: "隱私政策",
  effectiveDate: "生效日期：2026 年 4 月 5 日",
  backToHome: "返回首頁",
  intro: [
    <>本隱私政策說明 <strong>Mr.🆖 ProReader</strong>（以下簡稱「我們」）如何收集、使用及披露使用我們服務的個人資訊。本服務是一個基於人工智慧的英語閱讀輔助平台。</>,
    <>請仔細閱讀本隱私政策。使用本服務即表示您同意本隱私政策中所述的資訊收集、使用及披露方式。若您不同意，請勿使用本服務。</>,
    <>就本隱私政策而言，「您」及「您的」係指作為服務使用者的您。</>,
  ],
  sections: [
    {
      heading: "1. 本隱私政策的變更",
      body: <p>我們可能會不時修改本隱私政策。若我們作出重大變更，將更新本隱私政策頂部的「生效日期」，並在適當情況下提供額外通知。您在作出任何此類變更後繼續使用本服務，即構成您接受更新後的隱私政策。</p>,
    },
    {
      heading: "2. 我們收集的資訊",
      body: (
        <>
          <h3>您提供的資訊</h3>
          <p>本服務的某些功能可能需要您提供某些資訊：</p>
          <ul>
            <li><strong>帳號資訊：</strong>姓名、電郵地址及驗證憑證（例如 Google 登入）。我們使用此資訊來提供及保障您的帳號安全。</li>
            <li><strong>使用者內容：</strong>您上傳或提交至本服務進行處理的文字、圖像及文件。這包括您提交進行文字擷取、摘要或分析的閱讀材料。</li>
            <li><strong>學生資訊：</strong>閱讀水平、語言偏好及您提供的其他學習偏好。</li>
            <li><strong>付款資訊：</strong>透過第三方付款處理商（例如 Stripe）處理的帳單資訊。我們不在伺服器上儲存您的完整付款卡詳細資料。</li>
          </ul>
          <h3>自動收集的資訊</h3>
          <p>當您與本服務互動時，我們會自動收集某些資訊：</p>
          <ul>
            <li><strong>使用資料：</strong>瀏覽的頁面、使用的功能、工作階段持續時間及與本服務的互動模式。</li>
            <li><strong>裝置資訊：</strong>裝置類型、作業系統、瀏覽器類型及螢幕解析度。</li>
            <li><strong>日誌資料：</strong>IP 位址、日期及時間戳記，以及錯誤日誌。</li>
          </ul>
          <h3>來自第三方的資訊</h3>
          <ul>
            <li><strong>驗證提供商：</strong>當您使用 Google 或其他提供商登入時，我們會從該提供商接收您的姓名及電郵地址。</li>
            <li><strong>AI 供應商：</strong>您的內容會被發送至第三方 AI 供應商（例如 Google、OpenAI、Anthropic）進行處理。各供應商受其自身的隱私政策約束。</li>
            <li><strong>分析服務：</strong>我們可能使用分析服務來了解使用模式並改善本服務。</li>
          </ul>
        </>
      ),
    },
    {
      heading: "3. 我們如何使用您的資訊",
      body: (
        <>
          <p>我們使用收集的資訊來：</p>
          <ul>
            <li>提供、維護及改善本服務。</li>
            <li>處理您上傳的內容並生成 AI 驅動的輸出。</li>
            <li>個人化您的學習體驗並將內容調整至您的閱讀水平。</li>
            <li>維護您帳號的安全及完整性。</li>
            <li>處理訂閱付款及管理帳單。</li>
            <li>發送與服務相關的通訊（例如帳號更新、安全提醒）。</li>
            <li>監控使用模式及排除技術故障。</li>
            <li>遵守法律義務。</li>
          </ul>
          <p>除非您明確選擇加入，否則我們<strong>不會</strong>使用您的使用者內容（上傳的文字及文件）來訓練 AI 模型。</p>
        </>
      ),
    },
    {
      heading: "4. Cookie 及追蹤技術",
      body: <p>我們使用 Cookie 及類似的追蹤技術來維護您的工作階段、記住您的偏好並分析使用模式。您可以透過瀏覽器偏好設定來控制 Cookie 設定。請注意，停用 Cookie 可能會影響本服務的功能。</p>,
    },
    {
      heading: "5. 您資訊的披露",
      body: (
        <>
          <p>我們可能會與以下類別的第三方分享您的資訊：</p>
          <ul>
            <li><strong>AI 供應商：</strong>您上傳的內容僅為生成輸出的目的而被發送至第三方 AI 供應商。</li>
            <li><strong>服務提供商：</strong>協助我們提供本服務的供應商，包括雲端託管、付款處理及分析。</li>
            <li><strong>法律要求：</strong>當法律、法律程序或政府要求時。</li>
            <li><strong>業務轉讓：</strong>在合併、收購或資產出售的情況下。</li>
          </ul>
          <p>我們<strong>不會</strong>將您的個人資訊出售給第三方。</p>
        </>
      ),
    },
    {
      heading: "6. 資料安全",
      body: <p>我們採取合理的安全措施來保護您的資訊。然而，沒有任何安全措施是完全不可穿透的，我們無法保證您資料的絕對安全。我們建議您不要透過本服務提交高度敏感或機密的資訊。</p>,
    },
    {
      heading: "7. 資料保留",
      body: <p>只要您的帳號處於活躍狀態或為提供本服務所需，我們會保留您的資訊。若您刪除帳號，我們將在 30 天內從伺服器上刪除您的個人資訊，除非法律要求保留。</p>,
    },
    {
      heading: "8. 第三方連結",
      body: <p>本服務可能包含指向第三方網站或服務的連結。我們不對這些第三方的隱私實踐負責。我們鼓勵您審查您存取的任何第三方服務的隱私政策。</p>,
    },
    {
      heading: "9. 兒童隱私",
      body: <p>13 歲以下的兒童不得使用本服務，我們不會故意收集 13 歲以下兒童的個人資訊。若我們獲悉已收集了 13 歲以下兒童的資訊，我們將採取步驟刪除該等資訊。若您是家長或監護人，並認為您的孩子向我們提供了個人資訊，請聯絡我們。</p>,
    },
    {
      heading: "10. 資料轉移",
      body: <p>您的資訊可能會被轉移至您居住國家以外的國家進行處理。這些國家可能有不同的資料保護法律。使用本服務即表示您同意此類轉移。我們採取適當的保障措施，確保您的資訊在此類轉移期間受到保護。</p>,
    },
    {
      heading: "11. 您的權利與選擇",
      body: (
        <>
          <p>根據您所在的司法管轄區，您可能享有以下權利：</p>
          <ul>
            <li><strong>存取權：</strong>要求我們提供所持有的關於您的個人資訊副本。</li>
            <li><strong>更正權：</strong>要求我們更正不準確的個人資訊。</li>
            <li><strong>刪除權：</strong>要求我們刪除您的個人資訊。</li>
            <li><strong>可攜性：</strong>要求以機器可讀格式提供您的資料副本。</li>
            <li><strong>反對權：</strong>在特定情況下反對我們處理您的個人資訊。</li>
            <li><strong>撤回同意：</strong>撤回您先前給予我們的任何同意。</li>
          </ul>
          <p>您可以透過以下電郵地址聯絡我們來行使這些權利。我們可能需要驗證您的身份，然後才會處理您的請求。您也可以透過應用程式設定刪除您的帳號。</p>
        </>
      ),
    },
    {
      heading: "12. 聯絡我們",
      body: (
        <>
          <p>若您對本隱私政策或我們的資料實踐有任何疑問，請透過以下方式聯絡我們：</p>
          <ul>
            <li>電郵：<a href="mailto:support@mr5ai.com">support@mr5ai.com</a></li>
            <li>網站：<a href="https://api.mr5ai.com/" target="_blank" rel="noopener noreferrer">https://api.mr5ai.com/</a></li>
          </ul>
        </>
      ),
    },
  ],
};

export default function PrivacyPolicyPage() {
  const { i18n } = useTranslation();
  const content = i18n.language?.startsWith("zh") ? zhHK : en;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {content.backToHome}
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          {content.title}
        </h1>
        <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
          {content.effectiveDate}
        </p>

        <div className="prose prose-gray max-w-none dark:prose-invert">
          {content.intro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.body}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
