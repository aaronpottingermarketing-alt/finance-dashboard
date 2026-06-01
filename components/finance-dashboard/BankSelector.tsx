'use client'

import { useState } from 'react'
import { SUPPORTED_BANKS } from '@/lib/finance'

interface Props {
  onSelect: (institutionId: string) => void
  loading?: boolean
}

export default function BankSelector({ onSelect, loading }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.5rem',
        width: '100%',
      }}
    >
      {SUPPORTED_BANKS.map(bank => (
        <button
          key={bank.id}
          onClick={() => onSelect(bank.id)}
          disabled={loading}
          onMouseEnter={() => setHovered(bank.id)}
          onMouseLeave={() => setHovered(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 0.75rem',
            background: hovered === bank.id ? 'rgba(0,212,170,0.1)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${hovered === bank.id ? '#00d4aa' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '0.625rem',
            fontSize: '0.8125rem',
            color: hovered === bank.id ? '#e2e8f0' : '#94a3b8',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            textAlign: 'left',
            transition: 'background 0.15s, border-color 0.15s, color 0.15s',
            width: '100%',
          }}
        >
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>{bank.emoji ?? '🏦'}</span>
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {bank.name}
          </span>
        </button>
      ))}
    </div>
  )
}
