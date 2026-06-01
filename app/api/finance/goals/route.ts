import { NextRequest, NextResponse } from 'next/server'
import { financeSupabase } from '@/lib/finance'

export async function GET() {
  const sb = financeSupabase()
  const { data, error } = await sb
    .from('finance_savings_goals')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, target_pence, linked_account_id, target_date, colour } = body

  if (!name || !target_pence) {
    return NextResponse.json({ error: 'name and target_pence are required' }, { status: 400 })
  }

  const sb = financeSupabase()

  // If linked to an account, seed current_pence from its balance
  let current_pence = body.current_pence ?? 0
  if (linked_account_id) {
    const { data: account } = await sb
      .from('finance_accounts')
      .select('balance_pence')
      .eq('id', linked_account_id)
      .single()
    if (account) current_pence = account.balance_pence
  }

  const { data, error } = await sb
    .from('finance_savings_goals')
    .insert({
      name,
      target_pence,
      current_pence,
      linked_account_id: linked_account_id ?? null,
      target_date: target_date ?? null,
      colour: colour ?? 'emerald',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
