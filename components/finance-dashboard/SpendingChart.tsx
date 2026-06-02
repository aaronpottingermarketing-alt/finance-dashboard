'use client'

interface MonthBar {
  label: string
  month: string
  total_pence: number
  isCurrent: boolean
}

interface Props {
  data: MonthBar[]
  onBarClick?: (month: string) => void
}

function fmt(pence: number): string {
  if (pence >= 100000) return `£${(pence / 100000).toFixed(1)}k`
  return `£${(pence / 100).toFixed(0)}`
}

export default function SpendingChart({ data, onBarClick }: Props) {
  if (!data.length) return null

  const maxVal = Math.max(...data.map(d => d.total_pence), 1)
  const currentBar = data.find(d => d.isCurrent)

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '1rem',
      padding: '1.25rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginBottom: '4px' }}>
            Revenue Flow
          </p>
          {currentBar && (
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#e2e8f0', lineHeight: 1 }}>
              {fmt(currentBar.total_pence)}
              <span style={{ fontSize: '13px', fontWeight: 400, color: '#475569', marginLeft: '6px' }}>this month</span>
            </p>
          )}
        </div>
      </div>

      {/* Bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '160px' }}>
        {data.map((bar, i) => {
          const heightPct = Math.max((bar.total_pence / maxVal) * 100, 4)
          return (
            <div key={i}
              onClick={() => bar.total_pence > 0 && onBarClick?.(bar.month)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end', cursor: bar.total_pence > 0 && onBarClick ? 'pointer' : 'default' }}
            >
              {/* Value label above every bar */}
              <div style={{
                background: bar.isCurrent ? '#00d4aa' : 'rgba(255,255,255,0.08)',
                color: bar.isCurrent ? '#000' : '#94a3b8',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 7px',
                borderRadius: '20px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                visibility: bar.total_pence > 0 ? 'visible' : 'hidden',
              }}>
                {fmt(bar.total_pence)}
              </div>

              {/* Bar */}
              <div style={{
                width: '100%',
                height: `${heightPct}%`,
                background: bar.isCurrent
                  ? 'linear-gradient(180deg, #00d4aa 0%, #00a884 100%)'
                  : 'rgba(255,255,255,0.12)',
                borderRadius: '8px 8px 4px 4px',
                flexShrink: 0,
                boxShadow: bar.isCurrent ? '0 0 20px rgba(0,212,170,0.3)' : 'none',
              }} />

              {/* Month label */}
              <span style={{
                fontSize: '12px',
                fontWeight: bar.isCurrent ? 700 : 400,
                color: bar.isCurrent ? '#00d4aa' : '#64748b',
                flexShrink: 0,
              }}>
                {bar.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Y axis hints */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
        <span style={{ fontSize: '11px', color: '#334155' }}>£0</span>
        <span style={{ fontSize: '11px', color: '#334155' }}>{fmt(maxVal / 2)}</span>
        <span style={{ fontSize: '11px', color: '#334155' }}>{fmt(maxVal)}</span>
      </div>
    </div>
  )
}
