
import { NextResponse } from 'next/server'

const LIVE_BASE = 'https://live.trading212.com/api/v0'
const DEMO_BASE = 'https://demo.trading212.com/api/v0'

async function t212Fetch(base: string, path: string, key: string) {
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: key },
    next: { revalidate: 60 },
  })
  return { res, ok: res.ok, status: res.status }
}

export async function GET() {
  const key = process.env.T212_API_KEY
  if (!key) return NextResponse.json({ error: 'T212_API_KEY not set' }, { status: 500 })

  // Try live first, fall back to demo
  let base = LIVE_BASE
  let testRes = await t212Fetch(base, '/equity/account/cash', key)

  if (!testRes.ok) {
    base = DEMO_BASE
    testRes = await t212Fetch(base, '/equity/account/cash', key)
  }

  if (!testRes.ok) {
    const text = await testRes.res.text()
    return NextResponse.json(
      { error: `T212 API error ${testRes.status} — check your API key is valid and Trading 212 API is enabled in account settings` },
      { status: 500 }
    )
  }

  try {
    const [cashData, portfolioData] = await Promise.all([
      testRes.res.json(),
      t212Fetch(base, '/equity/portfolio', key).then(r => r.res.json()),
    ])

    const positions = Array.isArray(portfolioData) ? portfolioData : (portfolioData.positions ?? [])

    return NextResponse.json({
      positions,
      cash: {
        free: cashData.free ?? 0,
        invested: cashData.invested ?? 0,
        ppl: cashData.ppl ?? 0,
        total: cashData.total ?? 0,
        result: cashData.result ?? 0,
      },
      account: base.includes('demo') ? 'demo' : 'live',
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
