'use client'

import type { useFinanceDashboard } from './useFinanceDashboard'
import NetWorthChart from './NetWorthChart'
import MasterSpendingChart from './MasterSpendingChart'
import ImprovementPanel from './ImprovementPanel'
import UpcomingBills from './UpcomingBills'
import CashFlowBar from './CashFlowBar'
import SpendVelocity from './SpendVelocity'
import DailyBudget from './DailyBudget'
import SavingsRateCard from './SavingsRateCard'
import WeeklyDigest from './WeeklyDigest'
import SubscriptionRenewal from './SubscriptionRenewal'
import CategoryPieChart from './CategoryPieChart'
import type { TransactionCategory } from './types'

type Props = { fd: ReturnType<typeof useFinanceDashboard> }

function fmt(pence: number): string {
  return (pence / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}

function monthRange(month: string) {
  const [year, m] = month.split('-').map(Number)
  return { from: `${month}-01`, to: `${month}-${String(new Date(year, m, 0).getDate()).padStart(2, '0')}` }
}

function getLastNMonths(allTxns: ReturnType<typeof useFinanceDashboard>['allTransactions'], n: number) {
  const now = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const { from, to } = monthRange(month)
    const categories: Partial<Record<TransactionCategory, number>> = {}
    let total = 0
    for (const t of allTxns) {
      if (t.booking_date < from || t.booking_date > to || t.amount_pence >= 0) continue
      const amt = Math.abs(t.amount_pence)
      categories[t.category] = (categories[t.category] ?? 0) + amt
      total += amt
    }
    return { label: d.toLocaleString('en-GB', { month: 'short' }), month, isCurrent: i === n - 1, categories, total }
  })
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '1rem', padding: '1.25rem' }}>
      {children}
    </div>
  )
}

export default function MasterDashboard({ fd }: Props) {
  const now = new Date()
  const spendByCategory = fd.spendByCategory()
  const currentMonthTotal = Object.values(spendByCategory).reduce((s, v) => s + v, 0)

  const priorMonth = now.getMonth() === 0
    ? `${now.getFullYear() - 1}-12`
    : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`
  const { from: pFrom, to: pTo } = monthRange(priorMonth)
  const priorMonthTotal = fd.allTransactions
    .filter(t => t.booking_date >= pFrom && t.booking_date <= pTo && t.amount_pence < 0)
    .reduce((s, t) => s + Math.abs(t.amount_pence), 0)

  const monthChange = currentMonthTotal - priorMonthTotal
  const changeUp = monthChange > 0

  const biggestEntry = Object.entries(spendByCategory)
    .filter(([cat]) => cat !== 'income' && cat !== 'transfers')
    .sort(([, a], [, b]) => b - a)[0]

  const chartData = getLastNMonths(fd.allTransactions, 6)
  const improvementCards = fd.buildImprovementCards()

  const subsTotal = fd.subscriptionsList()
    .reduce((s, t) => s + Math.abs(t.amount_pence), 0) /
    Math.max(new Set(fd.subscriptionsList().map(t => t.booking_date.slice(0, 7))).size, 1)
  const subsCount = new Set(fd.subscriptionsList().map(t => t.merchant_name ?? t.description)).size

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* ── Left: main dashboard ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0 }}>

        <p style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>{greeting}, Aaron.</p>

        {/* Top stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
          <Card>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Total Balance</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#00d4aa', marginBottom: 4 }}>{fmt(fd.totalBalance())}</p>
            <p style={{ fontSize: 11, color: '#334155' }}>{fd.accounts.length} accounts</p>
          </Card>
          <Card>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Spent This Month</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{fmt(currentMonthTotal)}</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: changeUp ? '#ef4444' : '#00d4aa' }}>
              {priorMonthTotal > 0 ? `${changeUp ? '▲' : '▼'} ${fmt(Math.abs(monthChange))} vs last month` : 'No prior data'}
            </p>
          </Card>
          <Card>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Top Category</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', marginBottom: 4, textTransform: 'capitalize' }}>{biggestEntry?.[0] ?? '—'}</p>
            <p style={{ fontSize: 11, color: '#334155' }}>
              {biggestEntry && currentMonthTotal > 0 ? `${fmt(biggestEntry[1])} · ${Math.round((biggestEntry[1] / currentMonthTotal) * 100)}%` : ''}
            </p>
          </Card>
          <Card>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Subscriptions</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#a78bfa', marginBottom: 4 }}>{fmt(subsTotal)}<span style={{ fontSize: 13, fontWeight: 400 }}>/mo</span></p>
            <p style={{ fontSize: 11, color: '#334155' }}>{subsCount} active</p>
          </Card>
        </div>

        {/* Cash flow + Savings rate row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <CashFlowBar transactions={fd.transactions} allTransactions={fd.allTransactions} />
          <SavingsRateCard allTransactions={fd.allTransactions} />
        </div>

        {/* Spend velocity + Daily budget row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <SpendVelocity transactions={fd.transactions} />
          <DailyBudget transactions={fd.transactions} />
        </div>

        {/* Weekly digest — full width */}
        <WeeklyDigest allTransactions={fd.allTransactions} />

        {/* Net worth chart */}
        <Card>
          <div style={{ height: '200px' }}>
            <NetWorthChart data={fd.netWorth} />
          </div>
        </Card>

        {/* Spending breakdown pie chart */}
        <CategoryPieChart spendByCategory={spendByCategory} />

        {/* Monthly spend chart — click a bar to drill into that month */}
        <MasterSpendingChart
          data={chartData}
          onBarClick={(month) => {
            fd.setSelectedMonth(month)
            fd.setViewMode('detail')
            fd.setDetailTab('transactions')
          }}
        />

        {/* Subscription renewal alert — only shows if something renewing soon */}
        <SubscriptionRenewal bills={fd.bills} />

        {/* Upcoming bills */}
        <UpcomingBills bills={fd.bills} />

      </div>

      {/* ── Right: What to improve ── */}
      <div style={{ width: '18rem', flexShrink: 0, overflowY: 'auto', padding: '1.25rem', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
        <ImprovementPanel cards={improvementCards} />
      </div>

    </div>
  )
}
