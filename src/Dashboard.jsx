import { useState, useEffect, useMemo, useCallback } from "react";
import { initializeApp } from "firebase/app";

import {
  getFirestore,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

import { doc, query, where, deleteDoc } from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  ComposedChart,
  Area,
} from "recharts";

import { db } from "./firebase";
import "./dashboard.css";

const SAMPLE_TARGET = 120;

const C = {
  orange: "#C0451A",
  orangeL: "#f4ede9",
  teal: "#2E9E6E",
  tealL: "#e8f5f0",
  sky: "#0284c7",
  skyL: "#e0f2fe",
  purple: "#7c3aed",
  purpleL: "#ede9fe",
  amber: "#d97706",
  amberL: "#fef3c7",
  red: "#dc2626",
  redL: "#fee2e2",
  bg: "#f7f8fa",
  surface: "#ffffff",
  border: "#e4e7ec",
  text: "#111827",
  muted: "#6b7280",
  //sidebar: "#1a1f2e",
  sidebar: "#0085dd",
};
const PIE_COLORS = [
  C.orange,
  C.teal,
  C.sky,
  C.purple,
  C.amber,
  C.red,
  "#0891b2",
  "#65a30d",
  "#db2777",
  "#ea580c",
];
const INT_PALETTE = [
  "#C0451A",
  "#2E9E6E",
  "#0284c7",
  "#7c3aed",
  "#d97706",
  "#0891b2",
  "#65a30d",
  "#db2777",
  "#ea580c",
  "#0f766e",
];
import {
  FcTodoList,
  FcReadingEbook,
  FcTreeStructure,
  FcScatterPlot,
  FcBullish,
  FcExpired,
  FcOvertime,
} from "react-icons/fc";

// ── HELPERS ──────────────────────────────────────────────────────────────────
const pct = (n, t) => (t ? ((n / t) * 100).toFixed(1) : "0.0");
const short = (s, m = 18) => (s?.length > m ? s.slice(0, m) + "…" : s || "—");

function countBy(arr, key) {
  const m = {};
  arr.forEach((r) => {
    const v = r[key];
    if (Array.isArray(v))
      v.forEach((x) => {
        m[x] = (m[x] || 0) + 1;
      });
    else if (v != null && v !== "") m[v] = (m[v] || 0) + 1;
  });
  return Object.entries(m)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function durMin(r) {
  if (!r.startedAt || !r.gpsTimestamp) return null;
  const d = Math.round(
    (new Date(r.gpsTimestamp) - new Date(r.startedAt)) / 60000,
  );
  return d > 0 && d < 180 ? d : null;
}
function fmtTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-KE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
  });
}
function fmtDateISO(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function groupByDay(records) {
  const m = {};
  records.forEach((r) => {
    const d = r.startedAt ? fmtDate(r.startedAt) : "Unknown";
    m[d] = (m[d] || 0) + 1;
  });
  let cum = 0;
  return Object.entries(m).map(([date, count]) => {
    cum += count;
    return { date, count, cumulative: cum };
  });
}

function hitRateByDay(records) {
  const m = {};
  records.forEach((r) => {
    const d = r.startedAt ? fmtDate(r.startedAt) : "?";
    const int = r.interviewerName || r.interviewerId || "Unknown";
    if (!m[d]) m[d] = {};
    m[d][int] = (m[d][int] || 0) + 1;
  });
  return Object.entries(m).map(([date, byInt]) => {
    const total = Object.values(byInt).reduce((a, b) => a + b, 0);
    const activePpl = Object.keys(byInt).length;
    return {
      date,
      total,
      activePpl,
      avgPerInt: activePpl ? +(total / activePpl).toFixed(1) : 0,
      ...byInt,
    };
  });
}

  const Depths = {
    INT001: 4,
    INT002: 11,
    INT003: 7,
    INT004: 2,
    INT006: 5,
    INT007: 2,
  };

function interviewerStats(records) {
  const m = {};
  records.forEach((r) => {
    const k = r.interviewerName || r.interviewerId || "Unknown";
    if (!m[k])
      m[k] = {
        name: k,
        id: r.interviewerId || "—",
        count: 0,
        surveyIds: new Set(),
        locations: new Set(),
        durations: [],
        days: new Set(),
        byDay: {},
        wtp: 0,
        disputes: 0,
        depths: Depths[r.interviewerId],
      };
    const e = m[k];
    e.count++;
    if (r.surveyId) e.surveyIds.add(r.surveyId);
    if (r.interviewerLocation) e.locations.add(r.interviewerLocation);
    if (r.respondentTown) e.locations.add(r.respondentTown);
    const d = durMin(r);
    if (d) e.durations.push(d);
    if (r.startedAt) {
      const day = fmtDate(r.startedAt);
      e.days.add(day);
      e.byDay[day] = (e.byDay[day] || 0) + 1;
    }
    if (r.Q13?.startsWith("Yes")) e.wtp++;
    if (r.Q6 && !r.Q6.startsWith("Never")) e.disputes++;
  });
  return Object.values(m)
    .map((v) => {
      const durs = v.durations;
      const avgDur = durs.length
        ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length)
        : null;
      const minDur = durs.length ? Math.min(...durs) : null;
      const maxDur = durs.length ? Math.max(...durs) : null;
      const activeDays = v.days.size;
      const hitRate = activeDays ? +(v.count / activeDays).toFixed(1) : 0;
      const byDayArr = Object.entries(v.byDay).map(([date, cnt]) => ({
        date,
        count: cnt,
      }));
      return {
        ...v,
        surveyIds: [...v.surveyIds].join(", ") || "—",
        locations: [...v.locations].join(", ") || "—",
        avgDur,
        minDur,
        maxDur,
        activeDays,
        hitRate,
        byDayArr,
        wtpRate: v.count ? pct(v.wtp, v.count) : "0.0",
        disputeRate: v.count ? pct(v.disputes, v.count) : "0.0",
      };
    })
    .sort((a, b) => b.count - a.count);
}

// ── TOOLTIP ──────────────────────────────────────────────────────────────────
const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: C.sidebar,
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: "10px 14px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.45)",
          fontFamily: "var(--mono)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {payload.map((p, i) => (
        <div
          key={i}
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: p.color || "#fff",
            fontFamily: "var(--mono)",
          }}
        >
          {p.name !== "value" ? `${p.name}: ` : ""}
          {p.value}
        </div>
      ))}
    </div>
  );
};

// ── STYLES ───────────────────────────────────────────────────────────────────
const styles = `

  /* ── TOPBAR ── */
  .topbar{grid-column:1/-1;background:var(--orange);display:flex;align-items:center;gap:12px;padding:0 24px;position:sticky;top:0;z-index:200}
  .tb-brand{font-size:13px;font-weight:700;color:#fff;flex:1;display:flex;align-items:center;gap:8px}
  .tb-divider{width:1px;height:16px;background:rgba(255,255,255,.25)}
  .tb-sub{font-size:11px;color:rgba(255,255,255,.6)}
  .tb-pill{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);border-radius:4px;padding:3px 9px;font-size:11px;font-weight:600;letter-spacing:.08em;color:#fff;font-family:var(--mono)}
  .tb-pill.green{background:rgba(46,158,110,.35);border-color:rgba(46,158,110,.5);color:#a7f3d0}
  .tb-refresh{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);border-radius:6px;color:#fff;padding:5px 12px;font-size:12px;font-weight:500;cursor:pointer;font-family:var(--font);transition:background .15s}
  .tb-refresh:hover{background:rgba(255,255,255,.22)}



  /* ── SECTION HEAD ── */
  .sec-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
  .sec-title{font-size:14px;font-weight:700;color:var(--text)}
  .sec-sub{font-size:11.5px;color:var(--muted);font-family:var(--mono)}
  .sec-badge{font-size:10.5px;font-weight:600;padding:3px 9px;border-radius:4px;font-family:var(--mono);letter-spacing:.05em}
  .sec-badge.teal{background:var(--tealL);color:var(--teal)}
  .sec-badge.orange{background:var(--orangeL);color:var(--orange)}
  .sec-badge.sky{background:var(--skyL);color:var(--sky)}

  /* ── CHARTS ── */
  .chart-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 10px 20px;
}
.chart-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 3px;
}
.chart-sub {
  font-size: 11.5px;
  color: var(--muted);
  margin-bottom: 14px;
  font-family: var(--mono);
}
.chart-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 13px;
}
.chart-grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 13px;
}



  /* ── SEARCH ── */
  .search-wrap{position:relative;flex:1;min-width:160px}
  .search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--muted);font-size:12px;pointer-events:none}
  .search-inp{width:100%;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:7px 10px 7px 30px;font-family:var(--font);font-size:12.5px;color:var(--text);outline:none}
  .search-inp:focus{border-color:var(--teal);box-shadow:0 0 0 3px rgba(46,158,110,.1)}

  /* ── TABLE ── */
  .tbl-wrap{overflow-x:auto}
  .data-table{width:100%;border-collapse:collapse;font-size:12.5px}
  .data-table th{text-align:left;padding:8px 11px;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--border);font-family:var(--mono);background:#fafafa;white-space:nowrap}
  .data-table td{padding:9px 11px;border-bottom:1px solid var(--border);vertical-align:middle}
  .data-table tr:last-child td{border-bottom:none}
  .data-table tr:hover td{background:#fafcfe}
  .data-table td.mono{font-family:var(--mono);font-size:12px}
  .data-table tr td:last-child {display: flex; gap: 10px;}

  /* ── DELETE BUTTON ── */
  .btn-del{
    display:inline-flex;align-items:center;gap:4px;
    background:var(--redL);border:1px solid rgba(220,38,38,.2);
    border-radius:5px;color:var(--red);padding:4px 9px;
    font-size:11.5px;font-weight:600;cursor:pointer;font-family:var(--font);
    transition:all .15s;white-space:nowrap;
  }
  .btn-del:hover{background:#fecaca;border-color:rgba(220,38,38,.4);}
  .btn-del:disabled{opacity:.45;cursor:not-allowed}

  /* ── BADGE ── */
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:500;font-family:var(--mono);white-space:nowrap}
  .badge.green{background:var(--tealL);color:var(--teal)}
  .badge.orange{background:var(--orangeL);color:var(--orange)}
  .badge.sky{background:var(--skyL);color:var(--sky)}
  .badge.purple{background:var(--purpleL);color:var(--purple)}
  .badge.amber{background:var(--amberL);color:var(--amber)}
  .badge.red{background:var(--redL);color:var(--red)}

  /* ── INTERVIEWER CARDS ── */
  .int-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}
  .int-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:18px;position:relative;overflow:hidden}
  .int-card-header{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px}
  .int-avatar{width:38px;height:38px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;flex-shrink:0;font-family:var(--mono)}
  .int-name{font-size:13.5px;font-weight:700;color:var(--text)}
  .int-id{font-size:11px;font-family:var(--mono);color:var(--muted);margin-top:2px}
  .int-stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
  .int-stat{background:var(--bg);border-radius:7px;padding:9px 10px;text-align:center}
  .int-stat-val{font-size:16px;font-weight:700;font-family:var(--mono);line-height:1}
  .int-stat-lbl{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-top:3px}
  .int-meta{font-size:11.5px;color:var(--muted);line-height:1.6}
  .int-meta span{color:var(--text);font-weight:500}
  .int-progress{margin-top:12px}
  .int-progress-lbl{display:flex;justify-content:space-between;font-size:10.5px;font-family:var(--mono);color:var(--muted);margin-bottom:4px}
  .int-bar-bg{height:5px;background:var(--border);border-radius:100px;overflow:hidden}
  .int-bar-fill{height:100%;border-radius:100px;transition:width .6s ease}

  /* ── RATING BAR ── */
  .rating-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
  .rating-lbl{width:20px;font-size:11.5px;font-weight:600;font-family:var(--mono);text-align:right}
  .rating-bar-bg{flex:1;height:8px;background:var(--border);border-radius:100px;overflow:hidden}
  .rating-bar-fill{height:100%;border-radius:100px;transition:width .5s ease}
  .rating-count{font-size:11px;font-family:var(--mono);color:var(--muted);width:28px;text-align:right}

  /* ── TIMELINE ── */
  .timeline-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)}
  .timeline-row:last-child{border-bottom:none}
  .tl-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
  .tl-name{font-size:12.5px;font-weight:600;flex:1}
  .tl-meta{font-size:11.5px;color:var(--muted);font-family:var(--mono)}

  /* ── MISC ── */
  .loader-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:320px;gap:14px}
  .spinner{width:34px;height:34px;border:3px solid var(--border);border-top-color:var(--orange);border-radius:50%;animation:spin .7s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .loader-text{font-size:13px;color:var(--muted);font-family:var(--mono)}
  .empty{text-align:center;padding:40px;color:var(--muted);font-size:13px}
  .empty-icon{font-size:32px;margin-bottom:8px;opacity:.4}
  .pulse{display:inline-block;width:7px;height:7px;border-radius:50%;background:#4ade80;position:relative}
  .pulse::after{content:'';position:absolute;inset:-3px;border-radius:50%;border:2px solid #4ade80;animation:pr 2s ease-out infinite}
  @keyframes pr{0%{opacity:.7;transform:scale(1)}100%{opacity:0;transform:scale(2.2)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .fade-up{animation:fadeUp .3s ease both}
  .fade-up-2{animation:fadeUp .3s .08s ease both}
  .fade-up-3{animation:fadeUp .3s .16s ease both}

  /* ── CONFIRM OVERLAY ── */
  .confirm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999;display:flex;align-items:center;justify-content:center}
  .confirm-box{background:#fff;border-radius:12px;padding:28px 32px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.2)}
  .confirm-title{font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px}
  .confirm-sub{font-size:13px;color:var(--muted);margin-bottom:20px;line-height:1.5}
  .confirm-btns{display:flex;gap:10px;justify-content:flex-end}
  .confirm-cancel{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font);color:var(--text)}
  .confirm-cancel:hover{background:var(--border)}
  .confirm-delete{background:var(--red);border:none;border-radius:6px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font);color:#fff;transition:opacity .15s}
  .confirm-delete:hover{opacity:.88}
  .confirm-delete:disabled{opacity:.5;cursor:not-allowed}

  @media(max-width:800px){
    .dash{grid-template-columns:1fr}
    .sidebar{display:none}
    .chart-grid-2,.chart-grid-3,.int-grid{grid-template-columns:1fr}
  }
`;

// ── KPI CARD COMPONENT (flat, icon-box design) ────────────────────────────────
const KpiCard = ({ icon, label, value, tint = "ki-teal" }) => (
  <div className={`kpi-card`}>
    <div className={"kpi-icon-box"}>{icon}</div>
    <div className="kpi-body">
      <div className={`kpi-num ${tint}-text`}>{value}</div>
      <div className="kpi-lbl">{label}</div>
    </div>
  </div>
);

//==================  DELETE ===================================================
//==============================================================================

// ── CONFIRM DIALOG ────────────────────────────────────────────────────────────
const ConfirmDelete = ({ record, onConfirm, onCancel, deleting }) => (
  <div className="confirm-overlay" onClick={onCancel}>
    <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
      <div className="confirm-title">Delete this response?</div>
      <div className="confirm-sub">
        <strong>{record.respondentName || "Unknown"}</strong> ·{" "}
        {record.respondentTown || "—"}
        <br />
        Interviewed by {record.interviewerName ||
          record.interviewerId ||
          "—"}{" "}
        on {fmtDate(record.startedAt)}
        <br />
        <br />
        This will permanently delete the document from Firestore and cannot be
        undone.
      </div>
      <div className="confirm-btns">
        <button
          className="confirm-cancel"
          onClick={onCancel}
          disabled={deleting}
        >
          Cancel
        </button>
        <button
          className="confirm-delete"
          onClick={onConfirm}
          disabled={deleting}
        >
          {deleting ? "Deleting…" : "Yes, Delete"}
        </button>
      </div>
    </div>
  </div>
);

//==================  DELETE ===================================================
//==============================================================================

// ─── COLOR PALETTE ──────────────────────────────────────────────────────────────
const PALETTE = {
  teal: ["#1D9E75", "#5DCAA5", "#9FE1CB", "#E1F5EE"],
  blue: ["#185FA5", "#378ADD", "#85B7EB", "#E6F1FB"],
  amber: ["#BA7517", "#EF9F27", "#FAC775", "#FAEEDA"],
  coral: ["#993C1D", "#D85A30", "#F0997B", "#FAECE7"],
  purple: ["#534AB7", "#7F77DD", "#AFA9EC", "#EEEDFE"],
  green: ["#3B6D11", "#639922", "#97C459", "#EAF3DE"],
};
function Badge({ children, color = "#1D9E75", bg = "#E1F5EE" }) {
  return (
    <span
      style={{
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: 6,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Survey_Dashboard() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSec, setActiveSec] = useState("overview");
  const [selectedInt, setSelectedInt] = useState(null);

  // view state
  const [viewrecord, setViewrecord] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  // delete state
  const [pendingDel, setPendingDel] = useState(null); // record to delete
  const [deleting, setDeleting] = useState(false);

  // global filters
  const [gInterviewer, setGInterviewer] = useState("all");
  const [gSurveyId, setGSurveyId] = useState("all");
  const [gLocation, setGLocation] = useState("all");

  // raw-data filters
  const [rSearch, setRSearch] = useState("");
  const [rDateFrom, setRDateFrom] = useState("");
  const [rDateTo, setRDateTo] = useState("");
  const [rSubmitted, setRSubmitted] = useState("all");

  // ── FETCH ──
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(collection(db, "AnswersDB"));
      //setRecords(JSON.parse(localStorage.getItem("AnswersDB")));
      setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);

  // ── DELETE ──
  const handleDeleteConfirm = async () => {
    if (!pendingDel) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "AnswersDB", pendingDel.id));
      setRecords((prev) => prev.filter((r) => r.id !== pendingDel.id));
      setPendingDel(null);
    } catch (e) {
      alert("Delete failed: " + e.message);
    } finally {
      setDeleting(false);
    }
  };

  // ── VIEW RECORD ──
  const handleViewRecord = (R) => {
    if (!R) return;
    setViewrecord(R);
    setIsOpen(true);
  };

  // ── OPTION LISTS ──
  const allInterviewers = useMemo(
    () =>
      [
        ...new Set(records.map((r) => r.interviewerName).filter(Boolean)),
      ].sort(),
    [records],
  );
  const allSurveyIds = useMemo(
    () => [...new Set(records.map((r) => r.surveyId).filter(Boolean))].sort(),
    [records],
  );
  const allLocations = useMemo(
    () =>
      [
        ...new Set(
          records
            .flatMap((r) => [r.interviewerLocation, r.respondentTown])
            .filter(Boolean),
        ),
      ].sort(),
    [records],
  );

  // ── GLOBAL FILTERED ──
  const filtered = useMemo(
    () =>
      records.filter((r) => {
        if (gInterviewer !== "all" && r.interviewerName !== gInterviewer)
          return false;
        if (gSurveyId !== "all" && r.surveyId !== gSurveyId) return false;
        if (
          gLocation !== "all" &&
          r.interviewerLocation !== gLocation &&
          r.respondentTown !== gLocation
        )
          return false;
        return true;
      }),

    [records, gInterviewer, gSurveyId, gLocation],
  );

  // ── RAW FILTERED ──
  const rawFiltered = useMemo(
    () =>
      filtered.filter((r) => {
        if (rSubmitted !== "all") {
          if (rSubmitted === "yes" && !r.submitted) return false;
          if (rSubmitted === "no" && r.submitted) return false;
        }
        if (rDateFrom) {
          const d = fmtDateISO(r.startedAt);
          if (!d || d < rDateFrom) return false;
        }
        if (rDateTo) {
          const d = fmtDateISO(r.startedAt);
          if (!d || d > rDateTo) return false;
        }
        if (rSearch) {
          const q = rSearch.toLowerCase();
          return [
            r.respondentName,
            r.interviewerName,
            r.respondentTown,
            r.respondentLocation,
            r.interviewerId,
            r.surveyId,
          ].some((v) => v?.toLowerCase().includes(q));
        }
        return true;
      }),
    [filtered, rSearch, rDateFrom, rDateTo, rSubmitted],
  );

  // ── COMPUTED ──
  const intStats = useMemo(() => interviewerStats(filtered), [filtered]);
  const byDay = useMemo(() => groupByDay(filtered), [filtered]);
  const hitRate = useMemo(() => hitRateByDay(filtered), [filtered]);
  const totalFiles = filtered.length;
  const completionPct = pct(totalFiles, SAMPLE_TARGET);
  const durations = useMemo(
    () => filtered.map(durMin).filter(Boolean),
    [filtered],
  );
  const avgDuration = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;
  const willPay = useMemo(
    () => filtered.filter((r) => r.Q13?.startsWith("Yes")).length,
    [filtered],
  );
  const hadDispute = useMemo(
    () => filtered.filter((r) => r.Q6 && !r.Q6.startsWith("Never")).length,
    [filtered],
  );
  const noWritten = useMemo(
    () =>
      filtered.filter((r) => r.Q7 === "No, we had no written agreement").length,
    [filtered],
  );

  const q6data = useMemo(() => countBy(filtered, "Q6"), [filtered]);
  const q9data = useMemo(() => {
    const m = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    filtered.forEach((r) => {
      if (r.Q9 >= 1 && r.Q9 <= 5) m[r.Q9]++;
    });
    return m;
  }, [filtered]);
  const q4data = useMemo(() => countBy(filtered, "Q4"), [filtered]);
  const q7data = useMemo(() => countBy(filtered, "Q7"), [filtered]);
  const q8data = useMemo(() => countBy(filtered, "Q8"), [filtered]);
  const q12data = useMemo(() => countBy(filtered, "Q12"), [filtered]);
  const q13data = useMemo(() => countBy(filtered, "Q13"), [filtered]);
  const q14data = useMemo(() => countBy(filtered, "Q14"), [filtered]);
  const q15data = useMemo(() => countBy(filtered, "Q15"), [filtered]);
  const q18data = useMemo(() => countBy(filtered, "Q18"), [filtered]);
  const q19data = useMemo(() => countBy(filtered, "Q19"), [filtered]);
  const q20data = useMemo(() => countBy(filtered, "Q20"), [filtered]);
  const q2data = useMemo(() => countBy(filtered, "Q2"), [filtered]);
  const q3data = useMemo(() => countBy(filtered, "Q3"), [filtered]);
  const q10data = useMemo(() => countBy(filtered, "Q10"), [filtered]);

  const clearRawFilters = () => {
    setRSearch("");
    setRDateFrom("");
    setRDateTo("");
    setRSubmitted("all");
  };
  const hasRawFilter = rSearch || rDateFrom || rDateTo || rSubmitted !== "all";

  const navItems = [
    { id: "overview", icon: "◉", label: "Overview" },
    { id: "collection", icon: "⏱", label: "Data Collection" },
    { id: "interviewers", icon: "👤", label: "Interviewer Stats" },
    { id: "h1", icon: "⚠", label: "H1 — Pain Signal" },
    { id: "h2", icon: "💳", label: "H2 — WTP Signal" },
    { id: "property", icon: "🏠", label: "Property Profile" },
    { id: "responses", icon: "≡", label: "Raw Responses" },
  ];

  // ── CHART WRAPPER — forces remount on section change to fix ResponsiveContainer ──
  // Each section gets a unique key so charts re-initialise when navigating
  const sectionKey = activeSec + (selectedInt?.name || "");

  return (
    <>
      <style>{styles}</style>

      {/* ── DELETE CONFIRM DIALOG ── */}
      {pendingDel && (
        <ConfirmDelete
          record={pendingDel}
          onConfirm={handleDeleteConfirm}
          onCancel={() => !deleting && setPendingDel(null)}
          deleting={deleting}
        />
      )}

      <div className="dash">
        {/* ── TOPBAR ── */}
        <header className="topbar">
          <span className="tb-brand">🎙 AfriqanSky · Analytics</span>
          <div className="tb-divider" />
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "rgba(255,255,255,.55)",
            }}
          >
            <span className="pulse" /> Live
          </span>
          <span className="tb-pill">
            {totalFiles} / {SAMPLE_TARGET}
          </span>
          <span className="tb-pill green">{completionPct}% complete</span>
          <button className="tb-refresh" onClick={fetchData}>
            ↻ Refresh
          </button>
        </header>

        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <span className="sb-label">Global Filter</span>
          <div className="group-select">
            <select
              className="filter-select"
              style={{ width: "100%", fontSize: 12 }}
              value={gInterviewer}
              onChange={(e) => setGInterviewer(e.target.value)}
            >
              <option value="all">All Interviewers</option>
              {allInterviewers.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              style={{ width: "100%", fontSize: 12 }}
              value={gSurveyId}
              onChange={(e) => setGSurveyId(e.target.value)}
            >
              <option value="all">All Survey IDs</option>
              {allSurveyIds.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              style={{ width: "100%", fontSize: 12 }}
              value={gLocation}
              onChange={(e) => setGLocation(e.target.value)}
            >
              <option value="all">All Locations</option>
              {allLocations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            {(gInterviewer !== "all" ||
              gSurveyId !== "all" ||
              gLocation !== "all") && (
              <button
                className="filter-btn clear"
                style={{ width: "100%", fontSize: 11.5 }}
                onClick={() => {
                  setGInterviewer("all");
                  setGSurveyId("all");
                  setGLocation("all");
                }}
              >
                ✕ Clear Filters
              </button>
            )}
          </div>

          <div className="sb-divider" />
          <span className="sb-label">Dashboard</span>
          {navItems.map((n) => (
            <div
              key={n.id}
              className={`sb-item${activeSec === n.id ? " active" : ""}`}
              onClick={() => {
                setActiveSec(n.id);
                setSelectedInt(null);
              }}
            >
              <span className="sb-icon">{n.icon}</span> {n.label}
            </div>
          ))}

          <div className="sb-divider" />
          <div className="sb-progress-wrap">
            <div className="sb-progress-card">
              <div className="spc-label">Sample Progress</div>
              <div className="spc-count">{totalFiles}</div>
              <div className="spc-sub">
                of {SAMPLE_TARGET} target interviews
              </div>
              <div className="spc-bar-bg">
                <div
                  className="spc-bar-fill"
                  style={{
                    width: `${Math.min(100, (totalFiles / SAMPLE_TARGET) * 100)}%`,
                  }}
                />
              </div>
              <div className="spc-nums">
                <span>0</span>
                <span style={{ color: "#0077e6" }}>{completionPct}%</span>
                <span>{SAMPLE_TARGET}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="main">
          {loading ? (
            <div className="loader-wrap">
              <div className="spinner" />
              <div className="loader-text">Fetching survey responses…</div>
            </div>
          ) : error ? (
            <div className="empty">
              <div className="empty-icon">⚠️</div>
              <div
                style={{
                  color: "var(--red)",
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Firebase Error
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
                {error}
              </div>
            </div>
          ) : (
            // KEY forces chart remount when section changes — fixes ResponsiveContainer sizing
            <div key={sectionKey} style={{ display: "contents" }}>
              {/* ══ OVERVIEW ══ */}
              {activeSec === "overview" && (
                <>
                  <div className="kpi-row fade-up">
                    <KpiCard
                      icon={<FcTodoList />}
                      label="Responses"
                      value={totalFiles}
                      tint="ki-orange"
                    />
                    <KpiCard
                      icon={<FcBullish />}
                      label="Sample %"
                      value={`${completionPct}%`}
                      tint="ki-teal"
                    />
                    <KpiCard
                      icon={<FcExpired />}
                      label="Avg Duration"
                      value={`${avgDuration}m`}
                      tint="ki-sky"
                    />
                    <KpiCard
                      icon={<FcReadingEbook />}
                      label="Interviewers"
                      value={intStats.length}
                      tint="ki-purple"
                    />
                    <KpiCard
                      icon={<FcTreeStructure />}
                      label="Towns"
                      value={allLocations.length}
                      tint="ki-amber"
                    />
                    <KpiCard
                      icon={<FcScatterPlot />}
                      label="Remaining"
                      value={Math.max(0, SAMPLE_TARGET - totalFiles)}
                      tint="ki-red"
                    />
                  </div>

                  <div className="fade-up-2">
                    <div className="sec-head">
                      <div>
                        <div className="sec-title">
                          Hypothesis Signal Summary
                        </div>
                        <div className="sec-sub">
                          Key validation metrics — n={totalFiles}
                        </div>
                      </div>
                    </div>
                    <div className="chart-grid-3">
                      {[
                        {
                          l: "Had a tenant dispute",
                          v: hadDispute,
                          color: C.orange,
                          badge: "H1 Signal",
                        },
                        {
                          l: "No written agreement in dispute",
                          v: noWritten,
                          color: C.red,
                          badge: "H1 Root Cause",
                        },
                        {
                          l: "Would pay for digital lease",
                          v: willPay,
                          color: C.teal,
                          badge: "H2 Signal",
                        },
                      ].map((s) => (
                        <div
                          key={s.l}
                          className="chart-card"
                          //style={{ borderTop: `3px solid ${s.color}` }}
                        >
                          <div className="chart-title">{s.l}</div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "baseline",
                              gap: 8,
                              marginTop: 8,
                              marginBottom: 10,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 30,
                                fontWeight: 700,
                                fontFamily: "var(--mono)",
                                color: s.color,
                              }}
                            >
                              {s.v}
                            </span>
                            <span
                              style={{
                                fontSize: 13,
                                color: "var(--muted)",
                                fontFamily: "var(--mono)",
                              }}
                            >
                              / {totalFiles}
                            </span>
                          </div>
                          <div
                            style={{
                              background: "var(--border)",
                              borderRadius: 100,
                              height: 6,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${pct(s.v, totalFiles)}%`,
                                background: s.color,
                                borderRadius: 100,
                                transition: "width .6s",
                              }}
                            />
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginTop: 6,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                fontFamily: "var(--mono)",
                                color: s.color,
                                fontWeight: 600,
                              }}
                            >
                              {pct(s.v, totalFiles)}%
                            </span>
                            <span
                              className="sec-badge"
                              style={{
                                background: `${s.color}18`,
                                color: s.color,
                              }}
                            >
                              {s.badge}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="chart-card fade-up-3">
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--color-text-secondary)",
                        marginBottom: 10,
                      }}
                    >
                      Showing {Math.min(filtered.length, 20)} of{" "}
                      {filtered.length} responses
                    </div>
                    <div
                      style={{
                        background: "var(--color-background-primary)",
                        border: "0.5px solid var(--color-border-tertiary)",
                        borderRadius: 12,
                        overflow: "hidden",
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: 12,
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              background: "var(--color-background-secondary)",
                              borderBottom:
                                "0.5px solid var(--color-border-secondary)",
                            }}
                          >
                            {[
                              "ID",
                              "Survey",
                              "Enumerator",
                              "Town",
                              "Date",
                              "Duration",
                              "Status",
                              "GPS",
                            ].map((h) => (
                              <th
                                key={h}
                                style={{
                                  padding: "9px 10px",
                                  textAlign: "left",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: "var(--color-text-secondary)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.slice(0, 20).map((r, i) => (
                            <tr
                              key={r.id}
                              style={{
                                borderBottom:
                                  "0.5px solid var(--color-border-tertiary)",
                                background:
                                  i % 2 === 0
                                    ? "transparent"
                                    : "var(--color-background-secondary)",
                              }}
                            >
                              <td
                                style={{
                                  padding: "8px 10px",
                                  fontFamily: "monospace",
                                  fontSize: 11,
                                  color: "var(--color-text-secondary)",
                                }}
                              >
                                {r.id}
                              </td>
                              <td
                                style={{
                                  padding: "8px 10px",
                                  maxWidth: 160,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {r.surveyTitle}
                              </td>
                              <td
                                style={{
                                  padding: "8px 10px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {r.interviewerName}
                              </td>
                              <td style={{ padding: "8px 10px" }}>
                                {r.respondentTown}
                              </td>
                              <td
                                style={{
                                  padding: "8px 10px",
                                  whiteSpace: "nowrap",
                                  color: "var(--color-text-secondary)",
                                }}
                              >
                                {fmtDate(r.startedAt)}
                              </td>
                              <td
                                style={{
                                  padding: "8px 10px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {fmtDuration(
                                  r.startedAt,
                                  r.gpsTimestamp || r.submittedAt,
                                )}
                              </td>
                              <td style={{ padding: "8px 10px" }}>
                                <Badge
                                  color={
                                    r.submitted === true ? "#0F6E56" : "#993C1D"
                                  }
                                  bg={
                                    r.submitted === true
                                      ? PALETTE.teal[3]
                                      : PALETTE.coral[3]
                                  }
                                >
                                  {r.submitted === true
                                    ? "Submitted"
                                    : "Pending"}
                                </Badge>
                              </td>
                              <td style={{ padding: "8px 10px" }}>
                                {r.gps ? (
                                  <Badge color="#185FA5" bg={PALETTE.blue[3]}>
                                    📍 Yes
                                  </Badge>
                                ) : (
                                  <span
                                    style={{
                                      color: "var(--color-text-secondary)",
                                    }}
                                  >
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="chart-card fade-up-3">
                    <div className="chart-title">Recent Responses</div>
                    <div className="chart-sub">Latest 10 submissions</div>
                    {[...filtered]
                      .sort(
                        (a, b) => new Date(b.startedAt) - new Date(a.startedAt),
                      )
                      .slice(0, 10)
                      .map((r, i) => (
                        <div key={r.id} className="timeline-row">
                          <div
                            className="tl-dot"
                            style={{
                              background: INT_PALETTE[i % INT_PALETTE.length],
                            }}
                          />
                          <div className="tl-name">
                            {r.respondentName || "Anonymous"}
                          </div>
                          <div className="tl-meta">
                            {r.respondentTown || "—"}
                          </div>
                          <div className="tl-meta" style={{ marginLeft: 8 }}>
                            {r.interviewerName || r.interviewerId || "—"}
                          </div>
                          <div
                            className="tl-meta"
                            style={{ marginLeft: "auto", whiteSpace: "nowrap" }}
                          >
                            {fmtTime(r.startedAt)}
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}

              {/* ══ DATA COLLECTION ══ */}
              {activeSec === "collection" && (
                <>
                  <div className="sec-head">
                    <div>
                      <div className="sec-title">Data Collection Analytics</div>
                      <div className="sec-sub">
                        Submission pace, hit rates, and cumulative progress
                      </div>
                    </div>
                    <span className="sec-badge teal">n = {totalFiles}</span>
                  </div>

                  <div className="kpi-row fade-up">
                    <KpiCard
                      icon="📋"
                      label="Collected"
                      value={totalFiles}
                      tint="ki-orange"
                    />
                    <KpiCard
                      icon="⬜"
                      label="Remaining"
                      value={Math.max(0, SAMPLE_TARGET - totalFiles)}
                      tint="ki-red"
                    />
                    <KpiCard
                      icon="⏱"
                      label="Avg Duration"
                      value={`${avgDuration}m`}
                      tint="ki-teal"
                    />
                    <KpiCard
                      icon="📅"
                      label="Active Days"
                      value={byDay.length}
                      tint="ki-sky"
                    />
                    <KpiCard
                      icon="🏆"
                      label="Best Day"
                      value={
                        byDay.length
                          ? Math.max(...byDay.map((d) => d.count))
                          : 0
                      }
                      tint="ki-purple"
                    />
                    <KpiCard
                      icon="∅"
                      label="Daily Avg"
                      value={
                        byDay.length
                          ? (totalFiles / byDay.length).toFixed(1)
                          : 0
                      }
                      tint="ki-amber"
                    />
                  </div>

                  <div className="chart-card fade-up-2">
                    <div className="chart-title">
                      Cumulative Progress vs Target ({SAMPLE_TARGET})
                    </div>
                    <div className="chart-sub">
                      Running total of interviews collected
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <ComposedChart
                        data={byDay}
                        margin={{ top: 4, right: 16, left: -16, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                          domain={[0, SAMPLE_TARGET]}
                        />
                        <Tooltip content={<CT />} />
                        <Area
                          type="monotone"
                          dataKey="cumulative"
                          fill={`${C.teal}18`}
                          stroke={C.teal}
                          strokeWidth={2}
                          name="Cumulative"
                        />
                        <Bar
                          dataKey="count"
                          fill={C.orange}
                          radius={[3, 3, 0, 0]}
                          opacity={0.7}
                          name="Daily"
                        />
                        <Legend
                          wrapperStyle={{
                            fontSize: 11,
                            fontFamily: "var(--mono)",
                          }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="chart-grid-2 fade-up-3">
                    <div className="chart-card">
                      <div className="chart-title">Hit Rate Per Day</div>
                      <div className="chart-sub">
                        Avg interviews per active interviewer / day
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <ComposedChart
                          data={hitRate}
                          margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f0f0f0"
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                          />
                          <Tooltip content={<CT />} />
                          <Bar
                            dataKey="total"
                            fill={C.sky}
                            radius={[3, 3, 0, 0]}
                            name="Total"
                            opacity={0.7}
                          />
                          <Line
                            type="monotone"
                            dataKey="avgPerInt"
                            stroke={C.orange}
                            strokeWidth={2}
                            dot={{ r: 3, fill: C.orange }}
                            name="Avg/Int"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-card">
                      <div className="chart-title">
                        Active Interviewers Per Day
                      </div>
                      <div className="chart-sub">
                        Field team engagement by date
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          data={hitRate}
                          margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f0f0f0"
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                          />
                          <Tooltip content={<CT />} />
                          <Bar
                            dataKey="activePpl"
                            fill={C.purple}
                            radius={[3, 3, 0, 0]}
                            name="Active Interviewers"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="chart-card fade-up-3">
                    <div className="chart-title">Daily Hit Rate Table</div>
                    <div className="chart-sub">
                      Interviews completed per day
                    </div>
                    <div className="tbl-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Total</th>
                            <th>Active Interviewers</th>
                            <th>Avg / Interviewer</th>
                            <th>
                              vs Target pace ({(SAMPLE_TARGET / 30).toFixed(1)}
                              /day)
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {hitRate.map((row) => {
                            const pace = SAMPLE_TARGET / 30;
                            const ok = row.total >= pace;
                            return (
                              <tr key={row.date}>
                                <td className="mono">{row.date}</td>
                                <td>
                                  <span
                                    className="badge"
                                    style={{
                                      background: C.orangeL,
                                      color: C.orange,
                                    }}
                                  >
                                    {row.total}
                                  </span>
                                </td>
                                <td className="mono">{row.activePpl}</td>
                                <td
                                  className="mono"
                                  style={{ fontWeight: 600, color: C.teal }}
                                >
                                  {row.avgPerInt}
                                </td>
                                <td>
                                  <span
                                    className={`badge ${ok ? "green" : "amber"}`}
                                  >
                                    {ok ? "✓ On pace" : "↓ Below pace"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* ══ INTERVIEWER STATS ══ */}
              {activeSec === "interviewers" && !selectedInt && (
                <>
                  <div className="sec-head">
                    <div>
                      <div className="sec-title">Interviewer Statistics</div>
                      <div className="sec-sub">
                        {intStats.length} active field agents
                      </div>
                    </div>
                    <span className="sec-badge sky">
                      Click a card to drill down
                    </span>
                  </div>

                  <div className="chart-card fade-up">
                    <div className="chart-title">
                      Response Count by Interviewer
                    </div>
                    <div className="chart-sub">
                      Total submissions per field agent vs target share (
                      {Math.round(SAMPLE_TARGET / Math.max(1, intStats.length))}
                      /each)
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={intStats}
                        margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => v.split(" ")[0]}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                        />
                        <Tooltip content={<CT />} />
                        <Bar
                          dataKey="count"
                          radius={[4, 4, 0, 0]}
                          name="Responses"
                        >
                          {intStats.map((_, i) => (
                            <Cell
                              key={i}
                              fill={INT_PALETTE[i % INT_PALETTE.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="chart-grid-2 fade-up-2">
                    <div className="chart-card">
                      <div className="chart-title">
                        Hit Rate per Interviewer
                      </div>
                      <div className="chart-sub">
                        Avg interviews per active day
                      </div>
                      <ResponsiveContainer width="100%" height={190}>
                        <BarChart
                          data={intStats}
                          layout="vertical"
                          margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                        >
                          <XAxis
                            type="number"
                            tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={90}
                            tick={{ fontSize: 10 }}
                            tickFormatter={(v) => v.split(" ")[0]}
                          />
                          <Tooltip content={<CT />} />
                          <Bar
                            dataKey="hitRate"
                            radius={[0, 4, 4, 0]}
                            name="Interviews/Day"
                          >
                            {intStats.map((_, i) => (
                              <Cell
                                key={i}
                                fill={INT_PALETTE[i % INT_PALETTE.length]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-card">
                      <div className="chart-title">Avg Interview Duration</div>
                      <div className="chart-sub">
                        Minutes per session per interviewer
                      </div>
                      <ResponsiveContainer width="100%" height={190}>
                        <BarChart
                          data={intStats.filter((i) => i.avgDur)}
                          layout="vertical"
                          margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                        >
                          <XAxis
                            type="number"
                            tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={90}
                            tick={{ fontSize: 10 }}
                            tickFormatter={(v) => v.split(" ")[0]}
                          />
                          <Tooltip content={<CT />} />
                          <Bar
                            dataKey="avgDur"
                            radius={[0, 4, 4, 0]}
                            fill={C.teal}
                            name="Avg Duration (min)"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="int-grid fade-up-3">
                    {intStats.map((iv, idx) => {
                      const col = INT_PALETTE[idx % INT_PALETTE.length];
                      const share = pct(iv.count, SAMPLE_TARGET);
                      return (
                        <div
                          key={iv.name}
                          className="int-card"
                          style={{
                            cursor: "pointer",
                            borderLeft: `3px solid ${col}`,
                          }}
                          onClick={() => setSelectedInt(iv)}
                        >
                          <div className="int-card-header">
                            <div
                              className="int-avatar"
                              style={{ background: col }}
                            >
                              {iv.name
                                .split(" ")
                                .map((w) => w[0])
                                .slice(0, 2)
                                .join("")}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div className="int-name">{iv.name}</div>
                              <div className="int-id">
                                {iv.id} · {iv.surveyIds}
                              </div>
                            </div>
                            <span className="badge sky">{iv.count}</span>
                          </div>
                          <div className="int-stats-row">
                            <div className="int-stat">
                              <div
                                className="int-stat-val"
                                style={{ color: col }}
                              >
                                {iv.hitRate}
                              </div>
                              <div className="int-stat-lbl">Hit Rate/Day</div>
                            </div>
                            <div className="int-stat">
                              <div
                                className="int-stat-val"
                                style={{ color: C.teal }}
                              >
                                {iv.avgDur != null ? `${iv.avgDur}m` : "—"}
                              </div>
                              <div className="int-stat-lbl">Avg Duration</div>
                            </div>
                            <div className="int-stat">
                              <div
                                className="int-stat-val"
                                style={{ color: C.purple }}
                              >
                                {iv.activeDays}
                              </div>
                              <div className="int-stat-lbl">Active Days</div>
                            </div>
                          </div>
                          <div className="int-meta">
                            <div>
                              WTP:{" "}
                              <span style={{ color: C.teal }}>
                                {iv.wtpRate}%
                              </span>{" "}
                              · Dispute:{" "}
                              <span style={{ color: C.orange }}>
                                {iv.disputeRate}%
                              </span>
                            </div>
                            <div>
                              Locations: <span>{short(iv.locations, 40)}</span>
                            </div>
                            <div>
                              Duration range:{" "}
                              <span>
                                {iv.minDur != null
                                  ? `${iv.minDur}m – ${iv.maxDur}m`
                                  : "—"}
                              </span>
                            </div>
                          </div>
                          <div className="int-progress">
                            <div className="int-progress-lbl">
                              <span>Share of target</span>
                              <span style={{ color: col, fontWeight: 600 }}>
                                {share}%
                              </span>
                            </div>
                            <div className="int-bar-bg">
                              <div
                                className="int-bar-fill"
                                style={{
                                  width: `${Math.min(100, share)}%`,
                                  background: col,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ── Interviewer Summery Table ── */}
                  <div className="chart-card">
                    <div className="chart-title">Interviewer Summary Table</div>
                    <div className="chart-sub">
                      All field agents at a glance
                    </div>
                    <div className="tbl-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>ID</th>
                            <th>Survey IDs</th>
                            <th>Responses</th>
                            <th>Share</th>
                            <th>Hit Rate/Day</th>
                            <th>Active Days</th>
                            <th>Avg Duration</th>
                            <th>WTP %</th>
                            <th>Dispute %</th>
                            <th>Locations</th>
                          </tr>
                        </thead>
                        <tbody>
                          {intStats.map((iv, i) => (
                            <tr
                              key={iv.name}
                              style={{ cursor: "pointer" }}
                              onClick={() => setSelectedInt(iv)}
                            >
                              <td
                                style={{
                                  fontWeight: 600,
                                  color: INT_PALETTE[i % INT_PALETTE.length],
                                }}
                              >
                                {iv.name}
                              </td>
                              <td className="mono">{iv.id}</td>
                              <td>
                                <span className="badge sky">
                                  {iv.surveyIds}
                                </span>
                              </td>
                              <td>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 50,
                                      height: 5,
                                      background: "var(--border)",
                                      borderRadius: 100,
                                      overflow: "hidden",
                                    }}
                                  >
                                    <div
                                      style={{
                                        height: "100%",
                                        width: `${pct(iv.count, SAMPLE_TARGET)}%`,
                                        background:
                                          INT_PALETTE[i % INT_PALETTE.length],
                                        borderRadius: 100,
                                      }}
                                    />
                                  </div>
                                  <span
                                    className="mono"
                                    style={{ fontWeight: 700 }}
                                  >
                                    {iv.count}
                                  </span>
                                </div>
                              </td>
                              <td
                                className="mono"
                                style={{ color: C.orange, fontWeight: 600 }}
                              >
                                {pct(iv.count, SAMPLE_TARGET)}%
                              </td>
                              <td>
                                <span className="badge green">
                                  {iv.hitRate}/day
                                </span>
                              </td>
                              <td className="mono">{iv.activeDays}</td>
                              <td className="mono">
                                {iv.avgDur != null ? `${iv.avgDur}m` : "—"}
                              </td>
                              <td
                                className="mono"
                                style={{ color: C.teal, fontWeight: 600 }}
                              >
                                {iv.wtpRate}%
                              </td>
                              <td className="mono" style={{ color: C.orange }}>
                                {iv.disputeRate}%
                              </td>
                              <td
                                style={{
                                  fontSize: 11.5,
                                  color: "var(--muted)",
                                  maxWidth: 160,
                                }}
                              >
                                {short(iv.locations, 28)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ── Team Payment Table ── */}
                  <div className="chart-card">
                    <div className="chart-title">
                      Interviewer Payment Schedule
                    </div>
                    <div className="chart-sub">
                      All field agents at a glance
                    </div>
                    <div className="tbl-wrap"
                    >
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>ID</th>
                            <th>Phone</th>
                            <th>Structured</th>
                            <th>In-Depths</th>
                            <th>Total Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {intStats.map((iv, i) => (
                            <tr
                              key={iv.name}
                              style={{ cursor: "pointer" }}
                              onClick={() => setSelectedInt(iv)}
                            >
                              <td
                                style={{
                                  fontWeight: 600,
                                  color: INT_PALETTE[i % INT_PALETTE.length],
                                }}
                              >
                                {iv.name}
                              </td>
                              <td className="mono">{iv.id}</td>
                              <td>
                                <span className="badge sky">{iv.name}</span>
                              </td>
                              <td>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                  }}
                                >
                                  <span
                                    className="mono"
                                    style={{ fontWeight: 600 }}
                                  >
                                    {iv.count}
                                  </span>{" "}
                                </div>
                              </td>

                              <td
                                className="mono"
                                style={{ color: C.orange, fontWeight: 600 }}
                              >
                               {iv.depths}
                              </td>

                              <td>
                                <span className="badge green">
                                  Ksh.{(iv.count * 200)+(iv.depths*500)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <thead><tr><th>TOTALS</th> <th></th> </tr></thead>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* ── INTERVIEWER DRILL DOWN ── */}
              {activeSec === "interviewers" && selectedInt && (
                <>
                  <div className="sec-head">
                    <div>
                      <button
                        className="filter-btn"
                        style={{ marginBottom: 8 }}
                        onClick={() => setSelectedInt(null)}
                      >
                        ← Back to All
                      </button>
                      <div className="sec-title">{selectedInt.name}</div>
                      <div className="sec-sub">
                        {selectedInt.id} · {selectedInt.surveyIds} ·{" "}
                        {selectedInt.locations}
                      </div>
                    </div>
                  </div>
                  <div className="kpi-row fade-up">
                    <KpiCard
                      icon="📋"
                      label="Total Responses"
                      value={selectedInt.count}
                      tint="ki-orange"
                    />
                    <KpiCard
                      icon="🎯"
                      label="Hit Rate / Day"
                      value={selectedInt.hitRate}
                      tint="ki-teal"
                    />
                    <KpiCard
                      icon="📅"
                      label="Active Days"
                      value={selectedInt.activeDays}
                      tint="ki-sky"
                    />
                    <KpiCard
                      icon="⏱"
                      label="Avg Duration"
                      value={
                        selectedInt.avgDur != null
                          ? `${selectedInt.avgDur}m`
                          : "—"
                      }
                      tint="ki-purple"
                    />
                    <KpiCard
                      icon="💳"
                      label="WTP Rate"
                      value={`${selectedInt.wtpRate}%`}
                      tint="ki-amber"
                    />
                    <KpiCard
                      icon="⚠"
                      label="Dispute Rate"
                      value={`${selectedInt.disputeRate}%`}
                      tint="ki-red"
                    />
                  </div>
                  <div className="chart-card fade-up-2">
                    <div className="chart-title">Daily Submission Activity</div>
                    <div className="chart-sub">
                      Interviews per day for {selectedInt.name}
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={selectedInt.byDayArr}
                        margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                        />
                        <Tooltip content={<CT />} />
                        <Bar
                          dataKey="count"
                          fill={C.orange}
                          radius={[4, 4, 0, 0]}
                          name="Interviews"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-card fade-up-3">
                    <div className="chart-title">
                      Respondents by {selectedInt.name}
                    </div>
                    <div className="tbl-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Respondent</th>
                            <th>Town</th>
                            <th>Survey</th>
                            <th>Dispute (Q6)</th>
                            <th>WTP (Q13)</th>
                            <th>Severity (Q9)</th>
                            <th>Duration</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered
                            .filter(
                              (r) =>
                                (r.interviewerName || r.interviewerId) ===
                                  selectedInt.name ||
                                (r.interviewerName || r.interviewerId) ===
                                  selectedInt.id,
                            )
                            .map((r) => {
                              const d = durMin(r);
                              const sev = Number(r.Q9);
                              return (
                                <tr key={r.id}>
                                  <td style={{ fontWeight: 600 }}>
                                    {r.respondentName || "—"}
                                  </td>
                                  <td>{r.respondentTown || "—"}</td>
                                  <td>
                                    <span className="badge sky">
                                      {r.surveyId || "—"}
                                    </span>
                                  </td>
                                  <td style={{ fontSize: 11.5 }}>
                                    {short(r.Q6, 20) || "—"}
                                  </td>
                                  <td>
                                    <span
                                      className={`badge ${r.Q13?.startsWith("Yes") ? "green" : r.Q13 === "Maybe" ? "amber" : "orange"}`}
                                    >
                                      {r.Q13 || "—"}
                                    </span>
                                  </td>
                                  <td>
                                    {sev >= 1 && sev <= 5 ? (
                                      <span
                                        className={`badge ${sev >= 4 ? "orange" : sev === 3 ? "amber" : "green"}`}
                                      >
                                        {sev}/5
                                      </span>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                  <td className="mono">
                                    {d != null ? `${d}m` : "—"}
                                  </td>
                                  <td
                                    className="mono"
                                    style={{
                                      color: "var(--muted)",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {fmtDate(r.startedAt)}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* ══ H1 PAIN SIGNAL ══ */}
              {activeSec === "h1" && (
                <>
                  <div className="sec-head">
                    <div>
                      <div className="sec-title">
                        H1 — Documentation Pain Signal
                      </div>
                      <div className="sec-sub">
                        Evidence of rental documentation problems
                      </div>
                    </div>
                    <span className="sec-badge orange">H1 Validation</span>
                  </div>
                  <div className="chart-grid-2 fade-up">
                    <div className="chart-card">
                      <div className="chart-title">
                        Q6 — Tenant Disputes (past 12 months)
                      </div>
                      <div className="chart-sub">Core H1 pain indicator</div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          data={q6data}
                          layout="vertical"
                          margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                        >
                          <XAxis
                            type="number"
                            tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={170}
                            tick={{ fontSize: 10 }}
                            tickFormatter={(v) => short(v, 24)}
                          />
                          <Tooltip content={<CT />} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {q6data.map((_, i) => (
                              <Cell
                                key={i}
                                fill={
                                  [C.red, C.orange, C.amber, C.teal, C.sky][
                                    i
                                  ] || C.orange
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-card">
                      <div className="chart-title">
                        Q9 — Severity Rating (1–5)
                      </div>
                      <div className="chart-sub">
                        How serious is the lack of documentation?
                      </div>
                      {[5, 4, 3, 2, 1].map((score) => {
                        const count = q9data[score] || 0;
                        const bc =
                          score >= 4 ? C.red : score === 3 ? C.amber : C.teal;
                        return (
                          <div key={score} className="rating-row">
                            <div className="rating-lbl">{score}</div>
                            <div className="rating-bar-bg">
                              <div
                                className="rating-bar-fill"
                                style={{
                                  width: `${pct(count, totalFiles)}%`,
                                  background: bc,
                                }}
                              />
                            </div>
                            <div className="rating-count">{count}</div>
                          </div>
                        );
                      })}
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--muted)",
                          marginTop: 8,
                          fontFamily: "var(--mono)",
                        }}
                      >
                        High severity (4–5):{" "}
                        {(q9data[4] || 0) + (q9data[5] || 0)} (
                        {pct((q9data[4] || 0) + (q9data[5] || 0), totalFiles)}%)
                      </div>
                    </div>
                    <div className="chart-card">
                      <div className="chart-title">
                        Q4 — Documents Used at Move-in
                      </div>
                      <div className="chart-sub">
                        Current documentation practices
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          data={q4data}
                          layout="vertical"
                          margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                        >
                          <XAxis
                            type="number"
                            tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={190}
                            tick={{ fontSize: 10 }}
                            tickFormatter={(v) => short(v, 28)}
                          />
                          <Tooltip content={<CT />} />
                          <Bar
                            dataKey="value"
                            fill={C.sky}
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-card">
                      <div className="chart-title">
                        Q7 — Written Agreement During Dispute
                      </div>
                      <div className="chart-sub">
                        Was there a signed agreement in place?
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={q7data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={75}
                            label={({ name, percent }) =>
                              `${short(name, 16)} ${(percent * 100).toFixed(0)}%`
                            }
                            labelLine={false}
                            fontSize={10}
                          >
                            {q7data.map((_, i) => (
                              <Cell
                                key={i}
                                fill={PIE_COLORS[i % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-card">
                      <div className="chart-title">
                        Q8 — Financial Cost of Worst Dispute
                      </div>
                      <div className="chart-sub">KSh value of losses</div>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart
                          data={q8data}
                          margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                        >
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 9, fontFamily: "var(--mono)" }}
                            tickFormatter={(v) => short(v, 14)}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                          />
                          <Tooltip content={<CT />} />
                          <Bar
                            dataKey="value"
                            fill={C.orange}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-card">
                      <div className="chart-title">
                        Q12 — Why No Lawyer Lease?
                      </div>
                      <div className="chart-sub">
                        Barriers to formal documentation
                      </div>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart
                          data={q12data}
                          layout="vertical"
                          margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                        >
                          <XAxis
                            type="number"
                            tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={200}
                            tick={{ fontSize: 10 }}
                            tickFormatter={(v) => short(v, 28)}
                          />
                          <Tooltip content={<CT />} />
                          <Bar
                            dataKey="value"
                            fill={C.purple}
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}

              {/* ══ H2 WTP ══ */}
              {activeSec === "h2" && (
                <>
                  <div className="sec-head">
                    <div>
                      <div className="sec-title">
                        H2 — Willingness to Pay Signal
                      </div>
                      <div className="sec-sub">
                        Digital lease adoption and pricing data
                      </div>
                    </div>
                    <span className="sec-badge teal">H2 Validation</span>
                  </div>
                  <div className="kpi-row fade-up">
                    <KpiCard
                      icon="💳"
                      label="Would Pay (Yes)"
                      value={`${willPay} (${pct(willPay, totalFiles)}%)`}
                      tint="ki-teal"
                    />
                    <KpiCard
                      icon="📱"
                      label="M-Pesa Yes"
                      value={
                        filtered.filter((r) => r.Q19 === "Yes, much easier")
                          .length
                      }
                      tint="ki-orange"
                    />
                  </div>
                  <div className="chart-grid-2 fade-up-2">
                    <div className="chart-card">
                      <div className="chart-title">
                        Q13 — Would You Pay for Digital Lease?
                      </div>
                      <div className="chart-sub">
                        Core H2 willingness signal
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={q13data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                            labelLine={false}
                            fontSize={11}
                          >
                            {q13data.map((_, i) => (
                              <Cell
                                key={i}
                                fill={PIE_COLORS[i % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-card">
                      <div className="chart-title">
                        Q14 — Max Price Per Agreement
                      </div>
                      <div className="chart-sub">Per-use price sensitivity</div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          data={q14data}
                          margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                        >
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 9, fontFamily: "var(--mono)" }}
                            tickFormatter={(v) => short(v, 12)}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                          />
                          <Tooltip content={<CT />} />
                          <Bar
                            dataKey="value"
                            fill={C.teal}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-card">
                      <div className="chart-title">
                        Q15 — Monthly Subscription Price
                      </div>
                      <div className="chart-sub">
                        Subscription model acceptance
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          data={q15data}
                          margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                        >
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 9, fontFamily: "var(--mono)" }}
                            tickFormatter={(v) => short(v, 14)}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                          />
                          <Tooltip content={<CT />} />
                          <Bar
                            dataKey="value"
                            fill={C.orange}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-card">
                      <div className="chart-title">
                        Q18 — Barriers to Adoption
                      </div>
                      <div className="chart-sub">What would stop usage?</div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          data={q18data}
                          layout="vertical"
                          margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                        >
                          <XAxis
                            type="number"
                            tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={180}
                            tick={{ fontSize: 10 }}
                            tickFormatter={(v) => short(v, 26)}
                          />
                          <Tooltip content={<CT />} />
                          <Bar
                            dataKey="value"
                            fill={C.red}
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-card">
                      <div className="chart-title">
                        Q19 — M-Pesa Integration
                      </div>
                      <div className="chart-sub">
                        Would M-Pesa payment make it easier?
                      </div>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={q19data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            label={({ name, percent }) =>
                              `${short(name, 14)} ${(percent * 100).toFixed(0)}%`
                            }
                            labelLine={false}
                            fontSize={10}
                          >
                            {q19data.map((_, i) => (
                              <Cell
                                key={i}
                                fill={PIE_COLORS[i % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-card">
                      <div className="chart-title">
                        Q20 — Most Trusted Provider
                      </div>
                      <div className="chart-sub">
                        Trust hierarchy for digital lease services
                      </div>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart
                          data={q20data}
                          layout="vertical"
                          margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                        >
                          <XAxis
                            type="number"
                            tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={180}
                            tick={{ fontSize: 10 }}
                            tickFormatter={(v) => short(v, 26)}
                          />
                          <Tooltip content={<CT />} />
                          <Bar
                            dataKey="value"
                            fill={C.purple}
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}

              {/* ══ PROPERTY PROFILE ══ */}
              {activeSec === "property" && (
                <>
                  <div className="sec-head">
                    <div>
                      <div className="sec-title">
                        Property & Respondent Profile
                      </div>
                      <div className="sec-sub">
                        Landlord segment characteristics
                      </div>
                    </div>
                  </div>
                  <div className="chart-grid-2 fade-up">
                    <div className="chart-card">
                      <div className="chart-title">
                        Q2 — Number of Rental Units
                      </div>
                      <div className="chart-sub">
                        Portfolio size distribution
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          data={q2data}
                          margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                        >
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                            tickFormatter={(v) => short(v, 12)}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                          />
                          <Tooltip content={<CT />} />
                          <Bar
                            dataKey="value"
                            fill={C.sky}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-card">
                      <div className="chart-title">
                        Q3 — Typical Monthly Rent
                      </div>
                      <div className="chart-sub">Rent range segmentation</div>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={q3data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={75}
                            label={({ name, percent }) =>
                              `${short(name, 14)} ${(percent * 100).toFixed(0)}%`
                            }
                            labelLine={false}
                            fontSize={10}
                          >
                            {q3data.map((_, i) => (
                              <Cell
                                key={i}
                                fill={PIE_COLORS[i % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-card">
                      <div className="chart-title">
                        Q10 — Tenants Leaving Unresolved Disputes / Year
                      </div>
                      <div className="chart-sub">
                        Annual churn from disputes
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          data={q10data}
                          margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                        >
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                            tickFormatter={(v) => short(v, 12)}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                          />
                          <Tooltip content={<CT />} />
                          <Bar
                            dataKey="value"
                            fill={C.amber}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-card">
                      <div className="chart-title">Respondent Locations</div>
                      <div className="chart-sub">
                        Geographic spread of sample
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          data={countBy(filtered, "respondentTown").slice(
                            0,
                            10,
                          )}
                          layout="vertical"
                          margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                        >
                          <XAxis
                            type="number"
                            tick={{ fontSize: 10, fontFamily: "var(--mono)" }}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={100}
                            tick={{ fontSize: 10 }}
                          />
                          <Tooltip content={<CT />} />
                          <Bar
                            dataKey="value"
                            fill={C.teal}
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}

              {/* ══ RAW RESPONSES ══ */}
              {activeSec === "responses" && (
                <>
                  <div className="sec-head">
                    <div>
                      <div className="sec-title">Raw Responses</div>
                      <div className="sec-sub">
                        {rawFiltered.length} of {filtered.length} records shown
                      </div>
                    </div>
                    {hasRawFilter && (
                      <button
                        className="filter-btn clear"
                        onClick={clearRawFilters}
                      >
                        ✕ Clear Filters
                      </button>
                    )}
                  </div>

                  {/* Filter panel */}
                  <div className="chart-card" style={{ padding: "14px 18px" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <span className="filter-label">Filter:</span>
                      <select
                        className="filter-select"
                        value={gInterviewer}
                        onChange={(e) => setGInterviewer(e.target.value)}
                      >
                        <option value="all">All Interviewers</option>
                        {allInterviewers.map((i) => (
                          <option key={i} value={i}>
                            {i}
                          </option>
                        ))}
                      </select>
                      <select
                        className="filter-select"
                        value={gSurveyId}
                        onChange={(e) => setGSurveyId(e.target.value)}
                      >
                        <option value="all">All Survey IDs</option>
                        {allSurveyIds.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <select
                        className="filter-select"
                        value={gLocation}
                        onChange={(e) => setGLocation(e.target.value)}
                      >
                        <option value="all">All Locations</option>
                        {allLocations.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                      <select
                        className="filter-select"
                        value={rSubmitted}
                        onChange={(e) => setRSubmitted(e.target.value)}
                      >
                        <option value="all">All Status</option>
                        <option value="yes">Submitted</option>
                        <option value="no">Not Submitted</option>
                      </select>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <span className="filter-label">Date:</span>
                      <input
                        className="filter-input"
                        type="date"
                        value={rDateFrom}
                        onChange={(e) => setRDateFrom(e.target.value)}
                        title="From"
                      />
                      <span className="filter-label">–</span>
                      <input
                        className="filter-input"
                        type="date"
                        value={rDateTo}
                        onChange={(e) => setRDateTo(e.target.value)}
                        title="To"
                      />
                      <div className="search-wrap" style={{ maxWidth: 240 }}>
                        <span className="search-icon">⌕</span>
                        <input
                          className="search-inp"
                          placeholder="Search name, town, ID…"
                          value={rSearch}
                          onChange={(e) => setRSearch(e.target.value)}
                        />
                      </div>
                      {hasRawFilter && (
                        <button
                          className="filter-btn clear"
                          onClick={clearRawFilters}
                        >
                          ✕ Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="chart-card">
                    <div className="tbl-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Respondent</th>
                            <th>Survey</th>
                            <th>Phone</th>
                            <th>Intvwr</th>
                            <th>Town</th>
                            <th>Date</th>
                            <th>Duration</th>
                            <th>Submitted</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rawFiltered.map((r, idx) => {
                            const d = durMin(r);
                            return (
                              <tr key={r.id}>
                                <style>{css2}</style>
                                <td>{idx + 1}</td>

                                <td>{r.respondentName || "--"}</td>
                                <td>
                                  <div className="demo-sub">
                                    {r.surveyId || "--"}
                                  </div>
                                </td>
                                <td>
                                  <div className="demo-sub">
                                    {r.respondentPhone || "--"}
                                  </div>
                                </td>

                                <td>
                                  <div className="demo-sub">
                                    {r.interviewerName ||
                                      r.interviewerId ||
                                      "—"}
                                  </div>
                                </td>
                                <td>
                                  <div className="demo-sub">
                                    {r.respondentTown || r.respondentLocation}
                                  </div>
                                </td>
                                <td>
                                  <div className="demo-sub">
                                    {fmtDate(r.startedAt)}
                                  </div>
                                </td>
                                <td>
                                  <div className="demo-sub">
                                    {d != null ? `${d}m` : "—"}
                                  </div>
                                </td>

                                <td>
                                  <span
                                    className={`badge ${r.submitted ? "green" : "amber"}`}
                                  >
                                    {r.submitted ? "✓ Yes" : "Pending"}
                                  </span>
                                </td>

                                <td>
                                  <button
                                    className="btn-del"
                                    onClick={() => setPendingDel(r)}
                                    disabled={deleting}
                                  >
                                    🗑 Delete
                                  </button>
                                  <button
                                    className="rv-btn"
                                    onClick={() => setIsOpen(true)}
                                    onClick={() => handleViewRecord(r)}
                                  >
                                    📋 View
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {rawFiltered.length === 0 && (
                        <div className="empty">
                          <div className="empty-icon">🔍</div>No results match
                          the current filters.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {isOpen && (
            <ResponseModal
              record={viewrecord}
              //open={isOpen}
              onClose={() => setIsOpen(false)}
            />
          )}
        </main>
      </div>
    </>
  );
}

const css2 = `

.rv-btn {
    display: inline-flex; align-items: center; gap: 15px;
    background: #ffe2dd; color: var(--orange);
    border: none; border-radius: 5px;
    padding: 8px 15px; font-family: var(--font-sans);
    font-size: 12.5px; font-weight: 500;
    cursor: pointer; transition: opacity .15s, transform .1s;
    white-space: nowrap;
  }
  .rv-btn:hover  { opacity: .88; transform: translateY(-1px); }
  }

        .demo-wrap {
          min-height: 100vh; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 20px; padding: 40px 20px;
        }
        .row-card {
          width: 100%; 
          background: #ffffff; 
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }


        
        .demo-name  { font-size: 15px; font-weight: 600; color: #1c1812; }
        .demo-sub   { font-size: 12px; color: #9c9080; margin-top: 2px; font-family: 'DM Mono', monospace; }
        .demo-label { font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #9c9080; margin-bottom: 14px; font-family: 'DM Mono', monospace; }
`;
/**
// ── EDIT BUTTON ── 
  .btn-edit{
    display:inline-flex;align-items:center;gap:4px;
    background: #e9e9e9 ;border:1px solid #d9dc2633;
    border-radius:5px;color: #707070;padding:4px 9px;
    font-size:11.5px;font-weight:600;cursor:pointer;font-family:var(--font);
    transition:all .15s;white-space:nowrap;
  }
  .btn-edit:hover{ background: #d1e9f0; color: #25baffea border-color: #0daeff8e}

 */

function extractQuestions(record) {
  return Object.keys(record)
    .filter((k) => /^Q\d+$/.test(k))
    .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
}
const QUESTION_LABELS = {
  tenant: {
    Q1: "Are you currently renting accommodation in Kenya?",
    Q2: "What is your monthly rent?",
    Q3: "When you moved in, did you sign a written tenancy agreement?",
    Q4: "Have you ever lost a deposit or been overcharged without written proof?",
    Q5: "Have you ever moved out due to an unresolved dispute with your landlord?",
    Q6: "When you pay rent via M-Pesa, does your landlord give you a written receipt?",
    Q7: "How serious a problem is having no reliable lease agreement? (1–5)",
    Q8: "Would you trust a PIN-signed digital agreement more, same, or less than paper?",
    Q9: "If your landlord offered a digitally signed lease, would you prefer it over paper?",
    Q10: "Would you pay a small fee (KSh 20–50) to have your agreement signed digitally?",
    Q11: "What phone do you use?",
    Q12: "What would most reassure you that a digital agreement is legitimate?",
    Q13: "In your own words — what one thing would you change about rental agreements in Kenya?",
  },
  landlord: {
    Q1: "Do you own or manage rental property in Kenya?",
    Q2: "How many rental units do you currently have tenants in?",
    Q3: "What is the typical monthly rent for your units?",
    Q4: "When a new tenant moves in, what documents do you use?",
    Q5: "When a tenant pays a deposit, how do you document it?",
    Q6: "In the past 12 months, have you had a dispute with a tenant?",
    Q7: "During that dispute — did you have a signed written agreement?",
    Q8: "What was the approximate financial cost of your worst tenancy dispute?",
    Q9: "How big a problem is the lack of proper rental documentation? (1–5)",
    Q10: "On average, how many tenants move out per year leaving a dispute unresolved?",
    Q11: "When a tenant dispute turns serious, where do you go for help?",
    Q12: "Why don't you use a lawyer-drafted lease for all your tenancies?",
    Q13: "Would you pay for a tool that creates a legally enforceable tenancy agreement in 5 minutes?",
    Q14: "Per tenancy agreement, what is the maximum you would pay?",
    Q15: "If a monthly subscription gave you unlimited agreements — what price per month feels fair?",
    Q16: "If your property agent offered this service as part of their fees, would you prefer that?",
    Q17: "Would your tenants be able to sign a digital lease using only a basic phone and a PIN?",
    Q18: "What would stop you from using a digital signing tool?",
    Q19: "If this tool worked via M-Pesa — would that make it easier to use?",
    Q20: "Who would you most trust to offer you this service?",
    Q21: "How often do you sign new tenancy agreements per year?",
    Q22: "In your own words — what is the single most stressful part of managing tenants?",
    Q23: "Would you be willing to try a free version for 1 month and give feedback?",
  },
};
function getLabel(surveyId, qKey) {
  return QUESTION_LABELS[surveyId]?.[qKey] || null;
}

function fmtTimestamp(val) {
  if (!val) return null;
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d)
      ? val
      : d.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
  }
  if (val?.seconds) {
    return new Date(val.seconds * 1000).toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
  return String(val);
}

function fmtDuration(start, end) {
  if (!start || !end) return null;
  const ms = new Date(end) - new Date(start);
  if (isNaN(ms) || ms < 0) return null;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  :root {
    --cream:    #faf8f4;
    --warm:     #f2ede4;
    --border:   #e2dbd0;
    --border2:  #ccc4b5;
    --text:     #1c1812;
    --sub:      #5a5043;
    --muted:    #9c9080;
    --orange:   #C0451A;
    --orangeL:  #f9ede7;
    --teal:     #1d7a5f;
    --tealL:    #e6f4ef;
    --amber:    #a05c10;
    --amberL:   #fef3e2;
    --red:      #c0271a;
    --redL:     #fdf0ee;
    --sky:      #1464a0;
    --skyL:     #e8f2fc;

    /*
    --font-serif: 'Instrument Serif', Georgia, serif;
    --font-sans:  'DM Sans', sans-serif;
    --font-mono:  'DM Mono', monospace;*/
  }

  .rv-btn {
    display: inline-flex; align-items: center; gap: 7px;
    background: var(--orange); color: #fff;
    border: none; border-radius: 8px;
    padding: 8px 16px; 
    font-size: 12.5px; font-weight: 500;
    cursor: pointer; transition: opacity .15s, transform .1s;
    white-space: nowrap;
  }
  .rv-btn:hover  { opacity: .88; transform: translateY(-1px); }
  .rv-btn:active { transform: translateY(0); }
  .rv-btn.ghost  {
    background: transparent; color: var(--sub);
    border: 1px solid var(--border2);
  }
  .rv-btn.ghost:hover { background: var(--warm); }

  /* ── OVERLAY ── */
  .rv-overlay {
    position: fixed; inset: 0;
    background: rgba(20,15,10,.55);
    backdrop-filter: blur(4px);
    z-index: 9000;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    animation: rv-fade-in .2s ease;
  }
  @keyframes rv-fade-in {
    from { opacity:0 }
    to   { opacity:1 }
  }

  /* ── PANEL ── */
  .rv-panel {
    background:  #f7f7f7;
    border: 1px solid var(--border);
    border-radius: 6px;
    width: 100%; max-width: 760px;
    max-height: 96vh;
    display: flex; flex-direction: column;
    box-shadow: 0 32px 80px #140f0a40;
    animation: rv-slide-up .25s cubic-bezier(.25,.8,.25,1);
    overflow: hidden;
  }
  @keyframes rv-slide-up {
    from { opacity:0; transform: translateY(20px) scale(.97) }
    to   { opacity:1; transform: translateY(0)   scale(1)    }
  }

  /* ── PANEL HEADER ── */
  .rv-header {
    padding: 10px 26px 18px;
    border-bottom: 1px solid var(--border);
    background:  #eeeeee;
    flex-shrink: 0;
  }
  .rv-header-top {
    display: flex; align-items: flex-start;
    justify-content: space-between; gap: 12px;
    margin-bottom: 14px;
  }
  .rv-close {
    width: 30px; height: 30px; border-radius: 50%;
    background: transparent; border: 1px solid var(--border2);
    color: var(--sub); font-size: 16px; line-height: 1;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: background .15s;
    
  }
  .rv-close:hover { background: var(--border); }

  .rv-survey-title {
    font-family: var(--font-serif);
    font-size: 22px; color: var(--text);
    line-height: 1.2; margin-bottom: 3px;
  }
  .rv-survey-sub {
    font-size: 12px; color: var(--muted);
    
  }

  /* ── META GRID ── */
  .rv-meta-grid {
    display: block;
    gap: 4px;
  }
  .rv-meta-chip {
  display: grid; 
  gap: 10px;
    background: #fff;
    border-bottom: 1.5px solid #eeeeee;
    border-radius: 0px;
    padding: 2px 10px;
    grid-template-columns: 80px 1fr;
  }
  .rv-meta-chip:has(.rv-badge.survey-tag) {
    grid-template-columns: 80px 1fr 80px;
  }

  .rv-meta-chip:has(.rv-gps) {
      grid-template-columns: 80px 1fr 80px;
  }
  .rv-meta-label {
    font-size: 8px; font-weight: 500;
    letter-spacing: .1em; text-transform: uppercase;
    color: var(--muted); 
  }
  .rv-meta-value {
    font-size: 12.5px; font-weight: 500;
    color: var(--text); 
    line-height: 1.3;
  }
  .rv-meta-value.mono {  font-size: 12px; }

  /* ── STATUS BADGES ── */
  .rv-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 5px;
    font-size: 11px; font-weight: 500;
     white-space: nowrap;
  }
  .rv-badge.submitted  { background: var(--tealL);  color: var(--teal); }
  .rv-badge.pending    { background: var(--amberL); color: var(--amber); }
  .rv-badge.survey-tag { background: var(--skyL);   color: var(--sky); }

  /* ── PROGRESS BAR ── */
  .rv-progress-wrap { margin-top: 12px; }
  .rv-progress-row  {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 5px;
  }
  .rv-progress-label {
    font-size: 11.5px; color: var(--sub);
    
  }
  .rv-progress-count {
    font-size: 11.5px; font-weight: 600; color: var(--orange);
    
  }
  .rv-progress-bg {
    height: 5px; background: var(--border);
    border-radius: 100px; overflow: hidden;
  }
  .rv-progress-fill {
    height: 100%; border-radius: 100px;
    background: linear-gradient(90deg, var(--orange), #e07040);
    transition: width .5s cubic-bezier(.4,0,.2,1);
  }

  /* ── SEARCH BAR ── */
  .rv-search-wrap {
    padding: 10px 26px;
    flex-shrink: 0;
    margin:18px 0;
    position: relative;
     background: #f3ecec;
  }
  .rv-search-icon {
    position: absolute; left: 38px; top: 50%;
    transform: translateY(-30%);
    color: var(--muted); font-size: 13px; pointer-events: none;
  }
  .rv-search {
    width: 100%;
    background: #fff; border: 1px solid var(--border);
    border-radius: 8px; padding: 8px 12px 8px 32px;
     font-size: 13px;
    color: var(--text); outline: none;
    transition: border-color .15s, box-shadow .15s;
  }
  .rv-search:focus {
    border-color: var(--orange);
    box-shadow: 0 0 0 3px rgba(192,69,26,.1);
  }
  .rv-search::placeholder { color: var(--muted); }

  /* ── BODY (scrollable Q&A list) ── */
  .rv-body {
   background: #fffffff1;
    flex: 1; overflow-y: auto; padding: 18px 26px 24px;
    scroll-behavior: smooth;
  }
  .rv-body::-webkit-scrollbar { width: 5px; }
  .rv-body::-webkit-scrollbar-track { background: transparent; }
  .rv-body::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 10px; }

  /* ── QA ROW ── */
  .rv-qa-row {
    display: grid;
    grid-template-columns: 36px 1fr;
    gap: 0 14px;
    padding: 13px 0;
    padding-top:18px;
    border-bottom: 1px solid #dfdfdf;
    transition: background .12s;
    animation: rv-row-in .3s ease both;
  }
  .rv-qa-row:last-child { border-bottom: none; }
  .rv-qa-row:hover { background: var(--warm); }

  @keyframes rv-row-in {
    from { opacity:0; transform: translateX(-6px) }
    to   { opacity:1; transform: translateX(0) }
  }

  .rv-q-num {
    grid-row: 1 / 3;
    display: flex; align-items: flex-start; justify-content: flex-end;
    padding-top: 2px;
  }
  .rv-q-num-inner {
    width: 26px; height: 26px; border-radius: 6px;
    background: var(--orangeL); color: var(--orange);
     font-size: 11px; font-weight: 500;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .rv-q-num-inner.unanswered {
    background: var(--warm); color: var(--muted);
  }

  .rv-question {
    font-size: 12.5px; font-weight: 400;
    color: #949494; line-height: 1.45;
    margin-bottom: 6px;
  }
  .rv-question em {
    font-style: italic; color: var(--muted); font-weight: 400; font-size: 12px;
  }

  .rv-answer {
    font-family: var(--font-serif);
    font-size: 15px; color: var(--text);
    line-height: 1.5;
  }

  /* answer type variations */
  .rv-answer.is-array { display: flex; flex-direction: column; gap: 5px; }
  .rv-answer-item {
    display: inline-flex; align-items: center; gap: 6px;
     font-size: 13px;
  }
  .rv-answer-item::before {
    content: ''; display: block;
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--orange); flex-shrink: 0;
  }
  .rv-answer.is-number {
    
    font-size: 20px; font-weight: 500;
    color: var(--orange);
  }
  .rv-answer.is-long {
    font-family: var(--font-serif);
    font-style: italic;
    background: var(--warm);
    border-left: 3px solid var(--orange);
    padding: 8px 12px; border-radius: 0 6px 6px 0;
    font-size: 14px;
  }
  .rv-unanswered {
     font-size: 12px;
    color: var(--muted); font-style: italic;
  }

  /* ── SEVERITY STARS ── */
  .rv-stars { display: flex; gap: 3px; }
  .rv-star  { font-size: 15px; line-height: 1; }

  /* ── EMPTY / NO MATCH ── */
  .rv-empty {
    text-align: center; padding: 40px 20px;
    color: var(--muted);  font-size: 13px;
  }
  .rv-empty-icon { font-size: 36px; margin-bottom: 10px; opacity: .4; }

  /* ── FOOTER ── */
  .rv-footer {
    padding: 14px 26px;
    border-top: 1px solid var(--border);
    background: var(--warm);
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; flex-shrink: 0;
  }
  .rv-footer-info {
    font-size: 11.5px; color: var(--muted);
    
  }

  /* ── GPS CHIP ── */
  .rv-gps {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11.5px; 
    color: var(--sky); background: var(--skyL);
    border: 1px solid rgba(20,100,160,.15);
    border-radius: 5px; padding: 3px 8px;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// ANSWER RENDERER
// ─────────────────────────────────────────────────────────────────────────────
function AnswerValue({ value }) {
  if (value === null || value === undefined || value === "") {
    return <span className="rv-unanswered">— not answered</span>;
  }

  // Array (multi-select)
  if (Array.isArray(value)) {
    return (
      <div className="rv-answer is-array">
        {value.map((v, i) => (
          <span key={i} className="rv-answer-item">
            {v}
          </span>
        ))}
      </div>
    );
  }

  // Numeric (e.g. severity rating)
  if (typeof value === "number") {
    // if 1–5, show stars
    if (value >= 1 && value <= 5) {
      return (
        <div>
          <div className="rv-answer is-number">{value} / 5</div>
          <div className="rv-stars" style={{ marginTop: 4 }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <span
                key={s}
                className="rv-star"
                style={{ opacity: s <= value ? 1 : 0.2 }}
              >
                {s <= value ? "★" : "☆"}
              </span>
            ))}
          </div>
        </div>
      );
    }
    return <span className="rv-answer is-number">{value}</span>;
  }

  // Long text (open-ended, more than 60 chars)
  if (typeof value === "string" && value.length > 60) {
    return <div className="rv-answer is-long">"{value}"</div>;
  }

  return <div className="rv-answer">{value}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION ROW
// ─────────────────────────────────────────────────────────────────────────────
function QARow({ qKey, value, label, index, animDelay }) {
  const num = qKey.slice(1); // "1", "2", …
  const hasAnswer = value !== null && value !== undefined && value !== "";

  return (
    <div
      className="rv-qa-row"
      style={{
        animationDelay: `${animDelay}ms`,
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      <div className="rv-q-num">
        <div className={`rv-q-num-inner${hasAnswer ? "" : " unanswered"}`}>
          {num}
        </div>
      </div>

      <div className="rv-question">
        {label ? (
          <>
            {label}
            <em> — {qKey}</em>
          </>
        ) : (
          <em>{qKey}</em>
        )}
      </div>

      <div style={{ gridColumn: 2 }}>
        <AnswerValue value={value} />
      </div>
    </div>
  );
}

// MAIN MODAL
// ─────────────────────────────────────────────────────────────────────────────
export function ResponseModal({ record, onClose }) {
  const [search, setSearch] = useState("");

  // Close on Escape

  const onKey = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );
  useEffect(() => {
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onKey]);

  if (!record) return null;

  const surveyId = record.surveyId || "";
  const qKeys = extractQuestions(record);
  const answered = qKeys.filter((k) => {
    const v = record[k];
    return (
      v !== null &&
      v !== undefined &&
      v !== "" &&
      !(Array.isArray(v) && v.length === 0)
    );
  });
  const totalQ = qKeys.length;
  const totalAns = answered.length;
  const pct = totalQ > 0 ? Math.round((totalAns / totalQ) * 100) : 0;
  const duration = fmtDuration(
    record.startedAt,
    record.gpsTimestamp || record.submittedAt,
  );

  // Filter rows
  const lq = search.toLowerCase();
  const visibleKeys = qKeys.filter((k) => {
    if (!search) return true;
    const label = getLabel(surveyId, k) || "";
    const val = record[k];
    const valStr = Array.isArray(val) ? val.join(" ") : String(val ?? "");
    return (
      k.toLowerCase().includes(lq) ||
      label.toLowerCase().includes(lq) ||
      valStr.toLowerCase().includes(lq)
    );
  });

  const gps = record.gps;

  return (
    <>
      <style>{css}</style>
      <div
        className="rv-overlay"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="rv-panel" role="dialog" aria-modal="true">
          {/* ── HEADER ── */}
          <div className="rv-header">
            <div className="rv-header-top">
              <div style={{ flex: 1 }}>
                <div className="rv-survey-title">
                  {record.surveyTitle || "Survey Response"}
                </div>
                <div className="rv-survey-sub">
                  {record.id || record.sessionId || "—"}
                </div>
              </div>
              <button className="rv-close" onClick={onClose} aria-label="Close">
                ×
              </button>
            </div>

            {/* Progress */}
            <div className="rv-progress-wrap">
              <div className="rv-progress-row">
                <span className="rv-progress-label">Answers recorded</span>
                <span className="rv-progress-count">
                  {totalAns} / {totalQ} questions ({pct}%)
                </span>
              </div>
              <div className="rv-progress-bg">
                <div
                  className="rv-progress-fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── Q&A LIST ── */}
          <div className="rv-body">
            {/* Meta chips */}
            <div className="rv-meta-grid">
              <div
                className="rv-meta-chip"
                style={{
                  paddingTop: "15px",
                }}
              >
                <div className="rv-meta-label">Respondent</div>
                <div className="rv-meta-value">
                  {record.respondentName || "Unknown"}
                </div>
              </div>
              <div className="rv-meta-chip">
                <div className="rv-meta-label">Town</div>
                <div className="rv-meta-value">
                  {record.respondentTown || "—"}
                </div>
              </div>
              <div className="rv-meta-chip">
                <div className="rv-meta-label">Location</div>
                <div className="rv-meta-value">
                  {record.respondentLocation || "—"}
                </div>
              </div>
              <div className="rv-meta-chip">
                <div className="rv-meta-label">Phone</div>
                <div className="rv-meta-value mono">
                  {record.respondentPhone || "—"}
                </div>
              </div>
              <div className="rv-meta-chip">
                <div className="rv-meta-label">Interviewer</div>
                <div className="rv-meta-value">
                  {record.interviewerName || record.interviewerId || "—"}
                </div>
              </div>
              <div className="rv-meta-chip">
                <div className="rv-meta-label">Int. Location</div>
                <div className="rv-meta-value">
                  {record.interviewerLocation || "—"}
                </div>
              </div>
              <div className="rv-meta-chip">
                <div className="rv-meta-label">Started At</div>
                <div className="rv-meta-value mono">
                  {fmtTimestamp(record.startedAt)}
                </div>
              </div>
              <div className="rv-meta-chip">
                <div className="rv-meta-label">Submitted At</div>
                <div className="rv-meta-value mono">
                  {fmtTimestamp(record.submittedAt) || "—"}
                </div>
              </div>
              {duration && (
                <div className="rv-meta-chip">
                  <div className="rv-meta-label">Duration</div>
                  <div className="rv-meta-value mono">{duration}</div>
                </div>
              )}
              <div className="rv-meta-chip">
                <div className="rv-meta-label">Status</div>
                {surveyId && (
                  <span className="rv-badge survey-tag">{surveyId}</span>
                )}
                <span
                  className={`rv-badge ${record.submitted ? "submitted" : "pending"}`}
                >
                  {record.submitted ? "✓ Submitted" : "⏳ Pending"}
                </span>
              </div>
              {gps && (
                <div className="rv-meta-chip">
                  <div className="rv-meta-label">GPS</div>
                  <span className="rv-gps">
                    📍 {gps.lat?.toFixed(5)}, {gps.lng?.toFixed(5)}
                  </span>
                  {gps.accuracy && (
                    <div
                      className="rv-meta-value mono"
                      style={{ marginTop: 3 }}
                    >
                      ±{Math.round(gps.accuracy)}m
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── SEARCH ── */}
            <div className="rv-search-wrap">
              <span className="rv-search-icon">⌕</span>
              <input
                className="rv-search"
                placeholder="Filter questions or answers…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {visibleKeys.length === 0 ? (
              <div className="rv-empty">
                <div className="rv-empty-icon">🔍</div>
                No questions match "<strong>{search}</strong>"
              </div>
            ) : (
              visibleKeys.map((k, i) => (
                <QARow
                  key={k}
                  qKey={k}
                  value={record[k]}
                  label={getLabel(surveyId, k)}
                  index={i}
                  animDelay={i * 30}
                />
              ))
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="rv-footer">
            <span className="rv-footer-info">
              {visibleKeys.length} of {totalQ} questions shown
              {search ? ` · filtered by "${search}"` : ""}
            </span>
            <button className="rv-btn ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
