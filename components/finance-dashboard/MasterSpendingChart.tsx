'use client'

import type { TransactionCategory } from './types'
import { CATEGORY_BAR } from './types'

interface MonthData {
  label: string
  isCurrent: boolean
  categories: Partial<Record<TransactionCategory, number>>
  total: number
}

interface Props {
  data: MonthData[]
}

function fmt(pence: number): string {
  if (pence >= 100000) return `£${(pence / 100000).toFixed(1)}k`
  return `£${(pence / 100).toFixed(0)}`
}

const STACK_CATEGORIES: TransactionCategory[] = [
  'food', 'transport', 'subscriptions', 'shopping', 'bills', 'entertainment', 'health', 'other'
]

// Tailwind hex approximations for SVG fill (can't use Tailwind classes in SVG)
const CATEGORY_HEX: Record<TransactionCategory, string> = {
  food: '#f97316',
  transport: '#3b82f6',
  subscriptions: '#a855f7',
  entertainment: '#ec4899',
  health: '#22c55e',
  shopping: '#f43f5e',
  bills: '#eab308',
  income: '#10b981',
  transfers: '#0ea5e9',
  other: '#71717a',
}

export default function MasterSpendingChart({ data }: Props) {
  if (!data.length) return null

  const maxVal = Math.max(...data.map(d => d.total), 1)
  const W = 480
  const H = 120
  const PAD = { top: 12, right: 8, bottom: 24, left: 40 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const barW = Math.floor(innerW / data.length) - 6

  return (
    <div className="w-full">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Monthly Spend</span>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32 mt-1" preserveAspectRatio="none">
        {/* Y labels */}
        <text x={PAD.left - 4} y={PAD.top + 4} textAnchor="end" fontSize="8" fill="#52525b">{fmt(maxVal)}</text>
        <text x={PAD.left - 4} y={PAD.top + innerH} textAnchor="end" fontSize="8" fill="#52525b">£0</text>
        {/* Baseline */}
        <line x1={PAD.left} y1={PAD.top + innerH} x2={PAD.left + innerW} y2={PAD.top + innerH} stroke="#27272a" strokeWidth="1" />

        {data.map((bar, i) => {
          const x = PAD.left + i * (innerW / data.length) + 3
          let yOffset = 0
          const totalH = (bar.total / maxVal) * innerH

          return (
            <g key={i}>
              {/* Stacked segments */}
              {STACK_CATEGORIES.map(cat => {
                const val = bar.categories[cat] ?? 0
                if (!val) return null
                const segH = (val / maxVal) * innerH
                const segY = PAD.top + innerH - totalH + yOffset
                yOffset += segH
                return (
                  <rect
                    key={cat}
                    x={x}
                    y={segY}
                    width={barW}
                    height={segH}
                    fill={CATEGORY_HEX[cat]}
                    opacity={bar.isCurrent ? 0.9 : 0.5}
                  />
                )
              })}
              {/* Bar outline for current month */}
              {bar.isCurrent && (
                <rect
                  x={x}
                  y={PAD.top + innerH - totalH}
                  width={barW}
                  height={totalH}
                  fill="none"
                  stroke="#a1a1aa"
                  strokeWidth="0.5"
                  rx="1"
                />
              )}
              {/* Label */}
              <text
                x={x + barW / 2}
                y={H - 6}
                textAnchor="middle"
                fontSize="8"
                fill={bar.isCurrent ? '#a1a1aa' : '#52525b'}
                fontWeight={bar.isCurrent ? 'bold' : 'normal'}
              >
                {bar.label}
              </text>
              <title>{bar.label}: {fmt(bar.total)}</title>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
