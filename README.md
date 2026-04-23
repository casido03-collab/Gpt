# VPN Telegram Bot

Бот реализует сценарий:

1. При `/start` сразу показывает меню выбора страны (6 популярных стран).
2. После выбора страны просит подписаться на канал спонсора.
3. После проверки подписки отправляет сообщение с кнопкой-ссылкой на подключение.
4. Внизу всегда доступно меню:
   - `Личный кабинет`
   - `Пополнить`
   - `О нас`
   - `Главное меню`

## Настройка

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Переменные окружения

- `BOT_TOKEN` — токен вашего Telegram-бота (обязательно).
- `SPONSOR_CHANNEL_USERNAME` — username канала для проверки подписки, например `@my_channel`.
- `SPONSOR_CHANNEL_URL` — ссылка на канал спонсора, например `https://t.me/my_channel`.
- `CONNECT_URL` — ссылка в финальной кнопке подключения (можно менять в любой момент).

Пример запуска:

```bash
export BOT_TOKEN="123456:ABC..."
export SPONSOR_CHANNEL_USERNAME="@my_channel"
export SPONSOR_CHANNEL_URL="https://t.me/my_channel"
export CONNECT_URL="https://example.com/vpn-access"
python bot.py
```

## Важно для проверки подписки

Для корректной проверки подписки бот должен быть добавлен в канал (обычно как администратор с правом просмотра участников).
