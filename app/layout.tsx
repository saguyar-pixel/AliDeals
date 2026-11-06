import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GA4Tracker from "@/components/GA4Tracker";
import ExitIntentModal from "@/components/ExitIntentModal";
import CommunityDropChannels from "@/components/CommunityDropChannels";
import WebMcpBridge from "@/components/agentic/WebMcpBridge";
import { Suspense } from "react";
import { supabaseDb } from "@/lib/db";
import { CustomHeadEmbed, CustomBodyEmbed } from "@/components/CustomHtmlEmbed";


const rubik = Rubik({
  subsets: ["latin", "hebrew"],
  variable: "--font-rubik",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#e62e04",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    template: "%s | AliDeals ישראל",
    default: "AliDeals - סקירות מוצרים, טבלאות TOP 5 ודילים באלי אקספרס",
  },
  description:
    "פורטל הקניות וההשוואות המוביל למוצרי אלי אקספרס בישראל. סקירות עומק כנות, אינפוגרפיקות בעברית, בדיקת פטור ממכס ($75) והשוואת מחירי מבצע.",
  keywords: [
    "אלי אקספרס",
    "AliExpress ישראל",
    "סקירות מוצרים",
    "טופ 5 אלי אקספרס",
    "קופונים אלי אקספרס",
    "פטור ממכס 75 דולר",
    "דילים באלי אקספרס",
    "השוואת מחירים",
    "קניות מסין",
  ],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il"),
  alternates: {
    canonical: "/",
    types: {
      "text/plain": "/llms.txt",
    },
  },
  openGraph: {
    type: "website",
    locale: "he_IL",
    url: "https://ali-deals.co.il",
    siteName: "AliDeals ישראל",
    title: "AliDeals - סקירות מוצרים, טבלאות TOP 5 ודילים באלי אקספרס",
    description:
      "פורטל הקניות וההשוואות המוביל למוצרי אלי אקספרס בישראל. סקירות עומק כנות, בדיקת פטור ממכס ($75) והשוואת מחירי מבצע.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AliDeals - סקירות מוצרים, טבלאות TOP 5 ודילים באלי אקספרס",
    description:
      "פורטל הקניות וההשוואות המוביל למוצרי אלי אקספרס בישראל. בדיקת פטור ממכס ($75) והשוואת מחירי מבצע.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/favicon.svg"],
  },
};
 
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let settings;
  let activeSnippets: any[] = [];
  try {
    const [fetchedSettings, fetchedSnippets] = await Promise.all([
      supabaseDb.getSettings(),
      supabaseDb.getCodeSnippets({ activeOnly: true }),
    ]);
    settings = fetchedSettings;
    activeSnippets = fetchedSnippets || [];
  } catch {
    // fallback gracefully
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il";

  const websiteSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        "url": baseUrl,
        "name": "AliDeals ישראל",
        "description": "פורטל הקניות וההשוואות המוביל למוצרי אלי אקספרס בישראל",
        "inLanguage": "he-IL",
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${baseUrl}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        "name": "AliDeals ישראל",
        "url": baseUrl,
        "logo": {
          "@type": "ImageObject",
          "url": `${baseUrl}/favicon.svg`,
        },
        "contactPoint": {
          "@type": "ContactPoint",
          "email": "contact@ali-deals.co.il",
          "contactType": "customer service",
          "availableLanguage": "Hebrew",
        },
      },
    ],
  };

  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <head>
        <CustomHeadEmbed settings={settings} snippets={activeSnippets} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema).replace(/</g, "\\u003c").replace(/>/g, "\\u003e"),
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900 antialiased">
        <CustomBodyEmbed settings={settings} snippets={activeSnippets} placement="body_start" />
        <Suspense fallback={null}>
          <GA4Tracker />
        </Suspense>
        <WebMcpBridge />
        <ExitIntentModal />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CommunityDropChannels />
        <CustomBodyEmbed snippets={activeSnippets} placement="body_end" />
      </body>
    </html>
  );
}
