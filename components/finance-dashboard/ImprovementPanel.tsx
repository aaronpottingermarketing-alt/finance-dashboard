'use client'

import type { ImprovementCard } from './types'

interface Props {
  cards: ImprovementCard[]
  onAction?: (card: ImprovementCard) => void
}

function fmt(pence: number): string {
  return (pence / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}

const PRIORITY_BORDER: Record<number, string> = {
  1: 'border-amber-500/30',
  2: 'border-blue-500/20',
  3: 'border-zinc-800',
  4: 'border-zinc-800',
}

export default function ImprovementPanel({ cards }: Props) {
  if (!cards.length) {
    return (
      <div className="flex flex-col h-full">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-3">What to improve</p>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <span className="text-2xl mb-2">✅</span>
          <p className="text-xs text-zinc-500">
            Nothing to flag right now. Sync your accounts and generate AI insights to see recommendations.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-3 shrink-0">What to improve</p>
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-0.5">
        {cards.map((card, i) => (
          <div
            key={i}
            className={`bg-zinc-900 border rounded-lg p-3 ${PRIORITY_BORDER[card.priority] ?? 'border-zinc-800'}`}
          >
            <div className="flex items-start gap-2 mb-1">
              <span className="text-base shrink-0 leading-none mt-0.5">{card.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <p className="text-xs font-semibold text-zinc-200 leading-tight">{card.headline}</p>
                  {card.saving_estimate_pence && (
                    <span className="text-[10px] font-medium text-emerald-400 shrink-0 whitespace-nowrap">
                      {fmt(card.saving_estimate_pence)}/yr
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">{card.detail}</p>
                {card.action_label && (
                  <p className="text-[11px] text-zinc-500 mt-1.5 border-t border-zinc-800 pt-1.5">
                    → {card.action_label}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
