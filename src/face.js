// Berjalan di iframe milik extension. Frame kamera hanya diproses di memori untuk menghitung jumlah wajah.
// Tidak ada gambar yang disimpan atau dikirim; hanya angka jumlah wajah yang dikirim ke halaman induk.
import { FilesetResolver, FaceDetector } from "./vendor/vision_bundle.mjs";

const PARENT = "https://web.whatsapp.com";
const video = document.getElementById("v");
const send = (v) => parent.postMessage({ wpsFace: v }, PARENT);

try {
  const fileset = await FilesetResolver.forVisionTasks("./vendor/wasm");
  const detector = await FaceDetector.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: "./vendor/blaze_face_short_range.tflite", delegate: "CPU" },
    runningMode: "VIDEO",
    minDetectionConfidence: 0.6,
  });
  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
  video.srcObject = stream;
  await video.play();
  addEventListener("pagehide", () => stream.getTracks().forEach((t) => t.stop()));
  send("ready");
  setInterval(() => {
    if (video.readyState < 2) return;
    send(detector.detectForVideo(video, performance.now()).detections.length);
  }, 500);
} catch (e) {
  send("error:" + (e.name || "unknown"));
}
