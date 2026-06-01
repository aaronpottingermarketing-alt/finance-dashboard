import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { financeSupabase, buildMonthSummary, buildInsightsPrompt } from '@/lib/finance'
import type { FinanceTransaction, FinanceAccount, InsightType } from '@/components/finance-dashboard/types'

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const period = url.searchParams.get('period') // 'YYYY-MM'
  if (!period) return NextResponse.json({ error: 'period is required' }, { status: 400 })

  const sb = financeSupabase()
  const { data, error } = await sb
    .from('finance_ai_insights')
    .select('*')
    .gte('period_start', `${period}-01`)
    .lte('period_start', `${period}-31`)
    .order('generated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { period, insight_type } = await req.json()
  if (!period || !insight_type) {
    return NextResponse.json({ error: 'period and insight_type are required' }, { status: 400 })
  }

  const [year, month] = period.split('-').map(Number)
  const periodStart = new Date(year, month - 1, 1).toISOString().split('T')[0]
  const periodEnd = new Date(year, month, 0).toISOString().split('T')[0]

  // Prior month
  const priorDate = new Date(year, month - 2, 1)
  const priorStart = priorDate.toISOString().split('T')[0]
  const priorEnd = new Date(year, month - 1, 0).toISOString().split('T')[0]

  const sb = financeSupabase()

  const [{ data: txns }, { data: priorTxns }, { data: accounts }] = await Promise.all([
    sb.from('finance_transactions').select('*').gte('booking_date', periodStart).lte('booking_date', periodEnd),
    sb.from('finance_transactions').select('*').gte('booking_date', priorStart).lte('booking_date', priorEnd),
    sb.from('finance_accounts').select('*'),
  ])

  const periodLabel = new Date(year, month - 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' })
  const priorLabel = new Date(year, month - 2).toLocaleString('en-GB', { month: 'long', year: 'numeric' })

  const summary = buildMonthSummary(
    (txns ?? []) as FinanceTransaction[],
    (accounts ?? []) as FinanceAccount[],
    periodLabel
  )

  const priorSummary = priorTxns?.length
    ? buildMonthSummary(
        priorTxns as FinanceTransaction[],
        (accounts ?? []) as FinanceAccount[],
        priorLabel
      )
    : null

  const { system, user } = buildInsightsPrompt(summary, priorSummary, insight_type as InsightType)

  const encoder = new TextEncoder()
  let fullText = ''

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = await getAnthropic().messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          system,
          messages: [{ role: 'user', content: user }],
        })

        for await (const chunk of anthropicStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            fullText += chunk.delta.text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`))
          }
        }

        // Parse and store
        try {
          const payload = JSON.parse(fullText)
          await sb.from('finance_ai_insights').upsert({
            period_start: periodStart,
            period_end: periodEnd,
            insight_type,
            payload,
          }, { onConflict: 'period_start,insight_type' })
        } catch {
          // JSON parse failed — store raw text
          await sb.from('finance_ai_insights').upsert({
            period_start: periodStart,
            period_end: periodEnd,
            insight_type,
            payload: [{ title: 'Analysis', description: fullText, saving_estimate_pence: null, action: '', category: null }],
          }, { onConflict: 'period_start,insight_type' })
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
        controller.close()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to generate insights'
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
