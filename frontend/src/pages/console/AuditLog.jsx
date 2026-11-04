// Audit log: every staff decision with the approver, time, AI recommendation and notes (docs/RULES.md §1).
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api";
import { Card, Badge, Skeleton } from "../../components/ui";
import { STAFF } from "../../labels";

const TONE = (d) => (d.startsWith("Approved") ? "low" : d.startsWith("Rejected") || d.startsWith("Chose") ? "medium" : d.startsWith("Edited") ? "info" : "neutral");

export default function AuditLog() {
  const { data: rows } = useQuery({ queryKey: ["audit"], queryFn: api.getAuditLog });
  return (
    <>
      <div className="page-head">
        <div><h1 className="h1">Audit log</h1><p>Every decision made in the console. The AI never moves money, rules on a case or acts on an account by itself.</p></div>
      </div>
      {!rows ? <Skeleton h={300} /> : (
        <Card className="flush">
          <table className="table">
            <thead><tr><th>Time</th><th>Case</th><th>Action</th><th>AI suggested</th><th>Decision</th><th>By</th><th>Notes</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.at + a.case + a.action}>
                  <td className="small" style={{ whiteSpace: "nowrap" }}>{a.at}</td>
                  <td><Link to={`/cases/${a.case}`} className="link">{a.case}</Link></td>
                  <td className="body-strong">{a.action}</td>
                  <td className="small text-2">{a.ai}</td>
                  <td><Badge level={TONE(a.decision)}>{a.decision}</Badge></td>
                  <td>{STAFF[a.by] ?? a.by}</td>
                  <td className="small text-2">{a.notes || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
