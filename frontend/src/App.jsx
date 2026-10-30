// Every route in the app. Numbers match the frames in Figma ("Wireframes v2").
// Tip: open /screens to see a clickable list of all screens.
import { useEffect } from "react";
import { Routes, Route, useLocation, Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { SHOW_SCREENS_LINK } from "./config";
import { LandingLayout, MerchantLayout } from "./layouts/layouts";
import Landing from "./pages/landing/Landing";
import FeaturePage from "./pages/landing/FeaturePage";
import { ChooseType, SignIn, SignUpIndividual, SignUpBusiness } from "./pages/auth/auth";
import Onboarding from "./pages/onboarding/Onboarding";
import Home from "./pages/merchant/Home";
import Inbox from "./pages/merchant/Inbox";
import { OrderHelpCase, DisputeCase, RiskAlert } from "./pages/merchant/Cases";
import { Shipments, Insights, MerchantScamCheck, Settings } from "./pages/merchant/More";
import { IndividualHome, IndividualAccount, IndividualHistory } from "./pages/individual/Individual";
import { ScamIntro, ScamDescribe, ScamAnalyzing, ScamQuestions, ScamResult, ScamDecision } from "./pages/scam/ScamCheck";
import { DemoStore, FindOrder, Problem, InstantAnswer, Waiting, Offer, Resolved, PayPalGuide } from "./pages/orderhelp/OrderHelp";
import { Emails, States, ScreensIndex } from "./pages/extras/Extras";

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

/** Testing helper: jump to the list of all screens from anywhere. */
function ScreensTab() {
  const { pathname } = useLocation();
  if (!SHOW_SCREENS_LINK || pathname === "/screens") return null;
  return <Link to="/screens" className="screens-tab" title="All screens (testing only)"><LayoutGrid size={16} /><span>All screens</span></Link>;
}

export default function App() {
  const { pathname } = useLocation();
  // Layout pages animate their own content; other pages animate as a whole.
  const animKey = pathname.startsWith("/merchant") ? "merchant" : pathname === "/" || pathname.startsWith("/features") ? "landing" : pathname;
  return (
    <>
      <ScrollToTop />
      <ScreensTab />
      <div key={animKey} className="route-anim">
      <Routes>
        {/* A · Public site */}
        <Route element={<LandingLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/features/:id" element={<FeaturePage />} />
        </Route>

        {/* B · Auth */}
        <Route path="/start" element={<ChooseType />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup/individual" element={<SignUpIndividual />} />
        <Route path="/signup/business" element={<SignUpBusiness />} />

        {/* C · Merchant */}
        <Route path="/onboarding/:step" element={<Onboarding />} />
        <Route path="/merchant" element={<MerchantLayout />}>
          <Route index element={<Home />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="cases/:id" element={<OrderHelpCase />} />
          <Route path="disputes/:id" element={<DisputeCase />} />
          <Route path="risk/:id" element={<RiskAlert />} />
          <Route path="shipments" element={<Shipments />} />
          <Route path="insights" element={<Insights />} />
          <Route path="scam-check" element={<MerchantScamCheck />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* D · Individual */}
        <Route path="/me" element={<IndividualHome />} />
        <Route path="/me/account" element={<IndividualAccount />} />
        <Route path="/me/history" element={<IndividualHistory />} />

        {/* E · Scam Check */}
        <Route path="/scam-check" element={<ScamIntro />} />
        <Route path="/scam-check/new" element={<ScamDescribe />} />
        <Route path="/scam-check/analyzing" element={<ScamAnalyzing />} />
        <Route path="/scam-check/questions" element={<ScamQuestions />} />
        <Route path="/scam-check/result" element={<ScamResult />} />
        <Route path="/scam-check/decision" element={<ScamDecision />} />

        {/* F · Order Help (buyer, no login) */}
        <Route path="/store" element={<DemoStore />} />
        <Route path="/help/:storeId" element={<FindOrder />} />
        <Route path="/help/:storeId/problem" element={<Problem />} />
        <Route path="/help/:storeId/answer" element={<InstantAnswer />} />
        <Route path="/help/:storeId/waiting" element={<Waiting />} />
        <Route path="/help/:storeId/offer" element={<Offer />} />
        <Route path="/help/:storeId/resolved" element={<Resolved />} />
        <Route path="/help/:storeId/paypal" element={<PayPalGuide />} />

        {/* G · Extras */}
        <Route path="/extras/emails" element={<Emails />} />
        <Route path="/extras/states" element={<States />} />
        <Route path="/screens" element={<ScreensIndex />} />
        <Route path="*" element={<ScreensIndex />} />
      </Routes>
      </div>
    </>
  );
}
