'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useFinanceDashboard } from './useFinanceDashboard'
import ConnectBankPrompt from './ConnectBankPrompt'
import AccountsBar from './AccountsBar'
import SyncButton from './SyncButton'
import MasterDashboard from './MasterDashboard'
import DetailDashboard from './DetailDashboard'

export default function FinanceDashboard() {
  const fd = useFinanceDashboard()
  const searchParams = useSearchParams()

  // Handle redirect back from GoCardless
  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected === 'true') {
      // Reload to pick up the new connection
      window.history.replaceState({}, '', '/tool/finance-dashboard')
      fd.sync()
    }
    if (error) {
      console.error('Bank connection error:', decodeURIComponent(error))
      window.history.replaceState({}, '', '/tool/finance-dashboard')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasActiveConnections = fd.connections.some(c => c.status === 'active')

  if (fd.loading) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          <span className="text-sm text-zinc-600">Loading your finances…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-semibold text-zinc-100">💰 Finance</h1>

          {hasActiveConnections && (
            <div className="flex rounded-md border border-zinc-800 overflow-hidden">
              {(['overview', 'detail'] as const).map(view => (
                <button
                  key={view}
                  onClick={() => fd.setViewMode(view)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    fd.viewMode === view
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {view === 'overview' ? 'Overview' : 'Detail'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasActiveConnections && (
            <SyncButton
              syncing={fd.syncing}
              lastSynced={fd.lastSynced}
              onSync={fd.sync}
            />
          )}
          <button
            onClick={() => {
              // Open bank selector inline — handled via connection page
              const id = prompt('Enter institution ID (e.g. BARCLAYS_PERSONAL_RRWFKBKU or SANDBOXFINANCE_SFIN0000)')
              if (id) fd.connectBank(id.trim())
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-100 text-zinc-900 rounded-md hover:bg-white transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Connect Bank
          </button>
        </div>
      </div>

      {/* No connections */}
      {!hasActiveConnections && (
        <ConnectBankPrompt onConnect={fd.connectBank} />
      )}

      {/* Main content */}
      {hasActiveConnections && (
        <>
          <AccountsBar accounts={fd.accounts} totalBalance={fd.totalBalance()} />

          {fd.viewMode === 'overview' ? (
            <MasterDashboard fd={fd} />
          ) : (
            <DetailDashboard fd={fd} />
          )}
        </>
      )}
    </div>
  )
}
