import Link from "next/link";
import { ShoppingBag, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 text-sm border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-ali-600 flex items-center justify-center text-white font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold text-white">
                Ali<span className="text-ali-500">Deals</span>
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              פורטל הקניות וההשוואות המוביל למוצרי אלי אקספרס בישראל. אנו מנתחים אלפי ביקורות, בודקים מפרטים טכניים,
              תאימות לשקעי חשמל בישראל ופטור ממכס ומע&quot;מ, כדי לעזור לכם למצוא את המוצרים הכי משתלמים בלי הפתעות.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">ניווט מהיר</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  עמוד הבית
                </Link>
              </li>
              <li>
                <Link href="/#reviews" className="hover:text-white transition-colors">
                  סקירות מוצרים
                </Link>
              </li>
              <li>
                <Link href="/#top5" className="hover:text-white transition-colors">
                  טבלאות השוואת TOP 5
                </Link>
              </li>
              <li>
                <Link href="/#deals" className="hover:text-white transition-colors">
                  דילים חמים וקופונים
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">משפטי ותקנון</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  תנאי שימוש והגבלת אחריות
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  מדיניות פרטיות ואבטחת מידע
                </Link>
              </li>
              <li>
                <Link href="/accessibility" className="hover:text-white transition-colors">
                  הצהרת נגישות (ת&quot;י 5568)
                </Link>
              </li>
              <li>
                <Link href="/#customs-guide" className="hover:text-white transition-colors">
                  מדריך ומחשבון מכס ($75)
                </Link>
              </li>
            </ul>
          </div>

          {/* AI & SEO Crawlers */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">טכנולוגיה ושקיפות</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/sitemap.xml" className="hover:text-white transition-colors">
                  מפת אתר (Sitemap XML)
                </Link>
              </li>
              <li>
                <Link href="/llms.txt" className="hover:text-white transition-colors">
                  סורקי AI ו-GEO (llms.txt)
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Affiliate Disclosure */}
        <div className="pt-6 border-t border-slate-800/80 text-[11px] leading-relaxed text-slate-500 space-y-3">
          <p>
            <strong className="text-slate-400">גילוי נאות (Affiliate Disclosure):</strong> חלק מהקישורים באתר הם קישורי
            שותפים (Affiliate Links) של פלטפורמת AliExpress Portals. בעת ביצוע רכישה דרך הקישורים באתר, ייתכן ונקבל עמלה קטנה
            ללא כל עלות נוספת מצדכם. המחירים, הקופונים וזמינות המוצרים עשויים להשתנות מעת לעת באלי אקספרס בהתאם למוכר.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <span>© {new Date().getFullYear()} AliDeals ישראל. כל הזכויות שמורות.</span>
            <div className="flex items-center gap-3 text-slate-400 text-xs">
              <Link href="/terms" className="hover:text-white transition-colors">
                תנאי שימוש
              </Link>
              <span>•</span>
              <Link href="/privacy" className="hover:text-white transition-colors">
                מדיניות פרטיות
              </Link>
              <span>•</span>
              <Link href="/accessibility" className="hover:text-white transition-colors">
                הצהרת נגישות
              </Link>
            </div>
            <span className="flex items-center gap-1 text-slate-400">
              נבנה באהבה עם <Heart className="w-3.5 h-3.5 text-ali-500 fill-ali-500" /> ובינה מלאכותית של Gemini
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
