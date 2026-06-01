'use client'

import { useState } from 'react'
import type { SavingsGoal, FinanceAccount } from './types'

interface Props {
  goals: SavingsGoal[]
  accounts: FinanceAccount[]
  avgMonthlySavings: number
  onCreate: (goal: Omit<SavingsGoal, 'id' | 'created_at' | 'completed_at'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function fmt(pence: number): string {
  return (pence / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}

const COLOURS = ['emerald', 'blue', 'purple', 'amber', 'rose', 'sky'] as const
type GoalColour = typeof COLOURS[number]

const COLOUR_HEX: Record<GoalColour, string> = {
  emerald: '#10b981',
  blue: '#3b82f6',
  purple: '#a78bfa',
  amber: '#f59e0b',
  rose: '#f43f5e',
  sky: '#0ea5e9',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '0.5rem',
  padding: '6px 10px',
  fontSize: '12px',
  color: '#e2e8f0',
  outline: 'none',
}

export default function SavingsGoals({ goals, accounts, avgMonthlySavings, onCreate, onDelete }: Props) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<{
    name: string
    target: string
    target_date: string
    colour: GoalColour
    linked_account_id: string
  }>({ name: '', target: '', target_date: '', colour: 'emerald', linked_account_id: '' })
  const [saving, setSaving] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  function focusStyle(field: string): React.CSSProperties {
    return focusedField === field
      ? { ...inputStyle, border: '1px solid rgba(0,212,170,0.5)' }
      : inputStyle
  }

  async function handleCreate() {
    if (!form.name || !form.target) return
    setSaving(true)
    try {
      await onCreate({
        name: form.name,
        target_pence: Math.round(parseFloat(form.target) * 100),
        current_pence: 0,
        linked_account_id: form.linked_account_id || null,
        target_date: form.target_date || null,
        colour: form.colour,
      })
      setAdding(false)
      setForm({ name: '', target: '', target_date: '', colour: 'emerald', linked_account_id: '' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: '#475569' }}
        >
          Savings Goals
        </p>
        <button
          onClick={() => setAdding(!adding)}
          className="text-[11px] transition-colors"
          style={{ color: '#00d4aa' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {adding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {adding && (
        <div
          className="mb-3 p-3 flex flex-col gap-2"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '1rem',
          }}
        >
          <input
            placeholder="Goal name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
            style={focusStyle('name')}
          />
          <input
            placeholder="Target amount (£)"
            type="number"
            value={form.target}
            onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
            onFocus={() => setFocusedField('target')}
            onBlur={() => setFocusedField(null)}
            style={focusStyle('target')}
          />
          <input
            placeholder="Target date (optional)"
            type="date"
            value={form.target_date}
            onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
            onFocus={() => setFocusedField('date')}
            onBlur={() => setFocusedField(null)}
            style={focusStyle('date')}
          />
          {accounts.length > 0 && (
            <select
              value={form.linked_account_id}
              onChange={e => setForm(f => ({ ...f, linked_account_id: e.target.value }))}
              onFocus={() => setFocusedField('account')}
              onBlur={() => setFocusedField(null)}
              style={focusStyle('account')}
            >
              <option value="">Link to account (optional)</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.display_name}</option>
              ))}
            </select>
          )}
          {/* Colour picker */}
          <div className="flex gap-1.5">
            {COLOURS.map(c => (
              <button
                key={c}
                onClick={() => setForm(f => ({ ...f, colour: c }))}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: COLOUR_HEX[c],
                  outline: form.colour === c ? `2px solid ${COLOUR_HEX[c]}` : 'none',
                  outlineOffset: '2px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
          <button
            onClick={handleCreate}
            disabled={saving || !form.name || !form.target}
            className="w-full py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-50"
            style={{
              background: 'rgba(0,212,170,0.15)',
              border: '1px solid rgba(0,212,170,0.3)',
              color: '#00d4aa',
              borderRadius: '0.5rem',
            }}
          >
            {saving ? 'Saving…' : 'Add Goal'}
          </button>
        </div>
      )}

      {!goals.length && !adding && (
        <p className="text-xs" style={{ color: '#334155' }}>No goals yet. Add one to track your savings.</p>
      )}

      <div className="flex flex-col gap-2">
        {goals.map(goal => {
          const pct = Math.min(100, Math.round((goal.current_pence / goal.target_pence) * 100))
          const remaining = goal.target_pence - goal.current_pence
          const monthsToGo = avgMonthlySavings > 0 ? remaining / avgMonthlySavings : null
          const barColour = COLOUR_HEX[goal.colour as GoalColour] ?? COLOUR_HEX.emerald

          return (
            <div
              key={goal.id}
              className="px-3 py-2.5"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '1rem',
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium" style={{ color: '#e2e8f0' }}>{goal.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: '#475569' }}>{pct}%</span>
                  <button
                    onClick={() => onDelete(goal.id)}
                    className="text-[10px] transition-colors"
                    style={{ color: '#334155' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#475569')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#334155')}
                  >
                    ✕
                  </button>
                </div>
              </div>
              {/* Progress bar */}
              <div
                className="w-full h-1.5 mb-1.5 overflow-hidden rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: barColour }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: '#475569' }}>
                  {fmt(goal.current_pence)} of {fmt(goal.target_pence)}
                </span>
                {monthsToGo !== null && !goal.completed_at && remaining > 0 && (
                  <span className="text-[10px]" style={{ color: '#334155' }}>~{Math.ceil(monthsToGo)}mo remaining</span>
                )}
                {goal.completed_at && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{
                      color: '#00d4aa',
                      background: 'rgba(0,212,170,0.12)',
                      border: '1px solid rgba(0,212,170,0.2)',
                    }}
                  >
                    ✓ Done
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
