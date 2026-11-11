const ext = globalThis.browser ?? globalThis.chrome;
const $ = (id) => document.getElementById(id);

const ICONS = {
  check: `<svg class="wps-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:inline-block;vertical-align:-3px;color:var(--primary);"><polyline points="20 6 9 17 4 12"/></svg>`,
};

$("agree").addEventListener("change", () => { $("go").disabled = !$("agree").checked; });

$("go").addEventListener("click", async () => {
  $("go").disabled = true;
  $("msg").className = "note";
  $("msg").textContent = "Menghubungkan ke kamera...";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      audio: false,
    });

    const previewBox = $("previewBox");
    const testVideo = $("testVideo");
    if (previewBox && testVideo) {
      previewBox.style.display = "block";
      testVideo.srcObject = stream;
      await testVideo.play().catch(() => {});
    }

    await ext.storage.local.set({ faceConsent: true, faceDetect: true, extCameraBlocked: false });
    ext.runtime.sendMessage({ type: "START_CAMERA" }).catch(() => {});

    $("msg").className = "note ok";
    $("msg").innerHTML = "<strong style='color:var(--primary);display:inline-flex;align-items:center;gap:6px;'>" + ICONS.check + " Kamera berhasil terhubung &amp; deteksi aktif di seluruh tab!</strong><br><span style='color:var(--text-muted)'>Lampu webcam menyala. Anda dapat menutup tab ini sekarang untuk mulai menggunakannya.</span>";

    setTimeout(() => {
      try {
        stream.getTracks().forEach((t) => { try { t.stop(); t.enabled = false; } catch {} });
        if (testVideo) testVideo.srcObject = null;
      } catch {}
    }, 4500);
  } catch (e) {
    $("go").disabled = false;
    $("msg").className = "note err";
    $("msg").textContent = "Gagal mengakses kamera (" + (e.name || e) + "). Pastikan Anda memilih 'Izinkan' saat diminta browser, atau klik ikon kamera di bilah alamat browser.";
  }
});
