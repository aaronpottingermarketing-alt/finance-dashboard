'use client'

interface MonthBar {
  label: string   // 'Jun'
  total_pence: number
  isCurrent: boolean
}

interface Props {
  data: MonthBar[]
}

function fmt(pence: number): string {
  if (pence >= 100000) return `£${(pence / 100000).toFixed(1)}k`
  return `£${(pence / 100).toFixed(0)}`
}

export default function SpendingChart({ data }: Props) {
  if (!data.length) return null

  const maxVal = Math.max(...data.map(d => d.total_pence), 1)
  const W = 400
  const H = 100
  const PAD = { top: 10, right: 8, bottom: 22, left: 36 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const barW = Math.floor(innerW / data.length) - 4

  return (
    <div className="w-full">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">6-Month Spend</span>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28 mt-1" preserveAspectRatio="none">
        {/* Y axis labels */}
        <text x={PAD.left - 4} y={PAD.top + 4} textAnchor="end" fontSize="8" fill="#52525b">{fmt(maxVal)}</text>
        <text x={PAD.left - 4} y={PAD.top + innerH} textAnchor="end" fontSize="8" fill="#52525b">£0</text>
        {/* Gridline */}
        <line x1={PAD.left} y1={PAD.top + innerH} x2={PAD.left + innerW} y2={PAD.top + innerH} stroke="#27272a" strokeWidth="1" />

        {data.map((bar, i) => {
          const barH = (bar.total_pence / maxVal) * innerH
          const x = PAD.left + i * (innerW / data.length) + 2
          const y = PAD.top + innerH - barH

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx="2"
                fill={bar.isCurrent ? '#34d399' : '#3f3f46'}
                opacity={bar.isCurrent ? 1 : 0.7}
              />
              <title>{bar.label}: {fmt(bar.total_pence)}</title>
              <text
                x={x + barW / 2}
                y={H - 4}
                textAnchor="middle"
                fontSize="8"
                fill={bar.isCurrent ? '#a1a1aa' : '#52525b'}
              >
                {bar.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
