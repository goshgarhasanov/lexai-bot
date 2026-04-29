require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const morgan   = require("morgan");
const helmet   = require("helmet");
const jwt      = require("jsonwebtoken");
const bcrypt   = require("bcryptjs");
const axios    = require("axios");

const { banCheck, loginLimiter, apiLimiter, strictLimiter, getBannedList, unbanIP } =
  require("./middleware/rateLimiter");
const { decryptBody } = require("./middleware/encrypt");

const app    = express();
const PY_API = process.env.PY_API_URL || "http://localhost:8000";

// ── Security headers ──────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "http://localhost:4000"],
    },
  },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "10kb" })); // büyük body rədd et
app.use(morgan("[:date[iso]] :method :url :status :response-time ms - :remote-addr"));

// ── Ban yoxlaması — hər sorğudan əvvəl ──────────────
app.use(banCheck);

// ── Auth middleware ───────────────────────────────────
const auth = (req, res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ error: "Token yoxdur" });
  try {
    req.admin = jwt.verify(h.slice(7), process.env.JWT_SECRET);
    next();
  } catch (e) {
    const msg = e.name === "TokenExpiredError" ? "Token müddəti bitib" : "Token etibarsızdır";
    res.status(401).json({ error: msg });
  }
};

// ── Python proxy helper ───────────────────────────────
const pyProxy = async (req, res, pyPath) => {
  try {
    const resp = await axios({
      method: req.method,
      url:    `${PY_API}${pyPath}`,
      params: req.query,
      data:   req.body,
      timeout: 10000,
      validateStatus: null,
    });
    res.status(resp.status).json(resp.data);
  } catch (e) {
    res.status(502).json({ error: "Python API ilə əlaqə yoxdur", detail: e.message });
  }
};

// ════════════════════════════════════════════════════
// PUBLIC ROUTES
// ════════════════════════════════════════════════════

// Şifrələmə konfiqurasiyası (frontend bunu alır)
app.get("/api/config", strictLimiter, (_, res) => {
  res.json({
    encryption: { algorithm: "AES-GCM", keyLen: 256 },
    version: "1.0",
  });
});

// Login — ən ciddi rate limit + şifrəli body
app.post(
  "/api/auth/login",
  strictLimiter,
  loginLimiter,
  decryptBody,
  async (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: "Username və şifrə tələb olunur" });
    }

    const validUser = username === process.env.ADMIN_USERNAME;
    let validPass   = false;

    try {
      const storedHash = process.env.ADMIN_PASSWORD_HASH;
      if (storedHash?.startsWith("$2")) {
        validPass = await bcrypt.compare(password, storedHash);
      } else {
        // Plain-text fallback (dev mode — production-da hash istifadə et)
        validPass = password === process.env.ADMIN_PASSWORD;
      }
    } catch {
      validPass = false;
    }

    // Timing-safe: həmişə eyni vaxt keçir (brute-force zamanlama hücumuna qarşı)
    if (!validUser || !validPass) {
      // Uğursuz cəhdi yavaşlat
      await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
      return res.status(401).json({ error: "İstifadəçi adı və ya şifrə yanlışdır" });
    }

    const token = jwt.sign(
      { username, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "8h", issuer: "huquqai-admin" }
    );

    res.json({ token, username, expires_in: 28800 });
  }
);

// ════════════════════════════════════════════════════
// PROTECTED ROUTES (JWT + rate limit)
// ════════════════════════════════════════════════════

// Stats
app.get("/api/stats", auth, apiLimiter, (req, res) => pyProxy(req, res, "/admin/stats"));

// Users
app.get("/api/users",                   auth, apiLimiter, (req, res) => pyProxy(req, res, "/admin/users"));
app.put("/api/users/:id/plan",          auth, apiLimiter, (req, res) => pyProxy(req, res, `/admin/users/${req.params.id}/plan`));
app.put("/api/users/:id/block",         auth, apiLimiter, (req, res) => pyProxy(req, res, `/admin/users/${req.params.id}/block`));
app.put("/api/users/:id/reset-queries", auth, apiLimiter, (req, res) => pyProxy(req, res, `/admin/users/${req.params.id}/reset-queries`));

// Payments
app.get("/api/payments",                auth, apiLimiter, (req, res) => pyProxy(req, res, "/admin/payments"));
app.post("/api/payments",               auth, apiLimiter, (req, res) => pyProxy(req, res, "/admin/payments"));
app.put("/api/payments/:id/confirm",    auth, apiLimiter, (req, res) => pyProxy(req, res, `/admin/payments/${req.params.id}/confirm`));
app.put("/api/payments/:id/reject",     auth, apiLimiter, (req, res) => pyProxy(req, res, `/admin/payments/${req.params.id}/reject`));

// Ban idarəetməsi (yalnız admin)
app.get("/api/admin/banned",       auth, (_, res) => res.json(getBannedList()));
app.delete("/api/admin/ban/:ip",   auth, (req, res) => {
  unbanIP(req.params.ip);
  res.json({ success: true, message: `${req.params.ip} ban siyahısından çıxarıldı` });
});

// Health
app.get("/api/health", (_, res) => res.json({ status: "ok", time: new Date() }));

// 404
app.use((_, res) => res.status(404).json({ error: "Endpoint tapılmadı" }));

// Global error handler
app.use((err, req, res, _next) => {
  console.error("[ERROR]", err.message);
  res.status(500).json({ error: "Server xətası" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`✅ HuquqAI Admin API → http://localhost:${PORT}`)
);
