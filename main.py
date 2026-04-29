import logging
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    filters,
)

from config import config
from handlers import (
    handle_message,
    cmd_start, cmd_help, cmd_plans, cmd_mystats,
    cmd_clear, cmd_language, cmd_upgrade, handle_callback,
    cmd_terms, cmd_privacy, cmd_refund, cmd_rules,
    handle_legal_callback, handle_menu_callback,
)

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
    handlers=[
        logging.FileHandler("bot.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logging.getLogger("httpx").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)


def main() -> None:
    if not config.TELEGRAM_TOKEN:
        raise RuntimeError("TELEGRAM_TOKEN mühit dəyişəni təyin edilməyib!")

    app = Application.builder().token(config.TELEGRAM_TOKEN).build()

    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("plans", cmd_plans))
    app.add_handler(CommandHandler("mystats", cmd_mystats))
    app.add_handler(CommandHandler("clear", cmd_clear))
    app.add_handler(CommandHandler("language", cmd_language))
    app.add_handler(CommandHandler("upgrade", cmd_upgrade))
    app.add_handler(CommandHandler("terms", cmd_terms))
    app.add_handler(CommandHandler("privacy", cmd_privacy))
    app.add_handler(CommandHandler("refund", cmd_refund))
    app.add_handler(CommandHandler("rules", cmd_rules))

    # Callback handlers — spesifik pattern-lər əvvəl gəlməlidir
    app.add_handler(CallbackQueryHandler(handle_legal_callback, pattern="^legal_"))
    app.add_handler(CallbackQueryHandler(handle_menu_callback, pattern="^(area_|doc_|back_|plan_|menu_)"))
    app.add_handler(CallbackQueryHandler(handle_callback))

    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("HuquqAI botu işə salınır...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
