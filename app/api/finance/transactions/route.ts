import { NextRequest, NextResponse } from 'next/server'
import { financeSupabase } from '@/lib/finance'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const category = url.searchParams.get('category')
  const account_id = url.searchParams.get('account_id')
  const limit = parseInt(url.searchParams.get('limit') ?? '500')

  const sb = financeSupabase()

  let query = sb
    .from('finance_transactions')
    .select('*')
    .order('booking_date', { ascending: false })
    .limit(limit)

  if (from) query = query.gte('booking_date', from)
  if (to) query = query.lte('booking_date', to)
  if (category) query = query.eq('category', category)
  if (account_id) query = query.eq('account_id', account_id)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
