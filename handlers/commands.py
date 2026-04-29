from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from database.models import SessionLocal, get_or_create_user
from services.memory_service import clear_history
from config import config

PLANS_TEXT = """
💼 *HuquqAI Abunəlik Planları*

🆓 *FREE* — Pulsuz
├── Ayda 5 sorğu
├── Ümumi hüquqi məlumat
└── Qısaldılmış cavablar

📘 *BASIC* — 9.99$/ay
├── Ayda 100 sorğu
├── Tam hüquqi analiz
├── Maddə istinadları
└── Məhkəmə praktikası

⭐ *PRO* — 24.99$/ay
├── Limitsiz sorğu
├── Sənəd hazırlama (ərizə, müqavilə)
├── Məhkəmə strategiyası
├── Hüquqi xərc analizi
└── Prioritet cavab

🏛 *LAW FIRM* — 99.99$/ay
├── Bütün PRO funksiyaları
├── API çıxışı
├── Toplu sənəd emalı
└── Xüsusi sistem konfiqurasiyası

Plan seçmək üçün: /upgrade
"""

HELP_TEXT = """
⚖️ *HuquqAI — Azərbaycan Hüquq Botu*

Mən sizə Azərbaycan qanunvericiliyi haqqında məlumat verirəm.

*Nə edə bilərəm:*
• İstənilən hüquqi sualınıza cavab verirəm
• Qanun maddələrinə istinad edirəm
• PRO: Hüquqi sənədlər hazırlayıram

*Əmrlər:*
/start — Botla tanışlıq
/help — Bu yardım mətni
/plans — Abunəlik planları
/upgrade — Plan yüksəlt
/mystats — Statistikalarım
/clear — Söhbəti sıfırla
/language — Dil seçimi (az/ru/en)

*Hüquqi sənədlər:*
/terms — İstifadə Şərtləri
/privacy — Məxfilik Siyasəti
/refund — Geri Ödəmə Qaydaları
/rules — İstifadə Qaydaları

*Nümunə suallar:*
• "İşdən qanunsuz çıxarıldım, nə edə bilərəm?"
• "Kirayə müqaviləsi nədir?"
• "Boşanma prosesi necədir?"
• "Miras payım nə qədər olar?"

ℹ️ Bu bot hüquqi məsləhət vermir. Ciddi məsələlər üçün vəkilə müraciət edin.
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
        await update.message.reply_text(
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"⚖️ *HuquqAI — Hüquqi Süni İntellekt*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"Hörmətli *{name}*, xoş gəlmisiniz.\n\n"
            f"Mən Azərbaycan Respublikasının qanunvericiliyinə əsaslanaraq "
            f"hüquqi məsələlərdə sizə peşəkar dəstək göstərən AI köməkçiyəm.\n\n"
            f"📌 *Nə edə bilərəm?*\n"
            f"├ Hüquqi suallarınıza maddə istinadı ilə cavab verirəm\n"
            f"├ Mülki, əmək, ailə, cinayət, torpaq hüququ üzrə analiz aparıram\n"
            f"├ PRO: Ərizə, müqavilə, şikayət sənədləri hazırlayıram\n"
            f"└ Azərbaycan, Rus və İngilis dillərini dəstəkləyirəm\n\n"
            f"💬 *Sadəcə sualınızı yazın — cavab verəcəyəm.*\n\n"
            f"📋 Əmrlər: /help | 💼 Planlar: /plans | 📊 Hesabım: /mystats\n\n"
            f"_ℹ️ Bu bot hüquqi məsləhət xidməti deyil. Ciddi hallarda lisenziyalı vəkilə müraciət edin._",
            parse_mode="Markdown",
        )
    finally:
        db.close()


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(HELP_TEXT, parse_mode="Markdown")


async def cmd_plans(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    keyboard = [[InlineKeyboardButton("Plan seç → /upgrade", callback_data="upgrade")]]
    await update.message.reply_text(
        PLANS_TEXT,
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def cmd_mystats(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    tg_user = update.effective_user
    db = SessionLocal()
    try:
        user = get_or_create_user(db, telegram_id=tg_user.id)
        limit = config.PLAN_LIMITS.get(user.plan_level, 5)
        limit_display = "limitsiz" if limit == -1 else str(limit)
        remaining = "limitsiz" if limit == -1 else str(max(0, limit - user.queries_used))

        await update.message.reply_text(
            f"📊 *Hesabınız*\n\n"
            f"• Plan: *{user.plan_name}*\n"
            f"• Bu ay: {user.queries_used}/{limit_display} sorğu\n"
            f"• Qalan: {remaining} sorğu\n"
            f"• Dil: {user.language or 'az'}\n"
            f"• Qeydiyyat: {user.created_at.strftime('%d.%m.%Y') if user.created_at else '—'}",
            parse_mode="Markdown",
        )
    finally:
        db.close()


async def cmd_clear(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    clear_history(update.effective_user.id)
    await update.message.reply_text("✅ Söhbət tarixi silindi. Yeni söhbət başlayır.")


async def cmd_language(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    keyboard = [
        [
            InlineKeyboardButton("🇦🇿 Azərbaycan", callback_data="lang_az"),
            InlineKeyboardButton("🇷🇺 Русский", callback_data="lang_ru"),
            InlineKeyboardButton("🇬🇧 English", callback_data="lang_en"),
        ]
    ]
    await update.message.reply_text(
        "Dil seçin / Выберите язык / Choose language:",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def cmd_upgrade(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "💳 *Plan yüksəltmə*\n\n"
        "Hazırda ödəniş sistemi qurulur.\n"
        "Ətraflı məlumat üçün admin ilə əlaqə saxlayın:\n"
        "@huquqai_support",
        parse_mode="Markdown",
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
            lang_names = {"az": "Azərbaycan", "ru": "Русский", "en": "English"}
            await query.edit_message_text(f"✅ Dil seçildi: {lang_names.get(lang, lang)}")
        finally:
            db.close()
