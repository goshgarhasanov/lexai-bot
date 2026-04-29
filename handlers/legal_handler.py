from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from legal.terms import TERMS_OF_SERVICE, PRIVACY_POLICY, REFUND_POLICY, RULES

LEGAL_MENU = """
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 HuquqAI — Hüquqi Sənədlər
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Aşağıdakı sənədlərdən birini seçin:
"""


async def cmd_terms(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    keyboard = [
        [InlineKeyboardButton("🔒 Məxfilik Siyasəti", callback_data="legal_privacy")],
        [InlineKeyboardButton("💳 Geri Ödəmə Siyasəti", callback_data="legal_refund")],
        [InlineKeyboardButton("📋 İstifadə Qaydaları", callback_data="legal_rules")],
    ]
    await update.message.reply_text(
        LEGAL_MENU,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode="Markdown",
    )
    await _send_long(update.message.reply_text, TERMS_OF_SERVICE)


async def cmd_privacy(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _send_long(update.message.reply_text, PRIVACY_POLICY)


async def cmd_refund(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _send_long(update.message.reply_text, REFUND_POLICY)


async def cmd_rules(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _send_long(update.message.reply_text, RULES)


async def handle_legal_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()

    texts = {
        "legal_terms": TERMS_OF_SERVICE,
        "legal_privacy": PRIVACY_POLICY,
        "legal_refund": REFUND_POLICY,
        "legal_rules": RULES,
    }

    text = texts.get(query.data)
    if text:
        from telegram import InlineKeyboardMarkup, InlineKeyboardButton
        back_kb = InlineKeyboardMarkup([[InlineKeyboardButton("🔙 Geri", callback_data="menu_help")]])
        await _send_long(query.message.reply_text, text, reply_markup=back_kb)


async def _send_long(send_fn, text: str, reply_markup=None) -> None:
    chunk_size = 4000
    chunks = [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]
    for i, chunk in enumerate(chunks):
        kb = reply_markup if i == len(chunks) - 1 else None
        await send_fn(chunk, reply_markup=kb)
