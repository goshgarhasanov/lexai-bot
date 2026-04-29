const router = require("express").Router();
const auth = require("../middleware/auth");
const db = require("../utils/db");

router.get("/", auth, (req, res) => {
  const totalUsers     = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  const activeToday    = db.prepare("SELECT COUNT(*) as c FROM users WHERE date(created_at) = date('now')").get().c;
  const planCounts     = db.prepare("SELECT plan_name, COUNT(*) as c FROM users GROUP BY plan_name").all();
  const totalQueries   = db.prepare("SELECT SUM(queries_used) as c FROM users").get().c || 0;
  const paidUsers      = db.prepare("SELECT COUNT(*) as c FROM users WHERE plan_level > 0").get().c;

  const planMap = {};
  planCounts.forEach(r => { planMap[r.plan_name] = r.c; });

  res.json({
    totalUsers,
    activeToday,
    totalQueries,
    paidUsers,
    freeUsers: (planMap["FREE"] || 0),
    plans: {
      FREE:  planMap["FREE"]  || 0,
      BASIC: planMap["BASIC"] || 0,
      PRO:   planMap["PRO"]   || 0,
      FIRM:  planMap["FIRM"]  || 0,
    },
  });
});

module.exports = router;
