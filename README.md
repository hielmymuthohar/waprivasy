# Privacy Shield for WA Web

Extension Chrome/Edge/Firefox (Manifest V3) untuk menyamarkan isi WhatsApp Web. Semua lokal, tanpa koneksi keluar. Gratis dan open source. Nama sementara.

Catatan: ini lapisan tampilan (blur), bukan enkripsi. Lihat [PRIVACY.md](PRIVACY.md).

## Fitur Utama

- **Selective Blur**: Samarkan pesan, preview chat, media (gambar/video), nama kontak/grup, foto profil, dan kolom ketik. Dilengkapi fitur *hover-to-reveal* untuk mengintip saat kursor diarahkan ke elemen.
- **Pintasan Keyboard Cepat**:
  - `Alt+Z`: Aktif / nonaktifkan blur seketika.
  - `Alt+L`: Kunci WhatsApp Web sekarang.
  - `Alt+X`: *Panic Mode* — mengganti tampilan seketika dengan spreadsheet palsu dan mengubah judul tab.
- **Profil Privasi**: Konfigurasi tersimpan per skenario penggunaan (`Kustom`, `Kantor`, `Rumah`, `Tempat umum`, `Presentasi`).
- **Cakupan Fleksibel**: Lindungi semua chat atau hanya kontak/grup tertentu dengan pemilih chip intuitif serta sinkronisasi daftar chat otomatis dari WhatsApp Web.
- **Keamanan Berlapis**:
  - **PIN Master**: Enkripsi hash lokal PBKDF2-SHA256 (100.000 iterasi dengan *salt* acak) dilengkapi perlindungan *rate-limiting* / *exponential backoff*.
  - **Windows Hello / Touch ID**: Autentikasi biometrik lokal instan via WebAuthn (*internal platform authenticator*).
  - **Decoy Mode**: PIN alternatif kedua opsional yang membuka WhatsApp dengan tampilan tersamar permanen saat dipaksa membuka kunci.
  - **Kunci Otomatis**: Kunci saat WhatsApp Web pertama kali dimuat atau setelah durasi idle tertentu.
- **Proteksi Cerdas Tambahan**:
  - **Auto-Blur Saat Jendela Kehilangan Fokus**: Menyamarkan layar saat beralih aplikasi.
  - **Deteksi Berbagi Layar**: Otomatis menyamarkan WhatsApp Web saat Anda membagikan layar di Google Meet, Microsoft Teams, atau Zoom Web.
  - **Deteksi Wajah Lokal (Anti-Shoulder Surfing)**: Memanfaatkan webcam dan AI lokal on-device (Google MediaPipe BlazeFace) untuk mendeteksi keberadaan orang lain di sekitar Anda. Jika terdeteksi ≥ 2 wajah, layar langsung tersamar penuh secara otomatis tanpa memandang profil aktif.

## Build dan pasang
```powershell
powershell -ExecutionPolicy Bypass -File build.ps1
```
- **Chrome/Edge**: `chrome://extensions` → Developer mode → *Load unpacked* → `dist/chrome`.
- **Firefox**: `about:debugging#/runtime/this-firefox` → *Load Temporary Add-on* → `dist/firefox/manifest.json`.
- Zip untuk store: `dist/privacy-shield-chrome.zip` dan `dist/privacy-shield-firefox.zip`.

## Selector
WhatsApp sering mengubah DOM. Jika blur berhenti pada elemen tertentu, perbarui selector di `src/content.css` dan `src/content.js`.

## Pihak ketiga
Deteksi wajah memakai [MediaPipe Tasks Vision](https://github.com/google-ai-edge/mediapipe) dan model BlazeFace (Apache-2.0), disertakan di `src/vendor`.

## Sebelum rilis ke store
- Ganti nama, ikon (sekarang placeholder), dan ID Firefox (`privacy-shield-wa@example.local`).
- Siapkan tangkapan layar dan tautan kebijakan privasi.
- Uji manual di WhatsApp Web terbaru, karena selector bisa berubah.
