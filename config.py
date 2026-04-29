import os
from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv()


@dataclass
class Config:
    # Telegram
    TELEGRAM_TOKEN: str = field(default_factory=lambda: os.getenv("TELEGRAM_TOKEN", ""))

    # AI Models
    ANTHROPIC_API_KEY: str = field(default_factory=lambda: os.getenv("ANTHROPIC_API_KEY", ""))
    OPENAI_API_KEY: str = field(default_factory=lambda: os.getenv("OPENAI_API_KEY", ""))
    GOOGLE_API_KEY: str = field(default_factory=lambda: os.getenv("GOOGLE_API_KEY", ""))
    PERPLEXITY_API_KEY: str = field(default_factory=lambda: os.getenv("PERPLEXITY_API_KEY", ""))

    # Vector DB
    PINECONE_API_KEY: str = field(default_factory=lambda: os.getenv("PINECONE_API_KEY", ""))
    PINECONE_INDEX: str = field(default_factory=lambda: os.getenv("PINECONE_INDEX", "lexai-laws"))
    PINECONE_ENVIRONMENT: str = field(default_factory=lambda: os.getenv("PINECONE_ENVIRONMENT", "gcp-starter"))

    # Database
    DATABASE_URL: str = field(default_factory=lambda: os.getenv("DATABASE_URL", "sqlite:///lexai.db"))

    # Redis (conversation memory)
    REDIS_URL: str = field(default_factory=lambda: os.getenv("REDIS_URL", "redis://localhost:6379/0"))

    # App settings
    MEMORY_WINDOW: int = 10
    RAG_TOP_K: int = 5
    RAG_SIMILARITY_THRESHOLD: float = 0.75

    # Subscription plans
    PLAN_LEVELS = {
        "FREE": 0,
        "BASIC": 1,
        "PRO": 2,
        "FIRM": 3,
    }

    PLAN_LIMITS = {
        0: 5,    # FREE: 5 queries/month
        1: 100,  # BASIC: 100 queries/month
        2: -1,   # PRO: unlimited
        3: -1,   # FIRM: unlimited
    }

    PLAN_PRICES = {
        0: 0.00,
        1: 9.99,
        2: 24.99,
        3: 99.99,
    }

    # Admin
    ADMIN_TELEGRAM_ID: int = field(default_factory=lambda: int(os.getenv("ADMIN_TELEGRAM_ID", "0")))
    ADMIN_CARD: str = field(default_factory=lambda: os.getenv("ADMIN_CARD", "4169 7388 9268 3264"))
    ADMIN_CARD_NAME: str = field(default_factory=lambda: os.getenv("ADMIN_CARD_NAME", "Həsənov Q."))
    ADMIN_USERNAME: str = field(default_factory=lambda: os.getenv("ADMIN_USERNAME", "@huquqai_support"))


config = Config()
