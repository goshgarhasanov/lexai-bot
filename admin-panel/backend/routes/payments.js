const router = require("express").Router();
const auth = require("../middleware/auth");
const db = require("../utils/db");

// Payments cədvəli yoxdursa yarat
db.prepare(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL,
    plan_name TEXT NOT NULL,
    amount REAL DEFAULT 0,
    method TEXT DEFAULT 'card',
    status TEXT DEFAULT 'pending',
    note TEXT,
    confirmed_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`).run();

// GET /api/payments?status=pending
router.get("/", auth, (req, res) => {
  const status = req.query.status || "";
  const where  = status ? "WHERE p.status = ?" : "";
  const params = status ? [status] : [];

  const payments = db.prepare(`
    SELECT p.*, u.username, u.first_name
    FROM payments p
    LEFT JOIN users u ON u.telegram_id = p.telegram_id
    ${where}
    ORDER BY p.created_at DESC
    LIMIT 100
  `).all(...params);

  res.json(payments);
});

// POST /api/payments  — kart ödənişini qeydə al
router.post("/", auth, (req, res) => {
  const { telegram_id, plan_name, amount, method = "card", note } = req.body;
  if (!telegram_id || !plan_name) {
    return res.status(400).json({ error: "telegram_id və plan_name tələb olunur" });
  }

  const result = db.prepare(
    "INSERT INTO payments (telegram_id, plan_name, amount, method, status, note) VALUES (?, ?, ?, ?, 'pending', ?)"
  ).run(telegram_id, plan_name, amount || 0, method, note || "");

  res.json({ success: true, id: result.lastInsertRowid });
});

// PUT /api/payments/:id/confirm — ödənişi təsdiqlə + planı yüksəlt
router.put("/:id/confirm", auth, (req, res) => {
  const payment = db.prepare("SELECT * FROM payments WHERE id = ?").get(req.params.id);
  if (!payment) return res.status(404).json({ error: "Ödəniş tapılmadı" });
  if (payment.status === "confirmed") {
    return res.status(400).json({ error: "Bu ödəniş artıq təsdiqlənilib" });
  }

  const PLAN_LEVELS = { FREE: 0, BASIC: 1, PRO: 2, FIRM: 3 };
  const level = PLAN_LEVELS[payment.plan_name];

  // Planı yüksəlt
  db.prepare(
    "UPDATE users SET plan_name = ?, plan_level = ?, queries_used = 0, queries_reset_at = datetime('now') WHERE telegram_id = ?"
  ).run(payment.plan_name, level, payment.telegram_id);

  // Ödənişi təsdiqli kimi işarələ
  db.prepare(
    "UPDATE payments SET status = 'confirmed', confirmed_by = ? WHERE id = ?"
  ).run(req.admin.username, req.params.id);

  res.json({ success: true, message: "Ödəniş təsdiqləndi, plan yüksəldildi" });
});

// PUT /api/payments/:id/reject
router.put("/:id/reject", auth, (req, res) => {
  db.prepare("UPDATE payments SET status = 'rejected', confirmed_by = ? WHERE id = ?")
    .run(req.admin.username, req.params.id);
  res.json({ success: true });
});

module.exports = router;
