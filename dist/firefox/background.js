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

let isPopupOpen = false;
ext.runtime.onConnect.addListener((port) => {
  if (port.name !== "wps-popup") return;
  isPopupOpen = true;
  notifyWaTabs({ wpsCmd: "popup", open: true });
  port.onDisconnect.addListener(() => {
    isPopupOpen = false;
    notifyWaTabs({ wpsCmd: "popup", open: false });
    checkChromeFocus();
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

// Deteksi status fokus browser & minimize
const winApi = ext?.windows ?? globalThis.chrome?.windows;
const NO_WINDOW = winApi?.WINDOW_ID_NONE ?? -1;
let currentBrowserFocus = null;

const setBrowserFocus = (active) => {
  if (currentBrowserFocus === active) return;
  currentBrowserFocus = active;
  ext.storage.local.set({ browserFocused: active });
  notifyWaTabs({ wpsCmd: "browserFocus", active }).catch(() => {});
};

const checkChromeFocus = async () => {
  if (!winApi) return;
  if (isPopupOpen) {
    setBrowserFocus(true);
    return;
  }
  try {
    const wins = await winApi.getAll({ populate: false });
    if (!wins || !wins.length) {
      setBrowserFocus(false);
      return;
    }

    // Jika ada jendela yang fokus dan tidak di-minimize, browser pasti fokus
    const hasActive = wins.some((w) => w.state !== "minimized" && Boolean(w.focused));
    if (hasActive) {
      setBrowserFocus(true);
      return;
    }

    // Jika semua jendela Chrome berstatus minimized, browser pasti tidak fokus
    const allMinimized = wins.every((w) => w.state === "minimized");
    if (allMinimized) {
      setBrowserFocus(false);
      return;
    }

    // Periksa window yang terakhir kali fokus
    const lastWin = await winApi.getLastFocused({ populate: false }).catch(() => null);
    if (!lastWin || lastWin.state === "minimized" || !lastWin.focused) {
      setBrowserFocus(false);
    } else {
      setBrowserFocus(true);
    }
  } catch {
    setBrowserFocus(false);
  }
};

if (winApi) {
  winApi.onFocusChanged.addListener((windowId) => {
    if (windowId === NO_WINDOW) {
      setBrowserFocus(false);
    } else {
      checkChromeFocus();
    }
  });

  if (winApi.onBoundsChanged) {
    winApi.onBoundsChanged.addListener((win) => {
      if (win && win.state === "minimized") {
        checkChromeFocus();
      }
    });
  }
}

ext.tabs.onActivated.addListener(() => {
  setBrowserFocus(true);
});

ext.runtime.onMessage.addListener((m, sender, sendResponse) => {
  if (m && typeof m.share === "boolean" && sender.tab) {
    setShare(sender.tab.id, m.share);
  } else if (m && m.wpsForward) {
    notifyWaTabs(m.wpsForward).then((res) => sendResponse(res));
    return true;
  } else if (m && m.wpsCmd === "tabFocusReport") {
    if (m.focused) {
      setBrowserFocus(true);
    } else {
      checkChromeFocus();
    }
  }
});

ext.tabs.onRemoved.addListener((id) => setShare(id, false));
ext.tabs.onUpdated.addListener((id, info) => { if (info.status === "loading") setShare(id, false); });

ext.storage.onChanged.addListener((changes) => {
  if (changes.faceScope && changes.faceScope.newValue === "all") {
    injectAllTabs();
  }
});

ext.runtime.onInstalled.addListener(() => {
  notifyWaTabs();
  injectAllTabs();
  checkChromeFocus();
});

// Jalankan pengecekan fokus awal saat service worker pertama kali/kembali aktif
checkChromeFocus();
