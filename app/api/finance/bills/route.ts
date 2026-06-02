
import { NextResponse } from 'next/server'
import { financeSupabase, tlFetch, buildBillSchedule } from '@/lib/finance'
import type { FinanceTransaction, BillScheduleItem } from '@/components/finance-dashboard/types'

const TODAY = new Date().toISOString().split('T')[0]
const MIN_PENCE = 200 // £2 minimum — filters out GoCardless £1 mandate verifications

// TrueLayer sometimes returns "PAYEE NAME PAYEE NAME" — strip the duplicate half
function cleanMerchantName(raw: string): string {
  const trimmed = raw.trim()
  const words = trimmed.split(/\s+/)
  if (words.length >= 4 && words.length % 2 === 0) {
    const half = words.length / 2
    if (words.slice(0, half).join(' ') === words.slice(half).join(' ')) {
      return words.slice(0, half).join(' ')
    }
  }
  return trimmed
}

export async function GET() {
  const sb = financeSupabase()

  const { data: connections } = await sb
    .from('finance_connections')
    .select('id, bank_name')
    .eq('status', 'active')

  if (!connections?.length) return NextResponse.json([])

  const bills: BillScheduleItem[] = []

  for (const connection of connections) {
    const { data: accounts } = await sb
      .from('finance_accounts')
      .select('gc_account_id, display_name')
      .eq('connection_id', connection.id)

    if (!accounts?.length) continue

    for (const account of accounts) {
      // Standing orders
      try {
        const soRes = await tlFetch(connection.id, `/data/v1/accounts/${account.gc_account_id}/standing_orders`)
        if (soRes.ok) {
          const soData = await soRes.json()
          for (const so of soData.results ?? []) {
            if (so.status?.toUpperCase() !== 'ACTIVE') continue
            const amountPence = Math.round((so.next_payment_amount ?? so.first_payment_amount ?? 0) * 100)
            if (amountPence < MIN_PENCE) continue
            const nextDate: string | null = so.next_payment_date ?? null
            // Skip if the next payment date is in the past
            if (nextDate && nextDate < TODAY) continue
            const dayOfMonth = nextDate ? new Date(nextDate).getDate() : 1
            bills.push({
              merchant_name: cleanMerchantName(so.payee ?? so.reference ?? 'Standing Order'),
              day_of_month: dayOfMonth,
              monthly_pence: amountPence,
              last_charged: so.first_payment_date ?? '',
              next_payment_date: nextDate ?? undefined,
              source: 'standing_order',
            })
          }
        }
      } catch {
        // bank doesn't support this endpoint — continue
      }

      // Direct debits
      try {
        const ddRes = await tlFetch(connection.id, `/data/v1/accounts/${account.gc_account_id}/direct_debits`)
        if (ddRes.ok) {
          const ddData = await ddRes.json()
          for (const dd of ddData.results ?? []) {
            if (dd.status?.toUpperCase() !== 'ACTIVE') continue
            const amountPence = Math.round((dd.next_payment_amount ?? dd.previous_payment_amount ?? 0) * 100)
            if (amountPence < MIN_PENCE) continue
            const nextTs: string | null = dd.next_payment_timestamp ?? null
            const nextDate = nextTs ? nextTs.split('T')[0] : null
            // Skip if next payment date is in the past
            if (nextDate && nextDate < TODAY) continue
            const dayOfMonth = nextDate ? new Date(nextDate).getDate() : 1
            const prevTs: string | null = dd.previous_payment_timestamp ?? null
            bills.push({
              merchant_name: cleanMerchantName(dd.name ?? 'Direct Debit'),
              day_of_month: dayOfMonth,
              monthly_pence: amountPence,
              last_charged: prevTs ? prevTs.split('T')[0] : '',
              next_payment_date: nextDate ?? undefined,
              source: 'direct_debit',
            })
          }
        }
      } catch {
        // bank doesn't support this endpoint — continue
      }
    }
  }

  // If TrueLayer gave us anything, deduplicate and return it
  if (bills.length > 0) {
    const seen = new Set<string>()
    const deduped = bills.filter(b => {
      const key = b.merchant_name.toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    return NextResponse.json(deduped.sort((a, b) => a.day_of_month - b.day_of_month))
  }

  // Fallback: detect from transaction patterns — bills and subscriptions categories only
  const { data, error } = await sb
    .from('finance_transactions')
    .select('*')
    .eq('is_subscription', true)
    .lt('amount_pence', -MIN_PENCE)
    .in('category', ['bills', 'subscriptions'])
    .order('booking_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const schedule = buildBillSchedule((data ?? []) as FinanceTransaction[])
  return NextResponse.json(schedule.map(b => ({ ...b, source: 'pattern' as const })))
}
