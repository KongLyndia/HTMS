import type { AggregatedTask } from "@/api/myTasksApi";

// ══════════════════════════════════════════════════════════════════════
// HTMS — AI Task Prioritizer (rule-based, không cần API)
// ══════════════════════════════════════════════════════════════════════

export interface ScoredTask {
  task:          AggregatedTask;
  score:         number;   // 0-100
  workloadScore: number;   // 0-100: mức độ bận
  riskScore:     number;   // 0-100: nguy cơ trễ/thất bại
  deadlineDays:  number | null;
  reasons:       string[]; // giải thích tại sao task này quan trọng
}

export interface FocusSummary {
  workloadLevel: "low" | "medium" | "high" | "overloaded";
  workloadScore: number;
  riskScore:     number;
  suggestion:    string;   // gợi ý tổng thể
  focusTasks:    ScoredTask[]; // top 3-5 task nên làm hôm nay
}

// ─── Weights ──────────────────────────────────────────────────────────
const W = {
  deadline: 40,
  priority: 25,
  status:   20,
  workload: 15,
};

// ─── Deadline score (0-1) ─────────────────────────────────────────────
function deadlineWeight(dueDate?: string): { w: number; days: number | null; label: string } {
  if (!dueDate) return { w: 0.1, days: null, label: "" };
  const days = Math.ceil(
    (new Date(dueDate).setHours(0,0,0,0) - new Date().setHours(0,0,0,0))
    / (1000 * 60 * 60 * 24)
  );
  if (days < 0)  return { w: 1.0,  days, label: `Quá hạn ${Math.abs(days)} ngày` };
  if (days === 0) return { w: 0.95, days, label: "Hết hạn hôm nay" };
  if (days === 1) return { w: 0.85, days, label: "Còn 1 ngày" };
  if (days <= 3)  return { w: 0.70, days, label: `Còn ${days} ngày` };
  if (days <= 7)  return { w: 0.50, days, label: `Còn ${days} ngày` };
  if (days <= 14) return { w: 0.30, days, label: `Còn ${days} ngày` };
  return              { w: 0.10, days, label: `Còn ${days} ngày` };
}

// ─── Priority score (0-1) ─────────────────────────────────────────────
function priorityWeight(priority?: string): number {
  return { Urgent: 1.0, High: 0.75, Medium: 0.50, Low: 0.25 }[priority ?? ""] ?? 0.15;
}

// ─── Status score (0-1) ───────────────────────────────────────────────
function statusWeight(status?: string): { w: number; label: string } {
  return {
    "Rejected":    { w: 1.0, label: "Bị từ chối — cần xử lý ngay" },
    "In Progress": { w: 0.8, label: "Đang thực hiện — nên hoàn thành" },
    "Todo":        { w: 0.4, label: "" },
    "Pending":     { w: 0.05, label: "" }, // đang chờ duyệt, không làm gì được
  }[status ?? ""] ?? { w: 0.2, label: "" };
}

// ─── Tính WorkloadScore cá nhân ───────────────────────────────────────
// = số task In Progress / tổng task active × 100
export function calcWorkloadScore(tasks: AggregatedTask[]): number {
  const active    = tasks.filter(t => !t.isCompleted && t.taskStatus !== "Pending");
  const inProgress = tasks.filter(t => t.taskStatus === "In Progress").length;
  if (active.length === 0) return 0;
  return Math.round((inProgress / Math.max(active.length, 1)) * 100);
}

// ─── Tính RiskScore ───────────────────────────────────────────────────
// = (task trễ hạn + task Rejected) / tổng active × 100
export function calcRiskScore(tasks: AggregatedTask[]): number {
  const active   = tasks.filter(t => !t.isCompleted);
  if (active.length === 0) return 0;
  const risky = active.filter(t =>
    (t.dueDate && new Date(t.dueDate) < new Date() && t.taskStatus !== "Completed") ||
    t.taskStatus === "Rejected"
  ).length;
  return Math.round((risky / active.length) * 100);
}

// ─── Score từng task ──────────────────────────────────────────────────
export function scoreTask(task: AggregatedTask, allTasks: AggregatedTask[]): ScoredTask {
  const dl       = deadlineWeight(task.dueDate);
  const prioW    = priorityWeight(task.priority);
  const statusW  = statusWeight(task.taskStatus);
  const workload = calcWorkloadScore(allTasks);

  // Workload weight: user càng bận → cần ưu tiên task quan trọng hơn
  const wlW = workload >= 80 ? 0.2 : workload >= 60 ? 0.5 : workload >= 40 ? 0.7 : 1.0;

  const score = Math.round(
    W.deadline * dl.w +
    W.priority * prioW +
    W.status   * statusW.w +
    W.workload * wlW
  );

  // Reasons — giải thích ngắn gọn
  const reasons: string[] = [];
  if (dl.days !== null && dl.days < 0)  reasons.push(` Quá hạn ${Math.abs(dl.days)} ngày`);
  if (dl.days !== null && dl.days === 0) reasons.push(" Hết hạn hôm nay");
  if (dl.days !== null && dl.days > 0 && dl.days <= 3) reasons.push(` ${dl.label}`);
  if (task.priority === "Urgent")       reasons.push(" Ưu tiên khẩn cấp");
  if (task.priority === "High")         reasons.push("⬆ Ưu tiên cao");
  if (statusW.label)                    reasons.push(statusW.label);

  const workloadScore = workload;
  const riskScore     = calcRiskScore(allTasks);

  return { task, score, workloadScore, riskScore, deadlineDays: dl.days, reasons };
}

// ─── Daily Focus: top 3-5 task nên làm hôm nay ───────────────────────
export function getDailyFocus(tasks: AggregatedTask[]): FocusSummary {
  // Chỉ xét task chưa hoàn thành, không pending
  const active = tasks.filter(t =>
    !t.isCompleted &&
    t.taskStatus !== "Pending" &&
    t.taskStatus !== "Completed"
  );

  const scored = active
    .map(t => scoreTask(t, tasks))
    .sort((a, b) => b.score - a.score);

  // Top 5, nhưng ít nhất 3 nếu có đủ
  const focusTasks = scored.slice(0, Math.min(5, Math.max(scored.length, 0)));

  const workloadScore = calcWorkloadScore(tasks);
  const riskScore     = calcRiskScore(tasks);

  const workloadLevel: FocusSummary["workloadLevel"] =
    workloadScore >= 80 ? "overloaded" :
    workloadScore >= 60 ? "high"       :
    workloadScore >= 30 ? "medium"     : "low";

  // Sinh gợi ý tự nhiên dựa trên rules
  const suggestion = generateSuggestion(focusTasks, workloadLevel, riskScore, tasks);

  return { workloadLevel, workloadScore, riskScore, suggestion, focusTasks };
}

// ─── Sinh gợi ý tiếng Việt theo rules ────────────────────────────────
function generateSuggestion(
  focusTasks:    ScoredTask[],
  workloadLevel: FocusSummary["workloadLevel"],
  riskScore:     number,
  allTasks:      AggregatedTask[]
): string {
  const overdueTasks  = focusTasks.filter(s => s.deadlineDays !== null && s.deadlineDays < 0);
  const todayTasks    = focusTasks.filter(s => s.deadlineDays === 0);
  const rejectedTasks = focusTasks.filter(s => s.task.taskStatus === "Rejected");
  const urgentTasks   = focusTasks.filter(s => s.task.priority === "Urgent");

  // Ưu tiên cảnh báo nghiêm trọng nhất
  if (rejectedTasks.length > 0) {
    const name = rejectedTasks[0].task.title;
    return `Bạn có ${rejectedTasks.length} task bị từ chối — hãy xử lý "${name}" trước, đây là việc cần làm ngay.`;
  }

  if (overdueTasks.length >= 3) {
    return `Bạn đang có ${overdueTasks.length} task quá hạn! Hãy tập trung giải quyết từng việc một, bắt đầu từ task trễ nhất.`;
  }

  if (overdueTasks.length > 0 && urgentTasks.length > 0) {
    return `Có ${overdueTasks.length} task quá hạn và ${urgentTasks.length} task khẩn cấp — ưu tiên hoàn thành chúng trước khi làm việc mới.`;
  }

  if (overdueTasks.length > 0) {
    const name = overdueTasks[0].task.title;
    return `"${name}" đã quá hạn ${Math.abs(overdueTasks[0].deadlineDays!)} ngày. Hãy hoàn thành và nộp minh chứng ngay hôm nay.`;
  }

  if (todayTasks.length > 0) {
    const name = todayTasks[0].task.title;
    return `"${name}" hết hạn hôm nay! Đây là việc quan trọng nhất cần làm xong trước cuối ngày.`;
  }

  if (workloadLevel === "overloaded") {
    return `Bạn đang xử lý quá nhiều task cùng lúc. Hãy tập trung hoàn thành các task đang làm dở trước khi nhận thêm việc mới.`;
  }

  if (riskScore >= 50) {
    return `Nhiều task đang có nguy cơ trễ hạn. Hãy ưu tiên những task có deadline gần nhất trong danh sách dưới đây.`;
  }

  if (focusTasks.length === 0) {
    return "Tuyệt vời! Bạn đã hoàn thành hết công việc. Hãy kiểm tra lại có task mới nào được giao không.";
  }

  if (urgentTasks.length > 0) {
    const name = urgentTasks[0].task.title;
    return `Bắt đầu ngày hôm nay với "${name}" — đây là task có độ ưu tiên cao nhất của bạn.`;
  }

  // Default suggestion dựa trên top task
  if (focusTasks.length > 0) {
    const top = focusTasks[0].task;
    const daysText = focusTasks[0].deadlineDays !== null
      ? ` (còn ${focusTasks[0].deadlineDays} ngày)`
      : "";
    return `Hôm nay hãy tập trung vào "${top.title}"${daysText}. Hoàn thành task này trước rồi chuyển sang các việc tiếp theo.`;
  }

  return "Bạn đang có ít việc — đây là lúc tốt để xử lý những task cần thời gian suy nghĩ nhiều hơn.";
}