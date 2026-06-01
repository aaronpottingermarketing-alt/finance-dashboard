'use client'

interface Props {
  value: string // 'YYYY-MM'
  onChange: (month: string) => void
}

function formatMonth(m: string): string {
  const [year, month] = m.split('-').map(Number)
  return new Date(year, month - 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' })
}

function offsetMonth(m: string, delta: number): string {
  const [year, month] = m.split('-').map(Number)
  const d = new Date(year, month - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function isCurrentMonth(m: string): boolean {
  const now = new Date()
  return m === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function MonthSelector({ value, onChange }: Props) {
  const atCurrentMonth = isCurrentMonth(value)

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(offsetMonth(value, -1))}
        className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <span className="text-sm font-medium text-zinc-200 w-36 text-center">
        {formatMonth(value)}
      </span>

      <button
        onClick={() => onChange(offsetMonth(value, 1))}
        disabled={atCurrentMonth}
        className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-30"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}
