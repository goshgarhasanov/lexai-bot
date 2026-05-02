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
from services.voice_service import transcribe_voice
from handlers.keyboards import main_menu_keyboard, back_to_menu_keyboard

logger = logging.getLogger(__name__)

THINKING_STEPS = [
    "🎙 Səsiniz eşidilir...",
    "📝 Nitq mətнə çevrilir...",
    "⚖️ Hüquqi analiz aparılır...",
    "✍️ Cavab hazırlanır...",
]


async def _animate(bot, chat_id: int, msg_id: int, stop: asyncio.Event) -> None:
    step = 0
    while not stop.is_set():
        try:
            await bot.edit_message_text(
                chat_id=chat_id,
                message_id=msg_id,
                text=THINKING_STEPS[step % len(THINKING_STEPS)],
            )
        except Exception:
            pass
        step += 1
        try:
            await asyncio.wait_for(asyncio.shield(stop.wait()), timeout=2.5)
        except asyncio.TimeoutError:
            pass


async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    telegram_user = update.effective_user
    chat_id = update.effective_chat.id
    voice = update.message.voice or update.message.audio

    if not voice:
        return

    # File size limit: 10 MB
    MAX_VOICE_BYTES = 10 * 1024 * 1024
    file_size = getattr(voice, "file_size", None)
    if file_size and file_size > MAX_VOICE_BYTES:
        await update.message.reply_text(
            "⚠️ Ses faylı çox böyükdür. Maksimum 10 MB icazə verilir.",
            reply_markup=main_menu_keyboard(),
        )
        return

    # Allowed mime types
    ALLOWED_MIME = {"audio/ogg", "audio/mpeg", "audio/mp4", "audio/webm",
                    "audio/wav", "audio/x-wav", "video/mp4"}
    mime = getattr(voice, "mime_type", None)
    if mime and mime not in ALLOWED_MIME:
        await update.message.reply_text(
            "⚠️ Dəstəklənməyən audio formatı. OGG, MP3 və ya MP4 göndərin.",
            reply_markup=main_menu_keyboard(),
        )
        return

    db = SessionLocal()
    stop = asyncio.Event()
    thinking_msg = None
    anim_task = None

    try:
        user = get_or_create_user(
            db,
            telegram_id=telegram_user.id,
            username=telegram_user.username,
            first_name=telegram_user.first_name,
        )

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

        thinking_msg = await update.message.reply_text("🎙 Səsiniz eşidilir...")
        anim_task = asyncio.create_task(_animate(context.bot, chat_id, thinking_msg.message_id, stop))

        # Telegram-dan ses faylını endir
        tg_file = await context.bot.get_file(voice.file_id)
        file_bytes = bytes(await tg_file.download_as_bytearray())

        # Whisper ilə transkript et
        language = user.language or "az"
        transcript = await transcribe_voice(file_bytes, language)

        if not transcript:
            stop.set()
            try:
                await thinking_msg.delete()
            except Exception:
                pass
            await update.message.reply_text(
                "🎙 Səsinizi anlaya bilmədim. Zəhmət olmasa yenidən cəhd edin "
                "və ya sualınızı yazı ilə göndərin.",
                reply_markup=main_menu_keyboard(),
            )
            return

        # Transkripti istifadəçiyə göstər
        try:
            await context.bot.edit_message_text(
                chat_id=chat_id,
                message_id=thinking_msg.message_id,
                text=f"🎙 *Eşidildi:*\n_{transcript}_\n\n⚖️ Hüquqi analiz aparılır...",
                parse_mode="Markdown",
            )
        except Exception:
            pass

        # AI ilə cavab hazırla
        classification, route = router.get_route_config(transcript)
        requires_rag = classification.get("requires_rag", True)
        document_mode = detect_document_type(transcript) is not None and user.can_use_documents()

        rag_context = ""
        if requires_rag:
            rag_context = rag_service.build_context(transcript, language=language)

        history = get_history(user.telegram_id)
        system_prompt = build_system_prompt(
            user=user,
            rag_context=rag_context,
            conversation_history=history,
            document_mode=document_mode,
            user_message=transcript,
        )
        messages = history + [{"role": "user", "content": transcript}]

        try:
            loop = asyncio.get_running_loop()
            ai_response = await loop.run_in_executor(
                None, lambda: call_ai(system_prompt, messages, route)
            )
        except Exception as e:
            logger.error(f"AI error in voice handler: {e}")
            stop.set()
            await thinking_msg.delete()
            await update.message.reply_text(get_error_message("ai_timeout"), reply_markup=main_menu_keyboard())
            return

        stop.set()
        if anim_task:
            anim_task.cancel()

        append_message(user.telegram_id, "user", transcript)
        append_message(user.telegram_id, "assistant", ai_response)
        user.increment_usage()
        db.commit()

        try:
            await thinking_msg.delete()
        except Exception:
            pass

        limit = 5 if user.plan_level == 0 else (100 if user.plan_level == 1 else -1)
        remaining = max(0, limit - user.queries_used) if limit != -1 else None
        footer = f"\n\n⚠️ _Bu ay {remaining} sorğu hüququnuz qalıb._" if remaining is not None and user.plan_level < 2 else ""

        full_response = ai_response + footer
        chunks = [full_response[i:i + 4000] for i in range(0, len(full_response), 4000)]
        for i, chunk in enumerate(chunks):
            markup = back_to_menu_keyboard() if i == len(chunks) - 1 else None
            await update.message.reply_text(chunk, parse_mode="Markdown", reply_markup=markup)

    except Exception as e:
        logger.error(f"Voice handler error: {e}", exc_info=True)
        stop.set()
        if thinking_msg:
            try:
                await thinking_msg.delete()
            except Exception:
                pass
        await update.message.reply_text(
            "⚠️ Texniki xəta baş verdi. Yenidən cəhd edin.",
            reply_markup=main_menu_keyboard(),
        )
    finally:
        stop.set()
        if anim_task:
            anim_task.cancel()
        db.close()
