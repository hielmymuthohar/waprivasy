const ext = globalThis.browser ?? globalThis.chrome;

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
    if (!chk || !chk[0] || chk[0].result !== 7) {
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
  pinBadge.textContent = hasPin ? "✓ Terpasang" : "Belum diatur";
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
    helloBadge.textContent = "✓ Terhubung";
    helloBadge.className = "status-pill on";
    helloDesc.className = "note ok";
    helloDesc.textContent = "✓ Windows Hello / sidik jari sudah terhubung dan siap membuka kunci.";
    regBtn.textContent = "↻ Daftar Ulang Windows Hello";
    clearKeyBtn.style.display = "";
  } else if (hasKey && !isWaOrigin) {
    helloBadge.textContent = "Perlu pembaruan";
    helloBadge.className = "status-pill warn";
    helloDesc.className = "note err";
    helloDesc.textContent = "Klik tombol di bawah sekali untuk menyambungkan langsung di tab WhatsApp Web.";
    regBtn.textContent = "👆 Sambungkan Ulang di WhatsApp Web";
    clearKeyBtn.style.display = "";
  } else {
    helloBadge.textContent = "Belum terhubung";
    helloBadge.className = "status-pill off";
    helloDesc.className = "note";
    helloDesc.textContent = "Gunakan sidik jari atau wajah di laptop Anda untuk membuka kunci.";
    regBtn.textContent = "+ Sambungkan Windows Hello / Sidik Jari";
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
      chip.textContent = c + " ";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "×";
      btn.title = "Hapus " + c;
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
      ? "Tidak ada kontak yang cocok. Klik '+ Tambah' untuk menambah manual."
      : "Buka tab WhatsApp Web lalu klik '↻ Muat ulang' untuk menampilkan daftar kontak.";
    listEl.appendChild(empty);
    return;
  }
  for (const name of filtered) {
    const on = hasChat(name);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "wa-item" + (on ? " on" : "");
    btn.textContent = (on ? "✓ " : "+ ") + name;
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

ext.storage.local.get(DEFAULTS).then(async (s) => {
  state = s;
  if (Array.isArray(s.detectedChats) && s.detectedChats.length) {
    waChats = s.detectedChats.map(cleanChatName).filter((x) => !isIgnoredLabel(x));
  }
  currentProfile = s.profile && PROFILE_PRESETS[s.profile] ? s.profile : "custom";
  profileConfigs = ensureProfileConfigs(s);
  showAuthStatus(!!s.pinHash, !!s.webauthnCred, s.webauthnOrigin === "wa");
  $("faceDetect").disabled = !s.faceConsent;
  if (s.decoyHash) $("decoyStatus").textContent = "✓ PIN decoy tersimpan.";

  for (const el of document.querySelectorAll("[data-key]")) {
    const k = el.dataset.key;
    const save = async () => {
      const v = el.type === "checkbox" ? el.checked : el.type === "range" || el.type === "number" ? Number(el.value) : el.value;
      if (PROFILE_KEYS.includes(k)) {
        activeCfg()[k] = v;
        await syncActiveProfileToStorage();
      } else {
        state[k] = v;
        await ext.storage.local.set({ [k]: v });
        await runInWaTabs("sync");
      }
    };
    el.addEventListener("input", save);
    el.addEventListener("change", save);
  }

  renderControls();
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
  showAuthStatus(true, hasKey, isWa, hasPin ? "✓ PIN berhasil diubah." : "✓ PIN berhasil disimpan.");
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
  msg("✓ PIN decoy tersimpan.");
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
