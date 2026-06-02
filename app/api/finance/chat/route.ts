export const maxDuration = 60

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { financeSupabase } from '@/lib/finance'
import type { FinanceTransaction, FinanceAccount, SavingsGoal } from '@/components/finance-dashboard/types'

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

function fmt(pence: number) {
  return `£${(Math.abs(pence) / 100).toFixed(2)}`
}

async function buildFinancialContext(sb: ReturnType<typeof financeSupabase>): Promise<string> {
  const now = new Date()
  const ninetyDaysAgo = new Date(now)
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const cutoff = ninetyDaysAgo.toISOString().split('T')[0]

  const [
    { data: accounts },
    { data: transactions },
    { data: goals },
  ] = await Promise.all([
    sb.from('finance_accounts').select('*'),
    sb.from('finance_transactions').select('*').gte('booking_date', cutoff).order('booking_date', { ascending: false }),
    sb.from('finance_savings_goals').select('*').is('completed_at', null),
  ])

  const accs = (accounts ?? []) as FinanceAccount[]
  const txns = (transactions ?? []) as FinanceTransaction[]
  const savingsGoals = (goals ?? []) as SavingsGoal[]

  // Accounts & balances
  const totalBalance = accs.reduce((s, a) => s + a.balance_pence, 0)
  const accountLines = accs.map(a => `  ${a.display_name} (${a.finance_connections?.bank_name ?? 'Bank'}): ${fmt(a.balance_pence)}`).join('\n')

  // Monthly summaries (last 3 months)
  const monthMap: Record<string, { income: number; spend: number; cats: Record<string, number> }> = {}
  for (const t of txns) {
    const month = t.booking_date.slice(0, 7)
    if (!monthMap[month]) monthMap[month] = { income: 0, spend: 0, cats: {} }
    if (t.amount_pence > 0 && t.category === 'income') {
      monthMap[month].income += t.amount_pence
    } else if (t.amount_pence < 0) {
      monthMap[month].spend += Math.abs(t.amount_pence)
      monthMap[month].cats[t.category] = (monthMap[month].cats[t.category] ?? 0) + Math.abs(t.amount_pence)
    }
  }

  const monthLines = Object.entries(monthMap)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 3)
    .map(([month, data]) => {
      const [y, m] = month.split('-').map(Number)
      const label = new Date(y, m - 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' })
      const topCats = Object.entries(data.cats).sort((a, b) => b[1] - a[1])
        .map(([cat, pence]) => `    ${cat}: ${fmt(pence)}`).join('\n')
      return `  ${label}: Income ${fmt(data.income)} | Spent ${fmt(data.spend)} | Net ${fmt(data.income - data.spend)}\n${topCats}`
    }).join('\n\n')

  // Top merchants (last 90 days, debits only)
  const merchantMap: Record<string, number> = {}
  for (const t of txns.filter(t => t.amount_pence < 0)) {
    const key = t.merchant_name ?? t.description
    merchantMap[key] = (merchantMap[key] ?? 0) + Math.abs(t.amount_pence)
  }
  const topMerchants = Object.entries(merchantMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([name, pence]) => `  ${name}: ${fmt(pence)}`).join('\n')

  // Active subscriptions
  const subMap: Record<string, number> = {}
  for (const t of txns.filter(t => t.category === 'subscriptions' && t.amount_pence < 0)) {
    const key = t.merchant_name ?? t.description.split(/\s+/).slice(0, 3).join(' ')
    subMap[key] = Math.abs(t.amount_pence)
  }
  const subLines = Object.entries(subMap).map(([name, pence]) => `  ${name}: ${fmt(pence)}/mo`).join('\n')

  // Savings goals
  const goalLines = savingsGoals.map(g =>
    `  ${g.name}: ${fmt(g.current_pence)} / ${fmt(g.target_pence)} (${Math.round(g.current_pence / g.target_pence * 100)}%)`
  ).join('\n')

  return `TODAY: ${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}

ACCOUNTS (total net worth: ${fmt(totalBalance)}):
${accountLines || '  No accounts found'}

LAST 3 MONTHS SUMMARY:
${monthLines || '  No transaction data'}

TOP MERCHANTS (last 90 days):
${topMerchants || '  No data'}

ACTIVE SUBSCRIPTIONS:
${subLines || '  None detected'}

SAVINGS GOALS:
${goalLines || '  No goals set'}
`
}

export async function POST(req: NextRequest) {
  const { messages, sessionId } = await req.json()
  if (!messages?.length) {
    return new Response(JSON.stringify({ error: 'messages required' }), { status: 400 })
  }

  const sb = financeSupabase()

  // Build financial context
  const context = await buildFinancialContext(sb)

  const system = `You are Aaron's personal finance assistant. You have complete access to his real banking data shown below.

${context}

Rules:
- Use exact £ figures from the data. Be direct and specific.
- Reference actual merchants and categories from his data.
- Keep responses concise — 2-4 sentences unless a detailed breakdown is asked for.
- Be conversational, not corporate. Treat Aaron like a friend who knows finance.
- If you spot something concerning in the data, flag it proactively.
- When asked about savings opportunities, be specific about which merchants or categories to target.`

  // Save user message to Supabase
  const userMessage = messages[messages.length - 1]
  let activeSessionId = sessionId

  try {
    if (!activeSessionId) {
      const { data: session } = await sb
        .from('finance_chat_sessions')
        .insert({ title: userMessage.content.slice(0, 60) })
        .select('id')
        .single()
      activeSessionId = session?.id
    }

    if (activeSessionId) {
      await sb.from('finance_chat_messages').insert({
        session_id: activeSessionId,
        role: 'user',
        content: userMessage.content,
      })
    }
  } catch { /* non-fatal */ }

  const encoder = new TextEncoder()
  let fullReply = ''

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = await getAnthropic().messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system,
          messages: messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        })

        for await (const chunk of anthropicStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            fullReply += chunk.delta.text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`))
          }
        }

        // Save assistant reply
        try {
          if (activeSessionId) {
            await sb.from('finance_chat_messages').insert({
              session_id: activeSessionId,
              role: 'assistant',
              content: fullReply,
            })
            await sb.from('finance_chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', activeSessionId)
          }
        } catch { /* non-fatal */ }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, sessionId: activeSessionId })}\n\n`))
        controller.close()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Chat failed'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg, done: true })}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
