import asyncio
import logging
from telegram import Update
from telegram.ext import ContextTypes
from telegram.error import BadRequest

from database.models import SessionLocal, get_or_create_user
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
        text = THINKING_STEPS[step % len(THINKING_STEPS)]
        try:
            await bot.edit_message_text(
                chat_id=chat_id,
                message_id=message_id,
                text=text,
            )
        except (BadRequest, Exception):
            pass
        step += 1
        try:
            await asyncio.wait_for(asyncio.shield(stop_event.wait()), timeout=2.5)
        except asyncio.TimeoutError:
            pass


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_message = update.message.text
    telegram_user = update.effective_user
    chat_id = update.effective_chat.id

    # Menyu düymələri text kimi gəlir — onları command kimi işlə
    if user_message == "⚖️ Hüquqi Sual":
        from handlers.menu_handler import show_legal_areas
        await show_legal_areas(update, context)
        return
    elif user_message == "📄 Sənəd Hazırla":
        from handlers.menu_handler import show_document_types
        await show_document_types(update, context)
        return
    elif user_message == "💼 Abunəlik Planları":
        from handlers.commands import cmd_plans
        await cmd_plans(update, context)
        return
    elif user_message == "📊 Hesabım":
        from handlers.commands import cmd_mystats
        await cmd_mystats(update, context)
        return
    elif user_message == "🌐 Dil Seçimi":
        from handlers.commands import cmd_language
        await cmd_language(update, context)
        return
    elif user_message == "ℹ️ Kömək":
        from handlers.commands import cmd_help
        await cmd_help(update, context)
        return

    db = SessionLocal()
    thinking_msg = None
    stop_event = asyncio.Event()
    anim_task = None

    try:
        user = get_or_create_user(
            db,
            telegram_id=telegram_user.id,
            username=telegram_user.username,
            first_name=telegram_user.first_name,
        )

        from datetime import datetime, timezone as tz
        user.last_active = datetime.now(tz.utc)
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

        # "Düşünürəm" mesajı göndər və animasiya başlat
        thinking_msg = await update.message.reply_text(
            "🔍 Sualınız analiz edilir...",
        )
        anim_task = asyncio.create_task(
            _animate_thinking(context.bot, chat_id, thinking_msg.message_id, stop_event)
        )

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

        stop_event.set()
        if anim_task:
            anim_task.cancel()

        append_message(user.telegram_id, "user", user_message)
        append_message(user.telegram_id, "assistant", ai_response)
        user.increment_usage()
        db.commit()

        # "Düşünürəm" mesajını sil, cavabı göndər
        try:
            await thinking_msg.delete()
        except Exception:
            pass

        limit = 5 if user.plan_level == 0 else (100 if user.plan_level == 1 else -1)
        remaining = max(0, limit - user.queries_used) if limit != -1 else None
        footer = f"\n\n⚠️ _Bu ay {remaining} sorğu hüququnuz qalıb._" if remaining is not None and user.plan_level < 2 else ""

        full_response = ai_response + footer

        # 4096 limitinə görə parçala
        chunks = [full_response[i:i + 4000] for i in range(0, len(full_response), 4000)]
        for i, chunk in enumerate(chunks):
            markup = back_to_menu_keyboard() if i == len(chunks) - 1 else None
            await update.message.reply_text(
                chunk,
                parse_mode="Markdown",
                reply_markup=markup,
            )

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
