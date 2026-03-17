## EasyShift Server Deploy

Production staging is deployed on the Russian VDS with a public HTTPS entrypoint:

- `https://5.42.117.107.sslip.io` -> Telegram Mini App static build
- `https://5.42.117.107.sslip.io/api/` -> NestJS API through Nginx reverse proxy

### Server layout

- App root: `/srv/easyshift/current`
- Shared runtime data: `/srv/easyshift/shared`
- Logs: `/srv/easyshift/logs`
- API process manager: `PM2` under user `easyshift`
- Web server: `Nginx`
- Database: `PostgreSQL`

### Current runtime

- `API` runs from `apps/api/dist/main.js`
- `Mini App` is served from `apps/mini-app/dist`
- Database schema is applied from `apps/api/prisma/schema.prisma`

### Useful commands

Check API process:

```bash
sudo -u easyshift -H pm2 list
sudo -u easyshift -H pm2 logs easyshift-api
```

Reload API after a new deploy:

```bash
sudo -u easyshift -H bash -lc 'cd /srv/easyshift/current && set -a && . ./.env && set +a && pm2 restart easyshift-api --update-env'
```

Check Nginx:

```bash
nginx -t
systemctl reload nginx
```

### Environment

Production environment variables are stored in:

- `/srv/easyshift/current/.env`

Do not commit production secrets to the repository.

Key variables as of 2026-03:

- `DATABASE_URL` – PostgreSQL connection string for the primary DB
- `API_BASE_URL` – internal base URL for the API, used by the bot (`http://127.0.0.1:3000` on the server)
- `MINI_APP_URL` – public HTTPS URL of the Mini App (`https://5.42.117.107.sslip.io`)
- `TELEGRAM_BOT_TOKEN` – production bot token from BotFather
- `DEVELOPER_TELEGRAM_IDS` – comma-separated Telegram numeric IDs that have access to the developer admin panel

### Telegram bot final step

The public HTTPS entrypoint is ready, but the Telegram bot still needs a real `TELEGRAM_BOT_TOKEN` in `/srv/easyshift/current/.env`.

After adding the token, start the bot as user `easyshift`:

```bash
sudo -u easyshift -H bash -lc 'cd /srv/easyshift/current && set -a && . ./.env && set +a && pm2 start apps/telegram-bot/dist/index.js --name easyshift-bot --update-env'
sudo -u easyshift -H pm2 save
```

If the bot already exists in PM2, replace `start` with `restart`.

To update developer access to the admin panel on the server:

```bash
sudo -u easyshift -H nano /srv/easyshift/current/.env
# edit DEVELOPER_TELEGRAM_IDS, e.g.:
# DEVELOPER_TELEGRAM_IDS=235792404,123456789

sudo -u easyshift -H bash -lc 'cd /srv/easyshift/current && set -a && . ./.env && set +a && pm2 restart easyshift-api --update-env'
```

This reloads the API with the new whitelist without touching the Mini App build.
