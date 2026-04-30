"""
HuquqAI Admin REST API — FastAPI
Bot ilə eyni SQLite database-i istifadə edir.
Başlatmaq: uvicorn admin_api:app --port 8000 --reload
"""
import os
import json
import time
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from database.models import SessionLocal, User, Base, engine
from sqlalchemy import text

_start_time = time.time()

# Cədvəlləri yarat (əgər yoxdursa)
with engine.connect() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS payments (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id INTEGER NOT NULL,
            plan_name  TEXT NOT NULL,
            amount     REAL DEFAULT 0,
            method     TEXT DEFAULT 'card',
            status     TEXT DEFAULT 'pending',
            note       TEXT,
            confirmed_by TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            action        TEXT NOT NULL,
            target_user_id INTEGER,
            admin_user    TEXT DEFAULT 'admin',
            details       TEXT,
            ip_address    TEXT,
            created_at    TEXT DEFAULT (datetime('now'))
        )
    """))
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
        total_users   = db.query(User).count()
        today         = datetime.now(timezone.utc).date().isoformat()
        active_today  = db.query(User).filter(User.created_at >= today).count()
        paid_users    = db.query(User).filter(User.plan_level > 0).count()
        total_queries = db.query(User).with_entities(
            __import__("sqlalchemy").func.sum(User.queries_used)
        ).scalar() or 0

        plans = {}
        for plan in ["FREE", "BASIC", "PRO", "FIRM"]:
            plans[plan] = db.query(User).filter(User.plan_name == plan).count()

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
def list_users(
    page: int = 1,
    limit: int = 20,
    search: str = "",
    plan: str = "",
):
    db = SessionLocal()
    try:
        q = db.query(User)
        if search:
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
            "users": [
                {
                    "id": u.id,
                    "telegram_id": u.telegram_id,
                    "username": u.username,
                    "first_name": u.first_name,
                    "language": u.language,
                    "plan_name": u.plan_name,
                    "plan_level": u.plan_level,
                    "queries_used": u.queries_used,
                    "is_active": u.is_active,
                    "created_at": str(u.created_at)[:19] if u.created_at else None,
                }
                for u in users
            ],
            "total": total,
            "page": page,
            "pages": max(1, -(-total // limit)),
        }
    finally:
        db.close()


class PlanUpdate(BaseModel):
    plan: str


@app.put("/admin/users/{user_id}/plan")
def upgrade_plan(user_id: int, body: PlanUpdate, request: Request):
    plan = body.plan.upper()
    level = PLAN_LEVELS.get(plan)
    if level is None:
        raise HTTPException(400, "Yanlış plan. FREE, BASIC, PRO, FIRM olmalıdır.")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(404, "İstifadəçi tapılmadı")

        old_plan = user.plan_name
        user.plan_name = plan
        user.plan_level = level
        user.queries_used = 0
        user.queries_reset_at = datetime.now(timezone.utc)

        db.execute(text(
            "INSERT INTO payments (telegram_id, plan_name, amount, method, status, confirmed_by) "
            "VALUES (:tid, :plan, 0, 'admin', 'confirmed', 'admin')"
        ), {"tid": user.telegram_id, "plan": plan})

        _audit(db, "plan_upgrade", user.telegram_id,
               {"old_plan": old_plan, "new_plan": plan},
               request.client.host if request.client else None)

        db.commit()
        return {"success": True, "message": f"{user.first_name or user.telegram_id} → {plan} planına yüksəldildi"}
    finally:
        db.close()


@app.put("/admin/users/{user_id}/block")
def toggle_block(user_id: int, request: Request):
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
    db = SessionLocal()
    try:
        result = db.execute(text(
            "INSERT INTO payments (telegram_id, plan_name, amount, method, status, note) "
            "VALUES (:tid, :plan, :amount, :method, 'pending', :note)"
        ), {"tid": body.telegram_id, "plan": body.plan_name.upper(),
            "amount": body.amount, "method": body.method, "note": body.note or ""})
        db.commit()
        return {"success": True, "id": result.lastrowid}
    finally:
        db.close()


@app.put("/admin/payments/{payment_id}/confirm")
def confirm_payment(payment_id: int, request: Request):
    db = SessionLocal()
    try:
        row = db.execute(text("SELECT * FROM payments WHERE id = :id"), {"id": payment_id}).fetchone()
        if not row:
            raise HTTPException(404, "Ödəniş tapılmadı")
        if row.status == "confirmed":
            raise HTTPException(400, "Bu ödəniş artıq təsdiqlənilib")

        plan = row.plan_name
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
    db = SessionLocal()
    try:
        where = "WHERE action = :action" if action else ""
        params = {"action": action} if action else {}
        total = db.execute(text(f"SELECT COUNT(*) FROM audit_logs {where}"), params).scalar()
        rows = db.execute(text(f"""
            SELECT * FROM audit_logs {where}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """), {**params, "limit": limit, "offset": (page - 1) * limit}).fetchall()
        return {
            "logs": [dict(r._mapping) for r in rows],
            "total": total,
            "page": page,
            "pages": max(1, -(-total // limit)),
        }
    finally:
        db.close()


# ─── Bot Statistics ───────────────────────────────────
@app.get("/admin/bot-stats")
def get_bot_stats():
    from sqlalchemy import func
    db = SessionLocal()
    try:
        # Son 7 gün aktiv istifadəçilər (last_active üzrə)
        daily_active = []
        for i in range(6, -1, -1):
            rows = db.execute(text(
                "SELECT COUNT(*) FROM users WHERE date(last_active) = date('now', :offset)"
            ), {"offset": f"-{i} days"}).scalar()
            day = db.execute(text(
                "SELECT date('now', :offset)"
            ), {"offset": f"-{i} days"}).scalar()
            daily_active.append({"date": day, "count": rows or 0})

        # Top 10 istifadəçi (queries_used)
        top_users = db.execute(text("""
            SELECT telegram_id, first_name, username, queries_used, plan_name
            FROM users ORDER BY queries_used DESC LIMIT 10
        """)).fetchall()

        # Dil bölgüsü
        lang_rows = db.execute(text(
            "SELECT language, COUNT(*) as c FROM users GROUP BY language"
        )).fetchall()
        languages = {r.language or "az": r.c for r in lang_rows}

        # Aylıq qeydiyyat (son 6 ay)
        monthly_reg = []
        for i in range(5, -1, -1):
            count = db.execute(text(
                "SELECT COUNT(*) FROM users WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', :offset)"
            ), {"offset": f"-{i} months"}).scalar()
            month = db.execute(text(
                "SELECT strftime('%Y-%m', 'now', :offset)"
            ), {"offset": f"-{i} months"}).scalar()
            monthly_reg.append({"month": month, "count": count or 0})

        # Plan konversiya
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
    db = SessionLocal()
    try:
        filters = (
            (User.username.ilike(f"%{q}%")) |
            (User.first_name.ilike(f"%{q}%"))
        )
        if q.isdigit():
            filters = filters | (User.telegram_id == int(q))
        users = db.query(User).filter(filters).limit(20).all()
        return [
            {
                "id": u.id,
                "telegram_id": u.telegram_id,
                "username": u.username,
                "first_name": u.first_name,
                "plan_name": u.plan_name,
                "queries_used": u.queries_used,
            }
            for u in users
        ]
    finally:
        db.close()


# ─── Payment Statistics ───────────────────────────────
@app.get("/admin/payment-stats")
def get_payment_stats():
    db = SessionLocal()
    try:
        # Aylıq gəlir (son 6 ay, confirmed ödənişlər)
        monthly = []
        for i in range(5, -1, -1):
            row = db.execute(text("""
                SELECT strftime('%Y-%m', 'now', :offset) as month,
                       COUNT(*) as count,
                       COALESCE(SUM(amount), 0) as revenue
                FROM payments
                WHERE status='confirmed'
                  AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', :offset)
            """), {"offset": f"-{i} months"}).fetchone()
            monthly.append({"month": row.month, "count": row.count, "revenue": row.revenue})

        # Plan bölgüsü (confirmed)
        by_plan = db.execute(text("""
            SELECT plan_name, COUNT(*) as count, COALESCE(SUM(amount), 0) as revenue
            FROM payments WHERE status='confirmed'
            GROUP BY plan_name
        """)).fetchall()

        # Ümumi
        totals = db.execute(text("""
            SELECT COUNT(*) as total_count,
                   COALESCE(SUM(CASE WHEN status='confirmed' THEN amount END), 0) as total_revenue,
                   SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending_count,
                   SUM(CASE WHEN status='confirmed' THEN 1 ELSE 0 END) as confirmed_count,
                   SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) as rejected_count
            FROM payments
        """)).fetchone()

        return {
            "monthly": monthly,
            "by_plan": [dict(r._mapping) for r in by_plan],
            "totals": dict(totals._mapping),
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
    hours, rem = divmod(uptime_secs, 3600)
    mins = rem // 60

    return {
        "status": "ok" if db_ok else "degraded",
        "database": "ok" if db_ok else "error",
        "db_size_kb": round(db_size / 1024, 1),
        "uptime": f"{hours}s {mins}d",
        "uptime_seconds": uptime_secs,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
