// Every route in the app.
import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import ConsoleLayout from "./layouts/ConsoleLayout";
import SignIn from "./pages/console/SignIn";
import Overview from "./pages/console/Overview";
import Queue from "./pages/console/Queue";
import CaseView from "./pages/console/CaseView";
import AccountCheck from "./pages/console/AccountCheck";
import Flags from "./pages/console/Flags";
import Insights from "./pages/console/Insights";
import AuditLog from "./pages/console/AuditLog";
import { States } from "./pages/extras/Extras";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route element={<ConsoleLayout />}>
          <Route index element={<Overview />} />
          <Route path="queue" element={<Queue />} />
          <Route path="cases/:id" element={<CaseView />} />
          <Route path="checks" element={<AccountCheck />} />
          <Route path="flags" element={<Flags />} />
          <Route path="insights" element={<Insights />} />
          <Route path="audit" element={<AuditLog />} />
        </Route>
        <Route path="/extras/states" element={<States />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
