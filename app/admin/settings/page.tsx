import { Settings, Key, Globe, Github, CheckCircle2 } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">תצורה ותשתית</span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">הגדרות פריסה ו-API</h1>
        <p className="text-sm text-slate-500 mt-1">
          מדריך מלא להגדרת דומיין מותאם ב-GitHub Pages וחיבור מפתחות ה-API של Gemini ואלי אקספרס.
        </p>
      </div>

      {/* GitHub Pages & Custom Domain Guide */}
      <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <Globe className="w-5 h-5 text-ali-600" />
          <h2 className="font-bold text-base text-slate-900">הגדרת דומיין מותאם ו-GitHub Pages (בחינם לתמיד)</h2>
        </div>

        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 text-sm">שלב 1: הגדרת המאגר ב-GitHub</h4>
            <p>
              במאגר ה-GitHub שלך, היכנס ל-<strong>Settings &gt; Pages</strong>.<br />
              תחת <strong>Build and deployment &gt; Source</strong>, בחר באפשרות <strong>GitHub Actions</strong>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 text-sm">שלב 2: הגדרת הדומיין שרכשת (Custom Domain)</h4>
            <p>
              1. עדכן את קובץ ה-<code>public/CNAME</code> בפרויקט עם שם הדומיין שלך (למשל: <code>alideals.co.il</code>).<br />
              2. ברשם הדומיינים שבו קנית את הדומיין (כגון Box, LiveDns, Namecheap), הפנה את רשומות ה-DNS:
            </p>
            <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] space-y-1">
              <div>A Record @ 185.199.108.153</div>
              <div>A Record @ 185.199.109.153</div>
              <div>A Record @ 185.199.110.153</div>
              <div>A Record @ 185.199.111.153</div>
              <div>CNAME www your-github-username.github.io</div>
            </div>
            <p className="text-emerald-700 font-semibold">
              ✓ GitHub Pages מנפיק אוטומטית תעודת SSL/HTTPS חינמית ומאובטחת!
            </p>
          </div>
        </div>
      </section>

      {/* API Keys Configuration Guide */}
      <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <Key className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-base text-slate-900">הגדרת מפתחות סביבה (.env.local)</h2>
        </div>

        <div className="space-y-4 text-xs text-slate-700">
          <p>
            מפתחות אלו נשמרים מקומית במחשב שלך בקובץ <code>.env.local</code> ומשמשים את ה-CMS המקומי בלבד:
          </p>

          <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-[11px] space-y-2">
            <div># מפתח Google Gemini API לג&apos;נרוט תוכן ואינפוגרפיקות</div>
            <div className="text-emerald-400">GEMINI_API_KEY=&quot;AIzaSy...&quot;</div>
            <div className="pt-2"># מפתחות AliExpress Open Platform (Affiliate Portals)</div>
            <div className="text-emerald-400">ALIEXPRESS_APP_KEY=&quot;50...&quot;</div>
            <div className="text-emerald-400">ALIEXPRESS_APP_SECRET=&quot;...&quot;</div>
            <div className="text-emerald-400">ALIEXPRESS_TRACKING_ID=&quot;default&quot;</div>
            <div className="pt-2"># סיסמת כניסה ל-CMS בענן</div>
            <div className="text-emerald-400">ADMIN_PASSWORD=&quot;alideals2025&quot;</div>
            <div className="pt-2"># סנכרון אוטומטי ל-GitHub בענן (אופציונלי)</div>
            <div className="text-emerald-400">GITHUB_TOKEN=&quot;ghp_...&quot;</div>
            <div className="pt-2"># Google Analytics 4</div>
            <div className="text-emerald-400">NEXT_PUBLIC_GA_ID=&quot;G-XXXXXXXXXX&quot;</div>
          </div>
        </div>
      </section>

      {/* Vercel Cloud CMS Guide */}
      <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <Globe className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-base text-slate-900">פריסת Cloud CMS חי ב-Vercel (חינם 100%)</h2>
        </div>

        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            כאשר האתר וה-CMS פרוסים ב-Vercel, אין צורך בשרת מקומי או בהתקנת תוכנות על המחשב.
            ניתן להיכנס מכל מכשיר ישירות אל <code>https://your-domain/admin</code>.
          </p>

          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
            <h4 className="font-bold text-indigo-950 text-sm">הגדרת Environment Variables ב-Vercel Dashboard</h4>
            <p className="text-slate-600">
              ב-Vercel, תחת <strong>Project Settings &gt; Environment Variables</strong>, הגדר:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 font-mono text-[11px]">
              <li>ALIEXPRESS_APP_KEY: 545964</li>
              <li>ALIEXPRESS_APP_SECRET: 2kUm0i4cpXCEpmSXhNB43SZ39s88t63e</li>
              <li>ALIEXPRESS_TRACKING_ID: default</li>
              <li>ADMIN_PASSWORD: (בחר סיסמה מאובטחת לפי בחירתך)</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
