'use client'

import { useState } from 'react'

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
  const [hoveredPrev, setHoveredPrev] = useState(false)
  const [hoveredNext, setHoveredNext] = useState(false)


  const chevronBase: React.CSSProperties = {
    padding: '0.25rem',
    borderRadius: '0.25rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.15s',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {/* Previous month */}
      <button
        onClick={() => onChange(offsetMonth(value, -1))}
        onMouseEnter={() => setHoveredPrev(true)}
        onMouseLeave={() => setHoveredPrev(false)}
        style={{
          ...chevronBase,
          color: hoveredPrev ? '#00d4aa' : '#475569',
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <span
        style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#e2e8f0',
          width: '9rem',
          textAlign: 'center',
        }}
      >
        {formatMonth(value)}
      </span>

      {/* Next month */}
      <button
        onClick={() => onChange(offsetMonth(value, 1))}
        disabled={atCurrentMonth}
        onMouseEnter={() => setHoveredNext(true)}
        onMouseLeave={() => setHoveredNext(false)}
        style={{
          ...chevronBase,
          color: hoveredNext && !atCurrentMonth ? '#00d4aa' : '#475569',
          opacity: atCurrentMonth ? 0.3 : 1,
          cursor: atCurrentMonth ? 'not-allowed' : 'pointer',
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}
