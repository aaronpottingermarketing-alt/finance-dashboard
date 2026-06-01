export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { buildTrueLayerAuthUrl } from '@/lib/finance'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'

export async function POST(_req: NextRequest) {
  try {
    const state = randomBytes(16).toString('hex')
    const redirectUri = `${BASE_URL}/api/finance/callback`
    const link = buildTrueLayerAuthUrl(state, redirectUri)

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
