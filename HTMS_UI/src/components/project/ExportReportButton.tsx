import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, FileSpreadsheet, FileText, Loader2, ChevronDown } from "lucide-react";
import { membersApi } from "@/api/membersApi";
import { cn }         from "@/lib/utils";

interface Props {
  projectId:   string;
  projectName: string;
}

// ─── Load script từ CDN (chỉ load 1 lần) ─────────────────────────────
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.async = true;
    s.onload  = () => resolve();
    s.onerror = () => reject(new Error(`Load failed: ${src}`));
    document.head.appendChild(s);
  });
}

async function loadXLSX() {
  await loadScript("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js");
  return (window as any).XLSX;
}

async function loadJsPDF() {
  await loadScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js");
  await loadScript("https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js");
  return (window as any).jspdf?.jsPDF ?? (window as any).jsPDF;
}

// ─── Màu sắc ─────────────────────────────────────────────────────────
const STATUS_COLOR_HEX: Record<string, string> = {
  "Todo":        "94a3b8",
  "In Progress": "3b82f6",
  "Pending":     "f59e0b",
  "Completed":   "10b981",
  "Rejected":    "ef4444",
};
const STATUS_BG_RGB: Record<string, [number,number,number]> = {
  "Todo":        [241,245,249],
  "In Progress": [239,246,255],
  "Pending":     [255,251,235],
  "Completed":   [240,253,244],
  "Rejected":    [255,241,242],
};
const STATUS_TEXT_RGB: Record<string, [number,number,number]> = {
  "Todo":        [148,163,184],
  "In Progress": [ 59,130,246],
  "Pending":     [245,158, 11],
  "Completed":   [ 16,185,129],
  "Rejected":    [239, 68, 68],
};

// ─── Xuất Excel ────────────────────────────────────────────────────────
async function exportExcel(projectId: string, projectName: string) {
  const XLSX = await loadXLSX();
  const data = await membersApi.getReport(projectId);
  const wb   = XLSX.utils.book_new();

  // Sheet 1 — Tổng quan
  const ws1 = XLSX.utils.aoa_to_sheet([
    ["BÁO CÁO DỰ ÁN", data.projectName],
    ["Ngày xuất",      new Date(data.exportedAt).toLocaleString("vi-VN")],
    [],
    ["TỔNG QUAN"],
    ["Tổng task",     data.summary.total],
    ["Hoàn thành",    data.summary.completed],
    ["Tiến độ (%)",   data.summary.progress],
    ["Task trễ hạn",  data.summary.overdue],
    ["Số thành viên", data.summary.memberCount],
  ]);
  ws1["!cols"] = [{ wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Tong quan");

  // Sheet 2 — Danh sách task
  const taskHeaders = ["STT","Tên task","Trạng thái","Ưu tiên","Người thực hiện","Deadline","Ngày tạo"];
  const taskRows = (data.tasks ?? []).map((t: any, i: number) => [
    i + 1, t.title ?? "",
    t.taskStatus  ?? "",
    t.priority    ?? "Không",
    t.assigneeName ?? "Chưa giao",
    t.dueDate   ? new Date(t.dueDate).toLocaleDateString("vi-VN")   : "",
    t.createdAt ? new Date(t.createdAt).toLocaleDateString("vi-VN") : "",
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([taskHeaders, ...taskRows]);
  ws2["!cols"] = [{ wch:5 },{ wch:35 },{ wch:15 },{ wch:12 },{ wch:22 },{ wch:14 },{ wch:14 }];
  // Màu header
  for (let C = 0; C < 7; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (ws2[addr]) ws2[addr].s = {
      fill: { fgColor: { rgb: "FF0D9488" } },
      font: { bold: true, color: { rgb: "FFFFFFFF" } },
      alignment: { horizontal: "center" },
    };
  }
  // Màu status cell
taskRows.forEach((row: any[], i: number) => {    const status = String(row[2]);
    const hex = STATUS_COLOR_HEX[status];
    if (!hex) return;
    const addr = XLSX.utils.encode_cell({ r: i + 1, c: 2 });
    if (ws2[addr]) ws2[addr].s = { font: { bold: true, color: { rgb: "FF" + hex.toUpperCase() } } };
  });
  XLSX.utils.book_append_sheet(wb, ws2, "Danh sach task");

  // Sheet 3 — Thành viên
  const memHeaders = ["STT","Tên","Email","Vai trò","Tổng","Hoàn thành","Đang làm","Chờ","Todo","Tỉ lệ (%)"];
  const memRows = (data.members ?? []).map((m: any, i: number) => [
    i + 1, m.fullName ?? "", m.email ?? "", m.role ?? "",
    m.total, m.completed, m.inProgress, m.pending, m.todo, m.completionRate,
  ]);
  const ws3 = XLSX.utils.aoa_to_sheet([memHeaders, ...memRows]);
  ws3["!cols"] = [{ wch:5 },{ wch:22 },{ wch:28 },{ wch:12 },{ wch:8 },{ wch:12 },{ wch:10 },{ wch:8 },{ wch:8 },{ wch:10 }];
  for (let C = 0; C < 10; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (ws3[addr]) ws3[addr].s = {
      fill: { fgColor: { rgb: "FF0D9488" } },
      font: { bold: true, color: { rgb: "FFFFFFFF" } },
      alignment: { horizontal: "center" },
    };
  }
  XLSX.utils.book_append_sheet(wb, ws3, "Hieu suat thanh vien");

  XLSX.writeFile(wb, `BaoCao_${projectName.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ─── Xuất PDF ──────────────────────────────────────────────────────────
async function exportPDF(projectId: string, projectName: string) {
  const JsPDF = await loadJsPDF();
  const data  = await membersApi.getReport(projectId);
  const doc   = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W     = doc.internal.pageSize.getWidth();
  const teal: [number,number,number] = [13, 148, 136];

  // Header band
  doc.setFillColor(...teal);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text("BAO CAO DU AN", W / 2, 12, { align: "center" });
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(projectName, W / 2, 20, { align: "center" });
  doc.setFontSize(7.5);
  doc.text(`Ngay xuat: ${new Date(data.exportedAt).toLocaleString("vi-VN")}`, W / 2, 26, { align: "center" });

  let y = 35;

  // Section title helper
  const sectionTitle = (title: string) => {
    doc.setTextColor(...teal);
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text(title, 14, y); y += 3;
    doc.setDrawColor(...teal);
    doc.line(14, y, W - 14, y); y += 4;
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
  };

  // Tổng quan
  sectionTitle("TONG QUAN DU AN");
  doc.autoTable({
    startY: y,
    body: [
      ["Tong task",     data.summary.total],
      ["Hoan thanh",    `${data.summary.completed} task`],
      ["Tien do",       `${data.summary.progress}%`],
      ["Task tre han",  data.summary.overdue],
      ["Thanh vien",    data.summary.memberCount],
    ],
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1.8 },
    columnStyles: { 0: { fontStyle: "bold", textColor: [71,85,105], cellWidth: 42 }, 1: { textColor: [30,41,59] } },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 10;

  // Danh sách task
  if (y > 230) { doc.addPage(); y = 15; }
  sectionTitle("DANH SACH TASK");
  doc.autoTable({
    startY: y,
    head: [["#","Ten task","Trang thai","Uu tien","Assignee","Deadline"]],
    body: (data.tasks ?? []).map((t: any, i: number) => [
      i + 1,
      (t.title ?? "").length > 38 ? (t.title ?? "").slice(0,38) + "..." : (t.title ?? ""),
      t.taskStatus  ?? "",
      t.priority    ?? "N/A",
      t.assigneeName ?? "Chua giao",
      t.dueDate ? new Date(t.dueDate).toLocaleDateString("vi-VN") : "-",
    ]),
    theme: "grid",
    headStyles: { fillColor: teal, textColor: [255,255,255], fontSize: 8, fontStyle: "bold" },
    styles: { fontSize: 7.5, cellPadding: 1.8 },
    columnStyles: {
      0: { cellWidth: 8,  halign: "center" },
      1: { cellWidth: 58 },
      2: { cellWidth: 24, halign: "center" },
      3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 38 },
      5: { cellWidth: 22, halign: "center" },
    },
    didParseCell: (d: any) => {
      if (d.row.index < 0 || d.column.index !== 2) return;
      const status = (data.tasks ?? [])[d.row.index]?.taskStatus ?? "";
      const bg  = STATUS_BG_RGB[status];
      const txt = STATUS_TEXT_RGB[status];
      if (bg)  d.cell.styles.fillColor = bg;
      if (txt) { d.cell.styles.textColor = txt; d.cell.styles.fontStyle = "bold"; }
    },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 10;

  // Hiệu suất thành viên
  if (y > 230) { doc.addPage(); y = 15; }
  sectionTitle("HIEU SUAT THANH VIEN");
  doc.autoTable({
    startY: y,
    head: [["#","Ten","Vai tro","Tong","Xong","Dang","Cho","Ti le"]],
    body: (data.members ?? []).map((m: any, i: number) => [
      i + 1, m.fullName ?? "", m.role ?? "",
      m.total, m.completed, m.inProgress, m.pending, `${m.completionRate}%`,
    ]),
    theme: "grid",
    headStyles: { fillColor: teal, textColor: [255,255,255], fontSize: 8, fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 1.8 },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 52 },
      2: { cellWidth: 22, halign: "center" },
      3: { cellWidth: 13, halign: "center" },
      4: { cellWidth: 13, halign: "center" },
      5: { cellWidth: 13, halign: "center" },
      6: { cellWidth: 13, halign: "center" },
      7: { cellWidth: 16, halign: "center" },
    },
    didParseCell: (d: any) => {
      if (d.row.index < 0 || d.column.index !== 7) return;
      const rate = (data.members ?? [])[d.row.index]?.completionRate ?? 0;
      d.cell.styles.fontStyle = "bold";
      d.cell.styles.textColor = rate >= 80 ? [16,185,129] : rate >= 50 ? [245,158,11] : [239,68,68];
    },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(148,163,184);
    doc.text(
      `Trang ${i}/${total}  |  TaskFlow  |  ${new Date().toLocaleDateString("vi-VN")}`,
      W / 2, doc.internal.pageSize.getHeight() - 5, { align: "center" }
    );
  }

  doc.save(`BaoCao_${projectName.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.pdf`);
}

// ─── Component ────────────────────────────────────────────────────────
export default function ExportReportButton({ projectId, projectName }: Props) {
  const [loading, setLoading] = useState<"excel"|"pdf"|null>(null);
  const [open,    setOpen]    = useState(false);
  const [error,   setError]   = useState<string|null>(null);

  const handle = async (type: "excel"|"pdf") => {
    setOpen(false);
    setLoading(type);
    setError(null);
    try {
      if (type === "excel") await exportExcel(projectId, projectName);
      else                  await exportPDF(projectId, projectName);
    } catch (e: any) {
      setError(e?.message || "Xuất thất bại, thử lại");
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={!!loading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
          bg-teal-500 hover:bg-teal-600 text-white shadow-sm transition-all
          disabled:opacity-50 disabled:cursor-not-allowed">
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Download className="w-4 h-4" />}
        {loading === "excel" ? "Đang xuất Excel..."
         : loading === "pdf" ? "Đang xuất PDF..."
         : "Xuất báo cáo"}
        {!loading && (
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-150", open && "rotate-180")} />
        )}
      </button>

      <AnimatePresence>
        {open && !loading && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{ opacity: 0, y: -4,    scale: 0.97 }}
              transition={{ duration: 0.13 }}
              className="absolute right-0 top-full mt-2 z-50 w-52 rounded-2xl
                bg-white dark:bg-[#131f35] border border-slate-200 dark:border-white/[0.08]
                shadow-2xl overflow-hidden">

              <button onClick={() => handle("excel")}
                className="w-full flex items-center gap-3 px-4 py-3
                  hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors text-left">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Xuất Excel</p>
                  <p className="text-[10px] text-slate-400">3 sheet · có màu sắc</p>
                </div>
              </button>

              <div className="border-t border-slate-100 dark:border-white/[0.05]" />

              <button onClick={() => handle("pdf")}
                className="w-full flex items-center gap-3 px-4 py-3
                  hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors text-left">
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Xuất PDF</p>
                  <p className="text-[10px] text-slate-400">Layout đẹp · có thể in</p>
                </div>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute right-0 top-full mt-2 text-xs text-rose-500 bg-rose-50
              dark:bg-rose-900/20 px-3 py-2 rounded-xl border border-rose-200
              dark:border-rose-800 whitespace-nowrap z-50">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}