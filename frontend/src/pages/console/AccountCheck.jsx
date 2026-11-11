// Account / transaction check: staff look up any PayPal account (email) or
// transaction ID and see whether anything looks suspicious. Uses only data
// PayPal already holds. Any account action still needs a staff decision.
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, UserSearch, ArrowRight } from "lucide-react";
import { api } from "../../api";
import { Button, Card, KV, Notice, Skeleton } from "../../components/ui";
import FindingsPanel from "../../components/FindingsPanel";
import { CHECK_EXAMPLES } from "../../mock/console";
import { USE_MOCK } from "../../config";

export default function AccountCheck() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const [input, setInput] = useState(q);
  useEffect(() => setInput(q), [q]);
  const { data, isFetching, isError, error } = useQuery({ queryKey: ["check", q], queryFn: () => api.checkAccount(q), enabled: !!q, retry: false });
  const run = (v) => { const s = v.trim(); if (s) setParams({ q: s }); };

  return (
    <>
      <div className="page-head">
        <div><h1 className="h1">Account and transaction check</h1><p>Look up a PayPal account or a transaction to see if anything looks suspicious.</p></div>
      </div>
      <Card>
        <form className="row gap-12 wrap" onSubmit={(e) => { e.preventDefault(); run(input); }}>
          <div className="top-search grow" style={{ maxWidth: "none" }}>
            <Search size={16} />
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Email address or transaction ID" aria-label="Email address or transaction ID" />
          </div>
          <Button type="submit" disabled={!input.trim()}><UserSearch size={16} />Check</Button>
        </form>
        {USE_MOCK && (
          <div className="row gap-8 wrap small"><span className="muted">Try:</span>
            {CHECK_EXAMPLES.map((x) => <button key={x} type="button" className="chip" onClick={() => run(x)}>{x}</button>)}
          </div>
        )}
      </Card>

      {!q && <Notice>Results show what PayPal's records say and why. They are decision support, not proof of fraud.</Notice>}
      {q && isFetching && <><Skeleton h={120} /><Skeleton h={220} /></>}
      {q && !isFetching && isError && (
        <Card style={{ alignItems: "center", textAlign: "center", padding: 40 }}>
          {error?.status === 404 ? (
            <>
              <h2 className="h3">No account or transaction found for "{q}"</h2>
              <p className="text-2">Check the email or transaction ID and try again.</p>
            </>
          ) : (
            <>
              <h2 className="h3">The check didn't work</h2>
              <p className="text-2">We couldn't reach PayPal's records. Nothing was changed. Try again in a moment.</p>
            </>
          )}
        </Card>
      )}
      {q && !isFetching && data && (
        <div className="cols">
          <div className="stack gap-24">
            <Card>
              <span className="caption muted">{data.kind}</span>
              <div className="stack gap-4"><h2 className="h2">{data.title}</h2><span className="small muted">{data.sub}</span></div>
              <KV rows={data.facts} />
            </Card>
            <FindingsPanel title="What the AI found" risk={data.risk} evidenceStatus={data.evidenceStatus} rows={data.rows} action={data.action} />
          </div>
          <Card>
            <h2 className="h3">Related cases</h2>
            {data.cases.length ? data.cases.map((id) => (
              <Link key={id} to={`/cases/${id}`} className="row between link">{id}<ArrowRight size={16} /></Link>
            )) : <p className="small muted">No disputes for this {data.kind.toLowerCase()}.</p>}
            <Notice>Limits, holds or closures go to the risk team and need a staff decision. The AI never acts on an account by itself.</Notice>
          </Card>
        </div>
      )}
    </>
  );
}
