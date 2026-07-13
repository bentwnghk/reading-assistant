import { ImageResponse } from "next/og";
import { APP_DESCRIPTION, APP_NAME } from "@/constants/site";

export const runtime = "nodejs";
export const alt = APP_NAME;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0e7490 100%)",
          fontFamily: "sans-serif",
          padding: "80px",
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: "24px",
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 110 }}>Mr.🆖</span> ProReader
        </div>
        <div
          style={{
            fontSize: 38,
            color: "#cbd5e1",
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.4,
          }}
        >
          AI-Powered English Reading Assistant
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#94a3b8",
            marginTop: 40,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {["Reading", "Vocabulary", "Grammar", "Comprehension", "Quizzes"].map(
            (t) => (
              <span
                key={t}
                style={{
                  background: "rgba(255,255,255,0.12)",
                  borderRadius: 999,
                  padding: "10px 24px",
                }}
              >
                {t}
              </span>
            )
          )}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

// Keep APP_DESCRIPTION referenced for future description enrichment.
void APP_DESCRIPTION;
