import type { ReactNode }  from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider }        from "@tanstack/react-query";
import { ReactQueryDevtools }                      from "@tanstack/react-query-devtools";

import AuthPage         from "@/pages/auth/AuthPage";
import MainLayout       from "@/components/layout/MainLayout";
import DashboardPage    from "@/pages/dashboard/Dashboard";
import InboxPage        from "@/pages/inbox/InboxPage";
import MyTasksPage    from "./pages/mytasks/MyTasksPage";
import MembersPage    from "./pages/members/MembersPage";
import KanbanBoardPage  from "@/pages/board/KanbanBoardPage";
import { useAuthStore } from "@/store/authStore";
import { useSignalR }   from "@/hooks/useSignalR";
import StatsPage       from "@/pages/stats/StatsPage";
import SettingsPage from "./pages/settings/SettingsPage";
import StoragePage from "./components/project/StoragePage";
import { R } from "node_modules/@tanstack/react-query-devtools/build/modern/ReactQueryDevtools-ChNsB-ya";
import HomePage from "./pages/Home/HomePage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 * 5 } },
});

function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/home" replace />;
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <p className="text-4xl mb-3">🚧</p>
        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">{title}</h2>
        <p className="text-sm text-slate-400 mt-1">Trang đang được xây dựng</p>
      </div>
    </div>
  );
}

function SignalRProvider() {
  useSignalR();
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SignalRProvider />
        <Routes>
          <Route path="/home" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index                               element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"                   element={<DashboardPage />} />
            <Route path="inbox"                       element={<InboxPage />} />
            <Route path="my-tasks"                    element={<MyTasksPage />} />
            <Route path="settings"                    element={<SettingsPage />} />
            <Route path="projects"                    element={<PlaceholderPage title="Danh sách dự án" />} />
            <Route path="projects/:projectId/board"   element={<KanbanBoardPage />} />
            <Route path="projects/:projectId/members" element={<MembersPage />} />
            <Route path="projects/:projectId/stats"   element={<StatsPage />} />    
            <Route path="projects/:projectId/storage" element={<StoragePage />} />
     
             </Route>
            <Route path="projects/:projectId/" element={<Navigate to="board" replace />} /></Routes>
            
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}