# Privacy Policy: Privacy Shield for WA Web

Last updated: 2026-11-16

**In short: Privacy Shield for WA Web collects, stores on external servers, and transmits zero user data.**

## 1. Local-First Data Processing
- **WhatsApp Web Content (messages, names, photos, media):** Only visually masked in your browser using local CSS filters and a Shadow DOM overlay. Content is never parsed for telemetry, analytics, or external transmission.
- **Settings, PIN Hashes & Windows Hello Credentials:** Stored exclusively in your browser's local extension storage (`storage.local`).
  - Master PIN and Decoy PIN are never stored in plaintext; they are derived locally using **WebCrypto PBKDF2-SHA256** (`150,000` iterations with a unique 16-byte random salt).
  - Windows Hello / Touch ID uses your device's built-in **WebAuthn** platform authenticator; biometric data never leaves your OS security enclave.
- **Camera & Facial Data (Opt-In Only):**
  - Strictly optional and only activated after explicit user consent.
  - Used solely to **count** the number of faces in front of the screen (`detections.length >= 2`) to prevent shoulder surfing.
  - Frames are captured at low resolution (`320x240`, no audio), processed transiently in volatile memory (`createImageBitmap` immediately closed after inference), and discarded at once.
  - **No images, video recordings, facial embeddings, or biometric templates are ever saved to disk or sent anywhere.**
  - The AI model (**Google MediaPipe BlazeFace** TFLite + WASM runtime) is bundled directly inside `src/vendor/` and runs 100% offline on-device.
  - Webcam hardware tracks are immediately stopped (`track.stop()`) when switching away from WhatsApp Web (in WA-only mode) or when minimizing/switching to another desktop application (in both WA-only and All-Tabs modes).
- **Screen-Share Detection:** Lightweight hook scripts on Google Meet, Microsoft Teams, and Zoom Web only observe local `getDisplayMedia` start/stop state to trigger automatic blurring on WhatsApp Web. Page contents and meeting audio/video are never read.

## 2. Network Isolation
Privacy Shield for WA Web makes **zero outbound network requests**. Its `manifest.json` Content Security Policy strictly enforces:
```
script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; connect-src 'self'
```
This guarantees at the browser engine level that extension pages cannot connect to any external server or CDN.

## 3. Permissions Requested
| Permission / Host | Purpose |
|---|---|
| `storage` | Persist profiles, blur preferences, and salted PBKDF2 hashes locally |
| `scripting` | Apply and sync the local blur/lock layer across WhatsApp Web and active browser tabs (for All-Tabs Anti-Peeking mode) |
| `offscreen` *(Chrome/Edge)* | Run local MediaPipe face counting in an isolated offscreen context when All-Tabs mode is enabled |
| `https://web.whatsapp.com/*` | Apply selective CSS blur, lock screen, and panic overlay |
| `<all_urls>` *(optional overlay)* | Display the local frosted-glass anti-peeking shield on non-WhatsApp browser tabs when **All Browser Tabs** mode is enabled |
| Meet / Teams / Zoom Web | Detect active screen-sharing sessions to auto-blur WhatsApp Web |
| Camera *(Optional, Opt-In)* | Real-time on-device shoulder-surfing face count only after explicit approval |

## 4. Scope & Limitations
Visual blurring, lock screens, decoy PINs, and panic disguises operate as a **visual privacy layer**, not cryptographic encryption of WhatsApp Web's underlying DOM/session. Anyone with unrestricted physical access and browser DevTools expertise can inspect or bypass client-side overlays.

This project is independent open-source software and is not affiliated with WhatsApp or Meta Platforms, Inc.
