'use client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FullAnalysisRecommendation = {
  title: string
  detail: string
  saving_pence: number | null
  urgency: 'high' | 'medium' | 'low'
  category: string
}

export type FullAnalysisHabitPattern = {
  pattern: string
  impact: string
  nudge: string
}

export type FullAnalysisRisk = {
  title: string
  detail: string
  severity: 'high' | 'medium'
}

export type FullAnalysis = {
  headline: string
  health_commentary: string
  top_recommendations: FullAnalysisRecommendation[]
  habit_patterns: FullAnalysisHabitPattern[]
  biggest_win: {
    title: string
    detail: string
    saving_pence: number
  }
  risks: FullAnalysisRisk[]
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  analysis: FullAnalysis | null
  loading: boolean
  streamText: string
  onRefresh: () => void
  selectedMonth: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(pence: number): string {
  return (pence / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}

const URGENCY_STYLE: Record<FullAnalysisRecommendation['urgency'], { bg: string; border: string; label: string; color: string }> = {
  high: {
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.3)',
    label: 'HIGH',
    color: '#f87171',
  },
  medium: {
    bg: 'rgba(251,191,36,0.1)',
    border: 'rgba(251,191,36,0.2)',
    label: 'MED',
    color: '#fbbf24',
  },
  low: {
    bg: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.07)',
    label: 'LOW',
    color: '#475569',
  },
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBlock({ h = 'h-4', w = 'w-full' }: { h?: string; w?: string }) {
  return (
    <div
      className={`${h} ${w} rounded animate-pulse`}
      style={{ background: 'rgba(255,255,255,0.05)' }}
    />
  )
}

function SkeletonCard() {
  return (
    <div
      className="p-4 flex flex-col gap-2"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '1rem',
      }}
    >
      <SkeletonBlock h="h-3" w="w-2/3" />
      <SkeletonBlock h="h-2" w="w-full" />
      <SkeletonBlock h="h-2" w="w-4/5" />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FullInsightCards({ analysis, loading, streamText, onRefresh, selectedMonth }: Props) {
  const [yearStr, monthStr] = selectedMonth.split('-')
  const monthLabel = new Date(Number(yearStr), Number(monthStr) - 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#475569',
              marginBottom: 4,
            }}
          >
            This Month&apos;s Analysis
          </p>
          <p className="text-xs" style={{ color: '#334155' }}>{monthLabel} · 3-month view</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs transition-opacity disabled:opacity-40 flex items-center gap-1"
          style={{ color: '#475569' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
          onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
        >
          <span style={{ fontSize: 14 }}>↺</span>
          {loading ? 'Generating…' : analysis ? 'Refresh' : 'Generate'}
        </button>
      </div>

      {/* ── Loading state (skeleton + progress message) ── */}
      {loading && (
        <div className="flex flex-col gap-3">
          <div
            className="p-5 rounded-2xl flex items-center gap-3"
            style={{ background: 'rgba(0,212,170,0.04)', border: '1px solid rgba(0,212,170,0.15)' }}
          >
            <span className="animate-pulse text-lg" style={{ color: '#00d4aa' }}>🧠</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#00d4aa' }}>Analysing your finances…</p>
              <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Claude is reading your last 3 months of transactions</p>
            </div>
          </div>
          <div
            className="p-5 rounded-2xl flex flex-col gap-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <SkeletonBlock h="h-5" w="w-3/4" />
            <SkeletonBlock h="h-3" w="w-full" />
            <SkeletonBlock h="h-3" w="w-5/6" />
          </div>
          <SkeletonCard />
          <div className="grid grid-cols-3 gap-3">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SkeletonCard /><SkeletonCard />
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !analysis && !streamText && (
        <div
          className="flex flex-col items-center justify-center py-12 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-3xl mb-3">🧠</p>
          <p className="text-sm font-medium mb-1" style={{ color: '#e2e8f0' }}>Generate your first analysis</p>
          <p className="text-xs mb-5 text-center max-w-[280px]" style={{ color: '#475569' }}>
            Claude will analyse your last 3 months of transactions and give you a full financial health report.
          </p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              color: '#00d4aa',
              background: 'transparent',
              border: '1px solid rgba(0,212,170,0.3)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,212,170,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            Generate analysis
          </button>
        </div>
      )}

      {/* ── Full analysis ── */}
      {!loading && analysis && (
        <div className="flex flex-col gap-5">

          {/* Headline + health commentary */}
          <div
            className="p-5 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p
              className="font-bold mb-2 leading-snug"
              style={{ color: '#e2e8f0', fontSize: 18 }}
            >
              {analysis.headline}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>
              {analysis.health_commentary}
            </p>
          </div>

          {/* Biggest win */}
          {analysis.biggest_win && (
            <div
              className="p-4 rounded-2xl flex items-start gap-3"
              style={{
                background: 'rgba(0,212,170,0.06)',
                border: '1px solid rgba(0,212,170,0.2)',
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>🏆</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
                    {analysis.biggest_win.title}
                  </p>
                  <span
                    className="text-xs font-bold shrink-0 px-2 py-0.5 rounded-full"
                    style={{
                      color: '#00d4aa',
                      background: 'rgba(0,212,170,0.15)',
                      border: '1px solid rgba(0,212,170,0.25)',
                    }}
                  >
                    {fmt(analysis.biggest_win.saving_pence * 12)}/yr saved
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: '#475569' }}>
                  {analysis.biggest_win.detail}
                </p>
              </div>
            </div>
          )}

          {/* Top recommendations */}
          {analysis.top_recommendations?.length > 0 && (
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#475569',
                  marginBottom: 10,
                }}
              >
                Top Recommendations
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {analysis.top_recommendations.map((rec, i) => {
                  const style = URGENCY_STYLE[rec.urgency] ?? URGENCY_STYLE.low
                  return (
                    <div
                      key={i}
                      className="p-4 rounded-2xl flex flex-col gap-2"
                      style={{ background: style.bg, border: `1px solid ${style.border}` }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold leading-tight" style={{ color: '#e2e8f0' }}>
                          {rec.title}
                        </p>
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                          style={{ color: style.color, background: `${style.border}` }}
                        >
                          {style.label}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: '#475569' }}>
                        {rec.detail}
                      </p>
                      {rec.saving_pence !== null && rec.saving_pence > 0 && (
                        <p className="text-[10px] font-medium mt-auto pt-1" style={{ color: '#00d4aa' }}>
                          ~{fmt(rec.saving_pence * 12)}/yr
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Habit patterns */}
          {analysis.habit_patterns?.length > 0 && (
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#475569',
                  marginBottom: 10,
                }}
              >
                Habit Patterns Detected
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analysis.habit_patterns.map((hp, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <p className="text-xs font-medium mb-1" style={{ color: '#e2e8f0' }}>
                      {hp.pattern}
                    </p>
                    <p
                      className="text-[11px] font-semibold mb-2"
                      style={{ color: '#f87171' }}
                    >
                      {hp.impact}
                    </p>
                    <p
                      className="text-[11px] leading-relaxed pt-2"
                      style={{
                        color: '#334155',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      → {hp.nudge}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risks */}
          {analysis.risks?.length > 0 && (
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#475569',
                  marginBottom: 10,
                }}
              >
                ⚠ Risks
              </p>
              <div className="flex flex-col gap-2">
                {analysis.risks.map((risk, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl flex items-start gap-3"
                    style={{
                      background: risk.severity === 'high'
                        ? 'rgba(239,68,68,0.07)'
                        : 'rgba(251,191,36,0.07)',
                      border: `1px solid ${risk.severity === 'high' ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.15)'}`,
                    }}
                  >
                    <span style={{ fontSize: 14, lineHeight: 1.4 }}>
                      {risk.severity === 'high' ? '🔴' : '🟡'}
                    </span>
                    <div>
                      <p
                        className="text-xs font-semibold mb-0.5"
                        style={{ color: risk.severity === 'high' ? '#f87171' : '#fbbf24' }}
                      >
                        {risk.title}
                      </p>
                      <p className="text-[11px] leading-relaxed" style={{ color: '#475569' }}>
                        {risk.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
