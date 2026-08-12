// Prompt 38 — Environment Validation
export function validateEnv() {
  const required = ['ANTHROPIC_API_KEY']
  const optional = [
    { key: 'ETHERSCAN_API_KEY', feature: 'Smart Money Wallet Tracking' },
    { key: 'COINGLASS_API_KEY', feature: 'Enhanced Liquidation Data' },
    { key: 'TELEGRAM_BOT_TOKEN', feature: 'Telegram Notifications' },
    { key: 'TELEGRAM_CHAT_ID', feature: 'Telegram Notifications' },
  ]

  const errors = []
  const warnings = []

  for (const key of required) {
    if (!process.env[key] || process.env[key] === 'your_key_here') {
      errors.push(`Missing required env var: ${key}. Set it in .env.local`)
    }
  }

  for (const { key, feature } of optional) {
    if (!process.env[key] || process.env[key] === 'your_key_here') {
      warnings.push(`Optional: ${key} not set — ${feature} will use fallback mode`)
    }
  }

  if (errors.length > 0) {
    console.error('[env] ❌ Missing required environment variables:')
    errors.forEach(e => console.error(`  ${e}`))
    throw new Error(`Missing required env vars: ${errors.join(', ')}`)
  }

  if (warnings.length > 0) {
    warnings.forEach(w => console.warn(`[env] ⚠️  ${w}`))
  }

  console.log('[env] ✅ Environment validation passed')
  return { valid: true, warnings }
}

export function getEnvStatus() {
  return {
    anthropic: !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_key_here'),
    etherscan: !!(process.env.ETHERSCAN_API_KEY && process.env.ETHERSCAN_API_KEY !== 'your_key_here'),
    coinglass: !!(process.env.COINGLASS_API_KEY && process.env.COINGLASS_API_KEY !== 'your_key_here'),
    telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID &&
      process.env.TELEGRAM_BOT_TOKEN !== 'your_token_here'),
  }
}
