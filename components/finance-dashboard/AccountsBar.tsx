'use client'

import type { FinanceAccount } from './types'

function fmt(pence: number): string {
  return (pence / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}

interface Props {
  accounts: FinanceAccount[]
  totalBalance: number
}

export default function AccountsBar({ accounts, totalBalance }: Props) {
  if (!accounts.length) return null

  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800 overflow-x-auto shrink-0">
      {accounts.map(account => (
        <div
          key={account.id}
          className="flex flex-col shrink-0 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 min-w-[160px]"
        >
          <span className="text-[11px] text-zinc-500 truncate max-w-[140px]">{account.display_name}</span>
          <span className={`text-base font-semibold ${account.balance_pence >= 0 ? 'text-zinc-100' : 'text-red-400'}`}>
            {fmt(account.balance_pence)}
          </span>
          {account.balance_at && (
            <span className="text-[10px] text-zinc-600">
              {new Date(account.balance_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      ))}

      {/* Total */}
      <div className="flex flex-col shrink-0 ml-auto pl-4 border-l border-zinc-800">
        <span className="text-[11px] text-zinc-500">Total</span>
        <span className={`text-xl font-bold ${totalBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {fmt(totalBalance)}
        </span>
      </div>
    </div>
  )
}
