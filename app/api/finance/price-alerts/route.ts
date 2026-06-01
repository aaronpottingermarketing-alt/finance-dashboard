export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { financeSupabase } from '@/lib/finance'

export async function GET() {
  const sb = financeSupabase()
  const { data, error } = await sb
    .from('finance_price_changes')
    .select('*')
    .order('detected_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const sb = financeSupabase()
  const { error } = await sb
    .from('finance_price_changes')
    .update({ acknowledged: true })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
