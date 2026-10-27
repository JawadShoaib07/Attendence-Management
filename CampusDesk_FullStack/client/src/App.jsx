import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  Award,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Download,
  GraduationCap,
  Info,
  LayoutDashboard,
  LoaderCircle,
  Mail,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Users,
  X
} from "lucide-react";

const EMPTY = { name:"", email:"", degree:"BS Software Engineering", semester:"1", gpa:"3.00", status:"Active", classesAttended:"18", totalClasses:"20", marks:"85" };
const STATUSES = ["Active","Inactive","Graduated"];
const PROGRAMS = [
  "BS Software Engineering",
  "BS Computer Science",
  "BS Information Technology",
  "BS Data Science",
  "BBA",
  "BS Mathematics"
];
const CAMPUSES = ["Faisalabad campus", "Lahore campus", "Islamabad campus"];

const initials = name => name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join("").toUpperCase();
const avatarClass = name => ["lavender","mint","peach","blue","pink","gold"][name.split("").reduce((sum,c)=>sum+c.charCodeAt(0),0)%6];
const dateLabel = value => value ? new Intl.DateTimeFormat("en",{month:"short",day:"numeric",year:"numeric"}).format(new Date(value)) : "—";

export default function App() {
  const [activeTab, setActiveTab] = useState("students");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [degreeFilter, setDegreeFilter] = useState("All programs");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [selected, setSelected] = useState([]);
  
  // Interactive topbar & popovers state
  const [campus, setCampus] = useState("Faisalabad campus");
  const [showCampusMenu, setShowCampusMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState([]);
  
  // Settings state (persisted in localStorage)
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("campusdesk_settings");
      return saved ? JSON.parse(saved) : {
        instituteName: "Riphah International University",
        campusBranch: "Faisalabad campus",
        academicTerm: "Fall 2026",
        gradingScale: "4.00 Scale",
        minAttendance: "75",
        passingMarks: "50",
        notifyLowAttendance: true,
        notifyHighAchievers: true,
        autoBackup: true
      };
    } catch {
      return {
        instituteName: "Riphah International University",
        campusBranch: "Faisalabad campus",
        academicTerm: "Fall 2026",
        gradingScale: "4.00 Scale",
        minAttendance: "75",
        passingMarks: "50",
        notifyLowAttendance: true,
        notifyHighAchievers: true,
        autoBackup: true
      };
    }
  });

  // Help FAQ state
  const [faqOpen, setFaqOpen] = useState({ 0: true });
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagResult, setDiagResult] = useState(null);
  const [ticket, setTicket] = useState({ subject: "", category: "General Inquiry", message: "" });
  const searchInputRef = useRef(null);

  const notify = (message, type = "success") => {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 3200);
  };

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (statusFilter !== "All statuses") params.set("status", statusFilter);
      if (degreeFilter !== "All programs") params.set("degree", degreeFilter);
      const response = await fetch(`/api/students?${params}`);
      if (!response.ok) throw new Error("Could not load student records.");
      setStudents((await response.json()).data || []);
    } catch (error) {
      notify(`${error.message} Check that the API is running.`, "error");
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter, degreeFilter]);

  useEffect(() => {
    const timer = window.setTimeout(loadStudents, 180);
    return () => window.clearTimeout(timer);
  }, [loadStudents]);

  // Global keyboard shortcut: Ctrl+K or Cmd+K focuses search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setActiveTab("students");
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter(s => s.status === "Active").length;
    const inactive = students.filter(s => s.status === "Inactive").length;
    const graduated = students.filter(s => s.status === "Graduated").length;
    const average = total ? (students.reduce((sum, s) => sum + Number(s.gpa), 0) / total).toFixed(2) : "0.00";
    const attendance = total ? Math.round(students.reduce((sum, s) => sum + Number(s.attendancePercentage ?? 0), 0) / total) : 0;
    const averageMarks = total ? (students.reduce((sum, s) => sum + Number(s.marks ?? 0), 0) / total).toFixed(1) : "0.0";
    const lowAttendance = students.filter(s => Number(s.attendancePercentage ?? 0) < Number(settings.minAttendance || 75));
    const honors = students.filter(s => Number(s.gpa) >= 3.7);
    return { total, active, inactive, graduated, average, attendance, averageMarks, lowAttendance, honors };
  }, [students, settings.minAttendance]);

  // Dynamic notifications based on real data
  const notifications = useMemo(() => {
    const items = [];
    if (stats.lowAttendance.length > 0) {
      items.push({
        id: "notif-low-att",
        type: "warn",
        title: "Attendance Shortage Alert",
        desc: `${stats.lowAttendance.length} student(s) are below the ${settings.minAttendance}% attendance requirement.`,
        time: "Active alert",
        action: () => { setActiveTab("reports"); setShowNotifMenu(false); }
      });
    }
    if (stats.honors.length > 0) {
      items.push({
        id: "notif-honors",
        type: "success",
        title: "Dean's Honor Roll",
        desc: `${stats.honors.length} student(s) achieved an outstanding GPA of 3.70 or higher.`,
        time: "Academic review",
        action: () => { setActiveTab("reports"); setShowNotifMenu(false); }
      });
    }
    items.push({
      id: "notif-sync",
      type: "info",
      title: "API & Database Synced",
      desc: `${students.length} student records are synchronized with CampusDesk API on localhost:5000.`,
      time: "Real-time",
      action: () => { setActiveTab("students"); setShowNotifMenu(false); }
    });
    items.push({
      id: "notif-programs",
      type: "amber",
      title: "Academic Programs",
      desc: `${PROGRAMS.length} active degree programs available for enrollment.`,
      time: "Catalog update",
      action: () => { setActiveTab("programs"); setShowNotifMenu(false); }
    });
    return items;
  }, [stats.lowAttendance, stats.honors, students.length, settings.minAttendance]);

  const unreadCount = notifications.filter(n => !readNotifIds.includes(n.id)).length;

  const markAllNotifsRead = () => {
    setReadNotifIds(notifications.map(n => n.id));
    notify("All notifications marked as read.");
  };

  const addStudent = () => {
    setForm(EMPTY);
    setModal({ type: "add" });
  };

  const editStudent = s => {
    setForm({
      name: s.name,
      email: s.email,
      degree: s.degree,
      semester: String(s.semester),
      gpa: String(s.gpa),
      status: s.status,
      classesAttended: String(s.classesAttended ?? 0),
      totalClasses: String(s.totalClasses ?? 0),
      marks: String(s.marks ?? 0)
    });
    setModal({ type: "edit", student: s });
  };

  async function saveStudent(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const editing = modal.type === "edit";
      const response = await fetch(editing ? `/api/students/${modal.student.id}` : "/api/students", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          semester: Number(form.semester),
          gpa: Number(form.gpa),
          classesAttended: Number(form.classesAttended),
          totalClasses: Number(form.totalClasses),
          marks: Number(form.marks)
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to save student.");
      setModal(null);
      notify(body.message);
      await loadStudents();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeStudent(s) {
    if (!window.confirm(`Delete ${s.name} from the student register?`)) return;
    try {
      const response = await fetch(`/api/students/${s.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Could not delete student.");
      setSelected(old => old.filter(id => id !== s.id));
      notify(body.message);
      await loadStudents();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  function exportCsv() {
    const rows = [
      ["Student ID","Name","Email","Degree","Semester","GPA","Marks","Classes Attended","Total Classes","Attendance %","Status","Created"],
      ...students.map(s => [s.id, s.name, s.email, s.degree, s.semester, s.gpa, s.marks, s.classesAttended, s.totalClasses, s.attendancePercentage, s.status, dateLabel(s.createdAt)])
    ];
    const csv = rows.map(row => row.map(v => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `campusdesk-students-${campus.toLowerCase().replace(/\s+/g,"-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Student register CSV downloaded successfully.");
  }

  // Diagnostics check for Help tab
  async function runDiagnostics() {
    setDiagRunning(true);
    const start = performance.now();
    try {
      const res = await fetch("/api/health");
      const elapsed = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json();
        setDiagResult({ ok: true, elapsed, service: data.service, timestamp: data.timestamp });
        notify(`Diagnostics passed (${elapsed}ms)`);
      } else {
        throw new Error("API returned non-200 code");
      }
    } catch (e) {
      setDiagResult({ ok: false, error: e.message });
      notify("Diagnostics failed: API error", "error");
    } finally {
      setDiagRunning(false);
    }
  }

  function saveSettings(e) {
    e.preventDefault();
    try {
      localStorage.setItem("campusdesk_settings", JSON.stringify(settings));
      notify("Settings saved successfully.");
    } catch {
      notify("Settings saved for this session.");
    }
  }

  function submitSupportTicket(e) {
    e.preventDefault();
    if (!ticket.subject.trim() || !ticket.message.trim()) {
      notify("Please fill in subject and message.", "error");
      return;
    }
    notify(`Support ticket #${Math.floor(1000 + Math.random() * 9000)} logged successfully!`);
    setTicket({ subject: "", category: "General Inquiry", message: "" });
  }

  const allSelected = students.length > 0 && students.every(s => selected.includes(s.id));

  // Compute breakdown for each degree program
  const programMetrics = useMemo(() => {
    return PROGRAMS.map(prog => {
      const proStudents = students.filter(s => s.degree === prog);
      const count = proStudents.length;
      const avgGpa = count ? (proStudents.reduce((sum, s) => sum + Number(s.gpa), 0) / count).toFixed(2) : "0.00";
      const avgAtt = count ? Math.round(proStudents.reduce((sum, s) => sum + Number(s.attendancePercentage ?? 0), 0) / count) : 0;
      const topStudent = count ? [...proStudents].sort((a,b) => Number(b.gpa) - Number(a.gpa))[0] : null;
      return { program: prog, count, avgGpa, avgAtt, topStudent };
    });
  }, [students]);

  return (
    <div className="app-shell" onClick={() => {
      // Close dropdowns on outside click
      if (showNotifMenu) setShowNotifMenu(false);
      if (showCampusMenu) setShowCampusMenu(false);
      if (showProfileMenu) setShowProfileMenu(false);
    }}>
      {/* SIDEBAR NAVIGATION */}
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`} onClick={e => e.stopPropagation()}>
        <div className="brand-lockup">
          <div className="brand-mark"><GraduationCap size={23}/></div>
          <div>
            <div className="brand-name">campus<span>desk</span></div>
            <div className="brand-caption">STUDENT WORKSPACE</div>
          </div>
          <button className="icon-button sidebar-close" onClick={() => setMobileNav(false)} aria-label="Close menu">
            <X size={18}/>
          </button>
        </div>

        {/* Workspace Switcher */}
        <div className="popover-anchor">
          <div className="workspace-switch" onClick={() => setShowCampusMenu(!showCampusMenu)} style={{cursor:"pointer"}}>
            <div className="workspace-icon">RI</div>
            <div className="workspace-copy">
              <strong>{settings.instituteName.split(" ")[0]} Institute</strong>
              <span>{campus}</span>
            </div>
            <ChevronDown size={16} className="muted-icon"/>
          </div>

          {showCampusMenu && (
            <div className="popover-menu workspace-popover">
              <div style={{padding:"8px 12px",fontSize:"10px",color:"#94a3b8",fontWeight:700,letterSpacing:"1px"}}>SWITCH CAMPUS</div>
              {CAMPUSES.map(c => (
                <button
                  key={c}
                  className={`popover-item ${campus === c ? "active" : ""}`}
                  onClick={() => {
                    setCampus(c);
                    setShowCampusMenu(false);
                    notify(`Switched workspace to ${c}`);
                  }}
                >
                  <GraduationCap size={14}/> {c}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav">
          <button
            className={`nav-item ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => { setActiveTab("overview"); setMobileNav(false); }}
          >
            <LayoutDashboard size={18}/> Overview
          </button>
          <button
            className={`nav-item ${activeTab === "students" ? "active" : ""}`}
            onClick={() => { setActiveTab("students"); setMobileNav(false); }}
          >
            <Users size={18}/> Students
            <span className="nav-count">{students.length}</span>
          </button>
          <button
            className={`nav-item ${activeTab === "programs" ? "active" : ""}`}
            onClick={() => { setActiveTab("programs"); setMobileNav(false); }}
          >
            <BookOpen size={18}/> Programs
            <span className="nav-count">{PROGRAMS.length}</span>
          </button>
          <button
            className={`nav-item ${activeTab === "reports" ? "active" : ""}`}
            onClick={() => { setActiveTab("reports"); setMobileNav(false); }}
          >
            <Activity size={18}/> Reports
            {stats.lowAttendance.length > 0 && <span className="nav-count" style={{background:"#ef4444",color:"#fff"}}>{stats.lowAttendance.length}</span>}
          </button>
        </nav>

        <div className="nav-label manage-label">MANAGE</div>
        <nav className="main-nav">
          <button
            className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => { setActiveTab("settings"); setMobileNav(false); }}
          >
            <Settings2 size={18}/> Settings
          </button>
          <button
            className={`nav-item ${activeTab === "help" ? "active" : ""}`}
            onClick={() => { setActiveTab("help"); setMobileNav(false); }}
          >
            <CircleHelp size={18}/> Help & support
          </button>
        </nav>

        <div className="sidebar-spacer"/>
        <div className="upgrade-card">
          <div className="upgrade-icon"><Sparkles size={18}/></div>
          <strong>Keep campus in sync</strong>
          <p>Manage student records, programs & reports in one organized place.</p>
          <button onClick={addStudent}>Add a student <ArrowUpRight size={14}/></button>
        </div>

        <div className="profile-row" style={{cursor:"pointer"}} onClick={() => setShowProfileMenu(!showProfileMenu)}>
          <div className="profile-avatar">CA</div>
          <div className="profile-copy">
            <strong>Campus Admin</strong>
            <span>Administrator</span>
          </div>
          <MoreHorizontal size={19} className="muted-icon"/>
        </div>
      </aside>

      {mobileNav && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>}

      {/* MAIN VIEW PANEL */}
      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumb">
            <button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Open menu">
              <Menu size={20}/>
            </button>
            <span>Workspace</span>
            <span className="crumb-slash">/</span>
            <strong>
              {activeTab === "overview" && "Campus Overview"}
              {activeTab === "students" && "Students Directory"}
              {activeTab === "programs" && "Academic Programs"}
              {activeTab === "reports" && "Reports & Analytics"}
              {activeTab === "settings" && "Campus Settings"}
              {activeTab === "help" && "Help & Support"}
            </strong>
          </div>

          <div className="topbar-actions" onClick={e => e.stopPropagation()}>
            <div className="system-status">
              <span className="status-dot"/> API connected
            </div>

            {/* Notification Bell Dropdown */}
            <div className="popover-anchor">
              <button
                className="icon-button notification-button"
                aria-label="Notifications"
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                title="Notifications"
              >
                <Bell size={18}/>
                {unreadCount > 0 && <span className="notification-badge-dot">{unreadCount}</span>}
              </button>

              {showNotifMenu && (
                <div className="popover-menu" style={{right:0}}>
                  <div className="popover-head">
                    <h4><Bell size={14}/> Notifications <span className="badge">{unreadCount} new</span></h4>
                    {unreadCount > 0 && <button onClick={markAllNotifsRead}>Mark all read</button>}
                  </div>
                  <div className="notifications-list">
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        className={`notif-item ${readNotifIds.includes(n.id) ? "" : "unread"}`}
                        onClick={n.action}
                      >
                        <div className={`notif-icon ${n.type}`}>
                          {n.type === "warn" && <ShieldAlert size={16}/>}
                          {n.type === "success" && <Award size={16}/>}
                          {n.type === "info" && <Info size={16}/>}
                          {n.type === "amber" && <BookOpen size={16}/>}
                        </div>
                        <div className="notif-body">
                          <div className="notif-title">{n.title}</div>
                          <div className="notif-desc">{n.desc}</div>
                          <div className="notif-time">{n.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="topbar-divider"/>

            {/* Top User Menu Dropdown */}
            <div className="popover-anchor">
              <div
                className="top-user"
                style={{cursor:"pointer"}}
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="profile-avatar small">CA</div>
                <span>Campus Admin</span>
                <ChevronDown size={15}/>
              </div>

              {showProfileMenu && (
                <div className="popover-menu profile-popover">
                  <div className="profile-menu-header">
                    <strong>Campus Administrator</strong>
                    <span>admin@campusdesk.edu</span>
                  </div>
                  <button className="popover-item" onClick={() => { setActiveTab("settings"); setShowProfileMenu(false); }}>
                    <Settings2 size={14}/> Settings & Policy
                  </button>
                  <button className="popover-item" onClick={() => { setActiveTab("help"); setShowProfileMenu(false); }}>
                    <CircleHelp size={14}/> Help & Support
                  </button>
                  <button className="popover-item" onClick={() => { notify("Logged in as Administrator."); setShowProfileMenu(false); }}>
                    <ShieldCheck size={14}/> Role: Admin (Active)
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content-wrap">
          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === "overview" && (
            <div>
              <section className="page-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line"/>CAMPUS INSIGHTS</div>
                  <h1>Campus dashboard<span>.</span></h1>
                  <p className="page-subtitle">Welcome back. Here is the operational summary for {campus}.</p>
                </div>
                <div className="heading-actions">
                  <button className="button button-secondary" onClick={exportCsv}>
                    <ArrowDownToLine size={16}/>Export register
                  </button>
                  <button className="button button-primary" onClick={addStudent}>
                    <Plus size={17}/>Add student
                  </button>
                </div>
              </section>

              {/* High-level KPIs */}
              <section className="stats-grid">
                <StatCard label="Total students" value={stats.total} note="Enrolled in campus" icon={<Users size={18}/>} tone="violet" trend="Directory"/>
                <StatCard label="Active students" value={stats.active} note="In good standing" icon={<Activity size={18}/>} tone="green" trend={`${stats.total ? Math.round(stats.active / stats.total * 100) : 0}% active`}/>
                <StatCard label="Campus attendance" value={`${stats.attendance}%`} note={`Threshold: ${settings.minAttendance}%`} icon={<Check size={18}/>} tone="blue" trend={stats.attendance >= 75 ? "Optimal" : "Attention needed"}/>
                <StatCard label="Average GPA" value={stats.average} note="Across all programs" icon={<Sparkles size={18}/>} tone="amber" trend="4.00 Scale"/>
              </section>

              {/* Quick Actions Bar */}
              <div className="quick-actions-bar">
                <button className="quick-action-btn" onClick={addStudent}>
                  <div className="action-btn-icon" style={{background:"#ede9fe",color:"#6366f1"}}><Plus size={18}/></div>
                  <div className="action-btn-copy">
                    <strong>Enroll New Student</strong>
                    <span>Register into program & batch</span>
                  </div>
                </button>
                <button className="quick-action-btn" onClick={() => setActiveTab("reports")}>
                  <div className="action-btn-icon" style={{background:"#fff1f2",color:"#f43f5e"}}><ShieldAlert size={18}/></div>
                  <div className="action-btn-copy">
                    <strong>Review At-Risk Students</strong>
                    <span>{stats.lowAttendance.length} students with low attendance</span>
                  </div>
                </button>
                <button className="quick-action-btn" onClick={() => setActiveTab("programs")}>
                  <div className="action-btn-icon" style={{background:"#eff6ff",color:"#3b82f6"}}><BookOpen size={18}/></div>
                  <div className="action-btn-copy">
                    <strong>Explore Programs</strong>
                    <span>Browse {PROGRAMS.length} active curricula</span>
                  </div>
                </button>
                <button className="quick-action-btn" onClick={exportCsv}>
                  <div className="action-btn-icon" style={{background:"#ecfdf5",color:"#10b981"}}><Download size={18}/></div>
                  <div className="action-btn-copy">
                    <strong>Download CSV Data</strong>
                    <span>Full student registry spreadsheet</span>
                  </div>
                </button>
              </div>

              {/* Two Column Layout: Programs Distribution & Academic Health */}
              <div className="grid-two-col">
                <div className="dashboard-panel">
                  <div className="panel-header">
                    <div>
                      <h3><BookOpen size={17} style={{color:"#6366f1"}}/> Program Enrollment Distribution</h3>
                      <p>Number of active students enrolled by discipline</p>
                    </div>
                    <button className="panel-view-all" onClick={() => setActiveTab("programs")}>
                      View all <ArrowUpRight size={13}/>
                    </button>
                  </div>
                  <div className="program-bars">
                    {programMetrics.map(p => {
                      const pct = stats.total > 0 ? Math.round((p.count / stats.total) * 100) : 0;
                      return (
                        <div key={p.program} className="program-bar-item">
                          <div className="program-bar-top">
                            <strong>{p.program}</strong>
                            <span><strong>{p.count}</strong> student{p.count === 1 ? "" : "s"} ({pct}%)</span>
                          </div>
                          <div className="program-bar-track">
                            <div className="program-bar-fill" style={{width:`${Math.max(pct, 4)}%`}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="dashboard-panel">
                  <div className="panel-header">
                    <div>
                      <h3><Award size={17} style={{color:"#10b981"}}/> Academic Standing & Attendance</h3>
                      <p>Performance brackets across the student body</p>
                    </div>
                    <button className="panel-view-all" onClick={() => setActiveTab("reports")}>
                      Full report <ArrowUpRight size={13}/>
                    </button>
                  </div>
                  <div className="metric-bar-group">
                    <div className="metric-bar-item">
                      <span className="metric-bar-label">Dean's List (GPA ≥ 3.5)</span>
                      <div className="metric-bar-track">
                        <div style={{height:"100%",background:"#10b981",borderRadius:99,width:`${stats.total ? (students.filter(s=>Number(s.gpa)>=3.5).length / stats.total * 100) : 0}%`}}/>
                      </div>
                      <span className="metric-bar-val">{students.filter(s=>Number(s.gpa)>=3.5).length}</span>
                    </div>
                    <div className="metric-bar-item">
                      <span className="metric-bar-label">Satisfactory (GPA 2.5 - 3.49)</span>
                      <div className="metric-bar-track">
                        <div style={{height:"100%",background:"#3b82f6",borderRadius:99,width:`${stats.total ? (students.filter(s=>Number(s.gpa)>=2.5 && Number(s.gpa)<3.5).length / stats.total * 100) : 0}%`}}/>
                      </div>
                      <span className="metric-bar-val">{students.filter(s=>Number(s.gpa)>=2.5 && Number(s.gpa)<3.5).length}</span>
                    </div>
                    <div className="metric-bar-item">
                      <span className="metric-bar-label">Attendance &gt; 85%</span>
                      <div className="metric-bar-track">
                        <div style={{height:"100%",background:"#6366f1",borderRadius:99,width:`${stats.total ? (students.filter(s=>Number(s.attendancePercentage)>=85).length / stats.total * 100) : 0}%`}}/>
                      </div>
                      <span className="metric-bar-val">{students.filter(s=>Number(s.attendancePercentage)>=85).length}</span>
                    </div>
                    <div className="metric-bar-item">
                      <span className="metric-bar-label">Attendance Warning (&lt; 75%)</span>
                      <div className="metric-bar-track">
                        <div style={{height:"100%",background:"#f43f5e",borderRadius:99,width:`${stats.total ? (stats.lowAttendance.length / stats.total * 100) : 0}%`}}/>
                      </div>
                      <span className="metric-bar-val" style={{color:"#f43f5e"}}>{stats.lowAttendance.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Student Enrollments */}
              <section className="directory-card">
                <div className="directory-head">
                  <div>
                    <div className="section-title">Recent Student Registrations</div>
                    <p className="section-description">Latest student records entered into the system.</p>
                  </div>
                  <button className="button button-secondary" onClick={() => setActiveTab("students")}>
                    Open full directory <ArrowUpRight size={14}/>
                  </button>
                </div>
                <div className="table-scroll">
                  <table className="students-table">
                    <thead>
                      <tr>
                        <th style={{paddingLeft:22}}>STUDENT</th>
                        <th>PROGRAM</th>
                        <th>SEMESTER</th>
                        <th>GPA</th>
                        <th>ATTENDANCE</th>
                        <th>STATUS</th>
                        <th>REGISTERED</th>
                        <th aria-label="Actions"/>
                      </tr>
                    </thead>
                    <tbody>
                      {students.slice(0, 5).map(s => (
                        <tr key={s.id}>
                          <td style={{paddingLeft:22}}>
                            <div className="student-cell">
                              <div className={`student-avatar ${avatarClass(s.name)}`}>{initials(s.name)}</div>
                              <div className="student-details">
                                <strong>{s.name}</strong>
                                <span>{s.email}</span>
                              </div>
                            </div>
                          </td>
                          <td><div className="program-cell"><BookOpen size={14} className="muted-icon"/><span>{s.degree}</span></div></td>
                          <td><span className="semester-label">Semester {s.semester}</span></td>
                          <td><strong>{Number(s.gpa).toFixed(2)}</strong></td>
                          <td><strong>{Number(s.attendancePercentage ?? 0)}%</strong></td>
                          <td><StatusBadge status={s.status}/></td>
                          <td className="date-cell">{dateLabel(s.createdAt)}</td>
                          <td>
                            <button className="icon-button row-action" title="Edit student" onClick={() => editStudent(s)}>
                              <Pencil size={15}/>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: STUDENTS DIRECTORY (MAIN REGISTER) */}
          {activeTab === "students" && (
            <div>
              <section className="page-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line"/>STUDENT DIRECTORY</div>
                  <h1>Student management<span>.</span></h1>
                  <p className="page-subtitle">Keep student records clear, accurate, and up to date.</p>
                </div>
                <div className="heading-actions">
                  <button className="button button-secondary" onClick={exportCsv}>
                    <ArrowDownToLine size={16}/>Export CSV
                  </button>
                  <button className="button button-primary" onClick={addStudent}>
                    <Plus size={17}/>Add student
                  </button>
                </div>
              </section>

              <section className="stats-grid">
                <StatCard label="Total students" value={stats.total} note="In current view" icon={<Users size={18}/>} tone="violet" trend="Directory"/>
                <StatCard label="Active students" value={stats.active} note="Currently enrolled" icon={<Activity size={18}/>} tone="green" trend={`${stats.total ? Math.round(stats.active/stats.total*100) : 0}% of view`}/>
                <StatCard label="Attendance rate" value={`${stats.attendance}%`} note="Average across students" icon={<Check size={18}/>} tone="blue" trend="Auto-calculated"/>
                <StatCard label="Average GPA" value={stats.average} note="Across current view" icon={<Sparkles size={18}/>} tone="amber" trend="Out of 4.00"/>
              </section>

              <section className="directory-card">
                <div className="directory-head">
                  <div>
                    <div className="section-title">
                      All students <span className="count-pill">{students.length}</span>
                    </div>
                    <p className="section-description">Browse, filter, and manage registered student profiles.</p>
                  </div>
                  <div className="live-label"><span className="status-dot"/>Live data</div>
                </div>

                <div className="toolbar">
                  <label className="search-box">
                    <Search size={17}/>
                    <input
                      ref={searchInputRef}
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Search name, email, degree or ID..."
                    />
                    <kbd>⌘ K</kbd>
                  </label>
                  <div className="filter-control">
                    <SlidersHorizontal size={16}/>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status">
                      <option>All statuses</option>
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={14}/>
                  </div>
                  <div className="filter-control degree-filter">
                    <select value={degreeFilter} onChange={e => setDegreeFilter(e.target.value)} aria-label="Filter by program">
                      <option>All programs</option>
                      {PROGRAMS.map(p => <option key={p}>{p}</option>)}
                    </select>
                    <ChevronDown size={14}/>
                  </div>
                </div>

                {selected.length > 0 && (
                  <div className="selection-bar">
                    <span>{selected.length} student{selected.length === 1 ? "" : "s"} selected</span>
                    <button onClick={() => setSelected([])}>Clear selection</button>
                  </div>
                )}

                <div className="table-scroll">
                  <table className="students-table">
                    <thead>
                      <tr>
                        <th className="check-cell">
                          <input
                            type="checkbox"
                            aria-label="Select all visible students"
                            checked={allSelected}
                            onChange={() => setSelected(allSelected ? selected.filter(id => !students.some(s => s.id === id)) : [...new Set([...selected, ...students.map(s => s.id)])])}
                          />
                        </th>
                        <th>STUDENT</th>
                        <th>PROGRAM</th>
                        <th>SEMESTER</th>
                        <th>GPA</th>
                        <th>MARKS</th>
                        <th>ATTENDANCE</th>
                        <th>STATUS</th>
                        <th>ENROLLED</th>
                        <th aria-label="Actions"/>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="10" className="state-cell">
                            <LoaderCircle className="spin" size={22}/>Loading student records...
                          </td>
                        </tr>
                      ) : students.length === 0 ? (
                        <tr>
                          <td colSpan="10" className="state-cell">
                            <div className="empty-state">
                              <div className="empty-icon"><Users size={22}/></div>
                              <strong>No students found</strong>
                              <span>Try changing your search terms or filters.</span>
                              <button className="button button-primary" onClick={addStudent}>
                                <Plus size={16}/>Add student
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        students.map(s => (
                          <tr key={s.id}>
                            <td className="check-cell">
                              <input
                                type="checkbox"
                                aria-label={`Select ${s.name}`}
                                checked={selected.includes(s.id)}
                                onChange={() => setSelected(old => old.includes(s.id) ? old.filter(id => id !== s.id) : [...old, s.id])}
                              />
                            </td>
                            <td>
                              <div className="student-cell">
                                <div className={`student-avatar ${avatarClass(s.name)}`}>{initials(s.name)}</div>
                                <div className="student-details">
                                  <strong>{s.name}</strong>
                                  <span>{s.email}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="program-cell">
                                <span className="program-icon"><BookOpen size={14}/></span>
                                <span>{s.degree}</span>
                              </div>
                            </td>
                            <td><span className="semester-label">Semester {s.semester}</span></td>
                            <td>
                              <div className="gpa-cell">
                                <strong>{Number(s.gpa).toFixed(2)}</strong>
                                <span className="gpa-track"><i style={{width:`${Number(s.gpa)/4*100}%`}}/></span>
                              </div>
                            </td>
                            <td>
                              <span className={`marks-pill ${Number(s.marks)>=80 ? "high" : Number(s.marks)>=50 ? "medium" : "low"}`}>
                                {Number(s.marks ?? 0).toFixed(0)} / 100
                              </span>
                            </td>
                            <td>
                              <div className="attendance-cell">
                                <div className="attendance-value">
                                  <strong>{Number(s.attendancePercentage ?? 0)}%</strong>
                                  <span>{Number(s.classesAttended ?? 0)}/{Number(s.totalClasses ?? 0)} classes</span>
                                </div>
                                <span className="attendance-track">
                                  <i
                                    className={Number(s.attendancePercentage)>=75 ? "good" : Number(s.attendancePercentage)>=50 ? "average" : "poor"}
                                    style={{width:`${Number(s.attendancePercentage ?? 0)}%`}}
                                  />
                                </span>
                              </div>
                            </td>
                            <td><StatusBadge status={s.status}/></td>
                            <td className="date-cell">{dateLabel(s.createdAt)}</td>
                            <td>
                              <div className="row-actions">
                                <button className="icon-button row-action" aria-label={`Edit ${s.name}`} title="Edit student" onClick={() => editStudent(s)}>
                                  <Pencil size={15}/>
                                </button>
                                <button className="icon-button row-action danger-hover" aria-label={`Delete ${s.name}`} title="Delete student" onClick={() => removeStudent(s)}>
                                  <Trash2 size={15}/>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="table-footer">
                  <span>Showing <strong>{students.length}</strong> student{students.length === 1 ? "" : "s"}</span>
                  <span className="footer-note"><ShieldCheck size={14}/>Records are saved by the API</span>
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: ACADEMIC PROGRAMS */}
          {activeTab === "programs" && (
            <div>
              <section className="page-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line"/>DEGREE PROGRAMS</div>
                  <h1>Academic programs<span>.</span></h1>
                  <p className="page-subtitle">Curricula, active enrollment and department performance.</p>
                </div>
                <div className="heading-actions">
                  <button className="button button-primary" onClick={addStudent}>
                    <Plus size={17}/>Enroll student
                  </button>
                </div>
              </section>

              <div className="programs-grid">
                {programMetrics.map(p => (
                  <div key={p.program} className="program-card">
                    <div className="program-card-head">
                      <div>
                        <h3>{p.program}</h3>
                        <p>Undergraduate Degree Program</p>
                      </div>
                      <div className="program-card-badge"><BookOpen size={20}/></div>
                    </div>

                    <div className="program-metrics">
                      <div className="program-metric">
                        <span>Students</span>
                        <strong>{p.count}</strong>
                      </div>
                      <div className="program-metric">
                        <span>Avg GPA</span>
                        <strong>{p.avgGpa}</strong>
                      </div>
                      <div className="program-metric">
                        <span>Attendance</span>
                        <strong>{p.avgAtt}%</strong>
                      </div>
                    </div>

                    {p.topStudent && (
                      <div style={{fontSize:"11px",color:"#475569",marginBottom:"16px",display:"flex",alignItems:"center",gap:"8px"}}>
                        <Award size={15} style={{color:"#d97706",flexShrink:0}}/>
                        <span>Top Student: <strong>{p.topStudent.name}</strong> ({Number(p.topStudent.gpa).toFixed(2)} GPA)</span>
                      </div>
                    )}

                    <div className="program-card-footer">
                      <span>{campus}</span>
                      <button
                        className="button button-secondary"
                        style={{padding:"0 12px",height:"32px",fontSize:"10px"}}
                        onClick={() => {
                          setDegreeFilter(p.program);
                          setActiveTab("students");
                          notify(`Showing students enrolled in ${p.program}`);
                        }}
                      >
                        View students <ArrowUpRight size={13}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: REPORTS & ANALYTICS */}
          {activeTab === "reports" && (
            <div>
              <section className="page-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line"/>ACADEMIC AUDIT</div>
                  <h1>Reports & analytics<span>.</span></h1>
                  <p className="page-subtitle">Track academic standing, attendance compliance, and marks distribution.</p>
                </div>
                <div className="heading-actions">
                  <button className="button button-secondary" onClick={exportCsv}>
                    <Download size={16}/>Download Report (CSV)
                  </button>
                </div>
              </section>

              {/* Reports Stat Cards */}
              <div className="reports-kpis">
                <div className="report-stat-box">
                  <span>Honors / Dean's List</span>
                  <h2 style={{color:"#10b981"}}>{stats.honors.length}</h2>
                  <p>GPA ≥ 3.70</p>
                </div>
                <div className="report-stat-box">
                  <span>Attendance Shortage</span>
                  <h2 style={{color:"#f43f5e"}}>{stats.lowAttendance.length}</h2>
                  <p>Below {settings.minAttendance}% threshold</p>
                </div>
                <div className="report-stat-box">
                  <span>Campus Avg Marks</span>
                  <h2 style={{color:"#6366f1"}}>{stats.averageMarks}</h2>
                  <p>Out of 100 maximum</p>
                </div>
                <div className="report-stat-box">
                  <span>Inactive / On Leave</span>
                  <h2 style={{color:"#94a3b8"}}>{stats.inactive}</h2>
                  <p>Status Inactive</p>
                </div>
              </div>

              {/* Attention List Table: Low attendance / low GPA */}
              <section className="directory-card" style={{marginBottom:24}}>
                <div className="directory-head">
                  <div>
                    <div className="section-title">
                      <CircleAlert size={18} style={{color:"#f43f5e"}}/> Students Requiring Attention ({stats.lowAttendance.length})
                    </div>
                    <p className="section-description">Students whose attendance has dropped below the minimum {settings.minAttendance}% threshold.</p>
                  </div>
                  <button className="button button-secondary" onClick={exportCsv}>
                    Export List
                  </button>
                </div>

                <div className="table-scroll">
                  <table className="students-table">
                    <thead>
                      <tr>
                        <th style={{paddingLeft:22}}>STUDENT</th>
                        <th>PROGRAM</th>
                        <th>ATTENDANCE</th>
                        <th>CLASSES ATTENDED</th>
                        <th>GPA</th>
                        <th>STATUS</th>
                        <th aria-label="Action"/>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.lowAttendance.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="state-cell" style={{color:"#10b981"}}>
                            <CircleCheck size={24} style={{margin:"0 auto 8px",display:"block"}}/>
                            Great news! All enrolled students currently meet the minimum {settings.minAttendance}% attendance requirement.
                          </td>
                        </tr>
                      ) : (
                        stats.lowAttendance.map(s => (
                          <tr key={s.id}>
                            <td style={{paddingLeft:22}}>
                              <div className="student-cell">
                                <div className={`student-avatar ${avatarClass(s.name)}`}>{initials(s.name)}</div>
                                <div className="student-details">
                                  <strong>{s.name}</strong>
                                  <span>{s.email}</span>
                                </div>
                              </div>
                            </td>
                            <td><span className="program-cell">{s.degree}</span></td>
                            <td>
                              <span style={{color:"#f43f5e",fontWeight:700}}>
                                {Number(s.attendancePercentage ?? 0)}% (Shortage)
                              </span>
                            </td>
                            <td>{s.classesAttended} / {s.totalClasses} classes</td>
                            <td><strong>{Number(s.gpa).toFixed(2)}</strong></td>
                            <td><StatusBadge status={s.status}/></td>
                            <td>
                              <button className="button button-secondary" style={{height:30,padding:"0 10px",fontSize:10}} onClick={() => editStudent(s)}>
                                Update record
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* TAB 5: CAMPUS SETTINGS */}
          {activeTab === "settings" && (
            <div className="settings-container">
              <section className="page-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line"/>CONFIGURATION</div>
                  <h1>Campus settings<span>.</span></h1>
                  <p className="page-subtitle">Configure academic rules, attendance thresholds, and notification alerts.</p>
                </div>
              </section>

              <form onSubmit={saveSettings} className="settings-card">
                <div className="settings-card-header">
                  <h3>Institution & Campus Profile</h3>
                  <p>General identification details displayed across headers and exported reports.</p>
                </div>

                <div className="settings-fields">
                  <label className="field">
                    <span>Institution Name</span>
                    <input
                      value={settings.instituteName}
                      onChange={e => setSettings({ ...settings, instituteName: e.target.value })}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Campus Branch</span>
                    <select
                      value={campus}
                      onChange={e => {
                        setCampus(e.target.value);
                        setSettings({ ...settings, campusBranch: e.target.value });
                      }}
                    >
                      {CAMPUSES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Academic Term / Session</span>
                    <input
                      value={settings.academicTerm}
                      onChange={e => setSettings({ ...settings, academicTerm: e.target.value })}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Grading System</span>
                    <input
                      value={settings.gradingScale}
                      onChange={e => setSettings({ ...settings, gradingScale: e.target.value })}
                      required
                    />
                  </label>
                </div>

                <div className="settings-card-header" style={{marginTop:24}}>
                  <h3>Academic Policy & Thresholds</h3>
                  <p>Rules that determine student attendance warnings and passing marks.</p>
                </div>

                <div className="settings-fields">
                  <label className="field">
                    <span>Minimum Attendance Required (%)</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={settings.minAttendance}
                      onChange={e => setSettings({ ...settings, minAttendance: e.target.value })}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Minimum Passing Marks (out of 100)</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={settings.passingMarks}
                      onChange={e => setSettings({ ...settings, passingMarks: e.target.value })}
                      required
                    />
                  </label>
                </div>

                <div className="settings-card-header" style={{marginTop:24}}>
                  <h3>Notification Preferences</h3>
                  <p>Choose which automated alerts are flagged on the notification panel.</p>
                </div>

                <div>
                  <div className="toggle-row">
                    <div className="toggle-info">
                      <strong>Low Attendance Warnings</strong>
                      <span>Alert administrators when students fall below {settings.minAttendance}% attendance</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.notifyLowAttendance}
                        onChange={e => setSettings({ ...settings, notifyLowAttendance: e.target.checked })}
                      />
                      <span className="toggle-slider"/>
                    </label>
                  </div>

                  <div className="toggle-row">
                    <div className="toggle-info">
                      <strong>Dean's Honor Roll Alerts</strong>
                      <span>Highlight high academic achievers with GPA ≥ 3.70</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.notifyHighAchievers}
                        onChange={e => setSettings({ ...settings, notifyHighAchievers: e.target.checked })}
                      />
                      <span className="toggle-slider"/>
                    </label>
                  </div>

                  <div className="toggle-row">
                    <div className="toggle-info">
                      <strong>API Auto-Synchronization</strong>
                      <span>Keep student JSON database synced automatically</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.autoBackup}
                        onChange={e => setSettings({ ...settings, autoBackup: e.target.checked })}
                      />
                      <span className="toggle-slider"/>
                    </label>
                  </div>
                </div>

                <div style={{marginTop:24,display:"flex",justifyContent:"flex-end"}}>
                  <button type="submit" className="button button-primary">
                    <Check size={16}/> Save Settings
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 6: HELP & SUPPORT */}
          {activeTab === "help" && (
            <div className="help-container">
              <section className="page-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line"/>KNOWLEDGE BASE</div>
                  <h1>Help & support<span>.</span></h1>
                  <p className="page-subtitle">Guides, troubleshooting, system health diagnostics, and help desk contact.</p>
                </div>
              </section>

              {/* System Diagnostics Box */}
              <div className="dashboard-panel">
                <div className="panel-header">
                  <div>
                    <h3><ShieldCheck size={17} style={{color:"#10b981"}}/> System Diagnostics & Health</h3>
                    <p>Live verification of CampusDesk API and backend JSON database connectivity</p>
                  </div>
                  <button className="button button-secondary" disabled={diagRunning} onClick={runDiagnostics}>
                    <RefreshCw size={14} className={diagRunning ? "spin" : ""}/>
                    {diagRunning ? "Testing..." : "Run Test"}
                  </button>
                </div>

                <div className="system-diag">
                  <div className="diag-row">
                    <strong>API Server Endpoint</strong>
                    <span>http://localhost:5000/api/health</span>
                  </div>
                  <div className="diag-row">
                    <strong>Frontend Vite Server</strong>
                    <span>http://localhost:5173/</span>
                  </div>
                  <div className="diag-row">
                    <strong>Database Storage Path</strong>
                    <span>server/data/students.json</span>
                  </div>
                  <div className="diag-row">
                    <strong>Total Registered Students</strong>
                    <span>{students.length} records loaded</span>
                  </div>
                  {diagResult && (
                    <div className="diag-row" style={{color: diagResult.ok ? "#10b981" : "#f43f5e",fontWeight:700}}>
                      <strong>Last Diagnostic Result</strong>
                      <span>{diagResult.ok ? `Connected successfully (${diagResult.elapsed}ms latency)` : `Error: ${diagResult.error}`}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* FAQ Accordion */}
              <div className="dashboard-panel">
                <div className="panel-header">
                  <div>
                    <h3><CircleHelp size={17} style={{color:"#6366f1"}}/> Frequently Asked Questions</h3>
                    <p>Common questions regarding student registry and calculation formulas</p>
                  </div>
                </div>

                <div className="faq-list">
                  {[
                    {
                      q: "How is student attendance percentage computed?",
                      a: "Attendance is calculated automatically as: (Classes Attended ÷ Total Classes) × 100. It updates immediately whenever you add or edit a student record."
                    },
                    {
                      q: "How do I filter students by program or enrollment status?",
                      a: "Go to the Students tab. Use the program dropdown (e.g. BS Software Engineering) or status filter (Active, Inactive, Graduated) to narrow down the table in real-time."
                    },
                    {
                      q: "What do the marks and attendance colored indicators mean?",
                      a: "For Marks: Green (≥ 80 High), Yellow (50-79 Average), Red (< 50 Low). For Attendance: Green (≥ 75% Good), Yellow (50-74% Average), Red (< 50% Critical)."
                    },
                    {
                      q: "Can I export data for reporting or backup?",
                      a: "Yes! Click the 'Export CSV' button on either the Overview, Students, or Reports tab to download a clean, structured CSV spreadsheet with all student attributes."
                    }
                  ].map((faq, idx) => (
                    <div key={idx} className="faq-item">
                      <button
                        className="faq-question"
                        onClick={() => setFaqOpen({ ...faqOpen, [idx]: !faqOpen[idx] })}
                      >
                        <span>{faq.q}</span>
                        <ChevronDown size={16} style={{transform: faqOpen[idx] ? "rotate(180deg)" : "rotate(0deg)", transition:"transform .2s"}}/>
                      </button>
                      {faqOpen[idx] && <div className="faq-answer">{faq.a}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Campus Desk Form */}
              <div className="dashboard-panel">
                <div className="panel-header">
                  <div>
                    <h3><Mail size={17} style={{color:"#3b82f6"}}/> Contact Campus Tech Desk</h3>
                    <p>Have an issue or need assistance with your campus workspace?</p>
                  </div>
                </div>

                <form onSubmit={submitSupportTicket} style={{display:"flex",flexDirection:"column",gap:14}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                    <label className="field">
                      <span>Subject</span>
                      <input
                        placeholder="e.g. Need assistance with CSV export"
                        value={ticket.subject}
                        onChange={e => setTicket({ ...ticket, subject: e.target.value })}
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Category</span>
                      <select
                        value={ticket.category}
                        onChange={e => setTicket({ ...ticket, category: e.target.value })}
                      >
                        <option>General Inquiry</option>
                        <option>Student Record Issue</option>
                        <option>Attendance Discrepancy</option>
                        <option>Technical Bug</option>
                      </select>
                    </label>
                  </div>

                  <label className="field">
                    <span>Message</span>
                    <textarea
                      rows={3}
                      placeholder="Describe what you need help with..."
                      style={{borderRadius:8,border:"1px solid #e0e5ed",padding:10,fontFamily:"inherit",fontSize:11,outline:"none"}}
                      value={ticket.message}
                      onChange={e => setTicket({ ...ticket, message: e.target.value })}
                      required
                    />
                  </label>

                  <div style={{display:"flex",justifyContent:"flex-end"}}>
                    <button type="submit" className="button button-primary">
                      <Check size={16}/> Submit Request
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* PAGE FOOTER */}
          <footer className="page-footer">
            <span>© 2026 CampusDesk • {settings.instituteName}</span>
            <span><i className="footer-dot"/>All systems operational</span>
            <span>{campus} • Term: {settings.academicTerm}</span>
          </footer>
        </div>
      </main>

      {/* TOAST NOTIFICATION */}
      {notice && (
        <div className={`toast ${notice.type}`} role="status">
          {notice.type === "success" ? <Check size={17}/> : <CircleHelp size={17}/>}
          {notice.message}
          <button onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={15}/></button>
        </div>
      )}

      {/* ADD / EDIT STUDENT MODAL */}
      {modal && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <form className="student-modal" onSubmit={saveStudent}>
            <div className="modal-header">
              <div>
                <div className="modal-icon"><GraduationCap size={21}/></div>
                <h2>{modal.type === "edit" ? "Edit student" : "Add a student"}</h2>
                <p>{modal.type === "edit" ? "Update this student's profile information." : "Add a new record to the campus student directory."}</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setModal(null)} aria-label="Close dialog">
                <X size={19}/>
              </button>
            </div>

            <div className="form-grid">
              <label className="field full-field">
                <span>Full name <b>*</b></span>
                <input required minLength="2" maxLength="80" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Ayesha Khan"/>
              </label>
              <label className="field full-field">
                <span>Email address <b>*</b></span>
                <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="student@university.edu"/>
              </label>
              <label className="field full-field">
                <span>Degree program <b>*</b></span>
                <select required value={form.degree} onChange={e => setForm({...form, degree: e.target.value})}>
                  {PROGRAMS.map(p => <option key={p}>{p}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Semester <b>*</b></span>
                <input required type="number" min="1" max="12" step="1" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})}/>
              </label>
              <label className="field">
                <span>GPA <b>*</b></span>
                <input required type="number" min="0" max="4" step="0.01" value={form.gpa} onChange={e => setForm({...form, gpa: e.target.value})}/>
              </label>
              <label className="field">
                <span>Marks (out of 100) <b>*</b></span>
                <input required type="number" min="0" max="100" step="0.5" value={form.marks} onChange={e => setForm({...form, marks: e.target.value})}/>
              </label>
              <label className="field">
                <span>Classes attended <b>*</b></span>
                <input required type="number" min="0" max={form.totalClasses || 500} step="1" value={form.classesAttended} onChange={e => setForm({...form, classesAttended: e.target.value})}/>
              </label>
              <label className="field">
                <span>Total classes <b>*</b></span>
                <input required type="number" min="1" max="500" step="1" value={form.totalClasses} onChange={e => setForm({...form, totalClasses: e.target.value})}/>
              </label>
              <p className="attendance-hint full-field">
                Attendance is calculated automatically: classes attended ÷ total classes × 100.
              </p>
              <label className="field full-field">
                <span>Enrollment status <b>*</b></span>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </label>
            </div>

            <div className="modal-footer">
              <span className="required-note"><span>*</span> Required fields</span>
              <div>
                <button type="button" className="button button-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button className="button button-primary" disabled={saving}>
                  {saving ? <LoaderCircle size={16} className="spin"/> : <Check size={16}/>}
                  {saving ? "Saving..." : modal.type === "edit" ? "Save changes" : "Add student"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, note, icon, tone, trend }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${tone}`}>{icon}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-bottom">
        <span>{note}</span>
        <span className={`stat-trend ${tone}`}>{trend}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`status-badge ${(status || "").toLowerCase()}`}>
      <i/>{status}
    </span>
  );
}
