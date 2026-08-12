import { fetchPriceData } from '../../../lib/fetchers/price.js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const coin = (searchParams.get('coin') || 'BTC').toUpperCase()

    const priceData = await fetchPriceData(coin)
    return Response.json({
      success: true,
      coin,
      priceData
    })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
