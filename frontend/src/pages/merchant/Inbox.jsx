// 08 Inbox (AG Grid). Filter with ?type=dispute | orderhelp | risk | delivery
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz } from "ag-grid-community";
import { api } from "../../api";
import { Badge, RiskBadge, Card, Chips } from "../../components/ui";
import { TYPE_LABEL } from "../../mock/data";

const gridTheme = themeQuartz.withParams({
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 15,
  foregroundColor: "#14232e",
  headerBackgroundColor: "#f4f7f9",
  headerTextColor: "#5f6c75",
  borderColor: "#e0e7ec",
  rowHoverColor: "#f4f7f9",
  selectedRowBackgroundColor: "#eef4f7",
  accentColor: "#1f3b4d",
  wrapperBorderRadius: 16,
  rowHeight: 56,
  headerHeight: 48,
});

const TYPE_TONE = { dispute: "high", orderhelp: "info", risk: "medium", delivery: "neutral" };

export default function Inbox() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const type = params.get("type") || "all";
  const { data: cases = [] } = useQuery({ queryKey: ["cases"], queryFn: api.getCases });

  const rows = type === "all" ? cases : cases.filter((c) => c.type === type);
  const count = (t) => cases.filter((c) => c.type === t).length;

  const columns = useMemo(() => [
    { field: "type", headerName: "Type", width: 140, cellRenderer: (p) => <Badge level={TYPE_TONE[p.value]}>{TYPE_LABEL[p.value]}</Badge> },
    { field: "buyer", headerName: "Buyer", flex: 1, minWidth: 140 },
    { field: "order", headerName: "Order", width: 110 },
    { field: "title", headerName: "Case", flex: 1.4, minWidth: 200 },
    { field: "amount", headerName: "Amount", width: 120, valueFormatter: (p) => `$${p.value.toFixed(2)}` },
    {
      field: "deadlineHours", headerName: "Deadline", width: 130, sort: "asc",
      cellRenderer: (p) => <span style={{ color: p.value < 24 ? "var(--danger)" : undefined, fontWeight: p.value < 24 ? 600 : 400 }}>{p.data.deadline}</span>,
    },
    { field: "risk", headerName: "Risk", width: 150, cellRenderer: (p) => <RiskBadge level={p.value} /> },
    { field: "status", headerName: "Status", flex: 1, minWidth: 160 },
  ], []);

  return (
    <div className="stack gap-24">
      <h1 className="h1">Inbox</h1>
      <Chips
        value={type}
        onChange={(v) => setParams(v === "all" ? {} : { type: v })}
        items={[
          { value: "all", label: `All · ${cases.length}` },
          { value: "orderhelp", label: `Order Help · ${count("orderhelp")}` },
          { value: "dispute", label: `Disputes · ${count("dispute")}` },
          { value: "risk", label: `Risk alerts · ${count("risk")}` },
          { value: "delivery", label: `Delivery · ${count("delivery")}` },
        ]}
      />
      <Card className="flush" style={{ height: 56 * Math.max(rows.length, 3) + 50, border: 0 }}>
        <AgGridReact
          theme={gridTheme}
          rowData={rows}
          columnDefs={columns}
          onRowClicked={(e) => nav(e.data.link)}
          rowStyle={{ cursor: "pointer" }}
          suppressCellFocus
        />
      </Card>
    </div>
  );
}
