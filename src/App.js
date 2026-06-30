import { useState, useMemo, useEffect } from "react";

// ─── Derived calculations ──────────────────────────────────────────────────
function derived(weight, height, bodyFat, waist) {
  if (!weight || !height || !bodyFat || !waist) return null;
  const fatMass = +(weight * bodyFat / 100).toFixed(1);
  const leanMass = +(weight - fatMass).toFixed(1);
  const bmi = +(weight / (height * height) * 703).toFixed(1);
  const whr = +(waist / height).toFixed(3);
  return { fatMass, leanMass, bmi, whr };
}

function calcProgress(checkins, height) {
  if (!checkins || checkins.length < 2) return null;
  const sorted = [...checkins].sort((a, b) => new Date(a.date) - new Date(b.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const s = derived(first.weight, height, first.bodyFat, first.waist);
  const e = derived(last.weight, height, last.bodyFat, last.waist);
  if (!s || !e) return null;
  const wtPct      = ((first.weight - last.weight) / first.weight) * 100;
  const bmiPct     = ((s.bmi - e.bmi) / s.bmi) * 100;
  const bfPct      = ((first.bodyFat - last.bodyFat) / first.bodyFat) * 100;
  const fatMassPct = ((s.fatMass - e.fatMass) / s.fatMass) * 100;
  const leanPct    = ((e.leanMass - s.leanMass) / Math.abs(s.leanMass)) * 100;
  const waistPct   = ((first.waist - last.waist) / first.waist) * 100;
  const whrPct     = ((s.whr - e.whr) / s.whr) * 100;
  const composite  = (wtPct + bmiPct + bfPct + fatMassPct + leanPct + waistPct + whrPct) / 7;
  return { wtPct, bmiPct, bfPct, fatMassPct, leanPct, waistPct, whrPct, composite, first, last, s, e, sorted };
}

function inchesToFtIn(n) {
  return `${Math.floor(n / 12)}'${n % 12}"`;
}

function fmt(n, dec = 1) { return Number(n).toFixed(dec); }

// ─── Colors ───────────────────────────────────────────────────────────────
const genderColor = { M: "#3b82f6", F: "#ec4899" };
const medals = ["🥇", "🥈", "🥉"];
const METRIC_COLORS = {
  weight: "#f59e0b", bmi: "#fb923c", bodyFat: "#38bdf8",
  fatMass: "#a78bfa", leanMass: "#34d399", waist: "#f472b6", whr: "#94a3b8",
};

// ─── Tiny components ──────────────────────────────────────────────────────
function Bar({ value, max, color }) {
  const pct = Math.max(0, Math.min((value / Math.max(max, 0.01)) * 100, 100));
  return (
    <div style={{ background: "#1e293b", borderRadius: 6, height: 8, overflow: "hidden", flex: 1 }}>
      <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 6, transition: "width 0.6s ease" }} />
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "number", style = {} }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 80, ...style }}>
      {label && <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{label}</label>}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 10px", color: "#e2e8f0", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" }}
      />
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", small = false }) {
  const styles = {
    primary:   { background: "#4ade80", color: "#020817" },
    secondary: { background: "#1e293b", color: "#94a3b8" },
    danger:    { background: "#7f1d1d", color: "#fca5a5" },
    ghost:     { background: "none", color: "#64748b", border: "1px dashed #334155" },
  };
  return (
    <button onClick={onClick} style={{
      border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700,
      padding: small ? "5px 12px" : "9px 18px", fontSize: small ? 12 : 14,
      transition: "opacity 0.15s", ...styles[variant],
    }}>{children}</button>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────
function Sparkline({ data, color }) {
  if (data.length < 2) return null;
  const W = 80, H = 28, pad = 3;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── Check-in form ────────────────────────────────────────────────────────
const emptyCheckin = { date: new Date().toISOString().slice(0, 10), weight: "", waist: "", bodyFat: "" };

function CheckinForm({ onSave, onCancel }) {
  const [c, setC] = useState(emptyCheckin);
  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 16, marginTop: 8 }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>New Check-in</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <Input label="Date" value={c.date} onChange={v => setC(x => ({ ...x, date: v }))} type="date" />
        <Input label="Weight (lbs)" value={c.weight} onChange={v => setC(x => ({ ...x, weight: v }))} placeholder="185" />
        <Input label="Waist (in)" value={c.waist} onChange={v => setC(x => ({ ...x, waist: v }))} placeholder="36" />
        <Input label="Body Fat %" value={c.bodyFat} onChange={v => setC(x => ({ ...x, bodyFat: v }))} placeholder="24" />
      </div>
      <div style={{ fontSize: 11, color: "#475569", marginBottom: 10 }}>
        BMI, Fat Mass, Lean Mass and Waist-to-Height ratio are calculated automatically from height on file.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={() => { if (c.weight && c.waist && c.bodyFat && c.date) onSave(c); }}>Save</Btn>
        <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}

// ─── Participant detail view ───────────────────────────────────────────────
function ParticipantDetail({ p, onBack, onAddCheckin, onDeleteCheckin, onDeleteParticipant }) {
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const sorted = [...(p.checkins || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

  const rows = sorted.map(c => {
    const d = derived(Number(c.weight), p.height, Number(c.bodyFat), Number(c.waist));
    return { ...c, ...d };
  });

  const metrics = [
    { key: "weight",   label: "Weight",      unit: " lbs", color: METRIC_COLORS.weight,   vals: rows.map(r => r.weight) },
    { key: "bmi",      label: "BMI",         unit: "",     color: METRIC_COLORS.bmi,      vals: rows.map(r => r.bmi) },
    { key: "bodyFat",  label: "Body Fat",    unit: "%",    color: METRIC_COLORS.bodyFat,  vals: rows.map(r => r.bodyFat) },
    { key: "fatMass",  label: "Fat Mass",    unit: " lbs", color: METRIC_COLORS.fatMass,  vals: rows.map(r => r.fatMass) },
    { key: "leanMass", label: "Lean Mass",   unit: " lbs", color: METRIC_COLORS.leanMass, vals: rows.map(r => r.leanMass) },
    { key: "waist",    label: "Waist",       unit: '"',    color: METRIC_COLORS.waist,    vals: rows.map(r => r.waist) },
    { key: "whr",      label: "Waist/Ht",   unit: "",     color: METRIC_COLORS.whr,      vals: rows.map(r => r.whr) },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "#1e293b", border: "none", borderRadius: 8, padding: "6px 12px", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>← Back</button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#e2e8f0" }}>{p.name}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>
              {p.gender === "M" ? "♂" : "♀"} · Age {p.age} · {inchesToFtIn(p.height)} · {sorted.length} check-in{sorted.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
        {!confirmDelete
          ? <Btn small variant="danger" onClick={() => setConfirmDelete(true)}>Remove</Btn>
          : <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#fca5a5" }}>Sure?</span>
              <Btn small variant="danger" onClick={() => onDeleteParticipant(p.id)}>Yes</Btn>
              <Btn small variant="secondary" onClick={() => setConfirmDelete(false)}>No</Btn>
            </div>
        }
      </div>

      {/* Metric trend cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
        {metrics.map(m => {
          const first = m.vals[0], last = m.vals[m.vals.length - 1];
          const delta = rows.length > 1 ? (last - first) : null;
          const isGood = m.key === "leanMass" ? delta > 0 : delta < 0;
          return (
            <div key={m.key} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: m.color, fontWeight: 700, marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#e2e8f0" }}>
                {rows.length ? fmt(last) + m.unit : "—"}
              </div>
              {delta !== null && (
                <div style={{ fontSize: 12, color: isGood ? "#4ade80" : "#f87171", marginTop: 2 }}>
                  {delta > 0 ? "+" : ""}{fmt(delta)}{m.unit}
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <Sparkline data={m.vals.map(Number)} color={m.color} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Check-in log */}
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, color: "#e2e8f0" }}>Check-in Log</div>
          <Btn small onClick={() => setShowForm(true)}>+ Add</Btn>
        </div>

        {showForm && (
          <CheckinForm
            onSave={c => { onAddCheckin(p.id, c); setShowForm(false); }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {rows.length === 0 && !showForm && (
          <div style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
            No check-ins yet. Add one above.
          </div>
        )}

        {rows.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 500 }}>
              <thead>
                <tr style={{ color: "#475569", borderBottom: "1px solid #1e293b" }}>
                  {["Date", "Weight", "BMI", "BF%", "Fat Mass", "Lean Mass", "Waist", "W/H", ""].map((h, i) => (
                    <th key={i} style={{ textAlign: i === 0 ? "left" : "right", padding: "4px 8px 8px", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderTop: i > 0 ? "1px solid #0f172a" : "none" }}>
                    <td style={{ padding: "7px 8px", color: "#94a3b8", whiteSpace: "nowrap" }}>{r.date}</td>
                    <td style={{ textAlign: "right", padding: "7px 8px", color: METRIC_COLORS.weight }}>{r.weight} lbs</td>
                    <td style={{ textAlign: "right", padding: "7px 8px", color: METRIC_COLORS.bmi }}>{r.bmi}</td>
                    <td style={{ textAlign: "right", padding: "7px 8px", color: METRIC_COLORS.bodyFat }}>{r.bodyFat}%</td>
                    <td style={{ textAlign: "right", padding: "7px 8px", color: METRIC_COLORS.fatMass }}>{r.fatMass} lbs</td>
                    <td style={{ textAlign: "right", padding: "7px 8px", color: METRIC_COLORS.leanMass }}>{r.leanMass} lbs</td>
                    <td style={{ textAlign: "right", padding: "7px 8px", color: METRIC_COLORS.waist }}>{r.waist}"</td>
                    <td style={{ textAlign: "right", padding: "7px 8px", color: METRIC_COLORS.whr }}>{r.whr}</td>
                    <td style={{ textAlign: "right", padding: "7px 4px" }}>
                      <button onClick={() => onDeleteCheckin(p.id, i)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add participant form ─────────────────────────────────────────────────
const emptyProfile = { name: "", gender: "M", age: "", height: "" };

function AddParticipantForm({ onSave, onCancel }) {
  const [form, setForm] = useState(emptyProfile);
  const valid = form.name && form.age && form.height;
  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 20, marginTop: 10 }}>
      <div style={{ fontWeight: 700, marginBottom: 14, color: "#94a3b8" }}>New Participant</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <Input label="Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Jane D." type="text" />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Gender</label>
          <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
            style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 10px", color: "#e2e8f0", fontSize: 14 }}>
            <option value="M">M</option>
            <option value="F">F</option>
          </select>
        </div>
        <Input label="Age" value={form.age} onChange={v => setForm(f => ({ ...f, age: v }))} placeholder="32" />
        <Input label="Height (inches)" value={form.height} onChange={v => setForm(f => ({ ...f, height: v }))} placeholder="68" />
      </div>
      <div style={{ fontSize: 11, color: "#475569", marginBottom: 12 }}>
        Height is fixed and used to auto-calculate BMI and Waist-to-Height ratio on every check-in.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={() => {
          if (valid) onSave({ ...form, age: Number(form.age), height: Number(form.height), id: Date.now(), checkins: [] });
        }}>Add</Btn>
        <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}

// ─── Leaderboard card ─────────────────────────────────────────────────────
function LeaderCard({ p, rank, progress, maxScore, isWinner, onSelect }) {
  const medal = medals[rank] || null;
  const score = progress?.composite;
  return (
    <div onClick={onSelect} style={{
      background: isWinner ? "linear-gradient(135deg,#1e3a2f,#0f2027)" : "#0f172a",
      border: isWinner ? "1.5px solid #4ade80" : "1px solid #1e293b",
      borderRadius: 14, padding: "14px 18px", cursor: "pointer",
      boxShadow: isWinner ? "0 0 20px #4ade8022" : "none", marginBottom: 8,
      transition: "all 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%", background: genderColor[p.gender],
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 14, color: "#fff", flexShrink: 0,
        }}>
          {medal || `#${rank + 1}`}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: isWinner ? "#4ade80" : "#e2e8f0" }}>{p.name}</span>
            <span style={{ fontSize: 11, color: "#64748b", background: "#1e293b", padding: "2px 7px", borderRadius: 20 }}>
              {p.gender === "M" ? "♂" : "♀"} {p.age} · {inchesToFtIn(p.height)}
            </span>
            {isWinner && progress && <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 700 }}>CHAMPION</span>}
            <span style={{ fontSize: 11, color: "#334155", marginLeft: "auto" }}>
              {(p.checkins || []).length} check-in{(p.checkins || []).length !== 1 ? "s" : ""} →
            </span>
          </div>
          {progress ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
              <Bar value={score} max={maxScore} color={isWinner ? "#4ade80" : genderColor[p.gender]} />
              <span style={{ fontSize: 13, fontWeight: 700, color: isWinner ? "#4ade80" : "#94a3b8", minWidth: 50, textAlign: "right" }}>
                {fmt(score)}%
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>Needs at least 2 check-ins to score</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────
const STORAGE_KEY = "fitness_challenge_v1";

export default function App() {
  const [participants, setParticipants] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [sortBy, setSortBy] = useState("composite");
  const [tab, setTab] = useState("leaderboard");

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(participants)); } catch {}
  }, [participants]);

  function addParticipant(p) { setParticipants(prev => [...prev, p]); setShowAddForm(false); }
  function deleteParticipant(id) { setParticipants(prev => prev.filter(p => p.id !== id)); setSelectedId(null); }
  function addCheckin(pid, checkin) {
    setParticipants(prev => prev.map(p => p.id === pid ? { ...p, checkins: [...(p.checkins || []), checkin] } : p));
  }
  function deleteCheckin(pid, idx) {
    setParticipants(prev => prev.map(p => {
      if (p.id !== pid) return p;
      const sorted = [...(p.checkins || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
      sorted.splice(idx, 1);
      return { ...p, checkins: sorted };
    }));
  }

  const scored = useMemo(() => {
    return participants
      .map(p => ({ p, progress: calcProgress(p.checkins, p.height) }))
      .sort((a, b) => (b.progress?.[sortBy] ?? -Infinity) - (a.progress?.[sortBy] ?? -Infinity));
  }, [participants, sortBy]);

  const maxScore = Math.max(...scored.map(s => s.progress?.[sortBy] ?? 0), 0.01);
  const champion = scored.find(s => s.progress)?.p;
  const selectedP = participants.find(p => p.id === selectedId);

  const sortOptions = [
    ["composite","Overall"],["wtPct","Weight"],["bmiPct","BMI"],
    ["bfPct","Body Fat"],["fatMassPct","Fat Mass"],["leanPct","Lean Mass"],
    ["waistPct","Waist"],["whrPct","Waist/Ht"],
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#020817", fontFamily: "'Inter', system-ui, sans-serif", color: "#e2e8f0" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(180deg,#0c1a2e,#020817)", borderBottom: "1px solid #0f172a", padding: "24px 24px 18px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", color: "#4ade80", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>
            12-Week Transformation Challenge
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em" }}>
            Who Got in the <span style={{ color: "#4ade80" }}>Best Shape?</span>
          </h1>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 6, marginBottom: 0 }}>
            7 metrics · scored relative to each person's starting point · log check-ins anytime
          </p>
          <div style={{ display: "flex", gap: 24, marginTop: 14 }}>
            {[
              { label: "Participants", val: participants.length },
              { label: "Champion", val: champion?.name.split(" ")[0] || "—" },
              { label: "Total Check-ins", val: participants.reduce((a, p) => a + (p.checkins?.length || 0), 0) },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{s.val}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #1e293b", marginTop: 18 }}>
          {[["leaderboard","Leaderboard"],["breakdown","How Scoring Works"]].map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key); setSelectedId(null); }} style={{
              background: "none", border: "none", color: tab === key ? "#4ade80" : "#64748b",
              fontWeight: 700, fontSize: 14, padding: "8px 14px", cursor: "pointer",
              borderBottom: tab === key ? "2px solid #4ade80" : "2px solid transparent",
              marginBottom: -1, transition: "color 0.15s",
            }}>{label}</button>
          ))}
        </div>

        {tab === "leaderboard" && (
          <div style={{ marginTop: 16 }}>
            {selectedP ? (
              <ParticipantDetail
                p={selectedP}
                onBack={() => setSelectedId(null)}
                onAddCheckin={addCheckin}
                onDeleteCheckin={deleteCheckin}
                onDeleteParticipant={deleteParticipant}
              />
            ) : (
              <>
                {participants.length > 1 && (
                  <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "#475569", alignSelf: "center", whiteSpace: "nowrap" }}>Sort:</span>
                    {sortOptions.map(([key, label]) => (
                      <button key={key} onClick={() => setSortBy(key)} style={{
                        background: sortBy === key ? "#4ade80" : "#1e293b",
                        color: sortBy === key ? "#020817" : "#94a3b8",
                        border: "none", borderRadius: 20, padding: "5px 12px",
                        fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                      }}>{label}</button>
                    ))}
                  </div>
                )}

                {participants.length === 0 && !showAddForm && (
                  <div style={{ textAlign: "center", padding: "50px 20px", color: "#334155" }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>🏁</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#475569", marginBottom: 6 }}>No participants yet</div>
                    <div style={{ fontSize: 13, marginBottom: 20 }}>Add your first participant to get started.</div>
                    <Btn onClick={() => setShowAddForm(true)}>+ Add Participant</Btn>
                  </div>
                )}

                {participants.length > 0 && scored.map(({ p, progress }, i) => (
                  <LeaderCard key={p.id} p={p} rank={i} progress={progress} maxScore={maxScore}
                    isWinner={i === 0 && !!progress} onSelect={() => setSelectedId(p.id)} />
                ))}

                {participants.length > 0 && !showAddForm && (
                  <button onClick={() => setShowAddForm(true)} style={{
                    width: "100%", background: "none", border: "1.5px dashed #334155",
                    borderRadius: 14, padding: "13px", color: "#475569", fontSize: 14,
                    cursor: "pointer", marginTop: 4, fontWeight: 600,
                  }}>+ Add Participant</button>
                )}

                {showAddForm && (
                  <AddParticipantForm onSave={addParticipant} onCancel={() => setShowAddForm(false)} />
                )}
              </>
            )}
          </div>
        )}

        {tab === "breakdown" && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              All 7 metrics are scored as <em style={{ color: "#94a3b8" }}>% change from each person's first check-in</em>. BMI, Fat Mass, Lean Mass, and Waist-to-Height Ratio are auto-calculated.
            </div>
            <div style={{ background: "#0f172a", borderRadius: 14, padding: 20, border: "1px solid #1e293b", marginBottom: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 14, color: "#e2e8f0" }}>The 7 Metrics</div>
              {[
                [METRIC_COLORS.weight,  "⚖️",  "Weight",          "Entered at each check-in",       "Lower = better"],
                [METRIC_COLORS.bmi,    "📐",  "BMI",             "Weight / height² × 703",          "Lower = better"],
                [METRIC_COLORS.bodyFat,"🔥",  "Body Fat %",      "Entered at each check-in",       "Lower = better"],
                [METRIC_COLORS.fatMass,"🫀",  "Fat Mass (lbs)",  "Weight × Body Fat %",            "Lower = better"],
                [METRIC_COLORS.leanMass,"💪", "Lean Mass (lbs)", "Weight − Fat Mass",              "Higher = better"],
                [METRIC_COLORS.waist,  "📏",  "Waist Size",      "Entered at each check-in",       "Lower = better"],
                [METRIC_COLORS.whr,    "📊",  "Waist-to-Height", "Waist ÷ Height",                 "Lower = better"],
              ].map(([color, icon, label, calc, note]) => (
                <div key={label} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 18, minWidth: 24 }}>{icon}</span>
                  <div>
                    <span style={{ fontWeight: 700, color, fontSize: 13 }}>{label}</span>
                    <span style={{ color: "#475569", fontSize: 12 }}> · {calc} · <em>{note}</em></span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: "#0f172a", borderRadius: 14, padding: 16, border: "1px solid #1e293b" }}>
              <div style={{ fontWeight: 700, marginBottom: 10, color: "#e2e8f0" }}>How Check-ins Work</div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>
                Each participant logs their measurements whenever they want — weekly, bi-weekly, or at any point.
                The score always compares their <strong style={{ color: "#94a3b8" }}>most recent check-in</strong> against
                their <strong style={{ color: "#94a3b8" }}>very first check-in</strong>, so the leaderboard updates
                in real time as new data comes in. You only need to enter weight, waist, and body fat % —
                everything else is calculated automatically from the participant's height on file.
              </div>
            </div>
          </div>
        )}
        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
