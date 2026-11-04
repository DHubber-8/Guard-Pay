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
export const STAFF = { "staff-diana": "Diana R.", "staff-kevin": "Kevin L.", "staff-ana": "Ana P." };

export const money = (v) => `$${Number(v).toFixed(2)}`;
export const due = (h) => {
  if (h >= 999) return "–";
  if (h < 48) return `${Math.max(h, 0)} h`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"}`;
};
