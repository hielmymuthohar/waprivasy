# Kebijakan Privasi: Privacy Shield for WA Web

Terakhir diperbarui: 2026-11-11

**Singkatnya: extension ini tidak mengumpulkan, menyimpan di server, atau mengirim data apa pun.**

## Data yang diproses
- **Isi WhatsApp Web** (pesan, nama, foto): hanya diubah tampilannya (blur) di browser Anda. Tidak dibaca untuk dikirim ke mana pun.
- **Pengaturan, hash PIN, dan kunci publik Windows Hello**: disimpan di penyimpanan lokal browser (`storage.local`). PIN disimpan sebagai hash PBKDF2 berasalt, bukan teks asli.
- **Kamera (opsional, hanya dengan persetujuan)**: dipakai untuk menghitung jumlah wajah di depan layar. Gambar hanya diproses di memori, tidak disimpan, tidak direkam, dan tidak dikirim. Model deteksi (MediaPipe BlazeFace) berjalan lokal dan sudah termasuk dalam paket extension.
- **Deteksi berbagi layar**: skrip kecil di Google Meet, Microsoft Teams, dan Zoom web hanya mengetahui bahwa berbagi layar dimulai/berhenti. Isi layar atau halaman tidak dibaca.

## Koneksi jaringan
Extension tidak melakukan permintaan jaringan. Kebijakan keamanan konten (CSP) membatasi koneksi hanya ke berkas milik extension sendiri.

## Izin yang diminta
| Izin | Alasan |
|---|---|
| `storage` | Menyimpan pengaturan secara lokal |
| `https://web.whatsapp.com/*` | Menerapkan blur dan layar kunci |
| Meet / Teams / Zoom web | Mendeteksi mulai dan berhentinya berbagi layar |
| Kamera (opsional) | Deteksi wajah lain, hanya setelah Anda setuju |

## Batasan
Blur, kunci, dan decoy adalah lapisan tampilan, bukan enkripsi. Orang yang menguasai browser dan memahami DevTools dapat melewatinya.

Extension ini tidak berafiliasi dengan WhatsApp atau Meta.
