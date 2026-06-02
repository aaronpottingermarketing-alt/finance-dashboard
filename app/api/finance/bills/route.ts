export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { financeSupabase } from '@/lib/finance'

export async function GET() {
  const sb = financeSupabase()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const { data, error } = await sb
    .from('finance_transactions')
    .select('merchant_name, description, amount_pence, booking_date')
    .lt('amount_pence', 0)
    .eq('category', 'bills')
    .gte('booking_date', cutoffStr)
    .order('booking_date', { ascending: false })

  if (error) {
    console.error('[bills] query error:', error.message)
    return NextResponse.json([])
  }

  // One entry per merchant — most recent transaction wins for day + amount
  const byMerchant: Record<string, { day_of_month: number; monthly_pence: number; last_charged: string }> = {}
  for (const t of data ?? []) {
    const key = (t.merchant_name ?? t.description) as string
    if (!byMerchant[key]) {
      byMerchant[key] = {
        day_of_month: new Date(t.booking_date).getDate(),
        monthly_pence: Math.abs(t.amount_pence as number),
        last_charged: t.booking_date as string,
      }
    }
  }

  const bills = Object.entries(byMerchant).map(([merchant_name, rest]) => ({
    merchant_name,
    ...rest,
    source: 'pattern' as const,
  }))

  return NextResponse.json(bills.sort((a, b) => a.day_of_month - b.day_of_month))
}
