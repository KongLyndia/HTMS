import type { BoardData, BoardMember } from "@/api/boardApi";

// ══════════════════════════════════════════════════════════════════════
// WORKLOAD BALANCER
// Gợi ý người phù hợp nhất để giao task dựa trên khối lượng hiện tại
// ══════════════════════════════════════════════════════════════════════

export interface MemberWorkload {
  member:        BoardMember;
  score:         number;   // Điểm workload (thấp = nhẹ hơn = nên giao)
  inProgress:    number;
  todo:          number;
  overdue:       number;
  total:         number;
  level:         "light" | "normal" | "heavy" | "overloaded";
  suggestion:    string;   // Lý do gợi ý
}

// ─── Công thức tính WorkloadScore ─────────────────────────────────────
// Task Overdue có trọng số cao nhất (đang bị nợ)
// Task InProgress tiếp theo (đang làm dở)
// Task Todo nhẹ nhất (chưa bắt đầu)
//
// Score = (overdue × 5) + (inProgress × 3) + (todo × 1)
//
// Level:
//   0-4   → light      (nhẹ nhàng)
//   5-9   → normal     (bình thường)
//   10-17 → heavy      (bận nhiều)
//   ≥ 18  → overloaded (quá tải)

export function calcMemberWorkload(
  member: BoardMember,
  board:  BoardData
): MemberWorkload {
  const now = new Date();

  // Gom tất cả task trong board được giao cho member này
  const myTasks = board.columns.flatMap(col => col.tasks)
    .filter(t =>
      t.assignee?.userId === member.userId &&
      t.taskStatus !== "Completed"
    );

  const inProgress = myTasks.filter(t => t.taskStatus === "In Progress").length;
  const todo       = myTasks.filter(t => t.taskStatus === "Todo").length;
  const pending    = myTasks.filter(t => t.taskStatus === "Pending").length;
  const overdue    = myTasks.filter(t =>
    t.dueDate &&
    new Date(t.dueDate) < now &&
    t.taskStatus !== "Completed"
  ).length;
  const total = myTasks.length;

  // Weighted score
  const score = overdue * 5 + inProgress * 3 + pending * 2 + todo * 1;

  const level: MemberWorkload["level"] =
    score === 0 ? "light"      :
    score <= 4  ? "light"      :
    score <= 9  ? "normal"     :
    score <= 17 ? "heavy"      : "overloaded";

  // Sinh lý do gợi ý
  const suggestion = buildSuggestion(member.fullName, level, inProgress, overdue, todo, score);

  return { member, score, inProgress, todo, overdue, total, level, suggestion };
}

function buildSuggestion(
  name:       string,
  level:      MemberWorkload["level"],
  inProgress: number,
  overdue:    number,
  todo:       number,
  score:      number
): string {
  if (level === "light")
    return `${name} đang rảnh (${inProgress} task đang làm) — phù hợp để giao thêm`;
  if (level === "normal" && overdue === 0)
    return `${name} đang bình thường, không có task trễ hạn`;
  if (overdue > 0)
    return `${name} có ${overdue} task trễ hạn — nên cân nhắc kỹ trước khi giao thêm`;
  if (level === "heavy")
    return `${name} đang khá bận (${inProgress} task dở) — chỉ giao nếu cần thiết`;
  return `${name} đang quá tải (điểm ${score}) — không nên giao thêm`;
}

// ─── Xếp hạng toàn bộ member ──────────────────────────────────────────
export function rankMembers(board: BoardData): MemberWorkload[] {
  return board.members
    .filter(m => m.role !== "Viewer")
    .map(m => calcMemberWorkload(m, board))
    .sort((a, b) => a.score - b.score); // score thấp = ưu tiên giao trước
}

// ─── Lấy người được gợi ý nhất ────────────────────────────────────────
export function getBestAssignee(board: BoardData): MemberWorkload | null {
  const ranked = rankMembers(board);
  return ranked.length > 0 ? ranked[0] : null;
}