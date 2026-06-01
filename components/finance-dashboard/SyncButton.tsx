'use client'

interface Props {
  syncing: boolean
  lastSynced: Date | null
  onSync: () => void
}

export default function SyncButton({ syncing, lastSynced, onSync }: Props) {
  const label = lastSynced
    ? `Synced ${lastSynced.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    : 'Sync'

  return (
    <button
      onClick={onSync}
      disabled={syncing}
      title={label}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 border border-zinc-800 rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={syncing ? 'animate-spin' : ''}
      >
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
      {syncing ? 'Syncing…' : label}
    </button>
  )
}
