const encoder = new TextEncoder();

export function gallerySessionCookieName(galleryId: string) {
  return `revelar_gallery_${galleryId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}`;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function secureToken(byteLength = 24) {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function sha256(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

export async function hashPin(pin: string, salt = secureToken(16)) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: encoder.encode(salt),
      iterations: 180_000,
    },
    key,
    256,
  );
  return { salt, hash: hex(bits) };
}

export async function verifyPin(pin: string, salt: string, expectedHash: string) {
  const { hash } = await hashPin(pin, salt);
  if (hash.length !== expectedHash.length) return false;
  let mismatch = 0;
  for (let index = 0; index < hash.length; index += 1) {
    mismatch |= hash.charCodeAt(index) ^ expectedHash.charCodeAt(index);
  }
  return mismatch === 0;
}

export function parseCookie(request: Request, name: string) {
  const cookies = request.headers.get("cookie") || "";
  for (const part of cookies.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export function gallerySessionCookie(galleryId: string, token: string, expiresAt: string) {
  const maxAge = Math.max(1, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  return `${gallerySessionCookieName(galleryId)}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function isExpired(value?: string | null) {
  return Boolean(value && new Date(value).getTime() < Date.now());
}
