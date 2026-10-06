"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Search, BookOpen, Calendar, Clock, ChevronLeft, Tag, Sparkles } from "lucide-react";
import { PageRecord } from "@/lib/db";

interface ArticlesHubClientProps {
  articles: PageRecord[];
  allCategories: string[];
}

export default function ArticlesHubClient({
  articles,
  allCategories,
}: ArticlesHubClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("הכל");

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      // Category filter
      if (selectedCategory !== "הכל") {
        const cat = article.targetCategory || "";
        if (cat !== selectedCategory) return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      const title = (article.title || "").toLowerCase();
      const desc = (article.metaDescription || article.directAnswerGeo || "").toLowerCase();
      const tags = (article.tags || []).join(" ").toLowerCase();

      return title.includes(query) || desc.includes(query) || tags.includes(query);
    });
  }, [articles, selectedCategory, searchQuery]);

  const featuredArticle = filteredArticles[0];
  const regularArticles = filteredArticles.slice(1);

  return (
    <div className="space-y-8" dir="rtl">
      {/* Search & Category Filter Controls */}
      <div className="bg-slate-50 p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חפש מדריך, נושא או מילת מפתח (לדוגמה: מכס, 11.11, מידות, תקע)..."
            className="w-full pr-12 pl-4 py-3.5 rounded-2xl bg-white border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700 bg-slate-100 px-2 py-1 rounded-md"
            >
              נקה
            </button>
          )}
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {["הכל", ...allCategories].map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                    : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/60"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {filteredArticles.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 rounded-3xl border border-slate-200">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">לא נמצאו מדריכים התואמים לחיפוש</h3>
          <p className="text-xs text-slate-500 mt-1">נסה לחפש במילים אחרות או בחר קטגוריה שונה</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("הכל");
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors"
          >
            אפס סינונים
          </button>
        </div>
      ) : (
        <>
          {/* Featured Article Card (shown if on first page & has articles) */}
          {featuredArticle && !searchQuery && selectedCategory === "הכל" && (
            <Link
              href={`/articles/${featuredArticle.slug}`}
              className="group block bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl overflow-hidden shadow-xl text-white relative transition-transform hover:-translate-y-1 duration-300"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 lg:p-10 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>מדריך נבחר</span>
                    </span>
                    <span className="text-xs text-indigo-200 font-medium">
                      {featuredArticle.targetCategory || "מדריך צרכנות"}
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight group-hover:text-amber-300 transition-colors">
                    {featuredArticle.title}
                  </h2>

                  <p className="text-sm sm:text-base text-slate-300 line-clamp-3 leading-relaxed">
                    {featuredArticle.metaDescription || featuredArticle.directAnswerGeo}
                  </p>

                  <div className="pt-2 flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>
                        {featuredArticle.updatedAt
                          ? new Date(featuredArticle.updatedAt).toLocaleDateString("he-IL")
                          : "2026"}
                      </span>
                    </span>
                    <span className="text-amber-400 font-bold flex items-center gap-1 group-hover:underline">
                      <span>קרא את המדריך המלא</span>
                      <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="aspect-16/10 rounded-2xl overflow-hidden bg-slate-800 border border-white/10 shadow-lg relative">
                    {featuredArticle.featuredImage ? (
                      <img
                        src={featuredArticle.featuredImage}
                        alt={featuredArticle.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="eager"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-900/50">
                        <BookOpen className="w-16 h-16 text-indigo-400/40" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Articles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(searchQuery || selectedCategory !== "הכל"
              ? filteredArticles
              : regularArticles
            ).map((article) => {
              const words = (article.contentMarkdown || "").split(/\s+/).filter(Boolean).length;
              const readTime = Math.max(2, Math.ceil(words / 180));

              return (
                <Link
                  key={article.id}
                  href={`/articles/${article.slug}`}
                  className="group bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-xl hover:border-indigo-300 transition-all flex flex-col duration-300"
                >
                  {/* Card Image */}
                  <div className="aspect-16/10 bg-slate-100 overflow-hidden relative">
                    {article.featuredImage ? (
                      <img
                        src={article.featuredImage}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 text-slate-300">
                        <BookOpen className="w-10 h-10" />
                      </div>
                    )}
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold">
                      {article.targetCategory || "מדריך"}
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {article.updatedAt
                            ? new Date(article.updatedAt).toLocaleDateString("he-IL")
                            : "2026"}
                        </span>
                        <span>•</span>
                        <Clock className="w-3 h-3" />
                        <span>{readTime} דק' קריאה</span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                        {article.title}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {article.metaDescription || article.directAnswerGeo}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
                      <span>קרא מדריך</span>
                      <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
