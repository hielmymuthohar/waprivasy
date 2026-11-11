import { FilesetResolver, FaceDetector } from "./vendor/vision_bundle.mjs";

const ext = globalThis.browser ?? globalThis.chrome;

let detector = null;
let stream = null;
let timer = null;
let hits = 0;
let clear = 0;
let isAlert = false;
let isPaused = false;
let isDetecting = false;
let lastTimestamp = 0;
const video = document.getElementById("v");

const initDetector = async () => {
  if (detector) return detector;
  const wasmUrl = ext?.runtime?.getURL ? ext.runtime.getURL("vendor/wasm") : "./vendor/wasm";
  const modelUrl = ext?.runtime?.getURL ? ext.runtime.getURL("vendor/blaze_face_short_range.tflite") : "./vendor/blaze_face_short_range.tflite";
  const fileset = await FilesetResolver.forVisionTasks(wasmUrl);
  detector = await FaceDetector.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: modelUrl, delegate: "CPU" },
    runningMode: "VIDEO",
    minDetectionConfidence: 0.5,
  });
  return detector;
};

const startCamera = async () => {
  if (stream || isPaused) return;
  try {
    await initDetector();
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" },
      audio: false,
    });
    if (isPaused) {
      mediaStream.getTracks().forEach((t) => { try { t.stop(); t.enabled = false; } catch {} });
      return;
    }
    stream = mediaStream;
    video.srcObject = stream;
    await video.play();
    ext.storage.local.set({ extCameraBlocked: false }).catch(() => {});
    startLoop();
  } catch (err) {
    console.error("[WPS Offscreen Cam Error]", err);
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      ext.storage.local.set({ extCameraBlocked: true }).catch(() => {});
    }
  }
};

const stopCamera = () => {
  if (timer) { clearInterval(timer); timer = null; }
  if (stream) {
    try {
      stream.getTracks().forEach((t) => { try { t.stop(); t.enabled = false; } catch {} });
    } catch {}
    stream = null;
  }
  if (video) {
    try { video.pause(); } catch {}
    video.srcObject = null;
  }
  hits = 0;
  clear = 0;
  if (isAlert) {
    isAlert = false;
    ext.storage.local.set({ faceAlert: false, faceCount: 0 }).catch(() => {});
  }
};

const startLoop = () => {
  if (timer || !stream || !detector) return;
  timer = setInterval(async () => {
    if (isDetecting || !video || video.readyState < 2 || !detector || isPaused) return;
    if (!video.videoWidth || !video.videoHeight) return;
    isDetecting = true;
    try {
      let now = performance.now();
      if (now <= lastTimestamp) now = lastTimestamp + 1;
      lastTimestamp = now;
      const results = detector.detectForVideo(video, now);
      const count = results && Array.isArray(results.detections) ? results.detections.length : 0;
      if (count >= 2) {
        hits++;
        clear = 0;
        if (hits >= 2 && !isAlert) {
          isAlert = true;
          await ext.storage.local.set({ faceAlert: true, faceCount: count });
        }
      } else {
        clear++;
        hits = 0;
        if (clear >= 3 && isAlert) {
          isAlert = false;
          await ext.storage.local.set({ faceAlert: false, faceCount: count });
        }
      }
    } catch (e) {
      // frame drop sesaat
    } finally {
      isDetecting = false;
    }
  }, 350);
};

// Listener pesan dari background
ext.runtime.onMessage.addListener((m) => {
  if (!m) return;
  if (m.type === "PAUSE_CAMERA") {
    isPaused = true;
    stopCamera();
  } else if (m.type === "RESUME_CAMERA") {
    isPaused = false;
    startCamera();
  }
});

// Listener perubahan storage
ext.storage.onChanged.addListener((changes) => {
  if (changes.faceDetect || changes.faceConsent || changes.faceScope) {
    ext.storage.local.get(["faceDetect", "faceConsent", "faceScope"]).then((s) => {
      if (s.faceDetect && s.faceConsent && s.faceScope === "all") {
        if (!isPaused) startCamera();
      } else {
        stopCamera();
      }
    });
  }
});

startCamera();
