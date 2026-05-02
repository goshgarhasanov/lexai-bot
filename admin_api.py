"""
HuquqAI Admin REST API — FastAPI
Bot ilə eyni SQLite database-i istifadə edir.
Başlatmaq: uvicorn admin_api:app --port 8000 --reload
"""
import os
import json
import time
import hashlib
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from typing import Optional

from database.models import SessionLocal, User, Base, engine
from sqlalchemy import text

_start_time = time.time()

MAX_VALID_ID = 2_147_483_647  # SQLite INTEGER max

# ─── Schema migration ────────────────────────────────
with engine.connect() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS payments (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id     INTEGER NOT NULL,
            plan_name       TEXT NOT NULL,
            amount          REAL DEFAULT 0,
            method          TEXT DEFAULT 'card',
            status          TEXT DEFAULT 'pending',
            note            TEXT,
            confirmed_by    TEXT,
            idempotency_key TEXT,
            created_at      TEXT DEFAULT (datetime('now'))
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            action         TEXT NOT NULL,
            target_user_id INTEGER,
            admin_user     TEXT DEFAULT 'admin',
            details        TEXT,
            ip_address     TEXT,
            created_at     TEXT DEFAULT (datetime('now'))
        )
    """))
    # idempotency_key sütunu əlavə et (köhnə DB-lərdə yoxdursa)
    try:
        conn.execute(text("ALTER TABLE payments ADD COLUMN idempotency_key TEXT"))
    except Exception:
        pass
    conn.commit()


def _audit(db, action: str, target_user_id=None, details: dict = None, ip: str = None):
    db.execute(text(
        "INSERT INTO audit_logs (action, target_user_id, admin_user, details, ip_address) "
        "VALUES (:action, :uid, 'admin', :details, :ip)"
    ), {
        "action": action,
        "uid": target_user_id,
        "details": json.dumps(details or {}, ensure_ascii=False),
        "ip": ip,
    })


def _validate_user_id(user_id: int) -> None:
    """IDOR: neqativ, sıfır və overflow ID-ləri rədd et."""
    if user_id <= 0 or user_id > MAX_VALID_ID:
        raise HTTPException(400, f"Yanlış istifadəçi ID: {user_id}")


def _validate_payment_id(payment_id: int) -> None:
    if payment_id <= 0 or payment_id > MAX_VALID_ID:
        raise HTTPException(400, f"Yanlış ödəniş ID: {payment_id}")


app = FastAPI(title="HuquqAI Admin API", docs_url="/admin/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

PLAN_LEVELS = {"FREE": 0, "BASIC": 1, "PRO": 2, "FIRM": 3}


# ─── Stats ───────────────────────────────────────────
@app.get("/admin/stats")
def get_stats():
    db = SessionLocal()
    try:
        from sqlalchemy import func
        total_users   = db.query(User).count()
        today         = datetime.now(timezone.utc).date().isoformat()
        active_today  = db.query(User).filter(User.created_at >= today).count()
        paid_users    = db.query(User).filter(User.plan_level > 0).count()
        total_queries = db.query(func.sum(User.queries_used)).scalar() or 0

        plans = {p: db.query(User).filter(User.plan_name == p).count()
                 for p in ["FREE", "BASIC", "PRO", "FIRM"]}

        return {
            "totalUsers":   total_users,
            "activeToday":  active_today,
            "paidUsers":    paid_users,
            "totalQueries": total_queries,
            "freeUsers":    plans["FREE"],
            "plans":        plans,
        }
    finally:
        db.close()


# ─── Users ───────────────────────────────────────────
@app.get("/admin/users")
def list_users(page: int = 1, limit: int = 20, search: str = "", plan: str = ""):
    page  = max(1, page)
    limit = min(100, max(1, limit))
    db = SessionLocal()
    try:
        q = db.query(User)
        if search:
            # SQLAlchemy ORM parametric — SQL injection-a qarşı qorunur
            q = q.filter(
                (User.username.ilike(f"%{search}%")) |
                (User.first_name.ilike(f"%{search}%")) |
                (User.telegram_id == int(search) if search.isdigit() else User.telegram_id == -1)
            )
        if plan:
            q = q.filter(User.plan_name == plan.upper())

        total = q.count()
        users = q.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

        return {
            "users": [{
                "id": u.id, "telegram_id": u.telegram_id,
                "username": u.username, "first_name": u.first_name,
                "language": u.language, "plan_name": u.plan_name,
                "plan_level": u.plan_level, "queries_used": u.queries_used,
                "is_active": u.is_active,
                "created_at": str(u.created_at)[:19] if u.created_at else None,
            } for u in users],
            "total": total,
            "page": page,
            "pages": max(1, -(-total // limit)),
        }
    finally:
        db.close()


class PlanUpdate(BaseModel):
    plan: str

    @validator("plan")
    def validate_plan(cls, v):
        if v.upper() not in ("FREE", "BASIC", "PRO", "FIRM"):
            raise ValueError("Yanlış plan")
        return v.upper()


@app.put("/admin/users/{user_id}/plan")
def upgrade_plan(user_id: int, body: PlanUpdate, request: Request):
    _validate_user_id(user_id)
    level = PLAN_LEVELS[body.plan]
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(404, "İstifadəçi tapılmadı")

        old_plan = user.plan_name
        user.plan_name = body.plan
        user.plan_level = level
        user.queries_used = 0
        user.queries_reset_at = datetime.now(timezone.utc)

        db.execute(text(
            "INSERT INTO payments (telegram_id, plan_name, amount, method, status, confirmed_by) "
            "VALUES (:tid, :plan, 0, 'admin', 'confirmed', 'admin')"
        ), {"tid": user.telegram_id, "plan": body.plan})

        _audit(db, "plan_upgrade", user.telegram_id,
               {"old_plan": old_plan, "new_plan": body.plan},
               request.client.host if request.client else None)
        db.commit()
        return {"success": True, "message": f"{user.first_name or user.telegram_id} → {body.plan} planına yüksəldildi"}
    finally:
        db.close()


@app.put("/admin/users/{user_id}/block")
def toggle_block(user_id: int, request: Request):
    _validate_user_id(user_id)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(404, "İstifadəçi tapılmadı")
        user.is_active = not user.is_active
        _audit(db, "user_block" if not user.is_active else "user_unblock",
               user.telegram_id, {"is_active": user.is_active},
               request.client.host if request.client else None)
        db.commit()
        return {"success": True, "is_active": user.is_active}
    finally:
        db.close()


@app.put("/admin/users/{user_id}/reset-queries")
def reset_queries(user_id: int, request: Request):
    _validate_user_id(user_id)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(404, "İstifadəçi tapılmadı")
        _audit(db, "reset_queries", user.telegram_id,
               {"queries_before": user.queries_used},
               request.client.host if request.client else None)
        user.queries_used = 0
        user.queries_reset_at = datetime.now(timezone.utc)
        db.commit()
        return {"success": True}
    finally:
        db.close()


# ─── Payments ────────────────────────────────────────
@app.get("/admin/payments")
def list_payments(status: str = ""):
    db = SessionLocal()
    try:
        where = "WHERE p.status = :status" if status else ""
        rows = db.execute(text(f"""
            SELECT p.*, u.username, u.first_name
            FROM payments p
            LEFT JOIN users u ON u.telegram_id = p.telegram_id
            {where}
            ORDER BY p.created_at DESC LIMIT 100
        """), {"status": status} if status else {}).fetchall()
        return [dict(r._mapping) for r in rows]
    finally:
        db.close()


class PaymentCreate(BaseModel):
    telegram_id: int
    plan_name: str
    amount: float = 0
    method: str = "card"
    note: Optional[str] = ""


@app.post("/admin/payments")
def create_payment(body: PaymentCreate):
    plan = body.plan_name.upper()
    # Idempotency key: 5 dəqiqə ərzində eyni (tid+plan+amount) kombinasiyası
    raw_key = f"{body.telegram_id}:{plan}:{body.amount}"
    idem_key = hashlib.sha256(raw_key.encode()).hexdigest()

    db = SessionLocal()
    try:
        # 5 dəqiqə ərzində eyni key varsa, mövcud qaytar
        five_min_ago = (datetime.now(timezone.utc) - timedelta(minutes=5)).strftime("%Y-%m-%d %H:%M:%S")
        existing = db.execute(text("""
            SELECT id FROM payments
            WHERE idempotency_key = :key
              AND created_at > :since
              AND status = 'pending'
        """), {"key": idem_key, "since": five_min_ago}).fetchone()

        if existing:
            return {"success": True, "id": existing.id, "duplicate": True}

        result = db.execute(text(
            "INSERT INTO payments (telegram_id, plan_name, amount, method, status, note, idempotency_key) "
            "VALUES (:tid, :plan, :amount, :method, 'pending', :note, :ikey)"
        ), {"tid": body.telegram_id, "plan": plan,
            "amount": body.amount, "method": body.method,
            "note": body.note or "", "ikey": idem_key})
        db.commit()
        return {"success": True, "id": result.lastrowid, "duplicate": False}
    finally:
        db.close()


@app.put("/admin/payments/{payment_id}/confirm")
def confirm_payment(payment_id: int, request: Request):
    _validate_payment_id(payment_id)
    db = SessionLocal()
    try:
        row = db.execute(text("SELECT * FROM payments WHERE id = :id"), {"id": payment_id}).fetchone()
        if not row:
            raise HTTPException(404, "Ödəniş tapılmadı")
        if row.status == "confirmed":
            raise HTTPException(400, "Bu ödəniş artıq təsdiqlənilib")

        plan  = row.plan_name
        level = PLAN_LEVELS.get(plan, 0)

        db.execute(text(
            "UPDATE users SET plan_name=:plan, plan_level=:level, queries_used=0, "
            "queries_reset_at=datetime('now') WHERE telegram_id=:tid"
        ), {"plan": plan, "level": level, "tid": row.telegram_id})
        db.execute(text(
            "UPDATE payments SET status='confirmed', confirmed_by='admin' WHERE id=:id"
        ), {"id": payment_id})

        _audit(db, "payment_confirm", row.telegram_id,
               {"payment_id": payment_id, "plan": plan},
               request.client.host if request.client else None)
        db.commit()
        return {"success": True, "message": "Ödəniş təsdiqləndi, plan yüksəldildi"}
    finally:
        db.close()


@app.put("/admin/payments/{payment_id}/reject")
def reject_payment(payment_id: int, request: Request):
    _validate_payment_id(payment_id)
    db = SessionLocal()
    try:
        row = db.execute(text("SELECT * FROM payments WHERE id=:id"), {"id": payment_id}).fetchone()
        db.execute(text(
            "UPDATE payments SET status='rejected', confirmed_by='admin' WHERE id=:id"
        ), {"id": payment_id})
        if row:
            _audit(db, "payment_reject", row.telegram_id,
                   {"payment_id": payment_id},
                   request.client.host if request.client else None)
        db.commit()
        return {"success": True}
    finally:
        db.close()


# ─── Audit Logs ──────────────────────────────────────
@app.get("/admin/audit-logs")
def get_audit_logs(page: int = 1, limit: int = 50, action: str = ""):
    page  = max(1, page)
    limit = min(200, max(1, limit))
    db = SessionLocal()
    try:
        where  = "WHERE action = :action" if action else ""
        params = {"action": action} if action else {}
        total  = db.execute(text(f"SELECT COUNT(*) FROM audit_logs {where}"), params).scalar()
        rows   = db.execute(text(f"""
            SELECT * FROM audit_logs {where}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """), {**params, "limit": limit, "offset": (page - 1) * limit}).fetchall()
        return {
            "logs": [dict(r._mapping) for r in rows],
            "total": total, "page": page,
            "pages": max(1, -(-total // limit)),
        }
    finally:
        db.close()


# ─── Bot Statistics ───────────────────────────────────
@app.get("/admin/bot-stats")
def get_bot_stats():
    db = SessionLocal()
    try:
        from sqlalchemy import func
        daily_active = []
        for i in range(6, -1, -1):
            cnt = db.execute(text(
                "SELECT COUNT(*) FROM users WHERE date(last_active) = date('now', :off)"
            ), {"off": f"-{i} days"}).scalar()
            day = db.execute(text("SELECT date('now', :off)"), {"off": f"-{i} days"}).scalar()
            daily_active.append({"date": day, "count": cnt or 0})

        top_users = db.execute(text("""
            SELECT telegram_id, first_name, username, queries_used, plan_name, last_active
            FROM users ORDER BY queries_used DESC LIMIT 10
        """)).fetchall()

        lang_rows = db.execute(text(
            "SELECT language, COUNT(*) as c FROM users GROUP BY language"
        )).fetchall()
        languages = {r.language or "az": r.c for r in lang_rows}

        monthly_reg = []
        for i in range(5, -1, -1):
            cnt   = db.execute(text(
                "SELECT COUNT(*) FROM users WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', :off)"
            ), {"off": f"-{i} months"}).scalar()
            month = db.execute(text("SELECT strftime('%Y-%m', 'now', :off)"), {"off": f"-{i} months"}).scalar()
            monthly_reg.append({"month": month, "count": cnt or 0})

        total_users = db.query(User).count() or 1
        paid = db.query(User).filter(User.plan_level > 0).count()

        return {
            "daily_active": daily_active,
            "top_users": [dict(r._mapping) for r in top_users],
            "languages": languages,
            "monthly_registrations": monthly_reg,
            "conversion_rate": round(paid / total_users * 100, 1),
            "paid_users": paid,
            "total_users": total_users,
        }
    finally:
        db.close()


# ─── User Search ─────────────────────────────────────
@app.get("/admin/users/search")
def search_users(q: str = ""):
    if not q or len(q) < 2:
        return []
    # SQL injection: SQLAlchemy ORM parametric query — qorunur
    db = SessionLocal()
    try:
        filters = (User.username.ilike(f"%{q}%")) | (User.first_name.ilike(f"%{q}%"))
        if q.isdigit():
            filters = filters | (User.telegram_id == int(q))
        users = db.query(User).filter(filters).limit(20).all()
        return [{
            "id": u.id, "telegram_id": u.telegram_id,
            "username": u.username, "first_name": u.first_name,
            "plan_name": u.plan_name, "queries_used": u.queries_used,
        } for u in users]
    finally:
        db.close()


# ─── Payment Statistics ───────────────────────────────
@app.get("/admin/payment-stats")
def get_payment_stats():
    db = SessionLocal()
    try:
        monthly = []
        for i in range(5, -1, -1):
            row = db.execute(text("""
                SELECT strftime('%Y-%m', 'now', :off) as month,
                       COUNT(*) as count,
                       COALESCE(SUM(amount), 0) as revenue
                FROM payments
                WHERE status='confirmed'
                  AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', :off)
            """), {"off": f"-{i} months"}).fetchone()
            monthly.append({"month": row.month, "count": row.count, "revenue": row.revenue})

        by_plan = db.execute(text("""
            SELECT plan_name, COUNT(*) as count, COALESCE(SUM(amount), 0) as revenue
            FROM payments WHERE status='confirmed'
            GROUP BY plan_name
        """)).fetchall()

        totals = db.execute(text("""
            SELECT COUNT(*) as total_count,
                   COALESCE(SUM(CASE WHEN status='confirmed' THEN amount END), 0) as total_revenue,
                   SUM(CASE WHEN status='pending'   THEN 1 ELSE 0 END) as pending_count,
                   SUM(CASE WHEN status='confirmed' THEN 1 ELSE 0 END) as confirmed_count,
                   SUM(CASE WHEN status='rejected'  THEN 1 ELSE 0 END) as rejected_count
            FROM payments
        """)).fetchone()

        return {
            "monthly": monthly,
            "by_plan": [dict(r._mapping) for r in by_plan],
            "totals": dict(totals._mapping),
        }
    finally:
        db.close()


# ─── Revenue Stats (NEW) ──────────────────────────────
@app.get("/admin/revenue-stats")
def get_revenue_stats():
    db = SessionLocal()
    try:
        rows = db.execute(text("""
            SELECT
                COALESCE(SUM(CASE WHEN date(created_at)=date('now') THEN amount END), 0) as today,
                COALESCE(SUM(CASE WHEN date(created_at)>=date('now','-7 days') THEN amount END), 0) as week,
                COALESCE(SUM(CASE WHEN strftime('%Y-%m',created_at)=strftime('%Y-%m','now') THEN amount END), 0) as month,
                COALESCE(SUM(amount), 0) as total
            FROM payments WHERE status='confirmed'
        """)).fetchone()

        # Son 30 gün trend
        trend = []
        for i in range(29, -1, -1):
            row = db.execute(text("""
                SELECT date('now', :off) as day,
                       COALESCE(SUM(amount), 0) as revenue,
                       COUNT(*) as count
                FROM payments
                WHERE status='confirmed' AND date(created_at)=date('now', :off)
            """), {"off": f"-{i} days"}).fetchone()
            trend.append({"day": row.day, "revenue": row.revenue, "count": row.count})

        # Plan üzrə breakdown
        by_plan = db.execute(text("""
            SELECT plan_name,
                   COUNT(*) as count,
                   COALESCE(SUM(amount),0) as revenue
            FROM payments WHERE status='confirmed'
            GROUP BY plan_name ORDER BY revenue DESC
        """)).fetchall()

        # MRR: bu ayki confirmed ödənişlər
        mrr = rows.month

        return {
            "today":   round(rows.today, 2),
            "week":    round(rows.week, 2),
            "month":   round(rows.month, 2),
            "total":   round(rows.total, 2),
            "mrr":     round(mrr, 2),
            "trend_30d": trend,
            "by_plan": [dict(r._mapping) for r in by_plan],
        }
    finally:
        db.close()


# ─── User Activity (NEW) ─────────────────────────────
@app.get("/admin/user-activity")
def get_user_activity():
    db = SessionLocal()
    try:
        active_24h = db.execute(text("""
            SELECT COUNT(*) FROM users
            WHERE last_active >= datetime('now', '-24 hours')
        """)).scalar() or 0

        active_7d = db.execute(text("""
            SELECT COUNT(*) FROM users
            WHERE last_active >= datetime('now', '-7 days')
        """)).scalar() or 0

        # Bu həftə yeni qeydiyyat
        new_this_week = db.execute(text("""
            SELECT COUNT(*) FROM users
            WHERE created_at >= datetime('now', '-7 days')
        """)).scalar() or 0

        total = db.query(User).count() or 1
        returning = total - new_this_week

        # Saatlıq aktivlik (son 24 saat — 0-23)
        hourly = []
        for h in range(23, -1, -1):
            cnt = db.execute(text("""
                SELECT COUNT(*) FROM users
                WHERE last_active >= datetime('now', :start)
                  AND last_active <  datetime('now', :end)
            """), {"start": f"-{h+1} hours", "end": f"-{h} hours"}).scalar() or 0
            hourly.append({"hour": 23 - h, "count": cnt})

        peak_hour = max(hourly, key=lambda x: x["count"]) if hourly else {"hour": 0, "count": 0}

        return {
            "active_24h":     active_24h,
            "active_7d":      active_7d,
            "new_this_week":  new_this_week,
            "returning":      max(0, returning),
            "hourly_activity": hourly,
            "peak_hour":      peak_hour,
        }
    finally:
        db.close()


# ─── Retention (NEW) ─────────────────────────────────
@app.get("/admin/retention")
def get_retention():
    db = SessionLocal()
    try:
        from sqlalchemy import func

        free_avg = db.execute(text(
            "SELECT AVG(queries_used) FROM users WHERE plan_name='FREE'"
        )).scalar() or 0

        paid_avg = db.execute(text(
            "SELECT AVG(queries_used) FROM users WHERE plan_level > 0"
        )).scalar() or 0

        # Churn: 30+ gündür aktiv olmayan paid istifadəçilər
        churn_count = db.execute(text("""
            SELECT COUNT(*) FROM users
            WHERE plan_level > 0
              AND (last_active IS NULL OR last_active < datetime('now', '-30 days'))
        """)).scalar() or 0

        total_paid = db.query(User).filter(User.plan_level > 0).count() or 1
        churn_rate = round(churn_count / total_paid * 100, 1)

        # Plan üzrə orta queries
        plan_queries = db.execute(text("""
            SELECT plan_name, AVG(queries_used) as avg_q, COUNT(*) as users
            FROM users GROUP BY plan_name
        """)).fetchall()

        return {
            "free_avg_queries":  round(free_avg, 1),
            "paid_avg_queries":  round(paid_avg, 1),
            "churn_count":       churn_count,
            "churn_rate_pct":    churn_rate,
            "total_paid_users":  total_paid,
            "plan_queries":      [dict(r._mapping) for r in plan_queries],
        }
    finally:
        db.close()


# ─── Query Stats (from query_logs) ──────────────────────
@app.get("/admin/query-stats")
def get_query_stats():
    db = SessionLocal()
    try:
        # Ensure table exists
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS query_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER,
                category TEXT,
                language TEXT,
                ai_model TEXT,
                response_time_ms INTEGER,
                query_length INTEGER,
                response_length INTEGER,
                has_rag BOOLEAN DEFAULT 0,
                plan_level INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """))

        today = db.execute(text("""
            SELECT COUNT(*) as total,
                   COALESCE(AVG(response_time_ms), 0) as avg_ms
            FROM query_logs WHERE date(created_at) = date('now')
        """)).fetchone()

        week = db.execute(text("""
            SELECT COUNT(*) as total,
                   COALESCE(AVG(response_time_ms), 0) as avg_ms
            FROM query_logs WHERE created_at >= datetime('now', '-7 days')
        """)).fetchone()

        by_model_today = {
            r.ai_model: r.c for r in db.execute(text("""
                SELECT ai_model, COUNT(*) as c FROM query_logs
                WHERE date(created_at) = date('now')
                GROUP BY ai_model
            """)).fetchall()
        }

        by_cat_today = {
            r.category: r.c for r in db.execute(text("""
                SELECT category, COUNT(*) as c FROM query_logs
                WHERE date(created_at) = date('now')
                GROUP BY category
            """)).fetchall()
        }

        popular = db.execute(text("""
            SELECT category, COUNT(*) as count FROM query_logs
            WHERE created_at >= datetime('now', '-7 days')
            GROUP BY category ORDER BY count DESC LIMIT 10
        """)).fetchall()

        model_usage = {
            r.ai_model: r.c for r in db.execute(text("""
                SELECT ai_model, COUNT(*) as c FROM query_logs GROUP BY ai_model
            """)).fetchall()
        }

        trend = []
        for i in range(6, -1, -1):
            row = db.execute(text("""
                SELECT date('now', :off) as d,
                       COUNT(*) as total,
                       COALESCE(AVG(response_time_ms), 0) as avg_ms
                FROM query_logs WHERE date(created_at) = date('now', :off)
            """), {"off": f"-{i} days"}).fetchone()
            trend.append({"date": row.d, "total": row.total, "avg_ms": round(row.avg_ms)})

        return {
            "today": {
                "total": today.total or 0,
                "avg_response_ms": round(today.avg_ms or 0),
                "by_model": by_model_today,
                "by_category": by_cat_today,
            },
            "week": {
                "total": week.total or 0,
                "avg_response_ms": round(week.avg_ms or 0),
            },
            "popular_categories": [{"category": r.category, "count": r.count} for r in popular],
            "model_usage": model_usage,
            "response_time_trend": trend,
        }
    finally:
        db.close()


# ─── System Health ────────────────────────────────────
@app.get("/admin/health")
def system_health():
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1")).scalar()
        db_ok = True
    except Exception:
        db_ok = False
    finally:
        db.close()

    db_size = 0
    try:
        db_path = os.path.join(os.path.dirname(__file__), "lexai.db")
        db_size = os.path.getsize(db_path) if os.path.exists(db_path) else 0
    except Exception:
        pass

    uptime_secs = int(time.time() - _start_time)
    hours, rem  = divmod(uptime_secs, 3600)
    mins        = rem // 60

    return {
        "status":         "ok" if db_ok else "degraded",
        "database":       "ok" if db_ok else "error",
        "db_size_kb":     round(db_size / 1024, 1),
        "uptime":         f"{hours}s {mins}d",
        "uptime_seconds": uptime_secs,
        "timestamp":      datetime.now(timezone.utc).isoformat(),
    }
