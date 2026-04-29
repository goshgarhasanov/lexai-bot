"""
HuquqAI Admin REST API — FastAPI
Bot ilə eyni SQLite database-i istifadə edir.
Başlatmaq: uvicorn admin_api:app --port 8000 --reload
"""
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from database.models import SessionLocal, User, Base, engine
from sqlalchemy import text

# Payments cədvəlini yarat (əgər yoxdursa)
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
    conn.commit()

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
def upgrade_plan(user_id: int, body: PlanUpdate):
    plan = body.plan.upper()
    level = PLAN_LEVELS.get(plan)
    if level is None:
        raise HTTPException(400, "Yanlış plan. FREE, BASIC, PRO, FIRM olmalıdır.")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(404, "İstifadəçi tapılmadı")

        user.plan_name = plan
        user.plan_level = level
        user.queries_used = 0
        user.queries_reset_at = datetime.now(timezone.utc)

        # Ödəniş qeydi
        db.execute(text(
            "INSERT INTO payments (telegram_id, plan_name, amount, method, status, confirmed_by) "
            "VALUES (:tid, :plan, 0, 'admin', 'confirmed', 'admin')"
        ), {"tid": user.telegram_id, "plan": plan})

        db.commit()
        return {"success": True, "message": f"{user.first_name or user.telegram_id} → {plan} planına yüksəldildi"}
    finally:
        db.close()


@app.put("/admin/users/{user_id}/block")
def toggle_block(user_id: int):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(404, "İstifadəçi tapılmadı")
        user.is_active = not user.is_active
        db.commit()
        return {"success": True, "is_active": user.is_active}
    finally:
        db.close()


@app.put("/admin/users/{user_id}/reset-queries")
def reset_queries(user_id: int):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(404, "İstifadəçi tapılmadı")
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
def confirm_payment(payment_id: int):
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

        db.commit()
        return {"success": True, "message": "Ödəniş təsdiqləndi, plan yüksəldildi"}
    finally:
        db.close()


@app.put("/admin/payments/{payment_id}/reject")
def reject_payment(payment_id: int):
    db = SessionLocal()
    try:
        db.execute(text(
            "UPDATE payments SET status='rejected', confirmed_by='admin' WHERE id=:id"
        ), {"id": payment_id})
        db.commit()
        return {"success": True}
    finally:
        db.close()
