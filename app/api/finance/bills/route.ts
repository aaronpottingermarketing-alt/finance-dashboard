export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { financeSupabase, tlFetch, buildBillSchedule, categoriseTransaction } from '@/lib/finance'
import type { FinanceTransaction, BillScheduleItem } from '@/components/finance-dashboard/types'

const MIN_PENCE = 200

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function threeMonthsAgo(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 3)
  return d.toISOString().split('T')[0]
}

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
  const NOW = today()
  const CUTOFF = threeMonthsAgo()

  // ── 1. TrueLayer: standing orders + direct debits ─────────────────────────
  const tlBills: BillScheduleItem[] = []

  const { data: connections } = await sb
    .from('finance_connections')
    .select('id, bank_name')
    .eq('status', 'active')

  if (connections?.length) {
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
              if (nextDate && nextDate < NOW) continue
              const name = cleanMerchantName(so.payee ?? so.reference ?? 'Standing Order')
              if (categoriseTransaction(name) === 'subscriptions') continue
              const dayOfMonth = nextDate ? new Date(nextDate).getDate() : 1
              tlBills.push({
                merchant_name: name,
                day_of_month: dayOfMonth,
                monthly_pence: amountPence,
                last_charged: so.first_payment_date ?? '',
                next_payment_date: nextDate ?? undefined,
                source: 'standing_order',
              })
            }
          }
        } catch { /* bank doesn't support endpoint */ }

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
              if (nextDate && nextDate < NOW) continue
              const prevTs: string | null = dd.previous_payment_timestamp ?? null
              const prevDate = prevTs ? prevTs.split('T')[0] : null
              if (!nextDate && prevDate && prevDate < CUTOFF) continue
              const name = cleanMerchantName(dd.name ?? 'Direct Debit')
              if (categoriseTransaction(name) === 'subscriptions') continue
              const dayOfMonth = nextDate ? new Date(nextDate).getDate() : 1
              tlBills.push({
                merchant_name: name,
                day_of_month: dayOfMonth,
                monthly_pence: amountPence,
                last_charged: prevDate ?? '',
                next_payment_date: nextDate ?? undefined,
                source: 'direct_debit',
              })
            }
          }
        } catch { /* bank doesn't support endpoint */ }
      }
    }
  }

  // ── 2. Pattern detection: bills category, paid within last 3 months ───────
  const { data: txnData, error: txnError } = await sb
    .from('finance_transactions')
    .select('*')
    .lt('amount_pence', -MIN_PENCE)
    .eq('category', 'bills')
    .gte('booking_date', CUTOFF)
    .order('booking_date', { ascending: false })

  if (txnError) {
    console.error('[bills] Supabase query error:', txnError.message)
  }

  const patternBills = buildBillSchedule((txnData ?? []) as FinanceTransaction[])
    .filter(b => !b.last_charged || b.last_charged >= CUTOFF)
    .map(b => ({ ...b, source: 'pattern' as const }))

  // ── 3. Merge: TrueLayer takes priority, pattern fills gaps ────────────────
  const tlKeys = new Set(tlBills.map(b => b.merchant_name.toLowerCase().trim()))

  const merged: BillScheduleItem[] = [
    ...tlBills,
    ...patternBills.filter(b => !tlKeys.has(b.merchant_name.toLowerCase().trim())),
  ]

  const seen = new Set<string>()
  const deduped = merged.filter(b => {
    const key = b.merchant_name.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return NextResponse.json(deduped.sort((a, b) => a.day_of_month - b.day_of_month))
}
