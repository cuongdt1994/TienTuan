const TOKEN_WINDOW_MINUTES = 2;

function base64Url(bytes: ArrayBuffer | Uint8Array) {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of array) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmacKey(secret: string, usage: "sign" | "verify") {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

export async function createImageSourceToken(imageId: string, secret: string) {
  const minute = Math.floor(Date.now() / 60_000);
  const payload = `${imageId}.${minute}`;
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret, "sign"), new TextEncoder().encode(payload));
  return `${minute}.${base64Url(signature)}`;
}

export async function verifyImageSourceToken(imageId: string, token: string | null, secret: string) {
  if (!token || !secret) return false;
  try {
    const separator = token.indexOf(".");
    if (separator <= 0) return false;
    const minute = Number(token.slice(0, separator));
    const signature = token.slice(separator + 1);
    const currentMinute = Math.floor(Date.now() / 60_000);
    if (!Number.isInteger(minute) || Math.abs(currentMinute - minute) > TOKEN_WINDOW_MINUTES || !/^[A-Za-z0-9_-]{40,100}$/.test(signature)) return false;
    return crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret, "verify"),
      fromBase64Url(signature),
      new TextEncoder().encode(`${imageId}.${minute}`),
    );
  } catch {
    return false;
  }
}
