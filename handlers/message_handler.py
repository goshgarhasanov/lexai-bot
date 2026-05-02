import asyncio
import logging
import time
from datetime import datetime, timezone as tz
from telegram import Update
from telegram.ext import ContextTypes
from telegram.error import BadRequest

from database.models import SessionLocal, get_or_create_user
from database.stats_tracker import stats_tracker
from prompts.builder import build_system_prompt
from prompts.errors import get_error_message
from prompts.document import detect_document_type
from rag.service import rag_service
from router.classifier import router
from services.ai_service import call_ai
from services.memory_service import get_history, append_message
from handlers.keyboards import main_menu_keyboard, back_to_menu_keyboard

logger = logging.getLogger(__name__)

THINKING_STEPS = [
    "🔍 Sualınız analiz edilir...",
    "📚 Qanun bazası yoxlanılır...",
    "⚖️ Hüquqi analiz aparılır...",
    "✍️ Cavab hazırlanır...",
]


async def _animate_thinking(bot, chat_id: int, message_id: int, stop_event: asyncio.Event) -> None:
    step = 0
    while not stop_event.is_set():
        try:
            await bot.edit_message_text(
                chat_id=chat_id,
                message_id=message_id,
                text=THINKING_STEPS[step % len(THINKING_STEPS)],
            )
        except (BadRequest, Exception):
            pass
        step += 1
        try:
            await asyncio.wait_for(asyncio.shield(stop_event.wait()), timeout=2.5)
        except asyncio.TimeoutError:
            pass


def _check_subscription_expired(user) -> bool:
    """True if paid plan expired; downgrades to FREE and returns True."""
    if user.plan_level == 0:
        return False
    exp = user.subscription_expires_at
    if exp is None:
        return False
    # Make naive datetime timezone-aware for comparison
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=tz.utc)
    return datetime.now(tz.utc) > exp


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_message = update.message.text
    telegram_user = update.effective_user
    chat_id = update.effective_chat.id

    # Persistent menu button routing
    menu_routes = {
        "⚖️ Hüquqi Sual":       ("handlers.menu_handler", "show_legal_areas"),
        "📄 Sənəd Hazırla":     ("handlers.menu_handler", "show_document_types"),
        "💼 Abunəlik Planları": ("handlers.commands",     "cmd_plans"),
        "📊 Hesabım":           ("handlers.commands",     "cmd_mystats"),
        "🌐 Dil Seçimi":        ("handlers.commands",     "cmd_language"),
        "ℹ️ Kömək":             ("handlers.commands",     "cmd_help"),
    }
    if user_message in menu_routes:
        mod_name, fn_name = menu_routes[user_message]
        import importlib
        mod = importlib.import_module(mod_name)
        await getattr(mod, fn_name)(update, context)
        return

    db = SessionLocal()
    thinking_msg = None
    stop_event = asyncio.Event()
    anim_task = None
    start_time = time.time()

    try:
        user = get_or_create_user(
            db,
            telegram_id=telegram_user.id,
            username=telegram_user.username,
            first_name=telegram_user.first_name,
        )

        user.last_active = datetime.now(tz.utc)

        # Check subscription expiry
        if _check_subscription_expired(user):
            old_plan = user.plan_name
            user.plan_name = "FREE"
            user.plan_level = 0
            user.subscription_expires_at = None
            db.commit()
            await update.message.reply_text(
                f"⚠️ *{old_plan} abunəliyiniz başa çatdı.*\n\n"
                f"Hesabınız FREE plana keçirildi. Davam etmək üçün /upgrade yazın.",
                parse_mode="Markdown",
                reply_markup=main_menu_keyboard(),
            )

        db.commit()

        if user.is_limit_reached():
            await update.message.reply_text(
                get_error_message(
                    "query_limit_reached",
                    plan_name=user.plan_name,
                    limit=5 if user.plan_level == 0 else 100,
                ),
                reply_markup=main_menu_keyboard(),
            )
            return

        thinking_msg = await update.message.reply_text("🔍 Sualınız analiz edilir...")
        anim_task = asyncio.create_task(
            _animate_thinking(context.bot, chat_id, thinking_msg.message_id, stop_event)
        )

        classification, route = router.get_route_config(user_message)
        requires_rag = classification.get("requires_rag", True)
        language = classification.get("language", user.language or "az")
        category = classification.get("category", "deep_legal_analysis")
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
            loop = asyncio.get_running_loop()
            ai_response = await loop.run_in_executor(
                None, lambda: call_ai(system_prompt, messages, route)
            )
        except Exception as e:
            logger.error(f"AI error: {e}")
            stop_event.set()
            await thinking_msg.delete()
            await update.message.reply_text(
                get_error_message("ai_timeout"),
                reply_markup=main_menu_keyboard(),
            )
            return

        response_time_ms = int((time.time() - start_time) * 1000)
        stop_event.set()
        if anim_task:
            anim_task.cancel()

        append_message(user.telegram_id, "user", user_message)
        append_message(user.telegram_id, "assistant", ai_response)
        user.increment_usage()
        if hasattr(user, "total_queries_all_time") and user.total_queries_all_time is not None:
            user.total_queries_all_time += 1
        else:
            user.total_queries_all_time = 1
        db.commit()

        # Log query stats (non-blocking, ignore failures)
        try:
            stats_tracker.log_query(
                user=user,
                category=category,
                model=route.model,
                response_time_ms=response_time_ms,
                query_len=len(user_message),
                response_len=len(ai_response),
                has_rag=bool(rag_context),
            )
        except Exception:
            pass

        try:
            await thinking_msg.delete()
        except Exception:
            pass

        limit = 5 if user.plan_level == 0 else (100 if user.plan_level == 1 else -1)
        remaining = max(0, limit - user.queries_used) if limit != -1 else None
        footer = (
            f"\n\n⚠️ _Bu ay {remaining} sorğu hüququnuz qalıb._"
            if remaining is not None and user.plan_level < 2 else ""
        )

        full_response = ai_response + footer
        chunks = [full_response[i:i + 4000] for i in range(0, len(full_response), 4000)]
        for i, chunk in enumerate(chunks):
            markup = back_to_menu_keyboard() if i == len(chunks) - 1 else None
            await update.message.reply_text(chunk, parse_mode="Markdown", reply_markup=markup)

    except Exception as e:
        logger.error(f"Handler error: {e}")
        stop_event.set()
        if thinking_msg:
            try:
                await thinking_msg.delete()
            except Exception:
                pass
        await update.message.reply_text(
            "⚠️ Texniki xəta baş verdi. Bir az sonra yenidən cəhd edin.",
            reply_markup=main_menu_keyboard(),
        )
    finally:
        stop_event.set()
        if anim_task:
            anim_task.cancel()
        db.close()
