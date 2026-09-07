import fs from "fs";
import path from "path";
import { AutonomousTask } from "./types";

const BACKLOG_FILE = path.join(process.cwd(), "data", "agent_backlog.json");

const DEFAULT_TASKS: AutonomousTask[] = [
  {
    id: "task_1",
    title: "סקירה מעמיקה: שואב אבק אלחוטי נייד Baseus A2 Pro לרכב ולבית",
    type: "review",
    assignedTo: "copywriter",
    priority: "high",
    status: "queued",
    scheduledFor: "היום 14:00",
    targetProductUrl: "https://www.aliexpress.com/item/1005005829103948.html",
  },
  {
    id: "task_2",
    title: "השוואת TOP 5: אוזניות TWS עם סינון רעשים אקטיבי (ANC) מתחת ל-50$",
    type: "top5",
    assignedTo: "analyst",
    priority: "high",
    status: "queued",
    scheduledFor: "מחר 10:00",
  },
  {
    id: "task_3",
    title: "שיפור CRO: הוספת Sticky Buy Bar במובייל לפי הניתוח של דנה",
    type: "cro_fix",
    assignedTo: "developer",
    priority: "medium",
    status: "in_progress",
    scheduledFor: "היום 16:30",
  },
  {
    id: "task_4",
    title: "בדיקת תאימות שקעים ומכס לעמודי שבוע שעבר",
    type: "seo_audit",
    assignedTo: "qa_officer",
    priority: "low",
    status: "done",
    scheduledFor: "אתמול",
  },
];

export function getBacklogTasks(): AutonomousTask[] {
  try {
    if (fs.existsSync(BACKLOG_FILE)) {
      return JSON.parse(fs.readFileSync(BACKLOG_FILE, "utf8"));
    }
  } catch {
    // ignore
  }
  saveBacklogTasks(DEFAULT_TASKS);
  return DEFAULT_TASKS;
}

export function saveBacklogTasks(tasks: AutonomousTask[]): void {
  const dir = path.dirname(BACKLOG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(BACKLOG_FILE, JSON.stringify(tasks, null, 2), "utf8");
}

export function addBacklogTask(task: Omit<AutonomousTask, "id" | "status">): AutonomousTask {
  const tasks = getBacklogTasks();
  const newTask: AutonomousTask = {
    ...task,
    id: `task_${Date.now()}`,
    status: "queued",
  };
  tasks.unshift(newTask);
  saveBacklogTasks(tasks);
  return newTask;
}

export function updateTaskStatus(taskId: string, status: "queued" | "in_progress" | "done"): void {
  const tasks = getBacklogTasks();
  const task = tasks.find((t) => t.id === taskId);
  if (task) {
    task.status = status;
    saveBacklogTasks(tasks);
  }
}
