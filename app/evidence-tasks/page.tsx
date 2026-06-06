"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";

type EvidenceTask = {
  id: string;
  company_code: string | null;
  company_name: string | null;
  category_code: string | null;
  task_type: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  task_status: string;
  remarks: string | null;
  source_context: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export default function EvidenceTasksPage() {
  const [tasks, setTasks] = useState<EvidenceTask[]>([]);
  const [selected, setSelected] = useState<EvidenceTask | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    let query = supabase
      .from("evidence_update_tasks")
      .select("*")
      .order("priority", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1000);

    if (statusFilter !== "ALL") query = query.eq("task_status", statusFilter);
    if (priorityFilter !== "ALL") query = query.eq("priority", priorityFilter);

    const { data, error } = await query;

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const list = (data || []) as EvidenceTask[];
    setTasks(list);
    setSelected((current) => {
      if (!list.length) return null;
      if (!current) return list[0];
      return list.find((task) => task.id === current.id) || list[0];
    });
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter]);

  const filteredTasks = tasks.filter((task) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      task.company_code?.toLowerCase().includes(q) ||
      task.company_name?.toLowerCase().includes(q) ||
      task.category_code?.toLowerCase().includes(q) ||
      task.task_type?.toLowerCase().includes(q) ||
      task.priority?.toLowerCase().includes(q) ||
      task.remarks?.toLowerCase().includes(q)
    );
  });

  const summary = useMemo(() => {
    return tasks.reduce(
      (acc, task) => {
        const p = task.priority || "MEDIUM";
        if (p === "CRITICAL") acc.critical++;
        else if (p === "HIGH") acc.high++;
        else if (p === "MEDIUM") acc.medium++;
        else acc.low++;
        if (task.task_status === "OPEN") acc.open++;
        if (task.task_status === "DONE") acc.done++;
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0, open: 0, done: 0 }
    );
  }, [tasks]);

  async function updateTask(status: string) {
    if (!selected) return;
    setSaving(true);
    setMessage("");
    setError("");

    const now = new Date().toISOString();
    const payload: any = {
      task_status: status,
      updated_at: now,
      completed_at: status === "DONE" ? now : null,
    };

    const { error } = await supabase.from("evidence_update_tasks").update(payload).eq("id", selected.id);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setMessage(`Task marked as ${status}.`);
    setSaving(false);
    await loadData();
  }

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">Evidence Update Tasks</div>
          <div className="module-subtitle">
            Renewal, expired document replacement, missing evidence and verification task queue.
          </div>
        </div>
        <button className="compact-button-light" onClick={loadData} disabled={loading || saving}>
          Refresh
        </button>
      </div>

      <section style={statsGrid}>
        <MiniStat label="Loaded Tasks" value={tasks.length} />
        <MiniStat label="Open" value={summary.open} />
        <MiniStat label="Critical" value={summary.critical} />
        <MiniStat label="High" value={summary.high} />
        <MiniStat label="Medium" value={summary.medium} />
      </section>

      {message ? <div style={notice}>{message}</div> : null}
      {error ? <div style={errorBox}>{error}</div> : null}

      <div style={layout}>
        <section className="compact-card" style={leftPanel}>
          <div style={filterGrid}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search company / category / task..."
              style={inputStyle}
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={inputStyle}>
              <option value="OPEN">Open</option>
              <option value="DONE">Done</option>
              <option value="ALL">All</option>
            </select>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} style={inputStyle}>
              <option value="ALL">All Priority</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div style={listWrap}>
            {loading ? <div style={notice}>Loading...</div> : null}
            {!loading && filteredTasks.length === 0 ? <div className="muted">No task found.</div> : null}

            {filteredTasks.map((task) => {
              const active = selected?.id === task.id;
              return (
                <button
                  key={task.id}
                  onClick={() => setSelected(task)}
                  style={{ ...taskButton, ...(active ? taskButtonActive : {}) }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <b>{task.company_code || "-"}</b>
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <div>{task.company_name || "-"}</div>
                  <div className="muted">
                    {task.category_code || "-"} / {task.task_type || "-"}
                    {task.due_date ? ` / Due ${task.due_date}` : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="compact-card" style={rightPanel}>
          {!selected ? (
            <div className="muted">Select task.</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                <div>
                  <h2 style={h2}>{selected.company_code || "-"} — {selected.company_name || "-"}</h2>
                  <div className="muted">Task ID: {selected.id}</div>
                </div>
                <PriorityBadge priority={selected.priority} />
              </div>

              <div style={metaGrid}>
                <Info label="Category" value={selected.category_code || "-"} />
                <Info label="Task Type" value={selected.task_type || "-"} />
                <Info label="Status" value={selected.task_status || "-"} />
                <Info label="Due Date" value={selected.due_date || "-"} />
                <Info label="Assigned To" value={selected.assigned_to || "-"} />
                <Info label="Source" value={selected.source_context || "-"} />
                <Info label="Created" value={selected.created_at || "-"} />
                <Info label="Completed" value={selected.completed_at || "-"} />
              </div>

              <section style={noteBox}>
                <b>Remarks</b>
                <br />
                {selected.remarks || "-"}
              </section>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="compact-button-dark" onClick={() => updateTask("DONE")} disabled={saving || selected.task_status === "DONE"}>
                  Mark Done
                </button>
                <button className="compact-button-light" onClick={() => updateTask("OPEN")} disabled={saving || selected.task_status === "OPEN"}>
                  Reopen
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="compact-card">
      <span className="muted">{label}</span>
      <br />
      <b>{value}</b>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div style={infoBox}>
      <span className="muted">{label}</span>
      <br />
      <b>{value}</b>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const style: CSSProperties = {
    display: "inline-block",
    padding: "2px 7px",
    borderRadius: 999,
    background: "#e5e7eb",
    color: "#374151",
    fontWeight: 700,
    whiteSpace: "nowrap",
  };

  if (priority === "CRITICAL") {
    style.background = "#fee2e2";
    style.color = "#991b1b";
  } else if (priority === "HIGH") {
    style.background = "#ffedd5";
    style.color = "#9a3412";
  } else if (priority === "MEDIUM") {
    style.background = "#fef3c7";
    style.color = "#92400e";
  } else if (priority === "LOW") {
    style.background = "#dcfce7";
    style.color = "#166534";
  }

  return <span style={style}>{priority || "-"}</span>;
}

const statsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 130px)",
  gap: 8,
  marginBottom: 8,
};

const layout: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "420px minmax(0, 1fr)",
  gap: 10,
};

const leftPanel: CSSProperties = { padding: 10 };
const rightPanel: CSSProperties = { padding: 12 };

const filterGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 92px 120px",
  gap: 6,
  marginBottom: 8,
};

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 30,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#d1d5db",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 11,
};

const listWrap: CSSProperties = {
  display: "grid",
  gap: 6,
  maxHeight: "72vh",
  overflow: "auto",
};

const taskButton: CSSProperties = {
  textAlign: "left",
  padding: 8,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#d1d5db",
  borderRadius: 8,
  background: "#fff",
  cursor: "pointer",
  fontSize: 10,
};

const taskButtonActive: CSSProperties = {
  borderColor: "#111827",
  background: "#f3f4f6",
};

const h2: CSSProperties = { fontSize: 14, margin: "0 0 4px" };

const metaGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 8,
  marginTop: 10,
  marginBottom: 8,
};

const infoBox: CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#e5e7eb",
  borderRadius: 8,
  padding: 8,
  background: "#fff",
};

const noteBox: CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#e5e7eb",
  borderRadius: 8,
  padding: 8,
  background: "#f9fafb",
};

const notice: CSSProperties = {
  marginBottom: 8,
  padding: 8,
  background: "#ecfeff",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#67e8f9",
  borderRadius: 8,
};

const errorBox: CSSProperties = {
  marginBottom: 8,
  padding: 8,
  background: "#fee2e2",
  color: "#991b1b",
  borderRadius: 8,
};
