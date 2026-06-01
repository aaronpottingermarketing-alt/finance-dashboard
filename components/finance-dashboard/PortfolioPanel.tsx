'use client'

import type { T212Portfolio } from './types'

interface Props {
  portfolio: T212Portfolio | null
  loading: boolean
  onRefresh: () => void
}

function fmt(n: number, opts?: { compact?: boolean }): string {
  if (opts?.compact && Math.abs(n) >= 1000) return `£${(n / 1000).toFixed(1)}k`
  return n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function pct(ppl: number, invested: number): string {
  if (!invested) return '0.00%'
  return `${ppl >= 0 ? '+' : ''}${((ppl / invested) * 100).toFixed(2)}%`
}

// Clean up T212 ticker format: "AAPL_US_EQ" → "AAPL"
function cleanTicker(ticker: string): string {
  return ticker.split('_')[0]
}

export default function PortfolioPanel({ portfolio, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Portfolio</p>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 bg-zinc-800 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Portfolio</p>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-500 mb-3">Trading 212 not connected</p>
          <button onClick={onRefresh} className="text-xs text-teal-400 hover:text-teal-300 transition-colors">
            Retry connection
          </button>
        </div>
      </div>
    )
  }

  const { positions, cash } = portfolio
  const totalValue = cash.total
  const totalPpl = cash.ppl
  const isUp = totalPpl >= 0

  // Sort positions by absolute P&L
  const sorted = [...positions].sort((a, b) => Math.abs(b.ppl) - Math.abs(a.ppl)).slice(0, 8)

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Portfolio</p>
        <button onClick={onRefresh} className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">↺ Refresh</button>
      </div>

      {/* Portfolio card */}
      <div className="relative rounded-2xl overflow-hidden p-5"
        style={{ background: 'linear-gradient(135deg, #0d4f3c 0%, #0a3d2e 40%, #071e17 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #00d4aa, transparent)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #00d4aa, transparent)', transform: 'translate(-30%, 30%)' }} />

        <p className="text-[11px] text-teal-400/70 font-medium mb-1 uppercase tracking-wider">Total Portfolio</p>
        <p className="text-3xl font-bold text-white mb-1">{fmt(totalValue)}</p>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${isUp ? 'text-teal-400' : 'text-red-400'}`}>
            {isUp ? '▲' : '▼'} {fmt(Math.abs(totalPpl))}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isUp ? 'bg-teal-500/20 text-teal-400' : 'bg-red-500/20 text-red-400'}`}>
            {pct(totalPpl, cash.invested)}
          </span>
        </div>

        <div className="flex gap-4 mt-4 pt-4 border-t border-white/10">
          <div>
            <p className="text-[10px] text-zinc-500">Invested</p>
            <p className="text-sm font-semibold text-zinc-300">{fmt(cash.invested, { compact: true })}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500">Cash</p>
            <p className="text-sm font-semibold text-zinc-300">{fmt(cash.free, { compact: true })}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500">Positions</p>
            <p className="text-sm font-semibold text-zinc-300">{positions.length}</p>
          </div>
        </div>
      </div>

      {/* Positions list */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">Positions</p>
        <div className="flex flex-col gap-1.5">
          {sorted.map(pos => {
            const posUp = pos.ppl >= 0
            const invested = pos.averagePrice * pos.quantity
            const currentValue = pos.currentPrice * pos.quantity
            return (
              <div key={pos.ticker} className="flex items-center gap-3 px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors">
                {/* Ticker badge */}
                <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-zinc-300">{cleanTicker(pos.ticker).slice(0, 4)}</span>
                </div>

                {/* Name + qty */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-200">{cleanTicker(pos.ticker)}</p>
                  <p className="text-[10px] text-zinc-600">{pos.quantity.toFixed(pos.quantity < 1 ? 4 : 2)} shares</p>
                </div>

                {/* Value + P&L */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-zinc-200">{fmt(currentValue, { compact: true })}</p>
                  <p className={`text-[11px] font-medium ${posUp ? 'text-teal-400' : 'text-red-400'}`}>
                    {posUp ? '+' : ''}{fmt(pos.ppl, { compact: true })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
