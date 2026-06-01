'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useFinanceDashboard } from './useFinanceDashboard'
import ConnectBankPrompt from './ConnectBankPrompt'
import AccountsBar from './AccountsBar'
import MasterDashboard from './MasterDashboard'
import DetailDashboard from './DetailDashboard'
import InsightsDashboard from './InsightsDashboard'
import { SUPPORTED_BANKS } from '@/lib/finance'

export default function FinanceDashboard() {
  const fd = useFinanceDashboard()
  const searchParams = useSearchParams()
  const [showBankModal, setShowBankModal] = useState(false)
  const [connecting, setConnecting] = useState<string | null>(null)

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected === 'true') {
      window.history.replaceState({}, '', '/')
      fd.sync()
    }
    if (error) {
      console.error('Bank connection error:', decodeURIComponent(error))
      window.history.replaceState({}, '', '/')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleBankSelect(id: string) {
    setConnecting(id)
    try {
      await fd.connectBank(id)
    } catch {
      setConnecting(null)
    }
  }

  const hasActiveConnections = fd.connections.some(c => c.status === 'active')

  if (fd.loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: '#0a0e1a' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-teal-500/30 border-t-teal-400 animate-spin" />
          <span className="text-sm text-slate-500">Loading your finances…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#0a0e1a', color: '#e2e8f0' }}>

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(10,14,26,0.95)', backdropFilter: 'blur(12px)' }}>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #00d4aa, #00a884)' }}>
            £
          </div>
          <span className="text-base font-semibold text-white">Finance</span>
        </div>

        {hasActiveConnections && (
          <div className="flex rounded-lg overflow-hidden p-0.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {(['overview', 'detail', 'insights'] as const).map(view => (
              <button key={view} onClick={() => fd.setViewMode(view)}
                className="px-4 py-1.5 text-xs font-medium capitalize transition-all rounded-md"
                style={{
                  background: fd.viewMode === view ? 'rgba(0,212,170,0.15)' : 'transparent',
                  color: fd.viewMode === view ? '#00d4aa' : '#64748b',
                }}>
                {view === 'overview' ? 'Dashboard' : view === 'detail' ? 'Detail' : 'Insights'}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          {hasActiveConnections && (
            <button onClick={fd.sync} disabled={fd.syncing}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={fd.syncing ? 'animate-spin' : ''}>
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              {fd.syncing ? 'Syncing…' : fd.lastSynced ? `Synced ${fd.lastSynced.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'Sync'}
            </button>
          )}
          <button onClick={() => fd.connectBank('')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
            style={{ background: 'linear-gradient(135deg, #00d4aa, #00a884)', color: '#000' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Connect Bank
          </button>
        </div>
      </header>

      {/* No connections */}
      {!hasActiveConnections && <ConnectBankPrompt onConnect={fd.connectBank} />}

      {/* Main content */}
      {hasActiveConnections && (
        <>
          <AccountsBar accounts={fd.accounts} totalBalance={fd.totalBalance()} />
          {fd.viewMode === 'overview' && <MasterDashboard fd={fd} />}
          {fd.viewMode === 'detail' && <DetailDashboard fd={fd} />}
          {fd.viewMode === 'insights' && <InsightsDashboard fd={fd} />}
        </>
      )}

      {/* ── Bank picker modal ── */}
      {showBankModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowBankModal(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}>
          <div style={{
            background: '#111827', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '1.25rem', padding: '1.75rem', width: '100%', maxWidth: '480px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>Connect a bank</h2>
                <p style={{ fontSize: '13px', color: '#475569' }}>Read-only · Secured by TrueLayer · FCA regulated</p>
              </div>
              <button onClick={() => setShowBankModal(false)}
                style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>
                ✕
              </button>
            </div>

            {/* Bank grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              {SUPPORTED_BANKS.map(bank => (
                <button
                  key={bank.id}
                  onClick={() => handleBankSelect(bank.id)}
                  disabled={!!connecting}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '0.75rem 1rem', borderRadius: '0.75rem', cursor: 'pointer',
                    background: connecting === bank.id ? 'rgba(0,212,170,0.1)' : 'rgba(255,255,255,0.04)',
                    border: connecting === bank.id ? '1px solid rgba(0,212,170,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    color: '#e2e8f0', fontSize: '14px', fontWeight: 500,
                    transition: 'all 0.15s', textAlign: 'left', opacity: connecting && connecting !== bank.id ? 0.5 : 1,
                  }}>
                  <span style={{ fontSize: '20px' }}>{bank.emoji}</span>
                  <span>{connecting === bank.id ? 'Redirecting…' : bank.name}</span>
                </button>
              ))}
            </div>

            <p style={{ fontSize: '11px', color: '#334155', textAlign: 'center', marginTop: '1.25rem' }}>
              You'll be redirected to your bank to authorise read-only access. We can never move money.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
