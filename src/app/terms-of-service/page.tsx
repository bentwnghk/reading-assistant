"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

const en = {
  title: "Terms of Service",
  effectiveDate: "Effective Date: April 5, 2026",
  backToHome: "Back to Home",
  intro: [
    <>Welcome to the Terms of Service (&quot;Terms&quot;) for <strong>Mr.🆖 ProReader</strong> (the &quot;Service&quot;). These Terms govern your access to and use of the Service, which is an AI-powered English reading assistance platform that transforms reading materials into interactive learning experiences.</>,
    <>Please read these Terms carefully. By accessing or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use the Service.</>,
    <>For purposes of these Terms, &quot;you&quot; and &quot;your&quot; means you as the user of the Service. If you use the Service on behalf of an organization, &quot;you&quot; includes you and that organization.</>,
  ],
  sections: [
    {
      heading: "1. Acceptance of Terms",
      body: <p>By creating an account, accessing, or using the Service, you confirm that you accept these Terms and agree to comply with them. If you do not agree, you must not access or use the Service.</p>,
    },
    {
      heading: "2. Description of Service",
      body: (
        <>
          <p>Mr.🆖 ProReader is an AI-powered educational platform that provides tools for English reading assistance, including but not limited to:</p>
          <ul>
            <li>OCR-based text extraction from images and documents</li>
            <li>AI-generated reading summaries and adapted texts</li>
            <li>Interactive vocabulary glossaries and reading comprehension tests</li>
            <li>Mind mapping and visual learning tools</li>
            <li>Text-to-speech and sentence analysis features</li>
            <li>Gamified learning elements such as achievements and leaderboards</li>
          </ul>
          <p>The Service relies on third-party AI providers to generate content. We do not guarantee the accuracy, completeness, or reliability of any AI-generated output.</p>
        </>
      ),
    },
    {
      heading: "3. User Accounts",
      body: (
        <>
          <p>To access certain features of the Service, you may be required to create an account. When creating an account, you agree to:</p>
          <ul>
            <li>Provide accurate, current, and complete information during registration.</li>
            <li>Maintain and promptly update your account information to keep it accurate, current, and complete.</li>
            <li>Maintain the security and confidentiality of your account credentials.</li>
            <li>Accept responsibility for all activities that occur under your account.</li>
            <li>Notify us immediately if you discover any unauthorized use of your account.</li>
          </ul>
        </>
      ),
    },
    {
      heading: "4. Acceptable Use",
      body: (
        <>
          <p>You agree not to use the Service to:</p>
          <ul>
            <li>Violate any applicable laws or regulations.</li>
            <li>Submit, upload, or share content that is unlawful, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable.</li>
            <li>Infringe upon the intellectual property rights of any third party.</li>
            <li>Attempt to gain unauthorized access to any portion of the Service.</li>
            <li>Interfere with or disrupt the integrity or performance of the Service.</li>
            <li>Use automated systems (bots, scrapers, etc.) to access the Service without our prior written consent.</li>
            <li>Reverse engineer, decompile, or disassemble any part of the Service.</li>
            <li>Use the Service for any commercial purpose without our express authorization.</li>
          </ul>
        </>
      ),
    },
    {
      heading: "5. User Content",
      body: (
        <>
          <p>You retain ownership of the content you submit to the Service (&quot;User Content&quot;). By submitting User Content, you grant us a limited, non-exclusive, worldwide, royalty-free license to process, store, and use your content solely for the purpose of providing the Service to you.</p>
          <p>You are solely responsible for your User Content and represent that you have all rights necessary to grant us the license described above. We do not claim ownership over your User Content.</p>
        </>
      ),
    },
    {
      heading: "6. AI-Generated Content",
      body: (
        <>
          <p>The Service generates content using artificial intelligence technologies provided by third-party AI providers. You acknowledge that:</p>
          <ul>
            <li>AI-generated content may not always be accurate, complete, or up-to-date.</li>
            <li>AI-generated content should not be relied upon as a substitute for professional advice (educational, medical, legal, or otherwise).</li>
            <li>You are responsible for reviewing and verifying any AI-generated content before relying on it.</li>
          </ul>
          <p>We do not use your User Content to train AI models unless you explicitly opt in.</p>
        </>
      ),
    },
    {
      heading: "7. Subscriptions and Payments",
      body: (
        <>
          <p>Certain features of the Service may require a paid subscription. Subscription terms, including pricing and billing cycles, are described at the time of purchase and may be modified with advance notice.</p>
          <ul>
            <li>Subscription fees are non-refundable except as required by applicable law or as described in our refund policy.</li>
            <li>You may cancel your subscription at any time. Upon cancellation, you will continue to have access until the end of the current billing period.</li>
            <li>We reserve the right to change subscription pricing with at least 30 days&apos; advance notice.</li>
          </ul>
        </>
      ),
    },
    {
      heading: "8. Intellectual Property",
      body: <p>The Service and its original content (excluding User Content), features, and functionality are and will remain the exclusive property of Mr.🆖 ProReader and its licensors. The Service is protected by copyright, trademark, and other laws. Our trademarks and trade dress may not be used in connection with any product or service without prior written consent.</p>,
    },
    {
      heading: "9. Limitation of Liability",
      body: (
        <>
          <p>To the maximum extent permitted by applicable law, in no event shall Mr.🆖 ProReader, its affiliates, directors, employees, agents, or licensors be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, or goodwill, arising out of or related to your use of the Service.</p>
          <p>Our total liability to you for any claims arising out of or relating to the Service shall not exceed the amount you have paid to us in the twelve (12) months preceding the event giving rise to the claim, or one hundred US dollars ($100), whichever is greater.</p>
        </>
      ),
    },
    {
      heading: "10. Disclaimer of Warranties",
      body: (
        <>
          <p>The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. To the fullest extent permitted by law, we disclaim all warranties, express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.</p>
          <p>We do not warrant that the Service will be uninterrupted, timely, secure, or error-free. We make no warranty that the results obtained from the use of the Service will be accurate or reliable.</p>
        </>
      ),
    },
    {
      heading: "11. Indemnification",
      body: <p>You agree to defend, indemnify, and hold harmless Mr.🆖 ProReader and its officers, directors, employees, agents, licensors, and suppliers from and against any claims, actions, demands, liabilities, and settlements including legal fees arising from or related to your use of the Service, your violation of these Terms, or your violation of any rights of another party.</p>,
    },
    {
      heading: "12. Termination",
      body: (
        <>
          <p>We may terminate or suspend your access to the Service immediately, without prior notice, for any reason, including but not limited to a breach of these Terms. Upon termination, your right to use the Service will immediately cease.</p>
          <p>All provisions of these Terms that by their nature should survive termination shall survive, including but not limited to ownership provisions, warranty disclaimers, indemnification clauses, and limitations of liability.</p>
        </>
      ),
    },
    {
      heading: "13. Changes to Terms",
      body: <p>We reserve the right to modify these Terms at any time. If we make material changes, we will notify you by updating the &quot;Effective Date&quot; at the top of these Terms and, where appropriate, by providing additional notice such as through the Service or by email. Your continued use of the Service after any such changes constitutes your acceptance of the updated Terms.</p>,
    },
    {
      heading: "14. Governing Law",
      body: <p>These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Mr.🆖 ProReader operates, without regard to its conflict of law provisions. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts in that jurisdiction.</p>,
    },
    {
      heading: "15. Contact Us",
      body: (
        <>
          <p>If you have any questions about these Terms, please contact us at:</p>
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
  title: "服務條款",
  effectiveDate: "生效日期：2026 年 4 月 5 日",
  backToHome: "返回首頁",
  intro: [
    <>歡迎閱讀 <strong>Mr.🆖 ProReader</strong>（以下簡稱「服務」）的服務條款（以下簡稱「本條款」）。本條款規範您對本服務的存取與使用。本服務是一個基於人工智慧的英語閱讀輔助平台，可將閱讀材料轉化為互動學習體驗。</>,
    <>請仔細閱讀本條款。當您存取或使用本服務時，即表示您同意受本條款約束。若您不同意本條款，請勿使用本服務。</>,
    <>就本條款而言，「您」及「您的」係指作為服務使用者的您。若您代表某組織使用本服務，「您」包含您及該組織。</>,
  ],
  sections: [
    {
      heading: "1. 接受條款",
      body: <p>當您建立帳號、存取或使用本服務時，即表示您確認接受本條款並同意遵守。若您不同意，請勿存取或使用本服務。</p>,
    },
    {
      heading: "2. 服務描述",
      body: (
        <>
          <p>Mr.🆖 ProReader 是一個基於人工智慧的教育平台，提供英語閱讀輔助工具，包括但不限於：</p>
          <ul>
            <li>基於 OCR 的圖像及文件文字擷取</li>
            <li>AI 生成的閱讀摘要及改寫文本</li>
            <li>互動式詞彙表及閱讀理解測驗</li>
            <li>思維導圖及視覺化學習工具</li>
            <li>文字轉語音及句子分析功能</li>
            <li>遊戲化學習元素，如成就及排行榜</li>
          </ul>
          <p>本服務依賴第三方 AI 供應商生成內容。我們不保證任何 AI 生成輸出的準確性、完整性或可靠性。</p>
        </>
      ),
    },
    {
      heading: "3. 使用者帳號",
      body: (
        <>
          <p>為存取本服務的某些功能，您可能需要建立帳號。建立帳號時，您同意：</p>
          <ul>
            <li>在註冊時提供準確、最新及完整的資訊。</li>
            <li>維護並及時更新您的帳號資訊，以確保其準確、最新及完整。</li>
            <li>維護您帳號憑證的安全及機密性。</li>
            <li>對您帳號下發生的所有活動承擔責任。</li>
            <li>若發現您的帳號被未經授權使用，請立即通知我們。</li>
          </ul>
        </>
      ),
    },
    {
      heading: "4. 可接受使用",
      body: (
        <>
          <p>您同意不將本服務用於以下目的：</p>
          <ul>
            <li>違反任何適用法律或法規。</li>
            <li>提交、上傳或分享非法、有害、威脅、辱罵、騷擾、誹謗或其他令人反感的內容。</li>
            <li>侵犯任何第三方的知識產權。</li>
            <li>試圖未經授權存取本服務的任何部分。</li>
            <li>干擾或破壞本服務的完整性或性能。</li>
            <li>未經我們事先書面同意，使用自動化系統（機器人、爬蟲等）存取本服務。</li>
            <li>對本服務的任何部分進行逆向工程、反編譯或反彙編。</li>
            <li>未經我們明確授權，將本服務用於任何商業目的。</li>
          </ul>
        </>
      ),
    },
    {
      heading: "5. 使用者內容",
      body: (
        <>
          <p>您保留對提交至本服務的內容（「使用者內容」）的所有權。提交使用者內容即表示您授予我們有限的、非獨家的、全球性的、免版稅的許可，僅為向您提供服務的目的處理、儲存及使用您的內容。</p>
          <p>您對您的使用者內容負全部責任，並表示您擁有授予上述許可所需的所有權利。我們不對您的使用者內容主張所有權。</p>
        </>
      ),
    },
    {
      heading: "6. AI 生成內容",
      body: (
        <>
          <p>本服務使用第三方 AI 供應商提供的人工智慧技術生成內容。您承認：</p>
          <ul>
            <li>AI 生成的內容未必始終準確、完整或最新。</li>
            <li>AI 生成的內容不應被依賴為專業建議（教育、醫療、法律或其他）的替代品。</li>
            <li>您有責任在依賴任何 AI 生成內容之前進行審查和驗證。</li>
          </ul>
          <p>除非您明確選擇加入，否則我們不會使用您的使用者內容來訓練 AI 模型。</p>
        </>
      ),
    },
    {
      heading: "7. 訂閱與付款",
      body: (
        <>
          <p>本服務的某些功能可能需要付費訂閱。訂閱條款（包括價格及計費週期）在購買時說明，並可能經提前通知後修改。</p>
          <ul>
            <li>訂閱費用一經支付，除適用法律或退款政策另有規定外，概不退還。</li>
            <li>您可以隨時取消訂閱。取消後，您將在當前計費期結束前繼續享有存取權限。</li>
            <li>我們保留在提前至少 30 天通知的情況下更改訂閱價格的權利。</li>
          </ul>
        </>
      ),
    },
    {
      heading: "8. 知識產權",
      body: <p>本服務及其原始內容（不包括使用者內容）、功能及特性均為 Mr.🆖 ProReader 及其授權方的獨有財產，且將繼續歸其所有。本服務受版權、商標及其他法律保護。未經事先書面同意，不得將我們的商標及商業外觀用於任何產品或服務。</p>,
    },
    {
      heading: "9. 責任限制",
      body: (
        <>
          <p>在適用法律允許的最大範圍內，Mr.🆖 ProReader 及其關聯公司、董事、僱員、代理人或授權方概不對因您使用本服務而產生的任何間接、附帶、特殊、後果性或懲罰性損害承擔責任，包括但不限於利潤、資料、使用或商譽的損失。</p>
          <p>我們對因本服務引起或與之相關的任何索賠的總責任，不超過您在引發索賠的事件發生前十二（12）個月內向我們支付的款項，或一百美元（$100），以較高者為準。</p>
        </>
      ),
    },
    {
      heading: "10. 免責聲明",
      body: (
        <>
          <p>本服務按「現狀」及「可用」基礎提供。在法律允許的最大範圍內，我們免除所有明示或暗示的保證，包括但不限於對適銷性、特定用途適用性及不侵權的暗示保證。</p>
          <p>我們不保證本服務將不間斷、及時、安全或無錯誤。我們不保證使用本服務所獲得的結果將準確或可靠。</p>
        </>
      ),
    },
    {
      heading: "11. 賠償",
      body: <p>您同意為 Mr.🆖 ProReader 及其高級職員、董事、僱員、代理人、授權方及供應商辯護、賠償並使其免受因您使用本服務、違反本條款或侵犯任何第三方權利而引起或相關的任何索賠、訴訟、要求、責任及和解（包括法律費用）的損害。</p>,
    },
    {
      heading: "12. 終止",
      body: (
        <>
          <p>我們可因任何原因（包括但不限於違反本條款），立即在不事先通知的情況下終止或暫停您對本服務的存取權限。終止後，您使用本服務的權利將立即停止。</p>
          <p>本條款中按其性質應在終止後繼續有效的條款將繼續有效，包括但不限於所有權條款、保證免責聲明、賠償條款及責任限制。</p>
        </>
      ),
    },
    {
      heading: "13. 條款變更",
      body: <p>我們保留隨時修改本條款的權利。若我們作出重大變更，將更新本條款頂部的「生效日期」，並在適當情況下通過本服務或電子郵件提供額外通知。您在作出任何此類變更後繼續使用本服務，即構成您接受更新後的條款。</p>,
    },
    {
      heading: "14. 管轄法律",
      body: <p>本條款應受 Mr.🆖 ProReader 營運所在司法管轄區的法律管轄並據其解釋，不考慮其法律衝突條款。因本條款引起或與之相關的任何爭議應提交該司法管轄區的有管轄權法院專屬管轄。</p>,
    },
    {
      heading: "15. 聯絡我們",
      body: (
        <>
          <p>若您對本條款有任何疑問，請透過以下方式聯絡我們：</p>
          <ul>
            <li>電郵：<a href="mailto:support@mr5ai.com">support@mr5ai.com</a></li>
            <li>網站：<a href="https://api.mr5ai.com/" target="_blank" rel="noopener noreferrer">https://api.mr5ai.com/</a></li>
          </ul>
        </>
      ),
    },
  ],
};

export default function TermsOfServicePage() {
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
