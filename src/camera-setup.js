const ext = globalThis.browser ?? globalThis.chrome;
const $ = (id) => document.getElementById(id);

const ICONS = {
  check: `<svg class="wps-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:inline-block;vertical-align:-3px;color:var(--primary);"><polyline points="20 6 9 17 4 12"/></svg>`,
};

$("agree").addEventListener("change", () => { $("go").disabled = !$("agree").checked; });
$("go").addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
    stream.getTracks().forEach((t) => { try { t.stop(); t.enabled = false; } catch {} });
    await ext.storage.local.set({ faceConsent: true, faceDetect: true, extCameraBlocked: false });
    $("msg").className = "note ok";
    $("msg").innerHTML = "<strong style='color:var(--primary);display:inline-flex;align-items:center;gap:6px;'>" + ICONS.check + " Izin kamera berhasil diberikan & deteksi wajah aktif!</strong><br><span style='color:var(--text-muted)'>Fitur anti-ngintip kini aktif di seluruh tab. Menutup tab ini otomatis...</span>";
    setTimeout(() => {
      try { window.close(); } catch {}
    }, 1800);
  } catch (e) {
    $("msg").className = "note err";
    $("msg").textContent = "Izin kamera ditolak atau kamera tidak tersedia (" + (e.name || e) + "). Klik ikon gembok/kamera di bilah alamat browser lalu pilih 'Izinkan'.";
  }
});
