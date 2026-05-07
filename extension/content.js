// ============================================
//   FLAGTRACK — content.js (Content Script)
//   Injected into CTF pages to detect auth & CTF info
// ============================================

(function () {
  const CTF_PROFILES = [
    {
      pattern:   /picoctf\.org/i,
      name:      "picoCTF",
      authCheck: () => !!document.querySelector(".navbar-profile, .user-menu, [href*='/user/']"),
      userGet:   () => {
        const el = document.querySelector(".navbar-profile, .user-display-name, .username");
        return el ? el.textContent.trim() : "";
      },
    },
    {
      pattern:   /hackthebox\.com/i,
      name:      "HackTheBox",
      authCheck: () => !!document.querySelector(".nav-user, .user-avatar, [data-user-id]"),
      userGet:   () => {
        const el = document.querySelector(".nav-username, .user-name");
        return el ? el.textContent.trim() : "";
      },
    },
    {
      pattern:   /tryhackme\.com/i,
      name:      "TryHackMe",
      authCheck: () => !!document.querySelector(".username, .nav-avatar, [href='/profile']"),
      userGet:   () => {
        const el = document.querySelector(".username");
        return el ? el.textContent.trim() : "";
      },
    },
    {
      pattern:   /ctfd\./i,
      name:      document.title.split(" ")[0] || "CTFd",
      authCheck: () => !!document.querySelector("#account, .nav-account, [href*='/profile']"),
      userGet:   () => {
        const el = document.querySelector("#account .dropdown-toggle, .nav-account");
        return el ? el.textContent.trim() : "";
      },
    },
  ];

  function detectProfile() {
    const url = window.location.href;
    return CTF_PROFILES.find(p => p.pattern.test(url));
  }

  function run() {
    const profile = detectProfile();
    if (!profile) return;

    const loggedIn = profile.authCheck();
    const username = loggedIn ? profile.userGet() : "";

    // Report to background
    chrome.runtime.sendMessage({
      action:  "AUTH_STATUS",
      loggedIn,
      username,
    });

    chrome.runtime.sendMessage({
      action:  "CTF_DETECTED",
      ctfName: profile.name,
    });
  }

  // Run on load and after any navigation changes
  run();

  const observer = new MutationObserver(() => run());
  observer.observe(document.body, { childList: true, subtree: true });

  // Listen for popup asking for auth check
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "CHECK_AUTH") run();
  });
})();
