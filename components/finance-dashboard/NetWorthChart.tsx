'use client'

import type { NetWorthSnapshot } from './types'

interface Props {
  data: NetWorthSnapshot[]
}

function fmt(pence: number): string {
  if (Math.abs(pence) >= 100000) return `£${(pence / 100000).toFixed(1)}k`
  return `£${(pence / 100).toFixed(0)}`
}

export default function NetWorthChart({ data }: Props) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-zinc-600">
        Not enough data yet — sync a few more times to see your net worth trend
      </div>
    )
  }

  const W = 560
  const H = 80
  const PAD = { top: 8, right: 12, bottom: 20, left: 40 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const values = data.map(d => d.total_pence)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1

  const points = data.map((d, i) => {
    const x = PAD.left + (i / (data.length - 1)) * innerW
    const y = PAD.top + innerH - ((d.total_pence - minVal) / range) * innerH
    return { x, y, d }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaD = `${pathD} L ${points[points.length - 1].x} ${PAD.top + innerH} L ${PAD.left} ${PAD.top + innerH} Z`

  const latest = data[data.length - 1]
  const first = data[0]
  const change = latest.total_pence - first.total_pence
  const changePositive = change >= 0

  // Show ~5 date labels
  const labelStep = Math.max(1, Math.floor(data.length / 5))
  const labelPoints = points.filter((_, i) => i % labelStep === 0 || i === points.length - 1)

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-1 px-0.5">
        <span className="text-xs font-medium text-zinc-400">Net Worth</span>
        <span className={`text-xs font-medium ${changePositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {changePositive ? '▲' : '▼'} {fmt(Math.abs(change))} this period
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
        {/* Area fill */}
        <defs>
          <linearGradient id="nw-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={changePositive ? '#34d399' : '#f87171'} stopOpacity="0.15" />
            <stop offset="100%" stopColor={changePositive ? '#34d399' : '#f87171'} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#nw-grad)" />
        {/* Line */}
        <path d={pathD} fill="none" stroke={changePositive ? '#34d399' : '#f87171'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Y axis labels */}
        <text x={PAD.left - 4} y={PAD.top + 4} textAnchor="end" fontSize="9" fill="#52525b">{fmt(maxVal)}</text>
        <text x={PAD.left - 4} y={PAD.top + innerH} textAnchor="end" fontSize="9" fill="#52525b">{fmt(minVal)}</text>
        {/* X axis date labels */}
        {labelPoints.map((p, i) => (
          <text key={i} x={p.x} y={H - 2} textAnchor="middle" fontSize="8" fill="#52525b">
            {new Date(p.d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </text>
        ))}
      </svg>
    </div>
  )
}
