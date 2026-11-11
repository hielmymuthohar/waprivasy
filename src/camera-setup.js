const ext = globalThis.browser ?? globalThis.chrome;
const $ = (id) => document.getElementById(id);

$("agree").addEventListener("change", () => { $("go").disabled = !$("agree").checked; });
$("go").addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    stream.getTracks().forEach((t) => t.stop());
    await ext.storage.local.set({ faceConsent: true, faceDetect: true });
    $("msg").innerHTML = "<strong style='color:#25d366'>✓ Kamera berhasil diizinkan & deteksi wajah aktif!</strong><br><span style='color:#8696a0'>Tab ini sudah bisa ditutup. Buka tab WhatsApp Web Anda untuk mencobanya.</span>";
  } catch (e) {
    $("msg").textContent = "Izin kamera ditolak atau kamera tidak tersedia (" + (e.name || e) + ").";
  }
});
