import { Outlet } from "react-router-dom";
import Sidebar from "../layout/Sidebar";
import Header  from "../layout/Header";

export default function MainLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden #f0fdfadark:bg-[#080f1c] transition-colors duration-500">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}