import { NextResponse } from 'next/server'
import { financeSupabase } from '@/lib/finance'

export async function GET() {
  const sb = financeSupabase()

  const { data: connections, error: connError } = await sb
    .from('finance_connections')
    .select('id, bank_name, status, expires_at')
    .order('bank_name')

  if (connError) return NextResponse.json({ error: connError.message }, { status: 500 })

  const { data: accounts, error: acctError } = await sb
    .from('finance_accounts')
    .select('id, connection_id, display_name, account_type, balance_pence, synced_at')

  if (acctError) return NextResponse.json({ error: acctError.message }, { status: 500 })

  // Get transaction counts and latest dates per account in one query
  const { data: txnStats, error: txnError } = await sb
    .from('finance_transactions')
    .select('account_id, booking_date')
    .order('booking_date', { ascending: false })

  if (txnError) return NextResponse.json({ error: txnError.message }, { status: 500 })

  // Build per-account stats map
  const statsByAccount: Record<string, { count: number; latest: string | null }> = {}
  for (const row of txnStats ?? []) {
    if (!statsByAccount[row.account_id]) {
      statsByAccount[row.account_id] = { count: 0, latest: null }
    }
    const entry = statsByAccount[row.account_id]
    entry.count++
    if (!entry.latest || row.booking_date > entry.latest) {
      entry.latest = row.booking_date
    }
  }

  const result = (connections ?? []).map(conn => {
    const connAccounts = (accounts ?? [])
      .filter(a => a.connection_id === conn.id)
      .map(a => {
        const stats = statsByAccount[a.id] ?? { count: 0, latest: null }
        return {
          display_name: a.display_name,
          account_type: a.account_type,
          balance_pence: a.balance_pence,
          balance_gbp: a.balance_pence != null ? `£${(a.balance_pence / 100).toFixed(2)}` : null,
          transaction_count: stats.count,
          latest_transaction_date: stats.latest,
          last_synced_at: a.synced_at,
          warning: stats.count === 0 && a.account_type !== 'SAVINGS'
            ? 'NO TRANSACTIONS — may need investigation'
            : null,
        }
      })

    const tokenExpiresAt = conn.expires_at ? new Date(conn.expires_at) : null
    const tokenExpired = tokenExpiresAt ? tokenExpiresAt < new Date() : true

    return {
      bank_name: conn.bank_name,
      connection_status: conn.status,
      token_expires_at: conn.expires_at,
      token_expired: tokenExpired,
      accounts: connAccounts,
    }
  })

  const zeroTxnAccounts = result.flatMap(c =>
    c.accounts
      .filter(a => a.warning)
      .map(a => `${c.bank_name} / ${a.display_name}`)
  )

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    zero_transaction_warnings: zeroTxnAccounts,
    connections: result,
  })
}
