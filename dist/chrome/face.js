// Berjalan di iframe milik extension. Frame kamera hanya diproses di memori untuk menghitung jumlah wajah.
// Tidak ada gambar yang disimpan atau dikirim; hanya angka jumlah wajah yang dikirim ke halaman induk.
import { FilesetResolver, FaceDetector } from "./vendor/vision_bundle.mjs";

const ext = globalThis.browser ?? globalThis.chrome;
const PARENT = "https://web.whatsapp.com";
const video = document.getElementById("v");
const send = (v) => parent.postMessage({ wpsFace: v }, PARENT);

const init = async () => {
  try {
    const wasmUrl = ext?.runtime?.getURL ? ext.runtime.getURL("vendor/wasm") : "./vendor/wasm";
    const modelUrl = ext?.runtime?.getURL ? ext.runtime.getURL("vendor/blaze_face_short_range.tflite") : "./vendor/blaze_face_short_range.tflite";

    const fileset = await FilesetResolver.forVisionTasks(wasmUrl);
    const detector = await FaceDetector.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: modelUrl, delegate: "CPU" },
      runningMode: "VIDEO",
      minDetectionConfidence: 0.5,
    });

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" },
      audio: false,
    });

    video.width = 320;
    video.height = 240;
    video.srcObject = stream;
    await video.play();

    const stopTracks = () => stream.getTracks().forEach((t) => t.stop());
    window.addEventListener("pagehide", stopTracks);
    window.addEventListener("beforeunload", stopTracks);

    send("ready");

    let running = false;
    setInterval(() => {
      if (running || !video.videoWidth || video.readyState < 2) return;
      running = true;
      try {
        const results = detector.detectForVideo(video, performance.now());
        const count = results && Array.isArray(results.detections) ? results.detections.length : 0;
        send(count);
      } catch (err) {
        console.error("[WPS Face Error]", err);
      } finally {
        running = false;
      }
    }, 350);
  } catch (e) {
    console.error("[WPS Face Init Error]", e);
    send("error:" + (e.name || e.message || "unknown"));
  }
};

init();
