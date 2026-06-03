'use client'

import { useState } from 'react'
import BankSelector from './BankSelector'

interface Props {
  onConnect: (institutionId: string) => Promise<void>
}

export default function ConnectBankPrompt({ onConnect }: Props) {
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  async function handleSelect(id: string) {
    setConnecting(true)
    setError('')
    try {
      await onConnect(id)
    } catch {
      setError('Failed to start connection. Check your TrueLayer credentials.')
      setConnecting(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '3rem 1.5rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '360px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00d4aa, #00a884)',
              marginBottom: '1.25rem',
            }}
          >
            <span style={{ fontSize: '2rem', color: '#000', fontWeight: 700 }}>£</span>
          </div>
          <h2
            style={{
              fontSize: '1.375rem',
              fontWeight: 700,
              color: '#e2e8f0',
              margin: '0 0 0.5rem',
              letterSpacing: '-0.01em',
            }}
          >
            Connect your bank
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#475569',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Securely link your accounts via Open Banking.
            <br />
            Read-only access — we can never move money.
          </p>
        </div>

        <BankSelector onSelect={handleSelect} loading={connecting} />

        {connecting && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
            {/* Teal spinner */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00d4aa"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: 'spin 0.8s linear infinite' }}
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <p style={{ fontSize: '0.75rem', color: '#475569', margin: 0 }}>
              Redirecting to your bank…
            </p>
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ color: '#f87171', fontSize: '0.875rem' }}>⚠</span>
            <p style={{ fontSize: '0.75rem', color: '#f87171', margin: 0 }}>{error}</p>
            <button
              onClick={() => setError('')}
              style={{
                marginLeft: 'auto',
                fontSize: '0.75rem',
                color: '#f87171',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              Retry
            </button>
          </div>
        )}

        <p
          style={{
            textAlign: 'center',
            fontSize: '0.6875rem',
            color: '#334155',
            marginTop: '1.5rem',
            letterSpacing: '0.01em',
          }}
        >
          Powered by TrueLayer · Read-only access · FCA regulated
        </p>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
