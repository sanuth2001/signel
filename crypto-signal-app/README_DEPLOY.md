# Production Deployment Guide — CryptoSignal AI

This guide details how to deploy the Next.js Crypto Signal App in production for 24/7 autonomous operation.

---

## Recommended: Railway Deployment (Easiest + Persistent Disk)

Railway is highly recommended because it supports **persistent volumes**, which is required to keep the SQLite database (`signals.db`) from resetting on every deployment or restart.

### Steps:
1. Create a new project on [Railway](https://railway.app/).
2. Connect your GitHub repository.
3. Add a service from your repository.
4. **Configure Persistent Volume:**
   - Go to the service settings -> **Volumes**.
   - Create a volume (e.g., Mount Path: `/app/data`).
   - In your `.env.local` or Railway environment variables, configure the DB path variable to use this mount (see Environment Variables section below).
5. **Set Environment Variables:**
   - Set `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and others in the **Variables** tab.
6. Railway will automatically detect the `Dockerfile` and build/deploy your application.

---

## VPS Deployment (Self-Hosted via Docker/PM2)

Deploying on a VPS (Ubuntu/Debian) is perfect for maximum control and zero hosting costs.

### Option A: Running via Docker
1. Clone your repo on the VPS.
2. Build the Docker image:
   ```bash
   docker build -t crypto-signal-app .
   ```
3. Run the container with a persistent volume mapping:
   ```bash
   docker run -d \
     -p 3000:3000 \
     -v /var/lib/crypto-signals:/app/data \
     -e ANTHROPIC_API_KEY="your_api_key" \
     -e TELEGRAM_BOT_TOKEN="your_bot_token" \
     -e TELEGRAM_CHAT_ID="your_chat_id" \
     --name crypto-signals \
     --restart unless-stopped \
     crypto-signal-app
   ```

### Option B: Running via PM2
1. Install Node.js, npm, and PM2:
   ```bash
   sudo npm install -g pm2
   ```
2. Install dependencies and build the app:
   ```bash
   npm ci
   npm run build
   ```
3. Start the application:
   ```bash
   pm2 start npm --name "crypto-signal-app" -- start
   pm2 save
   pm2 startup
   ```

---

## DigitalOcean App Platform

1. Create a new App on DigitalOcean.
2. Link your GitHub repository.
3. Set the environment variables.
4. Set up a **Volume Attachment** for persistent storage mapping to `/app/data` (standard on DO App Platform database configurations or VPS nodes).

---

## Vercel Deployment (Serverless Restrictions)

> [!WARNING]
> Vercel is serverless and **does not support persistent local storage**. The local SQLite database (`signals.db`) will reset on every serverless function invocation.
> 
> To deploy on Vercel, you must switch the SQLite database to a hosted Postgres or MySQL instance (such as Supabase, Neon, or Railway Postgres), which requires replacing `better-sqlite3` queries with Prisma, Kysely, or Postgres clients in `lib/database/db.js`.

---

## Required Environment Variables

Configure these variables in your deployment dashboard:

| Variable Name | Type | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Required** | Anthropic Claude API Key |
| `NEXT_PUBLIC_APP_URL` | Optional | Absolute URL of your app (e.g., `https://your-app.railway.app`). Used for auto-refresh background calls. Defaults to `http://localhost:3000`. |
| `CRON_AUTH_KEY` | Optional | Secures the `/api/cron` route webhook from unauthorized hits. |
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram Bot API token for sending alerts. |
| `TELEGRAM_CHAT_ID` | Optional | Chat ID or channel ID where Telegram notifications should be sent. |
| `ETHERSCAN_API_KEY` | Optional | API Key for Etherscan to track smart money. |
| `COINGLASS_API_KEY` | Optional | API Key for Coinglass liquidation details. |

---

## Production Health Monitoring

Once deployed, you can monitor the health of the application by querying the health endpoint:
```bash
curl https://your-deployed-app.com/api/health
```
This returns:
- App uptime
- Database size
- Number of API calls processed today
- Connectivity status of Anthropic, Telegram, and Etherscan APIs.
