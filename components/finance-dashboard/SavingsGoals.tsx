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

const COLOURS = ['emerald', 'blue', 'purple', 'amber', 'rose', 'sky']

const COLOUR_BAR: Record<string, string> = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  sky: 'bg-sky-500',
}

export default function SavingsGoals({ goals, accounts, avgMonthlySavings, onCreate, onDelete }: Props) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', target: '', target_date: '', colour: 'emerald', linked_account_id: '' })
  const [saving, setSaving] = useState(false)

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
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Savings Goals</p>
        <button
          onClick={() => setAdding(!adding)}
          className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {adding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {adding && (
        <div className="mb-3 p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col gap-2">
          <input
            placeholder="Goal name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
          <input
            placeholder="Target amount (£)"
            type="number"
            value={form.target}
            onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
          <input
            placeholder="Target date (optional)"
            type="date"
            value={form.target_date}
            onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
          {accounts.length > 0 && (
            <select
              value={form.linked_account_id}
              onChange={e => setForm(f => ({ ...f, linked_account_id: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
            >
              <option value="">Link to account (optional)</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.display_name}</option>
              ))}
            </select>
          )}
          <div className="flex gap-1">
            {COLOURS.map(c => (
              <button
                key={c}
                onClick={() => setForm(f => ({ ...f, colour: c }))}
                className={`w-4 h-4 rounded-full ${COLOUR_BAR[c]} ${form.colour === c ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-900' : ''}`}
              />
            ))}
          </div>
          <button
            onClick={handleCreate}
            disabled={saving || !form.name || !form.target}
            className="w-full py-1.5 text-xs font-medium bg-zinc-100 text-zinc-900 rounded hover:bg-white transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Add Goal'}
          </button>
        </div>
      )}

      {!goals.length && !adding && (
        <p className="text-xs text-zinc-600">No goals yet. Add one to track your savings.</p>
      )}

      <div className="flex flex-col gap-2">
        {goals.map(goal => {
          const pct = Math.min(100, Math.round((goal.current_pence / goal.target_pence) * 100))
          const remaining = goal.target_pence - goal.current_pence
          const monthsToGo = avgMonthlySavings > 0 ? remaining / avgMonthlySavings : null
          const barClass = COLOUR_BAR[goal.colour] ?? 'bg-emerald-500'

          return (
            <div key={goal.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-zinc-200">{goal.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500">{pct}%</span>
                  <button onClick={() => onDelete(goal.id)} className="text-[10px] text-zinc-700 hover:text-zinc-500">✕</button>
                </div>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-1.5 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${barClass}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">{fmt(goal.current_pence)} of {fmt(goal.target_pence)}</span>
                {monthsToGo !== null && !goal.completed_at && remaining > 0 && (
                  <span className="text-[10px] text-zinc-600">~{Math.ceil(monthsToGo)}mo</span>
                )}
                {goal.completed_at && (
                  <span className="text-[10px] text-emerald-400">✓ Done</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
