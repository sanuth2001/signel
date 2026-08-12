import { NextResponse } from 'next/server'
import { getSupremeHistory, getSupremeAccuracy } from '../../../../lib/database/db.js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const history = getSupremeHistory(limit)
    const accuracy = getSupremeAccuracy()

    return NextResponse.json({
      success: true,
      history,
      accuracy
    })
  } catch (err) {
    console.error('[api/smc/history] Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
