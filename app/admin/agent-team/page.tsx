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
  RotateCcw,
  RotateCw,
  X,
} from "lucide-react";
import { AgentProfile, AgentLogEntry, CadenceBudget, OrchestratorMessage, AutonomousTask, CroRecommendation, AgentEditProposal } from "@/lib/agent/types";
import { SiteAnalyticsSummary } from "@/lib/analytics/cro-engine";

export default function AgentTeamPage() {
  const [messages, setMessages] = useState<OrchestratorMessage[]>([]);
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [budget, setBudget] = useState<CadenceBudget | null>(null);
  const [analytics, setAnalytics] = useState<SiteAnalyticsSummary | null>(null);
  const [tasks, setTasks] = useState<AutonomousTask[]>([]);
  const [team, setTeam] = useState<AgentProfile[]>([]);
  const [proposals, setProposals] = useState<AgentEditProposal[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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
  const [customProductUrl, setCustomProductUrl] = useState("");
  const [showProductJobInput, setShowProductJobInput] = useState(false);

  // Autonomous Loop State
  const [showLoopDrawer, setShowLoopDrawer] = useState(false);
  const [loopGoal, setLoopGoal] = useState("סקירת מוצר חדש ובקרת איכות מלאה לישראל");
  const [loopProductUrl, setLoopProductUrl] = useState("");
  const [loopMaxIterations, setLoopMaxIterations] = useState(3);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleApproveProposal = async (proposalId: string) => {
    setActionLoadingId(proposalId);
    try {
      const res = await fetch("/api/agent/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", proposalId }),
      });
      const data = await res.json();
      if (data.success) {
        setTaskFeedback("✅ עריכת האתר אושרה ויושמה בהצלחה!");
        fetchStatus();
      } else {
        alert(data.message || "אישור העריכה נכשל");
      }
    } catch (e: any) {
      alert("שגיאה בתקשורת: " + e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    setActionLoadingId(proposalId);
    try {
      const res = await fetch("/api/agent/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", proposalId }),
      });
      const data = await res.json();
      if (data.success) {
        setTaskFeedback("הצעת העריכה נדחתה.");
        fetchStatus();
      }
    } catch (e: any) {
      alert("שגיאה בתקשורת: " + e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/agent/status");
      const data = await res.json();
      if (data.team) setTeam(data.team);
      if (data.budget) {
        setBudget(data.budget);
        setDailyQuotaInput(data.budget.dailyProductsTarget);
      }
      if (data.logs) setLogs(data.logs);
      if (data.messages) setMessages(data.messages);
      if (data.analytics) setAnalytics(data.analytics);
      if (data.tasks) setTasks(data.tasks);
      if (data.proposals) setProposals(data.proposals);
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

  const [isClearingChat, setIsClearingChat] = useState(false);

  const handleClearChat = async () => {
    if (!confirm("האם אתה בטוח שברצונך לנקות את היסטוריית השיחה ולהתחיל שיחה חדשה עם צוות הסוכנים?")) {
      return;
    }
    setIsClearingChat(true);
    try {
      const res = await fetch("/api/agent/chat", { method: "DELETE" });
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (e) {
      console.error("Failed to clear chat", e);
    } finally {
      setIsClearingChat(false);
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

  const handleRunTask = async (taskType: string, urlOverride?: string, extraParams?: Record<string, any>) => {
    setRunningTask(taskType);
    setTaskFeedback(null);
    try {
      const targetUrl = urlOverride || customProductUrl.trim() || undefined;
      const res = await fetch("/api/agent/run-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType,
          productUrl: targetUrl,
          visualPreference,
          ...extraParams,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTaskFeedback(data.message || data.result?.message || "המשימה הופעלה בהצלחה! צפה בתוצאות ביומן הפעילות (Stream).");
        setShowProductJobInput(false);
        setShowLoopDrawer(false);
        setCustomProductUrl("");
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

  const renderAgentStatusBadge = (agent: AgentProfile) => {
    switch (agent.currentState) {
      case "working":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
            בעבודה
          </span>
        );
      case "thinking":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
            <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-600" />
            חושב...
          </span>
        );
      case "completed":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
            הושלם
          </span>
        );
      case "waiting_approval":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full">
            <Clock className="w-2.5 h-2.5 text-purple-600" />
            משוב QA
          </span>
        );
      case "error":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">
            <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
            תקלה
          </span>
        );
      case "idle":
      default:
        return (
          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
            ממתין
          </span>
        );
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
              <h2 className="text-xl sm:text-2xl font-black flex items-center flex-wrap gap-2">
                <span>
                  קצב הכנסה מוערך כעת: <span className="text-emerald-400">${analytics.dailyRevenueEstimateUsd}</span> / $100.00 ליום
                </span>
                {analytics.s2sConversionsCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                    מכירות S2S מאושרות: {analytics.s2sConversionsCount} (₪{analytics.actualRevenueIls})
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                דנה מנטרת קליקים אורגניים, עסקאות S2S ו-RPC אמת בכל מוצר. גל ורון מבצעים אופטימיזציות CRO מתמשכות להגדלת סך העמלות.
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
                <span>S2S: {analytics.s2sConversionsCount || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Human-in-the-Loop Pending Edit Proposals Panel */}
      {proposals.filter((p) => p.status === "pending").length > 0 && (
        <div className="rounded-3xl bg-amber-50 border-2 border-amber-400/80 p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-amber-200">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500 text-white font-bold shadow-xs">
                <AlertCircle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-amber-950">
                  הצעות עריכה באתר הממתינות לאישורך המפורש ({proposals.filter((p) => p.status === "pending").length})
                </h3>
                <p className="text-xs text-amber-800">
                  לאלון יש גישת עריכה מלאה, אך שום שינוי אינו מוחל באתר החי ללא אישור ישיר שלך (Human-in-the-Loop).
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-900 bg-amber-200/80 px-3 py-1 rounded-full border border-amber-300">
              ממתין לאישור
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {proposals
              .filter((p) => p.status === "pending")
              .map((prop) => (
                <div
                  key={prop.id}
                  className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs space-y-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                        {prop.targetType === "page" ? "עמוד תוכן" : "מוצר"}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{prop.targetTitle}</h4>
                      <p className="text-slate-500 text-[11px] mt-0.5">{prop.changeSummaryHe}</p>
                    </div>
                  </div>

                  {/* Diff representation */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                    {Array.isArray(prop.diff) && prop.diff.map((d, idx) => (
                      <div key={idx} className="space-y-0.5 text-[11px]">
                        <span className="font-bold text-slate-700">{d.fieldLabelHe}:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                          <div className="p-1.5 rounded bg-rose-50 border border-rose-100 text-rose-800 line-through">
                            {String(d.oldValue || "ריק")}
                          </div>
                          <div className="p-1.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-800 font-semibold">
                            {String(d.newValue || "ריק")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={actionLoadingId === prop.id}
                      onClick={() => handleRejectProposal(prop.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-50"
                    >
                      דחה הצעה
                    </button>
                    <button
                      type="button"
                      disabled={actionLoadingId === prop.id}
                      onClick={() => handleApproveProposal(prop.id)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>אשר עריכה ועדכן אתר חי</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 6 Agents Specialist Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {(team.length > 0
          ? team
          : [
              { role: "orchestrator", nameHe: "אלון", titleHe: "ראש הצוות והאורקסטרטור", currentState: "idle", specialtyHe: "אורקסטרטור ויעד 100$" },
              { role: "analyst", nameHe: "דנה", titleHe: "דאטא & CRO אנליסטית", currentState: "idle", specialtyHe: "ניתוח אתר ו-RPC" },
              { role: "copywriter", nameHe: "רון", titleHe: "קופירייטר ומומחה SEO / GEO", currentState: "idle", specialtyHe: "סקירות והוקים ל-AI" },
              { role: "creative", nameHe: "מיה", titleHe: "קריאייטיב & לייפסטייל", currentState: "idle", specialtyHe: "אינפוגרפיקה ולייפסטייל" },
              { role: "qa_officer", nameHe: "עומר", titleHe: "מבקר איכות ומכס", currentState: "idle", specialtyHe: "שקע EU, סכמות ומכס" },
              { role: "developer", nameHe: "גל", titleHe: "מהנדס אתר & CRO", currentState: "idle", specialtyHe: "מהירות, A/B ו-UI" },
            ]
        ).map((agent) => {
          const isWorking = agent.currentState === "working";
          const isThinking = agent.currentState === "thinking";
          const isWaitingApproval = agent.currentState === "waiting_approval";
          const isCompleted = agent.currentState === "completed";
          const isError = agent.currentState === "error";

          const cardBorderClass = isWorking
            ? "border-indigo-400 ring-2 ring-indigo-500/50 shadow-md bg-indigo-50/30"
            : isThinking
            ? "border-amber-400 ring-2 ring-amber-500/50 shadow-md bg-amber-50/30"
            : isWaitingApproval
            ? "border-purple-400 ring-2 ring-purple-500/50 shadow-md bg-purple-50/30"
            : isCompleted
            ? "border-emerald-300 bg-emerald-50/20"
            : isError
            ? "border-rose-300 bg-rose-50/25"
            : "border-slate-200 hover:border-slate-300 bg-white";

          return (
            <div
              key={agent.role}
              className={`p-3.5 rounded-2xl border shadow-sm space-y-1.5 transition-all ${cardBorderClass}`}
            >
              <div className="flex items-center justify-between">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {getRoleIcon(agent.role)}
                </div>
                {renderAgentStatusBadge(agent as AgentProfile)}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{agent.nameHe}</h4>
                <p
                  className="text-[10px] text-slate-500 line-clamp-1"
                  title={agent.currentTask || agent.specialtyHe}
                >
                  {agent.currentTask || agent.specialtyHe}
                </p>
              </div>
            </div>
          );
        })}
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
          {/* Autonomous Loop Button */}
          <button
            type="button"
            onClick={() => {
              setShowLoopDrawer(!showLoopDrawer);
              setShowProductJobInput(false);
            }}
            disabled={Boolean(runningTask)}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm disabled:opacity-50 ${
              showLoopDrawer
                ? "bg-slate-900 text-white"
                : "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white shadow-indigo-100 ring-2 ring-indigo-400/40"
            }`}
          >
            {runningTask === "autonomous_loop" ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <RotateCw className="w-3.5 h-3.5 text-white" />
            )}
            <span>הפעל LOOP אוטונומי (אלון) ▾</span>
          </button>

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
            onClick={() => {
              setShowProductJobInput(!showProductJobInput);
              setShowLoopDrawer(false);
            }}
            disabled={Boolean(runningTask)}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 ${
              showProductJobInput
                ? "bg-slate-900 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {runningTask === "product_job" ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Crown className="w-3.5 h-3.5 text-white" />
            )}
            <span>משימת פיתוח מוצר (אלון) ▾</span>
          </button>
        </div>
      </div>

      {/* Autonomous Loop Controller Drawer */}
      {showLoopDrawer && (
        <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-50/90 via-purple-50/70 to-pink-50/50 border-2 border-indigo-200 shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-sm">
                <RotateCw className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  הפעלת לופ אוטונומי רב-סוכני (Multi-Agent Autonomous Loop)
                </h4>
                <p className="text-xs text-slate-600">
                  אלון מחלק משימות, דנה מנתחת, רון כותב, מיה מעצבת, ועומר מבקר באיטרציות חוזרות עד להשלמה 100%!
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full border border-indigo-200">
              פיקוח QA איטרטיבי פעיל
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
            <div className="sm:col-span-5 space-y-1">
              <label className="text-xs font-bold text-slate-700">מטרת הלופ (Goal):</label>
              <input
                type="text"
                value={loopGoal}
                onChange={(e) => setLoopGoal(e.target.value)}
                placeholder="למשל: סקירת מוצר חדש, תאימות לשקע ישראלי ופטור 75$"
                className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-4 space-y-1">
              <label className="text-xs font-bold text-slate-700">קישור/מזהה מוצר אלי אקספרס (אופציונלי):</label>
              <input
                type="text"
                value={loopProductUrl}
                onChange={(e) => setLoopProductUrl(e.target.value)}
                placeholder="השאר ריק לבחירה אוטומטית של מוצר מהקטלוג"
                className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-3 space-y-1">
              <label className="text-xs font-bold text-slate-700">מקסימום איטרציות QA (עומר):</label>
              <select
                value={loopMaxIterations}
                onChange={(e) => setLoopMaxIterations(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-white text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={2}>עד 2 סבבי תיקון</option>
                <option value={3}>עד 3 סבבי תיקון (מומלץ)</option>
                <option value={5}>עד 5 סבבים (בדיקה מחמירה)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-indigo-100 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>עומר יפסול טיוטות החורגות משקע EU או מ-75$ ללא גילוי נאות, ויפעיל איטרציה חוזרת בלופ.</span>
            </div>

            <button
              type="button"
              onClick={() =>
                handleRunTask("autonomous_loop", loopProductUrl, {
                  goal: loopGoal,
                  maxIterations: loopMaxIterations,
                })
              }
              disabled={Boolean(runningTask)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white text-xs font-black shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {runningTask === "autonomous_loop" ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCw className="w-4 h-4" />
              )}
              <span>🚀 הפעל לופ אוטונומי מול 6 הסוכנים</span>
            </button>
          </div>
        </div>
      )}

      {/* Inline Product Job Launcher */}
      {showProductJobInput && (
        <div className="p-4 rounded-3xl bg-indigo-50/70 border border-indigo-200 shadow-sm space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-950">
              הזנת מוצר לפיתוח אוטומטי בצוות 6 הסוכנים (אלון, דנה, רון, מיה, עומר וגל):
            </span>
            <span className="text-[11px] text-indigo-700">
              השאר ריק לבחירה אוטומטית של מוצר שטרם נסקר מהקטלוג!
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="https://www.aliexpress.com/item/100500... או מזהה פריט (ריק = מוצר אוטומטי מהקטלוג)"
              value={customProductUrl}
              onChange={(e) => setCustomProductUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRunTask("product_job")}
              className="flex-1 px-3.5 py-2 rounded-xl border border-indigo-200 text-xs font-mono text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => handleRunTask("product_job")}
              disabled={Boolean(runningTask)}
              className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50 shrink-0"
            >
              {runningTask === "product_job" ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>מעבד בצוות...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>הפעל פיתוח בצוות 🚀</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowProductJobInput(false)}
              className="px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-700 font-medium"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

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
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                  אלון
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900">שיחה ומתן פקודות לאלון</h3>
                  <span className="text-[10px] text-slate-500">המנהל מתאם בין כל 6 הסוכנים</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearChat}
                disabled={isClearingChat}
                title="נקה היסטוריית שיחה והתחל מחדש"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-[11px] font-bold transition-all shadow-xs disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isClearingChat ? "animate-spin text-rose-600" : ""}`} />
                <span>נקה שיחה</span>
              </button>
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
                    {m.actionRequired && m.actionType === "approve_edit" && m.actionPayload?.proposalId && (() => {
                      const linkedProp = proposals.find((p) => p.id === String(m.actionPayload?.proposalId));
                      if (linkedProp?.status === "approved") {
                        return (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2 font-medium">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>העריכה אושרה והוחלה בהצלחה באתר החי</span>
                          </div>
                        );
                      }
                      if (linkedProp?.status === "rejected") {
                        return (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-600 text-xs flex items-center gap-2 font-medium">
                            <X className="w-4 h-4 text-slate-500 shrink-0" />
                            <span>הצעת העריכה נדחתה על ידך</span>
                          </div>
                        );
                      }
                      return (
                        <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-300 text-amber-950 text-xs space-y-2">
                          <div className="flex items-center gap-1.5 font-bold">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>נדרש אישורך המפורש להחלת השינוי באתר החי:</span>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              disabled={actionLoadingId === String(m.actionPayload?.proposalId)}
                              onClick={() => handleApproveProposal(String(m.actionPayload?.proposalId))}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>אשר עריכה ועדכן אתר חי</span>
                            </button>
                            <button
                              type="button"
                              disabled={actionLoadingId === String(m.actionPayload?.proposalId)}
                              onClick={() => handleRejectProposal(String(m.actionPayload?.proposalId))}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-700 font-semibold text-xs transition-all disabled:opacity-50"
                            >
                              <span>דחה</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}
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
