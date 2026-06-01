'use client'

import type { TransactionCategory } from './types'

interface Props {
  spendByCategory: Record<TransactionCategory, number>
}

const CAT_COLOUR: Record<TransactionCategory, string> = {
  food: '#f97316', transport: '#3b82f6', subscriptions: '#a855f7',
  entertainment: '#ec4899', health: '#22c55e', shopping: '#f43f5e',
  bills: '#eab308', income: '#00d4aa', transfers: '#64748b', other: '#475569',
}

const CAT_LABEL: Record<TransactionCategory, string> = {
  food: 'Food', transport: 'Transport', subscriptions: 'Subscriptions',
  entertainment: 'Entertainment', health: 'Health', shopping: 'Shopping',
  bills: 'Bills', income: 'Income', transfers: 'Transfers', other: 'Other',
}

function fmt(pence: number): string {
  if (pence >= 100000) return `£${(pence / 100000).toFixed(1)}k`
  return `£${(pence / 100).toFixed(0)}`
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
}

export default function CategoryPieChart({ spendByCategory }: Props) {
  const entries = Object.entries(spendByCategory)
    .filter(([cat, val]) => cat !== 'income' && cat !== 'transfers' && val > 0)
    .sort(([, a], [, b]) => b - a) as [TransactionCategory, number][]

  if (!entries.length) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '1rem', padding: '1.25rem' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginBottom: '8px' }}>Spending Breakdown</p>
        <p style={{ fontSize: '13px', color: '#334155', textAlign: 'center', padding: '1rem 0' }}>No spending data yet</p>
      </div>
    )
  }

  const total = entries.reduce((s, [, v]) => s + v, 0)
  const cx = 80; const cy = 80; const outerR = 70; const innerR = 42
  const GAP = 2

  let currentAngle = 0
  const segments = entries.map(([cat, val]) => {
    const angle = (val / total) * 360
    const seg = { cat, val, startAngle: currentAngle, endAngle: currentAngle + angle - GAP }
    currentAngle += angle
    return seg
  })

  const top = entries[0]

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '1rem', padding: '1.25rem' }}>
      <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginBottom: '1rem' }}>
        Spending Breakdown
      </p>

      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
        {/* Donut */}
        <div style={{ flexShrink: 0, position: 'relative' }}>
          <svg width="160" height="160" viewBox="0 0 160 160">
            {segments.map(({ cat, startAngle, endAngle }) => (
              <path
                key={cat}
                d={arcPath(cx, cy, outerR, startAngle, endAngle)}
                fill="none"
                stroke={CAT_COLOUR[cat]}
                strokeWidth={outerR - innerR}
                strokeLinecap="round"
                opacity={0.9}
              />
            ))}
            {/* Centre label */}
            <text x={cx} y={cy - 8} textAnchor="middle" fontSize="18" fontWeight="700" fill="#e2e8f0">{fmt(total)}</text>
            <text x={cx} y={cy + 10} textAnchor="middle" fontSize="10" fill="#475569">total spend</text>
          </svg>
        </div>

        {/* Legend */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
          {entries.slice(0, 7).map(([cat, val]) => {
            const pct = Math.round((val / total) * 100)
            return (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLOUR[cat], flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {CAT_LABEL[cat]}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', flexShrink: 0 }}>{fmt(val)}</span>
                <span style={{ fontSize: '11px', color: '#475569', flexShrink: 0, width: '28px', textAlign: 'right' }}>{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
