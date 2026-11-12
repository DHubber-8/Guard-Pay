// Display labels shared by the console screens.
export const REASON_LABEL = {
  unclassified: "Not classified yet",
  item_not_received: "Item not received",
  not_as_described: "Not as described",
  unauthorized: "Unauthorized transaction",
  unrecognized_charge: "Unrecognized charge",
  scam_report: "Scam report",
};

// overall_assessment from the findings contract. Decision support, never a verdict.
export const ASSESSMENT = {
  high_suspicion: ["high", "High suspicion"],
  medium_suspicion: ["medium", "Medium suspicion"],
  low_suspicion: ["low", "Low suspicion"],
  inconclusive: ["neutral", "Inconclusive"],
};

// Staff directory for the demo. The backend will return names with each case.
export const STAFF = { "staff-diana": "Diana R.", "staff-kevin": "Kevin L.", "staff-ana": "Ana P.", "delivery-watch": "Delivery watch", "deadline-watch": "Deadline watch" };

// Delivery watch (A7 worker): latest carrier status for a dispute's shipment.
// Same statuses as the mock carrier (backend/app/mocks/carrier.py), plus not_shipped.
export const DELIVERY = {
  delivered: ["low", "Delivered"],
  in_transit: ["info", "In transit"],
  stuck: ["high", "No carrier scan"],
  lost: ["high", "Lost"],
  not_shipped: ["medium", "Not shipped"],
};

export const money = (v) => `$${Number(v).toFixed(2)}`;
export const due = (h) => {
  if (h >= 999) return "–";
  if (h < 0) return "Overdue";
  if (h < 48) return `${h} h`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"}`;
};

// Scenario ids from the analysis pipeline (backend/app/rules/scenarios.py)
export const SCENARIO_LABEL = {
  item_not_received: "Item not received",
  item_not_as_described: "Item not as described",
  unauthorized_purchase: "Unauthorized purchase",
  refund_abuse: "Refund abuse",
  own_evidence_check: "Own evidence check",
};

// "shipment_status" -> "Shipment status"
export const humanize = (key = "") => {
  const s = String(key).replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};
