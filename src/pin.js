/* Utilitas PIN: PBKDF2-SHA256 lewat WebCrypto. Dipakai oleh content script dan popup. */
if (typeof wpsHashPin === "undefined") {
  globalThis.wpsB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  globalThis.wpsUnb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  globalThis.wpsDerive = async (pin, salt) => {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
    return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 150000 }, key, 256);
  };
  globalThis.wpsHashPin = async (pin) => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return { pinSalt: wpsB64(salt), pinHash: wpsB64(await wpsDerive(pin, salt)) };
  };
  globalThis.wpsVerifyPin = async (pin, pinSalt, pinHash) =>
    wpsB64(await wpsDerive(pin, wpsUnb64(pinSalt))) === pinHash;
}
