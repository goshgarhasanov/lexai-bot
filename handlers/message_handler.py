import asyncio
import logging
from telegram import Update
from telegram.ext import ContextTypes

from database.models import SessionLocal, get_or_create_user
from prompts.builder import build_system_prompt
from prompts.errors import get_error_message
from prompts.document import detect_document_type
from rag.service import rag_service
from router.classifier import router
from services.ai_service import call_ai
from services.memory_service import get_history, append_message

logger = logging.getLogger(__name__)


async def _keep_typing(bot, chat_id: int, stop_event: asyncio.Event) -> None:
    while not stop_event.is_set():
        try:
            await bot.send_chat_action(chat_id=chat_id, action="typing")
        except Exception:
            break
        await asyncio.sleep(4)


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_message = update.message.text
    telegram_user = update.effective_user
    chat_id = update.effective_chat.id

    db = SessionLocal()
    stop_typing = asyncio.Event()
    typing_task = asyncio.create_task(_keep_typing(context.bot, chat_id, stop_typing))

    try:
        user = get_or_create_user(
            db,
            telegram_id=telegram_user.id,
            username=telegram_user.username,
            first_name=telegram_user.first_name,
        )

        if user.is_limit_reached():
            stop_typing.set()
            await update.message.reply_text(
                get_error_message(
                    "query_limit_reached",
                    plan_name=user.plan_name,
                    limit=5 if user.plan_level == 0 else 100,
                ),
                parse_mode="Markdown",
            )
            return

        classification, route = router.get_route_config(user_message)
        requires_rag = classification.get("requires_rag", True)
        language = classification.get("language", user.language or "az")

        document_mode = (
            detect_document_type(user_message) is not None and user.can_use_documents()
        )

        rag_context = ""
        if requires_rag:
            rag_context = rag_service.build_context(user_message, language=language)

        history = get_history(user.telegram_id)
        system_prompt = build_system_prompt(
            user=user,
            rag_context=rag_context,
            conversation_history=history,
            document_mode=document_mode,
            user_message=user_message,
        )

        messages = history + [{"role": "user", "content": user_message}]

        try:
            loop = asyncio.get_event_loop()
            ai_response = await loop.run_in_executor(
                None, lambda: call_ai(system_prompt, messages, route)
            )
        except Exception as e:
            logger.error(f"AI error: {e}")
            stop_typing.set()
            await update.message.reply_text(get_error_message("ai_timeout"))
            return

        stop_typing.set()

        append_message(user.telegram_id, "user", user_message)
        append_message(user.telegram_id, "assistant", ai_response)

        user.increment_usage()
        db.commit()

        await update.message.reply_text(ai_response[:4096], parse_mode="Markdown")

    except Exception as e:
        logger.error(f"Handler error: {e}")
        stop_typing.set()
        await update.message.reply_text(
            "Texniki xəta baş verdi. Bir az sonra yenidən cəhd edin. 🔧"
        )
    finally:
        stop_typing.set()
        typing_task.cancel()
        db.close()
