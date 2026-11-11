// Utilitas WebAuthn (Windows Hello / Touch ID), dipakai halaman extension. Butuh pin.js.
const ext = globalThis.browser ?? globalThis.chrome;

const rnd = (n) => crypto.getRandomValues(new Uint8Array(n));
const b64url = (buf) => wpsB64(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const registerKey = async () => {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: rnd(32),
      rp: { name: "Privacy Shield" },
      user: { id: rnd(16), name: "pengguna", displayName: "Pengguna" },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },   // ES256
        { type: "public-key", alg: -257 }, // RS256 (sering dipakai TPM Windows Hello)
      ],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
    },
  });
  await ext.storage.local.set({
    webauthnCred: wpsB64(cred.rawId),
    webauthnKey: wpsB64(cred.response.getPublicKey()),
    webauthnAlg: cred.response.getPublicKeyAlgorithm ? cred.response.getPublicKeyAlgorithm() : -7,
  });
};

// Tanda tangan ECDSA WebAuthn berformat DER; WebCrypto butuh r||s 64 byte.
const derToRaw = (der) => {
  let i = 3, out = new Uint8Array(64);
  for (let part = 0; part < 2; part++) {
    let len = der[i++];
    let bytes = der.slice(i, i + len); i += len + 1;
    while (bytes.length > 32) bytes = bytes.slice(1);
    out.set(bytes, part * 32 + 32 - bytes.length);
  }
  return out;
};

// s: objek storage berisi webauthnCred, webauthnKey, dan webauthnAlg.
const unlockKey = async (s) => {
  const challenge = rnd(32);
  const a = await navigator.credentials.get({
    publicKey: {
      challenge,
      userVerification: "required",
      allowCredentials: [{ type: "public-key", id: wpsUnb64(s.webauthnCred) }],
    },
  });
  const r = a.response;
  if (JSON.parse(new TextDecoder().decode(r.clientDataJSON)).challenge !== b64url(challenge)) return false;
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", r.clientDataJSON));
  const auth = new Uint8Array(r.authenticatorData);
  const data = new Uint8Array(auth.length + 32);
  data.set(auth);
  data.set(hash, auth.length);

  if (s.webauthnAlg === -257) {
    const key = await crypto.subtle.importKey(
      "spki",
      wpsUnb64(s.webauthnKey),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    return crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, key, new Uint8Array(r.signature), data);
  }

  const key = await crypto.subtle.importKey(
    "spki",
    wpsUnb64(s.webauthnKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );
  return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, derToRaw(new Uint8Array(r.signature)), data);
};
