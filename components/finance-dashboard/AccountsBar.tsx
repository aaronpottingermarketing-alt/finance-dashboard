'use client'

import type { FinanceAccount } from './types'

function fmt(pence: number): string {
  return (pence / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}

interface Props {
  accounts: FinanceAccount[]
  totalBalance: number
}

const BANK_ICON: Record<string, string> = {
  barclays: '🏦',
  barclaycard: '💳',
  monzo: '🟠',
  starling: '🐦',
  hsbc: '🏛️',
  natwest: '🏦',
  lloyds: '🏦',
  nationwide: '🏠',
  santander: '🏦',
  halifax: '🏦',
}

const BANK_GRADIENT: Record<string, string> = {
  barclays: 'linear-gradient(135deg, #00395d 0%, #001f35 100%)',
  barclaycard: 'linear-gradient(135deg, #003087 0%, #001540 100%)',
  monzo: 'linear-gradient(135deg, #ff4f40 0%, #8b0000 100%)',
  starling: 'linear-gradient(135deg, #6935d3 0%, #2d1460 100%)',
}

function getBankKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '')
}

function getAccountTypeLabel(type: string | null): string {
  if (!type) return 'Account'
  const t = type.toUpperCase()
  if (t === 'CACC' || t === 'TRANSACTION') return 'Current'
  if (t === 'SVGS' || t === 'SAVINGS') return 'Savings'
  if (t === 'CARD' || t === 'CREDIT') return 'Credit card'
  return type
}

export default function AccountsBar({ accounts, totalBalance }: Props) {
  if (!accounts.length) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 24px', overflowX: 'auto', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

      {accounts.map((account) => {
        const bankName = account.finance_connections?.bank_name ?? ''
        const bankKey = getBankKey(bankName)
        const icon = BANK_ICON[bankKey] ?? '🏦'
        const gradient = BANK_GRADIENT[bankKey] ?? 'linear-gradient(135deg, #1a2035 0%, #0d1020 100%)'
        const typeLabel = getAccountTypeLabel(account.account_type)

        return (
          <div key={account.id} style={{
            flexShrink: 0, borderRadius: '14px', padding: '12px 16px',
            minWidth: '190px', position: 'relative', overflow: 'hidden',
            background: gradient,
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {/* Glow */}
            <div style={{
              position: 'absolute', top: 0, right: 0, width: 60, height: 60,
              borderRadius: '50%', opacity: 0.15,
              background: 'radial-gradient(circle, #00d4aa, transparent)',
              transform: 'translate(30%, -30%)',
            }} />

            <div style={{ position: 'relative' }}>
              {/* Bank name + icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px' }}>{icon}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>
                  {bankName || 'Bank'}
                </span>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginLeft: '2px' }}>· {typeLabel}</span>
              </div>

              {/* Balance */}
              <p style={{ fontSize: '20px', fontWeight: 700, color: account.balance_pence >= 0 ? '#fff' : '#f87171', margin: 0 }}>
                {fmt(account.balance_pence)}
              </p>

              {/* Account name */}
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {account.display_name}
              </p>
            </div>
          </div>
        )
      })}

      {/* Total */}
      <div style={{ flexShrink: 0, marginLeft: '6px', paddingLeft: '16px', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ fontSize: '11px', color: '#475569', display: 'block', marginBottom: '2px' }}>Total</span>
        <span style={{ fontSize: '24px', fontWeight: 700, color: '#00d4aa' }}>{fmt(totalBalance)}</span>
      </div>
    </div>
  )
}
