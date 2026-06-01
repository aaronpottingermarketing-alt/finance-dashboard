export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { financeSupabase } from '@/lib/finance'

export async function GET() {
  const sb = financeSupabase()
  const { data, error } = await sb
    .from('finance_connections')
    .select('*')
    .neq('status', 'revoked')
    .order('connected_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function DELETE(req: NextRequest) {
  const { connection_id } = await req.json()
  if (!connection_id) {
    return NextResponse.json({ error: 'connection_id is required' }, { status: 400 })
  }

  const sb = financeSupabase()
  const { error } = await sb
    .from('finance_connections')
    .update({ status: 'revoked' })
    .eq('id', connection_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
