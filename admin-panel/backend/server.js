require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const morgan  = require("morgan");
const jwt     = require("jsonwebtoken");
const axios   = require("axios");

const app    = express();
const PY_API = process.env.PY_API_URL || "http://localhost:8000";

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

const auth = (req, res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ error: "Token yoxdur" });
  try {
    req.admin = jwt.verify(h.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token etibarsızdır" });
  }
};

const pyProxy = async (req, res, pyPath) => {
  try {
    const resp = await axios({
      method: req.method,
      url: `${PY_API}${pyPath}`,
      params: req.query,
      data: req.body,
      validateStatus: null,
    });
    res.status(resp.status).json(resp.data);
  } catch (e) {
    res.status(502).json({ error: "Python API ilə əlaqə qurulamadı", detail: e.message });
  }
};

// Auth
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "İstifadəçi adı və ya şifrə yanlışdır" });
  }
  const token = jwt.sign({ username, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "8h" });
  res.json({ token, username });
});

// Stats
app.get("/api/stats", auth, (req, res) => pyProxy(req, res, "/admin/stats"));

// Users
app.get("/api/users",                      auth, (req, res) => pyProxy(req, res, "/admin/users"));
app.get("/api/users/:id",                  auth, (req, res) => pyProxy(req, res, `/admin/users/${req.params.id}`));
app.put("/api/users/:id/plan",             auth, (req, res) => pyProxy(req, res, `/admin/users/${req.params.id}/plan`));
app.put("/api/users/:id/block",            auth, (req, res) => pyProxy(req, res, `/admin/users/${req.params.id}/block`));
app.put("/api/users/:id/reset-queries",    auth, (req, res) => pyProxy(req, res, `/admin/users/${req.params.id}/reset-queries`));

// Payments
app.get("/api/payments",                   auth, (req, res) => pyProxy(req, res, "/admin/payments"));
app.post("/api/payments",                  auth, (req, res) => pyProxy(req, res, "/admin/payments"));
app.put("/api/payments/:id/confirm",       auth, (req, res) => pyProxy(req, res, `/admin/payments/${req.params.id}/confirm`));
app.put("/api/payments/:id/reject",        auth, (req, res) => pyProxy(req, res, `/admin/payments/${req.params.id}/reject`));

app.get("/api/health", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Admin API → http://localhost:${PORT}`));
