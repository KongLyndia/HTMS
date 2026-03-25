import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence }     from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User, Lock, Bell, Camera, Loader2, CheckCircle2,
  AlertCircle, Eye, EyeOff, Save, Shield,
} from "lucide-react";
import { cn }          from "@/lib/utils";
import { userApi }     from "@/api/userApi";
import { useAuthStore } from "@/store/authStore";

// ─── Notification prefs (localStorage) ───────────────────────────────
const NOTIF_KEY = "htms_notif_prefs";
const DEFAULT_PREFS = {
  taskAssigned:  true,
  taskRejected:  true,
  taskApproved:  true,
  commentMention: true,
  memberAdded:   false,
};
type NotifPrefs = typeof DEFAULT_PREFS;

function loadPrefs(): NotifPrefs {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(NOTIF_KEY) || "{}") }; }
  catch { return DEFAULT_PREFS; }
}
function savePrefs(p: NotifPrefs) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(p));
}

// ─── Password strength ────────────────────────────────────────────────
function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Yếu",      color: "bg-rose-500"   };
  if (score <= 2) return { score, label: "Trung bình", color: "bg-amber-500" };
  if (score <= 3) return { score, label: "Khá",       color: "bg-blue-500"   };
  return              { score, label: "Mạnh",       color: "bg-emerald-500" };
}

// ─── Sidebar nav ──────────────────────────────────────────────────────
const NAV = [
  { key: "profile",  icon: User,   label: "Thông tin cá nhân" },
  { key: "password", icon: Lock,   label: "Đổi mật khẩu"      },
  { key: "notif",    icon: Bell,   label: "Thông báo"          },
];

// ─── Toast ────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: "success"|"error" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg border",
        type === "success"
          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
          : "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800")}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
    </motion.div>
  );
}

// ─── Profile Section ──────────────────────────────────────────────────
function ProfileSection() {
  const qc        = useQueryClient();
  const authStore = useAuthStore();
  const fileRef   = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-me"],
    queryFn:  userApi.getMe,
  });

  const [name,      setName]      = useState("");
  const [preview,   setPreview]   = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [toast,     setToast]     = useState<{ msg: string; type: "success"|"error" } | null>(null);

  useEffect(() => {
    if (profile) setName(profile.fullName ?? "");
  }, [profile]);

  const showToast = (msg: string, type: "success"|"error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const mutation = useMutation({
    mutationFn: () => userApi.updateProfile(name.trim(), avatarFile),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["user-me"] });
      authStore.updateUser({ fullName: updated.fullName ?? "", avatarUrl: updated.avatarUrl ?? undefined });
      setAvatarFile(null);
      setPreview(null);
      showToast("Cập nhật thành công!", "success");
    },
    onError: (err: any) => showToast(err.message || "Cập nhật thất bại", "error"),
  });

  const handleFile = (f: File) => {
    if (f.size > 5 * 1024 * 1024) { showToast("Ảnh quá lớn (tối đa 5MB)", "error"); return; }
    setAvatarFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const avatarSrc = preview || profile?.avatarUrl;
  const initials  = (profile?.fullName || profile?.email || "U")[0].toUpperCase();
  const canSave   = name.trim().length >= 1 && (
    name.trim() !== (profile?.fullName ?? "") || !!avatarFile
  );

  if (isLoading) return (
    <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-teal-500 animate-spin" /></div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-slate-800 dark:text-white">Thông tin cá nhân</h2>
        <p className="text-sm text-slate-400 mt-0.5">Cập nhật tên và ảnh đại diện của bạn</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative">
          {avatarSrc
            ? <img src={avatarSrc} alt="avatar"
                className="w-20 h-20 rounded-2xl object-cover ring-2 ring-teal-400/30" />
            : <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-2xl font-bold text-white">
                {initials}
              </div>}
          <button onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-lg bg-teal-500 hover:bg-teal-600 text-white flex items-center justify-center shadow-md transition-colors">
            <Camera className="w-3.5 h-3.5" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{profile?.fullName || "Chưa đặt tên"}</p>
          <p className="text-xs text-slate-400">{profile?.email}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Tham gia {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("vi-VN") : ""}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4 max-w-md">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Họ và tên</label>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={150}
            placeholder="Nhập họ và tên..."
            className="w-full px-3.5 py-2.5 rounded-xl text-sm #f0fdfa dark:bg-white/[0.1] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</label>
          <input value={profile?.email ?? ""} disabled
            className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] text-slate-400 cursor-not-allowed" />
          <p className="text-[11px] text-slate-400">Email không thể thay đổi</p>
        </div>

        <button onClick={() => mutation.mutate()} disabled={!canSave || mutation.isPending}
          className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
            canSave && !mutation.isPending
              ? "bg-teal-500 hover:bg-teal-600 text-white"
              : "bg-slate-100 dark:bg-white/10 text-slate-400 cursor-not-allowed")}>
          {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</>
            : <><Save className="w-4 h-4" /> Lưu thay đổi</>}
        </button>
      </div>

      <AnimatePresence>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </AnimatePresence>
    </div>
  );
}

// ─── Password Section ─────────────────────────────────────────────────
function PasswordSection() {
  const [old,     setOld]     = useState("");
  const [nw,      setNw]      = useState("");
  const [confirm, setConfirm] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNw,  setShowNw]  = useState(false);
  const [toast,   setToast]   = useState<{ msg: string; type: "success"|"error" } | null>(null);

  const strength    = passwordStrength(nw);
  const matchError  = confirm && nw !== confirm;
  const canSubmit   = old && nw.length >= 6 && nw === confirm;

  const showToast = (msg: string, type: "success"|"error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const mutation = useMutation({
    mutationFn: () => userApi.changePassword(old, nw),
    onSuccess: () => {
      setOld(""); setNw(""); setConfirm("");
      showToast("Đổi mật khẩu thành công!", "success");
    },
    onError: (err: any) => showToast(err.message || "Đổi mật khẩu thất bại", "error"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-slate-800 dark:text-white">Đổi mật khẩu</h2>
        <p className="text-sm text-slate-400 mt-0.5">Mật khẩu mới phải có ít nhất 6 ký tự</p>
      </div>

      <div className="space-y-4 max-w-md">
        {/* Old password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mật khẩu hiện tại</label>
          <div className="relative">
            <input type={showOld ? "text" : "password"} value={old} onChange={e => setOld(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm #f0fdfa dark:bg-white/[0.1] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all" />
            <button onClick={() => setShowOld(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* New password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mật khẩu mới</label>
          <div className="relative">
            <input type={showNw ? "text" : "password"} value={nw} onChange={e => setNw(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm #f0fdfa dark:bg-white/[0.1] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all" />
            <button onClick={() => setShowNw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              {showNw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {nw && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={cn("h-1 flex-1 rounded-full transition-all",
                    i <= strength.score ? strength.color : "bg-slate-200 dark:bg-white/10")} />
                ))}
              </div>
              <p className={cn("text-[11px] font-medium", strength.score <= 1 ? "text-rose-500" : strength.score <= 2 ? "text-amber-500" : strength.score <= 3 ? "text-blue-500" : "text-emerald-500")}>
                {strength.label}
              </p>
            </div>
          )}
        </div>

        {/* Confirm */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Xác nhận mật khẩu mới</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="••••••••"
            className={cn("w-full px-3.5 py-2.5 rounded-xl text-sm #f0fdfa dark:bg-white/[0.1] border text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all",
              matchError ? "border-rose-400 focus:ring-rose-400/20" : "border-slate-200 dark:border-white/[0.08] focus:border-teal-400 focus:ring-teal-400/20")} />
          {matchError && <p className="text-[11px] text-rose-500">Mật khẩu không khớp</p>}
        </div>

        <button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}
          className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
            canSubmit && !mutation.isPending
              ? "bg-teal-500 hover:bg-teal-600 text-white"
              : "bg-slate-100 dark:bg-white/10 text-slate-400 cursor-not-allowed")}>
          {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</>
            : <><Shield className="w-4 h-4" /> Đổi mật khẩu</>}
        </button>
      </div>

      <AnimatePresence>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </AnimatePresence>
    </div>
  );
}

// ─── Notification Section ─────────────────────────────────────────────
function NotifSection() {
  const [prefs, setPrefs] = useState<NotifPrefs>(loadPrefs);
  const [saved,  setSaved]  = useState(false);

  const ITEMS = [
    { key: "taskAssigned"   as const, label: "Được giao task mới",          desc: "Khi Manager giao task cho bạn" },
    { key: "taskRejected"   as const, label: "Task bị từ chối",             desc: "Khi Manager từ chối minh chứng" },
    { key: "taskApproved"   as const, label: "Task được phê duyệt",         desc: "Khi Manager duyệt task của bạn" },
    { key: "commentMention" as const, label: "Được nhắc đến trong comment", desc: "Khi ai đó @mention bạn" },
    { key: "memberAdded"    as const, label: "Được thêm vào dự án",         desc: "Khi được mời tham gia dự án" },
  ];

  const toggle = (key: keyof NotifPrefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = () => {
    savePrefs(prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-slate-800 dark:text-white">Cài đặt thông báo</h2>
        <p className="text-sm text-slate-400 mt-0.5">Chọn loại thông báo bạn muốn nhận</p>
      </div>

      <div className="space-y-2 max-w-lg">
        {ITEMS.map(item => (
          <div key={item.key}
            className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] hover:border-slate-200 dark:hover:border-white/10 transition-colors">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
            </div>
            {/* Toggle switch */}
            <button onClick={() => toggle(item.key)}
              className={cn("relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200",
                prefs[item.key] ? "bg-teal-500" : "bg-slate-200 dark:bg-white/10")}>
              <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200",
                prefs[item.key] ? "translate-x-5" : "translate-x-0")} />
            </button>
          </div>
        ))}
      </div>

      <button onClick={handleSave}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-teal-500 hover:bg-teal-600 text-white transition-colors">
        {saved ? <><CheckCircle2 className="w-4 h-4" /> Đã lưu!</> : <><Save className="w-4 h-4" /> Lưu cài đặt</>}
      </button>

      <p className="text-[11px] text-slate-400">
        Lưu ý: Cài đặt thông báo được lưu trên trình duyệt này.
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [active, setActive] = useState<"profile"|"password"|"notif">("profile");

  const SECTIONS = { profile: <ProfileSection />, password: <PasswordSection />, notif: <NotifSection /> };

  return (
    <div className="h-full flex #f0fdfa dark:bg-[#0b1120] overflow-hidden">

      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0b1120] p-4">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">Cài đặt</p>
        <nav className="space-y-0.5">
          {NAV.map(item => (
            <button key={item.key} onClick={() => setActive(item.key as any)}
              className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                active === item.key
                  ? "bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]")}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8
                      [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full
                      [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-white/10">
        <AnimatePresence mode="wait">
          <motion.div key={active}
            initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
            {SECTIONS[active]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}