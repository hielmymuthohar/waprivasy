// Berjalan di konteks halaman (Meet/Teams/Zoom web): memberi tahu saat berbagi layar mulai/berhenti.
(() => {
  const md = navigator.mediaDevices;
  if (!md || !md.getDisplayMedia) return;
  const orig = md.getDisplayMedia.bind(md);
  md.getDisplayMedia = async (...args) => {
    const stream = await orig(...args);
    window.postMessage({ wps: "share", on: true }, "*");
    const check = () => {
      if (!stream.getTracks().some((t) => t.readyState === "live")) window.postMessage({ wps: "share", on: false }, "*");
    };
    stream.getTracks().forEach((t) => t.addEventListener("ended", check));
    return stream;
  };
})();
