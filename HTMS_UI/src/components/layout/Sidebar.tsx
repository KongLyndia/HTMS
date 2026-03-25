import { useState, useEffect } from "react";
import type { ElementType } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ListTodo, Kanban, Users, BarChart2,
  Settings, Settings2, LogOut, CheckSquare, ChevronLeft, ChevronRight,
  ChevronDown, Plus, Bell, HardDrive,
} from "lucide-react";
import { useQuery }         from "@tanstack/react-query";
import { cn }               from "@/lib/utils";
import { useAuthStore }     from "@/store/authStore";
import { useSidebarStore }  from "@/store/sidebarStore";
import { useProjectStore }  from "@/store/projectStore";
import { useNotifications } from "@/hooks/useNotification";
import { projectApi }       from "@/api/projectApi";
import CreateProjectModal   from "@/components/project/CreateProjectModal";
import ProjectSettingsModal from "@/components/project/ProjectSettingsModal";
import StoragePage from "@/components/project/StoragePage";

// ─────────────────────────────────────────────────────────────────────
const CORE_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Tổng quan" },
  { to: "/my-tasks",  icon: ListTodo,        label: "Công việc" },
] as const;

const BOTTOM_ITEMS = [
  { to: "/settings", icon: Settings, label: "Cài đặt" },
] as const;

const PROJECT_SUB_ITEMS = [
  { key: "board",   icon: Kanban,    label: "Bảng Kanban" },
  { key: "members", icon: Users,     label: "Thành viên"  },
  { key: "stats",   icon: BarChart2, label: "Thống kê"    },
  { key: "storage", icon: HardDrive, label: "Tài liệu"    },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────

function Tooltip({ label }: { label: string }) {
  return (
    <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap z-50 bg-slate-900 dark:bg-slate-700 text-white shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-100">
      {label}
    </span>
  );
}

function ActivePill({ layoutId }: { layoutId: string }) {
  return (
    <motion.span
      layoutId={layoutId}
      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-teal-500"
    />
  );
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="h-3" />;
  return (
    <p className="px-3 pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-600 select-none">
      {label}
    </p>
  );
}

// ── NavItem ───────────────────────────────────────────────────────────
function NavItem({ to, icon: Icon, label, collapsed }: {
  to: string; icon: ElementType; label: string; collapsed: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => cn(
        "relative flex items-center gap-3 rounded-xl px-3 h-10 text-sm font-medium",
        "transition-colors duration-150 group",
        collapsed && "justify-center px-0",
        isActive
          ? "bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400"
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200"
      )}
    >
      {({ isActive }) => (
        <>
          {isActive && <ActivePill layoutId={`pill-${to}`} />}
          <Icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-teal-500")} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }} className="whitespace-nowrap truncate"
              >{label}</motion.span>
            )}
          </AnimatePresence>
          {collapsed && <Tooltip label={label} />}
        </>
      )}
    </NavLink>
  );
}

// ── InboxButton ───────────────────────────────────────────────────────
function InboxButton({ collapsed }: { collapsed: boolean }) {
  const { data: notifData } = useNotifications();
  const unread              = notifData?.unreadCount ?? 0;
  const location            = useLocation();
  const isActive            = location.pathname === "/inbox";

  return (
    <NavLink
      to="/inbox"
      className={cn(
        "relative w-full flex items-center gap-3 rounded-xl px-3 h-10 text-sm font-medium",
        "transition-colors duration-150 group",
        collapsed && "justify-center px-0",
        isActive
          ? "bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400"
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200"
      )}
    >
      {isActive && <ActivePill layoutId="pill-inbox" />}
      <div className="relative flex-shrink-0">
        <Bell className={cn("w-4 h-4", isActive && "text-teal-500")} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </div>
      <AnimatePresence>
        {!collapsed && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }} className="flex-1 flex items-center justify-between"
          >
            <span>Hộp thư</span>
            {unread > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/15 text-rose-500 dark:text-rose-400 leading-none">
                {unread}
              </span>
            )}
          </motion.span>
        )}
      </AnimatePresence>
      {collapsed && <Tooltip label={`Hộp thư${unread > 0 ? ` (${unread})` : ""}`} />}
    </NavLink>
  );
}

// ── ProjectSubItem — style đồng nhất với "Cài đặt dự án" ─────────────
function ProjectSubItem({ projectId, itemKey, icon: Icon, label }: {
  projectId: string; itemKey: string; icon: ElementType; label: string;
}) {
  const to       = `/projects/${projectId}/${itemKey}`;
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink
      to={to}
      className={cn(
        "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150",
        isActive
          ? "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10"
          : "text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10"
      )}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

// ── ProjectItem ───────────────────────────────────────────────────────
function ProjectItem({
  project, collapsed,
}: {
  project: { projectId: string; projectName: string };
  collapsed: boolean;
}) {
  const { expandedProjects, toggleProject } = useSidebarStore();
  const location    = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const isExpanded  = expandedProjects.includes(project.projectId);
  const isInProject = location.pathname.startsWith(`/projects/${project.projectId}`);
  const initial     = project.projectName[0]?.toUpperCase() ?? "P";

  const AVATAR_COLORS = [
    "#0d9488","#6366f1","#f59e0b","#ef4444",
    "#8b5cf6","#10b981","#f97316","#3b82f6",
  ];
  const colorIndex = project.projectId
    .split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  const avatarColor = AVATAR_COLORS[colorIndex];

  return (
    <div>
      <button
        onClick={() => !collapsed && toggleProject(project.projectId)}
        className={cn(
          "w-full relative flex items-center gap-3 rounded-xl px-3 h-10 text-sm font-medium",
          "transition-colors duration-150 group",
          collapsed && "justify-center px-0",
          isInProject
            ? "text-teal-600 dark:text-teal-400"
            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200"
        )}
      >
        {isInProject && !isExpanded && <ActivePill layoutId={`pill-proj-${project.projectId}`} />}

        {/* Color dot avatar */}
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white"
          style={{ background: avatarColor, boxShadow: `0 2px 6px ${avatarColor}50` }}
        >
          {initial}
        </div>

        <AnimatePresence>
          {!collapsed && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-between min-w-0"
            >
              <span className="truncate text-left">{project.projectName}</span>
              <ChevronDown className={cn(
                "w-3.5 h-3.5 flex-shrink-0 ml-1 transition-transform duration-200 text-slate-400",
                isExpanded && "rotate-180"
              )} />
            </motion.span>
          )}
        </AnimatePresence>
        {collapsed && <Tooltip label={project.projectName} />}
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && !collapsed && (
          <motion.div key="sub"
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="ml-[22px] mt-0.5 mb-1 border-l-2 border-slate-100 dark:border-white/[0.06] pl-2 flex flex-col gap-0.5">
              {PROJECT_SUB_ITEMS.map((sub) => (
                <ProjectSubItem key={sub.key} projectId={project.projectId}
                  itemKey={sub.key} icon={sub.icon} label={sub.label}
                />
              ))}
              {/* Cài đặt dự án — cùng style với các sub-item trên */}
              <button
                onClick={() => setShowSettings(true)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors duration-150"
              >
                <Settings2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">Cài đặt dự án</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProjectSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        projectId={project.projectId}
        projectName={project.projectName}
      />
    </div>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────
export default function Sidebar() {
  const { collapsed, toggleSidebar }  = useSidebarStore();
  const navigate                       = useNavigate();
  const { user, clearAuth }            = useAuthStore();
  const { projects, setProjects }      = useProjectStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: sidebarProjects } = useQuery({
    queryKey: ["sidebar-projects"],
    queryFn:  projectApi.getSidebarProjects,
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    if (sidebarProjects) setProjects(sidebarProjects);
  }, [sidebarProjects]);

  return (
    <>
      <motion.aside
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "relative flex flex-col h-full flex-shrink-0 overflow-hidden",
          "border-r border-slate-200/60 dark:border-white/[0.06]",
          "bg-white dark:bg-[#0d1525] transition-colors duration-500"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-16 flex-shrink-0 border-b border-slate-200/60 dark:border-white/[0.06]",
          collapsed ? "justify-center" : "px-5 gap-3"
        )}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "#0d9488", boxShadow: "0 2px 10px rgba(13,148,136,.4)" }}
          >
            <CheckSquare className="w-3.5 h-3.5 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}
                className="font-bold text-sm text-slate-900 dark:text-white tracking-tight whitespace-nowrap"
              >
                Nex<span style={{ color: "#0d9488" }}>Us</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 overflow-y-auto overflow-x-hidden space-y-0.5 scrollbar-none">

          {/* CORE */}
          <SectionLabel label="Chính" collapsed={collapsed} />
          {CORE_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} />
          ))}

          {/* INBOX */}
          <InboxButton collapsed={collapsed} />

          {/* PROJECTS */}
          <SectionLabel label="Dự án" collapsed={collapsed} />

          <AnimatePresence>
            {projects.map((p) => (
              <motion.div
                key={p.projectId}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.18 }}
              >
                <ProjectItem project={p} collapsed={collapsed} />
              </motion.div>
            ))}
          </AnimatePresence>

          {projects.length === 0 && !collapsed && (
            <p className="px-3 py-1.5 text-xs text-slate-400 dark:text-slate-600 italic">
              Chưa có dự án nào
            </p>
          )}

          {/* Nút tạo dự án — expanded */}
          <AnimatePresence>
            {!collapsed && (
              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                type="button"
                onClick={() => setShowCreateModal(true)}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-xl px-3 h-9 text-xs mt-1",
                  "text-slate-400 dark:text-slate-500",
                  "border border-dashed border-slate-200 dark:border-white/[0.08]",
                  "hover:border-teal-400 dark:hover:border-teal-500/50",
                  "hover:text-teal-600 dark:hover:text-teal-400",
                  "hover:bg-teal-50/50 dark:hover:bg-teal-500/5",
                  "transition-colors duration-150"
                )}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo dự án mới</span>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Nút tạo dự án — collapsed */}
          {collapsed && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="relative w-full flex justify-center items-center h-10 rounded-xl text-slate-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors group"
            >
              <Plus className="w-4 h-4" />
              <Tooltip label="Tạo dự án mới" />
            </button>
          )}

          {/* Divider + Bottom items */}
          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-white/[0.04]" />
          {BOTTOM_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} />
          ))}
        </nav>

        {/* User + Logout */}
        <div className="flex-shrink-0 border-t border-slate-200/60 dark:border-white/[0.06] p-3 space-y-1">
          <div className={cn(
            "flex items-center gap-2.5 px-2 py-2 rounded-xl",
            collapsed && "justify-center"
          )}>
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt={user.fullName ?? "avatar"}
                  className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-1 ring-teal-400/30" />
              : <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                  {user?.fullName?.[0]?.toUpperCase() ?? "U"}
                </div>
            }
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="min-w-0 flex-1"
                >
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
                    {user?.fullName ?? "User"}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{user?.email}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => { clearAuth(); navigate("/auth"); }}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl px-3 h-9 text-sm group",
              "text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors duration-150",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-sm whitespace-nowrap"
                >
                  Đăng xuất
                </motion.span>
              )}
            </AnimatePresence>
            {collapsed && <Tooltip label="Đăng xuất" />}
          </button>
        </div>

        {/* Collapse toggle */}
        <button onClick={toggleSidebar}
          className="absolute top-[60px] -right-3 z-20 w-6 h-6 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-150 text-slate-400 hover:text-teal-500"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </motion.aside>

      {/* Create Project Modal */}
      <CreateProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
}