"""
Admin API integration tests.
Həqiqi lexai.db üzərində işləyir — seed_dummy_data.py əvvəlcədən çalışdırılmalıdır.
"""
import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient
import admin_api

client = TestClient(admin_api.app)


# ══════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════

def get_first_user_id() -> int:
    r = client.get("/admin/users?limit=1")
    users = r.json().get("users", [])
    assert users, "DB-də istifadəçi yoxdur — əvvəlcə seed_dummy_data.py çalışdırın"
    return users[0]["id"]


def create_test_payment(telegram_id: int, plan: str = "BASIC") -> int:
    prices = {"BASIC": 9.99, "PRO": 24.99, "FIRM": 99.99}
    r = client.post("/admin/payments", json={
        "telegram_id": telegram_id,
        "plan_name": plan,
        "amount": prices.get(plan, 9.99),
        "method": "card",
        "note": "test_payment",
    })
    assert r.status_code == 200
    return r.json()["id"]


# ══════════════════════════════════════════════
# 1. STATS
# ══════════════════════════════════════════════
class TestStats:
    def test_stats_200(self):
        assert client.get("/admin/stats").status_code == 200

    def test_stats_required_fields(self):
        data = client.get("/admin/stats").json()
        for f in ["totalUsers", "activeToday", "paidUsers", "totalQueries", "plans"]:
            assert f in data, f"Missing: {f}"

    def test_stats_all_plan_tiers_present(self):
        plans = client.get("/admin/stats").json()["plans"]
        for tier in ["FREE", "BASIC", "PRO", "FIRM"]:
            assert tier in plans, f"Plan tier missing: {tier}"

    def test_stats_total_users_at_least_50(self):
        assert client.get("/admin/stats").json()["totalUsers"] >= 50

    def test_stats_paid_users_non_negative(self):
        assert client.get("/admin/stats").json()["paidUsers"] >= 0

    def test_stats_total_queries_non_negative(self):
        assert client.get("/admin/stats").json()["totalQueries"] >= 0

    def test_stats_plans_sum_equals_total(self):
        data = client.get("/admin/stats").json()
        plan_sum = sum(data["plans"].values())
        assert plan_sum == data["totalUsers"]


# ══════════════════════════════════════════════
# 2. USERS LIST
# ══════════════════════════════════════════════
class TestUsersList:
    def test_list_200(self):
        assert client.get("/admin/users").status_code == 200

    def test_list_structure(self):
        data = client.get("/admin/users").json()
        for f in ["users", "total", "page", "pages"]:
            assert f in data

    def test_list_default_page_1(self):
        assert client.get("/admin/users").json()["page"] == 1

    def test_list_limit_respected(self):
        data = client.get("/admin/users?limit=3").json()
        assert len(data["users"]) <= 3

    def test_list_page_2(self):
        r = client.get("/admin/users?page=2&limit=5")
        assert r.status_code == 200
        assert r.json()["page"] == 2

    def test_search_by_username(self):
        data = client.get("/admin/users?search=baku").json()
        assert isinstance(data["users"], list)

    def test_search_nonexistent_returns_empty(self):
        data = client.get("/admin/users?search=XYZNOTEXIST123").json()
        assert data["total"] == 0

    def test_filter_free_plan(self):
        data = client.get("/admin/users?plan=FREE").json()
        for u in data["users"]:
            assert u["plan_name"] == "FREE"

    def test_filter_pro_plan(self):
        data = client.get("/admin/users?plan=PRO").json()
        for u in data["users"]:
            assert u["plan_name"] == "PRO"

    def test_user_fields_complete(self):
        users = client.get("/admin/users?limit=1").json()["users"]
        if users:
            u = users[0]
            for f in ["id", "telegram_id", "plan_name", "plan_level", "queries_used", "is_active"]:
                assert f in u, f"User field missing: {f}"

    def test_total_matches_filter(self):
        all_data  = client.get("/admin/users").json()
        free_data = client.get("/admin/users?plan=FREE").json()
        paid_data = client.get("/admin/users?plan=PRO").json()
        assert free_data["total"] + paid_data["total"] <= all_data["total"]


# ══════════════════════════════════════════════
# 3. PLAN UPGRADE
# ══════════════════════════════════════════════
class TestPlanUpgrade:
    def test_upgrade_to_pro(self):
        uid = get_first_user_id()
        r = client.put(f"/admin/users/{uid}/plan", json={"plan": "PRO"})
        assert r.status_code == 200
        assert r.json()["success"] is True

    def test_upgrade_message_contains_plan(self):
        uid = get_first_user_id()
        msg = client.put(f"/admin/users/{uid}/plan", json={"plan": "BASIC"}).json()["message"]
        assert "BASIC" in msg

    def test_upgrade_invalid_plan_400(self):
        uid = get_first_user_id()
        assert client.put(f"/admin/users/{uid}/plan", json={"plan": "DIAMOND"}).status_code == 400

    def test_upgrade_nonexistent_user_404(self):
        assert client.put("/admin/users/99999999/plan", json={"plan": "PRO"}).status_code == 404

    def test_upgrade_all_valid_plans(self):
        uid = get_first_user_id()
        for plan in ["FREE", "BASIC", "PRO", "FIRM"]:
            r = client.put(f"/admin/users/{uid}/plan", json={"plan": plan})
            assert r.status_code == 200, f"Failed for plan: {plan}"

    def test_upgrade_case_insensitive(self):
        uid = get_first_user_id()
        for p in ["pro", "Pro", "PRO"]:
            r = client.put(f"/admin/users/{uid}/plan", json={"plan": p})
            assert r.status_code == 200

    def test_upgrade_resets_queries(self):
        users = client.get("/admin/users?plan=PRO&limit=1").json()["users"]
        if users:
            uid = users[0]["id"]
            client.put(f"/admin/users/{uid}/plan", json={"plan": "PRO"})
            updated = client.get(f"/admin/users?limit=100").json()["users"]
            user = next((u for u in updated if u["id"] == uid), None)
            if user:
                assert user["queries_used"] == 0


# ══════════════════════════════════════════════
# 4. BLOCK / UNBLOCK
# ══════════════════════════════════════════════
class TestBlock:
    def test_block_returns_is_active(self):
        uid = get_first_user_id()
        r = client.put(f"/admin/users/{uid}/block")
        assert r.status_code == 200
        assert "is_active" in r.json()

    def test_double_toggle_restores_state(self):
        uid = get_first_user_id()
        r1 = client.put(f"/admin/users/{uid}/block").json()["is_active"]
        r2 = client.put(f"/admin/users/{uid}/block").json()["is_active"]
        assert r1 != r2

    def test_block_nonexistent_404(self):
        assert client.put("/admin/users/99999999/block").status_code == 404


# ══════════════════════════════════════════════
# 5. RESET QUERIES
# ══════════════════════════════════════════════
class TestResetQueries:
    def test_reset_success(self):
        uid = get_first_user_id()
        r = client.put(f"/admin/users/{uid}/reset-queries")
        assert r.status_code == 200
        assert r.json()["success"] is True

    def test_reset_nonexistent_404(self):
        assert client.put("/admin/users/99999999/reset-queries").status_code == 404


# ══════════════════════════════════════════════
# 6. USER SEARCH
# ══════════════════════════════════════════════
class TestSearch:
    def test_search_results_list(self):
        assert isinstance(client.get("/admin/users/search?q=ana").json(), list)

    def test_search_max_20(self):
        assert len(client.get("/admin/users/search?q=a").json()) <= 20

    def test_search_empty_returns_empty(self):
        assert client.get("/admin/users/search?q=").json() == []

    def test_search_1_char_returns_empty(self):
        assert client.get("/admin/users/search?q=x").json() == []

    def test_search_numeric_telegram_id(self):
        r = client.get("/admin/users/search?q=100000001")
        assert r.status_code == 200

    def test_search_result_fields(self):
        results = client.get("/admin/users/search?q=test").json()
        for u in results[:3]:
            for f in ["id", "telegram_id", "plan_name"]:
                assert f in u


# ══════════════════════════════════════════════
# 7. PAYMENTS
# ══════════════════════════════════════════════
class TestPayments:
    def test_list_all_200(self):
        assert client.get("/admin/payments").status_code == 200

    def test_list_returns_list(self):
        assert isinstance(client.get("/admin/payments").json(), list)

    def test_filter_pending_status(self):
        for p in client.get("/admin/payments?status=pending").json():
            assert p["status"] == "pending"

    def test_filter_confirmed_status(self):
        for p in client.get("/admin/payments?status=confirmed").json():
            assert p["status"] == "confirmed"

    def test_filter_rejected_status(self):
        for p in client.get("/admin/payments?status=rejected").json():
            assert p["status"] == "rejected"

    def test_create_returns_id(self):
        tid = client.get("/admin/users?limit=1").json()["users"][0]["telegram_id"]
        r = client.post("/admin/payments", json={"telegram_id": tid, "plan_name": "BASIC", "amount": 9.99})
        assert r.status_code == 200
        assert "id" in r.json()

    def test_create_missing_telegram_id_422(self):
        assert client.post("/admin/payments", json={"plan_name": "PRO"}).status_code == 422

    def test_create_missing_plan_422(self):
        assert client.post("/admin/payments", json={"telegram_id": 12345}).status_code == 422

    def test_confirm_pending_upgrades_plan(self):
        tid = client.get("/admin/users?plan=FREE&limit=1").json()["users"][0]["telegram_id"]
        pid = create_test_payment(tid, "PRO")
        r = client.put(f"/admin/payments/{pid}/confirm")
        assert r.status_code == 200
        assert r.json()["success"] is True

    def test_double_confirm_400(self):
        tid = client.get("/admin/users?plan=FREE&limit=1").json()["users"][0]["telegram_id"]
        pid = create_test_payment(tid, "BASIC")
        client.put(f"/admin/payments/{pid}/confirm")
        assert client.put(f"/admin/payments/{pid}/confirm").status_code == 400

    def test_reject_payment(self):
        tid = client.get("/admin/users?limit=1").json()["users"][0]["telegram_id"]
        pid = create_test_payment(tid, "BASIC")
        assert client.put(f"/admin/payments/{pid}/reject").status_code == 200

    def test_confirm_nonexistent_404(self):
        assert client.put("/admin/payments/99999999/confirm").status_code == 404

    def test_payment_fields_complete(self):
        payments = client.get("/admin/payments").json()
        if payments:
            for f in ["id", "telegram_id", "plan_name", "status", "method", "created_at"]:
                assert f in payments[0]


# ══════════════════════════════════════════════
# 8. AUDIT LOGS
# ══════════════════════════════════════════════
class TestAuditLogs:
    def test_list_200(self):
        assert client.get("/admin/audit-logs").status_code == 200

    def test_structure(self):
        data = client.get("/admin/audit-logs").json()
        for f in ["logs", "total", "page", "pages"]:
            assert f in data

    def test_filter_by_action(self):
        data = client.get("/admin/audit-logs?action=plan_upgrade").json()
        for log in data["logs"]:
            assert log["action"] == "plan_upgrade"

    def test_pagination_limit(self):
        data = client.get("/admin/audit-logs?limit=3").json()
        assert len(data["logs"]) <= 3

    def test_log_fields(self):
        data = client.get("/admin/audit-logs").json()
        if data["logs"]:
            log = data["logs"][0]
            for f in ["id", "action", "admin_user", "created_at"]:
                assert f in log

    def test_upgrade_creates_audit_entry(self):
        uid = get_first_user_id()
        client.put(f"/admin/users/{uid}/plan", json={"plan": "FIRM"})
        actions = [l["action"] for l in client.get("/admin/audit-logs").json()["logs"]]
        assert "plan_upgrade" in actions

    def test_payment_confirm_creates_audit(self):
        tid = client.get("/admin/users?limit=1").json()["users"][0]["telegram_id"]
        pid = create_test_payment(tid, "BASIC")
        client.put(f"/admin/payments/{pid}/confirm")
        actions = [l["action"] for l in client.get("/admin/audit-logs").json()["logs"]]
        assert "payment_confirm" in actions


# ══════════════════════════════════════════════
# 9. BOT STATS
# ══════════════════════════════════════════════
class TestBotStats:
    def test_200(self):
        assert client.get("/admin/bot-stats").status_code == 200

    def test_daily_active_7_days(self):
        data = client.get("/admin/bot-stats").json()
        assert len(data["daily_active"]) == 7

    def test_daily_has_date_count(self):
        for d in client.get("/admin/bot-stats").json()["daily_active"]:
            assert "date" in d and "count" in d
            assert isinstance(d["count"], int) and d["count"] >= 0

    def test_top_users_max_10(self):
        assert len(client.get("/admin/bot-stats").json()["top_users"]) <= 10

    def test_top_users_sorted_by_queries(self):
        top = client.get("/admin/bot-stats").json()["top_users"]
        queries = [u["queries_used"] for u in top]
        assert queries == sorted(queries, reverse=True)

    def test_languages_is_dict(self):
        assert isinstance(client.get("/admin/bot-stats").json()["languages"], dict)

    def test_monthly_6_months(self):
        assert len(client.get("/admin/bot-stats").json()["monthly_registrations"]) == 6

    def test_conversion_rate_0_to_100(self):
        rate = client.get("/admin/bot-stats").json()["conversion_rate"]
        assert 0 <= rate <= 100


# ══════════════════════════════════════════════
# 10. PAYMENT STATS
# ══════════════════════════════════════════════
class TestPaymentStats:
    def test_200(self):
        assert client.get("/admin/payment-stats").status_code == 200

    def test_monthly_6_months(self):
        assert len(client.get("/admin/payment-stats").json()["monthly"]) == 6

    def test_monthly_fields(self):
        for m in client.get("/admin/payment-stats").json()["monthly"]:
            assert "month" in m and "count" in m and "revenue" in m

    def test_totals_fields(self):
        totals = client.get("/admin/payment-stats").json()["totals"]
        for f in ["total_count", "total_revenue", "pending_count", "confirmed_count", "rejected_count"]:
            assert f in totals

    def test_revenue_non_negative(self):
        assert client.get("/admin/payment-stats").json()["totals"]["total_revenue"] >= 0

    def test_by_plan_is_list(self):
        assert isinstance(client.get("/admin/payment-stats").json()["by_plan"], list)


# ══════════════════════════════════════════════
# 11. HEALTH
# ══════════════════════════════════════════════
class TestHealth:
    def test_200(self):
        assert client.get("/admin/health").status_code == 200

    def test_status_ok_or_degraded(self):
        assert client.get("/admin/health").json()["status"] in ["ok", "degraded"]

    def test_database_ok(self):
        assert client.get("/admin/health").json()["database"] == "ok"

    def test_uptime_non_negative(self):
        assert client.get("/admin/health").json()["uptime_seconds"] >= 0

    def test_db_size_positive(self):
        assert client.get("/admin/health").json()["db_size_kb"] > 0

    def test_timestamp_present(self):
        ts = client.get("/admin/health").json()["timestamp"]
        assert "T" in ts  # ISO format yoxlaması
