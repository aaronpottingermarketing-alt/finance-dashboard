// Seed the database with realistic test data
// Run with: npx tsx --env-file=.env.local scripts/seed.ts
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seed() {
  console.log('Cleaning old seed data...')
  await sb.from('finance_balance_snapshots').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await sb.from('finance_transactions').delete().like('gc_transaction_id', 'seed-%')
  await sb.from('finance_accounts').delete().like('gc_account_id', 'seed-%')
  await sb.from('finance_connections').delete().like('requisition_id', 'seed-%')

  console.log('Creating connection...')
  const { data: conn, error: connErr } = await sb.from('finance_connections').insert({
    institution_id: 'barclays',
    bank_name: 'Barclays',
    requisition_id: 'seed-conn-1',
    agreement_id: 'seed',
    status: 'active',
  }).select().single()
  if (connErr) throw connErr

  console.log('Creating accounts...')
  const { data: current, error: accErr1 } = await sb.from('finance_accounts').insert({
    connection_id: conn.id,
    gc_account_id: 'seed-current-1',
    display_name: 'Barclays Current Account',
    account_type: 'CACC',
    currency: 'GBP',
    balance_pence: 234567,
    balance_at: new Date().toISOString(),
    synced_at: new Date().toISOString(),
  }).select().single()
  if (accErr1) throw accErr1

  const { data: savings, error: accErr2 } = await sb.from('finance_accounts').insert({
    connection_id: conn.id,
    gc_account_id: 'seed-savings-1',
    display_name: 'Barclays Savings',
    account_type: 'SVGS',
    currency: 'GBP',
    balance_pence: 450000,
    balance_at: new Date().toISOString(),
    synced_at: new Date().toISOString(),
  }).select().single()
  if (accErr2) throw accErr2

  console.log('Generating transactions...')
  const now = new Date()
  const transactions: object[] = []
  let idx = 0

  const merchants = [
    { name: 'Deliveroo',     cat: 'food',          min: 1200, max: 3500 },
    { name: 'Tesco',         cat: 'food',          min: 800,  max: 6000 },
    { name: "Sainsbury's",   cat: 'food',          min: 500,  max: 4500 },
    { name: 'Costa Coffee',  cat: 'food',          min: 350,  max: 700  },
    { name: 'TfL',           cat: 'transport',     min: 250,  max: 600  },
    { name: 'Uber',          cat: 'transport',     min: 800,  max: 2200 },
    { name: 'Netflix',       cat: 'subscriptions', fixed: 1799 },
    { name: 'Spotify',       cat: 'subscriptions', fixed: 1099 },
    { name: 'Amazon Prime',  cat: 'subscriptions', fixed: 999  },
    { name: 'Disney+',       cat: 'subscriptions', fixed: 799  },
    { name: 'PureGym',       cat: 'subscriptions', fixed: 2499 },
    { name: 'Amazon',        cat: 'shopping',      min: 1500, max: 8000 },
    { name: 'ASOS',          cat: 'shopping',      min: 2000, max: 9000 },
    { name: 'British Gas',   cat: 'bills',         fixed: 8500 },
    { name: 'Vodafone',      cat: 'bills',         fixed: 3500 },
    { name: 'Council Tax',   cat: 'bills',         fixed: 12000 },
    { name: 'Boots',         cat: 'health',        min: 500,  max: 3000 },
  ]

  const subs = merchants.filter(m => m.fixed && m.cat === 'subscriptions')
  const bills = merchants.filter(m => m.fixed && m.cat === 'bills')
  const variable = merchants.filter(m => !m.fixed)

  for (let mo = 0; mo < 3; mo++) {
    const base = new Date(now.getFullYear(), now.getMonth() - mo, 1)

    // Salary on 28th
    const salaryDate = new Date(base.getFullYear(), base.getMonth(), 28)
    if (salaryDate <= now) {
      transactions.push({
        account_id: current.id,
        gc_transaction_id: `seed-txn-${idx++}`,
        booking_date: salaryDate.toISOString().split('T')[0],
        description: 'BACS Credit Salary',
        amount_pence: 320000,
        currency: 'GBP',
        category: 'income',
        merchant_name: 'Employer',
        is_pending: false,
        is_subscription: false,
      })
    }

    // Subscriptions on 1st-5th
    subs.forEach((sub, i) => {
      const d = new Date(base.getFullYear(), base.getMonth(), i + 1)
      if (d <= now) {
        transactions.push({
          account_id: current.id,
          gc_transaction_id: `seed-txn-${idx++}`,
          booking_date: d.toISOString().split('T')[0],
          description: sub.name,
          amount_pence: -(sub.fixed!),
          currency: 'GBP',
          category: 'subscriptions',
          merchant_name: sub.name,
          is_pending: false,
          is_subscription: true,
        })
      }
    })

    // Bills on 10th-15th
    bills.forEach((bill, i) => {
      const d = new Date(base.getFullYear(), base.getMonth(), 10 + i)
      if (d <= now) {
        transactions.push({
          account_id: current.id,
          gc_transaction_id: `seed-txn-${idx++}`,
          booking_date: d.toISOString().split('T')[0],
          description: bill.name,
          amount_pence: -(bill.fixed!),
          currency: 'GBP',
          category: 'bills',
          merchant_name: bill.name,
          is_pending: false,
          is_subscription: true,
        })
      }
    })

    // Variable spending every 2 days
    for (let day = 1; day <= 28; day += 2) {
      const d = new Date(base.getFullYear(), base.getMonth(), day)
      if (d > now) continue
      const m = variable[Math.floor(Math.random() * variable.length)]
      const amt = m.min! + Math.floor(Math.random() * (m.max! - m.min!))
      transactions.push({
        account_id: current.id,
        gc_transaction_id: `seed-txn-${idx++}`,
        booking_date: d.toISOString().split('T')[0],
        description: m.name,
        amount_pence: -amt,
        currency: 'GBP',
        category: m.cat,
        merchant_name: m.name,
        is_pending: false,
        is_subscription: false,
      })
    }
  }

  // Insert in batches of 50
  for (let i = 0; i < transactions.length; i += 50) {
    const { error } = await sb.from('finance_transactions').insert(transactions.slice(i, i + 50))
    if (error) throw error
  }
  console.log(`✓ ${transactions.length} transactions inserted`)

  // Net worth snapshots (90 days)
  console.log('Creating net worth snapshots...')
  const snapshots: object[] = []
  for (let d = 89; d >= 0; d--) {
    const date = new Date(Date.now() - d * 86400000).toISOString().split('T')[0]
    snapshots.push({ account_id: current.id, balance_pence: 234567 + Math.floor(Math.random() * 20000) - 5000, snapshot_date: date })
    snapshots.push({ account_id: savings.id, balance_pence: 450000 + Math.floor((89 - d) * 600), snapshot_date: date })
  }
  for (let i = 0; i < snapshots.length; i += 50) {
    await sb.from('finance_balance_snapshots').upsert(snapshots.slice(i, i + 50), { onConflict: 'account_id,snapshot_date' })
  }
  console.log('✓ Net worth snapshots inserted')

  console.log('\n✅ Seed complete! Go to https://aaron-finance.netlify.app')
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1) })
