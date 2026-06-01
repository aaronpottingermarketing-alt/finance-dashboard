import { NextRequest, NextResponse } from 'next/server'
import { exchangeTrueLayerCode, encrypt, financeSupabase, TL_DATA_BASE } from '@/lib/finance'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${BASE_URL}/tool/finance-dashboard?error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${BASE_URL}/tool/finance-dashboard?error=missing_params`)
  }

  // Verify state cookie
  const storedState = req.cookies.get('finance_oauth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${BASE_URL}/tool/finance-dashboard?error=state_mismatch`)
  }

  try {
    const redirectUri = `${BASE_URL}/api/finance/callback`
    const tokens = await exchangeTrueLayerCode(code, redirectUri)

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Get connection info from TrueLayer /me endpoint
    const meRes = await fetch(`${TL_DATA_BASE}/data/v1/me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    let bankName = 'Connected Bank'
    let institutionId = 'unknown'
    if (meRes.ok) {
      const me = await meRes.json()
      const results = me.results?.[0]
      bankName = results?.provider?.display_name ?? 'Connected Bank'
      institutionId = results?.provider?.provider_id ?? 'unknown'
    }

    const sb = financeSupabase()

    // Store connection with encrypted tokens
    const { data: connection, error: insertError } = await sb
      .from('finance_connections')
      .insert({
        institution_id: institutionId,
        bank_name: bankName,
        requisition_id: `tl-${Date.now()}`, // unique ID for this connection
        access_token: encrypt(tokens.access_token),
        refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expires_at: expiresAt,
        status: 'active',
      })
      .select()
      .single()

    if (insertError || !connection) {
      throw new Error(insertError?.message ?? 'Failed to store connection')
    }

    // Fetch accounts from TrueLayer and store them
    const accountsRes = await fetch(`${TL_DATA_BASE}/data/v1/accounts`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (accountsRes.ok) {
      const accountsData = await accountsRes.json()
      const accounts = accountsData.results ?? []

      for (const account of accounts) {
        await sb.from('finance_accounts').upsert({
          connection_id: connection.id,
          gc_account_id: account.account_id,
          display_name: account.display_name ?? account.account_type ?? 'Account',
          account_type: account.account_type ?? null,
          currency: account.currency ?? 'GBP',
          balance_pence: 0,
        }, { onConflict: 'gc_account_id' })
      }
    }

    // Trigger background sync
    fetch(`${BASE_URL}/api/finance/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connection_id: connection.id }),
    }).catch(() => {})

    const response = NextResponse.redirect(`${BASE_URL}/tool/finance-dashboard?connected=true`)
    response.cookies.delete('finance_oauth_state')
    return response
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.redirect(`${BASE_URL}/tool/finance-dashboard?error=${encodeURIComponent(msg)}`)
  }
}
