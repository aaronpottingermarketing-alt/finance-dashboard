'use client'

import { useState, useEffect, useRef } from 'react'
import type { NetWorthSnapshot } from './types'

interface Props {
  data: NetWorthSnapshot[]
}

function fmt(pence: number): string {
  if (Math.abs(pence) >= 100000) return `£${(pence / 100000).toFixed(1)}k`
  if (Math.abs(pence) >= 1000) return `£${(pence / 100).toFixed(0)}`
  return `£${(pence / 100).toFixed(0)}`
}

function smoothPath(pts: { x: number; y: number }[], tension = 0.35): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(i + 2, pts.length - 1)]
    const cp1x = p1.x + (p2.x - p0.x) * tension
    const cp1y = p1.y + (p2.y - p0.y) * tension
    const cp2x = p2.x - (p3.x - p1.x) * tension
    const cp2y = p2.y - (p3.y - p1.y) * tension
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }
  return d
}

export default function NetWorthChart({ data }: Props) {
  const [period, setPeriod] = useState<'week' | 'month'>('month')
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)

  // Measure real container width — no stretching, no distortion
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const filtered = period === 'week' ? data.slice(-7) : data

  if (filtered.length < 2) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#334155', fontSize: '13px' }}>
        Sync a few more times to see your net worth trend
      </div>
    )
  }

  const W = containerWidth
  const H = 180
  const PAD = { top: 16, right: 16, bottom: 32, left: 52 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top - PAD.bottom

  const values = filtered.map(d => d.total_pence)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1
  const padded = range * 0.1
  const lo = minVal - padded
  const hi = maxVal + padded
  const rng = hi - lo

  const pts = filtered.map((d, i) => ({
    x: PAD.left + (i / (filtered.length - 1)) * iW,
    y: PAD.top + iH - ((d.total_pence - lo) / rng) * iH,
    d,
  }))

  const linePath = smoothPath(pts)
  const last = pts[pts.length - 1]
  const first = pts[0]
  const change = filtered[filtered.length - 1].total_pence - filtered[0].total_pence
  const isUp = change >= 0
  const lineColor = '#00d4aa'

  const areaPath = `${linePath} L ${last.x.toFixed(2)} ${PAD.top + iH} L ${PAD.left.toFixed(2)} ${PAD.top + iH} Z`

  const yLevels = [0, 0.33, 0.66, 1].map(pct => ({
    pence: lo + pct * rng,
    y: PAD.top + iH - pct * iH,
  }))

  const xCount = Math.min(7, filtered.length)
  const xIndices = Array.from({ length: xCount }, (_, i) =>
    Math.round(i * (filtered.length - 1) / (xCount - 1))
  )

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <span style={{ fontSize: '22px', fontWeight: 700, color: '#e2e8f0' }}>
            {fmt(filtered[filtered.length - 1].total_pence)}
          </span>
          <span style={{
            fontSize: '12px', fontWeight: 600,
            color: isUp ? '#00d4aa' : '#f87171',
            background: isUp ? 'rgba(0,212,170,0.1)' : 'rgba(248,113,113,0.1)',
            padding: '2px 8px', borderRadius: '20px',
          }}>
            {isUp ? '▲' : '▼'} {fmt(Math.abs(change))}
          </span>
        </div>

        <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', padding: '2px', background: 'rgba(255,255,255,0.05)' }}>
          {(['week', 'month'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '4px 14px', fontSize: '12px', fontWeight: 600,
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: period === p ? 'rgba(0,212,170,0.2)' : 'transparent',
              color: period === p ? '#00d4aa' : '#475569',
            }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Chart — measured container, pixel-perfect sizing */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {containerWidth > 0 && (
          <svg
            width={W}
            height={H}
            style={{ display: 'block', position: 'absolute', top: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="nw-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.2" />
                <stop offset="65%" stopColor="#00d4aa" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#00d4aa" stopOpacity="0" />
              </linearGradient>
              <filter id="line-glow" x="-5%" y="-50%" width="110%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Y axis grid + labels */}
            {yLevels.map(({ pence, y }, i) => (
              <g key={i}>
                <line x1={PAD.left} y1={y} x2={PAD.left + iW} y2={y}
                  stroke="rgba(255,255,255,0.05)" strokeWidth="1"
                  strokeDasharray={i === 0 ? '0' : '4 6'} />
                <text x={PAD.left - 8} y={y + 4} textAnchor="end"
                  fontSize="11" fill="#475569" fontFamily="system-ui, sans-serif">
                  {fmt(pence)}
                </text>
              </g>
            ))}

            {/* Area */}
            <path d={areaPath} fill="url(#nw-area-grad)" />

            {/* Glow line */}
            <path d={linePath} fill="none" stroke={lineColor}
              strokeWidth="4" strokeOpacity="0.15" filter="url(#line-glow)" />

            {/* Main line */}
            <path d={linePath} fill="none" stroke={lineColor}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

            {/* X axis labels */}
            {xIndices.map(idx => (
              <text key={idx} x={pts[idx].x} y={H - 6} textAnchor="middle"
                fontSize="11" fill="#475569" fontFamily="system-ui, sans-serif">
                {new Date(filtered[idx].date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </text>
            ))}

            {/* End dot */}
            <circle cx={last.x} cy={last.y} r="6" fill="#0a0e1a" stroke={lineColor} strokeWidth="2" />
            <circle cx={last.x} cy={last.y} r="3" fill={lineColor} />
          </svg>
        )}
      </div>
    </div>
  )
}
