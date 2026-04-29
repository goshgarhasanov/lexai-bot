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
from handlers.voice_handler import handle_voice
from handlers.payment_handler import (
    handle_payment_callback,
    handle_pre_checkout,
    handle_successful_payment,
    admin_upgrade_user,
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
    app.add_handler(CommandHandler("upgrade_user", admin_upgrade_user))
    app.add_handler(CallbackQueryHandler(handle_legal_callback, pattern="^legal_"))
    app.add_handler(CallbackQueryHandler(handle_payment_callback, pattern="^(pay_|stars_invoice_)"))
    app.add_handler(CallbackQueryHandler(handle_menu_callback, pattern="^(area_|doc_|back_|plan_|menu_)"))
    app.add_handler(CallbackQueryHandler(handle_callback))
    app.add_handler(MessageHandler(filters.SUCCESSFUL_PAYMENT, handle_successful_payment))
    from telegram.ext import PreCheckoutQueryHandler
    app.add_handler(PreCheckoutQueryHandler(handle_pre_checkout))

    app.add_handler(MessageHandler(filters.VOICE, handle_voice))
    app.add_handler(MessageHandler(filters.AUDIO, handle_voice))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("HuquqAI botu işə salınır...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
