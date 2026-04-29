from telegram import ReplyKeyboardMarkup, InlineKeyboardMarkup, InlineKeyboardButton


def main_menu_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        [
            ["⚖️ Hüquqi Sual", "📄 Sənəd Hazırla"],
            ["💼 Abunəlik Planları", "📊 Hesabım"],
            ["🌐 Dil Seçimi", "ℹ️ Kömək"],
        ],
        resize_keyboard=True,
        persistent=True,
    )


def legal_areas_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("👷 Əmək Hüququ", callback_data="area_labour"),
            InlineKeyboardButton("👨‍👩‍👧 Ailə Hüququ", callback_data="area_family"),
        ],
        [
            InlineKeyboardButton("🏠 Mülki Hüquq", callback_data="area_civil"),
            InlineKeyboardButton("🌍 Torpaq Hüququ", callback_data="area_land"),
        ],
        [
            InlineKeyboardButton("⚠️ Cinayət Hüququ", callback_data="area_criminal"),
            InlineKeyboardButton("💰 Maliyyə Hüququ", callback_data="area_finance"),
        ],
        [
            InlineKeyboardButton("🛒 İstehlakçı Hüququ", callback_data="area_consumer"),
            InlineKeyboardButton("🏢 Korporativ Hüquq", callback_data="area_corporate"),
        ],
        [InlineKeyboardButton("✏️ Öz sualımı yazım", callback_data="area_custom")],
    ])


def document_types_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("📝 İşdən Çıxarma Şikayəti", callback_data="doc_dismissal"),
        ],
        [
            InlineKeyboardButton("🏠 Kirayə Müqaviləsi", callback_data="doc_rent"),
        ],
        [
            InlineKeyboardButton("💔 Boşanma Ərizəsi", callback_data="doc_divorce"),
        ],
        [
            InlineKeyboardButton("📜 Miras İddianamə", callback_data="doc_inheritance"),
        ],
        [
            InlineKeyboardButton("🛒 İstehlakçı Şikayəti", callback_data="doc_consumer"),
        ],
        [
            InlineKeyboardButton("🌍 Torpaq Mübahisəsi", callback_data="doc_land"),
        ],
        [InlineKeyboardButton("🔙 Geri", callback_data="back_main")],
    ])


def plans_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("🆓 FREE — Cari Plan", callback_data="plan_info_free")],
        [InlineKeyboardButton("📘 BASIC — 9.99$/ay", callback_data="plan_info_basic")],
        [InlineKeyboardButton("⭐ PRO — 24.99$/ay", callback_data="plan_info_pro")],
        [InlineKeyboardButton("🏛 LAW FIRM — 99.99$/ay", callback_data="plan_info_firm")],
        [InlineKeyboardButton("💳 Plan Seç & Ödə", callback_data="plan_upgrade")],
    ])


def help_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("📋 İstifadə Şərtləri", callback_data="legal_terms"),
            InlineKeyboardButton("🔒 Məxfilik", callback_data="legal_privacy"),
        ],
        [
            InlineKeyboardButton("💳 Geri Ödəmə", callback_data="legal_refund"),
            InlineKeyboardButton("📏 Qaydalar", callback_data="legal_rules"),
        ],
        [InlineKeyboardButton("💬 Dəstək: @huquqai_support", url="https://t.me/huquqai_support")],
    ])


def back_to_menu_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("🔄 Yeni Sual", callback_data="area_custom"),
            InlineKeyboardButton("🏠 Ana Menyu", callback_data="back_main"),
        ]
    ])
