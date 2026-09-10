# AliDeals AI Platform 🚀
> **פלטפורמת אתר אפיליאציה מתקדמת מבוססת SEO, GEO, Gemini AI ו-Cloud CMS ב-Vercel (גרסה C.02)**

---

## 🌟 סקירת המערכת (System Overview)

פלטפורמת **AliDeals** נבנתה במיוחד עבור משווקי שותפים מומחים (Affiliate Marketers) המכוונים למקסימום החזר השקעה (ROAS) ומהירות טעינה שיא:

1. **תשתית אירוח 100% חינמית לתמיד (GitHub Pages):**
   - ביצועי **100/100 ב-Core Web Vitals** וטעינה מיידית מ-CDN גלובלי.
   - חיבור ישיר ל-**Custom Domain** (כגון `alideals.co.il` או `alideals.com`) כולל תעודת SSL/HTTPS חינמית ומאובטחת.
   - אוטומציית CI/CD מלאה ב-**GitHub Actions**: כל שינוי או הוספת מוצר נפרס אוטומטית תוך כ-40 שניות!

2. **אופטימיזציה כפולה: SEO קלאסי + GEO (Generative Engine Optimization):**
   - התאמה לציטוט ישיר במנועי חיפוש מבוססי AI כגון **Perplexity, SearchGPT, Google Gemini ו-Google AI Overviews**.
   - בלוקי "Direct Answer" מובנים (שורה תחתונה ממוקדת).
   - נתונים מובנים מלאים של **Schema.org** (`Product`, `Review`, `ItemList` ל-TOP 5, `FAQPage`, `BreadcrumbList`).
   - קובץ `llms.txt` ו-`sitemap.xml` אוטומטיים לסורקי בינה מלאכותית.

3. **מנוע דאטה כפול לאלי אקספרס (API + Scraper):**
   - **סקרייפר חכם:** מפענח ישירות כל לינק מוצר (דסקטופ, מובייל, לינקים מקוצרים), שולף מפרטים טכניים, תמונות גלריה וביקורות קונים מאומתות.
   - **חיבור API רשמי (AliExpress Open Platform):** מנגנון חתימות קריפטוגרפיות (MD5/HMAC) לשליפת עמלות אפיליאציה בזמן אמת ויצירת קישורים מקוצרים עם SubID.

4. **סטודיו Gemini לתוכן ולאינפוגרפיקות (בשימור מראה המוצר):**
   - כתיבה שיווקית אמינה מותאמת לשוק הישראלי (שקע EU, פטור מכס עד 75$, המלצות משלוח וזמני הגעה).
   - יצירת **אינפוגרפיקות וקטוריות חדות בעברית (SVG)** המלבישות תגיות, באדג'ים וחיצים סביב תמונת המוצר המקורית ללא עיוותי פונט ב-AI.

5. **תשתית מדידה וארביטראז' איקומרס (PPC Arbitrage & GA4):**
   - חילוץ דינמי של פרמטרי UTM (`utm_source`, `utm_campaign`, `gclid`, `fbclid`) בצד לקוח.
   - הזרקת **SubIDs** אוטומטית לקישורי אלי אקספרס ושידור אירוע `affiliate_outbound_click` ל-GA4.
   - מחשבון ארביטראז' מובנה ב-CMS לחישוב יחידת כלכלה: CPC מול RPC ו-ROAS.

---

## 🛠️ התקנה והרצה מקומית (Local Setup)

1. **התקנת תלויות:**
   ```bash
   npm install
   ```

2. **הגדרת קובץ סביבה:**
   העתק את קובץ הדוגמה לקובץ מקומי:
   ```bash
   cp .env.example .env.local
   ```
   והזן את המפתחות שברשותך:
   - `GEMINI_API_KEY`: מפתח מ-Google AI Studio.
   - `ALIEXPRESS_APP_KEY` ו-`ALIEXPRESS_APP_SECRET`: מחשבון מפתח ב-AliExpress Portals.
   - `NEXT_PUBLIC_GA_ID`: מזהה מדידה מ-Google Analytics 4 (למשל `G-XXXXXXXXXX`).

3. **הרצת שרת הפיתוח וה-CMS:**
   ```bash
   npm run dev
   ```
   פתח את הדפדפן בכתובת:
   - האתר הציבורי: [http://localhost:3000](http://localhost:3000)
   - סטודיו הניהול (CMS): [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 🚀 פריסה ל-GitHub Pages עם דומיין אישי (Deployment)

1. **עדכון הדומיין שלך:**
   ערוך את הקובץ `public/CNAME` והזן את הדומיין שרכשת (למשל: `alideals.co.il`).

2. **דחיפה למאגר ה-GitHub:**
   ```bash
   git add .
   git commit -m "Add new products and reviews"
   git push origin main
   ```

3. **הפעלת GitHub Pages במאגר:**
   - היכנס להגדרות המאגר ב-GitHub: **Settings > Pages**.
   - תחת **Build and deployment > Source**, בחר: **GitHub Actions**.
   - זה הכל! קובץ ה-Workflow ב-`.github/workflows/deploy.yml` יבנה ויפרוס את האתר אוטומטית!

4. **הגדרת DNS ברשם הדומיין שלך:**
   הפנה את רשומות ה-DNS של הדומיין לכתובות של GitHub Pages:
   - **A Records (@):**
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
   - **CNAME Record (www):** `your-username.github.io`

---

## 📂 מבנה התיקיות בפרויקט (Project Structure)

```
AliDeals/
├── .github/workflows/deploy.yml # תהליך פריסה אוטומטי ל-GitHub Pages
├── app/
│   ├── (public)/                # עמודי האתר הציבוריים (SSG)
│   │   ├── page.tsx             # דף הבית הראשי
│   │   ├── reviews/[slug]/      # עמודי סקירת מוצר מעמיקה
│   │   ├── top5/[slug]/         # טבלאות השוואת TOP 5
│   │   ├── sitemap.ts           # מפת אתר דינמית (Sitemap XML)
│   │   └── llms.txt/route.ts    # קובץ ישויות ותוכן עבור סורקי AI ו-GEO
│   ├── admin/                   # סטודיו CMS מקומי
│   │   ├── page.tsx             # דשבורד מנהל
│   │   ├── ingest/page.tsx      # מסך הזנת מוצר וג'ינרוט ב-Gemini
│   │   ├── pages/page.tsx       # ניהול עמודים
│   │   └── arbitrage/page.tsx   # דשבורד ארביטראז', CPC/RPC ו-SubIDs
│   └── api/                     # נתיבי עזר מקומיים ל-CMS (Ingest, Generate, Publish)
├── components/                  # רכיבי UI ממירים (Sticky CTA, טבלאות, אינפוגרפיקה)
├── data/                        # מסד נתונים Git-based שטוח (JSON)
│   ├── products.json            # מוצרי אלי אקספרס שמורים
│   ├── pages.json               # עמודי תוכן, סקירות וטבלאות
│   └── categories.json          # קטגוריות ראשיות
├── lib/
│   ├── aliexpress/              # סקרייפר חכם + מודול API רשמי
│   ├── gemini/                  # מחולל תוכן SEO/GEO ומחולל אינפוגרפיקות SVG
│   ├── tracking/                # מנוע חילוץ UTM והזרקת SubIDs
│   └── seo/                     # מחוללי סכמות Schema.org (JSON-LD)
├── public/
│   └── CNAME                    # הגדרת דומיין מותאם אישית ל-GitHub Pages
├── next.config.ts               # הגדרת Static Export (output: 'export')
└── package.json
```
