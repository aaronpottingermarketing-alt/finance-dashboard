'use client'

import { useState } from 'react'
import type { useFinanceDashboard } from './useFinanceDashboard'
import MonthSelector from './MonthSelector'
import SpendingChart from './SpendingChart'
import CategoryBreakdown from './CategoryBreakdown'
import TransactionList from './TransactionList'
import BillCalendar from './BillCalendar'
import SubscriptionPanel from './SubscriptionPanel'
import PriceAlerts from './PriceAlerts'
import SavingsGoals from './SavingsGoals'
import AIInsightsPanel from './AIInsightsPanel'

type Props = {
  fd: ReturnType<typeof useFinanceDashboard>
}

function monthRange(month: string): { from: string; to: string } {
  const [year, m] = month.split('-').map(Number)
  const from = `${month}-01`
  const lastDay = new Date(year, m, 0).getDate()
  const to = `${month}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

function getLastNMonths(allTransactions: ReturnType<typeof useFinanceDashboard>['allTransactions'], n: number) {
  const now = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('en-GB', { month: 'short' })
    const isCurrent = i === n - 1
    const { from, to } = monthRange(month)
    const total = allTransactions
      .filter(t => t.booking_date >= from && t.booking_date <= to && t.amount_pence < 0)
      .reduce((s, t) => s + Math.abs(t.amount_pence), 0)
    return { label, total_pence: total, isCurrent }
  })
}

const TABS = [
  { id: 'spending' as const, label: 'Spending' },
  { id: 'bills' as const, label: 'Bills' },
  { id: 'transactions' as const, label: 'Transactions' },
]

export default function DetailDashboard({ fd }: Props) {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)
  const chartData = getLastNMonths(fd.allTransactions, 6)
  const spendByCategory = fd.spendByCategory()
  const subs = fd.subscriptionsList()

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Left main pane */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <MonthSelector value={fd.selectedMonth} onChange={fd.setSelectedMonth} />
        </div>

        <SpendingChart data={chartData} />

        {/* Tab navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {TABS.map(tab => {
            const isActive = fd.detailTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => fd.setDetailTab(tab.id)}
                onMouseEnter={() => setHoveredTab(tab.id)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: isActive
                    ? '#00d4aa'
                    : hoveredTab === tab.id
                    ? '#e2e8f0'
                    : '#475569',
                  borderBottom: isActive ? '2px solid #00d4aa' : '2px solid transparent',
                  marginBottom: '-1px',
                  background: 'none',
                  border: 'none',
                  borderBottomStyle: 'solid',
                  borderBottomWidth: '2px',
                  borderBottomColor: isActive ? '#00d4aa' : 'transparent',
                  cursor: 'pointer',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div style={{ minHeight: 0 }}>
          {fd.detailTab === 'spending' && (
            <CategoryBreakdown spendByCategory={spendByCategory} />
          )}
          {fd.detailTab === 'bills' && (
            <BillCalendar bills={fd.bills} month={fd.selectedMonth} />
          )}
          {fd.detailTab === 'transactions' && (
            <TransactionList transactions={fd.transactions} onRecategorise={async () => { await fd.loadAllTransactions() }} />
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <div
        style={{
          width: '18rem',
          flexShrink: 0,
          borderLeft: '1px solid rgba(255,255,255,0.05)',
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        <AIInsightsPanel
          insights={fd.insights}
          loading={fd.insightsLoading}
          streamText={fd.insightsStreamText}
          selectedMonth={fd.selectedMonth}
          onGenerate={fd.generateInsights}
        />

        <SavingsGoals
          goals={fd.goals}
          accounts={fd.accounts}
          avgMonthlySavings={fd.avgMonthlySavings()}
          onCreate={fd.createGoal}
          onDelete={fd.deleteGoal}
        />

        <SubscriptionPanel subscriptions={subs} />

        <PriceAlerts alerts={fd.priceAlerts} onDismiss={fd.dismissPriceAlert} />
      </div>
    </div>
  )
}
