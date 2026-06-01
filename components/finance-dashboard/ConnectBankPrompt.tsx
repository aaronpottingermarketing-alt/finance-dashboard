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
      setError('Failed to start connection. Check your GoCardless credentials.')
      setConnecting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">💳</div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">Connect your first bank</h2>
          <p className="text-sm text-zinc-500">
            Securely link your accounts via Open Banking. Read-only access — we can never move money.
          </p>
        </div>

        <BankSelector onSelect={handleSelect} loading={connecting} />

        {connecting && (
          <p className="text-center text-xs text-zinc-500 mt-4">
            Redirecting to your bank…
          </p>
        )}
        {error && (
          <p className="text-center text-xs text-red-400 mt-4">{error}</p>
        )}

        <p className="text-center text-[11px] text-zinc-600 mt-6">
          Powered by GoCardless Open Banking · Read-only · No card details stored
        </p>
      </div>
    </div>
  )
}
