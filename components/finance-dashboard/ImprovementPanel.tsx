'use client'

import type { ImprovementCard } from './types'

interface Props {
  cards: ImprovementCard[]
}

function fmt(pence: number): string {
  return (pence / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}

const PRIORITY_ACCENT: Record<number, string> = {
  1: 'rgba(239,68,68,0.15)',
  2: 'rgba(59,130,246,0.1)',
  3: 'rgba(0,212,170,0.08)',
  4: 'rgba(167,139,250,0.08)',
}

const PRIORITY_BORDER: Record<number, string> = {
  1: 'rgba(239,68,68,0.3)',
  2: 'rgba(59,130,246,0.2)',
  3: 'rgba(0,212,170,0.15)',
  4: 'rgba(167,139,250,0.15)',
}

export default function ImprovementPanel({ cards }: Props) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <p className="text-[11px] font-semibold uppercase tracking-widest mb-4 shrink-0" style={{ color: '#475569' }}>
        What to Improve
      </p>

      {!cards.length ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <span className="text-3xl mb-3">✅</span>
          <p className="text-xs" style={{ color: '#475569' }}>
            Nothing flagged. Generate AI insights to see personalised recommendations.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-0.5">
          {cards.map((card, i) => (
            <div key={i} className="rounded-xl p-4"
              style={{
                background: PRIORITY_ACCENT[card.priority] ?? 'rgba(255,255,255,0.03)',
                border: `1px solid ${PRIORITY_BORDER[card.priority] ?? 'rgba(255,255,255,0.07)'}`,
              }}>
              <div className="flex items-start gap-2.5 mb-2">
                <span className="text-lg shrink-0 leading-none mt-0.5">{card.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-white leading-tight">{card.headline}</p>
                    {card.saving_estimate_pence && (
                      <span className="text-[10px] font-bold shrink-0 whitespace-nowrap" style={{ color: '#00d4aa' }}>
                        {fmt(card.saving_estimate_pence)}/yr
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed mb-2" style={{ color: '#64748b' }}>{card.detail}</p>
              {card.action_label && (
                <p className="text-[11px] font-medium pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: '#475569' }}>
                  → {card.action_label}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
