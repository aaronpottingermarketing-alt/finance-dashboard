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

  // Get the transaction so we know the merchant name
  const { data: txn, error: fetchErr } = await sb
    .from('finance_transactions')
    .select('id, merchant_name, description')
    .eq('id', id)
    .single()

  if (fetchErr || !txn) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

  const merchantKey = (txn.merchant_name ?? txn.description ?? '').toLowerCase().trim()

  // 1. Save the merchant rule
  if (merchantKey) {
    await sb.from('finance_merchant_rules').upsert(
      { merchant_key: merchantKey, category, updated_at: new Date().toISOString() },
      { onConflict: 'merchant_key' }
    )
  }

  // 2. Update ALL transactions from this merchant across all time
  if (merchantKey) {
    await sb
      .from('finance_transactions')
      .update({ category })
      .or(`merchant_name.ilike.${merchantKey},description.ilike.${merchantKey}`)
  } else {
    // Fallback: just update this one transaction
    await sb.from('finance_transactions').update({ category }).eq('id', id)
  }

  // Return the updated transaction
  const { data: updated } = await sb
    .from('finance_transactions')
    .select()
    .eq('id', id)
    .single()

  return NextResponse.json(updated)
}
