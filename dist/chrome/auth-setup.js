const msg = document.getElementById("msg");
document.getElementById("go").addEventListener("click", async () => {
  try {
    await registerKey();
    msg.textContent = "Terdaftar. Tab ini bisa ditutup; tombol muncul di layar kunci.";
  } catch (e) {
    msg.textContent = "Gagal: " + (e.name || e) + (e.message ? " (" + e.message + ")" : "");
  }
});
document.getElementById("clear").addEventListener("click", async () => {
  await ext.storage.local.set({ webauthnCred: "", webauthnKey: "" });
  msg.textContent = "Pendaftaran dihapus.";
});
