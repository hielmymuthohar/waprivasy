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

ext.runtime.onInstalled.addListener(() => notifyWaTabs());
notifyWaTabs();

ext.runtime.onConnect.addListener((port) => {
  if (port.name !== "wps-popup") return;
  notifyWaTabs({ wpsCmd: "popup", open: true });
  port.onDisconnect.addListener(() => notifyWaTabs({ wpsCmd: "popup", open: false }));
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
      reasons: ["USER_MEDIA", "WORKERS"],
      justification: "Deteksi pengintip wajah di seluruh tab browser",
    });
  } catch (err) {
    console.error("[WPS Background Offscreen Create Error]", err);
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
      // Cek apakah ada tab WhatsApp Web yang sedang terbuka
      const waTabs = await ext.tabs.query({ url: "https://web.whatsapp.com/*" });
      if (waTabs.length > 0) {
        // WhatsApp Web aktif dan bertindak sebagai sensor kamera utama
        await closeOffscreen();
      } else {
        // Jika WhatsApp Web ditutup, jalankan offscreen document sebagai sensor independen
        await setupOffscreen();
      }
    } else {
      await closeOffscreen();
      await ext.storage.local.set({ faceAlert: false });
    }
  } catch {}
};

// Auto-mati saat jendela browser diminimize atau pengguna beralih ke aplikasi desktop lain (500ms responsif)
if (typeof chrome !== "undefined" && chrome.windows) {
  chrome.windows.onFocusChanged.addListener(async (windowId) => {
    try {
      const isBrowserActive = windowId !== chrome.windows.WINDOW_ID_NONE;
      // Kirim status fokus jendela ke tab WhatsApp Web
      notifyWaTabs({ wpsCmd: "browserFocus", active: isBrowserActive }).catch(() => {});
      // Kirim status ke offscreen document jika aktif
      ext.runtime.sendMessage({ type: isBrowserActive ? "RESUME_CAMERA" : "PAUSE_CAMERA" }).catch(() => {});
    } catch {}
  });
}

ext.tabs.onCreated.addListener(() => syncOffscreenState());
ext.tabs.onRemoved.addListener(() => setTimeout(syncOffscreenState, 500));

ext.storage.onChanged.addListener((changes) => {
  if (changes.faceDetect || changes.faceScope || changes.faceConsent) {
    syncOffscreenState();
  }
});

syncOffscreenState();
