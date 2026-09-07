import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GA4Tracker from "@/components/GA4Tracker";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il"),
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900 antialiased">
        <Suspense fallback={null}>
          <GA4Tracker />
        </Suspense>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
