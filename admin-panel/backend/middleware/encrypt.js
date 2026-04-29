/**
 * Request body şifrələmə/açma middleware.
 * Frontend AES-GCM ilə şifrələnmiş body göndərir.
 * Server açır, normal JSON kimi işlənir.
 *
 * Alqoritm: AES-256-GCM
 * Format: { iv: hex, tag: hex, data: hex }
 */

const crypto = require("crypto");

const SECRET_KEY = Buffer.from(
  process.env.ENCRYPTION_KEY || "huquqai2026secretencryptionkey32",
  "utf8"
).slice(0, 32);

// Server tərəf: gələn şifrəli body-ni aç
const decryptBody = (req, res, next) => {
  if (!req.body?.encrypted) return next(); // şifrəsiz sorğu da qəbul et (dev mode)

  try {
    const { iv, tag, data } = req.body;
    if (!iv || !tag || !data) return res.status(400).json({ error: "Yanlış şifrə formatı" });

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      SECRET_KEY,
      Buffer.from(iv, "hex")
    );
    decipher.setAuthTag(Buffer.from(tag, "hex"));

    const decrypted =
      decipher.update(Buffer.from(data, "hex"), undefined, "utf8") +
      decipher.final("utf8");

    req.body = JSON.parse(decrypted);
    next();
  } catch {
    res.status(400).json({ error: "Şifrə açıla bilmədi" });
  }
};

// Client üçün: public key kimi şifrələmə açarı göndər (IV hər dəfə fərqli olur)
const encryptResponse = (data) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", SECRET_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"),
    cipher.final(),
  ]);
  return {
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
    data: encrypted.toString("hex"),
  };
};

// Frontend-ə şifrələmə açarını (salt) göndər
const getPublicConfig = () => ({
  algorithm: "AES-GCM",
  keyHint: process.env.ENCRYPTION_KEY_HINT || "contact-admin",
});

module.exports = { decryptBody, encryptResponse, getPublicConfig };
