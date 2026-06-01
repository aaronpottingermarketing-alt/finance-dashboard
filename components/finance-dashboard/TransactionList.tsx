'use client'

import { useState, useRef, useEffect } from 'react'
import type { FinanceTransaction, TransactionCategory } from './types'

interface Props {
  transactions: FinanceTransaction[]
  onRecategorise?: (id: string, category: TransactionCategory) => Promise<void>
}

const CATEGORIES: { value: TransactionCategory; label: string; emoji: string }[] = [
  { value: 'food', label: 'Food & drink', emoji: '🍔' },
  { value: 'transport', label: 'Transport', emoji: '🚂' },
  { value: 'subscriptions', label: 'Subscriptions', emoji: '↻' },
  { value: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { value: 'bills', label: 'Bills', emoji: '🏠' },
  { value: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { value: 'health', label: 'Health', emoji: '💊' },
  { value: 'income', label: 'Income', emoji: '💰' },
  { value: 'transfers', label: 'Transfers', emoji: '↔️' },
  { value: 'other', label: 'Other', emoji: '📦' },
]

const CAT_COLOUR: Record<TransactionCategory, string> = {
  food: '#f97316', transport: '#3b82f6', subscriptions: '#a855f7',
  entertainment: '#ec4899', health: '#22c55e', shopping: '#f43f5e',
  bills: '#eab308', income: '#00d4aa', transfers: '#64748b', other: '#475569',
}

const CAT_BG: Record<TransactionCategory, string> = {
  food: 'rgba(249,115,22,0.12)', transport: 'rgba(59,130,246,0.12)', subscriptions: 'rgba(168,85,247,0.12)',
  entertainment: 'rgba(236,72,153,0.12)', health: 'rgba(34,197,94,0.12)', shopping: 'rgba(244,63,94,0.12)',
  bills: 'rgba(234,179,8,0.12)', income: 'rgba(0,212,170,0.12)', transfers: 'rgba(100,116,139,0.12)', other: 'rgba(71,85,105,0.12)',
}

function fmt(pence: number): string {
  const sign = pence < 0 ? '-' : '+'
  return `${sign}£${(Math.abs(pence) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function groupByDate(txns: FinanceTransaction[]): [string, FinanceTransaction[]][] {
  const map = new Map<string, FinanceTransaction[]>()
  for (const t of txns) {
    if (!map.has(t.booking_date)) map.set(t.booking_date, [])
    map.get(t.booking_date)!.push(t)
  }
  return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
}

function formatDate(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function TransactionList({ transactions, onRecategorise }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pickerPos, setPickerPos] = useState({ top: 0, right: 0 })
  const [saving, setSaving] = useState(false)
  const [localOverrides, setLocalOverrides] = useState<Record<string, TransactionCategory>>({})
  const [showAll, setShowAll] = useState(false)

  // Close picker on outside click
  useEffect(() => {
    if (!editingId) return
    const handler = (e: MouseEvent) => {
      const picker = document.getElementById('cat-picker')
      if (picker && !picker.contains(e.target as Node)) setEditingId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [editingId])

  if (!transactions.length) {
    return <p style={{ textAlign: 'center', fontSize: '13px', color: '#334155', padding: '2rem 0' }}>No transactions for this period</p>
  }

  const sorted = [...transactions].sort((a, b) => b.booking_date.localeCompare(a.booking_date))
  const visible = showAll ? sorted : sorted.slice(0, 50)
  const groups = groupByDate(visible)

  function openPicker(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (editingId === id) { setEditingId(null); return }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const pickerW = 288
    const pickerH = 260
    const top = rect.bottom + window.scrollY + 4
    const right = Math.max(8, window.innerWidth - rect.right)
    // Flip above if not enough space below
    const finalTop = rect.bottom + pickerH > window.innerHeight
      ? rect.top + window.scrollY - pickerH - 4
      : top
    setPickerPos({ top: finalTop, right })
    setEditingId(id)
  }

  async function handleRecategorise(txn: FinanceTransaction, newCat: TransactionCategory) {
    setSaving(true)
    setLocalOverrides(prev => ({ ...prev, [txn.id]: newCat }))
    setEditingId(null)
    try {
      await fetch(`/api/finance/transactions/${txn.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCat }),
      })
      if (onRecategorise) await onRecategorise(txn.id, newCat)
    } finally {
      setSaving(false)
    }
  }

  const editingTxn = editingId ? sorted.find(t => t.id === editingId) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {groups.map(([date, txns]) => (
        <div key={date}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {formatDate(date)}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {txns.map(t => {
              const cat = localOverrides[t.id] ?? t.category
              const isEditing = editingId === t.id

              return (
                <div
                  key={t.id}
                  onClick={(e) => openPicker(e, t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                    background: isEditing ? 'rgba(0,212,170,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isEditing ? 'rgba(0,212,170,0.3)' : 'transparent'}`,
                    transition: 'background 0.1s',
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLOUR[cat], flexShrink: 0 }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.merchant_name ?? t.description}
                    </p>
                    {t.is_pending && <p style={{ fontSize: '11px', color: '#f59e0b' }}>Pending</p>}
                  </div>

                  <span style={{
                    fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', flexShrink: 0,
                    background: CAT_BG[cat], color: CAT_COLOUR[cat], textTransform: 'capitalize',
                  }}>
                    {cat}
                  </span>

                  <span style={{
                    fontSize: '13px', fontWeight: 600, flexShrink: 0, minWidth: '70px', textAlign: 'right',
                    color: t.amount_pence < 0 ? '#e2e8f0' : '#00d4aa',
                  }}>
                    {fmt(t.amount_pence)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Show more */}
      {transactions.length > 50 && (
        <button onClick={() => setShowAll(!showAll)} style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: 600,
          color: '#00d4aa', cursor: 'pointer', width: '100%',
        }}>
          {showAll ? 'Show less' : `Show all ${transactions.length} transactions`}
        </button>
      )}

      {/* Fixed category picker — renders at viewport level, never clipped */}
      {editingId && editingTxn && (
        <div
          id="cat-picker"
          style={{
            position: 'fixed',
            top: pickerPos.top,
            right: pickerPos.right,
            zIndex: 9999,
            background: '#111827',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '14px',
            padding: '10px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
            width: '288px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
          }}
        >
          <p style={{
            gridColumn: '1/-1', fontSize: '11px', color: '#475569',
            padding: '2px 4px 8px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Change category — {editingTxn.merchant_name ?? editingTxn.description}
          </p>
          {CATEGORIES.map(c => {
            const currentCat = localOverrides[editingTxn.id] ?? editingTxn.category
            const isActive = currentCat === c.value
            return (
              <button
                key={c.value}
                disabled={saving}
                onClick={(e) => { e.stopPropagation(); handleRecategorise(editingTxn, c.value) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '7px 10px', borderRadius: '9px',
                  border: isActive ? `1px solid ${CAT_COLOUR[c.value]}40` : '1px solid transparent',
                  background: isActive ? CAT_BG[c.value] : 'rgba(255,255,255,0.03)',
                  color: isActive ? CAT_COLOUR[c.value] : '#94a3b8',
                  fontSize: '12px', fontWeight: isActive ? 700 : 400,
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s',
                }}
              >
                <span style={{ fontSize: '14px' }}>{c.emoji}</span>
                {c.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
