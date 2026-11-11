const ext = globalThis.browser ?? globalThis.chrome;
const $ = (id) => document.getElementById(id);

$("agree").addEventListener("change", () => { $("go").disabled = !$("agree").checked; });
$("go").addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    stream.getTracks().forEach((t) => t.stop());
    await ext.storage.local.set({ faceConsent: true, faceDetect: true });
    $("msg").textContent = "Aktif. Tab ini bisa ditutup.";
  } catch (e) {
    $("msg").textContent = "Izin kamera ditolak atau kamera tidak tersedia (" + (e.name || e) + ").";
  }
});
