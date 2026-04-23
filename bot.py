import logging
import os
from typing import Final

from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
    Update,
)
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

TOKEN: Final[str] = os.getenv("BOT_TOKEN", "")
SPONSOR_CHANNEL_USERNAME: Final[str] = os.getenv("SPONSOR_CHANNEL_USERNAME", "@sponsor_channel")
SPONSOR_CHANNEL_URL: Final[str] = os.getenv("SPONSOR_CHANNEL_URL", "https://t.me/sponsor_channel")
CONNECT_URL: Final[str] = os.getenv("CONNECT_URL", "https://example.com/connect")

COUNTRIES: Final[list[str]] = [
    "🇳🇱 Нидерланды",
    "🇩🇪 Германия",
    "🇫🇮 Финляндия",
    "🇹🇷 Турция",
    "🇺🇸 США",
    "🇯🇵 Япония",
]


def main_menu_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        [
            [KeyboardButton("Личный кабинет"), KeyboardButton("Пополнить")],
            [KeyboardButton("О нас"), KeyboardButton("Главное меню")],
        ],
        resize_keyboard=True,
    )


def countries_keyboard() -> InlineKeyboardMarkup:
    rows = [
        [
            InlineKeyboardButton(COUNTRIES[0], callback_data="country:0"),
            InlineKeyboardButton(COUNTRIES[1], callback_data="country:1"),
        ],
        [
            InlineKeyboardButton(COUNTRIES[2], callback_data="country:2"),
            InlineKeyboardButton(COUNTRIES[3], callback_data="country:3"),
        ],
        [
            InlineKeyboardButton(COUNTRIES[4], callback_data="country:4"),
            InlineKeyboardButton(COUNTRIES[5], callback_data="country:5"),
        ],
    ]
    return InlineKeyboardMarkup(rows)


def sponsor_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [InlineKeyboardButton("📢 Канал спонсора", url=SPONSOR_CHANNEL_URL)],
            [InlineKeyboardButton("✅ Проверить подписку", callback_data="check_subscription")],
        ]
    )


def connect_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [[InlineKeyboardButton("🔌 Подключиться", url=CONNECT_URL)]]
    )


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    context.user_data.clear()
    text = "Выберите страну для подключения:"

    if update.message:
        await update.message.reply_text(
            text,
            reply_markup=countries_keyboard(),
        )
        await update.message.reply_text("Меню:", reply_markup=main_menu_keyboard())


async def show_main_menu(update: Update, _: ContextTypes.DEFAULT_TYPE) -> None:
    if update.message:
        await update.message.reply_text(
            "Главное меню. Выберите страну для подключения:",
            reply_markup=countries_keyboard(),
        )


async def handle_country_choice(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    if not query or not query.data:
        return

    await query.answer()

    idx = int(query.data.split(":", maxsplit=1)[1])
    selected_country = COUNTRIES[idx]
    context.user_data["selected_country"] = selected_country

    await query.message.reply_text(
        f"Вы выбрали: {selected_country}\n"
        "Перед подключением подпишитесь на канал спонсора, затем нажмите «Проверить подписку».",
        reply_markup=sponsor_keyboard(),
    )


async def is_subscribed(user_id: int, context: ContextTypes.DEFAULT_TYPE) -> bool:
    try:
        member = await context.bot.get_chat_member(SPONSOR_CHANNEL_USERNAME, user_id)
        return member.status in {"member", "administrator", "creator"}
    except Exception as exc:  # noqa: BLE001
        logger.warning("Subscription check failed: %s", exc)
        return False


async def handle_subscription_check(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    if not query or not query.from_user:
        return

    await query.answer()

    subscribed = await is_subscribed(query.from_user.id, context)
    country = context.user_data.get("selected_country", "—")

    if not subscribed:
        await query.message.reply_text(
            "Похоже, вы еще не подписались на канал. Подпишитесь и нажмите кнопку проверки снова.",
            reply_markup=sponsor_keyboard(),
        )
        return

    await query.message.reply_text(
        f"✅ Подписка подтверждена.\n"
        f"Страна подключения: {country}\n\n"
        "Нажмите кнопку ниже, чтобы получить доступ к подключению:",
        reply_markup=connect_keyboard(),
    )


async def handle_menu_buttons(update: Update, _: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.message.text:
        return

    text = update.message.text

    if text == "Личный кабинет":
        await update.message.reply_text(
            "👤 Личный кабинет\n"
            "Здесь может быть ваш тариф, дата окончания и активная страна подключения."
        )
    elif text == "Пополнить":
        await update.message.reply_text(
            "💳 Пополнить\n"
            "Отправьте инструкцию по оплате или добавьте здесь платежную интеграцию."
        )
    elif text == "О нас":
        await update.message.reply_text(
            "ℹ️ О нас\n"
            "Мы предоставляем быстрый доступ к VPN через Telegram-бота."
        )
    elif text == "Главное меню":
        await update.message.reply_text(
            "Выберите страну для подключения:",
            reply_markup=countries_keyboard(),
        )
    else:
        await update.message.reply_text(
            "Используйте кнопки меню или команду /start.",
            reply_markup=main_menu_keyboard(),
        )


def validate_env() -> None:
    if not TOKEN:
        raise ValueError("Не задан BOT_TOKEN в переменных окружения.")


def run() -> None:
    validate_env()

    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(handle_country_choice, pattern=r"^country:\d+$"))
    app.add_handler(CallbackQueryHandler(handle_subscription_check, pattern=r"^check_subscription$"))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_menu_buttons))

    logger.info("Bot started")
    app.run_polling()


if __name__ == "__main__":
    run()
