'use client'

import { useState, useEffect, useCallback } from 'react'
import type {
  FinanceConnection,
  FinanceAccount,
  FinanceTransaction,
  AIInsight,
  AIInsightItem,
  NetWorthSnapshot,
  PaydayPeriod,
  PriceChange,
  SavingsGoal,
  BillScheduleItem,
  ImprovementCard,
  InsightType,
  TransactionCategory,
  T212Portfolio,
} from './types'

function currentMonthStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthRange(month: string): { from: string; to: string } {
  const [year, m] = month.split('-').map(Number)
  const from = `${month}-01`
  const lastDay = new Date(year, m, 0).getDate()
  const to = `${month}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

export function useFinanceDashboard() {
  const [connections, setConnections] = useState<FinanceConnection[]>([])
  const [accounts, setAccounts] = useState<FinanceAccount[]>([])
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([])
  const [allTransactions, setAllTransactions] = useState<FinanceTransaction[]>([]) // 90 days, for payday/subscription calcs
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [netWorth, setNetWorth] = useState<NetWorthSnapshot[]>([])
  const [priceAlerts, setPriceAlerts] = useState<PriceChange[]>([])
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [bills, setBills] = useState<BillScheduleItem[]>([])
  const [portfolio, setPortfolio] = useState<T212Portfolio | null>(null)
  const [portfolioLoading, setPortfolioLoading] = useState(false)

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr)
  const [viewMode, setViewMode] = useState<'overview' | 'detail' | 'insights'>('overview')
  const [detailTab, setDetailTab] = useState<'spending' | 'bills' | 'transactions'>('spending')
  const [selectedPeriod, setSelectedPeriod] = useState<PaydayPeriod | null>(null)

  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsStreamText, setInsightsStreamText] = useState('')
  const [lastSynced, setLastSynced] = useState<Date | null>(null)

  // ─── Loaders ────────────────────────────────────────────────────────────────

  const loadConnections = useCallback(async () => {
    const res = await fetch('/api/finance/connections')
    if (!res.ok) return
    const data = await res.json()
    setConnections(data)
    return data as FinanceConnection[]
  }, [])

  const loadAccounts = useCallback(async () => {
    const res = await fetch('/api/finance/accounts')
    if (!res.ok) return
    const data = await res.json()
    setAccounts(data)
  }, [])

  const loadTransactions = useCallback(async (month: string) => {
    const { from, to } = monthRange(month)
    const res = await fetch(`/api/finance/transactions?from=${from}&to=${to}&limit=2000`)
    if (!res.ok) return
    const data = await res.json()
    setTransactions(data)
  }, [])

  const loadAllTransactions = useCallback(async () => {
    const from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const res = await fetch(`/api/finance/transactions?from=${from}&limit=5000`)
    if (!res.ok) return
    const data = await res.json()
    setAllTransactions(data)
  }, [])

  const loadInsights = useCallback(async (month: string) => {
    const res = await fetch(`/api/finance/insights?period=${month}`)
    if (!res.ok) return
    const data = await res.json()
    setInsights(data)
  }, [])

  const loadNetWorth = useCallback(async () => {
    const res = await fetch('/api/finance/networth')
    if (!res.ok) return
    const data = await res.json()
    setNetWorth(data)
  }, [])

  const loadPriceAlerts = useCallback(async () => {
    const res = await fetch('/api/finance/price-alerts')
    if (!res.ok) return
    const data = await res.json()
    setPriceAlerts(data)
  }, [])

  const loadGoals = useCallback(async () => {
    const res = await fetch('/api/finance/goals')
    if (!res.ok) return
    const data = await res.json()
    setGoals(data)
  }, [])

  const loadBills = useCallback(async () => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)
    const from = cutoff.toISOString().split('T')[0]

    const [billsRes, subsRes] = await Promise.all([
      fetch(`/api/finance/transactions?category=bills&from=${from}&limit=1000`),
      fetch(`/api/finance/transactions?category=subscriptions&from=${from}&limit=1000`),
    ])

    const billsTxns: FinanceTransaction[] = billsRes.ok ? await billsRes.json() : []
    const subsTxns: FinanceTransaction[] = subsRes.ok ? await subsRes.json() : []
    const transactions = [...billsTxns, ...subsTxns]

    const byMerchant: Record<string, BillScheduleItem> = {}
    for (const t of transactions) {
      const key = t.merchant_name ?? t.description
      if (byMerchant[key]) continue
      byMerchant[key] = {
        merchant_name: key,
        day_of_month: new Date(t.booking_date).getDate(),
        monthly_pence: Math.abs(t.amount_pence),
        last_charged: t.booking_date,
      }
    }
    setBills(Object.values(byMerchant).sort((a, b) => a.day_of_month - b.day_of_month))
  }, [])

  const loadPortfolio = useCallback(async () => {
    setPortfolioLoading(true)
    try {
      const res = await fetch('/api/finance/portfolio')
      if (!res.ok) return
      const data = await res.json()
      if (!data.error) setPortfolio(data as T212Portfolio)
    } finally {
      setPortfolioLoading(false)
    }
  }, [])

  // ─── Initial load ────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const conns = await loadConnections()
      if (conns?.some(c => c.status === 'active')) {
        await Promise.all([
          loadAccounts(),
          loadTransactions(currentMonthStr()),
          loadAllTransactions(),
          loadInsights(currentMonthStr()),
          loadNetWorth(),
          loadPriceAlerts(),
          loadGoals(),
          loadBills(),
          loadPortfolio(),
        ])
      }
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reload transactions + insights when month changes
  useEffect(() => {
    if (!loading) {
      loadTransactions(selectedMonth)
      loadInsights(selectedMonth)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth])

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const sync = useCallback(async () => {
    setSyncing(true)
    try {
      // Sync each bank connection sequentially so each gets its own timeout window
      const conns = connections.filter(c => c.status === 'active')
      if (conns.length === 0) {
        // Fall back to syncing all at once if no connections loaded yet
        await fetch('/api/finance/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      } else {
        for (const conn of conns) {
          await fetch('/api/finance/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connection_id: conn.id }),
          })
        }
      }
      await Promise.all([loadAccounts(), loadTransactions(selectedMonth), loadAllTransactions(), loadNetWorth(), loadBills(), loadPriceAlerts(), loadGoals()])
      setLastSynced(new Date())
    } finally {
      setSyncing(false)
    }
  }, [connections, loadAccounts, loadTransactions, loadAllTransactions, loadNetWorth, loadBills, loadPriceAlerts, loadGoals, selectedMonth])

  const connectBank = useCallback(async (institutionId: string) => {
    const res = await fetch('/api/finance/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institution_id: institutionId }),
    })
    if (!res.ok) throw new Error('Failed to start bank connection')
    const { link } = await res.json()
    window.location.href = link
  }, [])

  const disconnectBank = useCallback(async (connectionId: string) => {
    await fetch('/api/finance/connections', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connection_id: connectionId }),
    })
    await loadConnections()
  }, [loadConnections])

  const generateInsights = useCallback(async (month: string, type: InsightType) => {
    setInsightsLoading(true)
    setInsightsStreamText('')
    let accumulated = ''

    try {
      const res = await fetch('/api/finance/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: month, insight_type: type }),
      })

      if (!res.ok) throw new Error('Failed to start insights generation')
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.text) {
              accumulated += data.text
              setInsightsStreamText(accumulated)
            }
            if (data.done) {
              await loadInsights(month)
              setInsightsStreamText('')
            }
          } catch { /* ignore parse errors on partial chunks */ }
        }
      }
    } finally {
      setInsightsLoading(false)
    }
  }, [loadInsights])

  const dismissPriceAlert = useCallback(async (id: string) => {
    await fetch('/api/finance/price-alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setPriceAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
  }, [])

  const createGoal = useCallback(async (goal: Omit<SavingsGoal, 'id' | 'created_at' | 'completed_at'>) => {
    const res = await fetch('/api/finance/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goal),
    })
    if (!res.ok) throw new Error('Failed to create goal')
    await loadGoals()
  }, [loadGoals])

  const updateGoal = useCallback(async (id: string, updates: Partial<SavingsGoal>) => {
    await fetch(`/api/finance/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    await loadGoals()
  }, [loadGoals])

  const deleteGoal = useCallback(async (id: string) => {
    await fetch(`/api/finance/goals/${id}`, { method: 'DELETE' })
    setGoals(prev => prev.filter(g => g.id !== id))
  }, [])

  // ─── Derived computations ─────────────────────────────────────────────────────

  const totalBalance = useCallback(() => {
    return accounts.reduce((s, a) => s + a.balance_pence, 0)
  }, [accounts])

  const spendByCategory = useCallback((): Record<TransactionCategory, number> => {
    const map = {} as Record<TransactionCategory, number>
    for (const t of transactions) {
      if (t.amount_pence >= 0) continue
      map[t.category] = (map[t.category] ?? 0) + Math.abs(t.amount_pence)
    }
    return map
  }, [transactions])

  const monthOverMonth = useCallback(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const priorMonth = month === 1
      ? `${year - 1}-12`
      : `${year}-${String(month - 1).padStart(2, '0')}`
    const { from: priorFrom, to: priorTo } = monthRange(priorMonth)

    const priorTxns = allTransactions.filter(
      t => t.booking_date >= priorFrom && t.booking_date <= priorTo
    )

    const currentSpend = spendByCategory()
    const priorSpend: Record<string, number> = {}
    for (const t of priorTxns) {
      if (t.amount_pence >= 0) continue
      priorSpend[t.category] = (priorSpend[t.category] ?? 0) + Math.abs(t.amount_pence)
    }

    const allCats = new Set([...Object.keys(currentSpend), ...Object.keys(priorSpend)]) as Set<TransactionCategory>
    return Array.from(allCats).map(cat => ({
      category: cat,
      current: currentSpend[cat] ?? 0,
      prior: priorSpend[cat] ?? 0,
    })).sort((a, b) => b.current - a.current)
  }, [selectedMonth, allTransactions, spendByCategory])

  const subscriptionsList = useCallback(() => {
    return allTransactions.filter(t => t.is_subscription && t.amount_pence < 0)
  }, [allTransactions])

  const topMerchants = useCallback((n: number) => {
    const map: Record<string, { total: number; visits: number }> = {}
    for (const t of transactions) {
      if (t.amount_pence >= 0) continue
      const key = t.merchant_name ?? t.description
      if (!map[key]) map[key] = { total: 0, visits: 0 }
      map[key].total += Math.abs(t.amount_pence)
      map[key].visits += 1
    }
    return Object.entries(map)
      .map(([name, { total, visits }]) => ({ name, total_pence: total, visits }))
      .sort((a, b) => b.total_pence - a.total_pence)
      .slice(0, n)
  }, [transactions])

  const paydayPeriods = useCallback((): PaydayPeriod[] => {
    const income = allTransactions
      .filter(t => t.amount_pence > 50000 && t.category !== 'transfers') // Credits > £500, not transfers
      .sort((a, b) => a.booking_date.localeCompare(b.booking_date))

    if (income.length < 1) return []

    const periods: PaydayPeriod[] = []
    for (let i = 0; i < income.length; i++) {
      const start = income[i].booking_date
      const end = income[i + 1]
        ? new Date(new Date(income[i + 1].booking_date).getTime() - 86400000).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]

      const periodTxns = allTransactions.filter(t => t.booking_date >= start && t.booking_date <= end)
      const spendPence = periodTxns
        .filter(t => t.amount_pence < 0)
        .reduce((s, t) => s + Math.abs(t.amount_pence), 0)

      periods.push({
        start,
        end,
        income_pence: income[i].amount_pence,
        spend_pence: spendPence,
        transaction_count: periodTxns.length,
      })
    }

    return periods.reverse() // most recent first
  }, [allTransactions])

  const avgMonthlySavings = useCallback((): number => {
    // Average of last 3 months net (income - spend)
    const now = new Date()
    let totalNet = 0
    let months = 0

    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const { from, to } = monthRange(m)
      const monthTxns = allTransactions.filter(t => t.booking_date >= from && t.booking_date <= to)
      if (monthTxns.length === 0) continue
      const income = monthTxns.filter(t => t.amount_pence > 0 && t.category !== 'transfers').reduce((s, t) => s + t.amount_pence, 0)
      const spend = monthTxns.filter(t => t.amount_pence < 0).reduce((s, t) => s + Math.abs(t.amount_pence), 0)
      totalNet += income - spend
      months++
    }

    return months > 0 ? Math.round(totalNet / months) : 0
  }, [allTransactions])

  const buildImprovementCards = useCallback((): ImprovementCard[] => {
    const cards: ImprovementCard[] = []

    // Priority 1: unacknowledged price alerts
    for (const alert of priceAlerts.filter(a => !a.acknowledged)) {
      const sign = alert.change_pence > 0 ? '+' : ''
      cards.push({
        priority: 1,
        source: 'price_alert',
        icon: '⚠️',
        headline: `${alert.merchant_name} price changed`,
        detail: `${alert.merchant_name} went from £${(alert.old_amount_pence / 100).toFixed(2)} to £${(alert.new_amount_pence / 100).toFixed(2)} (${sign}£${(Math.abs(alert.change_pence) / 100).toFixed(2)}/mo).`,
        action_label: 'Dismiss',
        saving_estimate_pence: alert.change_pence > 0 ? alert.change_pence * 12 : undefined,
      })
    }

    // Priority 2: goals behind schedule
    const monthlySavings = avgMonthlySavings()
    for (const goal of goals.filter(g => !g.completed_at)) {
      if (!goal.target_date) continue
      const remaining = goal.target_pence - goal.current_pence
      if (remaining <= 0) continue
      const monthsNeeded = monthlySavings > 0 ? remaining / monthlySavings : Infinity
      const targetDate = new Date(goal.target_date)
      const monthsAvailable = (targetDate.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)
      if (monthsNeeded > monthsAvailable) {
        cards.push({
          priority: 2,
          source: 'goal',
          icon: '🎯',
          headline: `${goal.name} goal at risk`,
          detail: `Need £${(remaining / 100).toFixed(0)} more by ${new Date(goal.target_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}. At current savings rate you'll be ${Math.round(monthsNeeded - monthsAvailable)} months short.`,
          action_label: 'View goals',
        })
      }
    }

    // Priority 3: AI insights from most recent record
    const latestInsight = insights.find(i => i.insight_type === 'savings_recommendations')
    if (latestInsight) {
      for (const item of (latestInsight.payload as AIInsightItem[]).slice(0, 3)) {
        cards.push({
          priority: 3,
          source: 'ai_insight',
          icon: '💡',
          headline: item.title,
          detail: item.description,
          action_label: item.action,
          saving_estimate_pence: item.saving_estimate_pence ?? undefined,
        })
      }
    }

    // Priority 4: subscriptions with low recent usage (< 2 transactions in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const subGroups: Record<string, FinanceTransaction[]> = {}
    for (const t of allTransactions.filter(t => t.is_subscription && t.amount_pence < 0)) {
      const key = t.merchant_name ?? t.description
      if (!subGroups[key]) subGroups[key] = []
      subGroups[key].push(t)
    }
    for (const [name, txns] of Object.entries(subGroups)) {
      const recentCount = txns.filter(t => t.booking_date >= thirtyDaysAgo).length
      if (recentCount === 0 && txns.length > 0) {
        const avg = txns.reduce((s, t) => s + Math.abs(t.amount_pence), 0) / txns.length
        if (avg > 500) { // only flag > £5/mo
          cards.push({
            priority: 4,
            source: 'subscription',
            icon: '📋',
            headline: `${name} — possibly unused`,
            detail: `You're paying ~£${(avg / 100).toFixed(2)}/mo for ${name} but haven't used it in the last 30 days.`,
            action_label: 'Review subscriptions',
            saving_estimate_pence: avg * 12,
          })
        }
      }
    }

    return cards.sort((a, b) => a.priority - b.priority).slice(0, 6)
  }, [priceAlerts, goals, insights, allTransactions, avgMonthlySavings])

  return {
    // State
    connections,
    accounts,
    transactions,
    allTransactions,
    insights,
    netWorth,
    priceAlerts,
    goals,
    bills,
    selectedMonth,
    setSelectedMonth,
    viewMode,
    setViewMode,
    detailTab,
    setDetailTab,
    selectedPeriod,
    setSelectedPeriod,
    loading,
    syncing,
    insightsLoading,
    insightsStreamText,
    lastSynced,
    portfolio,
    portfolioLoading,
    loadPortfolio,
    loadAllTransactions,

    // Actions
    sync,
    connectBank,
    disconnectBank,
    generateInsights,
    dismissPriceAlert,
    createGoal,
    updateGoal,
    deleteGoal,

    // Derived
    totalBalance,
    spendByCategory,
    monthOverMonth,
    subscriptionsList,
    topMerchants,
    paydayPeriods,
    avgMonthlySavings,
    buildImprovementCards,
  }
}
