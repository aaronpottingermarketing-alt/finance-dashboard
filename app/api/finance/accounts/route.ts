
import { NextResponse } from 'next/server'
import { financeSupabase } from '@/lib/finance'

export async function GET() {
  const sb = financeSupabase()

  const { data, error } = await sb
    .from('finance_accounts')
    .select(`
      *,
      finance_connections (
        bank_name,
        status
      )
    `)
    .order('synced_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
