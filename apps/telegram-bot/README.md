## apps/telegram-bot — Telegram‑бот

Telegraf‑бот, который:

- ведёт пользователя по диалогам,
- открывает мини‑приложение (WebApp) для сложных форм,
- вызывает backend API (`/auth/telegram/start`, `/users/*`, `/admin/*` и др.).

Структура:

- `src` — исходники бота (команды, middlewares, интеграция с API).
- `dist` — собранная версия, которая крутится на прод‑сервере (`apps/telegram-bot/dist/index.js`).

Токены и URL бэкенда хранятся только в `.env` и не должны попадать в git. Актуальные переменные описаны в `docs/setup/server-deploy.md`.

