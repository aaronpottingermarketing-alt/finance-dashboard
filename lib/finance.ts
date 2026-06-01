import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type {
  FinanceTransaction,
  FinanceAccount,
  TransactionCategory,
  MonthSummary,
  InsightType,
  BillScheduleItem,
} from '@/components/finance-dashboard/types'

// ─── Encryption (AES-256-GCM, same scheme as lib/calendar.ts) ─────────────────

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16

function getKey(): Buffer {
  const key = process.env.FINANCE_ENCRYPT_KEY
  if (!key) throw new Error('FINANCE_ENCRYPT_KEY is not set')
  return Buffer.from(key.padEnd(32, '0').slice(0, 32), 'utf-8')
}

export function encrypt(text: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf-8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(data: string): string {
  const key = getKey()
  const parts = data.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted data')
  const [ivHex, authTagHex, encHex] = parts
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
  return Buffer.concat([
    decipher.update(Buffer.from(encHex, 'hex')),
    decipher.final(),
  ]).toString('utf-8')
}

// ─── Supabase client (service role — tokens are sensitive) ────────────────────

export function financeSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ─── TrueLayer ────────────────────────────────────────────────────────────────

const isSandbox = process.env.TRUELAYER_ENV === 'sandbox'
export const TL_AUTH_BASE = isSandbox
  ? 'https://auth.truelayer-sandbox.com'
  : 'https://auth.truelayer.com'
export const TL_DATA_BASE = isSandbox
  ? 'https://api.truelayer-sandbox.com'
  : 'https://api.truelayer.com'
// Token exchange endpoint (sandbox has its own)
const TL_TOKEN_URL = isSandbox
  ? 'https://auth.truelayer-sandbox.com/connect/token'
  : 'https://auth.truelayer.com/connect/token'

export const SUPPORTED_BANKS = [
  { id: 'BARCLAYS_PERSONAL_RRWFKBKU', name: 'Barclays', emoji: '🏦' },
  { id: 'ob-bcard', name: 'Barclaycard', emoji: '💳' },
  { id: 'ob-monzo', name: 'Monzo', emoji: '🟠' },
  { id: 'ob-starling', name: 'Starling', emoji: '🐦' },
  { id: 'ob-hsbc', name: 'HSBC', emoji: '🏛️' },
  { id: 'ob-natwest', name: 'NatWest', emoji: '🏦' },
  { id: 'ob-lloyds', name: 'Lloyds', emoji: '🏦' },
  { id: 'ob-nationwide', name: 'Nationwide', emoji: '🏠' },
  { id: 'ob-santander', name: 'Santander', emoji: '🏦' },
  { id: 'ob-halifax', name: 'Halifax', emoji: '🏦' },
]

// Build the TrueLayer OAuth URL
export function buildTrueLayerAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.TRUELAYER_CLIENT_ID!,
    scope: 'info accounts balance transactions offline_access',
    redirect_uri: redirectUri,
    state,
  })
  // Sandbox uses the mock provider; production uses all UK banks
  if (isSandbox) {
    params.set('providers', 'mock')
  } else {
    params.set('providers', 'uk-ob-all uk-oauth-all')
  }
  return `${TL_AUTH_BASE}/?${params}`
}

// Exchange an authorisation code for tokens
export async function exchangeTrueLayerCode(code: string, redirectUri: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const res = await fetch(TL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.TRUELAYER_CLIENT_ID!,
      client_secret: process.env.TRUELAYER_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      code,
    }),
  })
  if (!res.ok) throw new Error(`TrueLayer token exchange failed: ${await res.text()}`)
  return res.json()
}

// Get a valid access token for a connection, refreshing if needed
export async function getValidTrueLayerToken(connectionId: string): Promise<string | null> {
  const sb = financeSupabase()
  const { data } = await sb
    .from('finance_connections')
    .select('access_token, refresh_token, expires_at')
    .eq('id', connectionId)
    .single()

  if (!data?.access_token) return null

  const expiresAt = data.expires_at ? new Date(data.expires_at) : null
  const needsRefresh = !expiresAt || expiresAt.getTime() - Date.now() < 5 * 60 * 1000

  if (!needsRefresh) return decrypt(data.access_token)
  if (!data.refresh_token) return null

  try {
    const plainRefresh = decrypt(data.refresh_token)
    const res = await fetch(TL_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.TRUELAYER_CLIENT_ID!,
        client_secret: process.env.TRUELAYER_CLIENT_SECRET!,
        refresh_token: plainRefresh,
      }),
    })

    if (!res.ok) throw new Error(`Refresh failed: ${await res.text()}`)
    const tokens = await res.json()
    const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await sb.from('finance_connections').update({
      access_token: encrypt(tokens.access_token),
      expires_at: newExpiry,
    }).eq('id', connectionId)

    return tokens.access_token
  } catch {
    return null
  }
}

// Authenticated fetch against TrueLayer Data API
export async function tlFetch(connectionId: string, path: string): Promise<Response> {
  const token = await getValidTrueLayerToken(connectionId)
  if (!token) throw new Error(`No valid token for connection ${connectionId}`)
  return fetch(`${TL_DATA_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

// ─── Transaction categorisation ───────────────────────────────────────────────

const CATEGORY_RULES: { pattern: RegExp; category: TransactionCategory }[] = [
  { pattern: /deliveroo|uber\s*eats|just\s*eat|mcdonald|kfc|nandos|costa|greggs|pret|subway|domino|pizza|burger king|wagamama|itsu/i, category: 'food' },
  { pattern: /netflix|spotify|amazon\s*prime|disney\+?|apple\s*(tv|music|one)|patreon|youtube\s*premium|now\s*tv/i, category: 'subscriptions' },
  { pattern: /gym|membership|fitness|puregym|david lloyd|anytime fitness/i, category: 'subscriptions' },
  { pattern: /tfl|national\s*rail|trainline|govia|avanti|crosscountry|uber(?!\s*eats)|bolt|lyft|bus\s*pass|oyster|contactless\s*travel/i, category: 'transport' },
  { pattern: /amazon(?!\s*prime)|asos|zara|next\s|ebay|etsy|h&m|primark|topshop|boohoo|shein|vinted|depop|argos|currys/i, category: 'shopping' },
  { pattern: /sky\s|^bt\s|virgin\s*media|vodafone|ee\s|o2\s|three\s*uk|broadband|council\s*tax|water\s*(rates|bill)|electricity|gas\s*bill|sse\s|eon\s|octopus\s*energy|british\s*gas/i, category: 'bills' },
  { pattern: /pharmacy|boots(?!\s*optician)|superdrug|nhs|dentist|optician|specsavers|vision\s*express|lloyds\s*pharmacy|chemist/i, category: 'health' },
  { pattern: /salary|payroll|wages|bacs\s*credit|direct\s*credit|faster\s*payment\s*(received|in)|standing\s*order\s*(credit|in)/i, category: 'income' },
  { pattern: /transfer|sent\s*to|received\s*from|payment\s*to|standing\s*order(?!\s*(credit|in))/i, category: 'transfers' },
]

export function categoriseTransaction(description: string): TransactionCategory {
  const match = CATEGORY_RULES.find(r => r.pattern.test(description))
  return match?.category ?? 'other'
}

// ─── Subscription detection ───────────────────────────────────────────────────

export function detectSubscriptions(transactions: FinanceTransaction[]): Set<string> {
  const subscriptionIds = new Set<string>()

  const byMerchant: Record<string, FinanceTransaction[]> = {}
  for (const t of transactions) {
    if (t.amount_pence >= 0) continue
    const key = (t.merchant_name ?? t.description).toLowerCase().trim()
    if (!byMerchant[key]) byMerchant[key] = []
    byMerchant[key].push(t)
  }

  for (const [, txns] of Object.entries(byMerchant)) {
    if (txns.length < 2) continue
    const months = new Set(txns.map(t => t.booking_date.slice(0, 7)))
    if (months.size < 2) continue
    const amounts = txns.map(t => Math.abs(t.amount_pence))
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const allSimilar = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.1)
    if (!allSimilar) continue
    for (const t of txns) subscriptionIds.add(t.gc_transaction_id)
  }

  return subscriptionIds
}

// ─── Price change detection ───────────────────────────────────────────────────

export async function detectPriceChanges(
  newTransactions: FinanceTransaction[],
  supabase: SupabaseClient
): Promise<void> {
  const subscriptionTxns = newTransactions.filter(t => t.is_subscription && t.amount_pence < 0)

  for (const txn of subscriptionTxns) {
    const merchantKey = (txn.merchant_name ?? txn.description).toLowerCase().trim()

    const { data: previous } = await supabase
      .from('finance_transactions')
      .select('amount_pence, booking_date')
      .ilike('merchant_name', `%${merchantKey.slice(0, 20)}%`)
      .lt('booking_date', txn.booking_date)
      .eq('is_subscription', true)
      .order('booking_date', { ascending: false })
      .limit(1)
      .single()

    if (!previous) continue

    const prevAmount = Math.abs(previous.amount_pence)
    const newAmount = Math.abs(txn.amount_pence)
    const diff = newAmount - prevAmount

    if (Math.abs(diff) < 50) continue

    const { data: existing } = await supabase
      .from('finance_price_changes')
      .select('id')
      .eq('merchant_name', txn.merchant_name ?? txn.description)
      .eq('acknowledged', false)
      .limit(1)
      .single()

    if (existing) continue

    await supabase.from('finance_price_changes').insert({
      merchant_name: txn.merchant_name ?? txn.description,
      old_amount_pence: prevAmount,
      new_amount_pence: newAmount,
      change_pence: diff,
      first_seen_at: txn.booking_date,
    })
  }
}

// ─── Bill schedule ────────────────────────────────────────────────────────────

export function buildBillSchedule(transactions: FinanceTransaction[]): BillScheduleItem[] {
  const subscriptions = transactions.filter(t => t.is_subscription && t.amount_pence < 0)

  const byMerchant: Record<string, FinanceTransaction[]> = {}
  for (const t of subscriptions) {
    const key = t.merchant_name ?? t.description
    if (!byMerchant[key]) byMerchant[key] = []
    byMerchant[key].push(t)
  }

  const schedule: BillScheduleItem[] = []

  for (const [merchant, txns] of Object.entries(byMerchant)) {
    const days = txns.map(t => new Date(t.booking_date).getDate())
    const dayCount: Record<number, number> = {}
    for (const d of days) dayCount[d] = (dayCount[d] ?? 0) + 1
    const dayOfMonth = parseInt(
      Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0][0]
    )
    const totalPence = txns.reduce((s, t) => s + Math.abs(t.amount_pence), 0)
    const monthlyPence = Math.round(totalPence / txns.length)
    const lastCharged = txns.map(t => t.booking_date).sort().reverse()[0]
    schedule.push({ merchant_name: merchant, day_of_month: dayOfMonth, monthly_pence: monthlyPence, last_charged: lastCharged })
  }

  return schedule.sort((a, b) => a.day_of_month - b.day_of_month)
}

// ─── Month summary (for Claude insights) ─────────────────────────────────────

export function buildMonthSummary(
  transactions: FinanceTransaction[],
  accounts: FinanceAccount[],
  periodLabel: string
): MonthSummary {
  const debits = transactions.filter(t => t.amount_pence < 0)
  const credits = transactions.filter(t => t.amount_pence > 0 && t.category === 'income')

  const totalSpend = debits.reduce((s, t) => s + Math.abs(t.amount_pence), 0)
  const totalIncome = credits.reduce((s, t) => s + t.amount_pence, 0)

  const catMap: Record<string, { total: number; count: number }> = {}
  for (const t of debits) {
    if (!catMap[t.category]) catMap[t.category] = { total: 0, count: 0 }
    catMap[t.category].total += Math.abs(t.amount_pence)
    catMap[t.category].count += 1
  }
  const categories = Object.entries(catMap)
    .map(([name, { total, count }]) => ({ name, total_pence: total, transaction_count: count }))
    .sort((a, b) => b.total_pence - a.total_pence)

  const merchantMap: Record<string, { total: number; visits: number }> = {}
  for (const t of debits) {
    const key = t.merchant_name ?? t.description
    if (!merchantMap[key]) merchantMap[key] = { total: 0, visits: 0 }
    merchantMap[key].total += Math.abs(t.amount_pence)
    merchantMap[key].visits += 1
  }
  const topMerchants = Object.entries(merchantMap)
    .map(([name, { total, visits }]) => ({ name, total_pence: total, visits }))
    .sort((a, b) => b.total_pence - a.total_pence)
    .slice(0, 10)

  const subMap: Record<string, { total: number; last: string }> = {}
  for (const t of transactions.filter(t => t.is_subscription && t.amount_pence < 0)) {
    const key = t.merchant_name ?? t.description
    if (!subMap[key]) subMap[key] = { total: 0, last: t.booking_date }
    subMap[key].total += Math.abs(t.amount_pence)
    if (t.booking_date > subMap[key].last) subMap[key].last = t.booking_date
  }
  const subscriptions = Object.entries(subMap).map(([name, { total, last }]) => ({
    name, monthly_pence: total, last_charged: last,
  }))

  return { period: periodLabel, total_spend_pence: totalSpend, income_pence: totalIncome, categories, top_merchants: topMerchants, subscriptions }
}

// ─── Claude insights prompt ───────────────────────────────────────────────────

function formatGBP(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}

export function buildInsightsPrompt(
  summary: MonthSummary,
  prior: MonthSummary | null,
  type: InsightType
): { system: string; user: string } {
  const system = `You are a personal finance advisor for Aaron, a UK-based freelance copywriter.
Your job is to give specific, actionable advice — not vague generalisations.
Use exact £ figures from the data. Be direct. Name the specific merchant.

Return ONLY a valid JSON array with this exact shape — no preamble, no explanation, no markdown:
[
  {
    "title": "short label (4-6 words)",
    "description": "what you found with exact £ figures",
    "saving_estimate_pence": 3500,
    "action": "one specific, concrete thing to do",
    "category": "food"
  }
]

Rules:
- saving_estimate_pence is an integer in pence (e.g. 3500 = £35). Use null if no saving applies.
- Realistic savings only — not "cut X entirely" but "reduce X by half"
- 4–6 items maximum
- Categories: food, transport, subscriptions, entertainment, health, shopping, bills, other`

  const lines: string[] = [
    `Period: ${summary.period}`,
    `Total spent: ${formatGBP(summary.total_spend_pence)}`,
    `Income received: ${formatGBP(summary.income_pence)}`,
    '',
    'Spending by category:',
    ...summary.categories.map(c => `  ${c.name}: ${formatGBP(c.total_pence)} (${c.transaction_count} transactions)`),
    '',
    'Top merchants:',
    ...summary.top_merchants.slice(0, 8).map(m => `  ${m.name}: ${formatGBP(m.total_pence)} (${m.visits}x)`),
    '',
    'Recurring subscriptions:',
    ...summary.subscriptions.map(s => `  ${s.name}: ${formatGBP(s.monthly_pence)}/mo (last charged ${s.last_charged})`),
  ]

  if (prior) {
    lines.push('', `Prior month (${prior.period}) total: ${formatGBP(prior.total_spend_pence)}`)
    const diff = summary.total_spend_pence - prior.total_spend_pence
    lines.push(`Month-over-month change: ${diff >= 0 ? '+' : ''}${formatGBP(diff)}`)
  }

  const typeInstructions: Record<InsightType, string> = {
    savings_recommendations: 'Identify the top opportunities to reduce spending. Focus on the biggest categories and merchants.',
    subscription_audit: 'Review all subscriptions. Flag any that look expensive, duplicated, or potentially unused. Suggest specific cancellations or downgrades.',
    life_improvements: 'Suggest specific changes that would free up meaningful money AND improve quality of life. Not just cuts — smarter spending.',
  }

  lines.push('', `Task: ${typeInstructions[type]}`)
  return { system, user: lines.join('\n') }
}
