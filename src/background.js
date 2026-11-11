const ext = globalThis.browser ?? globalThis.chrome;

const injectAndSend = async (tabId, msg) => {
  try {
    return await ext.tabs.sendMessage(tabId, msg || { wpsCmd: "ping" });
  } catch {
    try {
      await ext.scripting.insertCSS({ target: { tabId }, files: ["content.css"] });
      await ext.scripting.executeScript({ target: { tabId }, files: ["pin.js", "content.js"] });
      if (msg) return await ext.tabs.sendMessage(tabId, msg);
    } catch {}
  }
  return null;
};

const notifyWaTabs = async (msg) => {
  const tabs = await ext.tabs.query({ url: "https://web.whatsapp.com/*" });
  const results = await Promise.all(tabs.map((t) => injectAndSend(t.id, msg)));
  return results.find(Boolean) || { ok: true };
};

// Injeksi skrip global-blur.js ke semua tab non-WA yang sedang terbuka
const injectAllTabs = async () => {
  try {
    const tabs = await ext.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;
      const u = tab.url.toLowerCase();
      if (
        u.startsWith("chrome://") ||
        u.startsWith("chrome-extension://") ||
        u.startsWith("edge://") ||
        u.startsWith("about:") ||
        u.startsWith("view-source:")
      ) {
        continue;
      }
      if (u.startsWith("https://web.whatsapp.com/")) {
        continue;
      }
      try {
        await ext.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["global-blur.js"],
        });
      } catch {}
    }
  } catch {}
};

ext.runtime.onInstalled.addListener(() => {
  notifyWaTabs();
  injectAllTabs();
});
notifyWaTabs();

let isPopupOpen = false;
ext.runtime.onConnect.addListener((port) => {
  if (port.name !== "wps-popup") return;
  isPopupOpen = true;
  notifyWaTabs({ wpsCmd: "popup", open: true });
  port.onDisconnect.addListener(() => {
    isPopupOpen = false;
    notifyWaTabs({ wpsCmd: "popup", open: false });
  });
});

ext.commands.onCommand.addListener(async (cmd) => {
  if (cmd === "toggle-privacy") {
    const { enabled = true } = await ext.storage.local.get("enabled");
    await ext.storage.local.set({ enabled: !enabled });
    await notifyWaTabs({ wpsCmd: "sync" });
  } else if (cmd === "lock-now") {
    const { pinHash = "", webauthnCred = "" } = await ext.storage.local.get(["pinHash", "webauthnCred"]);
    if (pinHash || webauthnCred) await ext.storage.local.set({ locked: true, panic: false });
    await notifyWaTabs({ wpsCmd: "lock" });
  } else if (cmd === "panic") {
    const { panic = false, pinHash = "", webauthnCred = "" } = await ext.storage.local.get(["panic", "pinHash", "webauthnCred"]);
    const next = !panic;
    const lockAfter = !next && !!(pinHash || webauthnCred);
    await ext.storage.local.set({ panic: next, ...(lockAfter ? { locked: true } : {}) });
    await notifyWaTabs({ wpsCmd: "sync" });
  }
});

// Melacak tab yang sedang berbagi layar; `sharing` true bila ada minimal satu.
const setShare = async (tabId, on) => {
  const { shareTabs = [] } = await ext.storage.local.get("shareTabs");
  const set = new Set(shareTabs);
  on ? set.add(tabId) : set.delete(tabId);
  await ext.storage.local.set({ shareTabs: [...set], sharing: set.size > 0 });
};

ext.runtime.onMessage.addListener((m, sender, sendResponse) => {
  if (m && typeof m.share === "boolean" && sender.tab) setShare(sender.tab.id, m.share);
  else if (m && m.wpsForward) {
    notifyWaTabs(m.wpsForward).then((res) => sendResponse(res));
    return true;
  }
});
ext.tabs.onRemoved.addListener((id) => setShare(id, false));
ext.tabs.onUpdated.addListener((id, info) => { if (info.status === "loading") setShare(id, false); });

// Auto-sleep kamera saat keluar dari browser Chrome (500ms debounce)
let focusDebounceTimer = null;
if (typeof chrome !== "undefined" && chrome.windows) {
  chrome.windows.onFocusChanged.addListener((windowId) => {
    if (focusDebounceTimer) {
      clearTimeout(focusDebounceTimer);
      focusDebounceTimer = null;
    }

    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      focusDebounceTimer = setTimeout(async () => {
        focusDebounceTimer = null;
        if (isPopupOpen) return;
        try {
          const wins = await chrome.windows.getAll();
          const hasFocus = wins.some((w) => w.focused);
          if (!hasFocus) {
            notifyWaTabs({ wpsCmd: "browserFocus", active: false }).catch(() => {});
          }
        } catch {}
      }, 500);
    } else {
      notifyWaTabs({ wpsCmd: "browserFocus", active: true }).catch(() => {});
    }
  });
}

ext.tabs.onActivated.addListener(() => {
  if (focusDebounceTimer) {
    clearTimeout(focusDebounceTimer);
    focusDebounceTimer = null;
  }
  notifyWaTabs({ wpsCmd: "browserFocus", active: true }).catch(() => {});
});

ext.storage.onChanged.addListener((changes) => {
  if (changes.faceScope && changes.faceScope.newValue === "all") {
    injectAllTabs();
  }
});
