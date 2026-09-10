"use client";

import { useState, useEffect, useRef } from "react";
import {
  Users,
  Send,
  Sparkles,
  Bot,
  Activity,
  CheckCircle2,
  RefreshCw,
  Clock,
  ShieldCheck,
  Palette,
  BarChart3,
  Feather,
  Crown,
  Code2,
  TrendingUp,
  Target,
  Sliders,
  Check,
  AlertCircle,
} from "lucide-react";
import { AgentLogEntry, CadenceBudget, OrchestratorMessage, AutonomousTask, CroRecommendation } from "@/lib/agent/types";
import { SiteAnalyticsSummary } from "@/lib/analytics/cro-engine";

export default function AgentTeamPage() {
  const [messages, setMessages] = useState<OrchestratorMessage[]>([]);
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [budget, setBudget] = useState<CadenceBudget | null>(null);
  const [analytics, setAnalytics] = useState<SiteAnalyticsSummary | null>(null);
  const [tasks, setTasks] = useState<AutonomousTask[]>([]);

  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isPolling, setIsPolling] = useState(true);

  // Maya visual preference
  const [visualPreference, setVisualPreference] = useState<"infographic" | "lifestyle_woman" | "lifestyle_man">("infographic");

  // Dynamic quota state
  const [dailyQuotaInput, setDailyQuotaInput] = useState<number>(3);
  const [isUpdatingQuota, setIsUpdatingQuota] = useState(false);
  const [quotaUpdatedMsg, setQuotaUpdatedMsg] = useState(false);

  // Live Task Runner State
  const [runningTask, setRunningTask] = useState<string | null>(null);
  const [taskFeedback, setTaskFeedback] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/agent/status");
      const data = await res.json();
      if (data.budget) {
        setBudget(data.budget);
        setDailyQuotaInput(data.budget.dailyProductsTarget);
      }
      if (data.logs) setLogs(data.logs);
      if (data.messages) setMessages(data.messages);
      if (data.analytics) setAnalytics(data.analytics);
      if (data.tasks) setTasks(data.tasks);
    } catch (e) {
      console.warn("Status fetch failed", e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      if (isPolling) fetchStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [isPolling]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const userText = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: userText,
          visualPreference,
        }),
      });
      await fetchStatus();
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateQuota = async () => {
    setIsUpdatingQuota(true);
    try {
      const res = await fetch("/api/agent/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyProducts: dailyQuotaInput }),
      });
      const data = await res.json();
      if (data.budget) setBudget(data.budget);
      setQuotaUpdatedMsg(true);
      setTimeout(() => setQuotaUpdatedMsg(false), 2500);
    } catch (e) {
      console.error("Failed to update quota", e);
    } finally {
      setIsUpdatingQuota(false);
    }
  };

  const handleRunTask = async (taskType: string) => {
    setRunningTask(taskType);
    setTaskFeedback(null);
    try {
      const res = await fetch("/api/agent/run-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType,
          productUrl: "https://www.aliexpress.com/item/1005006392019482.html",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTaskFeedback("המשימה נשלחה בהצלחה! צפה בתוצאות ביומן הפעילות (Stream).");
        await fetchStatus();
      } else {
        setTaskFeedback(data.error || "שגיאה בהפעלת המשימה");
      }
    } catch {
      setTaskFeedback("שגיאת תקשורת בהפעלת המשימה");
    } finally {
      setRunningTask(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "orchestrator":
        return <Crown className="w-4 h-4 text-indigo-400" />;
      case "analyst":
        return <BarChart3 className="w-4 h-4 text-sky-400" />;
      case "copywriter":
        return <Feather className="w-4 h-4 text-amber-400" />;
      case "creative":
        return <Palette className="w-4 h-4 text-pink-400" />;
      case "qa_officer":
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case "developer":
        return <Code2 className="w-4 h-4 text-purple-400" />;
      default:
        return <Bot className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600">
              <Users className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Autonomous AI Team • Target: $100/Day Organic
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            חמ&quot;ל צוות הסוכנים האוטונומי
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            6 סוכנים מתמחים המנהלים את האתר באופן אוטונומי, מודדים RPC ומבצעים CRO לקראת יעד 100$ יומי.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>6 סוכנים מחוברים</span>
          </div>
          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
              isPolling
                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${isPolling ? "animate-spin" : ""}`} />
            <span>{isPolling ? "עדכון חי (Live)" : "מושהה"}</span>
          </button>
        </div>
      </div>

      {/* Target $100/Day Organic Revenue Progress Banner */}
      {analytics && (
        <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-indigo-900/50 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-amber-500/20 text-amber-400">
                  <Target className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  יעד עסקי עליון: 100$ רווח אורגני ליום
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">
                קצב הכנסה מוערך כעת: <span className="text-emerald-400">${analytics.dailyRevenueEstimateUsd}</span> / $100.00 ליום
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                דנה מנטרת קליקים אורגניים, שיעור המרה ו-RPC בכל מוצר. גל ורון מבצעים אופטימיזציות CRO מתמשכות להגדלת סך העמלות.
              </p>
            </div>

            {/* Progress Gauge */}
            <div className="w-full lg:w-72 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3 shrink-0">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">התקדמות ליעד</span>
                <span className="text-emerald-400">{analytics.progressToGoalPercent}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-700"
                  style={{ width: `${analytics.progressToGoalPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>צפיות: {analytics.totalViews.toLocaleString()}</span>
                <span>CTR: {analytics.averageCtrPercent}%</span>
                <span>RPC: ~$0.28</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6 Agents Specialist Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Orchestrator */}
        <div className="p-3.5 rounded-2xl bg-white border border-indigo-100 shadow-sm space-y-1.5 hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              👑
            </div>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
              מנהל צוות
            </span>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">אלון</h4>
            <p className="text-[10px] text-slate-500 line-clamp-1">אורקסטרטור ויעד 100$</p>
          </div>
        </div>

        {/* Data Analyst */}
        <div className="p-3.5 rounded-2xl bg-white border border-sky-100 shadow-sm space-y-1.5 hover:border-sky-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
              📊
            </div>
            <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
              דאטא & CRO
            </span>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">דנה</h4>
            <p className="text-[10px] text-slate-500 line-clamp-1">ניתוח אתר ו-RPC</p>
          </div>
        </div>

        {/* Copywriter */}
        <div className="p-3.5 rounded-2xl bg-white border border-amber-100 shadow-sm space-y-1.5 hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
              ✍️
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              קופי & GEO
            </span>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">רון</h4>
            <p className="text-[10px] text-slate-500 line-clamp-1">סקירות והוקים ל-AI</p>
          </div>
        </div>

        {/* Creative Director */}
        <div className="p-3.5 rounded-2xl bg-white border border-pink-100 shadow-sm space-y-1.5 hover:border-pink-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded-lg bg-pink-600 text-white flex items-center justify-center font-bold text-xs">
              🎨
            </div>
            <span className="text-[10px] font-bold text-pink-700 bg-pink-50 px-1.5 py-0.5 rounded">
              קריאייטיב
            </span>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">מיה</h4>
            <p className="text-[10px] text-slate-500 line-clamp-1">אינפוגרפיקה ולייפסטייל</p>
          </div>
        </div>

        {/* QA Officer */}
        <div className="p-3.5 rounded-2xl bg-white border border-emerald-100 shadow-sm space-y-1.5 hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              🛡️
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              QA ישראלי
            </span>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">עומר</h4>
            <p className="text-[10px] text-slate-500 line-clamp-1">שקע EU, סכמות ומכס</p>
          </div>
        </div>

        {/* Developer */}
        <div className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-sm space-y-1.5 hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
              💻
            </div>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
              פיתוח & CRO
            </span>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">גל</h4>
            <p className="text-[10px] text-slate-500 line-clamp-1">מהירות, A/B ו-UI</p>
          </div>
        </div>
      </div>

      {/* Live Agent Action Trigger Toolbar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-slate-900">הפעלת משימות בזמן אמת ע&quot;י הסוכנים:</h3>
            <span className="text-[11px] text-slate-500">לחץ להפעלת משימה אוטונומית וצפה בעדכון המיידי של ה-Stream</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleRunTask("cro_analysis")}
            disabled={Boolean(runningTask)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold border border-sky-200 transition-all disabled:opacity-50"
          >
            {runningTask === "cro_analysis" ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
            ) : (
              <BarChart3 className="w-3.5 h-3.5 text-sky-600" />
            )}
            <span>הפעל ניתוח CRO (דנה)</span>
          </button>

          <button
            type="button"
            onClick={() => handleRunTask("qa_audit")}
            disabled={Boolean(runningTask)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-all disabled:opacity-50"
          >
            {runningTask === "qa_audit" ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>בדיקת שקעים ומכס (עומר)</span>
          </button>

          <button
            type="button"
            onClick={() => handleRunTask("product_job")}
            disabled={Boolean(runningTask)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            {runningTask === "product_job" ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Crown className="w-3.5 h-3.5 text-white" />
            )}
            <span>משימת פיתוח מוצר (אלון)</span>
          </button>
        </div>
      </div>

      {taskFeedback && (
        <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{taskFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setTaskFeedback(null)}
            className="text-indigo-400 hover:text-indigo-700 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace (Interactive Chat with Alon + Live Log) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Chat & Controls */}
        <div className="lg:col-span-7 flex flex-col rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden h-[620px]">
          {/* Header with Visual Preference Switcher */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                אלון
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-slate-900">שיחה ומתן פקודות לאלון</h3>
                <span className="text-[10px] text-slate-500">המנהל מתאם בין כל 6 הסוכנים</span>
              </div>
            </div>

            {/* Maya's Visual Mode Selector */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-500 px-1">מיה מייצרת:</span>
              <button
                type="button"
                onClick={() => setVisualPreference("infographic")}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                  visualPreference === "infographic"
                    ? "bg-pink-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                אינפוגרפיקה
              </button>
              <button
                type="button"
                onClick={() => setVisualPreference("lifestyle_woman")}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                  visualPreference === "lifestyle_woman"
                    ? "bg-pink-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                👩 שימוש אישה
              </button>
              <button
                type="button"
                onClick={() => setVisualPreference("lifestyle_man")}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                  visualPreference === "lifestyle_man"
                    ? "bg-pink-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                👨 שימוש גבר
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs sm:text-sm">
            {messages.map((m) => {
              const isUser = m.sender === "user";
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      isUser ? "bg-slate-900 text-white" : "bg-indigo-600 text-white"
                    }`}
                  >
                    {isUser ? "אני" : "אלון"}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl p-3 sm:p-3.5 space-y-1 ${
                      isUser
                        ? "bg-slate-900 text-white rounded-tr-none"
                        : "bg-slate-100 text-slate-900 rounded-tl-none border border-slate-200"
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-line">{m.text}</p>
                    <span
                      className={`block text-[10px] ${
                        isUser ? "text-slate-400 text-left" : "text-slate-400 text-right"
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <button
              type="button"
              onClick={() => setInputText("התקדמות ליעד 100 דולר")}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shrink-0 font-medium"
            >
              🎯 דוח יעד 100$/יום
            </button>
            <button
              type="button"
              onClick={() => setInputText("מה המלצות ה-CRO של דנה וגל?")}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shrink-0 font-medium"
            >
              💡 המלצות CRO
            </button>
            <button
              type="button"
              onClick={() => setInputText("תעלה מכסה ל-5 מוצרים ביום")}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shrink-0 font-medium"
            >
              ⚡ העלאת מכסה ל-5
            </button>
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
            <input
              type="text"
              placeholder="הדבק קישור מאלי אקספרס, תן משימה, או שאל שאלה..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>שלח</span>
            </button>
          </form>
        </div>

        {/* Right Column (5 cols): Live Terminal Activity Stream */}
        <div className="lg:col-span-5 flex flex-col rounded-3xl bg-slate-950 border border-slate-800 shadow-xl overflow-hidden h-[620px] text-slate-300">
          <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <h3 className="font-bold text-xs text-white">יומן פעילות חי (Live 6-Agent Stream)</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Realtime Stream</span>
          </div>

          <div className="flex-1 p-3.5 overflow-y-auto font-mono text-[11px] space-y-2.5">
            {logs.length === 0 ? (
              <div className="text-slate-500 text-center py-20">ממתין לפעילות הצוות...</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="leading-relaxed border-b border-slate-900 pb-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{log.timestamp}</span>
                    <span className="text-slate-600">•</span>
                    <span className="font-bold text-slate-300 flex items-center gap-1">
                      {getRoleIcon(log.role)}
                      <span>{log.agentName}</span>
                    </span>
                  </div>
                  <p
                    className={
                      log.level === "success"
                        ? "text-emerald-400"
                        : log.level === "warning"
                        ? "text-amber-300"
                        : log.level === "error"
                        ? "text-rose-400"
                        : "text-slate-200"
                    }
                  >
                    {log.message}
                  </p>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

      {/* Dana's CRO Recommendations & Autonomous Backlog Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dana's CRO Insights */}
        {analytics && (
          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  המלצות ה-CRO של דנה (להגדלת המרות ו-RPC)
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
                מופנה לגל ליישום
              </span>
            </div>

            <div className="space-y-3">
              {analytics.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{rec.pageTitle}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {rec.expectedRpmBoost}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px]">בעיה שזוהתה: {rec.issueHe}</p>
                  <p className="text-slate-800 font-medium">המלצה: {rec.recommendationHe}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Autonomous Tasks Backlog */}
        <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">תור משימות מתוזמן (Autonomous Roadmap)</h3>
            </div>
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
              מתעדכן אוטומטית
            </span>
          </div>

          <div className="space-y-2.5">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      t.status === "done"
                        ? "bg-emerald-500"
                        : t.status === "in_progress"
                        ? "bg-amber-500 animate-pulse"
                        : "bg-slate-300"
                    }`}
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 truncate">{t.title}</h4>
                    <span className="text-[10px] text-slate-400">מועד: {t.scheduledFor}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                    t.status === "done"
                      ? "bg-emerald-50 text-emerald-700"
                      : t.status === "in_progress"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {t.status === "done" ? "הושלם" : t.status === "in_progress" ? "בביצוע" : "ממתין"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Cadence & Quota Controls */}
      {budget && (
        <section className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-ali-600" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">שליטה דינמית במכסת הפעילות היומית</h3>
                <span className="text-xs text-slate-500">
                  אתה יכול להעלות את המכסה כרצונך, והמערכת מוודאת שה-Free Tier של Gemini תמיד נשמר
                </span>
              </div>
            </div>

            {/* Quota input and save */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">מוצרים ביום:</span>
              <input
                type="number"
                min={1}
                max={20}
                value={dailyQuotaInput}
                onChange={(e) => setDailyQuotaInput(Number(e.target.value))}
                className="w-16 px-2 py-1 text-center font-bold text-sm rounded-lg border border-slate-300"
              />
              <button
                type="button"
                onClick={handleUpdateQuota}
                disabled={isUpdatingQuota}
                className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                {isUpdatingQuota ? "מעדכן..." : "עדכן מכסה"}
              </button>
              {quotaUpdatedMsg && <span className="text-xs text-emerald-600 font-bold">✓ עודכן!</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>מוצרים שיוצרו היום</span>
                <span>
                  {budget.dailyProductsCount} / {budget.dailyProductsTarget}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-ali-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (budget.dailyProductsCount / budget.dailyProductsTarget) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-400">קצב מבוקר מול היעד</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>עמודי TOP 5 שבועיים</span>
                <span>
                  {budget.weeklyTop5Count} / {budget.weeklyTop5Target}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (budget.weeklyTop5Count / budget.weeklyTop5Target) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-400">מדריכי השוואה עמוקים</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>עמודי קטגוריה חדשים</span>
                <span>
                  {budget.weeklyCategoriesCount} / {budget.weeklyCategoriesTarget}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (budget.weeklyCategoriesCount / budget.weeklyCategoriesTarget) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-400">מבנה Silo להזרמת כוח SEO</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>קריאות Gemini היום</span>
                <span className="text-emerald-600">
                  {budget.geminiApiCallsToday} / {budget.geminiDailySafeLimit}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (budget.geminiApiCallsToday / budget.geminiDailySafeLimit) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-400">אפס עלויות – מוגן לחלוטין</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
