const ext = globalThis.browser ?? globalThis.chrome;

const ICONS = {
  shield: `<svg class="wps-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  lock: `<svg class="wps-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  key: `<svg class="wps-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1.5-1.5L8 9l-1.5-1.5L5 9a6 6 0 1 0 8.5 8.5L22 9l-1-7z"/></svg>`,
  fingerprint: `<svg class="wps-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/><path d="M5 19.5C5.5 18 6 15 6 12c0-.7.1-1.4.3-2"/><path d="M8.6 15.5c.3-1 .4-2.2.4-3.5 0-1.7.7-3.2 1.8-4.2"/><path d="M12 7c2.8 0 5 2.2 5 5 0 2.2-.6 4.3-1.6 6"/><path d="M15 12c0 3.5-.8 6.5-2.2 8.5"/><path d="M19 12c0 2-.4 3.9-1 5.5"/></svg>`,
  faceScan: `<svg class="wps-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="10" r="3"/><path d="M7 17a5 5 0 0 1 10 0"/></svg>`,
  check: `<svg class="wps-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  plus: `<svg class="wps-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  refresh: `<svg class="wps-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>`,
  x: `<svg class="wps-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  alert: `<svg class="wps-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
};

const PROFILE_LABELS = {
  custom: "Kustom",
  kantor: "Kantor",
  rumah: "Rumah",
  publik: "Tempat umum",
  presentasi: "Presentasi",
};

const PROFILE_PRESETS = {
  custom: { enabled: true, messages: true, previews: true, media: true, names: true, avatars: true, input: false, hoverReveal: true, blurOnAway: true, blurOnShare: true, presentation: false, idleMinutes: 0, blur: 8, scope: "all", chats: [] },
  kantor: { enabled: true, messages: true, previews: true, media: true, names: false, avatars: false, input: true, hoverReveal: true, blurOnAway: true, blurOnShare: true, presentation: false, idleMinutes: 2, blur: 10, scope: "selected", chats: [] },
  rumah: { enabled: true, messages: false, previews: true, media: false, names: false, avatars: false, input: false, hoverReveal: true, blurOnAway: false, blurOnShare: true, presentation: false, idleMinutes: 0, blur: 6, scope: "selected", chats: [] },
  publik: { enabled: true, messages: true, previews: true, media: true, names: true, avatars: true, input: true, hoverReveal: false, blurOnAway: true, blurOnShare: true, presentation: false, idleMinutes: 1, blur: 14, scope: "all", chats: [] },
  presentasi: { enabled: true, messages: true, previews: true, media: true, names: true, avatars: true, input: true, hoverReveal: false, blurOnAway: true, blurOnShare: true, presentation: true, idleMinutes: 0, blur: 12, scope: "all", chats: [] },
};

const PROFILE_KEYS = ["enabled", "messages", "previews", "media", "names", "avatars", "input", "hoverReveal", "blurOnAway", "blurOnShare", "presentation", "idleMinutes", "blur"];

const DEFAULTS = {
  enabled: true, messages: true, previews: true, media: true,
  names: true, avatars: true, input: false, hoverReveal: true, blur: 8,
  blurOnAway: true, idleMinutes: 0, lockOnLoad: true,
  scope: "all", privateChats: "", pinHash: "", pinSalt: "",
  locked: false, panic: false,
  blurOnShare: true, presentation: false,
  webauthnCred: "", webauthnKey: "", webauthnOrigin: "",
  faceDetect: false, faceConsent: false, decoyEnabled: false, decoyHash: "", decoySalt: "",
  profile: "custom", profileConfigs: null, detectedChats: [],
};

const $ = (id) => document.getElementById(id);

const cleanChatName = (raw) =>
  (raw || "")
    .replace(/^\d+\s+pesan(?:\s+yang)?\s+belum\s+dibaca\s*/i, "")
    .replace(/^\d+\s+unread\s+messages?\s*/i, "")
    .trim();

const isIgnoredLabel = (txt) => {
  if (!txt) return true;
  const t = txt.trim();
  if (!t || t.length > 80) return true;
  if (/^(diarsipkan|archived|kemarin|yesterday|hari ini|today)$/i.test(t)) return true;
  if (/^\d{1,2}[:./]\d{2}(?:\s*[ap]m)?$/i.test(t)) return true;
  if (/^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?$/.test(t)) return true;
  return false;
};

const norm = (x) => {
  const raw = cleanChatName(x).toLowerCase();
  const alnum = raw.replace(/[^\p{L}\p{N}]+/gu, "");
  return alnum || raw.replace(/\s+/g, "");
};

const getWaTabs = async () => {
  try {
    return await ext.tabs.query({ url: "https://web.whatsapp.com/*" });
  } catch {
    return [];
  }
};

const ensureTabInjected = async (tabId) => {
  try {
    const chk = await ext.scripting.executeScript({
      target: { tabId },
      func: () => window.__wpsVersion || 0,
    });
    if (!chk || !chk[0] || chk[0].result !== 11) {
      await ext.scripting.insertCSS({ target: { tabId }, files: ["content.css"] });
      await ext.scripting.executeScript({ target: { tabId }, files: ["pin.js", "content.js"] });
    }
    await ext.scripting.executeScript({
      target: { tabId },
      func: () => { if (typeof window.__wpsSetPopup === "function") window.__wpsSetPopup(true); },
    });
  } catch {}
};

const runInWaTabs = async (cmd) => {
  const tabs = await getWaTabs();
  for (const t of tabs) {
    await ensureTabInjected(t.id);
    try {
      await ext.scripting.executeScript({
        target: { tabId: t.id },
        args: [cmd],
        func: (c) => {
          if (c === "sync" && typeof window.__wpsSync === "function") window.__wpsSync();
          else if (c === "startCamera" && typeof window.__wpsStartCamera === "function") window.__wpsStartCamera();
          else if (c === "stopCamera" && typeof window.__wpsStopCamera === "function") window.__wpsStopCamera();
          else if (c === "lock" && typeof window.__wpsLock === "function") window.__wpsLock();
          else if (c === "panic" && typeof window.__wpsPanic === "function") window.__wpsPanic();
          else if (c === "registerHello" && typeof window.__wpsRegisterHello === "function") window.__wpsRegisterHello();
        },
      });
    } catch {}
  }
};

const fetchChatsDirectly = async () => {
  const tabs = await getWaTabs();
  for (const t of tabs) {
    await ensureTabInjected(t.id);
    try {
      const res = await ext.scripting.executeScript({
        target: { tabId: t.id },
        func: () => {
          if (typeof window.__wpsGetChats === "function") {
            return window.__wpsGetChats();
          }
          return [];
        },
      });
      if (res && res[0] && Array.isArray(res[0].result) && res[0].result.length) {
        return res[0].result.map(cleanChatName).filter((x) => !isIgnoredLabel(x));
      }
    } catch {}
  }
  return [];
};

try { ext.runtime.connect({ name: "wps-popup" }); } catch {}

let state = null;
let currentProfile = "custom";
let profileConfigs = {};
let waChats = [];

const showAuthStatus = (hasPin, hasKey, isWaOrigin, msgText = "", isErr = false) => {
  // Status Kartu PIN
  const pinBadge = $("pinBadge");
  pinBadge.innerHTML = hasPin ? (ICONS.check + " Terpasang") : "Belum diatur";
  pinBadge.className = "status-pill " + (hasPin ? "on" : "off");

  $("oldPin").style.display = hasPin ? "" : "none";
  $("pin").placeholder = hasPin ? "PIN baru (4–12 digit)" : "Buat PIN (4–12 digit)";
  $("setPin").textContent = hasPin ? "Ubah PIN" : "Simpan";
  $("clearPin").style.display = hasPin ? "" : "none";
  if (!hasPin) $("deletePinBox").style.display = "none";

  const statusEl = $("pinStatus");
  statusEl.className = "note" + (isErr ? " err" : msgText ? " ok" : "");
  statusEl.textContent = msgText || (hasPin ? "PIN aktif melindungi WhatsApp Web Anda." : "Atur PIN angka 4–12 digit untuk mengunci layar.");

  // Status Kartu Windows Hello / Fingerprint
  const helloBadge = $("helloBadge");
  const helloDesc = $("helloDesc");
  const regBtn = $("regKey");
  const clearKeyBtn = $("clearKey");

  if (hasKey && isWaOrigin) {
    helloBadge.innerHTML = ICONS.check + " Terhubung";
    helloBadge.className = "status-pill on";
    helloDesc.className = "note ok";
    helloDesc.textContent = "Windows Hello / sidik jari sudah terhubung dan siap membuka kunci.";
    regBtn.innerHTML = ICONS.refresh + " Daftar Ulang Windows Hello";
    clearKeyBtn.style.display = "";
  } else if (hasKey && !isWaOrigin) {
    helloBadge.textContent = "Perlu pembaruan";
    helloBadge.className = "status-pill warn";
    helloDesc.className = "note err";
    helloDesc.textContent = "Klik tombol di bawah sekali untuk menyambungkan langsung di tab WhatsApp Web.";
    regBtn.innerHTML = ICONS.refresh + " Sambungkan di WhatsApp Web";
    clearKeyBtn.style.display = "";
  } else {
    helloBadge.textContent = "Belum terhubung";
    helloBadge.className = "status-pill off";
    helloDesc.className = "note";
    helloDesc.textContent = "Gunakan sensor biometrik sidik jari atau wajah untuk membuka kunci.";
    regBtn.innerHTML = ICONS.plus + " Sambungkan Windows Hello";
    clearKeyBtn.style.display = "none";
  }
};

const ensureProfileConfigs = (s) => {
  const cfg = s.profileConfigs ? structuredClone(s.profileConfigs) : {};
  for (const [k, preset] of Object.entries(PROFILE_PRESETS)) {
    if (!cfg[k]) cfg[k] = structuredClone(preset);
    if (!Array.isArray(cfg[k].chats)) cfg[k].chats = [];
    cfg[k].chats = cfg[k].chats.map(cleanChatName).filter((x) => !isIgnoredLabel(x));
    if (!cfg[k].scope) cfg[k].scope = preset.scope;
  }
  if (!s.profileConfigs) {
    const active = s.profile && PROFILE_PRESETS[s.profile] ? s.profile : "custom";
    const oldChats = (s.privateChats || "").split("\n").map(cleanChatName).filter((x) => !isIgnoredLabel(x));
    for (const k of PROFILE_KEYS) if (typeof s[k] !== "undefined") cfg[active][k] = s[k];
    cfg[active].scope = s.scope || "all";
    if (oldChats.length) {
      cfg[active].chats = oldChats;
      if (active !== "custom" && !cfg.custom.chats.length) cfg.custom.chats = [...oldChats];
    }
  }
  return cfg;
};

const activeCfg = () => profileConfigs[currentProfile];

const syncActiveProfileToStorage = async () => {
  const cfg = activeCfg();
  const patch = {
    profile: currentProfile,
    profileConfigs,
    scope: cfg.scope,
    privateChats: cfg.chats.join("\n"),
  };
  for (const k of PROFILE_KEYS) patch[k] = cfg[k];
  await ext.storage.local.set(patch);
  await runInWaTabs("sync");
};

const renderControls = () => {
  const cfg = activeCfg();
  $("profile").value = currentProfile;
  $("profileBadge").textContent = "Profil: " + (PROFILE_LABELS[currentProfile] || "Kustom");
  for (const el of document.querySelectorAll("[data-key]")) {
    const k = el.dataset.key;
    const val = k in cfg ? cfg[k] : state[k];
    if (el.type === "checkbox") el.checked = Boolean(val);
    else el.value = val;
  }
  const blurValEl = $("blurVal");
  if (blurValEl) blurValEl.textContent = (cfg.blur ?? 8) + "px";
  const isSel = cfg.scope === "selected";
  $("scopeAll").classList.toggle("active", !isSel);
  $("scopeSelected").classList.toggle("active", isSel);
  $("chatPickerPanel").style.display = isSel ? "block" : "none";
  renderChipsAndList();
};

const hasChat = (name) => {
  const n = norm(name);
  return Boolean(n && activeCfg().chats.some((c) => norm(c) === n));
};

const addChat = async (name) => {
  const clean = cleanChatName(name);
  if (!clean || hasChat(clean)) return;
  activeCfg().chats.push(clean);
  await syncActiveProfileToStorage();
  renderChipsAndList();
};

const removeChat = async (name) => {
  const n = norm(name);
  activeCfg().chats = activeCfg().chats.filter((c) => norm(c) !== n);
  await syncActiveProfileToStorage();
  renderChipsAndList();
};

const toggleChat = async (name) => {
  if (hasChat(name)) await removeChat(name);
  else await addChat(name);
};

const renderChipsAndList = () => {
  const cfg = activeCfg();
  const chipsEl = $("selectedChips");
  chipsEl.textContent = "";
  if (!cfg.chats.length) {
    const empty = document.createElement("span");
    empty.className = "empty-hint";
    empty.textContent = "Belum ada kontak/grup dipilih pada profil ini.";
    chipsEl.appendChild(empty);
  } else {
    for (const c of cfg.chats) {
      const chip = document.createElement("span");
      chip.className = "chip";
      const nameSpan = document.createElement("span");
      nameSpan.textContent = c;
      chip.appendChild(nameSpan);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML = ICONS.x;
      btn.title = "Hapus " + c;
      btn.setAttribute("aria-label", "Hapus " + c);
      btn.addEventListener("click", () => removeChat(c));
      chip.appendChild(btn);
      chipsEl.appendChild(chip);
    }
  }

  const q = norm($("chatInput").value);
  const listEl = $("waChatList");
  listEl.textContent = "";
  const filtered = waChats.filter((c) => !isIgnoredLabel(c) && (!q || norm(c).includes(q)));
  if (!filtered.length) {
    const empty = document.createElement("span");
    empty.className = "empty-hint";
    empty.textContent = waChats.length
      ? "Tidak ada kontak yang cocok. Klik 'Tambah' untuk menambah manual."
      : "Buka tab WhatsApp Web lalu klik 'Muat ulang' untuk menampilkan daftar kontak.";
    listEl.appendChild(empty);
    return;
  }
  for (const name of filtered) {
    const on = hasChat(name);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "wa-item" + (on ? " on" : "");
    const safeName = name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    btn.innerHTML = (on ? ICONS.check : ICONS.plus) + "<span>" + safeName + "</span>";
    btn.addEventListener("click", () => toggleChat(name));
    listEl.appendChild(btn);
  }
};

const refreshWaChats = async () => {
  const direct = await fetchChatsDirectly();
  if (direct.length) {
    waChats = direct;
    await ext.storage.local.set({ detectedChats: direct });
  } else {
    const { detectedChats = [] } = await ext.storage.local.get("detectedChats");
    if (Array.isArray(detectedChats) && detectedChats.length) {
      waChats = detectedChats.map(cleanChatName).filter((x) => !isIgnoredLabel(x));
    }
  }
  renderChipsAndList();
};

const renderFaceCardUI = (isOn) => {
  const badge = $("faceBadge");
  const desc = $("faceDesc");
  const actionRow = $("faceActionRow");
  if (!badge) return;
  if (isOn) {
    badge.className = "status-pill on";
    badge.innerHTML = ICONS.check + " Aktif";
    if (desc) desc.textContent = "Aktif memantau pengintip di layar. Seluruh obrolan WhatsApp otomatis di-blur jika terdeteksi > 1 wajah.";
    if (actionRow) actionRow.style.display = "none";
  } else {
    badge.className = "status-pill off";
    badge.textContent = "Mati";
    if (desc) desc.textContent = "Deteksi AI lokal memantau pengintip di layar. Privasi 100% di memori, tanpa simpan atau kirim gambar.";
    if (actionRow) actionRow.style.display = "none";
  }
};

ext.storage.local.get(DEFAULTS).then(async (s) => {
  state = s;
  if (Array.isArray(s.detectedChats) && s.detectedChats.length) {
    waChats = s.detectedChats.map(cleanChatName).filter((x) => !isIgnoredLabel(x));
  }
  currentProfile = s.profile && PROFILE_PRESETS[s.profile] ? s.profile : "custom";
  profileConfigs = ensureProfileConfigs(s);
  showAuthStatus(!!s.pinHash, !!s.webauthnCred, s.webauthnOrigin === "wa");
  renderFaceCardUI(Boolean(s.faceDetect));
  if (s.decoyHash) $("decoyStatus").textContent = "PIN decoy tersimpan.";

  for (const el of document.querySelectorAll("[data-key]")) {
    const k = el.dataset.key;
    const save = async () => {
      const v = el.type === "checkbox" ? el.checked : el.type === "range" || el.type === "number" ? Number(el.value) : el.value;
      if (k === "blur") {
        const bv = $("blurVal");
        if (bv) bv.textContent = v + "px";
      }
      if (PROFILE_KEYS.includes(k)) {
        activeCfg()[k] = v;
        await syncActiveProfileToStorage();
      } else {
        state[k] = v;
        const payload = { [k]: v };
        if (k === "faceDetect") {
          renderFaceCardUI(Boolean(v));
          if (v) {
            state.faceConsent = true;
            payload.faceConsent = true;
          }
          await ext.storage.local.set(payload);
          await runInWaTabs(v ? "startCamera" : "stopCamera");
        } else {
          await ext.storage.local.set(payload);
          await runInWaTabs("sync");
        }
      }
    };
    el.addEventListener("input", save);
    el.addEventListener("change", save);
  }

  renderControls();
  renderFaceCardUI(Boolean(s.faceDetect));
  await syncActiveProfileToStorage();
  await refreshWaChats();
});

$("profile").addEventListener("change", async () => {
  currentProfile = $("profile").value;
  renderControls();
  await syncActiveProfileToStorage();
});

$("scopeAll").addEventListener("click", async () => {
  activeCfg().scope = "all";
  renderControls();
  await syncActiveProfileToStorage();
});

$("scopeSelected").addEventListener("click", async () => {
  activeCfg().scope = "selected";
  renderControls();
  await syncActiveProfileToStorage();
  await refreshWaChats();
});

const handleAddInput = async () => {
  const val = $("chatInput").value.trim();
  if (!val) return;
  await addChat(val);
  $("chatInput").value = "";
  renderChipsAndList();
};
$("addChatBtn").addEventListener("click", handleAddInput);
$("chatInput").addEventListener("keydown", (e) => { if (e.key === "Enter") handleAddInput(); });
$("chatInput").addEventListener("input", renderChipsAndList);
$("refreshChatsBtn").addEventListener("click", refreshWaChats);

let pinFails = 0;
let pinNextTry = 0;

const checkPinRateLimit = (hasPin, hasKey, isWaOrigin) => {
  const wait = pinNextTry - Date.now();
  if (wait > 0) {
    showAuthStatus(hasPin, hasKey, isWaOrigin, `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(wait / 1000)} dtk.`, true);
    return false;
  }
  return true;
};

const recordPinFail = (hasPin, hasKey, isWaOrigin, msg) => {
  pinFails++;
  if (pinFails >= 3) pinNextTry = Date.now() + Math.min(2 ** (pinFails - 2) * 1000, 300000);
  showAuthStatus(hasPin, hasKey, isWaOrigin, msg, true);
};

const saveMainPin = async () => {
  const { pinHash = "", pinSalt = "", webauthnCred = "", webauthnOrigin = "" } =
    await ext.storage.local.get(["pinHash", "pinSalt", "webauthnCred", "webauthnOrigin"]);
  const hasPin = !!pinHash;
  const hasKey = !!webauthnCred;
  const isWa = webauthnOrigin === "wa";
  if (!checkPinRateLimit(hasPin, hasKey, isWa)) return;

  if (hasPin) {
    const oldVal = $("oldPin").value.trim();
    if (!oldVal) {
      showAuthStatus(hasPin, hasKey, isWa, "Masukkan PIN saat ini terlebih dahulu untuk mengubah PIN.", true);
      $("oldPin").focus();
      return;
    }
    if (!(await wpsVerifyPin(oldVal, pinSalt, pinHash))) {
      $("oldPin").value = "";
      recordPinFail(hasPin, hasKey, isWa, "PIN saat ini salah! Gagal mengubah PIN.");
      return;
    }
    pinFails = 0;
  }

  const pin = $("pin").value.trim();
  if (!/^\d{4,12}$/.test(pin)) {
    showAuthStatus(hasPin, hasKey, isWa, "PIN baru harus 4–12 digit angka.", true);
    return;
  }
  await ext.storage.local.set(await wpsHashPin(pin));
  $("oldPin").value = "";
  $("pin").value = "";
  showAuthStatus(true, hasKey, isWa, hasPin ? "PIN berhasil diubah." : "PIN berhasil disimpan.");
  await runInWaTabs("sync");
};
$("setPin").addEventListener("click", saveMainPin);
$("pin").addEventListener("keydown", (e) => { if (e.key === "Enter") saveMainPin(); });
$("oldPin").addEventListener("keydown", (e) => { if (e.key === "Enter") $("pin").focus(); });

$("clearPin").addEventListener("click", async () => {
  const { pinHash = "", webauthnCred = "", webauthnOrigin = "" } =
    await ext.storage.local.get(["pinHash", "webauthnCred", "webauthnOrigin"]);
  if (!pinHash) {
    showAuthStatus(false, !!webauthnCred, webauthnOrigin === "wa");
    return;
  }
  const box = $("deletePinBox");
  box.style.display = box.style.display === "none" ? "block" : "none";
  if (box.style.display === "block") {
    $("confirmDelPin").value = "";
    $("confirmDelPin").focus();
  }
});

const confirmDeletePin = async () => {
  const { pinHash = "", pinSalt = "", webauthnCred = "", webauthnOrigin = "" } =
    await ext.storage.local.get(["pinHash", "pinSalt", "webauthnCred", "webauthnOrigin"]);
  const hasKey = !!webauthnCred;
  const isWa = webauthnOrigin === "wa";
  if (!pinHash) return;
  if (!checkPinRateLimit(true, hasKey, isWa)) return;

  const entered = $("confirmDelPin").value.trim();
  if (!entered) {
    showAuthStatus(true, hasKey, isWa, "Masukkan PIN saat ini untuk menghapus PIN.", true);
    $("confirmDelPin").focus();
    return;
  }
  if (!(await wpsVerifyPin(entered, pinSalt, pinHash))) {
    $("confirmDelPin").value = "";
    recordPinFail(true, hasKey, isWa, "PIN salah! Penghapusan PIN dibatalkan.");
    return;
  }
  pinFails = 0;
  $("confirmDelPin").value = "";
  $("deletePinBox").style.display = "none";
  await ext.storage.local.set({ pinHash: "", pinSalt: "", locked: false });
  showAuthStatus(false, hasKey, isWa, "PIN berhasil dihapus.");
  await runInWaTabs("sync");
};
$("confirmDelBtn").addEventListener("click", confirmDeletePin);
$("confirmDelPin").addEventListener("keydown", (e) => { if (e.key === "Enter") confirmDeletePin(); });
$("cancelDelBtn").addEventListener("click", () => {
  $("confirmDelPin").value = "";
  $("deletePinBox").style.display = "none";
});

$("lockNow").addEventListener("click", async () => {
  const { pinHash = "", webauthnCred = "", webauthnOrigin = "" } =
    await ext.storage.local.get(["pinHash", "webauthnCred", "webauthnOrigin"]);
  if (!pinHash && !(webauthnCred && webauthnOrigin === "wa")) {
    showAuthStatus(!!pinHash, !!webauthnCred, webauthnOrigin === "wa", "Atur PIN atau sambungkan Windows Hello dulu sebelum mengunci.", true);
    return;
  }
  await ext.storage.local.set({ locked: true, panic: false });
  await runInWaTabs("lock");
  window.close();
});

$("panic").addEventListener("click", async () => {
  const { panic = false, pinHash = "", webauthnCred = "", webauthnOrigin = "" } =
    await ext.storage.local.get(["panic", "pinHash", "webauthnCred", "webauthnOrigin"]);
  const next = !panic;
  const lockAfter = !next && !!(pinHash || (webauthnCred && webauthnOrigin === "wa"));
  await ext.storage.local.set({ panic: next, ...(lockAfter ? { locked: true } : { locked: false }) });
  await runInWaTabs("sync");
  window.close();
});

// Pendaftaran Windows Hello langsung dilakukan di halaman WhatsApp Web (tanpa tab/iframe terpisah).
$("regKey").addEventListener("click", async () => {
  const tabs = await getWaTabs();
  if (!tabs.length) {
    $("helloDesc").className = "note err";
    $("helloDesc").textContent = "Buka tab WhatsApp Web terlebih dahulu untuk menyambungkan Windows Hello.";
    return;
  }
  await runInWaTabs("registerHello");
  window.close();
});

$("faceSetup").addEventListener("click", () => ext.tabs.create({ url: ext.runtime.getURL("camera-setup.html") }));

const saveDecoyPin = async () => {
  const mainEntered = $("decoyAuthPin").value.trim();
  const pin = $("decoyPin").value.trim();
  const s = await ext.storage.local.get(DEFAULTS);
  const msg = (t, err = false) => {
    $("decoyStatus").textContent = t;
    $("decoyStatus").className = "note" + (err ? " err" : " ok");
  };
  if (!s.pinHash) return msg("Atur PIN utama dulu.", true);
  if (!checkPinRateLimit(!!s.pinHash, !!s.webauthnCred, s.webauthnOrigin === "wa")) {
    return msg("Terlalu banyak percobaan gagal. Tunggu sebentar.", true);
  }
  if (!mainEntered) {
    $("decoyAuthPin").focus();
    return msg("Masukkan PIN utama untuk menyimpan/mengubah PIN decoy.", true);
  }
  if (!(await wpsVerifyPin(mainEntered, s.pinSalt, s.pinHash))) {
    $("decoyAuthPin").value = "";
    recordPinFail(!!s.pinHash, !!s.webauthnCred, s.webauthnOrigin === "wa", "PIN utama salah!");
    return msg("PIN utama salah! Gagal menyimpan PIN decoy.", true);
  }
  pinFails = 0;
  if (!/^\d{4,12}$/.test(pin)) return msg("PIN decoy harus 4–12 digit angka.", true);
  if (await wpsVerifyPin(pin, s.pinSalt, s.pinHash)) return msg("PIN decoy harus berbeda dari PIN utama.", true);
  const h = await wpsHashPin(pin);
  await ext.storage.local.set({ decoyHash: h.pinHash, decoySalt: h.pinSalt });
  $("decoyAuthPin").value = "";
  $("decoyPin").value = "";
  msg("PIN decoy tersimpan.");
};
$("setDecoy").addEventListener("click", saveDecoyPin);
$("decoyPin").addEventListener("keydown", (e) => { if (e.key === "Enter") saveDecoyPin(); });
$("decoyAuthPin").addEventListener("keydown", (e) => { if (e.key === "Enter") $("decoyPin").focus(); });

$("clearKey").addEventListener("click", async () => {
  const { pinHash = "", pinSalt = "", webauthnCred = "", webauthnOrigin = "" } =
    await ext.storage.local.get(["pinHash", "pinSalt", "webauthnCred", "webauthnOrigin"]);
  if (!webauthnCred) return;
  if (pinHash) {
    const oldVal = $("oldPin").value.trim() || $("confirmDelPin").value.trim();
    if (!oldVal) {
      showAuthStatus(true, true, webauthnOrigin === "wa", "Masukkan PIN saat ini di kolom 'Masukkan PIN saat ini' lalu klik Putuskan.", true);
      $("oldPin").focus();
      return;
    }
    if (!checkPinRateLimit(true, true, webauthnOrigin === "wa")) return;
    if (!(await wpsVerifyPin(oldVal, pinSalt, pinHash))) {
      $("oldPin").value = "";
      recordPinFail(true, true, webauthnOrigin === "wa", "PIN salah! Gagal memutuskan Windows Hello.");
      return;
    }
    pinFails = 0;
    $("oldPin").value = "";
  }
  await ext.storage.local.set({ webauthnCred: "", webauthnKey: "", webauthnOrigin: "" });
  showAuthStatus(!!pinHash, false, false, "Koneksi Windows Hello berhasil diputuskan.");
  await runInWaTabs("sync");
});
