const rateLimit = require("express-rate-limit");

// IP-lər üçün 1 saatlıq ban siyahısı
const bannedIPs = new Map(); // ip → unbanAt (timestamp)

const BAN_DURATION_MS = 60 * 60 * 1000; // 1 saat

// Ban yoxlama middleware — hər endpointdən əvvəl çağırılır
const banCheck = (req, res, next) => {
  const ip = getIP(req);
  const banUntil = bannedIPs.get(ip);

  if (banUntil) {
    if (Date.now() < banUntil) {
      const remaining = Math.ceil((banUntil - Date.now()) / 60000);
      return res.status(429).json({
        error: "IP ünvanınız müvəqqəti bloklanıb",
        reason: "Çox sayda uğursuz cəhd",
        retry_after_minutes: remaining,
        banned_until: new Date(banUntil).toISOString(),
      });
    } else {
      bannedIPs.delete(ip); // Müddət bitib, unban
    }
  }
  next();
};

const getIP = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
  req.socket.remoteAddress ||
  "unknown";

const onLimitReached = (req, res) => {
  const ip = getIP(req);
  bannedIPs.set(ip, Date.now() + BAN_DURATION_MS);
  console.warn(`[RATE LIMIT] IP banned: ${ip} for 1 hour`);
  res.status(429).json({
    error: "Limit aşıldı — IP 1 saatlıq bloklandı",
    retry_after_minutes: 60,
    banned_until: new Date(Date.now() + BAN_DURATION_MS).toISOString(),
  });
};

// Login: 10 cəhd / 15 dəqiqə
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getIP,
  handler: onLimitReached,
  skip: (req) => !!bannedIPs.get(getIP(req)),
});

// Authenticated API: 120 req / dəqiqə
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getIP,
  handler: onLimitReached,
  skip: (req) => !!bannedIPs.get(getIP(req)),
});

// Anonymous / genel: 30 req / dəqiqə
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getIP,
  handler: onLimitReached,
  skip: (req) => !!bannedIPs.get(getIP(req)),
});

// Admin: ban siyahısını görmək üçün (daxili istifadə)
const getBannedList = () =>
  [...bannedIPs.entries()].map(([ip, until]) => ({
    ip,
    banned_until: new Date(until).toISOString(),
    remaining_minutes: Math.max(0, Math.ceil((until - Date.now()) / 60000)),
  }));

const unbanIP = (ip) => bannedIPs.delete(ip);

module.exports = { banCheck, loginLimiter, apiLimiter, strictLimiter, getBannedList, unbanIP };
