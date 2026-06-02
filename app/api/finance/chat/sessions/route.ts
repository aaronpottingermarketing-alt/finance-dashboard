import { NextRequest, NextResponse } from 'next/server'
import { financeSupabase } from '@/lib/finance'

export async function GET(req: NextRequest) {
  const sb = financeSupabase()
  const id = new URL(req.url).searchParams.get('id')

  // Load messages for a specific session
  if (id) {
    const { data, error } = await sb
      .from('finance_chat_messages')
      .select('role, content')
      .eq('session_id', id)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  }

  // List all sessions
  const { data, error } = await sb
    .from('finance_chat_sessions')
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
