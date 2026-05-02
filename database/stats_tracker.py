"""Query-level statistics tracker. Uses the same SQLite DB as the bot."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import text

from database.models import SessionLocal, engine

logger = logging.getLogger(__name__)

# Create query_logs table on import
with engine.connect() as _conn:
    _conn.execute(text("""
        CREATE TABLE IF NOT EXISTS query_logs (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id      INTEGER,
            category         TEXT,
            language         TEXT,
            ai_model         TEXT,
            response_time_ms INTEGER,
            query_length     INTEGER,
            response_length  INTEGER,
            has_rag          BOOLEAN DEFAULT 0,
            plan_level       INTEGER DEFAULT 0,
            created_at       TEXT DEFAULT (datetime('now'))
        )
    """))
    _conn.commit()


class StatsTracker:
    def log_query(
        self,
        user,
        category: str,
        model: str,
        response_time_ms: int,
        query_len: int,
        response_len: int,
        has_rag: bool,
    ) -> None:
        db = SessionLocal()
        try:
            db.execute(text("""
                INSERT INTO query_logs
                    (telegram_id, category, language, ai_model,
                     response_time_ms, query_length, response_length,
                     has_rag, plan_level)
                VALUES
                    (:tid, :cat, :lang, :model,
                     :rt, :ql, :rl, :rag, :pl)
            """), {
                "tid":   user.telegram_id,
                "cat":   category,
                "lang":  user.language or "az",
                "model": model,
                "rt":    int(response_time_ms),
                "ql":    query_len,
                "rl":    response_len,
                "rag":   1 if has_rag else 0,
                "pl":    user.plan_level,
            })
            db.commit()
        except Exception as e:
            logger.warning(f"StatsTracker.log_query failed: {e}")
        finally:
            db.close()

    def get_daily_stats(self) -> dict:
        db = SessionLocal()
        try:
            row = db.execute(text("""
                SELECT
                    COUNT(*) AS total,
                    COALESCE(AVG(response_time_ms), 0) AS avg_ms
                FROM query_logs
                WHERE date(created_at) = date('now')
            """)).fetchone()

            by_model = {
                r.ai_model: r.c
                for r in db.execute(text("""
                    SELECT ai_model, COUNT(*) AS c
                    FROM query_logs
                    WHERE date(created_at) = date('now')
                    GROUP BY ai_model
                """)).fetchall()
            }

            by_category = {
                r.category: r.c
                for r in db.execute(text("""
                    SELECT category, COUNT(*) AS c
                    FROM query_logs
                    WHERE date(created_at) = date('now')
                    GROUP BY category
                """)).fetchall()
            }

            return {
                "total":       row.total or 0,
                "avg_ms":      round(row.avg_ms or 0),
                "by_model":    by_model,
                "by_category": by_category,
            }
        finally:
            db.close()

    def get_popular_categories(self, days: int = 7) -> list[dict]:
        db = SessionLocal()
        try:
            rows = db.execute(text("""
                SELECT category, COUNT(*) AS c
                FROM query_logs
                WHERE created_at >= datetime('now', :offset)
                GROUP BY category
                ORDER BY c DESC
                LIMIT 10
            """), {"offset": f"-{days} days"}).fetchall()
            return [{"category": r.category, "count": r.c} for r in rows]
        finally:
            db.close()

    def get_model_usage(self) -> dict[str, int]:
        db = SessionLocal()
        try:
            rows = db.execute(text("""
                SELECT ai_model, COUNT(*) AS c
                FROM query_logs
                GROUP BY ai_model
            """)).fetchall()
            return {r.ai_model: r.c for r in rows}
        finally:
            db.close()


stats_tracker = StatsTracker()
