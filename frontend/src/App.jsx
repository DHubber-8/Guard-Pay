import { Link, Route, Routes } from "react-router-dom";

const pages = {
  Home: "Home",
  OrderHelp: "Order Help",
  PersonalCheck: "Personal Check",
  PersonalFindings: "Personal Findings",
  MerchantInbox: "Merchant Inbox",
  MerchantCase: "Merchant Case",
  MerchantSetup: "Merchant Setup",
};

function Placeholder({ name }) {
  // TODO: Replace this placeholder with the flow for the selected page.
  return <main><h1>{name}</h1><p>Not implemented.</p></main>;
}

function App() {
  // TODO: Add the shared application layout and real flow components.
  return (
    <>
      <nav>
        <Link to="/">Home</Link>{" | "}
        <Link to="/order-help">Order Help</Link>{" | "}
        <Link to="/personal/check">Personal Check</Link>{" | "}
        <Link to="/merchant/inbox">Merchant Inbox</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Placeholder name={pages.Home} />} />
        <Route path="/order-help" element={<Placeholder name={pages.OrderHelp} />} />
        <Route path="/personal/check" element={<Placeholder name={pages.PersonalCheck} />} />
        <Route path="/personal/findings/:id" element={<Placeholder name={pages.PersonalFindings} />} />
        <Route path="/merchant/inbox" element={<Placeholder name={pages.MerchantInbox} />} />
        <Route path="/merchant/case/:id" element={<Placeholder name={pages.MerchantCase} />} />
        <Route path="/merchant/setup" element={<Placeholder name={pages.MerchantSetup} />} />
      </Routes>
    </>
  );
}

export default App;
