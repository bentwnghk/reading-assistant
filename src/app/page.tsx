import { Suspense } from "react";
import { APP_DESCRIPTION, APP_NAME, SITE_URL } from "@/constants/site";
import HomeShell from "@/components/Internal/HomeShell";

// JSON-LD structured data for the landing page. This file is a Server
// Component, so it renders once on the server: non-NEXT_PUBLIC env vars such
// as APP_URL stay available (SITE_URL is correct here, not inlined as
// localhost into the client bundle) and the script never re-renders on the
// client. The landing content itself is prerendered inside HomeShell while
// the auth session is still "loading" — see the SEO note there.
const landingJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: APP_NAME,
  url: SITE_URL,
  description: APP_DESCRIPTION,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd) }}
      />
      <Suspense fallback={null}>
        <HomeShell />
      </Suspense>
    </>
  );
}
