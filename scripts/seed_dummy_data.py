"""
Dummy data seeder — test və statistika üçün.
İstifadə: python scripts/seed_dummy_data.py
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
import random
from datetime import datetime, timezone, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from database.models import SessionLocal, User, engine
from sqlalchemy import text

FIRST_NAMES = [
    "Anar", "Leyla", "Kamran", "Nigar", "Tural", "Sevinc", "Elvin", "Aysel",
    "Murad", "Gülnar", "Rauf", "Xədicə", "Samir", "Nərmin", "Fuad", "Şəbnəm",
    "Orxan", "Lalə", "Cavid", "Könül", "Bəhruz", "Zəhra", "Elnur", "Günel",
    "Рустам", "Наталья", "Алексей", "Ольга", "John", "Sarah", "Michael", "Emma",
]

USERNAMES = [
    "anar_baku", "leyla_az", "kamran99", "nigar_huquq", "tural_legal",
    "sevinc_law", "elvin_az", "aysel_baki", "murad_v", "gulnar_az",
    "rauf_legal", "xedice_99", "samir_baku", "nermin_az", "fuad_huquq",
    None, None, None,  # bəziləri username-siz
]

PLANS = ["FREE", "FREE", "FREE", "FREE", "FREE", "FREE", "BASIC", "BASIC", "PRO", "FIRM"]
LANGUAGES = ["az", "az", "az", "az", "ru", "ru", "en"]

PAYMENT_AMOUNTS = {"BASIC": 9.99, "PRO": 24.99, "FIRM": 99.99}
PAYMENT_METHODS = ["card", "card", "card", "stars"]


def random_date(days_back: int = 180) -> datetime:
    delta = timedelta(
        days=random.randint(0, days_back),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )
    return datetime.now(timezone.utc) - delta


def seed_users(db, count: int = 50) -> list[User]:
    existing = db.query(User).count()
    if existing >= count:
        print(f"  OK Artıq {existing} istifadəçi var, əlavə edilmir")
        return db.query(User).all()

    to_add = count - existing
    print(f"  > {to_add} istifadəçi əlavə edilir...")

    users = []
    for i in range(to_add):
        plan = random.choice(PLANS)
        plan_level = {"FREE": 0, "BASIC": 1, "PRO": 2, "FIRM": 3}[plan]
        created = random_date(180)
        last_active = None
        if random.random() > 0.3:
            last_active = created + timedelta(days=random.randint(0, 30))
            if last_active > datetime.now(timezone.utc):
                last_active = datetime.now(timezone.utc) - timedelta(hours=random.randint(0, 72))

        user = User(
            telegram_id=100000000 + existing + i + 1,
            username=random.choice(USERNAMES),
            first_name=random.choice(FIRST_NAMES),
            language=random.choice(LANGUAGES),
            plan_name=plan,
            plan_level=plan_level,
            queries_used=random.randint(0, 150 if plan == "FREE" else 500),
            created_at=created,
            is_active=random.random() > 0.05,
            last_active=last_active,
        )
        db.add(user)
        users.append(user)

    db.commit()
    print(f"  OK {to_add} istifadəçi əlavə edildi")
    return db.query(User).all()


def seed_payments(db, users: list[User]):
    existing = db.execute(text("SELECT COUNT(*) FROM payments")).scalar()
    if existing >= 30:
        print(f"  OK Artıq {existing} ödəniş var, əlavə edilmir")
        return

    paid_users = [u for u in users if u.plan_name != "FREE"]
    statuses = ["confirmed", "confirmed", "confirmed", "pending", "rejected"]

    print(f"  > Ödənişlər əlavə edilir...")
    count = 0
    for user in paid_users[:20]:
        method = random.choice(PAYMENT_METHODS)
        amount = PAYMENT_AMOUNTS.get(user.plan_name, 0)
        status = random.choice(statuses)
        created = user.created_at + timedelta(minutes=random.randint(1, 60)) if user.created_at else datetime.now(timezone.utc)

        db.execute(text("""
            INSERT INTO payments (telegram_id, plan_name, amount, method, status, confirmed_by, created_at)
            VALUES (:tid, :plan, :amount, :method, :status, :confirmed_by, :created_at)
        """), {
            "tid": user.telegram_id,
            "plan": user.plan_name,
            "amount": amount if method == "card" else 0,
            "method": method,
            "status": status,
            "confirmed_by": "admin" if status == "confirmed" else None,
            "created_at": created.strftime("%Y-%m-%d %H:%M:%S"),
        })
        count += 1

    # Bir neçə pending ödəniş əlavə et
    free_users = [u for u in users if u.plan_name == "FREE"][:5]
    for user in free_users:
        plan = random.choice(["BASIC", "PRO"])
        db.execute(text("""
            INSERT INTO payments (telegram_id, plan_name, amount, method, status, created_at)
            VALUES (:tid, :plan, :amount, 'card', 'pending', datetime('now'))
        """), {
            "tid": user.telegram_id,
            "plan": plan,
            "amount": PAYMENT_AMOUNTS[plan],
        })
        count += 1

    db.commit()
    print(f"  OK {count} ödəniş əlavə edildi")


def seed_audit_logs(db, users: list[User]):
    existing = db.execute(text("SELECT COUNT(*) FROM audit_logs")).scalar()
    if existing >= 20:
        print(f"  OK Artıq {existing} audit log var")
        return

    actions = [
        ("plan_upgrade",    lambda u: {"old_plan": "FREE", "new_plan": u.plan_name}),
        ("user_block",      lambda u: {"reason": "spam"}),
        ("user_unblock",    lambda u: {"reason": "appeal"}),
        ("payment_confirm", lambda u: {"plan": u.plan_name, "amount": PAYMENT_AMOUNTS.get(u.plan_name, 0)}),
        ("reset_queries",   lambda u: {"queries_reset": u.queries_used}),
    ]

    print(f"  > Audit loglar əlavə edilir...")
    count = 0
    for user in random.sample(users, min(15, len(users))):
        action_name, detail_fn = random.choice(actions)
        created = (user.created_at or datetime.now(timezone.utc)) + timedelta(hours=random.randint(1, 48))
        db.execute(text("""
            INSERT INTO audit_logs (action, target_user_id, admin_user, details, ip_address, created_at)
            VALUES (:action, :uid, 'admin', :details, :ip, :created_at)
        """), {
            "action": action_name,
            "uid": user.telegram_id,
            "details": __import__("json").dumps(detail_fn(user), ensure_ascii=False),
            "ip": f"192.168.1.{random.randint(1, 254)}",
            "created_at": created.strftime("%Y-%m-%d %H:%M:%S"),
        })
        count += 1

    db.commit()
    print(f"  OK {count} audit log əlavə edildi")


def main():
    print("HuquqAI Dummy Data Seeder")
    print("=" * 40)

    db = SessionLocal()
    try:
        print("\nIstifadeciler:")
        users = seed_users(db, count=50)

        print("\nOdenisler:")
        seed_payments(db, users)

        print("\nAudit Loglar:")
        seed_audit_logs(db, users)

        total_users = db.query(User).count()
        total_payments = db.execute(text("SELECT COUNT(*) FROM payments")).scalar()
        total_logs = db.execute(text("SELECT COUNT(*) FROM audit_logs")).scalar()
        plan_dist = {
            p: db.query(User).filter(User.plan_name == p).count()
            for p in ["FREE", "BASIC", "PRO", "FIRM"]
        }

        print("\n" + "=" * 40)
        print("Yekun statistika:")
        print(f"  Istifadeciler : {total_users}")
        print(f"  Odenisler     : {total_payments}")
        print(f"  Audit loglar  : {total_logs}")
        print(f"  Plan bolgusu  : {plan_dist}")
        print("Seed tamamlandi!")

    finally:
        db.close()


if __name__ == "__main__":
    main()
