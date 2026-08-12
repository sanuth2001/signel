import { NextResponse } from 'next/server'
import { getFVGHistory, getFVGAccuracy } from '../../../../lib/database/db.js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const history = getFVGHistory(limit)
    const accuracy = getFVGAccuracy()

    return NextResponse.json({
      success: true,
      history,
      accuracy
    })
  } catch (err) {
    console.error('[api/fvg/history] Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
