(() => {
  if (location.hostname === "web.whatsapp.com") return;
  const ext = globalThis.browser ?? globalThis.chrome;
  if (!ext || !ext.storage) return;

  const ICONS = {
    alert: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  };

  let host = null;
  let shadow = null;
  let isAlert = false;

  const ensureOverlay = () => {
    if (host && host.isConnected) return;
    if (!host) {
      host = document.createElement("div");
      host.id = "wps-global-shield-host";
      shadow = host.attachShadow({ mode: "closed" });
      shadow.innerHTML = `
        <style>
          :host { all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; }
          .backdrop {
            position: fixed; inset: 0;
            background: rgba(15, 23, 42, 0.55);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            display: none;
            pointer-events: auto;
            user-select: none;
            z-index: 2147483647;
            opacity: 0;
            transition: opacity 0.2s ease;
          }
          .backdrop.on {
            display: block;
            opacity: 1;
          }
          .badge {
            position: fixed; right: 16px; bottom: 16px;
            z-index: 2147483647;
            background: #182229;
            border: 1px solid #2a3942;
            color: #ffb74d;
            padding: 8px 14px;
            border-radius: 9999px;
            font: 12.5px system-ui, -apple-system, sans-serif;
            box-shadow: 0 4px 14px rgba(0,0,0,.45);
            display: none;
            align-items: center;
            gap: 7px;
            pointer-events: none;
          }
          .badge.on { display: flex; }
          .badge svg { flex-shrink: 0; }
        </style>
        <div class="backdrop" id="backdrop"></div>
        <div class="badge" id="badge"></div>
      `;
    }
    const target = document.body || document.documentElement;
    if (target && !host.isConnected) {
      target.appendChild(host);
    } else if (!target) {
      document.addEventListener("DOMContentLoaded", () => {
        (document.body || document.documentElement)?.appendChild(host);
      }, { once: true });
    }
  };

  const applyAlert = (on, count) => {
    if (on === isAlert) return;
    isAlert = on;
    ensureOverlay();
    const backdrop = shadow?.getElementById("backdrop");
    const badge = shadow?.getElementById("badge");
    if (!backdrop || !badge) return;
    backdrop.classList.toggle("on", on);
    badge.classList.toggle("on", on);
    if (on) {
      badge.innerHTML = ICONS.alert + ` <span>Terdeteksi ${count || 2} wajah (Layar tersamar)</span>`;
    }
  };

  const sync = async () => {
    try {
      const { faceDetect = false, faceScope = "wa", faceAlert = false, faceCount = 0 } =
        await ext.storage.local.get(["faceDetect", "faceScope", "faceAlert", "faceCount"]);
      if (faceDetect && faceScope === "all" && faceAlert) {
        applyAlert(true, faceCount);
      } else {
        applyAlert(false, 0);
      }
    } catch {}
  };

  // Lapor status fokus dari tab non-WA ke background.js
  let lastReportedFocus = null;
  const reportTabFocus = (focused) => {
    if (focused === lastReportedFocus) return;
    lastReportedFocus = focused;
    try {
      if (ext?.runtime?.sendMessage) {
        ext.runtime.sendMessage({ wpsCmd: "tabFocusReport", focused }).catch(() => {});
      }
    } catch {}
  };

  window.addEventListener("focus", () => reportTabFocus(true));
  window.addEventListener("blur", () => reportTabFocus(false));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      reportTabFocus(false);
    } else if (document.hasFocus()) {
      reportTabFocus(true);
    }
  });

  ext.storage.onChanged.addListener((changes) => {
    if (changes.faceAlert || changes.faceDetect || changes.faceScope || changes.faceCount) {
      sync();
    }
  });

  sync();
})();
