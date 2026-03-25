import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check } from "lucide-react";
import { usePersonalTasks, useCreatePersonalTask, useTogglePersonalTask } from "@/hooks/useDashboard";

const CARD = "rounded-2xl border border-slate-200 dark:border-teal-900/40 bg-white dark:bg-slate-800/60 shadow-sm hover:shadow-md transition-all duration-300 h-full";

export default function TodoList() {
  const [newText, setNewText]   = useState("");
  const [adding,  setAdding]    = useState(false);

  const { data: todos, isLoading }  = usePersonalTasks();
  const createMutation              = useCreatePersonalTask();
  const toggleMutation              = useTogglePersonalTask();

  const done  = todos?.filter(t => t.isCompleted).length  ?? 0;
  const total = todos?.length ?? 0;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  function handleAdd() {
    const t = newText.trim();
    if (!t) return;
    createMutation.mutate({ title: t });
    setNewText("");
    setAdding(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.45 }}
      className={`${CARD} p-5 flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Việc cá nhân</h3>
        <button
          onClick={() => setAdding(v => !v)}
          className="w-6 h-6 rounded-lg flex items-center justify-center bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-500/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
          <span>{done}/{total} hoàn thành</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Add input */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 overflow-hidden"
          >
            <div className="flex gap-2">
              <input
                autoFocus
                value={newText}
                onChange={e => setNewText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                placeholder="Tên công việc..."
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 #f0fdfadark:bg-white/5 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 dark:focus:border-teal-500 transition-colors"
              />
              <button
                onClick={handleAdd}
                disabled={createMutation.isPending}
                className="px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending ? "..." : "Thêm"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Todo items */}
      <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 rounded-lg bg-slate-100 dark:bg-white/5 animate-pulse" />
        ))}

        {!isLoading && todos?.map((todo, i) => (
          <motion.div
            key={todo.personalTaskId}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * i }}
            className="flex items-center gap-2.5 p-2 rounded-lg hover:#f0fdfadark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
            onClick={() => toggleMutation.mutate(todo.personalTaskId)}
          >
            <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
              todo.isCompleted
                ? "bg-teal-600 border-teal-600"
                : "border-slate-300 dark:border-white/20 group-hover:border-teal-400"
            }`}>
              {todo.isCompleted && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            <span className={`text-xs flex-1 transition-all duration-200 ${
              todo.isCompleted
                ? "line-through text-slate-400 dark:text-slate-500"
                : "text-slate-700 dark:text-slate-200"
            }`}>
              {todo.title}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}