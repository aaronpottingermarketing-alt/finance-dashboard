'use client'

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
  const chartData = getLastNMonths(fd.allTransactions, 6)
  const spendByCategory = fd.spendByCategory()
  const subs = fd.subscriptionsList()

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left main pane */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <MonthSelector value={fd.selectedMonth} onChange={fd.setSelectedMonth} />
        </div>

        <SpendingChart data={chartData} />

        {/* Tab navigation */}
        <div className="flex border-b border-zinc-800">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => fd.setDetailTab(tab.id)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                fd.detailTab === tab.id
                  ? 'border-zinc-300 text-zinc-100'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {fd.detailTab === 'spending' && (
          <CategoryBreakdown spendByCategory={spendByCategory} />
        )}
        {fd.detailTab === 'bills' && (
          <BillCalendar bills={fd.bills} month={fd.selectedMonth} />
        )}
        {fd.detailTab === 'transactions' && (
          <TransactionList transactions={fd.transactions} />
        )}
      </div>

      {/* Right sidebar */}
      <div className="w-72 shrink-0 border-l border-zinc-800 overflow-y-auto p-4 flex flex-col gap-6">
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
