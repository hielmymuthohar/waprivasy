# Privacy Shield for WA Web

Extension Chrome/Edge/Firefox (Manifest V3) untuk menyamarkan isi WhatsApp Web. Semua lokal, tanpa koneksi keluar. Gratis dan open source. Nama sementara.

Catatan: ini lapisan tampilan (blur), bukan enkripsi. Lihat [PRIVACY.md](PRIVACY.md).

## Fitur
- Blur pesan, preview chat, media, nama, foto profil, dan kolom ketik. Hover untuk melihat. `Alt+Z` untuk aktif/nonaktif.
- Cakupan: semua chat atau hanya chat tertentu.
- Kunci PIN (PBKDF2), kunci otomatis saat idle, kunci saat dibuka, Windows Hello / sidik jari. `Alt+L` kunci sekarang.
- Blur saat jendela kehilangan fokus, dan saat berbagi layar di Meet/Teams/Zoom web.
- Panic key `Alt+X` (layar spreadsheet palsu).
- Profil (Kantor, Rumah, Tempat umum, Presentasi) dan mode presentasi.
- Deteksi wajah lain lewat kamera (opsional, butuh persetujuan, diproses lokal).
- Decoy mode (opsional): PIN kedua membuka WhatsApp dengan isi chat tetap tersamar.

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
