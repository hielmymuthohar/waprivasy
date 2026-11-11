const ext = globalThis.browser ?? globalThis.chrome;
window.addEventListener("message", (e) => {
  if (e.source !== window || !e.data || e.data.wps !== "share" || typeof e.data.on !== "boolean") return;
  ext.runtime.sendMessage({ share: e.data.on });
});
