from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from database.models import SessionLocal, get_or_create_user
from services.memory_service import clear_history
from config import config
from handlers.keyboards import main_menu_keyboard, plans_keyboard, help_keyboard

HELP_TEXT = """
⚖️ *HuquqAI — Azərbaycan Hüquq Botu*

━━━━━━━━━━━━━━━━━━━━━━
Mən Azərbaycan qanunvericiliyinə əsaslanaraq hüquqi məsələlərdə sizə peşəkar dəstək göstərirəm.

📌 *Nə edə bilərəm:*
├ ⚖️ Hüquqi suallarınıza maddə istinadı ilə cavab
├ 📚 Mülki, əmək, ailə, cinayət, torpaq hüququ
├ 📄 PRO: Ərizə, müqavilə, şikayət sənədləri
└ 🌐 Az / Ru / En dil dəstəyi

━━━━━━━━━━━━━━━━━━━━━━
🕹 *Əmrlər:*
/start — Başlanğıc
/help — Kömək
/plans — Abunəlik planları
/mystats — Hesabım
/clear — Söhbəti sıfırla
/language — Dil seçimi
/terms — İstifadə şərtləri
/privacy — Məxfilik siyasəti
/refund — Geri ödəmə
/rules — Qaydalar

━━━━━━━━━━━━━━━━━━━━━━
_ℹ️ Bu bot hüquqi məsləhət deyil. Ciddi hallarda vəkilə müraciət edin._
"""


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    tg_user = update.effective_user
    db = SessionLocal()
    try:
        user = get_or_create_user(
            db,
            telegram_id=tg_user.id,
            username=tg_user.username,
            first_name=tg_user.first_name,
        )
        name = user.first_name or "İstifadəçi"

        welcome_keyboard = InlineKeyboardMarkup([
            [
                InlineKeyboardButton("⚖️ Hüquqi Sual", callback_data="area_custom"),
                InlineKeyboardButton("📄 Sənəd Hazırla", callback_data="menu_docs"),
            ],
            [
                InlineKeyboardButton("💼 Planlar", callback_data="menu_plans"),
                InlineKeyboardButton("📊 Hesabım", callback_data="menu_stats"),
            ],
            [
                InlineKeyboardButton("ℹ️ Kömək & Qaydalar", callback_data="menu_help"),
            ],
        ])

        await update.message.reply_text(
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"⚖️ *HuquqAI — Hüquqi Süni İntellekt*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"Hörmətli *{name}*, xoş gəlmisiniz! 👋\n\n"
            f"Mən Azərbaycan Respublikasının qanunvericiliyinə əsaslanaraq "
            f"hüquqi məsələlərdə sizə peşəkar dəstək göstərən AI köməkçiyəm.\n\n"
            f"📌 *Nə edə bilərəm?*\n"
            f"├ ⚖️ Hüquqi suallarınıza maddə istinadı ilə cavab verirəm\n"
            f"├ 📚 Mülki, əmək, ailə, cinayət, torpaq hüququ üzrə analiz\n"
            f"├ 📄 PRO: Ərizə, müqavilə, şikayət sənədləri\n"
            f"└ 🌐 Azərbaycan, Rus, İngilis dil dəstəyi\n\n"
            f"_ℹ️ Bu bot hüquqi məsləhət xidməti deyil. Ciddi hallarda lisenziyalı vəkilə müraciət edin._",
            parse_mode="Markdown",
            reply_markup=welcome_keyboard,
        )
    finally:
        db.close()


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        HELP_TEXT,
        parse_mode="Markdown",
        reply_markup=help_keyboard(),
    )


async def cmd_plans(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "💼 *HuquqAI Abunəlik Planları*\n\n"
        "Plan haqqında ətraflı məlumat üçün seçin:",
        parse_mode="Markdown",
        reply_markup=plans_keyboard(),
    )


async def cmd_mystats(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    tg_user = update.effective_user
    db = SessionLocal()
    try:
        user = get_or_create_user(db, telegram_id=tg_user.id)
        limit = config.PLAN_LIMITS.get(user.plan_level, 5)
        limit_display = "♾ Limitsiz" if limit == -1 else str(limit)
        remaining = "♾ Limitsiz" if limit == -1 else str(max(0, limit - user.queries_used))

        plan_icons = {0: "🆓", 1: "📘", 2: "⭐", 3: "🏛"}
        icon = plan_icons.get(user.plan_level, "🆓")

        await update.message.reply_text(
            f"📊 *Hesabınız*\n"
            f"━━━━━━━━━━━━━━━\n"
            f"👤 Ad: {user.first_name or '—'}\n"
            f"{icon} Plan: *{user.plan_name}*\n"
            f"📨 Bu ay: {user.queries_used} / {limit_display} sorğu\n"
            f"✅ Qalan: {remaining} sorğu\n"
            f"🌐 Dil: {(user.language or 'az').upper()}\n"
            f"📅 Qeydiyyat: {user.created_at.strftime('%d.%m.%Y') if user.created_at else '—'}\n"
            f"━━━━━━━━━━━━━━━\n"
            f"_Plan yüksəltmək üçün: /upgrade_",
            parse_mode="Markdown",
            reply_markup=main_menu_keyboard(),
        )
    finally:
        db.close()


async def cmd_clear(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    clear_history(update.effective_user.id)
    await update.message.reply_text(
        "🗑 *Söhbət tarixi silindi.*\n\nYeni söhbət başlayır. Sualınızı yazın:",
        parse_mode="Markdown",
        reply_markup=main_menu_keyboard(),
    )


async def cmd_language(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("🇦🇿 Azərbaycan", callback_data="lang_az"),
            InlineKeyboardButton("🇷🇺 Русский", callback_data="lang_ru"),
            InlineKeyboardButton("🇬🇧 English", callback_data="lang_en"),
        ]
    ])
    await update.message.reply_text(
        "🌐 *Dil Seçimi*\n\nDil seçin / Выберите язык / Choose language:",
        parse_mode="Markdown",
        reply_markup=keyboard,
    )


async def cmd_upgrade(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "💳 *Plan Yüksəltmə*\n\n"
        "Ödəniş sistemi tezliklə aktiv olacaq.\n"
        "Ətraflı məlumat üçün: @huquqai_support",
        parse_mode="Markdown",
        reply_markup=plans_keyboard(),
    )


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()

    if query.data.startswith("lang_"):
        lang = query.data.replace("lang_", "")
        db = SessionLocal()
        try:
            user = get_or_create_user(db, telegram_id=query.from_user.id)
            user.language = lang
            db.commit()
            lang_names = {"az": "🇦🇿 Azərbaycan", "ru": "🇷🇺 Русский", "en": "🇬🇧 English"}
            await query.edit_message_text(
                f"✅ Dil seçildi: {lang_names.get(lang, lang)}\n\nSualınızı yazın:"
            )
        finally:
            db.close()
