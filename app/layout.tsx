import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GA4Tracker from "@/components/GA4Tracker";
import ExitIntentModal from "@/components/ExitIntentModal";
import { Suspense } from "react";

const rubik = Rubik({
  subsets: ["latin", "hebrew"],
  variable: "--font-rubik",
  display: "swap",
});

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
  },
  openGraph: {
    type: "website",
    locale: "he_IL",
    url: "https://ali-deals.co.il",
    siteName: "AliDeals ישראל",
    title: "AliDeals - סקירות מוצרים, טבלאות TOP 5 ודילים באלי אקספרס",
    description:
      "פורטל הקניות וההשוואות המוביל למוצרי אלי אקספרס בישראל. סקירות עומק כנות, בדיקת פטור ממכס ($75) והשוואת מחירי מבצע.",
    images: [
      {
        url: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&h=630&fit=crop&q=80",
        width: 1200,
        height: 630,
        alt: "AliDeals ישראל",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AliDeals - סקירות מוצרים, טבלאות TOP 5 ודילים באלי אקספרס",
    description:
      "פורטל הקניות וההשוואות המוביל למוצרי אלי אקספרס בישראל. בדיקת פטור ממכס ($75) והשוואת מחירי מבצע.",
    images: ["https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&h=630&fit=crop&q=80"],
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://ali-deals.co.il/#website",
        "url": "https://ali-deals.co.il",
        "name": "AliDeals ישראל",
        "description": "פורטל הקניות וההשוואות המוביל למוצרי אלי אקספרס בישראל",
        "inLanguage": "he-IL",
      },
      {
        "@type": "Organization",
        "@id": "https://ali-deals.co.il/#organization",
        "name": "AliDeals ישראל",
        "url": "https://ali-deals.co.il",
        "logo": "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=400&fit=crop&q=80",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900 antialiased">
        <Suspense fallback={null}>
          <GA4Tracker />
        </Suspense>
        <ExitIntentModal />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
