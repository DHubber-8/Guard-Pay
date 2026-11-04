// Flags: accounts and transactions the system marked as suspicious, before or
// outside a dispute. Opening one runs an account / transaction check.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { api } from "../../api";
import { Card, Badge, Chips, Skeleton, Notice } from "../../components/ui";

// Delivery flags point at a case; account and transaction flags run a check.
const flagLink = (f) => (f.case ? `/cases/${f.case}` : `/checks?q=${encodeURIComponent(f.query)}`);

export default function Flags() {
  const nav = useNavigate();
  const [kind, setKind] = useState("all");
  const { data: flags, isError } = useQuery({ queryKey: ["flags"], queryFn: api.getFlags, retry: false });
  const rows = (flags || []).filter((f) => kind === "all" || f.kind === kind);
  return (
    <>
      <div className="page-head">
        <div><h1 className="h1">Flags</h1><p>Patterns in PayPal activity worth a closer look. A flag is a reason to check, not a finding of fraud.</p></div>
      </div>
      <Chips value={kind} onChange={setKind} items={[{ value: "all", label: "All" }, { value: "Account", label: "Accounts" }, { value: "Transaction", label: "Transactions" }, { value: "Delivery", label: "Delivery" }]} />
      {isError ? <Notice>Flags aren't available yet. They appear once the backend sends them.</Notice> : !flags ? <Skeleton h={300} /> : (
        <Card className="flush">
          <table className="table">
            <thead><tr><th>Level</th><th>Subject</th><th>Why it was flagged</th><th>When</th></tr></thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id} className="clickable" onClick={() => nav(flagLink(f))}>
                  <td><Badge level={f.level}><Flag size={12} />{f.level}</Badge></td>
                  <td><Link to={flagLink(f)} className="body-strong" onClick={(e) => e.stopPropagation()}>{f.subject}</Link><div className="small muted">{f.kind}</div></td>
                  <td>{f.text}</td>
                  <td className="small muted" style={{ whiteSpace: "nowrap" }}>{f.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
