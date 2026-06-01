'use client'

import { SUPPORTED_BANKS } from '@/lib/finance'

interface Props {
  onSelect: (institutionId: string) => void
  loading?: boolean
}

export default function BankSelector({ onSelect, loading }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 w-full">
      {SUPPORTED_BANKS.map(bank => (
        <button
          key={bank.id}
          onClick={() => onSelect(bank.id)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 hover:text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800 transition-all disabled:opacity-50 text-left"
        >
          <span className="text-base">🏦</span>
          <span className="truncate">{bank.name}</span>
        </button>
      ))}
    </div>
  )
}
