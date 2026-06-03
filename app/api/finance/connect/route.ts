
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { buildTrueLayerAuthUrl } from '@/lib/finance'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST(req: NextRequest) {
  try {
    // Read optional institution_id so we can pre-select the provider and set the right scope
    let institutionId: string | undefined
    try {
      const body = await req.json()
      institutionId = typeof body?.institution_id === 'string' ? body.institution_id : undefined
    } catch {
      // Body is optional — proceed without it
    }

    const state = randomBytes(16).toString('hex')
    const redirectUri = `${BASE_URL}/api/finance/callback`
    const link = buildTrueLayerAuthUrl(state, redirectUri, institutionId)

    const res = NextResponse.json({ link })
    res.cookies.set('finance_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600,
      path: '/',
    })
    return res
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
