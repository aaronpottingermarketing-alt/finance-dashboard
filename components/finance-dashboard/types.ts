export type TransactionCategory =
  | 'food'
  | 'transport'
  | 'subscriptions'
  | 'entertainment'
  | 'health'
  | 'shopping'
  | 'bills'
  | 'income'
  | 'transfers'
  | 'other'

export type InsightType =
  | 'savings_recommendations'
  | 'subscription_audit'
  | 'life_improvements'

export type FinanceConnection = {
  id: string
  institution_id: string
  bank_name: string
  requisition_id: string
  agreement_id: string
  agreement_expires: string
  status: 'active' | 'expired' | 'pending' | 'revoked'
  connected_at: string
}

export type FinanceAccount = {
  id: string
  connection_id: string
  gc_account_id: string
  display_name: string
  account_type: string | null
  currency: string
  balance_pence: number
  balance_at: string | null
  synced_at: string
}

export type FinanceTransaction = {
  id: string
  account_id: string
  gc_transaction_id: string
  booking_date: string
  value_date: string | null
  description: string
  amount_pence: number
  currency: string
  category: TransactionCategory
  merchant_name: string | null
  is_pending: boolean
  is_subscription: boolean
}

export type AIInsightItem = {
  title: string
  description: string
  saving_estimate_pence: number | null
  action: string
  category: TransactionCategory | null
}

export type AIInsight = {
  id: string
  period_start: string
  period_end: string
  insight_type: InsightType
  payload: AIInsightItem[]
  generated_at: string
}

export type SupportedBank = {
  id: string
  name: string
}

export type NetWorthSnapshot = {
  date: string
  total_pence: number
}

export type PaydayPeriod = {
  start: string
  end: string
  income_pence: number
  spend_pence: number
  transaction_count: number
}

export type PriceChange = {
  id: string
  merchant_name: string
  old_amount_pence: number
  new_amount_pence: number
  change_pence: number
  first_seen_at: string
  detected_at: string
  acknowledged: boolean
}

export type SavingsGoal = {
  id: string
  name: string
  target_pence: number
  current_pence: number
  linked_account_id: string | null
  target_date: string | null
  colour: string
  created_at: string
  completed_at: string | null
}

export type BillScheduleItem = {
  merchant_name: string
  day_of_month: number
  monthly_pence: number
  last_charged: string
}

export type MonthSummary = {
  period: string
  total_spend_pence: number
  income_pence: number
  categories: { name: string; total_pence: number; transaction_count: number }[]
  top_merchants: { name: string; total_pence: number; visits: number }[]
  subscriptions: { name: string; monthly_pence: number; last_charged: string }[]
}

export type ImprovementCard = {
  priority: 1 | 2 | 3 | 4
  source: 'price_alert' | 'goal' | 'ai_insight' | 'subscription'
  icon: string
  headline: string
  detail: string
  action_label?: string
  saving_estimate_pence?: number
}

export const CATEGORY_COLOURS: Record<TransactionCategory, string> = {
  food: 'orange',
  transport: 'blue',
  subscriptions: 'purple',
  entertainment: 'pink',
  health: 'green',
  shopping: 'rose',
  bills: 'yellow',
  income: 'emerald',
  transfers: 'sky',
  other: 'zinc',
}

export const CATEGORY_BG: Record<TransactionCategory, string> = {
  food: 'bg-orange-500/20 text-orange-300',
  transport: 'bg-blue-500/20 text-blue-300',
  subscriptions: 'bg-purple-500/20 text-purple-300',
  entertainment: 'bg-pink-500/20 text-pink-300',
  health: 'bg-green-500/20 text-green-300',
  shopping: 'bg-rose-500/20 text-rose-300',
  bills: 'bg-yellow-500/20 text-yellow-300',
  income: 'bg-emerald-500/20 text-emerald-300',
  transfers: 'bg-sky-500/20 text-sky-300',
  other: 'bg-zinc-500/20 text-zinc-400',
}

export const CATEGORY_DOT: Record<TransactionCategory, string> = {
  food: 'bg-orange-400',
  transport: 'bg-blue-400',
  subscriptions: 'bg-purple-400',
  entertainment: 'bg-pink-400',
  health: 'bg-green-400',
  shopping: 'bg-rose-400',
  bills: 'bg-yellow-400',
  income: 'bg-emerald-400',
  transfers: 'bg-sky-400',
  other: 'bg-zinc-500',
}

export const CATEGORY_BAR: Record<TransactionCategory, string> = {
  food: 'bg-orange-500',
  transport: 'bg-blue-500',
  subscriptions: 'bg-purple-500',
  entertainment: 'bg-pink-500',
  health: 'bg-green-500',
  shopping: 'bg-rose-500',
  bills: 'bg-yellow-500',
  income: 'bg-emerald-500',
  transfers: 'bg-sky-500',
  other: 'bg-zinc-600',
}
