import { NextRequest, NextResponse } from 'next/server'
import { financeSupabase } from '@/lib/finance'
import type { FinanceTransaction } from '@/components/finance-dashboard/types'

export async function GET(_req: NextRequest) {
  const sb = financeSupabase()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const { data, error } = await sb
    .from('finance_transactions')
    .select('*')
    .lt('amount_pence', 0)
    .eq('category', 'bills')
    .gte('booking_date', cutoffStr)
    .order('booking_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // One entry per merchant — most recent transaction sets the day and amount
  const byMerchant: Record<string, {
    merchant_name: string
    day_of_month: number
    monthly_pence: number
    last_charged: string
  }> = {}

  for (const t of (data ?? []) as FinanceTransaction[]) {
    const key = t.merchant_name ?? t.description
    if (byMerchant[key]) continue
    byMerchant[key] = {
      merchant_name: key,
      day_of_month: new Date(t.booking_date).getDate(),
      monthly_pence: Math.abs(t.amount_pence),
      last_charged: t.booking_date,
    }
  }

  const bills = Object.values(byMerchant).sort((a, b) => a.day_of_month - b.day_of_month)
  return NextResponse.json(bills)
}
