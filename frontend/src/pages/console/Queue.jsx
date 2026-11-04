// Dispute queue (AG Grid). Every open dispute PayPal sent us, sorted by deadline.
// Views: ?view=mine | due | high | waiting | resolved
import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz } from "ag-grid-community";
import { Flag } from "lucide-react";
import { api } from "../../api";
import { Badge, RiskBadge, Card, Chips } from "../../components/ui";
import { EvidenceBadge } from "../../components/FindingsPanel";
import { REASON_LABEL, STAFF, money, due } from "../../labels";
import { useStaff } from "../../session";

const gridTheme = themeQuartz.withParams({
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 14,
  foregroundColor: "#001435",
  headerBackgroundColor: "#f5f7fa",
  headerTextColor: "#5e6779",
  borderColor: "#dfe3eb",
  rowHoverColor: "#eef5ff",
  selectedRowBackgroundColor: "#eef5ff",
  accentColor: "#0070e0",
  wrapperBorderRadius: 12,
  rowHeight: 52,
  headerHeight: 44,
});

const VIEWS = {
  all: (c) => c.status !== "Resolved",
  mine: (c, me) => c.status !== "Resolved" && c.assignee === me,
  due: (c) => c.status !== "Resolved" && c.deadlineHours < 24,
  high: (c) => c.status !== "Resolved" && c.risk === "high",
  waiting: (c) => c.status.startsWith("Waiting"),
  resolved: (c) => c.status === "Resolved",
};

export default function Queue() {
  const nav = useNavigate();
  const staff = useStaff();
  const [params, setParams] = useSearchParams();
  const view = VIEWS[params.get("view")] ? params.get("view") : "all";
  const { data: cases = [], isLoading } = useQuery({ queryKey: ["cases"], queryFn: api.getCases });
  const rows = cases.filter((c) => VIEWS[view](c, staff.id));
  const count = (v) => cases.filter((c) => VIEWS[v](c, staff.id)).length;

  const columns = useMemo(() => [
    // A real link so keyboard and screen reader users can open the case too
    { field: "id", headerName: "Case", width: 140, cellRenderer: (p) => (
      <Link to={`/cases/${p.value}`} className="row gap-8 body-strong case-link" onClick={(e) => e.stopPropagation()}>
        {p.data.flagged && <Flag size={14} color="var(--danger)" aria-label="Flagged" />}{p.value}
      </Link>
    ) },
    { field: "reason", headerName: "Reason", flex: 1, minWidth: 170, valueFormatter: (p) => REASON_LABEL[p.value] ?? p.value },
    { field: "stage", headerName: "Stage", width: 92 },
    { field: "buyer", headerName: "Buyer", flex: 1, minWidth: 150 },
    { field: "merchant", headerName: "Merchant", flex: 1, minWidth: 160 },
    { field: "amount", headerName: "Amount", width: 110, valueFormatter: (p) => money(p.value) },
    { field: "deadlineHours", headerName: "Due", width: 100, sort: "asc",
      cellRenderer: (p) => <span className={p.value < 24 ? "deadline soon" : ""}>{due(p.value)}</span> },
    { field: "risk", headerName: "Risk", width: 136, cellRenderer: (p) => <RiskBadge level={p.value} /> },
    { field: "evidenceStatus", headerName: "Evidence", width: 176, cellRenderer: (p) => <EvidenceBadge status={p.value} /> },
    { field: "status", headerName: "Status", width: 180, cellRenderer: (p) => <Badge level={p.value === "Resolved" ? "low" : p.value.startsWith("Waiting") ? "neutral" : "info"}>{p.value}</Badge> },
    { field: "assignee", headerName: "Assigned", width: 120, valueFormatter: (p) => STAFF[p.value] ?? "–" },
  ], []);

  return (
    <>
      <div className="page-head">
        <div><h1 className="h1">Dispute queue</h1><p>Opened by buyers in PayPal and sent here automatically. Most urgent first.</p></div>
      </div>
      <Chips
        value={view}
        onChange={(v) => setParams(v === "all" ? {} : { view: v })}
        items={[
          { value: "all", label: `All open · ${count("all")}` },
          { value: "mine", label: `Assigned to me · ${count("mine")}` },
          { value: "due", label: `Due in 24 h · ${count("due")}` },
          { value: "high", label: `High risk · ${count("high")}` },
          { value: "waiting", label: `Waiting for info · ${count("waiting")}` },
          { value: "resolved", label: `Resolved · ${count("resolved")}` },
        ]}
      />
      <Card className="flush queue-grid" style={{ border: 0 }}>
        <AgGridReact
          theme={gridTheme}
          rowData={rows}
          columnDefs={columns}
          loading={isLoading}
          onRowClicked={(e) => nav(`/cases/${e.data.id}`)}
          rowStyle={{ cursor: "pointer" }}
          suppressCellFocus
          overlayNoRowsTemplate="No cases in this view."
        />
      </Card>
    </>
  );
}
