from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Boolean, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import config


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    telegram_id = Column(Integer, unique=True, nullable=False, index=True)
    username = Column(String(100), nullable=True)
    first_name = Column(String(100), nullable=True)
    language = Column(String(10), default="az")
    plan_level = Column(Integer, default=0)
    plan_name = Column(String(20), default="FREE")
    queries_used = Column(Integer, default=0)
    queries_reset_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)
    last_active = Column(DateTime, nullable=True)

    def is_limit_reached(self) -> bool:
        from config import config
        limit = config.PLAN_LIMITS.get(self.plan_level, 5)
        if limit == -1:
            return False
        return self.queries_used >= limit

    def can_use_documents(self) -> bool:
        return self.plan_level >= 2

    def increment_usage(self) -> None:
        self.queries_used += 1


engine = create_engine(config.DATABASE_URL, connect_args={"check_same_thread": False})
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_or_create_user(db, telegram_id: int, username: str = None, first_name: str = None) -> User:
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        user = User(
            telegram_id=telegram_id,
            username=username,
            first_name=first_name or "İstifadəçi",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
