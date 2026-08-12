// Prompt 34 — Telegram Test Endpoint
import { sendTestNotification } from '../../../../lib/notifications/telegram.js'

export async function GET() {
  try {
    const sent = await sendTestNotification()
    if (sent) {
      return Response.json({ success: true, message: 'Test notification sent to Telegram ✅' })
    } else {
      return Response.json({
        success: false,
        message: 'Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.local',
      }, { status: 400 })
    }
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
