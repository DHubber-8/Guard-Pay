// Every route in the app. Tip: open /screens to see a clickable list of all screens.
import { useEffect } from "react";
import { Routes, Route, useLocation, Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { SHOW_SCREENS_LINK } from "./config";
import ConsoleLayout from "./layouts/ConsoleLayout";
import SignIn from "./pages/console/SignIn";
import Overview from "./pages/console/Overview";
import Queue from "./pages/console/Queue";
import CaseView from "./pages/console/CaseView";
import AccountCheck from "./pages/console/AccountCheck";
import Flags from "./pages/console/Flags";
import Insights from "./pages/console/Insights";
import AuditLog from "./pages/console/AuditLog";
import { States, ScreensIndex } from "./pages/extras/Extras";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

/** Testing helper: jump to the list of all screens from anywhere. */
function ScreensTab() {
  const { pathname } = useLocation();
  if (!SHOW_SCREENS_LINK || pathname === "/screens") return null;
  return <Link to="/screens" className="screens-tab" title="All screens (testing only)"><LayoutGrid size={16} /><span>All screens</span></Link>;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <ScreensTab />
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
        <Route path="*" element={<ScreensIndex />} />
      </Routes>
    </>
  );
}
