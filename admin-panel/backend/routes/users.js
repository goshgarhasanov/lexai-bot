const router = require("express").Router();
const auth = require("../middleware/auth");
const db = require("../utils/db");

const PLAN_LEVELS = { FREE: 0, BASIC: 1, PRO: 2, FIRM: 3 };

// GET /api/users?page=1&limit=20&search=&plan=
router.get("/", auth, (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page)  || 1);
  const limit  = Math.min(100, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const search = `%${req.query.search || ""}%`;
  const plan   = req.query.plan || "";

  let where = "WHERE (username LIKE ? OR first_name LIKE ? OR CAST(telegram_id AS TEXT) LIKE ?)";
  const params = [search, search, search];

  if (plan) {
    where += " AND plan_name = ?";
    params.push(plan);
  }

  const total = db.prepare(`SELECT COUNT(*) as c FROM users ${where}`).get(...params).c;
  const users = db.prepare(
    `SELECT id, telegram_id, username, first_name, language,
            plan_name, plan_level, queries_used, created_at, is_active
     FROM users ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  res.json({ users, total, page, pages: Math.ceil(total / limit) });
});

// GET /api/users/:id
router.get("/:id", auth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "İstifadəçi tapılmadı" });
  res.json(user);
});

// PUT /api/users/:id/plan  { plan: "PRO" }
router.put("/:id/plan", auth, (req, res) => {
  const { plan } = req.body;
  const level = PLAN_LEVELS[plan?.toUpperCase()];
  if (level === undefined) {
    return res.status(400).json({ error: "Yanlış plan adı. FREE, BASIC, PRO, FIRM olmalıdır." });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "İstifadəçi tapılmadı" });

  db.prepare(
    "UPDATE users SET plan_name = ?, plan_level = ?, queries_used = 0, queries_reset_at = datetime('now') WHERE id = ?"
  ).run(plan.toUpperCase(), level, req.params.id);

  // Payments cədvəlinə qeyd əlavə et
  try {
    db.prepare(
      "INSERT INTO payments (telegram_id, plan_name, amount, method, confirmed_by, created_at) VALUES (?, ?, ?, 'admin', ?, datetime('now'))"
    ).run(user.telegram_id, plan.toUpperCase(), 0, req.admin.username);
  } catch (_) {}

  res.json({ success: true, message: `${user.first_name || user.telegram_id} → ${plan.toUpperCase()} planına yüksəldildi` });
});

// PUT /api/users/:id/block
router.put("/:id/block", auth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "İstifadəçi tapılmadı" });

  db.prepare("UPDATE users SET is_active = ? WHERE id = ?").run(user.is_active ? 0 : 1, req.params.id);
  res.json({ success: true, is_active: !user.is_active });
});

// GET /api/users/:id/reset-queries
router.put("/:id/reset-queries", auth, (req, res) => {
  db.prepare("UPDATE users SET queries_used = 0, queries_reset_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
