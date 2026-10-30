// Fake data for the demo. Shapes roughly follow the backend tables
// (orders, help_requests, disputes, shipments, risk_assessments...).

export const merchant = {
  id: "m_diana_richella",
  name: "Diana Richella",
  website: "dianarichella.com",
  email: "hello@dianarichella.com",
  paypalEmail: "diana@dianarichella.com",
  paypalConnected: true,
};

export const stats = {
  openCases: 12, dueToday: 3,
  waitingApproval: 3, oldestWaitingHours: 18,
  disputesPrevented: 28,
  answeredInstantly: 64, riskyOrdersFlagged: 6,
  openDisputes: 3, nextDisputeDueDays: 2,
  misunderstandingsCleared: 64, avgMinutesToSolve: 4,
};

// type: dispute | orderhelp | risk | delivery
export const cases = [
  { id: "c1045", type: "dispute", title: "Item not received · says delivered", buyer: "Sam Lee", order: "#1045", amount: 64.0, deadline: "2 days", deadlineHours: 48, risk: "low", status: "Respond in 2 days", link: "/merchant/disputes/PP-D-27891" },
  { id: "c1051", type: "orderhelp", title: "Partial refund $15", buyer: "Maria Gomez", order: "#1051", amount: 15.0, deadline: "6 h", deadlineHours: 6, risk: "low", status: "Buyer waiting 18 h", link: "/merchant/cases/1051" },
  { id: "c1058", type: "risk", title: "New order from a flagged buyer", buyer: "J. Tan", order: "#1058", amount: 320.0, deadline: "Ship today", deadlineHours: 10, risk: "high", status: "Ship today", link: "/merchant/risk/1066" },
  { id: "c1032", type: "delivery", title: "Parcel held at customs", buyer: "Ahmed K.", order: "#1032", amount: 42.5, deadline: "–", deadlineHours: 999, risk: "low", status: "Message drafted", link: "/merchant/shipments" },
  { id: "c1060", type: "orderhelp", title: "Explained automatically", buyer: "Priya S.", order: "#1060", amount: 28.0, deadline: "–", deadlineHours: 999, risk: "low", status: "Solved", link: "/merchant/cases/1051" },
  { id: "c1022", type: "dispute", title: "Not as described", buyer: "Leo Martin", order: "#1022", amount: 110.0, deadline: "9 days", deadlineHours: 216, risk: "medium", status: "Evidence needed", link: "/merchant/disputes/PP-D-27891" },
  { id: "c1063", type: "orderhelp", title: "Wrong colour", buyer: "Chen Wei", order: "#1063", amount: 19.9, deadline: "1 day", deadlineHours: 24, risk: "low", status: "Offer drafted", link: "/merchant/cases/1051" },
  { id: "c1066", type: "risk", title: "New order from a flagged buyer", buyer: "Anna B.", order: "#1066", amount: 540.0, deadline: "Ship today", deadlineHours: 8, risk: "high", status: "Choose an action", link: "/merchant/risk/1066" },
  { id: "c1071", type: "dispute", title: "Unauthorised payment", buyer: "Rob T.", order: "#1071", amount: 85.0, deadline: "5 days", deadlineHours: 120, risk: "inconclusive", status: "AI reviewing", link: "/merchant/disputes/PP-D-27891" },
];

export const TYPE_LABEL = { dispute: "Dispute", orderhelp: "Order Help", risk: "Risk alert", delivery: "Delivery" };

export const orderHelpCase = {
  id: "1051", order: "#1051", buyer: "Maria Gomez", buyerEmail: "maria.g@mail.com", total: 40,
  reason: "Damaged item",
  message: "One of the two mugs arrived with a crack on the handle. The other one is fine.",
  history: [
    { who: "Buyer", at: "28 Oct 09:12", text: "Reported a damaged item with 2 photos" },
    { who: "AI", at: "28 Oct 09:12", text: "Confirmed the order and sent the case to the store" },
  ],
  findings: {
    risk: "low", evidenceStatus: "partial",
    rows: [
      { kind: "verified", text: "Order delivered 27 Oct (DHL)", detail: "Matches carrier data" },
      { kind: "unverified", text: "Photos show a crack on 1 of 2 mugs", detail: "From the buyer. No signs of editing found" },
      { kind: "missing", text: "Packaging photo", detail: "Optional. Helps with the carrier claim" },
    ],
    action: "Offer a partial refund of $15 for the damaged mug.",
  },
  offers: [
    { id: "partial", title: "Partial refund", sub: "Refund $15 for the damaged mug", amount: 15, recommended: true },
    { id: "full", title: "Full refund", sub: "Refund $40.00", amount: 40 },
    { id: "replace", title: "Send a replacement", sub: "Ship one new mug", amount: 0 },
  ],
  details: [["Order", "#1051"], ["Paid", "$40.00 via PayPal"], ["Items", "2 × Speckled mug"], ["Delivered", "27 Oct · DHL 7781 2234"]],
};

export const disputeCase = {
  id: "PP-D-27891", order: "#1045", buyer: "Sam Lee", reason: "Item not received", why: "Buyer says tracking shows delivered but the parcel isn't there", amount: 64, dueIn: "2 days",
  timeline: [
    { date: "12 Oct", text: "Order paid · $64.00" },
    { date: "13 Oct", text: "Shipped with tracking DHL 5521 0098" },
    { date: "18 Oct", text: "Delivered, signed by \"S. LEE\"" },
    { date: "26 Oct", text: "Buyer opened a PayPal dispute: item not received", alert: true },
  ],
  evidence: [
    { kind: "verified", title: "Tracking shows delivered", sub: "Verified · from carrier" },
    { kind: "verified", title: "Recipient signature", sub: "Verified · from carrier" },
    { kind: "verified", title: "Messages with the buyer", sub: "Verified · 3 messages" },
    { kind: "missing", title: "Photo of delivery location", sub: "Not provided · recommended" },
  ],
  evidenceStatus: "partial",
  draft:
    "The order was shipped on 13 Oct with DHL tracking 5521 0098 and delivered on 18 Oct. The carrier recorded a signature from \"S. LEE\" at the shipping address the buyer provided. We have attached the tracking history, the signature record and our messages with the buyer.",
};

export const riskCase = {
  order: "#1066", buyer: "Anna B.", email: "anna.b@mail.com", total: 540, items: "6 × Large vase",
  reasons: [
    "4 \"item not received\" claims at other stores using our tool in 60 days",
    "Shipping and billing addresses are in different countries",
    "Order value is 5× this store's average",
  ],
  actions: [
    { id: "sign", title: "Ship with signature on delivery", sub: "Recommended · protects you if the buyer claims non-delivery" },
    { id: "confirm", title: "Confirm the address with the buyer", sub: "We send a short email before you ship" },
    { id: "cancel", title: "Cancel and refund", sub: "Full refund of $540.00" },
  ],
};

export const shipments = [
  { order: "#1032", buyer: "Ahmed K.", carrier: "DHL", shipped: 20, expected: 28, actual: null, now: 29, status: ["medium", "Held at customs"] },
  { order: "#1040", buyer: "Rita P.", carrier: "SingPost", shipped: 19, expected: 27, actual: null, now: 29, status: ["high", "Delayed 3 days"] },
  { order: "#1047", buyer: "Tom H.", carrier: "FedEx", shipped: 24, expected: 30, actual: null, now: 29, status: ["low", "On time"] },
  { order: "#1049", buyer: "Lina M.", carrier: "DHL", shipped: 25, expected: 31, actual: null, now: 29, status: ["low", "On time"] },
  { order: "#1053", buyer: "Omar S.", carrier: "UPS", shipped: 21, expected: 29, actual: null, now: 29, status: ["high", "Failed delivery"] },
  { order: "#1044", buyer: "Grace O.", carrier: "DHL", shipped: 18, expected: 25, actual: 24, now: 29, status: ["low", "Delivered"] },
];

export const insights = {
  weeks: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
  orderHelp: [9, 12, 10, 15, 14, 18, 16, 20],
  disputes: [5, 4, 4, 3, 3, 2, 2, 1],
  scams: [1, 2, 1, 3, 2, 2, 4, 3],
  reasons: [
    ["Item not received", 45], ["Damaged in transit", 22], ["Not as described", 16], ["Wrong item", 9], ["Other", 8],
  ],
  products: [
    ["Speckled mug", 14, "Damaged in transit", "6.2%"],
    ["Large vase", 9, "Not as described", "4.8%"],
    ["Plate set", 5, "Item not received", "1.9%"],
    ["Tea bowl", 3, "Wrong colour", "1.1%"],
  ],
};

export const scamHistory = [
  { id: "s1", title: "\"Your parcel is on hold\" SMS", when: "2 days ago", risk: "high" },
  { id: "s2", title: "Marketplace buyer asking to pay outside PayPal", when: "Last week", risk: "medium" },
  { id: "s0", title: "Email: \"Your account will be closed\"", when: "3 weeks ago", risk: "high" },
];

export const buyerOrder = {
  store: "Diana Richella", order: "#1032", email: "ahmed.k@mail.com", item: "Speckled mug ×2", paid: "20 Oct",
  carrier: "DHL", tracking: "7781 2290 11",
  tracking_steps: [
    { label: "Shipped", date: "20 Oct", done: true },
    { label: "Arrived in Singapore", date: "25 Oct", done: true },
    { label: "Held at customs", date: "26 Oct", done: true },
    { label: "Out for delivery", date: "~28 Oct", done: false },
  ],
};
