import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// ─── Data ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: "⬡",
    title: "Kanban Board thông minh",
    desc: "Workflow 4 bước kiểm duyệt: Todo → Đang làm → Chờ duyệt → Hoàn thành. Nộp minh chứng, phê duyệt task theo chuẩn doanh nghiệp.",
    color: "#0d9488",
  },
  {
    icon: "⚡",
    title: "Cộng tác Realtime",
    desc: "Mọi thay đổi — task, thành viên, file — cập nhật tức thì cho toàn nhóm qua SignalR. Không cần refresh trang.",
    color: "#6366f1",
  },
  {
    icon: "🤖",
    title: "AI Task Prioritizer",
    desc: "Thuật toán tự động tính điểm ưu tiên đa chiều (deadline, mức độ, trạng thái, khối lượng). Gợi ý Daily Focus 3-5 task quan trọng nhất.",
    color: "#f59e0b",
  },
  {
    icon: "📊",
    title: "Thống kê & Báo cáo",
    desc: "Biểu đồ realtime tiến độ dự án, hiệu suất thành viên. Xuất Excel 3 sheet hoặc PDF A4 chuyên nghiệp ngay trên trình duyệt.",
    color: "#10b981",
  },
  {
    icon: "🗄️",
    title: "Kho tài liệu Cloud",
    desc: "Upload, xem trước, tải xuống file trực tiếp trong dự án. Ảnh, PDF, Office — tất cả lưu trên Cloudinary, cập nhật realtime.",
    color: "#8b5cf6",
  },
  {
    icon: "⏰",
    title: "Nhắc deadline tự động",
    desc: "Background service chạy 24/7, tự gửi email HTML nhắc nhở tại mốc 3 ngày, 1 ngày và ngay ngày hết hạn.",
    color: "#ef4444",
  },
];

const STATS = [
  { value: "4", label: "Trạng thái workflow", suffix: "" },
  { value: "3", label: "Cấp phân quyền", suffix: "" },
  { value: "∞", label: "Cộng tác realtime", suffix: "" },
  { value: "2", label: "Định dạng xuất báo cáo", suffix: "" },
];

const WORKFLOW = [
  { step: "01", title: "Todo", desc: "Task mới được tạo và giao cho thành viên", color: "#64748b" },
  { step: "02", title: "In Progress", desc: "Thành viên bắt đầu thực hiện task", color: "#3b82f6" },
  { step: "03", title: "Pending", desc: "Nộp minh chứng, chờ Manager kiểm duyệt", color: "#f59e0b" },
  { step: "04", title: "Completed", desc: "Manager duyệt — task hoàn thành chính thức", color: "#10b981" },
];

// ─── Hooks ────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Components ───────────────────────────────────────────────────────
function AnimSection({ children, delay = 0, className = "", style: outerStyle }: {
  children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties;
}) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(32px)",
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      ...outerStyle,
    }}>
      {children}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate  = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return (
    <div style={{ fontFamily: "'Be Vietnam Pro', 'Outfit', sans-serif", background: "#060d18", color: "#e2e8f0", minHeight: "100vh", overflowX: "hidden" }}>

      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />

      {/* ── Cursor glow ── */}
      <div style={{
        position: "fixed", pointerEvents: "none", zIndex: 0,
        left: mousePos.x - 200, top: mousePos.y - 200,
        width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(13,148,136,0.08) 0%, transparent 70%)",
        transition: "left 0.1s, top 0.1s",
      }} />

      {/* ════════════════ NAV ════════════════ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px", height: 64,
        background: "rgba(6,13,24,0.8)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, background: "#0d9488",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, boxShadow: "0 0 20px rgba(13,148,136,0.4)",
          }}>✓</div>
          <span style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 800, fontSize: 18, color: "#fff" }}>
            Nex<span style={{ color: "#0d9488" }}>Us</span>
          </span>
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {["Tính năng", "Workflow", "Về hệ thống"].map(l => (
            <a key={l} href={`#${l}`} style={{ color: "#94a3b8", fontSize: 14, textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#0d9488")}
              onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}>
              {l}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => navigate("/auth")} style={{
            padding: "8px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent", color: "#94a3b8", fontSize: 14, cursor: "pointer", transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}>
            Đăng ký
          </button>
          <button onClick={() => navigate("/auth")} style={{
            padding: "8px 20px", borderRadius: 10, border: "none",
            background: "#0d9488", color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: "pointer", transition: "all 0.2s", boxShadow: "0 0 20px rgba(13,148,136,0.3)",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "#0f766e"; e.currentTarget.style.boxShadow = "0 0 30px rgba(13,148,136,0.5)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#0d9488"; e.currentTarget.style.boxShadow = "0 0 20px rgba(13,148,136,0.3)"; }}>
             Đăng nhập →
          </button>
        </div>
      </nav>

      {/* ════════════════ HERO ════════════════ */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 48px 80px" }}>

        {/* Grid background */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(13,148,136,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(13,148,136,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }} />

        {/* Glow blobs */}
        <div style={{ position: "absolute", top: "20%", left: "10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(13,148,136,0.12) 0%, transparent 70%)", filter: "blur(40px)", zIndex: 0 }} />
        <div style={{ position: "absolute", bottom: "10%", right: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)", filter: "blur(40px)", zIndex: 0 }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 820, textAlign: "center" }}>

          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", borderRadius: 999,
            border: "1px solid rgba(13,148,136,0.3)",
            background: "rgba(13,148,136,0.08)",
            marginBottom: 32,
            animation: "fadeDown 0.6s ease both",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0d9488", display: "inline-block", boxShadow: "0 0 8px #0d9488" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#0d9488", letterSpacing: "0.08em", fontFamily: "'Be Vietnam Pro', monospace" }}>
              HỆ THỐNG QUẢN LÝ CÔNG VIỆC
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 800,
            fontSize: "clamp(42px, 7vw, 80px)",
            lineHeight: 1.05, marginBottom: 24, color: "#fff",
            animation: "fadeUp 0.7s ease 0.1s both",
          }}>
            Quản lý dự án{" "}
            <span style={{
              background: "linear-gradient(135deg, #0d9488, #38bdf8)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              thông minh
            </span>
            <br />cho nhóm hiện đại
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: 18, lineHeight: 1.7, color: "#94a3b8",
            maxWidth: 600, margin: "0 auto 40px",
            animation: "fadeUp 0.7s ease 0.2s both",
          }}>
            NexUs kết hợp Kanban Board, cộng tác realtime, AI ưu tiên công việc và báo cáo tự động — tất cả trong một hệ thống thống nhất.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", animation: "fadeUp 0.7s ease 0.3s both" }}>
            <button onClick={() => navigate("/auth")} style={{
              padding: "14px 32px", borderRadius: 12, border: "none",
              background: "#0d9488", color: "#fff", fontSize: 16, fontWeight: 700,
              cursor: "pointer", transition: "all 0.25s",
              boxShadow: "0 0 40px rgba(13,148,136,0.35)",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 40px rgba(13,148,136,0.5)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 40px rgba(13,148,136,0.35)"; }}>
              Bắt đầu ngay — Miễn phí
            </button>
            <button style={{
              padding: "14px 32px", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.03)", color: "#e2e8f0",
              fontSize: 16, fontWeight: 600, cursor: "pointer", transition: "all 0.25s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              Xem demo →
            </button>
          </div>

          {/* Hero visual */}
          <div style={{ marginTop: 64, animation: "fadeUp 0.9s ease 0.4s both" }}>
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20, padding: 24,
              boxShadow: "0 40px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}>
              {/* Mock kanban */}
              <div style={{ display: "flex", gap: 12 }}>
                {WORKFLOW.map((w, i) => (
                  <div key={w.step} style={{ flex: 1, background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: "14px 12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: w.color, boxShadow: `0 0 8px ${w.color}` }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: w.color, fontFamily: "'Be Vietnam Pro', monospace" }}>{w.title}</span>
                    </div>
                    {Array.from({ length: i === 0 ? 2 : i === 3 ? 3 : 1 }).map((_, j) => (
                      <div key={j} style={{
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 8, padding: "10px 10px", marginBottom: 6,
                      }}>
                        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", marginBottom: 6, width: `${60 + j * 20}%` }} />
                        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.05)", width: "50%" }} />
                        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                          <div style={{ height: 14, width: 40, borderRadius: 4, background: `${w.color}22`, border: `1px solid ${w.color}44` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ STATS ════════════════ */}
      <section style={{ padding: "80px 48px", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <AnimSection>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32 }}>
            {STATS.map((s, i) => (
              <AnimSection key={s.label} delay={i * 0.08}>
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 800,
                    fontSize: 52, color: "#0d9488", lineHeight: 1,
                    marginBottom: 8, textShadow: "0 0 40px rgba(13,148,136,0.4)",
                  }}>
                    {s.value}{s.suffix}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>{s.label}</div>
                </div>
              </AnimSection>
            ))}
          </div>
        </AnimSection>
      </section>

      {/* ════════════════ FEATURES ════════════════ */}
      <section id="Tính năng" style={{ padding: "100px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          <AnimSection style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: 999, background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.2)", marginBottom: 20 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#0d9488", letterSpacing: "0.1em", fontFamily: "'Be Vietnam Pro', monospace" }}>TÍNH NĂNG NỔI BẬT</span>
            </div>
            <h2 style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 800, fontSize: "clamp(28px, 4vw, 44px)", color: "#fff", marginBottom: 16 }}>
              Mọi thứ nhóm bạn cần
            </h2>
            <p style={{ fontSize: 16, color: "#64748b", maxWidth: 500, margin: "0 auto" }}>
              Từ quản lý task đến báo cáo chuyên sâu — tất cả được tích hợp liền mạch.
            </p>
          </AnimSection>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {FEATURES.map((f, i) => (
              <AnimSection key={f.title} delay={i * 0.08}>
                <div style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 16, padding: 28,
                  transition: "all 0.3s",
                  cursor: "default",
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.borderColor = `${f.color}44`;
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = `0 20px 40px rgba(0,0,0,0.3), 0 0 0 1px ${f.color}22`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, marginBottom: 20,
                    background: `${f.color}18`, border: `1px solid ${f.color}33`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20,
                  }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: 16, color: "#f1f5f9", marginBottom: 10 }}>
                    {f.title}
                  </h3>
                  <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7 }}>
                    {f.desc}
                  </p>
                </div>
              </AnimSection>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ WORKFLOW ════════════════ */}
      <section id="Workflow" style={{ padding: "100px 48px", background: "rgba(255,255,255,0.01)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <AnimSection style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: 999, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", marginBottom: 20 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", letterSpacing: "0.1em", fontFamily: "'Be Vietnam Pro', monospace" }}>QUY TRÌNH KIỂM DUYỆT</span>
            </div>
            <h2 style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 800, fontSize: "clamp(28px, 4vw, 44px)", color: "#fff", marginBottom: 16 }}>
              Workflow 4 bước chuẩn
            </h2>
            <p style={{ fontSize: 16, color: "#64748b", maxWidth: 480, margin: "0 auto" }}>
              Không chỉ kéo thả — mỗi task phải được kiểm duyệt trước khi hoàn thành.
            </p>
          </AnimSection>

          {/* Steps */}
          <div style={{ display: "flex", gap: 0, position: "relative" }}>
            {/* Connector line */}
            <div style={{ position: "absolute", top: 28, left: "12.5%", right: "12.5%", height: 1, background: "linear-gradient(90deg, #0d9488, #3b82f6, #f59e0b, #10b981)", opacity: 0.3, zIndex: 0 }} />

            {WORKFLOW.map((w, i) => (
              <AnimSection key={w.step} delay={i * 0.12} style={{ flex: 1, textAlign: "center", position: "relative", zIndex: 1 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", margin: "0 auto 20px",
                  background: `${w.color}18`, border: `2px solid ${w.color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 0 20px ${w.color}33`,
                }}>
                  <span style={{ fontFamily: "'Be Vietnam Pro', monospace", fontWeight: 700, fontSize: 13, color: w.color }}>
                    {w.step}
                  </span>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 15, color: w.color, marginBottom: 8 }}>{w.title}</h3>
                <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, padding: "0 12px" }}>{w.desc}</p>

                {i < WORKFLOW.length - 1 && (
                  <div style={{ position: "absolute", top: 20, right: -8, fontSize: 16, color: "#334155", zIndex: 2 }}>›</div>
                )}
              </AnimSection>
            ))}
          </div>

          {/* Highlight boxes */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 60 }}>
            {[
              { icon: "🔐", title: "Minh chứng bắt buộc", desc: "Nộp file hoặc mô tả text khi hoàn thành — đảm bảo chất lượng đầu ra." },
              { icon: "👤", title: "Manager kiểm duyệt", desc: "Chỉ Manager mới có quyền Approve hoặc Reject task — có thể ghi lý do từ chối." },
              { icon: "🔔", title: "Thông báo tức thì", desc: "Assignee nhận thông báo ngay khi task được duyệt hoặc từ chối qua SignalR." },
            ].map((b, i) => (
              <AnimSection key={b.title} delay={0.2 + i * 0.08}>
                <div style={{
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 14, padding: "20px 22px",
                }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{b.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0", marginBottom: 6 }}>{b.title}</div>
                  <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{b.desc}</div>
                </div>
              </AnimSection>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ TECH STACK ════════════════ */}
      <section id="Về hệ thống" style={{ padding: "100px 48px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <AnimSection style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: 999, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", marginBottom: 20 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", letterSpacing: "0.1em", fontFamily: "'Be Vietnam Pro', monospace" }}>CÔNG NGHỆ</span>
            </div>
            <h2 style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 800, fontSize: "clamp(28px, 4vw, 44px)", color: "#fff", marginBottom: 16 }}>
              Xây dựng trên nền tảng vững chắc
            </h2>
          </AnimSection>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
            {[
              {
                side: "Backend",
                color: "#6366f1",
                items: [
                  ["ASP.NET Core 8", "REST API, Dependency Injection, Middleware"],
                  ["Entity Framework Core", "ORM, Code-First Migration, LINQ"],
                  ["SignalR", "Realtime WebSocket — task, file, notification"],
                  ["BCrypt + JWT", "Xác thực bảo mật, token 7 ngày"],
                  ["Cloudinary SDK", "Upload và quản lý file đám mây"],
                  ["SMTP Gmail", "Email OTP xác thực + nhắc deadline tự động"],
                ],
              },
              {
                side: "Frontend",
                color: "#0d9488",
                items: [
                  ["React 18 + TypeScript", "Component-based, strict type safety"],
                  ["TanStack Query", "Server state, caching, optimistic update"],
                  ["Framer Motion", "Animation toàn bộ UI — smooth 60fps"],
                  ["Tailwind CSS", "Utility-first, dark mode, responsive"],
                  ["Zustand", "Global state — auth, sidebar, theme"],
                  ["Recharts + SheetJS/jsPDF", "Biểu đồ + xuất báo cáo client-side"],
                ],
              },
            ].map((col, ci) => (
              <AnimSection key={col.side} delay={ci * 0.1}>
                <div style={{
                  background: "rgba(255,255,255,0.02)", border: `1px solid ${col.color}22`,
                  borderRadius: 16, padding: 28, height: "100%",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.color, boxShadow: `0 0 12px ${col.color}` }} />
                    <span style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 800, fontSize: 18, color: "#fff" }}>{col.side}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {col.items.map(([name, detail]) => (
                      <div key={name} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontFamily: "'Be Vietnam Pro', monospace", fontSize: 13, fontWeight: 600, color: col.color }}>
                          {name}
                        </span>
                        <span style={{ fontSize: 12, color: "#475569" }}>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </AnimSection>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ CTA ════════════════ */}
      <section style={{ padding: "100px 48px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <AnimSection>
          <div style={{
            maxWidth: 700, margin: "0 auto", textAlign: "center",
            background: "radial-gradient(ellipse at center, rgba(13,148,136,0.1) 0%, transparent 70%)",
            padding: "60px 40px",
          }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}></div>
            <h2 style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 800, fontSize: "clamp(28px, 4vw, 44px)", color: "#fff", marginBottom: 16 }}>
              Sẵn sàng bắt đầu?
            </h2>
            <p style={{ fontSize: 16, color: "#64748b", marginBottom: 40, lineHeight: 1.7 }}>
              Tạo tài khoản miễn phí, trải nghiệm toàn bộ tính năng ngay hôm nay. Không cần thẻ tín dụng.
            </p>
            <button onClick={() => navigate("/auth")} style={{
              padding: "16px 40px", borderRadius: 14, border: "none",
              background: "#0d9488", color: "#fff", fontSize: 17, fontWeight: 700,
              cursor: "pointer", transition: "all 0.25s",
              boxShadow: "0 0 60px rgba(13,148,136,0.4)",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 12px 60px rgba(13,148,136,0.6)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.boxShadow = "0 0 60px rgba(13,148,136,0.4)"; }}>
              Tạo tài khoản miễn phí →
            </button>
          </div>
        </AnimSection>
      </section>

      {/* ════════════════ FOOTER ════════════════ */}
      <footer style={{ padding: "32px 48px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✓</div>
          <span style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 800, fontSize: 14, color: "#fff" }}>
            Nex<span style={{ color: "#0d9488" }}>Us</span>
          </span>
        </div>
        <span style={{ fontSize: 13, color: "#334155" }}>© 2026 NextUs — Hệ thống quản lý công việc thông minh</span>
        <div style={{ display: "flex", gap: 20 }}>
          {["Tính năng", "Workflow", "Về hệ thống"].map(l => (
            <a key={l} href={`#${l}`} style={{ fontSize: 13, color: "#475569", textDecoration: "none" }}
              onMouseEnter={e => e.currentTarget.style.color = "#0d9488"}
              onMouseLeave={e => e.currentTarget.style.color = "#475569"}>
              {l}
            </a>
          ))}
        </div>
      </footer>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(13,148,136,0.3); border-radius: 3px; }
      `}</style>
    </div>
  );
}