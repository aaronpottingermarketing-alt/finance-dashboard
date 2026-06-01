import { NextRequest, NextResponse } from 'next/server'
import { financeSupabase } from '@/lib/finance'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { category } = await req.json()
  if (!category) return NextResponse.json({ error: 'category required' }, { status: 400 })

  const sb = financeSupabase()
  const { data, error } = await sb
    .from('finance_transactions')
    .update({ category })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
