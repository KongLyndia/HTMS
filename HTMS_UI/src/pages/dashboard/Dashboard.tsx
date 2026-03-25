import WelcomeCard      from "@/components/dashboard/WelcomeCard";
import StatCards        from "@/components/dashboard/StatCards";
import StatsChart       from "@/components/dashboard/StatsChart";
import TaskList         from "@/components/dashboard/TaskList";
import TodoList         from "@/components/dashboard/TodoList";
import ProjectProgress  from "@/components/dashboard/ProjectProgress";
import QuickActions     from "@/components/dashboard/QuickActions";

/**
 * DashboardPage — Bento Grid Layout
 *
 * Desktop (lg): 4 columns
 * ┌─────────────────┬────┬────┬────┬────┐
 * │ WelcomeCard(2)  │ S1 │ S2 │ S3 │ S4 │  row 1 — stat cards
 * ├─────────────────┴────┴────┴────┴────┤
 * │ StatsChart (3 cols)  │ QuickActions │  row 2
 * ├──────────────────────┼──────────────┤
 * │ TaskList (2 cols)    │ TodoList     │  row 3 — tall cards
 * │                      │ ProjectProg  │
 * └──────────────────────┴──────────────┘
 */
export default function DashboardPage() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-auto">

      {/* ── Row 1: Welcome + 4 stat cards ── */}
      {/* Welcome — spans 2 cols on lg */}
      <div className="sm:col-span-2 lg:col-span-2">
        <WelcomeCard />
      </div>

      {/* 4 stat cards — each 1 col */}
      <StatCards />

      {/* ── Row 2: Chart (3 cols) + QuickActions (1 col) ── */}
      <div className="sm:col-span-2 lg:col-span-3 min-h-[280px]">
        <StatsChart />
      </div>
      <div className="sm:col-span-2 lg:col-span-1">
        <QuickActions />
      </div>

      {/* ── Row 3: TaskList (2 cols) + TodoList + ProjectProgress ── */}
      <div className="sm:col-span-2 lg:col-span-2 min-h-[320px]">
        <TaskList />
      </div>
      <div className="sm:col-span-1 lg:col-span-1 min-h-[320px]">
        <TodoList />
      </div>
      <div className="sm:col-span-1 lg:col-span-1 min-h-[320px]">
        <ProjectProgress />
      </div>
    </div>
  );
}