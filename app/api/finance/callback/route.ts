
import { NextRequest, NextResponse } from 'next/server'
import { exchangeTrueLayerCode, encrypt, financeSupabase, TL_DATA_BASE } from '@/lib/finance'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${BASE_URL}/?error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${BASE_URL}/?error=missing_params`)
  }

  // Verify state cookie
  const storedState = req.cookies.get('finance_oauth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${BASE_URL}/?error=state_mismatch`)
  }

  try {
    const redirectUri = `${BASE_URL}/api/finance/callback`

    // Exchange code for tokens
    const tokens = await exchangeTrueLayerCode(code, redirectUri)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    const sb = financeSupabase()

    // Try to get bank name — but don't fail if it times out
    let bankName = 'Connected Bank'
    let institutionId = 'mock'
    try {
      const meRes = await Promise.race([
        fetch(`${TL_DATA_BASE}/data/v1/me`, {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000)
        ),
      ])
      if (meRes.ok) {
        const me = await meRes.json()
        const result = me.results?.[0]
        bankName = result?.provider?.display_name ?? 'Connected Bank'
        institutionId = result?.provider?.provider_id ?? 'mock'
      }
    } catch {
      // Non-fatal — use defaults
    }

    // Store connection
    const { data: connection, error: insertError } = await sb
      .from('finance_connections')
      .insert({
        institution_id: institutionId,
        bank_name: bankName,
        requisition_id: `tl-${Date.now()}`,
        access_token: encrypt(tokens.access_token),
        refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expires_at: expiresAt,
        status: 'active',
      })
      .select('id')
      .single()

    if (insertError || !connection) {
      throw new Error(insertError?.message ?? 'Failed to store connection')
    }

    // Try to fetch accounts quickly — skip if slow
    // Fetch both /accounts (current/savings) and /cards (credit cards like Barclaycard)
    try {
      const [accountsRes, cardsRes] = await Promise.race([
        Promise.all([
          fetch(`${TL_DATA_BASE}/data/v1/accounts`, {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          }),
          fetch(`${TL_DATA_BASE}/data/v1/cards`, {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          }),
        ]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 8000)
        ),
      ])

      // Upsert current/savings accounts
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

      // Upsert credit card accounts (Barclaycard etc)
      if (cardsRes.ok) {
        const cardsData = await cardsRes.json()
        const cards = cardsData.results ?? []
        for (const card of cards) {
          await sb.from('finance_accounts').upsert({
            connection_id: connection.id,
            gc_account_id: card.account_id,
            display_name: card.display_name ?? card.card_type ?? 'Credit Card',
            account_type: 'CREDIT_CARD',
            currency: card.currency ?? 'GBP',
            balance_pence: 0,
          }, { onConflict: 'gc_account_id' })
        }
      }
    } catch {
      // Non-fatal — sync button on dashboard will fetch accounts
    }

    // Redirect back to app — dashboard will trigger sync
    const response = NextResponse.redirect(`${BASE_URL}/?connected=true`)
    response.cookies.delete('finance_oauth_state')
    return response
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.redirect(`${BASE_URL}/?error=${encodeURIComponent(msg)}`)
  }
}
