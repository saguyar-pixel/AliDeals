import { safeReadJson, safeWriteJson } from "./storage-helper";
import { AutonomousTask } from "./types";

const DEFAULT_TASKS: AutonomousTask[] = [
  {
    id: "task_1",
    title: "סקירה מעמיקה: מקרן חכם נייד Magcubic HY300 PRO לחדר שינה",
    type: "review",
    assignedTo: "copywriter",
    priority: "high",
    status: "done",
    scheduledFor: "היום 14:00",
    targetProductUrl: "https://s.click.aliexpress.com/e/_c443TC9b",
  },
  {
    id: "task_2",
    title: "השוואת TOP 5: מקרנים קטנים לבית מתחת ל-75$ ללא מכס",
    type: "top5",
    assignedTo: "analyst",
    priority: "high",
    status: "done",
    scheduledFor: "היום 10:00",
  },
  {
    id: "task_3",
    title: "השוואת TOP 5: מוניטורים מומלצים לתינוק עם ראיית לילה ואינטרקום",
    type: "top5",
    assignedTo: "analyst",
    priority: "high",
    status: "in_progress",
    scheduledFor: "היום 16:30",
  },
  {
    id: "task_4",
    title: "בדיקת תאימות שקעים ומכס (פטור עד 75$) למוצרים חדשים",
    type: "seo_audit",
    assignedTo: "qa_officer",
    priority: "medium",
    status: "queued",
    scheduledFor: "מחר",
  },
];

export function getBacklogTasks(): AutonomousTask[] {
  return safeReadJson<AutonomousTask[]>("agent_backlog.json", DEFAULT_TASKS);
}

export function saveBacklogTasks(tasks: AutonomousTask[]): void {
  safeWriteJson("agent_backlog.json", tasks);
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
