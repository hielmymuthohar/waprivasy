(() => {
  const ext = globalThis.browser ?? globalThis.chrome;
  const FLAGS = ["enabled", "messages", "previews", "media", "names", "avatars", "input", "hoverReveal", "presentation"];
  const DEFAULTS = {
    enabled: true, messages: true, previews: true, media: true,
    names: true, avatars: true, input: false, hoverReveal: true, blur: 8,
    blurOnAway: true, idleMinutes: 0, lockOnLoad: true,
    scope: "all", privateChats: "",
    pinHash: "", pinSalt: "", locked: false, panic: false,
    presentation: false, blurOnShare: true, sharing: false,
    webauthnCred: "", webauthnKey: "", webauthnAlg: -7, webauthnOrigin: "",
    faceDetect: false, faceConsent: false, decoyEnabled: false, decoyHash: "", decoySalt: "",
  };
  const root = document.documentElement;
  let s = DEFAULTS;
  let locked = false;
  let panic = false;
  let registeringKey = false;
  let decoy = false;
  let faceFrame = null;
  let faceHits = 0;
  let faceClear = 0;
  let camError = false;
  let lastActivity = Date.now();
  let fails = 0;
  let nextTryAt = 0;
  let host, shadow;
  let savedTitle = "";
  let popupOpen = false;
  let lastSavedChatsJson = "";

  // Hentikan instance lama bila skrip diinjeksi ulang setelah reload extension.
  if (typeof window.__wpsCleanup === "function") {
    try { window.__wpsCleanup(); } catch {}
  }
  const alive = () => Boolean(ext && ext.runtime && ext.runtime.id);

  /* ---------- Blur & aturan per chat ---------- */
  const attrOf = (k) => "data-wps-" + k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
  const setFlag = (name, on) => (on ? root.setAttribute(name, "") : root.removeAttribute(name));

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

  // Baca teks lengkap termasuk alt emoji <img alt="🦢"> bila atribut title tidak ada.
  const readText = (el) => {
    if (!el) return "";
    const t = el.getAttribute && el.getAttribute("title");
    if (t && t.trim()) return cleanChatName(t);
    let out = "";
    const walk = (n) => {
      if (n.nodeType === 3) out += n.textContent;
      else if (n.nodeType === 1) {
        if (n.tagName === "IMG") out += n.getAttribute("alt") || "";
        else for (const c of n.childNodes) walk(c);
      }
    };
    walk(el);
    return cleanChatName(out);
  };

  // Normalisasi: huruf/angka saja, supaya emoji dan spasi tidak mengganggu pencocokan.
  const norm = (x) => {
    const raw = cleanChatName(x).toLowerCase();
    const alnum = raw.replace(/[^\p{L}\p{N}]+/gu, "");
    return alnum || raw.replace(/\s+/g, "");
  };
  const privateSet = () => new Set(s.privateChats.split("\n").map(norm).filter(Boolean));
  const isPrivate = (title, set) => {
    if (s.scope === "all") return true;
    const n = norm(title);
    return Boolean(n && set.has(n));
  };
  const mark = (el, on) => el && (on ? el.setAttribute("data-wps-private", "") : el.removeAttribute("data-wps-private"));

  // Temukan elemen satu baris chat di #pane-side.
  const findRow = (el) => {
    const explicit = el.closest('#pane-side [role="listitem"], #pane-side [role="row"], #pane-side [data-testid="cell-frame-container"]');
    if (explicit) return explicit;
    let row = el;
    while (row.parentElement && row.parentElement.id !== "pane-side") {
      const p = row.parentElement;
      const r = p.getBoundingClientRect();
      if (r.height > 115) break;
      const rowLikeChildren = [...p.children].filter((c) => {
        const cr = c.getBoundingClientRect();
        return cr.height >= 45 && cr.height <= 115 && cr.width > 160;
      });
      if (rowLikeChildren.length > 1) break;
      if (r.height === 0 && row.getBoundingClientRect().height >= 45) break;
      row = p;
    }
    return row;
  };

  // Kumpulkan semua baris chat di #pane-side beserta elemen judul kontak/grup dan preview-nya.
  const inspectRows = () => {
    const pane = document.getElementById("pane-side");
    if (!pane) return [];
    // Utamakan span[dir="auto"][title] yang di WhatsApp Web secara spesifik adalah nama kontak/grup.
    let candidates = [...pane.querySelectorAll('[data-testid="cell-frame-title"], span[dir="auto"][title]')];
    if (!candidates.length) {
      candidates = [...pane.querySelectorAll('span[title]')];
    }
    const byRow = new Map();
    for (const sp of candidates) {
      if (sp.closest("button")) continue;
      const txt = readText(sp);
      if (isIgnoredLabel(txt)) continue;
      const row = findRow(sp);
      if (!row || row === pane) continue;
      if (!byRow.has(row)) byRow.set(row, []);
      byRow.get(row).push(sp);
    }
    const items = [];
    for (const [row, list] of byRow) {
      list.sort((a, b) => {
        const dy = a.getBoundingClientRect().top - b.getBoundingClientRect().top;
        return Math.abs(dy) > 4 ? dy : a.getBoundingClientRect().left - b.getBoundingClientRect().left;
      });
      const titleEl = list[0];
      const titleText = readText(titleEl);
      if (isIgnoredLabel(titleText)) continue;
      const tTop = titleEl.getBoundingClientRect().top;
      titleEl.setAttribute("data-wps-role", "title");

      // Tandai baris kedua (preview pesan terakhir) di dalam baris chat ini.
      let topLine = titleEl;
      while (topLine.parentElement && topLine.parentElement !== row) {
        const sib = topLine.nextElementSibling;
        if (sib && sib.getBoundingClientRect().top >= tTop + 8) {
          sib.setAttribute("data-wps-role", "preview");
          break;
        }
        topLine = topLine.parentElement;
      }
      for (const sp of row.querySelectorAll('span[title], span[dir="auto"], span[dir="ltr"]')) {
        if (sp !== titleEl && sp.getBoundingClientRect().top - tTop >= 10) {
          sp.setAttribute("data-wps-role", "preview");
        }
      }
      items.push({ row, titleEl, titleText });
    }
    return items;
  };

  const getVisibleChatNames = () => {
    const names = [];
    const seen = new Set();
    const add = (t) => {
      const clean = cleanChatName(t);
      if (isIgnoredLabel(clean)) return;
      const key = norm(clean);
      if (clean && key && !seen.has(key)) { seen.add(key); names.push(clean); }
    };
    const main = document.getElementById("main");
    if (main) {
      const headerSpans = [...main.querySelectorAll('header span[dir="auto"][title], header span[title], header span[dir="auto"]')];
      const titleEl = headerSpans.find((el) => !isIgnoredLabel(readText(el)) && norm(readText(el)).length > 0);
      if (titleEl) add(readText(titleEl));
    }
    for (const it of inspectRows()) add(it.titleText);
    return names;
  };

  let scheduled = false;
  const scan = () => {
    scheduled = false;
    if (!alive()) return cleanup();
    const set = privateSet();
    const items = inspectRows();
    const wanted = new Set();
    for (const it of items) {
      if (isPrivate(it.titleText, set)) wanted.add(it.row);
    }
    for (const el of document.querySelectorAll("#pane-side [data-wps-private]")) {
      if (!wanted.has(el)) mark(el, false);
    }
    for (const el of wanted) mark(el, true);

    const main = document.getElementById("main");
    if (main) {
      const headerSpans = [...main.querySelectorAll('header span[dir="auto"][title], header span[title], header span[dir="auto"]')];
      const titleEl = headerSpans.find((el) => !isIgnoredLabel(readText(el)) && norm(readText(el)).length > 0);
      mark(main, titleEl ? isPrivate(readText(titleEl), set) : s.scope === "all");
    }

    const names = getVisibleChatNames();
    if (names.length) {
      const json = JSON.stringify(names);
      if (json !== lastSavedChatsJson) {
        lastSavedChatsJson = json;
        ext.storage.local.set({ detectedChats: names }).catch(() => {});
      }
    }
  };
  const scheduleScan = () => {
    if (!scheduled && alive()) { scheduled = true; setTimeout(scan, 80); }
  };

  const applySettings = () => {
    for (const k of FLAGS) setFlag(attrOf(k), s[k]);
    setFlag("data-wps-blur-away", s.blurOnAway);
    setFlag("data-wps-sharing", s.blurOnShare && s.sharing);
    root.style.setProperty("--wps-blur", s.blur + "px");
    scan();
  };

  /* ---------- WebAuthn langsung di top-level web.whatsapp.com (tanpa iframe) ---------- */
  const rnd = (n) => crypto.getRandomValues(new Uint8Array(n));
  let cachedCredStr = "";
  let cachedCredId = null;
  let nextChallenge = rnd(32);

  const getCredId = () => {
    if (s.webauthnCred !== cachedCredStr) {
      cachedCredStr = s.webauthnCred || "";
      cachedCredId = cachedCredStr ? wpsUnb64(cachedCredStr) : null;
    }
    return cachedCredId;
  };

  const registerKeyOnPage = async () => {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: rnd(32),
        rp: { name: "Privacy Shield for WA Web" },
        user: { id: rnd(16), name: "wa-privacy-user", displayName: "Pengguna WhatsApp Web" },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },   // ES256
          { type: "public-key", alg: -257 }, // RS256 (TPM Windows Hello)
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          residentKey: "discouraged",
          requireResidentKey: false,
          userVerification: "required",
        },
        attestation: "none",
      },
    });
    const data = {
      webauthnCred: wpsB64(cred.rawId),
      webauthnKey: cred.response.getPublicKey ? wpsB64(cred.response.getPublicKey()) : "ok",
      webauthnAlg: cred.response.getPublicKeyAlgorithm ? cred.response.getPublicKeyAlgorithm() : -7,
      webauthnOrigin: "wa",
    };
    Object.assign(s, data);
    getCredId();
    await ext.storage.local.set(data);
  };

  const unlockKeyOnPage = async () => {
    const id = getCredId();
    if (!id) return false;
    const challenge = nextChallenge;
    nextChallenge = rnd(32);
    const a = await navigator.credentials.get({
      publicKey: {
        challenge,
        userVerification: "required",
        // transports: ["internal"] memotong pencarian Bluetooth/USB/HP (caBLE) di Windows 10/11
        // sehingga dialog Windows Hello muncul instan tanpa jeda 2-4 detik.
        allowCredentials: [{ type: "public-key", id, transports: ["internal"] }],
      },
    });
    if (!a || !a.response || wpsB64(a.rawId) !== s.webauthnCred) return false;
    const auth = new Uint8Array(a.response.authenticatorData);
    // Bit 0 (0x01) = User Present, Bit 2 (0x04) = User Verified oleh Windows Hello
    return auth.length >= 33 && (auth[32] & 0x05) === 0x05;
  };

  /* ---------- Overlay (Shadow DOM) ---------- */
  const STYLE = `
    :host { all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; }
    .wrap { position: fixed; inset: 0; z-index: 2147483647; display: none; pointer-events: auto; font: 14px system-ui, -apple-system, sans-serif; }
    .wrap.on { display: flex; }
    .lock { background: radial-gradient(circle at center, #111b21 0%, #0b141a 100%); color: #e9edef; align-items: center; justify-content: center; flex-direction: column; padding: 20px; }
    .card { background: #182229; border: 1px solid #2a3942; border-radius: 16px; padding: 28px 26px; width: 100%; max-width: 340px; box-shadow: 0 12px 36px rgba(0,0,0,.55); display: flex; flex-direction: column; align-items: center; text-align: center; gap: 14px; }
    .icon-circle { width: 52px; height: 52px; border-radius: 50%; background: rgba(37, 211, 102, 0.14); color: #25d366; display: flex; align-items: center; justify-content: center; font-size: 24px; }
    .card h2 { margin: 0; font-size: 18px; font-weight: 600; color: #e9edef; }
    .sub { margin: -6px 0 2px; font-size: 12.5px; color: #8696a0; line-height: 1.4; }
    .pinRow { display: flex; flex-direction: column; width: 100%; gap: 10px; }
    .card input { width: 100%; box-sizing: border-box; padding: 11px 14px; border-radius: 10px; border: 1px solid #2a3942; background: #202c33; color: #fff; text-align: center; font-size: 16px; letter-spacing: 3px; outline: none; transition: border-color .15s; }
    .card input::placeholder { letter-spacing: normal; color: #8696a0; font-size: 13.5px; }
    .card input:focus { border-color: #25d366; }
    .btn-primary { width: 100%; padding: 11px 18px; border: 0; border-radius: 10px; background: #25d366; color: #0b141a; font-weight: 600; font-size: 14px; cursor: pointer; transition: filter .15s; }
    .btn-primary:hover { filter: brightness(1.06); }
    .divider { display: flex; align-items: center; width: 100%; gap: 10px; color: #8696a0; font-size: 11.5px; margin: 2px 0; }
    .divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: #2a3942; }
    .btn-hello { width: 100%; padding: 10px 16px; border: 1px solid #25d366; border-radius: 10px; background: rgba(37, 211, 102, 0.1); color: #25d366; font-weight: 600; font-size: 13.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background .15s; }
    .btn-hello:hover { background: rgba(37, 211, 102, 0.18); }
    .btn-ghost { width: 100%; padding: 9px 16px; border: 1px solid #2a3942; border-radius: 10px; background: transparent; color: #8696a0; font-weight: 500; font-size: 13px; cursor: pointer; }
    .btn-ghost:hover { background: #202c33; color: #e9edef; }
    .err { color: #ff8a80; font-size: 12.5px; min-height: 18px; }
    .badge { position: fixed; right: 12px; bottom: 12px; z-index: 2147483647; display: none; pointer-events: none;
      background: #182229; border: 1px solid #2a3942; color: #e9edef; padding: 8px 14px; border-radius: 12px; font: 12.5px system-ui, sans-serif; box-shadow: 0 4px 14px rgba(0,0,0,.45); }
    .badge.on { display: block; }
    .fake { background: #fff; color: #222; flex-direction: column; }
    .fake .bar { background: #f1f3f4; padding: 10px 16px; border-bottom: 1px solid #ddd; font-size: 14px; display: flex; justify-content: space-between; align-items: center; }
    .fake .hint { color: #777; font-size: 12px; }
    .fake .grid { flex: 1; background-image: linear-gradient(#e0e0e0 1px, transparent 1px), linear-gradient(90deg, #e0e0e0 1px, transparent 1px); background-size: 100px 24px; }
  `;
  const buildOverlay = () => {
    const old = document.getElementById("wps-overlay-host");
    if (old) old.remove();
    host = document.createElement("div");
    host.id = "wps-overlay-host";
    shadow = host.attachShadow({ mode: "closed" });
    shadow.innerHTML = `<style>${STYLE}</style>
      <div class="wrap lock" id="lock">
        <div class="card">
          <div class="icon-circle">🔒</div>
          <h2>Privacy Shield Terkunci</h2>
          <p class="sub" id="lockSub">Masukkan PIN atau gunakan Windows Hello untuk membuka kembali WhatsApp Web.</p>
          <div class="pinRow" id="pinRow">
            <input id="pin" type="password" inputmode="numeric" placeholder="Masukkan PIN" autocomplete="off">
            <button class="btn-primary" id="go">Buka Kunci</button>
          </div>
          <div class="divider" id="helloDiv" style="display:none">atau</div>
          <button class="btn-hello" id="helloBtn" style="display:none">
            <span>👆</span><span>Buka dengan Windows Hello / Sidik Jari</span>
          </button>
          <div class="err" id="err"></div>
        </div>
      </div>
      <div class="wrap lock" id="regModal">
        <div class="card">
          <div class="icon-circle">👆</div>
          <h2>Sambungkan Windows Hello</h2>
          <p class="sub">Klik tombol di bawah lalu verifikasi sidik jari, wajah, atau PIN Windows Anda.</p>
          <button class="btn-primary" id="regConfirmBtn">Verifikasi Windows Hello Sekarang</button>
          <button class="btn-ghost" id="regCancelBtn">Batal</button>
          <div class="err" id="regErr"></div>
        </div>
      </div>
      <div class="badge" id="cam"></div>
      <div class="badge" id="toast" style="bottom:48px"></div>
      <div class="wrap fake" id="fake">
        <div class="bar"><span>Spreadsheet tanpa judul</span><span class="hint">Tekan Alt+X untuk kembali</span></div>
        <div class="grid"></div>
      </div>`;
    root.appendChild(host);
    const pin = shadow.getElementById("pin");
    const go = shadow.getElementById("go");
    const err = shadow.getElementById("err");
    const helloBtn = shadow.getElementById("helloBtn");
    let helloBusy = false;
    const triggerHello = async () => {
      if (helloBusy) return;
      helloBusy = true;
      err.textContent = "";
      const origHtml = helloBtn.innerHTML;
      helloBtn.innerHTML = "<span>⏳</span><span>Memverifikasi Windows Hello...</span>";
      try {
        if (await unlockKeyOnPage()) {
          fails = 0; decoy = false; pin.value = ""; err.textContent = "";
          setLocked(false);
        } else {
          err.textContent = "Verifikasi Windows Hello gagal.";
        }
      } catch (e) {
        if (s.webauthnOrigin !== "wa") {
          err.textContent = "Kredensial lama terdeteksi. Buka PIN lalu klik 'Daftar Ulang Windows Hello' di popup.";
        } else if (e && e.name !== "NotAllowedError") {
          err.textContent = "Verifikasi gagal (" + (e.name || "Error") + ").";
        }
      } finally {
        helloBusy = false;
        helloBtn.innerHTML = origHtml;
      }
    };

    const submit = async () => {
      if (!pin.value && hasHello()) { triggerHello(); return; }
      const wait = nextTryAt - Date.now();
      if (wait > 0) { err.textContent = `Coba lagi dalam ${Math.ceil(wait / 1000)} dtk`; return; }
      if (s.pinHash && await wpsVerifyPin(pin.value, s.pinSalt, s.pinHash)) {
        fails = 0; decoy = false; pin.value = ""; err.textContent = ""; setLocked(false);
      } else if (s.decoyEnabled && s.decoyHash && await wpsVerifyPin(pin.value, s.decoySalt, s.decoyHash)) {
        fails = 0; decoy = true; pin.value = ""; err.textContent = ""; setLocked(false);
      } else {
        fails++;
        if (fails >= 3) nextTryAt = Date.now() + Math.min(2 ** (fails - 2) * 1000, 300000);
        err.textContent = "PIN salah. Silakan coba lagi."; pin.value = "";
      }
    };
    go.addEventListener("click", submit);
    pin.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") submit(); }, true);
    ["keyup", "keypress"].forEach((t) => pin.addEventListener(t, (e) => e.stopPropagation(), true));

    helloBtn.addEventListener("click", triggerHello);

    const regErr = shadow.getElementById("regErr");
    shadow.getElementById("regConfirmBtn").addEventListener("click", async () => {
      regErr.textContent = "";
      try {
        await registerKeyOnPage();
        registeringKey = false;
        render();
        toast("✓ Windows Hello / sidik jari berhasil terhubung!");
      } catch (e) {
        regErr.textContent = "Gagal mendaftarkan (" + (e.name || e) + "). Pastikan Windows Hello aktif di perangkat ini.";
      }
    });
    shadow.getElementById("regCancelBtn").addEventListener("click", () => {
      registeringKey = false;
      regErr.textContent = "";
      render();
    });
  };

  const hasHello = () => Boolean(s.webauthnCred && s.webauthnOrigin === "wa");
  const hasAuth = () => Boolean(s.pinHash || hasHello());

  const render = () => {
    if (!host || !host.isConnected) buildOverlay();
    const showPin = Boolean(s.pinHash);
    const showHello = hasHello();
    shadow.getElementById("lock").classList.toggle("on", locked);
    shadow.getElementById("regModal").classList.toggle("on", registeringKey && !locked);
    shadow.getElementById("pinRow").style.display = showPin ? "flex" : "none";
    shadow.getElementById("helloDiv").style.display = showPin && showHello ? "flex" : "none";
    shadow.getElementById("helloBtn").style.display = showHello ? "flex" : "none";
    shadow.getElementById("fake").classList.toggle("on", panic && !locked);
    setFlag("data-wps-locked", locked || panic || registeringKey);
    setFlag("data-wps-decoy", decoy && !locked);
    if (panic && !savedTitle) { savedTitle = document.title; document.title = "Spreadsheet tanpa judul"; }
    else if (!panic && savedTitle) { document.title = savedTitle; savedTitle = ""; }
    const cam = shadow.getElementById("cam");
    cam.classList.toggle("on", !!faceFrame);
    cam.textContent = camError ? "Kamera gagal dimulai" : "Kamera aktif (deteksi wajah)";
    if (locked && showPin) shadow.getElementById("pin").focus();
  };

  const setLocked = async (v) => {
    locked = v;
    if (v) { panic = false; registeringKey = false; }
    render();
    if (alive()) await ext.storage.local.set({ locked, panic });
  };
  const toast = (msg) => {
    if (!host || !host.isConnected) buildOverlay();
    const el = shadow.getElementById("toast");
    el.textContent = msg; el.classList.add("on");
    setTimeout(() => el.classList.remove("on"), 4000);
  };
  const lockNow = () => {
    if (hasAuth()) setLocked(true);
    else toast("Atur PIN atau sambungkan Windows Hello dulu di popup Privacy Shield");
  };
  const startRegisterHello = () => {
    registeringKey = true;
    render();
  };
  const togglePanic = async () => {
    if (panic) {
      panic = false;
      if (hasAuth()) locked = true;
    } else {
      panic = true;
      locked = false;
    }
    render();
    if (alive()) await ext.storage.local.set({ locked, panic });
  };

  /* ---------- Deteksi wajah (opt-in) ---------- */
  const EXT_ORIGIN = alive() ? new URL(ext.runtime.getURL("")).origin : "";
  const syncFace = () => {
    const want = s.faceDetect && s.faceConsent && alive();
    if (want && !faceFrame) {
      camError = false;
      faceFrame = document.createElement("iframe");
      faceFrame.src = ext.runtime.getURL("face.html");
      faceFrame.allow = "camera";
      faceFrame.style.cssText = "position:fixed;width:1px;height:1px;border:0;opacity:0;pointer-events:none";
      root.appendChild(faceFrame);
    } else if (!want && faceFrame) {
      faceFrame.remove(); faceFrame = null; faceHits = faceClear = 0;
      setFlag("data-wps-face-alert", false);
    }
    render();
  };

  const onMessage = (e) => {
    if (!alive() || e.origin !== EXT_ORIGIN) return;
    if (faceFrame && e.source === faceFrame.contentWindow) {
      const v = e.data && e.data.wpsFace;
      if (typeof v === "number") {
        if (v > 1) { faceHits++; faceClear = 0; } else { faceClear++; faceHits = 0; }
        if (faceHits >= 2) setFlag("data-wps-face-alert", true);
        if (faceClear >= 4) setFlag("data-wps-face-alert", false);
      } else if (typeof v === "string" && v.startsWith("error")) { camError = true; render(); }
    }
  };
  window.addEventListener("message", onMessage);

  /* ---------- Pemicu ---------- */
  const onKey = (e) => {
    if (!alive()) return cleanup();
    if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const k = e.key.toLowerCase();
    if (k !== "l" && k !== "x" && k !== "z") return;
    e.preventDefault(); e.stopPropagation();
    if (k === "x") togglePanic();
    else if (!locked && k === "l") lockNow();
    else if (!locked && k === "z") ext.storage.local.set({ enabled: !s.enabled });
  };
  window.addEventListener("keydown", onKey, true);

  const away = () => {
    if (!alive()) return cleanup();
    setFlag("data-wps-away", !popupOpen && (document.hidden || !document.hasFocus()));
  };
  window.addEventListener("blur", away);
  window.addEventListener("focus", away);
  document.addEventListener("visibilitychange", away);

  const touch = () => { lastActivity = Date.now(); };
  ["mousemove", "keydown", "mousedown", "wheel", "touchstart"].forEach((t) =>
    window.addEventListener(t, touch, { passive: true, capture: true }));
  const idleTimer = setInterval(() => {
    if (!alive()) return cleanup();
    if (s.idleMinutes > 0 && hasAuth() && !locked && Date.now() - lastActivity > s.idleMinutes * 60000) setLocked(true);
  }, 5000);

  const load = async (initial) => {
    if (!alive()) return cleanup();
    s = await ext.storage.local.get(DEFAULTS);
    getCredId();
    if (initial && hasAuth() && s.lockOnLoad) {
      locked = true; panic = false;
      ext.storage.local.set({ locked: true, panic: false }).catch(() => {});
    } else {
      locked = Boolean(s.locked && hasAuth());
      panic = Boolean(s.panic);
    }
    applySettings();
    syncFace();
    render();
  };

  const observer = new MutationObserver(scheduleScan);
  observer.observe(root, { childList: true, subtree: true, characterData: true });

  const onStorageChanged = () => load(false);
  const onRuntimeMessage = (m, _sender, sendResponse) => {
    if (!m || !m.wpsCmd) return;
    if (m.wpsCmd === "ping") sendResponse({ ok: true, v: 6 });
    else if (m.wpsCmd === "getChats") sendResponse({ ok: true, chats: getVisibleChatNames() });
    else if (m.wpsCmd === "lock") { lockNow(); sendResponse({ ok: true }); }
    else if (m.wpsCmd === "panic") { togglePanic(); sendResponse({ ok: true }); }
    else if (m.wpsCmd === "registerHello") { startRegisterHello(); sendResponse({ ok: true }); }
    else if (m.wpsCmd === "popup") {
      popupOpen = Boolean(m.open);
      setTimeout(away, popupOpen ? 0 : 150);
      sendResponse({ ok: true });
    }
    else if (m.wpsCmd === "sync") { load(false); sendResponse({ ok: true }); }
  };

  const cleanup = () => {
    observer.disconnect();
    clearInterval(idleTimer);
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("blur", away);
    window.removeEventListener("focus", away);
    window.removeEventListener("message", onMessage);
    document.removeEventListener("visibilitychange", away);
    try { ext.runtime.onMessage.removeListener(onRuntimeMessage); } catch {}
    try { ext.storage.onChanged.removeListener(onStorageChanged); } catch {}
    if (faceFrame) { faceFrame.remove(); faceFrame = null; }
    if (host) { host.remove(); host = null; }
  };

  window.__wpsCleanup = cleanup;
  window.__wpsVersion = 6;
  window.__wpsGetChats = getVisibleChatNames;
  window.__wpsSync = () => load(false);
  window.__wpsLock = lockNow;
  window.__wpsPanic = togglePanic;
  window.__wpsRegisterHello = startRegisterHello;
  window.__wpsSetPopup = (open) => {
    popupOpen = Boolean(open);
    setTimeout(away, popupOpen ? 0 : 150);
  };

  ext.runtime.onMessage.addListener(onRuntimeMessage);
  ext.storage.onChanged.addListener(onStorageChanged);
  load(true);
})();
