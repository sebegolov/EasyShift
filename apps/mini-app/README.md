## apps/mini-app — Telegram Mini App

Веб‑приложение (React + Vite), открывающееся внутри Telegram как WebApp.

Назначение:

- удобный ввод данных (выбор роли, профиля, дат/времени),
- работа с картой (адреса, зоны работников, ПВЗ),
- встроенный developer admin‑раздел (через `miniapp-tools.js` / `miniapp-tools.css`).

Структура:

- `src` — исходники React‑клиента.
- `dist` — собранный бандл, который отдаётся Nginx; сюда дополнительно подключаются `assets/miniapp-tools.*` и обновлённый `index.html`.

Основные UX‑решения и карта описаны в соответствующих файлах в `docs/context` и `docs/flows`.

