'use client'

import type { useFinanceDashboard } from './useFinanceDashboard'
import StatsBar from './StatsBar'
import NetWorthChart from './NetWorthChart'
import MasterSpendingChart from './MasterSpendingChart'
import ImprovementPanel from './ImprovementPanel'
import UpcomingBills from './UpcomingBills'
import type { TransactionCategory } from './types'

type Props = {
  fd: ReturnType<typeof useFinanceDashboard>
}

function getLastNMonths(n: number): { label: string; month: string }[] {
  const result = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      label: d.toLocaleString('en-GB', { month: 'short' }),
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    })
  }
  return result
}

function monthRange(month: string): { from: string; to: string } {
  const [year, m] = month.split('-').map(Number)
  const from = `${month}-01`
  const lastDay = new Date(year, m, 0).getDate()
  const to = `${month}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

export default function MasterDashboard({ fd }: Props) {
  const totalBalance = fd.totalBalance()
  const spendThisMonth = fd.spendByCategory()
  const currentMonthTotal = Object.values(spendThisMonth).reduce((s, v) => s + v, 0)

  // Prior month total from allTransactions
  const now = new Date()
  const priorMonthStr = now.getMonth() === 0
    ? `${now.getFullYear() - 1}-12`
    : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`
  const { from: pFrom, to: pTo } = monthRange(priorMonthStr)
  const priorMonthTotal = fd.allTransactions
    .filter(t => t.booking_date >= pFrom && t.booking_date <= pTo && t.amount_pence < 0)
    .reduce((s, t) => s + Math.abs(t.amount_pence), 0)

  // Biggest category
  const biggestCat = Object.entries(spendThisMonth)
    .filter(([cat]) => cat !== 'income' && cat !== 'transfers')
    .sort(([, a], [, b]) => b - a)[0]
  const biggestCategory = biggestCat
    ? { name: biggestCat[0] as TransactionCategory, pence: biggestCat[1] }
    : null

  // 6 month chart data
  const months = getLastNMonths(6)
  const chartData = months.map(({ label, month }) => {
    const { from, to } = monthRange(month)
    const isCurrent = month === fd.selectedMonth
    const categories: Partial<Record<TransactionCategory, number>> = {}
    let total = 0
    for (const t of fd.allTransactions) {
      if (t.booking_date < from || t.booking_date > to || t.amount_pence >= 0) continue
      const amt = Math.abs(t.amount_pence)
      categories[t.category] = (categories[t.category] ?? 0) + amt
      total += amt
    }
    return { label, isCurrent, categories, total }
  })

  const improvementCards = fd.buildImprovementCards()

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Stats bar */}
      <StatsBar
        totalBalance={totalBalance}
        spendThisMonth={currentMonthTotal}
        spendLastMonth={priorMonthTotal}
        biggestCategory={biggestCategory}
        totalMonthSpend={currentMonthTotal}
      />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — charts */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          <div>
            <p className="text-sm text-zinc-500 mb-4">{greeting()}, Aaron.</p>
            <NetWorthChart data={fd.netWorth} />
          </div>

          <MasterSpendingChart data={chartData} />

          <UpcomingBills bills={fd.bills} />
        </div>

        {/* Right — improvement panel */}
        <div className="w-72 shrink-0 border-l border-zinc-800 overflow-hidden p-4">
          <ImprovementPanel cards={improvementCards} />
        </div>
      </div>
    </div>
  )
}
