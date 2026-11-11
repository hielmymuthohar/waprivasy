const ext = globalThis.browser ?? globalThis.chrome;
const $ = (id) => document.getElementById(id);

const ICONS = {
  check: `<svg class="wps-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:inline-block;vertical-align:-3px;color:var(--primary);"><polyline points="20 6 9 17 4 12"/></svg>`,
};

$("agree").addEventListener("change", () => { $("go").disabled = !$("agree").checked; });
$("go").addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    stream.getTracks().forEach((t) => t.stop());
    await ext.storage.local.set({ faceConsent: true, faceDetect: true });
    $("msg").innerHTML = "<strong style='color:var(--primary);display:inline-flex;align-items:center;gap:6px;'>" + ICONS.check + " Kamera berhasil diizinkan & deteksi wajah aktif!</strong><br><span style='color:var(--text-muted)'>Tab ini sudah bisa ditutup. Buka tab WhatsApp Web Anda untuk mencobanya.</span>";
  } catch (e) {
    $("msg").className = "note err";
    $("msg").textContent = "Izin kamera ditolak atau kamera tidak tersedia (" + (e.name || e) + ").";
  }
});
