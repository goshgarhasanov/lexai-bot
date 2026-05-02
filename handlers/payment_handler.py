import logging
from datetime import datetime, timezone
from telegram import Update, LabeledPrice, InlineKeyboardMarkup, InlineKeyboardButton
from telegram.ext import ContextTypes

from database.models import SessionLocal, get_or_create_user
from handlers.keyboards import main_menu_keyboard
from config import config

logger = logging.getLogger(__name__)

PLAN_STARS = {
    "BASIC": 750,
    "PRO":   1870,
    "FIRM":  7490,
}

PLAN_LEVELS = {"BASIC": 1, "PRO": 2, "FIRM": 3}

PLAN_PRICES_STR = {"BASIC": "9.99$", "PRO": "24.99$", "FIRM": "99.99$"}

PLAN_DESCRIPTIONS = {
    "BASIC": "📘 BASIC Plan — Ayda 100 sorğu, tam hüquqi analiz, maddə istinadları",
    "PRO":   "⭐ PRO Plan — Limitsiz sorğu, sənəd hazırlama, məhkəmə strategiyası",
    "FIRM":  "🏛 LAW FIRM Plan — PRO + API çıxışı, toplu sənəd emalı",
}

PLAN_ICONS = {"BASIC": "📘", "PRO": "⭐", "FIRM": "🏛"}


def payment_method_keyboard(plan: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("⭐ Telegram Stars ilə ödə", callback_data=f"pay_stars_{plan}")],
        [InlineKeyboardButton("💳 Kart-karta ödə", callback_data=f"pay_card_{plan}")],
        [InlineKeyboardButton("🔙 Geri", callback_data="menu_plans")],
    ])


def confirm_stars_keyboard(plan: str) -> InlineKeyboardMarkup:
    stars = PLAN_STARS[plan]
    return InlineKeyboardMarkup([
        [InlineKeyboardButton(f"⭐ {stars} Stars ilə ödə", callback_data=f"stars_invoice_{plan}")],
        [InlineKeyboardButton("🔙 Geri", callback_data=f"pay_method_{plan}")],
    ])


async def handle_payment_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    data = query.data

    if data.startswith("pay_method_"):
        plan = data.replace("pay_method_", "")
        await query.message.reply_text(
            f"💳 *{PLAN_ICONS.get(plan, '')} {plan} Plan — Ödəniş Üsulu*\n\n"
            f"Ödəniş üsulunu seçin:\n\n"
            f"⭐ *Telegram Stars* — Ani avtomatik aktivləşmə\n"
            f"💳 *Kart-karta* — Admin təsdiqi ilə (1-24 saat)",
            parse_mode="Markdown",
            reply_markup=payment_method_keyboard(plan),
        )
        return

    if data.startswith("pay_stars_"):
        plan = data.replace("pay_stars_", "")
        stars = PLAN_STARS.get(plan)
        if not stars:
            return
        await query.message.reply_text(
            f"⭐ *Telegram Stars ilə Ödəniş*\n\n"
            f"Plan: *{plan}*\n"
            f"Məbləğ: *{stars} ⭐ Stars*\n"
            f"Qiymət: *{PLAN_PRICES_STR.get(plan)}*\n\n"
            f"Ödənişi tamamlamaq üçün aşağıdakı düyməyə basın:",
            parse_mode="Markdown",
            reply_markup=confirm_stars_keyboard(plan),
        )
        return

    if data.startswith("stars_invoice_"):
        plan = data.replace("stars_invoice_", "")
        stars = PLAN_STARS.get(plan)
        if not stars:
            return
        try:
            await context.bot.send_invoice(
                chat_id=query.from_user.id,
                title=f"HuquqAI {plan} Plan",
                description=PLAN_DESCRIPTIONS.get(plan, ""),
                payload=f"plan_{plan}_{query.from_user.id}",
                currency="XTR",
                prices=[LabeledPrice(label=f"{plan} Plan (1 ay)", amount=stars)],
                provider_token="",
            )
        except Exception as e:
            logger.error(f"Invoice error: {e}")
            await query.message.reply_text(
                "⚠️ Stars invoice göndərilə bilmədi. Kart-karta ödənişi seçin.",
                reply_markup=payment_method_keyboard(plan),
            )
        return

    if data.startswith("pay_card_"):
        plan = data.replace("pay_card_", "")
        uid = query.from_user.id
        username = f"@{query.from_user.username}" if query.from_user.username else f"ID:{uid}"
        price = PLAN_PRICES_STR.get(plan, "")

        await query.message.reply_text(
            f"💳 *Kart-karta Ödəniş*\n"
            f"━━━━━━━━━━━━━━━\n\n"
            f"📋 *Plan:* {PLAN_ICONS.get(plan, '')} {plan}\n"
            f"💰 *Məbləğ:* {price}/ay\n\n"
            f"🏦 *Bank kartı:*\n"
            f"`{config.ADMIN_CARD}`\n"
            f"👤 *Ad:* {config.ADMIN_CARD_NAME}\n\n"
            f"━━━━━━━━━━━━━━━\n"
            f"📌 *Ödəniş addımları:*\n"
            f"1️⃣ Yuxarıdakı karta *{price}* köçürün\n"
            f"2️⃣ Ödəniş skrinşotunu {config.ADMIN_USERNAME} adresinə göndərin\n"
            f"3️⃣ Mesajda aşağıdakı məlumatı yazın:\n\n"
            f"```\nPlan: {plan}\nTelegram ID: {uid}\nİstifadəçi: {username}\n```\n\n"
            f"⏱ *Aktivləşmə:* Ödəniş təsdiqindən sonra 1-24 saat ərzində\n"
            f"📞 *Suallar üçün:* {config.ADMIN_USERNAME}",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("📩 Adminə yaz", url=f"https://t.me/{config.ADMIN_USERNAME.lstrip('@')}")],
                [InlineKeyboardButton("🔙 Geri", callback_data=f"pay_method_{plan}")],
            ]),
        )
        return


async def handle_pre_checkout(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.pre_checkout_query.answer(ok=True)


async def handle_successful_payment(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    payment = update.message.successful_payment
    payload = payment.invoice_payload
    parts = payload.split("_")

    if len(parts) < 3 or parts[0] != "plan":
        return

    plan_name = parts[1]
    plan_level = PLAN_LEVELS.get(plan_name)
    if not plan_level:
        return

    user_tg_id = update.effective_user.id
    db = SessionLocal()
    try:
        # Idempotency: prevent duplicate Stars payment processing
        from sqlalchemy import text as _text
        charge_id = getattr(payment, "telegram_payment_charge_id", None) or payload
        existing = db.execute(
            _text("SELECT id FROM payments WHERE idempotency_key = :key"),
            {"key": charge_id},
        ).fetchone()
        if existing:
            logger.warning(f"Duplicate Stars payment ignored: charge_id={charge_id}")
            return

        user = get_or_create_user(db, telegram_id=user_tg_id)
        from datetime import timedelta
        user.plan_name = plan_name
        user.plan_level = plan_level
        user.queries_used = 0
        user.queries_reset_at = datetime.now(timezone.utc)
        user.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=30)

        # Record the payment with idempotency key
        db.execute(
            _text(
                "INSERT INTO payments (telegram_id, plan_name, amount, method, status, "
                "confirmed_by, idempotency_key) VALUES (:tid, :plan, 0, 'stars', 'confirmed', "
                "'telegram', :key)"
            ),
            {"tid": user_tg_id, "plan": plan_name, "key": charge_id},
        )
        db.commit()

        await update.message.reply_text(
            f"🎉 *Ödəniş uğurla tamamlandı!*\n\n"
            f"{PLAN_ICONS.get(plan_name, '✅')} *{plan_name} Plan* aktivləşdirildi!\n\n"
            f"━━━━━━━━━━━━━━━\n"
            f"⭐ Ödənilən Stars: {payment.total_amount}\n"
            f"📅 Tarix: {datetime.now(timezone.utc).strftime('%d.%m.%Y %H:%M')} UTC\n"
            f"━━━━━━━━━━━━━━━\n\n"
            f"İndi bütün {plan_name} funksiyalarından istifadə edə bilərsiniz! ⚖️",
            parse_mode="Markdown",
            reply_markup=main_menu_keyboard(),
        )

        logger.info(f"Stars payment: user={user_tg_id} plan={plan_name} stars={payment.total_amount}")

        if config.ADMIN_TELEGRAM_ID:
            try:
                await context.bot.send_message(
                    chat_id=config.ADMIN_TELEGRAM_ID,
                    text=f"💰 Yeni Stars ödənişi!\n"
                         f"İstifadəçi: {user_tg_id} (@{update.effective_user.username})\n"
                         f"Plan: {plan_name}\n"
                         f"Stars: {payment.total_amount}",
                )
            except Exception:
                pass

    except Exception as e:
        logger.error(f"Plan upgrade error after payment: {e}", exc_info=True)
    finally:
        db.close()


async def admin_upgrade_user(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Admin əmri: /upgrade_user <telegram_id> <BASIC|PRO|FIRM>"""
    if config.ADMIN_TELEGRAM_ID and update.effective_user.id != config.ADMIN_TELEGRAM_ID:
        return

    args = context.args
    if not args or len(args) < 2:
        await update.message.reply_text(
            "📋 İstifadə:\n`/upgrade_user <telegram_id> <BASIC|PRO|FIRM>`",
            parse_mode="Markdown",
        )
        return

    try:
        target_id = int(args[0])
        plan_name = args[1].upper()
        plan_level = PLAN_LEVELS.get(plan_name)

        if not plan_level:
            await update.message.reply_text("❌ Plan tapılmadı. BASIC, PRO və ya FIRM yazın.")
            return

        db = SessionLocal()
        try:
            user = get_or_create_user(db, telegram_id=target_id)
            from datetime import timedelta
            user.plan_name = plan_name
            user.plan_level = plan_level
            user.queries_used = 0
            user.queries_reset_at = datetime.now(timezone.utc)
            if plan_level > 0:
                user.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
            db.commit()

            await update.message.reply_text(
                f"✅ İstifadəçi `{target_id}` → *{plan_name}* planına yüksəldildi.",
                parse_mode="Markdown",
            )

            try:
                await context.bot.send_message(
                    chat_id=target_id,
                    text=f"🎉 *{PLAN_ICONS.get(plan_name, '')} {plan_name} Plan aktivləşdirildi!*\n\n"
                         f"Ödənişiniz təsdiqləndi. İndi bütün funksiyalardan istifadə edə bilərsiniz!\n"
                         f"Sorğularınız sıfırlandı. Uğurlar! ⚖️",
                    parse_mode="Markdown",
                    reply_markup=main_menu_keyboard(),
                )
            except Exception:
                pass
        finally:
            db.close()

    except ValueError:
        await update.message.reply_text("❌ Telegram ID rəqəm olmalıdır.")
    except Exception as e:
        logger.error(f"Admin upgrade error: {e}")
        await update.message.reply_text(f"⚠️ Xəta: {e}")
