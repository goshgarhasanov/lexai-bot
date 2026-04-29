from telegram import Update
from telegram.ext import ContextTypes

from handlers.keyboards import (
    legal_areas_keyboard,
    document_types_keyboard,
    main_menu_keyboard,
    back_to_menu_keyboard,
    plans_keyboard,
    help_keyboard,
)
from database.models import SessionLocal, get_or_create_user

AREA_PROMPTS = {
    "area_labour": "Əmək hüququ sahəsində sualım var. Bu mövzuda ən çox hansı məsələlər olur?",
    "area_family": "Ailə hüququ sahəsindəki hüquqlarım haqqında məlumat almaq istəyirəm.",
    "area_civil": "Mülki hüquq sahəsindəki hüquqlarım haqqında məlumat almaq istəyirəm.",
    "area_land": "Torpaq hüququ ilə bağlı sualım var.",
    "area_criminal": "Cinayət hüququ sahəsindəki hüquqlarım barədə məlumat lazımdır.",
    "area_finance": "Maliyyə və vergi hüququ sahəsində sualım var.",
    "area_consumer": "İstehlakçı hüquqlarım haqqında məlumat almaq istəyirəm.",
    "area_corporate": "Korporativ hüquq sahəsindəki hüquqlarım barədə sual vermək istəyirəm.",
}

AREA_NAMES = {
    "area_labour": "👷 Əmək Hüququ",
    "area_family": "👨‍👩‍👧 Ailə Hüququ",
    "area_civil": "🏠 Mülki Hüquq",
    "area_land": "🌍 Torpaq Hüququ",
    "area_criminal": "⚠️ Cinayət Hüququ",
    "area_finance": "💰 Maliyyə Hüququ",
    "area_consumer": "🛒 İstehlakçı Hüququ",
    "area_corporate": "🏢 Korporativ Hüquq",
}

DOC_NAMES = {
    "doc_dismissal": "📝 İşdən Çıxarma Şikayəti",
    "doc_rent": "🏠 Kirayə Müqaviləsi",
    "doc_divorce": "💔 Boşanma Ərizəsi",
    "doc_inheritance": "📜 Miras İddianamə",
    "doc_consumer": "🛒 İstehlakçı Şikayəti",
    "doc_land": "🌍 Torpaq Mübahisəsi",
}

DOC_PROMPTS = {
    "doc_dismissal": "İşdən çıxarma şikayəti sənədi hazırla",
    "doc_rent": "Kirayə müqaviləsi hazırla",
    "doc_divorce": "Boşanma ərizəsi hazırla",
    "doc_inheritance": "Miras iddiası sənədi hazırla",
    "doc_consumer": "İstehlakçı şikayəti hazırla",
    "doc_land": "Torpaq mübahisəsi iddiası hazırla",
}


async def show_legal_areas(update: Update, context) -> None:
    text = (
        "⚖️ *Hüquqi Sual*\n\n"
        "Hansı hüquq sahəsindən kömək lazımdır?\n"
        "Sahəni seçin və ya sualınızı birbaşa yazın:"
    )
    if update.message:
        await update.message.reply_text(
            text,
            parse_mode="Markdown",
            reply_markup=legal_areas_keyboard(),
        )
    else:
        await update.callback_query.message.reply_text(
            text,
            parse_mode="Markdown",
            reply_markup=legal_areas_keyboard(),
        )


async def show_document_types(update: Update, context) -> None:
    db = SessionLocal()
    try:
        user = get_or_create_user(db, telegram_id=update.effective_user.id)
        if not user.can_use_documents():
            text = (
                "📄 *Sənəd Hazırlama*\n\n"
                "⭐ Bu funksiya *PRO* və ya *LAW FIRM* planında mövcuddur.\n\n"
                "PRO plana keçmək üçün: /upgrade\n"
                "_Qiymət: 24.99$/ay — limitsiz sorğu + sənəd hazırlama_"
            )
        else:
            text = (
                "📄 *Sənəd Hazırlama*\n\n"
                "Hansı sənədi hazırlamaq istəyirsiniz?"
            )
        send = update.message.reply_text if update.message else update.callback_query.message.reply_text
        await send(
            text,
            parse_mode="Markdown",
            reply_markup=document_types_keyboard() if user.can_use_documents() else None,
        )
    finally:
        db.close()


async def handle_menu_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    data = query.data

    if data == "back_main":
        await query.message.reply_text(
            "🏠 *Ana Menyu*\n\nAşağıdakı menyudan seçim edin:",
            parse_mode="Markdown",
            reply_markup=main_menu_keyboard(),
        )
        return

    if data == "area_custom":
        await query.message.reply_text(
            "✏️ Sualınızı yazın, cavab verim:",
            reply_markup=main_menu_keyboard(),
        )
        return

    if data in AREA_NAMES:
        await query.message.reply_text(
            f"{AREA_NAMES[data]} seçildi.\n\n"
            f"Sualınızı ətraflı yazın:",
            reply_markup=main_menu_keyboard(),
        )
        return

    if data in DOC_PROMPTS:
        db = SessionLocal()
        try:
            user = get_or_create_user(db, telegram_id=query.from_user.id)
            if not user.can_use_documents():
                await query.message.reply_text(
                    "⭐ Bu funksiya PRO planında mövcuddur. /upgrade",
                )
                return
        finally:
            db.close()

        await query.message.reply_text(
            f"{DOC_NAMES[data]} hazırlamaq üçün:\n\n"
            f"Zəhmət olmasa lazımi məlumatları yazın\n"
            f"_(ad, tarix, tərəflər, vəziyyətin təsviri)_",
            parse_mode="Markdown",
            reply_markup=main_menu_keyboard(),
        )
        context.user_data["doc_mode"] = data
        return

    if data == "plan_upgrade":
        await query.message.reply_text(
            "💳 *Plan Yüksəltmə*\n\n"
            "Ödəniş sistemi tezliklə aktiv olacaq.\n"
            "Ətraflı: @huquqai_support",
            parse_mode="Markdown",
        )
        return

    if data.startswith("plan_info_"):
        plan = data.replace("plan_info_", "").upper()
        plan_info = {
            "FREE": "🆓 *FREE Plan*\n├ Ayda 5 sorğu\n├ Ümumi hüquqi məlumat\n└ Qısaldılmış cavablar\n\n_Qiymət: Pulsuz_",
            "BASIC": "📘 *BASIC Plan*\n├ Ayda 100 sorğu\n├ Tam hüquqi analiz\n├ Maddə istinadları\n└ Məhkəmə praktikası\n\n_Qiymət: 9.99$/ay_",
            "PRO": "⭐ *PRO Plan*\n├ Limitsiz sorğu\n├ Sənəd hazırlama\n├ Məhkəmə strategiyası\n├ Hüquqi xərc analizi\n└ Prioritet cavab\n\n_Qiymət: 24.99$/ay_",
            "FIRM": "🏛 *LAW FIRM Plan*\n├ Bütün PRO funksiyaları\n├ API çıxışı\n├ Toplu sənəd emalı\n└ Xüsusi konfiqurasiya\n\n_Qiymət: 99.99$/ay_",
        }
        await query.message.reply_text(
            plan_info.get(plan, "Plan tapılmadı"),
            parse_mode="Markdown",
            reply_markup=plans_keyboard(),
        )
        return

    # Legal callbacks
    from handlers.legal_handler import handle_legal_callback
    if data.startswith("legal_"):
        await handle_legal_callback(update, context)
        return
