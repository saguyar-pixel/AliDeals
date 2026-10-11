import { Metadata } from "next";
import ArticlesPage from "@/app/articles/page";

export const revalidate = 900; // ISR — 15 minutes

export const metadata: Metadata = {
  title: "הבלוג של רוֹן: מדריכי קנייה, סקירות ומבצעים | AliDeals ישראל",
  description:
    "הבלוג הרשמי של רוֹן ב-AliDeals ישראל: תחקירי צרכנות מעמיקים, תקנות מכס ומיסוי 2026, פסטיבלי הנחות (11.11, בלאק פרייד), המרת מידות, זיהוי מוכרים אמינים ומדריכי קנייה חכמים.",
  alternates: {
    canonical: "https://ali-deals.co.il/articles",
  },
  openGraph: {
    title: "הבלוג של רוֹן: מדריכי קנייה ומאמרי צרכנות | AliDeals ישראל",
    description:
      "תחקירי עומק, סקירות מוצרים ומדריכי צרכנות של רוֹן לקונים ישראלים באלי אקספרס.",
    url: "https://ali-deals.co.il/articles",
    siteName: "AliDeals ישראל",
    type: "website",
    locale: "he_IL",
  },
};

export default ArticlesPage;
