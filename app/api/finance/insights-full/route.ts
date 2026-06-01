export const runtime = 'edge'

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { financeSupabase, buildMonthSummary } from '@/lib/finance'
import type { FinanceTransaction, FinanceAccount } from '@/components/finance-dashboard/types'

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

function monthRange(month: string): { from: string; to: string } {
  const [year, m] = month.split('-').map(Number)
  const from = `${month}-01`
  const lastDay = new Date(year, m, 0).getDate()
  const to = `${month}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

function priorMonthStr(month: string, offset: number): string {
  const [year, m] = month.split('-').map(Number)
  const d = new Date(year, m - 1 - offset, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatGBP(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}

function buildFullInsightsPrompt(
  months: Array<{ label: string; summary: ReturnType<typeof buildMonthSummary> }>
): { system: string; user: string } {
  const system = `You are a sharp personal finance advisor for Aaron, a UK-based freelance copywriter.
Your job is to deliver a rich, specific, data-driven financial analysis — not generic advice.

Rules:
- Use exact £ figures from the data. Name merchants directly. Be direct.
- Realistic savings only — not "cut X entirely" but "reduce X by half"
- Be specific: "You spent £87 at Deliveroo last month, mostly Friday evenings" not "you spend a lot on food"
- Return ONLY valid JSON matching the schema below — no preamble, no markdown, no explanation

Return this exact JSON shape:
{
  "headline": "One punchy sentence summarising the financial situation (e.g. 'You're spending 34% more than you earn this month')",
  "health_commentary": "2-3 sentences on overall financial health, referencing actual figures",
  "top_recommendations": [
    {
      "title": "Short label (4-6 words)",
      "detail": "Specific advice with exact £ figures and merchant names",
      "saving_pence": 3500,
      "urgency": "high",
      "category": "food"
    }
  ],
  "habit_patterns": [
    {
      "pattern": "Describe the specific pattern with merchant and timing if possible",
      "impact": "£X/mo, £Y/yr",
      "nudge": "One concrete behavioural change"
    }
  ],
  "biggest_win": {
    "title": "The single best saving opportunity (4-6 words)",
    "detail": "What it is and why it's the biggest lever",
    "saving_pence": 5000
  },
  "risks": [
    {
      "title": "Risk label",
      "detail": "What the risk is and what could go wrong",
      "severity": "high"
    }
  ]
}

Constraints:
- top_recommendations: 3-5 items, saving_pence in pence (null if no clear saving)
- habit_patterns: 2-4 items
- risks: 1-3 items
- urgency must be "high", "medium", or "low"
- severity must be "high" or "medium"`

  const lines: string[] = []

  for (const { label, summary } of months) {
    lines.push(`=== ${label} ===`)
    lines.push(`Total spent: ${formatGBP(summary.total_spend_pence)}`)
    lines.push(`Income received: ${formatGBP(summary.income_pence)}`)
    lines.push(`Net: ${formatGBP(summary.income_pence - summary.total_spend_pence)}`)
    lines.push('')
    lines.push('Spending by category:')
    for (const c of summary.categories.slice(0, 8)) {
      lines.push(`  ${c.name}: ${formatGBP(c.total_pence)} (${c.transaction_count} txns)`)
    }
    lines.push('')
    lines.push('Top merchants:')
    for (const m of summary.top_merchants.slice(0, 8)) {
      lines.push(`  ${m.name}: ${formatGBP(m.total_pence)} (${m.visits}x)`)
    }
    lines.push('')
    if (summary.subscriptions.length > 0) {
      lines.push('Subscriptions:')
      for (const s of summary.subscriptions) {
        lines.push(`  ${s.name}: ${formatGBP(s.monthly_pence)}/mo`)
      }
    }
    lines.push('')
  }

  lines.push('Task: Analyse all 3 months. Identify the headline financial story, top recommendations, habit patterns, the single biggest win, and any risks.')

  return { system, user: lines.join('\n') }
}

export async function POST(req: NextRequest) {
  const { period } = await req.json()
  if (!period) {
    return new Response(
      `data: ${JSON.stringify({ error: 'period is required' })}\n\n`,
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  const sb = financeSupabase()

  // Build last 3 months of data
  const monthSummaries: Array<{ label: string; summary: ReturnType<typeof buildMonthSummary> }> = []

  const { data: accounts } = await sb.from('finance_accounts').select('*')
  const accs = (accounts ?? []) as FinanceAccount[]

  for (let i = 0; i < 3; i++) {
    const m = priorMonthStr(period, i)
    const { from, to } = monthRange(m)
    const [year, month] = m.split('-').map(Number)
    const label = new Date(year, month - 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' })

    const { data: txns } = await sb
      .from('finance_transactions')
      .select('*')
      .gte('booking_date', from)
      .lte('booking_date', to)

    if (txns && txns.length > 0) {
      monthSummaries.push({
        label,
        summary: buildMonthSummary((txns as FinanceTransaction[]), accs, label),
      })
    }
  }

  // Derive period_start / period_end from the selected month
  const { from: periodStart, to: periodEnd } = monthRange(period)

  const { system, user } = buildFullInsightsPrompt(monthSummaries)

  const encoder = new TextEncoder()
  let fullText = ''

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = await getAnthropic().messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 2500,
          system,
          messages: [{ role: 'user', content: user }],
        })

        for await (const chunk of anthropicStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            fullText += chunk.delta.text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`))
          }
        }

        // Parse JSON and upsert to finance_ai_insights
        try {
          const payload = JSON.parse(fullText)
          await sb.from('finance_ai_insights').upsert({
            period_start: periodStart,
            period_end: periodEnd,
            insight_type: 'full_analysis',
            payload,
          }, { onConflict: 'period_start,insight_type' })
        } catch {
          // Store raw if parse fails
          await sb.from('finance_ai_insights').upsert({
            period_start: periodStart,
            period_end: periodEnd,
            insight_type: 'full_analysis',
            payload: { raw: fullText },
          }, { onConflict: 'period_start,insight_type' })
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
        controller.close()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to generate full analysis'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
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
