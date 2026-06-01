'use client'

import type { FinanceAccount } from './types'

function fmt(pence: number): string {
  return (pence / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}

interface Props {
  accounts: FinanceAccount[]
  totalBalance: number
}

const ACCOUNT_GRADIENTS = [
  'linear-gradient(135deg, #0d4f3c 0%, #071e17 100%)',
  'linear-gradient(135deg, #1a1a3e 0%, #0d0d1f 100%)',
  'linear-gradient(135deg, #3d1a0d 0%, #1f0d07 100%)',
]

export default function AccountsBar({ accounts, totalBalance }: Props) {
  if (!accounts.length) return null

  return (
    <div className="flex items-center gap-3 px-6 py-3 overflow-x-auto shrink-0"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

      {accounts.map((account, i) => (
        <div key={account.id}
          className="flex items-center gap-3 shrink-0 rounded-xl px-4 py-3 min-w-[200px] relative overflow-hidden"
          style={{ background: ACCOUNT_GRADIENTS[i % ACCOUNT_GRADIENTS.length], border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #00d4aa, transparent)', transform: 'translate(30%, -30%)' }} />
          <div className="flex-1 min-w-0 relative">
            <p className="text-[10px] text-white/50 truncate mb-0.5">{account.display_name}</p>
            <p className={`text-lg font-bold ${account.balance_pence >= 0 ? 'text-white' : 'text-red-400'}`}>
              {fmt(account.balance_pence)}
            </p>
            <p className="text-[10px] text-white/30 capitalize">
              {account.account_type === 'CACC' ? 'Current' : account.account_type === 'SVGS' ? 'Savings' : 'Account'}
            </p>
          </div>
        </div>
      ))}

      {/* Total */}
      <div className="flex flex-col shrink-0 ml-2 pl-4"
        style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
        <span className="text-[11px] text-slate-500 mb-0.5">Total</span>
        <span className="text-2xl font-bold" style={{ color: '#00d4aa' }}>{fmt(totalBalance)}</span>
      </div>
    </div>
  )
}
