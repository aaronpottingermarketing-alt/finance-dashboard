export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import {
  tlFetch,
  financeSupabase,
  categoriseTransaction,
  detectSubscriptions,
  detectPriceChanges,
} from '@/lib/finance'
import type { FinanceTransaction } from '@/components/finance-dashboard/types'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { connection_id } = body

  const sb = financeSupabase()

  const query = sb.from('finance_connections').select('*').eq('status', 'active')
  if (connection_id) query.eq('id', connection_id)
  const { data: connections, error: connError } = await query

  if (connError) return NextResponse.json({ error: connError.message }, { status: 500 })
  if (!connections?.length) return NextResponse.json({ accounts_synced: 0, transactions_synced: 0, errors: [] })

  let accountsSynced = 0
  let transactionsSynced = 0
  const errors: string[] = []

  for (const connection of connections) {
    try {
      const { data: accounts } = await sb
        .from('finance_accounts')
        .select('*')
        .eq('connection_id', connection.id)

      if (!accounts?.length) continue

      for (const account of accounts) {
        try {
          // Fetch balance
          const balanceRes = await tlFetch(connection.id, `/data/v1/accounts/${account.gc_account_id}/balance`)
          if (balanceRes.ok) {
            const balanceData = await balanceRes.json()
            const results = balanceData.results ?? []
            // Prefer available balance, fall back to current
            const balance =
              results.find((b: { balance_type: string }) => b.balance_type === 'available') ??
              results.find((b: { balance_type: string }) => b.balance_type === 'current') ??
              results[0]

            if (balance) {
              const pence = Math.round(balance.current * 100)
              await sb.from('finance_accounts').update({
                balance_pence: pence,
                balance_at: new Date().toISOString(),
                synced_at: new Date().toISOString(),
              }).eq('id', account.id)

              // Net worth snapshot
              await sb.from('finance_balance_snapshots').upsert({
                account_id: account.id,
                balance_pence: pence,
                snapshot_date: new Date().toISOString().split('T')[0],
              }, { onConflict: 'account_id,snapshot_date' })
            }
          }

          // Fetch transactions (last 90 days)
          const from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          const to = new Date().toISOString().split('T')[0]
          const txnRes = await tlFetch(
            connection.id,
            `/data/v1/accounts/${account.gc_account_id}/transactions?from=${from}&to=${to}`
          )

          if (!txnRes.ok) continue

          const txnData = await txnRes.json()
          const rawTxns = txnData.results ?? []

          for (const raw of rawTxns) {
            // TrueLayer amounts: positive = credit, negative = debit (in GBP)
            const amountPence = Math.round((raw.amount ?? 0) * 100)
            const description =
              raw.description ??
              raw.merchant_name ??
              raw.transaction_information ??
              'Unknown'
            const merchantName = raw.merchant_name ?? raw.meta?.provider_merchant_name ?? null
            const category = categoriseTransaction(description)

            const txnRow = {
              account_id: account.id,
              gc_transaction_id: raw.transaction_id ?? `tl-${account.gc_account_id}-${raw.timestamp}-${amountPence}`,
              booking_date: (raw.timestamp ?? new Date().toISOString()).split('T')[0],
              value_date: null,
              description,
              amount_pence: amountPence,
              currency: raw.currency ?? 'GBP',
              category,
              merchant_name: merchantName,
              is_pending: raw.transaction_type === 'PENDING',
              is_subscription: false,
            }

            await sb
              .from('finance_transactions')
              .upsert(txnRow, { onConflict: 'gc_transaction_id' })

            transactionsSynced++
          }

          accountsSynced++
        } catch (err) {
          errors.push(`Account ${account.display_name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }

      // Bulk subscription detection and price change checks
      const { data: allTxns } = await sb
        .from('finance_transactions')
        .select('*')
        .in('account_id', accounts.map(a => a.id))

      if (allTxns?.length) {
        const subIds = detectSubscriptions(allTxns as FinanceTransaction[])

        if (subIds.size > 0) {
          const subIdArray = Array.from(subIds)
          // Update subscriptions in batches of 100
          for (let i = 0; i < subIdArray.length; i += 100) {
            await sb
              .from('finance_transactions')
              .update({ is_subscription: true })
              .in('gc_transaction_id', subIdArray.slice(i, i + 100))
          }

          const subTxns = (allTxns as FinanceTransaction[]).filter(t => subIds.has(t.gc_transaction_id))
          if (subTxns.length) await detectPriceChanges(subTxns, sb)
        }

        // Sync savings goal balances for linked accounts
        for (const account of accounts) {
          await sb
            .from('finance_savings_goals')
            .update({ current_pence: account.balance_pence })
            .eq('linked_account_id', account.id)
        }

        // Mark completed goals
        await sb
          .from('finance_savings_goals')
          .update({ completed_at: new Date().toISOString() })
          .is('completed_at', null)
          .gte('current_pence', sb.from('finance_savings_goals').select('target_pence'))
      }
    } catch (err) {
      errors.push(`Connection ${connection.bank_name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return NextResponse.json({ accounts_synced: accountsSynced, transactions_synced: transactionsSynced, errors })
}
