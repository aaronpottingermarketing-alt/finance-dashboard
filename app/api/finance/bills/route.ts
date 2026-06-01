export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { financeSupabase, buildBillSchedule } from '@/lib/finance'
import type { FinanceTransaction } from '@/components/finance-dashboard/types'

export async function GET() {
  const sb = financeSupabase()

  const { data, error } = await sb
    .from('finance_transactions')
    .select('*')
    .eq('is_subscription', true)
    .lt('amount_pence', 0)
    .order('booking_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const schedule = buildBillSchedule((data ?? []) as FinanceTransaction[])
  return NextResponse.json(schedule)
}
