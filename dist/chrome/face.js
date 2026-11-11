// Berjalan di iframe extension (dengan izin WebAssembly & CSP terisolasi).
// Menerima ImageBitmap frame kamera dari content.js via postMessage (transferable, 0-copy),
// memproses deteksi wajah dengan MediaPipe BlazeFace lokal, lalu mengembalikan jumlah wajah.
// Tidak ada frame atau data yang disimpan atau dikirim ke internet.
import { FilesetResolver, FaceDetector } from "./vendor/vision_bundle.mjs";

const ext = globalThis.browser ?? globalThis.chrome;
const PARENT = "https://web.whatsapp.com";
const send = (v) => parent.postMessage({ wpsFace: v }, PARENT);

let detector = null;

const init = async () => {
  try {
    const wasmUrl = ext?.runtime?.getURL ? ext.runtime.getURL("vendor/wasm") : "./vendor/wasm";
    const modelUrl = ext?.runtime?.getURL ? ext.runtime.getURL("vendor/blaze_face_short_range.tflite") : "./vendor/blaze_face_short_range.tflite";

    const fileset = await FilesetResolver.forVisionTasks(wasmUrl);
    detector = await FaceDetector.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: modelUrl, delegate: "CPU" },
      runningMode: "VIDEO",
      minDetectionConfidence: 0.5,
    });

    send("ready");
  } catch (e) {
    console.error("[WPS Face Init Error]", e);
    send("error:" + (e.name || e.message || "unknown"));
  }
};

window.addEventListener("message", (e) => {
  if (e.origin !== PARENT || !e.data) return;
  if (e.data.wpsFrame && detector) {
    const bitmap = e.data.wpsFrame;
    const time = e.data.time || performance.now();
    try {
      const results = detector.detectForVideo(bitmap, time);
      const count = results && Array.isArray(results.detections) ? results.detections.length : 0;
      bitmap.close();
      send(count);
    } catch (err) {
      try { bitmap.close(); } catch {}
      console.error("[WPS Detection Error]", err);
    }
  }
});

init();
