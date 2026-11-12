// Demo data for the PayPal staff console. Used while VITE_USE_MOCK is not "false".
// People and stores are the team's PayPal sandbox accounts (names only, no
// passwords). Everything else is synthetic, following docs/RULES.md.

export const staff = { id: "staff-diana", name: "Diana R.", initials: "DR", role: "Resolution specialist", team: "Disputes · US" };

// Merchants (BUSINESS sandbox accounts)
const M = {
  maya: { name: "Maya Storefront", email: "dh-merchant-1@business.example.com", since: "Mar 2021", disputeRate: "0.4%", sellerProtection: "Eligible" },
  daniel: { name: "Daniel Tradeworks", email: "dh-merchant-2@business.example.com", since: "Aug 2019", disputeRate: "0.9%", sellerProtection: "Eligible" },
  priya: { name: "Priya Goods", email: "dh-merchant-3@business.example.com", since: "Jan 2024", disputeRate: "2.1%", sellerProtection: "Not eligible (digital)" },
};
// Buyers (PERSONAL sandbox accounts)
const B = {
  alex: { name: "Alex Newbuyer", email: "dh-buyer-1@personal.example.com", since: "Sep 2026", disputes90d: 0, country: "US" },
  sam: { name: "Sam Repeat", email: "dh-buyer-2@personal.example.com", since: "May 2022", disputes90d: 1, country: "US" },
  jordan: { name: "Jordan Claims", email: "dh-buyer-3@personal.example.com", since: "Feb 2025", disputes90d: 5, country: "US" },
  taylor: { name: "Taylor Frequent", email: "dh-buyer-4@personal.example.com", since: "Jun 2018", disputes90d: 0, country: "US" },
  casey: { name: "Casey Subscriber", email: "dh-buyer-5@personal.example.com", since: "Nov 2023", disputes90d: 0, country: "US" },
  riley: { name: "Riley Scamtarget", email: "dh-buyer-6@personal.example.com", since: "Jan 2020", disputes90d: 0, country: "US" },
  morgan: { name: "Morgan Unrecognised", email: "dh-buyer-7@personal.example.com", since: "Apr 2017", disputes90d: 0, country: "US" },
};

// Shared synthetic Order Help and personal-check examples used by the buyer demo.
export const demoOrders = [
  { orderNumber: "1032", buyer: "Alex Newbuyer", email: B.alex.email, trackingSteps: [{ status: "delivered", text: "Package delivered" }] },
  { orderNumber: "1045", buyer: "Sam Repeat", email: B.sam.email, trackingSteps: [{ status: "in_transit", text: "Package accepted at carrier facility" }] },
  { orderNumber: "1051", buyer: "Jordan Claims", email: B.jordan.email, trackingSteps: [{ status: "stuck", text: "No scan for 7 days" }] },
  { orderNumber: "1066", buyer: "Taylor Frequent", email: B.taylor.email, trackingSteps: [{ status: "notracking", text: "No tracking number is available yet." }] },
];

export const personalCheckSamples = [
  { description: "A sender urgently asks for a password.", linkOrSender: "unknown@example.test", answers: ["I have not shared anything."] },
  { description: "A message asks for a gift card payment.", linkOrSender: "urgent@example.test", answers: ["It says I must act today."] },
];


// Queue rows. deadlineHours = time left before PayPal's response deadline.
export const cases = [
  { id: "PP-D-41027", reason: "item_not_received", stage: "Claim", merchant: M.daniel.name, buyer: B.jordan.name, amount: 186.0, deadlineHours: 30, risk: "high", evidenceStatus: "complete", status: "Needs review", assignee: "staff-diana", flagged: true },
  { id: "PP-D-41033", reason: "unauthorized", stage: "Claim", merchant: M.priya.name, buyer: B.morgan.name, amount: 420.0, deadlineHours: 14, risk: "high", evidenceStatus: "partial", status: "Needs review", assignee: "staff-diana", flagged: true },
  { id: "PP-D-41040", reason: "not_as_described", stage: "Claim", merchant: M.maya.name, buyer: B.alex.name, amount: 64.0, deadlineHours: 70, risk: "low", evidenceStatus: "partial", status: "Needs review", assignee: "staff-diana" },
  { id: "PP-D-41044", reason: "unrecognized_charge", stage: "Inquiry", merchant: M.daniel.name, buyer: B.casey.name, amount: 14.99, deadlineHours: 120, risk: "low", evidenceStatus: "complete", status: "Needs review", assignee: "staff-kevin" },
  { id: "PP-D-41051", reason: "item_not_received", stage: "Inquiry", merchant: M.maya.name, buyer: B.taylor.name, amount: 92.0, deadlineHours: 96, risk: "low", evidenceStatus: "complete", status: "Needs review", assignee: "staff-diana" },
  { id: "PP-D-41058", reason: "scam_report", stage: "Claim", merchant: "prize-claims-desk@example.com", buyer: B.riley.name, amount: 250.0, deadlineHours: 20, risk: "high", evidenceStatus: "partial", status: "Needs review", assignee: "staff-ana", flagged: true },
  { id: "PP-D-41062", reason: "not_as_described", stage: "Claim", merchant: M.priya.name, buyer: B.sam.name, amount: 230.0, deadlineHours: 52, risk: "medium", evidenceStatus: "partial", status: "Waiting for merchant", assignee: "staff-kevin" },
  { id: "PP-D-41066", reason: "item_not_received", stage: "Claim", merchant: M.daniel.name, buyer: B.alex.name, amount: 45.0, deadlineHours: 160, risk: "inconclusive", evidenceStatus: "missing", status: "Waiting for merchant", assignee: "staff-diana" },
  { id: "PP-D-40981", reason: "not_as_described", stage: "Claim", merchant: M.maya.name, buyer: B.taylor.name, amount: 48.0, deadlineHours: 999, risk: "low", evidenceStatus: "complete", status: "Resolved", assignee: "staff-ana" },
  { id: "PP-D-40977", reason: "item_not_received", stage: "Claim", merchant: M.daniel.name, buyer: B.casey.name, amount: 75.0, deadlineHours: 999, risk: "medium", evidenceStatus: "partial", status: "Resolved", assignee: "staff-diana" },
  { id: "PP-D-40990", reason: "item_not_received", stage: "Claim", merchant: M.maya.name, buyer: B.sam.name, amount: 38.5, deadlineHours: 999, risk: "low", evidenceStatus: "complete", status: "Resolved", assignee: "staff-diana" },
];

const tl = (date, text, alert) => ({ date, text, alert: !!alert });
const ev = (side, kind, text, detail) => ({ side, kind, text, detail });

// Full case details, keyed by dispute id. Anything not listed falls back to a
// generated detail built from the queue row.
export const caseDetails = {
  "PP-D-41027": {
    summary: "Buyer says the parcel never arrived. Carrier data shows it was delivered and signed for at the buyer's address. The buyer has opened 5 \"item not received\" claims in the last 90 days, 4 of them on delivered parcels.",
    assessment: "high_suspicion",
    transaction: { id: "9KX20417LM553201A", date: "8 Oct 2026", items: "1 × Wireless speaker", shipTo: "Matches buyer's PayPal address", tracking: "UPS 1Z 88A 2041 7730" },
    buyer: B.jordan, merchant: M.daniel,
    timeline: [tl("8 Oct", "Payment completed · $186.00"), tl("9 Oct", "Merchant added tracking (UPS)"), tl("14 Oct", "Delivered · signed \"J. CLAIMS\""), tl("22 Oct", "Buyer opened inquiry: item not received", true), tl("27 Oct", "Escalated to claim by buyer", true)],
    evidence: [
      ev("merchant", "verified", "Tracking shows delivered 14 Oct", "From UPS · checked by delivery watch"),
      ev("merchant", "verified", "Signature on delivery", "Name matches the account holder"),
      ev("buyer", "unverified", "Buyer statement: \"never arrived\"", "No police report or photo provided"),
      ev("buyer", "contradiction", "Buyer says nobody was home", "Carrier record shows an in-person signature"),
    ],
    flags: [
      { level: "high", text: "5 item-not-received claims in 90 days (PayPal average: under 1)" },
      { level: "high", text: "4 of those claims were on parcels marked delivered and signed" },
      { level: "medium", text: "Account opened 20 months ago; claims started in the last 3 months" },
    ],
    options: [
      { id: "seller", title: "Rule in favour of the seller", sub: "Delivery and signature are verified", recommended: true },
      { id: "info_buyer", title: "Ask the buyer for more information", sub: "e.g. a police report for a stolen parcel" },
      { id: "buyer_full", title: "Rule in favour of the buyer · refund $186.00", sub: "Money returns to the buyer" },
      { id: "escalate", title: "Escalate to the risk team", sub: "Review the buyer's claim pattern" },
    ],
    recommendation: "Recommend ruling for the seller and sending the buyer's claim history to the risk team for review.",
  },
  "PP-D-41033": {
    summary: "Account holder says they did not make this payment. The payment was made from a new device in another country 40 minutes after a password reset, and shipped to an address never used on this account.",
    assessment: "high_suspicion",
    transaction: { id: "3RT77104AB920033C", date: "27 Oct 2026", items: "2 × Smart watch", shipTo: "New address (not on account)", tracking: "Not shipped yet" },
    buyer: B.morgan, merchant: M.priya,
    timeline: [tl("27 Oct 02:10", "Password reset from new device", true), tl("27 Oct 02:50", "Payment completed · $420.00 · new device, country changed", true), tl("27 Oct 09:15", "Account holder reported an unauthorized payment", true)],
    evidence: [
      ev("paypal", "verified", "Login from a new device and country", "PayPal session record"),
      ev("paypal", "verified", "Password reset 40 minutes before payment", "PayPal security log"),
      ev("paypal", "verified", "Ship-to address never used on this account", "Account address history"),
      ev("merchant", "missing", "Merchant hasn't responded yet", "Response due in 14 h"),
    ],
    flags: [
      { level: "high", text: "Signs of an account takeover (new device + reset + new address)" },
      { level: "medium", text: "Merchant account is 10 months old with a 2.1% dispute rate" },
    ],
    options: [
      { id: "buyer_full", title: "Rule in favour of the account holder · refund $420.00", sub: "Unauthorized payments are covered by Purchase Protection", recommended: true },
      { id: "info_merchant", title: "Ask the merchant to hold the shipment", sub: "The order hasn't shipped yet" },
      { id: "secure", title: "Secure the account", sub: "Sign out all devices and require a new password" },
      { id: "escalate", title: "Escalate to the risk team" },
    ],
    recommendation: "Recommend refunding the account holder, asking the merchant not to ship, and securing the account.",
  },
  "PP-D-41040": {
    summary: "Buyer received a mug with a cracked handle and sent photos. The merchant's listing shows the same mug. Both accounts have a clean history.",
    assessment: "inconclusive",
    transaction: { id: "6HY01283PQ771040D", date: "20 Oct 2026", items: "2 × Speckled mug", shipTo: "Matches buyer's PayPal address", tracking: "USPS 9400 1000 0000 0000 41" },
    buyer: B.alex, merchant: M.maya,
    timeline: [tl("20 Oct", "Payment completed · $64.00"), tl("25 Oct", "Delivered"), tl("26 Oct", "Buyer opened claim: not as described, 2 photos", true)],
    evidence: [
      ev("paypal", "verified", "Delivered 25 Oct", "From USPS · checked by delivery watch"),
      ev("buyer", "unverified", "2 photos of a cracked handle", "No signs of editing found"),
      ev("merchant", "missing", "Packaging photo", "Optional; helps with a carrier claim"),
    ],
    flags: [],
    options: [
      { id: "partial", title: "Partial refund · $32.00", sub: "One of the two mugs is damaged", recommended: true },
      { id: "buyer_full", title: "Full refund · $64.00 after return" },
      { id: "info_merchant", title: "Ask the merchant for a packaging photo" },
    ],
    recommendation: "Consider a partial refund of $32.00 for the damaged mug. Both accounts are in good standing.",
  },
  "PP-D-41044": {
    summary: "Buyer doesn't recognise a $14.99 charge. It is the second month of a subscription the buyer agreed to on 28 Sep; the merchant's name on the statement differs from the shop name.",
    assessment: "low_suspicion",
    transaction: { id: "1BA55021CD441044E", date: "28 Oct 2026", items: "Monthly plan", shipTo: "Digital", tracking: "–" },
    buyer: B.casey, merchant: M.daniel,
    timeline: [tl("28 Sep", "Buyer agreed to a recurring payment"), tl("28 Oct", "Second payment · $14.99"), tl("29 Oct", "Buyer asked about an unrecognised charge")],
    evidence: [
      ev("paypal", "verified", "Recurring payment agreement from 28 Sep", "Signed in from the buyer's usual device"),
      ev("paypal", "verified", "Statement name \"DTW*SERVICES\" belongs to Daniel Tradeworks", "Merchant profile"),
    ],
    flags: [],
    options: [
      { id: "explain", title: "Explain the charge to the buyer", sub: "Show the subscription and how to cancel it", recommended: true },
      { id: "buyer_full", title: "Refund $14.99 and cancel the subscription" },
    ],
    recommendation: "Recommend explaining the subscription and the statement name to the buyer. This looks like a misunderstanding.",
  },
  "PP-D-41058": {
    summary: "Account holder sent $250 as Friends and Family to claim a \"prize\" after a message on social media. The recipient account received 14 similar payments from different people in 48 hours.",
    assessment: "high_suspicion",
    transaction: { id: "8ZZ10058EF410058F", date: "28 Oct 2026", items: "Friends and Family payment", shipTo: "–", tracking: "–" },
    buyer: B.riley, merchant: { name: "prize-claims-desk@example.com", email: "prize-claims-desk@example.com", since: "Oct 2026", disputeRate: "–", sellerProtection: "Personal account" },
    timeline: [tl("28 Oct", "Friends and Family payment · $250.00"), tl("29 Oct", "Account holder reported a scam", true)],
    evidence: [
      ev("paypal", "verified", "Recipient received 14 F&F payments from new contacts in 48 h", "PayPal payment records"),
      ev("buyer", "unverified", "Screenshot of the \"prize\" message", "Uploaded by the account holder"),
    ],
    flags: [
      { level: "high", text: "Recipient pattern matches a prize scam (many small F&F payments from strangers)" },
      { level: "medium", text: "Recipient account is 9 days old" },
    ],
    options: [
      { id: "limit", title: "Send the recipient account to the risk team for limits", sub: "Account action needs approval", recommended: true },
      { id: "explain", title: "Explain Friends and Family protection to the account holder", sub: "F&F payments aren't covered by Purchase Protection" },
      { id: "escalate", title: "Escalate to the risk team" },
    ],
    recommendation: "Recommend sending the recipient account to the risk team and explaining the options to the account holder.",
  },
  "PP-D-41062": {
    summary: "Buyer says the jacket is a different brand from the listing. The merchant uploaded an invoice, but the invoice amount and date don't match this order.",
    assessment: "medium_suspicion",
    transaction: { id: "4QW90062GH362062G", date: "12 Oct 2026", items: "1 × Leather jacket", shipTo: "Matches buyer's PayPal address", tracking: "FedEx 7781 2290 1162" },
    buyer: B.sam, merchant: M.priya,
    timeline: [tl("12 Oct", "Payment completed · $230.00"), tl("18 Oct", "Delivered"), tl("21 Oct", "Buyer opened claim: not as described", true), tl("26 Oct", "Merchant uploaded an invoice"), tl("28 Oct", "Staff asked the merchant for the original listing")],
    evidence: [
      ev("paypal", "verified", "Delivered 18 Oct", "From FedEx · checked by delivery watch"),
      ev("buyer", "unverified", "Photo of the label", "Shows a different brand"),
      ev("merchant", "contradiction", "Invoice: $195.00 dated 2 Oct", "Order was $230.00 on 12 Oct"),
    ],
    flags: [{ level: "medium", text: "Merchant evidence doesn't match the order" }],
    options: [
      { id: "info_merchant", title: "Wait for the merchant's listing", sub: "Asked on 28 Oct · due in 52 h", recommended: true },
      { id: "buyer_full", title: "Rule in favour of the buyer · refund $230.00 after return" },
    ],
    recommendation: "Consider waiting for the original listing before deciding. The invoice doesn't match this order.",
  },
};

// Delivery watch (A7 worker): carrier status for each dispute's shipment,
// checked on a schedule through PayPal tracking and the carrier. It only reads
// data and raises flags; it never decides a case.
export const deliveryWatch = {
  "PP-D-41027": { carrier: "UPS", tracking: "1Z 88A 2041 7730", status: "delivered", latest: "14 Oct 10:42 · Delivered, signed \"J. CLAIMS\"", lastChecked: "6 min ago",
    mismatch: "Carrier says delivered and signed for. The buyer says it never arrived." },
  "PP-D-41033": { carrier: "–", tracking: "–", status: "not_shipped", latest: "Merchant hasn't added tracking yet", lastChecked: "6 min ago" },
  "PP-D-41040": { carrier: "USPS", tracking: "9400 1000 0000 0000 41", status: "delivered", latest: "25 Oct 14:10 · Delivered, front door", lastChecked: "6 min ago" },
  "PP-D-41051": { carrier: "USPS", tracking: "9400 1000 0000 0000 51", status: "in_transit", latest: "2 Nov 18:05 · Arrived at regional facility · expected 6 Nov", lastChecked: "6 min ago" },
  "PP-D-41062": { carrier: "FedEx", tracking: "7781 2290 1162", status: "delivered", latest: "18 Oct 11:30 · Delivered", lastChecked: "6 min ago" },
  "PP-D-41066": { carrier: "USPS", tracking: "9400 1000 0000 0000 66", status: "stuck", latest: "28 Oct 09:15 · Accepted at origin, no scan since", lastChecked: "6 min ago",
    mismatch: "No carrier scan for 6 days on an item-not-received case." },
  "PP-D-40990": { carrier: "UPS", tracking: "1Z 88A 2041 0990", status: "delivered", latest: "20 Oct 16:02 · Delivered, photo on file", lastChecked: "Stopped (case resolved)" },
};

// When the two automatic checks last ran (A7 workers)
export const watchStatus = {
  delivery: { lastRun: "6 min ago", every: "Every 30 min" },
  deadline: { lastRun: "2 min ago", every: "Every 15 min" },
};

// Things the system flagged that aren't disputes (yet)
export const flags = [
  { id: "F-2203", level: "high", kind: "Delivery", subject: "PP-D-41066", text: "No carrier scan for 6 days on an item-not-received case", when: "1 h ago", case: "PP-D-41066" },
  { id: "F-2201", level: "high", kind: "Account", subject: "prize-claims-desk@example.com", text: "14 Friends and Family payments from new contacts in 48 h", when: "2 h ago", query: "prize-claims-desk@example.com" },
  { id: "F-2198", level: "high", kind: "Account", subject: B.jordan.name, text: "5 item-not-received claims in 90 days, 4 on delivered parcels", when: "Today", query: B.jordan.email },
  { id: "F-2197", level: "medium", kind: "Delivery", subject: "PP-D-41027", text: "Carrier says delivered and signed; the buyer says it never arrived", when: "Today", case: "PP-D-41027" },
  { id: "F-2195", level: "high", kind: "Transaction", subject: "3RT77104AB920033C", text: "Payment 40 min after a password reset from a new device", when: "Yesterday", query: "3RT77104AB920033C" },
  { id: "F-2190", level: "medium", kind: "Account", subject: M.priya.name, text: "Dispute rate rose from 0.8% to 2.1% in 30 days", when: "2 days ago", query: M.priya.email },
  { id: "F-2186", level: "medium", kind: "Transaction", subject: "5LM33018JK210186H", text: "Shipping and billing in different countries, order 6× the store average", when: "3 days ago", query: "5LM33018JK210186H" },
];

// Account / transaction check results, keyed by email or transaction id
const check = (o) => o;
export const checks = {
  [B.jordan.email]: check({
    kind: "Account", title: B.jordan.name, sub: `${B.jordan.email} · Personal · since ${B.jordan.since}`, risk: "high", evidenceStatus: "complete",
    facts: [["Disputes (90 days)", "5 · all item not received"], ["Won by buyer", "1 of 5"], ["Payments (90 days)", "11"], ["Linked accounts", "None found"]],
    rows: [
      { kind: "verified", text: "4 claims on parcels marked delivered and signed", detail: "Carrier data via PayPal" },
      { kind: "verified", text: "Claims started 3 months ago after 17 months without any", detail: "Dispute history" },
      { kind: "unverified", text: "Buyer says parcels were stolen", detail: "No police reports provided" },
    ],
    action: "Consider sending the account to the risk team to review the claim pattern. This is not proof of abuse.",
    cases: ["PP-D-41027"],
  }),
  [B.morgan.email]: check({
    kind: "Account", title: B.morgan.name, sub: `${B.morgan.email} · Personal · since ${B.morgan.since}`, risk: "high", evidenceStatus: "complete",
    facts: [["Last login", "27 Oct · new device · other country"], ["Password reset", "27 Oct 02:10"], ["Disputes (90 days)", "1"], ["Account age", "9 years"]],
    rows: [
      { kind: "verified", text: "New device and country right after a password reset", detail: "PayPal security log" },
      { kind: "verified", text: "Payment shipped to an address never used before", detail: "Address history" },
    ],
    action: "Recommend securing the account: sign out all devices and require a new password.",
    cases: ["PP-D-41033"],
  }),
  "prize-claims-desk@example.com": check({
    kind: "Account", title: "prize-claims-desk@example.com", sub: "Personal · opened 21 Oct 2026", risk: "high", evidenceStatus: "partial",
    facts: [["Payments received (48 h)", "14 · all Friends and Family"], ["Senders", "14 different people, none in contacts before"], ["Withdrawals", "3 to a new bank account"], ["Account age", "9 days"]],
    rows: [
      { kind: "verified", text: "Many small F&F payments from strangers", detail: "PayPal payment records" },
      { kind: "verified", text: "Money withdrawn within hours", detail: "Withdrawal records" },
      { kind: "unverified", text: "Screenshots of \"prize\" messages from 2 senders", detail: "Uploaded by the senders" },
    ],
    action: "Recommend sending the account to the risk team for limits. Account actions need your approval.",
    cases: ["PP-D-41058"],
  }),
  [M.priya.email]: check({
    kind: "Account", title: M.priya.name, sub: `${M.priya.email} · Business · since ${M.priya.since}`, risk: "medium", evidenceStatus: "partial",
    facts: [["Dispute rate (30 days)", "2.1% (was 0.8%)"], ["Open disputes", "2"], ["Main reason", "Not as described"], ["Seller protection", "Not eligible (digital)"]],
    rows: [
      { kind: "verified", text: "Dispute rate more than doubled in 30 days", detail: "Dispute history" },
      { kind: "contradiction", text: "Uploaded invoice doesn't match the order", detail: "Case PP-D-41062" },
    ],
    action: "Consider monitoring the account for 30 days. No action needed yet.",
    cases: ["PP-D-41062", "PP-D-41033"],
  }),
  [M.maya.email]: check({
    kind: "Account", title: M.maya.name, sub: `${M.maya.email} · Business · since ${M.maya.since}`, risk: "low", evidenceStatus: "complete",
    facts: [["Dispute rate (30 days)", "0.4%"], ["Open disputes", "2"], ["Tracking added", "98% of orders"], ["Seller protection", "Eligible"]],
    rows: [{ kind: "verified", text: "Low dispute rate and tracking on almost every order", detail: "PayPal records" }],
    action: "No concerns found.",
    cases: ["PP-D-41040", "PP-D-41051"],
  }),
  "3RT77104AB920033C": check({
    kind: "Transaction", title: "3RT77104AB920033C", sub: `$420.00 · ${B.morgan.name} → ${M.priya.name} · 27 Oct 2026`, risk: "high", evidenceStatus: "complete",
    facts: [["Device", "New · first seen 27 Oct"], ["Country", "Changed from US"], ["Ship to", "New address"], ["Time since password reset", "40 min"]],
    rows: [{ kind: "verified", text: "Payment pattern matches an account takeover", detail: "PayPal security log" }],
    action: "Recommend treating this as unauthorized and asking the merchant not to ship.",
    cases: ["PP-D-41033"],
  }),
  "5LM33018JK210186H": check({
    kind: "Transaction", title: "5LM33018JK210186H", sub: `$540.00 · Anna B. → ${M.maya.name} · 27 Oct 2026`, risk: "medium", evidenceStatus: "partial",
    facts: [["Ship to", "Different country from billing"], ["Order value", "6× the store's average"], ["Buyer disputes (60 days)", "4 at other stores"]],
    rows: [
      { kind: "verified", text: "Shipping and billing addresses in different countries", detail: "Payment record" },
      { kind: "verified", text: "4 item-not-received claims at other stores", detail: "Dispute history" },
    ],
    action: "Consider suggesting signature on delivery to the merchant.",
    cases: [],
  }),
};
export const CHECK_EXAMPLES = [B.jordan.email, "prize-claims-desk@example.com", "3RT77104AB920033C", M.maya.email];

export const auditLog = [
  { id: "AL-1099", at: "31 Oct 08:00", case: "PP-D-41033", action: "Deadline reminder: PayPal response due in 14 h", ai: "–", decision: "Reminder sent", by: "deadline-watch", notes: "Sent to Diana R." },
  { id: "AL-1098", at: "31 Oct 07:52", case: "PP-D-41066", action: "No carrier scan for 6 days", ai: "–", decision: "Flag raised", by: "delivery-watch", notes: "USPS 9400 1000 0000 0000 66" },
  { id: "AL-1097", at: "31 Oct 07:52", case: "PP-D-41027", action: "Carrier delivery doesn't match the claim", ai: "–", decision: "Flag raised", by: "delivery-watch", notes: "UPS: delivered and signed 14 Oct" },
  { id: "AL-1096", at: "30 Oct 16:42", case: "PP-D-40990", action: "Rule for seller", ai: "Rule for seller", decision: "Approved", by: "staff-diana", notes: "Delivery confirmed with photo" },
  { id: "AL-1095", at: "30 Oct 11:05", case: "PP-D-41062", action: "Request info from merchant", ai: "Request original listing", decision: "Approved", by: "staff-kevin", notes: "" },
  { id: "AL-1094", at: "29 Oct 15:20", case: "PP-D-40981", action: "Partial refund $20.00", ai: "Partial refund $20.00", decision: "Edited", by: "staff-ana", notes: "Changed from $15 after buyer photo" },
  { id: "AL-1093", at: "29 Oct 09:48", case: "PP-D-40977", action: "Refund $75.00", ai: "Rule for seller", decision: "Rejected AI suggestion", by: "staff-diana", notes: "Tracking was for a different address" },
];

export const insights = {
  weeks: ["W40", "W41", "W42", "W43", "W44"],
  opened: [48, 52, 61, 57, 63],
  closed: [44, 50, 55, 60, 58],
  reasons: [["Item not received", 41], ["Not as described", 27], ["Unauthorized", 14], ["Unrecognized charge", 11], ["Scam report", 7]],
  stats: { openCases: 37, dueToday: 6, highRisk: 9, waitingInfo: 8, avgHoursToDecision: 6.4, misunderstandings: "31%", aiAgreed: "84%", flagsThisWeek: 23 },
  patterns: [
    ["Delivered-but-not-received claims", "Rising", "12 accounts with 3+ claims in 90 days"],
    ["Prize scams via Friends and Family", "Rising", "4 recipient accounts flagged this week"],
    ["Unrecognised subscription names", "Stable", "Most solved by showing the statement name"],
  ],
};

// Sample results for "Run analysis" on the case page, already in the shape
// toAnalysis() (api/analysisAdapter.js) returns. They follow the backend's
// scenario catalog and scoring (backend/app/rules/scenarios.py, risk.py):
// fraud indicator +25, inconsistency +10, gap 0; 60+ high, 25+ medium.
// Cases left out (unrecognized charge, scam report) aren't a supported
// scenario, so the mock answers 422 for them like the backend does.
const SCENARIO_EVIDENCE = {
  item_not_received: ["transaction_details", "order_details", "shipment_status", "buyer_complaint"],
  item_not_as_described: ["transaction_details", "buyer_complaint", "original_product_description"],
  unauthorized_purchase: ["transaction_details", "unauthorized_payment_complaint", "order_details"],
};
const LABEL = { item_not_received: "Item Not Received", item_not_as_described: "Item Not as Described", unauthorized_purchase: "Unauthorized Purchase" };
const indicator = (name, weight) => ({
  name, weight,
  description: `Investigate the reported ${name.replace(/_/g, " ")} against independently available evidence.`,
});
function analysisFor(caseId, scenario, { indicators = [], missing = [], verified = [] } = {}) {
  const required = SCENARIO_EVIDENCE[scenario];
  const present = required.filter((k) => !missing.includes(k));
  const score = Math.min(100, indicators.reduce((s, i) => s + i.weight, 0));
  const risk = !indicators.length ? "inconclusive" : score >= 60 ? "high" : score >= 25 ? "medium" : "low";
  const flags = indicators.map((i) => i.name.replace(/_/g, " ")).join(", ");
  return {
    scenario,
    risk,
    riskScore: score,
    scoreCaveat: "Heuristic warning score only; not a calibrated probability of fraud.",
    evidenceStatus: present.length === required.length ? "complete" : present.length ? "partial" : "missing",
    completeness: Math.round((present.length / required.length) * 1000) / 1000,
    present,
    missing,
    indicators: indicators.map(({ name, description }) => ({ name, description })),
    explanation: `${LABEL[scenario]}: `
      + (flags ? `Review these reported warning signs: ${flags}. ` : "No verified warning signs were provided. ")
      + (missing.length ? `Missing evidence: ${missing.join(", ")}. ` : "Required evidence fields are present. ")
      + "This is not a fraud determination.",
    suggestedAction: "Review evidence and approve any response manually",
    needsReview: true,
    draft: `Draft response for case ${caseId} (${LABEL[scenario]}).\nWe request a review of this dispute based on the attached records.\n`
      + (verified.length ? `Verified supporting records: ${verified.join(", ")}.\n` : "Supporting documents must be verified and attached before submission.\n")
      + "Please review all statements and attachments before submitting. [HUMAN APPROVAL REQUIRED]",
  };
}

export const analysisResults = {
  "PP-D-41027": analysisFor("PP-D-41027", "item_not_received", { indicators: [indicator("delivery_contradiction", 25)], verified: ["shipment status", "proof of delivery"] }),
  "PP-D-41033": analysisFor("PP-D-41033", "unauthorized_purchase", { indicators: [indicator("transaction_anomaly", 25), indicator("account_compromise_indicators", 25), indicator("address_inconsistency", 10)], missing: ["order_details"] }),
  "PP-D-41040": analysisFor("PP-D-41040", "item_not_as_described", { verified: ["transaction details"] }),
  "PP-D-41051": analysisFor("PP-D-41051", "item_not_received", { verified: ["shipment status"] }),
  "PP-D-41062": analysisFor("PP-D-41062", "item_not_as_described", { indicators: [indicator("description_contradiction", 10)], missing: ["original_product_description"] }),
  "PP-D-41066": analysisFor("PP-D-41066", "item_not_received", { indicators: [indicator("unsupported_delivery_claim", 0)], missing: ["shipment_status"] }),
  "PP-D-40981": analysisFor("PP-D-40981", "item_not_as_described", { verified: ["transaction details"] }),
  "PP-D-40977": analysisFor("PP-D-40977", "item_not_received", { indicators: [indicator("address_mismatch", 10)] }),
  "PP-D-40990": analysisFor("PP-D-40990", "item_not_received", { verified: ["shipment status", "proof of delivery"] }),
};
