/* ============================================================
   BNI Deira Dubai — Visitor Assistant
   Rule-based engine. All answers pre-written. No external calls.
   Rules encoded:
   - Max 3-4 lines per message, one question per message
   - Ask time preference before showing chapters
   - Clarify sub-category before checking availability
   - Never suggest policy workarounds (one seat one category)
   - Never invent stats
   - Fees fixed; visitor max 2 visits before joining
   ============================================================ */

/* ---------- DATA ---------- */

const CHAPTERS = [
  { name: "HARMONY",     day: "Tue", time: "6:15 PM", venue: "Khalidiya",  hybrid: false, slot: "evening615" },
  { name: "SYNERGY",     day: "Tue", time: "6:45 AM", venue: "Radisson",   hybrid: false, slot: "morning" },
  { name: "UNITED",      day: "Tue", time: "6:45 AM", venue: "Marriott",   hybrid: true,  slot: "morning" },
  { name: "GIVERS",      day: "Wed", time: "3:45 PM", venue: "Khalidiya",  hybrid: true,  slot: "afternoon" },
  { name: "LEGENDS",     day: "Wed", time: "6:45 AM", venue: "Khalidiya",  hybrid: false, slot: "morning" },
  { name: "CONTINENTAL", day: "Thu", time: "6:45 AM", venue: "Radisson",   hybrid: false, slot: "morning" },
  { name: "ELEVATE",     day: "Thu", time: "3:45 PM", venue: "Khalidiya",  hybrid: false, slot: "afternoon" },
  { name: "ENERGY",      day: "Fri", time: "3:45 PM", venue: "Khalidiya",  hybrid: true,  slot: "afternoon" },
  { name: "EXCELERATE",  day: "Fri", time: "6:45 AM", venue: "Marriott",   hybrid: false, slot: "morning" },
  { name: "GLADIATORS",  day: "Fri", time: "6:45 AM", venue: "Radisson",   hybrid: false, slot: "morning" },
];

// Categories: filled / total seats. Open = filled < total.
const CATEGORIES = {
  "residential real estate":   { filled: 10, total: 10 },
  "bookkeeping":               { filled: 9,  total: 10 },
  "taxation":                  { filled: 10, total: 10 },
  "audit":                     { filled: 9,  total: 10 },
  "life insurance":            { filled: 8,  total: 10 },
  "general insurance":         { filled: 9,  total: 10 },
  "social media":              { filled: 7,  total: 10 },
  "web design":                { filled: 8,  total: 10 },
  "freight forwarding":        { filled: 8,  total: 10 },
  "inbound travel":            { filled: 6,  total: 10 },
  "computer networks":         { filled: 7,  total: 10 },
  "residential interior":      { filled: 5,  total: 10 },
  "commercial fitout":         { filled: 7,  total: 10 },
  "onshore incorporation":     { filled: 9,  total: 10 },
};

const FEES = {
  guestInPerson: "AED 135",
  guestZoom: "Free",
  memberYear: "AED 8,100 / year",
  member2Year: "AED 11,300 / 2 years",
};

const CONTACT = { ed: "Pankaj Gupta", phone: "050-261-2483" };

/* ---------- CONVERSATION STATE ---------- */
let state = { timeSlot: null, awaitingCategory: false };

/* ---------- DOM ---------- */
const chat = document.getElementById("chat");
const form = document.getElementById("form");
const input = document.getElementById("input");

/* ---------- RENDER HELPERS ---------- */
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function scrollDown() { chat.scrollTop = chat.scrollHeight; }

function addBot(text, chips) {
  const row = el("div", "row bot");
  row.appendChild(el("div", "bubble", text));
  chat.appendChild(row);
  if (chips && chips.length) renderChips(chips);
  scrollDown();
}
function addUser(text) {
  const row = el("div", "row user");
  row.appendChild(el("div", "bubble", escapeHtml(text)));
  chat.appendChild(row);
  scrollDown();
}
function renderChips(chips) {
  const wrap = el("div", "chips");
  chips.forEach((c) => {
    const b = el("button", "chip", c.label);
    b.type = "button";
    b.onclick = () => { clearChips(); handleUser(c.value || c.label, true); };
    wrap.appendChild(b);
  });
  chat.appendChild(wrap);
  scrollDown();
}
function clearChips() {
  document.querySelectorAll(".chips").forEach((c) => c.remove());
}
function typing(cb, delay = 650) {
  const row = el("div", "row bot");
  const t = el("div", "bubble typing", "<span></span><span></span><span></span>");
  row.appendChild(t);
  chat.appendChild(row);
  scrollDown();
  setTimeout(() => { row.remove(); cb(); }, delay);
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}

/* ---------- INTENT MATCHING ---------- */
function intentOf(raw) {
  const t = raw.toLowerCase().trim();
  const has = (...w) => w.some((x) => t.includes(x));

  if (has("what is bni", "about bni", "what's bni", "tell me about bni")) return "about";
  if (has("fee", "cost", "price", "how much", "charge", "payment")) return "fees";
  if (has("visit", "guest", "attend", "come", "drop in")) return "visit";
  if (has("trade license", "license", "licence", "need to join", "requirement", "eligib")) return "join";
  if (has("hybrid", "zoom", "online", "virtual")) return "hybrid";
  if (has("chapter", "meeting", "schedule", "timing", "when", "where", "list")) return "chapters";
  if (has("category", "seat", "available", "spot", "open", "slot", "profession", "my business", "is there room")) return "category";
  if (has("referral", "stats", "how many member", "business passed", "thank you for closed", "results")) return "stats";
  if (has("morning", "6:45 am", "645 am")) return "slot_morning";
  if (has("afternoon", "3:45", "345")) return "slot_afternoon";
  if (has("evening", "6:15", "615")) return "slot_evening";
  if (has("contact", "speak", "call", "human", "person", "talk to")) return "contact";
  if (has("hi", "hello", "hey", "salam", "good morning", "good evening", "start")) return "greet";
  if (has("yes", "yess.ae", "yess")) return "about";
  return "fallback";
}

/* ---------- HANDLERS ---------- */

function handleUser(text, fromChip) {
  if (!fromChip) addUser(text);

  // If we asked for a category, treat next input as the sub-category
  if (state.awaitingCategory) {
    state.awaitingCategory = false;
    return typing(() => checkCategory(text));
  }

  const intent = intentOf(text);

  switch (intent) {
    case "greet":         return typing(() => greet());
    case "about":         return typing(() => about());
    case "fees":          return typing(() => fees());
    case "visit":         return typing(() => visitInfo());
    case "join":          return typing(() => joinInfo());
    case "hybrid":        return typing(() => hybridInfo());
    case "chapters":      return typing(() => askTimePreference());
    case "slot_morning":  return setSlot("morning");
    case "slot_afternoon":return setSlot("afternoon");
    case "slot_evening":  return setSlot("evening615");
    case "category":      return typing(() => askCategory());
    case "stats":         return typing(() => statsInfo());
    case "contact":       return typing(() => contactInfo());
    default:              return typing(() => fallback());
  }
}

function greet() {
  addBot(
    "👋 Welcome to <strong>BNI Deira Dubai</strong>!\nI can help you find a chapter to visit, check category availability, or answer questions about membership.",
    [
      { label: "Visit a meeting" },
      { label: "Check my category", value: "is my category available" },
      { label: "Fees" },
      { label: "What is BNI?" },
    ]
  );
}

function about() {
  addBot(
    "BNI is the world's largest referral marketing organisation. Members meet weekly to pass <strong>qualified business referrals</strong> to one another.\nEach chapter holds <strong>one seat per profession</strong> — so your category is exclusively yours.",
    [{ label: "Visit a meeting" }, { label: "Check my category", value: "is my category available" }, { label: "Fees" }]
  );
}

function fees() {
  addBot(
    `<strong>Guest visit:</strong> ${FEES.guestInPerson} (in-person) · ${FEES.guestZoom} on Zoom\n<strong>Membership:</strong> ${FEES.memberYear} or ${FEES.member2Year}\n<span class="small">A trade license is needed to join (not to visit).</span>`,
    [{ label: "Visit a meeting" }, { label: "How do I join?", value: "what do I need to join" }]
  );
}

function visitInfo() {
  addBot(
    "You're welcome to visit! A visitor may attend a chapter <strong>up to 2 times</strong> before deciding to join.\nGuest fee is " + FEES.guestInPerson + " in-person (free on Zoom).",
    [{ label: "Find a chapter", value: "show me the chapters" }]
  );
}

function joinInfo() {
  addBot(
    "To <strong>join</strong>, you'll need a valid UAE trade license.\nTo simply <strong>visit</strong>, no license is required — anyone is welcome.",
    [{ label: "Check my category", value: "is my category available" }, { label: "Fees" }]
  );
}

function hybridInfo() {
  addBot(
    "Some chapters are <strong>Hybrid</strong>: the 1st week of the month is in-person (" + FEES.guestInPerson + "), and the rest are on Zoom (free).\nHybrid chapters: GIVERS, UNITED, ENERGY.",
    [{ label: "Find a chapter", value: "show me the chapters" }]
  );
}

/* --- Chapters: ALWAYS ask time preference first --- */
function askTimePreference() {
  addBot(
    "I'd be happy to suggest a chapter. <strong>Which time suits you best?</strong>",
    [
      { label: "🌅 Morning · 6:45 AM", value: "morning" },
      { label: "☀️ Afternoon · 3:45 PM", value: "afternoon" },
      { label: "🌆 Evening · 6:15 PM", value: "evening" },
    ]
  );
}

function setSlot(slot) {
  state.timeSlot = slot;
  typing(() => showChapters(slot));
}

function showChapters(slot) {
  const list = CHAPTERS.filter((c) => c.slot === slot);
  if (!list.length) {
    return addBot("No chapters in that slot right now. Would you like to see another time?",
      [{ label: "Morning", value: "morning" }, { label: "Afternoon", value: "afternoon" }, { label: "Evening", value: "evening" }]);
  }
  const lines = list.map((c) =>
    `<strong>${c.name}</strong> — ${c.day} ${c.time}, ${c.venue}${c.hybrid ? " (Hybrid)" : ""}`
  ).join("\n");
  addBot(
    "Here are the chapters at that time:\n" + lines,
    [{ label: "Check my category", value: "is my category available" }, { label: "Another time", value: "show me the chapters" }]
  );
}

/* --- Category: clarify sub-category before checking --- */
function askCategory() {
  state.awaitingCategory = true;
  addBot(
    "Categories can have specific sub-types, so let's be precise.\n<strong>What is your exact business sub-category?</strong>\n<span class=\"small\">e.g. \"Life Insurance\", \"Web Design\", \"Audit\"</span>"
  );
}

function checkCategory(raw) {
  const key = raw.toLowerCase().trim().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ");
  // try exact, then partial
  let match = CATEGORIES[key] ? key : null;
  if (!match) {
    match = Object.keys(CATEGORIES).find((k) => k.includes(key) && key.length >= 3) ||
            Object.keys(CATEGORIES).find((k) => key.includes(k));
  }

  if (!match) {
    return addBot(
      `I don't see "<strong>${escapeHtml(raw)}</strong>" on our current category list.\nThat's good news — it likely means the seat is open. The best step is to <strong>visit a meeting</strong>, and our leadership team will create the category for you.`,
      [{ label: "Find a chapter", value: "show me the chapters" }, { label: "Talk to the team", value: "contact" }]
    );
  }

  const c = CATEGORIES[match];
  const pretty = match.replace(/\b\w/g, (m) => m.toUpperCase());
  if (c.filled < c.total) {
    addBot(
      `Good news — <strong>${pretty}</strong> has an <strong>open seat</strong> available. 🎉\nSince it's one seat per category, I'd suggest visiting soon to claim it.`,
      [{ label: "Find a chapter", value: "show me the chapters" }, { label: "Fees" }]
    );
  } else {
    addBot(
      `<strong>${pretty}</strong> is currently <strong>full</strong> in our Deira chapters.\nYou're still welcome to visit and join the waitlist — I can't open a second seat, as it's strictly one seat per category.`,
      [{ label: "Talk to the team", value: "contact" }, { label: "Find a chapter", value: "show me the chapters" }]
    );
  }
}

/* --- Never invent stats --- */
function statsInfo() {
  addBot(
    "For up-to-date referral and member figures, it's best to hear them directly from our team — I don't want to quote anything inaccurate.\nWould you like me to connect you?",
    [{ label: "Talk to the team", value: "contact" }, { label: "Visit a meeting" }]
  );
}

function contactInfo() {
  addBot(
    `Our Executive Director is <strong>${CONTACT.ed}</strong>.\n📞 ${CONTACT.phone}\nFeel free to reach out, or let me help you pick a chapter to visit first.`,
    [{ label: "Find a chapter", value: "show me the chapters" }]
  );
}

function fallback() {
  addBot(
    "I want to make sure I help with the right thing. I can assist with:",
    [
      { label: "Visit a meeting" },
      { label: "Check my category", value: "is my category available" },
      { label: "Fees" },
      { label: "Talk to the team", value: "contact" },
    ]
  );
}

/* ---------- FORM WIRING ---------- */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const v = input.value.trim();
  if (!v) return;
  clearChips();
  input.value = "";
  input.style.height = "auto";
  handleUser(v, false);
});
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 110) + "px";
});
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
});

/* ---------- BOOT ---------- */
window.addEventListener("load", () => typing(() => greet(), 400));
