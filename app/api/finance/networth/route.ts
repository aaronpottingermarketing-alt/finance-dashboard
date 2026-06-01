
import { NextRequest, NextResponse } from 'next/server'
import { financeSupabase } from '@/lib/finance'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const from = url.searchParams.get('from') ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const to = url.searchParams.get('to') ?? new Date().toISOString().split('T')[0]

  const sb = financeSupabase()

  const { data, error } = await sb
    .from('finance_balance_snapshots')
    .select('balance_pence, snapshot_date')
    .gte('snapshot_date', from)
    .lte('snapshot_date', to)
    .order('snapshot_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by date and sum all account balances
  const byDate: Record<string, number> = {}
  for (const row of data ?? []) {
    byDate[row.snapshot_date] = (byDate[row.snapshot_date] ?? 0) + row.balance_pence
  }

  const result = Object.entries(byDate)
    .map(([date, total_pence]) => ({ date, total_pence }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json(result)
}
