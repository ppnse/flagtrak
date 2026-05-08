// ============================================
//   FLAGTRACK — popup.js
//
//   ⚙ BACKEND HOOK:
//   Set USERNAME and PASSWORD below.
//   Replace the `authenticate()` function body
//   with a real API call when your backend is ready.
// ============================================

// ── CREDENTIALS (swap these out / connect to backend) ──────────────────────
const USERNAME = "rabee";
const PASSWORD = "rabeehatesctfs";
// ───────────────────────────────────────────────────────────────────────────


// ── AUTH FUNCTION ───────────────────────────────────────────────────────────
// Replace this with a fetch() to your backend API.
// It should return { success: true/false, username: string }.
async function authenticate(username, password) {

  // ----- STUB: swap this block with your real API call -----
  // Example real call:
  //
  // const res = await fetch("https://your-backend.com/api/login", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ username, password }),
  // });
  // const data = await res.json();
  // return { success: data.ok, username: data.username };
  //
  // ----- For now: check against the variables above -----
  await delay(500); // simulate network latency
  if (username === USERNAME && password === PASSWORD) {
    return { success: true, username };
  }
  return { success: false };
  // ----------------------------------------------------------
}
// ───────────────────────────────────────────────────────────────────────────


// ── STATE ───────────────────────────────────────────────────────────────────
let state = {
  loggedIn:          false,
  username:          "",
  ctfActive:         false,
  ctfName:           "",
  totalChallenges:   67,
  solvedChallenges:  41,
  points:            5000,
  flags:             [],
  sessionSeconds:    0,
};

let swInterval = null;

// ── UTILS ────────────────────────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const esc = s  => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const delay = ms => new Promise(r => setTimeout(r, ms));

function pad(n) { return String(n).padStart(2,"0"); }
function fmtTime(s) {
  return `${pad(Math.floor(s/3600))}:${pad(Math.floor((s%3600)/60))}:${pad(s%60)}`;
}

// ── STORAGE ──────────────────────────────────────────────────────────────────
function save() {
  try { localStorage.setItem("ft_state", JSON.stringify(state)); } catch(_) {}
}
function load() {
  try {
    const s = localStorage.getItem("ft_state");
    if (s) state = { ...state, ...JSON.parse(s) };
  } catch(_) {}
}

// ── SCREENS ──────────────────────────────────────────────────────────────────
function showLogin()  { $("screen-login").classList.remove("hidden"); $("screen-main").classList.add("hidden"); }
function showMain()   { $("screen-main").classList.remove("hidden");  $("screen-login").classList.add("hidden"); }

// ── LOGIN ─────────────────────────────────────────────────────────────────────
$("btn-login").addEventListener("click", doLogin);
$("input-password").addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
$("input-username").addEventListener("keydown", e => { if (e.key === "Enter") $("input-password").focus(); });

async function doLogin() {
  const user = $("input-username").value.trim();
  const pass = $("input-password").value;
  const errEl = $("login-error");

  if (!user || !pass) { errEl.textContent = "Enter username and password"; return; }

  const btn = $("btn-login");
  btn.textContent = "AUTHENTICATING...";
  btn.disabled = true;
  errEl.textContent = "";

  try {
    const result = await authenticate(user, pass);
    if (result.success) {
      state.loggedIn = true;
      state.username = result.username;
      save();
      renderMain();
      showMain();
      detectCtfTab();
      startStopwatch();
    } else {
      errEl.textContent = "Invalid credentials";
    }
  } catch(e) {
    errEl.textContent = "Connection error";
  }

  btn.textContent = "LOGIN";
  btn.disabled = false;
}

// ── LOGOUT ────────────────────────────────────────────────────────────────────
$("btn-logout").addEventListener("click", () => {
  stopStopwatch();
  state.loggedIn  = false;
  state.username  = "";
  save();
  $("input-username").value = "";
  $("input-password").value = "";
  $("login-error").textContent = "";
  showLogin();
});

// ── RENDER MAIN ───────────────────────────────────────────────────────────────
function renderMain() {
  // Username
  $("display-username").textContent = state.username.toUpperCase();

  // CTF status
  if (state.ctfActive) {
    $("status-dot").className  = "pulse-dot active";
    $("status-text").className = "status-text active";
    $("status-text").textContent = "CTF ACTIVE";
    $("ctf-name").textContent  = state.ctfName;
  } else {
    $("status-dot").className  = "pulse-dot inactive";
    $("status-text").className = "status-text inactive";
    $("status-text").textContent = "NO ACTIVE CTF";
    $("ctf-name").textContent  = "";
  }

  // Progress
  const total  = Math.max(1, state.totalChallenges);
  const solved = Math.min(state.solvedChallenges, total);
  const pct    = Math.round((solved / total) * 100);

  $("bar-fill").style.width    = pct + "%";
  $("progress-frac").textContent = `${solved} / ${total} solved`;
  $("stat-solved").textContent  = solved;
  $("stat-remain").textContent  = total - solved;
  $("stat-pts").textContent     = state.points;

  renderFlags();
}

// ── FLAG SUBMISSION ───────────────────────────────────────────────────────────
$("btn-submit").addEventListener("click", submitFlag);
$("ch-flag").addEventListener("keydown", e => { if (e.key === "Enter") submitFlag(); });
$("ch-name").addEventListener("keydown", e => { if (e.key === "Enter") $("ch-flag").focus(); });

function submitFlag() {
  const chall = $("ch-name").value.trim();
  const flag  = $("ch-flag").value.trim();
  const fb    = $("feedback");

  if (!chall) { setFeedback("Enter a challenge name", "err"); $("ch-name").focus(); return; }
  if (!flag)  { setFeedback("Enter a flag", "err"); $("ch-flag").focus(); return; }

  if (state.flags.find(f => f.challenge.toLowerCase() === chall.toLowerCase())) {
    setFeedback("Already submitted for " + chall, "inf");
    return;
  }

  const entry = {
    id:        Date.now().toString(36),
    challenge: chall,
    flag,
    by:        state.username,
    time:      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };

  state.flags.push(entry);
  state.solvedChallenges = Math.min(state.solvedChallenges + 1, state.totalChallenges);
  state.points += 100;
  save();
  renderMain();
  setFeedback("✓ Flag shared with club", "ok");
  $("ch-name").value = "";
  $("ch-flag").value = "";
}

function setFeedback(msg, cls) {
  const el = $("feedback");
  el.textContent = msg;
  el.className = `feedback ${cls}`;
  setTimeout(() => { el.textContent = ""; el.className = "feedback"; }, 3000);
}

// ── FLAG LIST RENDER ──────────────────────────────────────────────────────────
function renderFlags() {
  const list  = $("flags-list");
  const flags = state.flags;
  $("flag-count").textContent = flags.length;

  if (!flags.length) {
    list.innerHTML = `<div class="empty">No flags yet</div>`;
    return;
  }

  list.innerHTML = "";
  [...flags].reverse().forEach(f => {
    const card = document.createElement("div");
    card.className = "flag-card";
    card.innerHTML = `
      <span class="fc-icon">⚑</span>
      <div class="fc-body">
        <div class="fc-challenge">${esc(f.challenge)}</div>
        <div class="fc-flag">${esc(f.flag)}</div>
      </div>
      <div class="fc-meta">
        <span class="fc-by">${esc(f.by)}</span>
        <span class="fc-time">${f.time}</span>
      </div>
      <button class="fc-del" data-id="${f.id}" title="Remove">✕</button>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll(".fc-del").forEach(btn => {
    btn.addEventListener("click", () => {
      state.flags = state.flags.filter(f => f.id !== btn.dataset.id);
      if (state.solvedChallenges > 0) state.solvedChallenges--;
      if (state.points >= 100) state.points -= 100;
      save();
      renderMain();
    });
  });
}

// ── STOPWATCH ─────────────────────────────────────────────────────────────────
function startStopwatch() {
  if (swInterval) return;

  swInterval = setInterval(() => {

    if(state.ctfActive) {
      $("stopwatch").classList.add("ticking");
      state.sessionSeconds++;
      $("stopwatch").textContent = fmtTime(state.sessionSeconds);
      
      if(state.sessionSeconds % 15 == 0) {
        save();
      }
     } else {
      $("stopwatch").classList.remove("ticking");
      }
    }, 1000);
    
}

function stopStopwatch() {
  clearInterval(swInterval);
  swInterval = null;
  $("stopwatch").classList.remove("ticking");
}

// ── CTF TAB DETECTION ─────────────────────────────────────────────────────────
const CTF_PATTERNS = [
  [/picoctf/i,    "picoCTF"],
  [/hackthebox/i, "HackTheBox"],
  [/tryhackme/i,  "TryHackMe"],
  [/247ctf/i,     "247CTF"],
  [/cryptohack/i, "CryptoHack"],
  [/ctfd\./i,     "CTFd"],
  [/ctf\./i,      "CTF Site"],
  [/pwnable/i,    "pwnable.kr"],
];

function detectCtfTab() {
  if (typeof chrome === "undefined" || !chrome.tabs) {
    // Not in a real extension — mark as active for preview
    state.ctfActive = true;
    state.ctfName   = "picoCTF 2025";
    renderMain();
    return;
  }
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) return;
    const url = tabs[0].url || "";
    const match = CTF_PATTERNS.find(([pat]) => pat.test(url));
    state.ctfActive = !!match;
    state.ctfName   = match ? match[1] : "";
    save();
    renderMain();
  });
}

// ── RESET ─────────────────────────────────────────────────────────────────────
$("btn-reset").addEventListener("click", () => {
  if (!confirm("Reset all progress and flags?")) return;
  state.flags            = [];
  state.solvedChallenges = 0;
  state.points           = 0;
  state.sessionSeconds   = 0;
  $("stopwatch").textContent = "00:00:00";
  save();
  renderMain();
});

// ── INIT ──────────────────────────────────────────────────────────────────────
function init() {
  load();
  $("stopwatch").textContent = fmtTime(state.sessionSeconds);

  if (state.loggedIn) {
    renderMain();
    showMain();
    detectCtfTab();
    startStopwatch();
  } else {
    showLogin();
  }
}

init();