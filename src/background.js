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
  // Saat popup aktif, pastikan kamera tidak dipause
  ext.runtime.sendMessage({ type: "RESUME_CAMERA" }).catch(() => {});
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

/* ---------- Manajemen Deteksi Wajah Multi-Tab (Offscreen Document) ---------- */
const OFFSCREEN_PATH = "offscreen.html";
const hasOffscreenSupport = () => Boolean(typeof chrome !== "undefined" && chrome.offscreen);

const isOffscreenOpen = async () => {
  if (!hasOffscreenSupport()) return false;
  try {
    if ("getContexts" in chrome.runtime) {
      const contexts = await chrome.runtime.getContexts({
        contextTypes: ["OFFSCREEN_DOCUMENT"],
        documentUrls: [chrome.runtime.getURL(OFFSCREEN_PATH)],
      });
      return contexts.length > 0;
    }
  } catch {}
  return false;
};

const setupOffscreen = async () => {
  if (!hasOffscreenSupport()) return;
  if (await isOffscreenOpen()) return;
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_PATH,
      reasons: ["USER_MEDIA"],
      justification: "Deteksi pengintip wajah di seluruh tab browser",
    });
  } catch (err) {
    if (!String(err).includes("Only a single offscreen document may be created")) {
      console.error("[WPS Background Offscreen Create Error]", err);
    }
  }
};

const closeOffscreen = async () => {
  if (!hasOffscreenSupport()) return;
  if (!(await isOffscreenOpen())) return;
  try {
    await chrome.offscreen.closeDocument();
  } catch (err) {
    console.error("[WPS Background Offscreen Close Error]", err);
  }
};

const syncOffscreenState = async () => {
  try {
    const { faceDetect = false, faceConsent = false, faceScope = "wa" } =
      await ext.storage.local.get(["faceDetect", "faceConsent", "faceScope"]);

    if (faceDetect && faceConsent && faceScope === "all") {
      // Pada mode semua tab, offscreen document SELALU aktif sebagai sensor pusat tunggal
      await setupOffscreen();
      await injectAllTabs();
      // Pastikan offscreen document menerima instruksi start
      ext.runtime.sendMessage({ type: "START_CAMERA" }).catch(() => {});
    } else {
      await closeOffscreen();
      await ext.storage.local.set({ faceAlert: false, faceCount: 0 });
    }
  } catch {}
};

// Auto-mati saat jendela browser diminimize atau pengguna beralih ke aplikasi desktop lain
let focusDebounceTimer = null;
if (typeof chrome !== "undefined" && chrome.windows) {
  chrome.windows.onFocusChanged.addListener((windowId) => {
    if (focusDebounceTimer) {
      clearTimeout(focusDebounceTimer);
      focusDebounceTimer = null;
    }

    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      // Debounce 800ms untuk memastikan pengguna benar-benar beralih keluar browser
      focusDebounceTimer = setTimeout(async () => {
        focusDebounceTimer = null;
        if (isPopupOpen) return;
        try {
          const wins = await chrome.windows.getAll();
          const hasFocus = wins.some((w) => w.focused);
          if (!hasFocus) {
            ext.runtime.sendMessage({ type: "PAUSE_CAMERA" }).catch(() => {});
            notifyWaTabs({ wpsCmd: "browserFocus", active: false }).catch(() => {});
          }
        } catch {}
      }, 800);
    } else {
      // Kembali ke browser: resume kamera seketika tanpa delay
      try {
        ext.runtime.sendMessage({ type: "RESUME_CAMERA" }).catch(() => {});
        notifyWaTabs({ wpsCmd: "browserFocus", active: true }).catch(() => {});
      } catch {}
    }
  });
}

// Saat user berganti tab aktif di Chrome, pastikan kamera aktif
ext.tabs.onActivated.addListener(() => {
  if (focusDebounceTimer) {
    clearTimeout(focusDebounceTimer);
    focusDebounceTimer = null;
  }
  ext.runtime.sendMessage({ type: "RESUME_CAMERA" }).catch(() => {});
});

ext.tabs.onCreated.addListener(() => syncOffscreenState());
ext.tabs.onRemoved.addListener(() => setTimeout(syncOffscreenState, 500));

ext.storage.onChanged.addListener((changes) => {
  if (changes.faceDetect || changes.faceScope || changes.faceConsent) {
    syncOffscreenState();
  }
});

syncOffscreenState();
