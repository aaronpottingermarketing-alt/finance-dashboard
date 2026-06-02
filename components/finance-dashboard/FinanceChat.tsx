'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

interface Session {
  id: string
  title: string
  updated_at: string
}

const STARTERS = [
  'Where am I overspending right now?',
  'How much are my subscriptions costing me per year?',
  'Am I spending more or less than last month?',
  'What\'s my biggest opportunity to save money?',
  'How long until I hit my savings goal?',
  'What would I save if I cancelled David Lloyd?',
]

export default function FinanceChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [showSessions, setShowSessions] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/chat/sessions')
      if (res.ok) setSessions(await res.json())
    } catch { /* non-fatal */ }
  }, [])

  useEffect(() => { loadSessions() }, [loadSessions])

  const loadSession = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/finance/chat/sessions?id=${id}`)
      if (!res.ok) return
      const msgs: Message[] = await res.json()
      setMessages(msgs)
      setSessionId(id)
      setShowSessions(false)
    } catch { /* non-fatal */ }
  }, [])

  const newChat = useCallback(() => {
    setMessages([])
    setSessionId(null)
    setShowSessions(false)
    inputRef.current?.focus()
  }, [])

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', content: trimmed }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    // Add streaming placeholder
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    try {
      const res = await fetch('/api/finance/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
          sessionId,
        }),
      })

      if (!res.ok || !res.body) throw new Error('Request failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let reply = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.text) {
              reply += data.text
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: reply, streaming: true }
                return updated
              })
            }
            if (data.done) {
              if (data.sessionId) setSessionId(data.sessionId)
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: reply, streaming: false }
                return updated
              })
              loadSessions()
            }
          } catch { /* ignore */ }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: 'Sorry, something went wrong. Try again.', streaming: false }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }, [loading, messages, sessionId, loadSessions])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: showSessions ? '220px' : '0',
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'width 0.2s ease',
        borderRight: showSessions ? '1px solid rgba(255,255,255,0.06)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={newChat}
            style={{
              width: '100%', padding: '0.5rem', borderRadius: '0.5rem',
              background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)',
              color: '#00d4aa', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            + New chat
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => loadSession(s.id)}
              style={{
                width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
                background: s.id === sessionId ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: s.id === sessionId ? '#e2e8f0' : '#475569',
                fontSize: 12, marginBottom: 2, whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main chat area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setShowSessions(v => !v)}
            title="Chat history"
            style={{
              padding: '0.375rem 0.5rem', borderRadius: '0.375rem', border: 'none',
              background: showSessions ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: '#475569', cursor: 'pointer', fontSize: 16,
            }}
          >
            ☰
          </button>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2 }}>Finance Chat</p>
            <p style={{ fontSize: 11, color: '#334155' }}>Powered by Claude · knows your full financial data</p>
          </div>
          {!isEmpty && (
            <button
              onClick={newChat}
              style={{
                marginLeft: 'auto', padding: '0.375rem 0.75rem',
                borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent', color: '#475569', fontSize: 12, cursor: 'pointer',
              }}
            >
              New chat
            </button>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

          {/* Empty state */}
          {isEmpty && (
            <div style={{ maxWidth: 680, margin: '2rem auto', width: '100%' }}>
              <p style={{ fontSize: 24, textAlign: 'center', marginBottom: '0.5rem' }}>💬</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', textAlign: 'center', marginBottom: '0.375rem' }}>
                Ask anything about your finances
              </p>
              <p style={{ fontSize: 13, color: '#475569', textAlign: 'center', marginBottom: '2rem' }}>
                Claude has access to your real account data, transactions, subscriptions and goals.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {STARTERS.map(q => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    style={{
                      padding: '0.75rem 1rem', borderRadius: '0.75rem',
                      border: '1px solid rgba(255,255,255,0.07)',
                      background: 'rgba(255,255,255,0.03)',
                      color: '#94a3b8', fontSize: 13, textAlign: 'left',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                      e.currentTarget.style.color = '#e2e8f0'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                      e.currentTarget.style.color = '#94a3b8'
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '1rem',
              }}
            >
              {msg.role === 'assistant' && (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #00d4aa, #00a884)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, marginRight: '0.625rem', marginTop: 2,
                }}>
                  🧠
                </div>
              )}
              <div style={{
                maxWidth: '80%',
                padding: '0.75rem 1rem',
                borderRadius: msg.role === 'user' ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                background: msg.role === 'user'
                  ? 'rgba(0,212,170,0.12)'
                  : 'rgba(255,255,255,0.04)',
                border: msg.role === 'user'
                  ? '1px solid rgba(0,212,170,0.2)'
                  : '1px solid rgba(255,255,255,0.07)',
                fontSize: 14,
                lineHeight: 1.6,
                color: msg.role === 'user' ? '#e2e8f0' : '#cbd5e1',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {msg.content}
                {msg.streaming && (
                  <span style={{ color: '#00d4aa', animation: 'pulse 1s infinite' }}> ▌</span>
                )}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', gap: '0.75rem', alignItems: 'flex-end',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.875rem',
            padding: '0.625rem 0.625rem 0.625rem 1rem',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything about your finances…"
              rows={1}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#e2e8f0', fontSize: 14, lineHeight: 1.5, resize: 'none',
                fontFamily: 'inherit', maxHeight: 120, overflowY: 'auto',
              }}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: '0.5rem', border: 'none',
                background: loading || !input.trim()
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg, #00d4aa, #00a884)',
                color: loading || !input.trim() ? '#334155' : '#000',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0, transition: 'all 0.15s',
              }}
            >
              {loading ? '…' : '↑'}
            </button>
          </div>
          <p style={{ fontSize: 11, color: '#1e293b', textAlign: 'center', marginTop: '0.5rem' }}>
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
