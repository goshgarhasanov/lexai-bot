/**
 * AES-256-GCM şifrələmə — Web Crypto API (brauzer native)
 * Şifrə açarı .env-dən gəlir, hər request üçün yeni IV yaradılır.
 */

const KEY_RAW = import.meta.env.VITE_ENCRYPTION_KEY || "huquqai2026secretencryptionkey32";

let _cachedKey = null;

async function getKey() {
  if (_cachedKey) return _cachedKey;
  const keyBytes = new TextEncoder().encode(KEY_RAW.slice(0, 32).padEnd(32, "0"));
  _cachedKey = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]
  );
  return _cachedKey;
}

export async function encryptPayload(obj) {
  const key = await getKey();
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(obj));

  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  // Son 16 bayt = auth tag (GCM)
  const encBytes = new Uint8Array(encrypted);
  const tag  = encBytes.slice(-16);
  const data = encBytes.slice(0, -16);

  return {
    encrypted: true,
    iv:   toHex(iv),
    tag:  toHex(tag),
    data: toHex(data),
  };
}

const toHex = (buf) => Array.from(buf).map(b => b.toString(16).padStart(2, "0")).join("");
