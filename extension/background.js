// ============================================
//   FLAGTRACK — background.js (Service Worker)
//   Tracks time spent on CTF sites silently
// ============================================

const CTF_PATTERNS = [
  /ctfd\./i, /ctf\./i, /picoctf/i, /hackthebox/i, /tryhackme/i,
  /pwnable/i, /reversing\.kr/i, /247ctf/i, /imaginaryctf/i,
  /redpwn/i, /angstromctf/i, /cryptohack/i, /ctftime/i,
];

let activeCtfTabId = null;
let trackingInterval = null;

function isCtfUrl(url) {
  return url && CTF_PATTERNS.some(p => p.test(url));
}

// When user switches tabs or updates a tab
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (tab) handleTabChange(tab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") handleTabChange(tab);
});

function handleTabChange(tab) {
  const onCtf = isCtfUrl(tab.url);

  if (onCtf) {
    activeCtfTabId = tab.id;
    startTracking();
    // Try to detect login status via content script
    chrome.tabs.sendMessage(tab.id, { action: "CHECK_AUTH" }).catch(() => {});
  } else {
    if (activeCtfTabId === tab.id) {
      activeCtfTabId = null;
      stopTracking();
    }
  }
}

function startTracking() {
  if (trackingInterval) return;
  trackingInterval = setInterval(() => {
    chrome.storage.local.get(["sessionSeconds"], result => {
      const prev = result.sessionSeconds || 0;
      chrome.storage.local.set({ sessionSeconds: prev + 1 });
    });
  }, 1000);
}

function stopTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
}

// Listen for auth updates from content script
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === "AUTH_STATUS") {
    chrome.storage.local.set({
      loggedIn: msg.loggedIn,
      username: msg.username || "",
    });
  }
  if (msg.action === "CTF_DETECTED") {
    chrome.storage.local.set({
      ctfActive: true,
      ctfName: msg.ctfName || "Unknown CTF",
    });
  }
});
