// Berjalan di iframe di layar kunci. Klik tombol = gesture pengguna untuk WebAuthn.
document.getElementById("go").addEventListener("click", async () => {
  const msg = document.getElementById("msg");
  msg.textContent = "";
  try {
    const s = await ext.storage.local.get({ webauthnCred: "", webauthnKey: "", webauthnAlg: -7 });
    if (await unlockKey(s)) parent.postMessage({ wpsAuth: true }, "https://web.whatsapp.com");
    else msg.textContent = "Verifikasi gagal";
  } catch (e) {
    msg.textContent = "Dibatalkan/gagal: " + (e.name || e);
  }
});
