'use client'
import { useEffect, useState, useCallback } from 'react'
import { Wifi, WifiOff, Plus, RefreshCw, QrCode, Power, LogOut, Smartphone, Key } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import Spinner from '@/components/ui/Spinner'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'

interface Session {
  id: string
  name: string
  status: string
  phone?: string | null
  pushName?: string | null
  connectedAt?: string | null
  lastActive?: string | null
  lastError?: string | null
}

function timeAgo(date?: string | null): string {
  if (!date) return '—'
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(date).toLocaleDateString()
}

export default function SessionsView({ onSessionChange }: { onSessionChange: (id: string) => void }) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [qrModal, setQrModal] = useState<{ sessionId: string; qr?: string } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sessions')
      if (res.ok) setSessions(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const startSession = async (id: string) => {
    setActionLoading(id)
    try { await fetch(`/api/sessions/${encodeURIComponent(id)}/start`, { method: 'POST' }); await load() } catch {}
    setActionLoading(null)
  }

  const stopSession = async (id: string) => {
    setActionLoading(id)
    try { await fetch(`/api/sessions/${encodeURIComponent(id)}/stop`, { method: 'POST' }); await load() } catch {}
    setActionLoading(null)
  }

  const getQR = async (sessionId: string) => {
    setQrModal({ sessionId })
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/qr`)
      if (res.ok) {
        const d: any = await res.json()
        setQrModal({ sessionId, qr: d.qr || d.data || d.qrCode })
      }
    } catch {}
  }

  const registerWebhook = async (sessionId: string) => {
    try {
      await fetch('/api/webhooks/openwa/register', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId }),
      })
      alert('Webhook registered successfully!')
    } catch {}
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">WhatsApp Sessions</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {sessions.filter(s => s.status === 'ready' || s.status === 'connected').length} connected · {sessions.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary"><RefreshCw size={14} /></button>
          <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={14} />New Session</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} className="text-[#25D366]" /></div>
      ) : !sessions.length ? (
        <EmptyState icon={Smartphone} title="No sessions"
          description="Create a WhatsApp session and scan the QR code to connect your number."
          action={<button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={14} />Create Session</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sessions &&  sessions?.map(s => {
            const isReady = s.status === 'ready' || s.status === 'connected'
            const isLoading = actionLoading === s.id
            return (
              <div key={s.id} className={`card p-5 flex flex-col gap-4 ${isReady ? 'border-[#25D366]/20' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isReady ? 'bg-[#25D366]/10 text-[#25D366]' : 'bg-white/5 text-slate-500'}`}>
                      {isReady ? <Wifi size={18} /> : <WifiOff size={18} />}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{s.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{s.id.slice(0, 16)}…</div>
                    </div>
                  </div>
                  <StatusBadge status={s.status} size="sm" />
                </div>

                {s.phone && (
                  <div className="text-xs text-slate-400">
                    📱 {s.pushName && <span className="text-slate-300 font-medium">{s.pushName} · </span>}
                    <span className="font-mono">{s.phone}</span>
                  </div>
                )}

                <div className="text-xs text-slate-600 space-y-0.5">
                  {s.connectedAt && <div>Connected {timeAgo(s.connectedAt)}</div>}
                  {s.lastActive && <div>Last active {timeAgo(s.lastActive)}</div>}
                  {s.lastError && <div className="text-red-400/70 truncate">⚠ {s.lastError}</div>}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-[#1e2d45]">
                  {!isReady ? (
                    <button onClick={() => startSession(s.id)} disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] text-xs rounded-lg transition">
                      {isLoading ? <Spinner size={11} /> : <Power size={11} />} Start
                    </button>
                  ) : (
                    <button onClick={() => stopSession(s.id)} disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg transition">
                      {isLoading ? <Spinner size={11} /> : <Power size={11} />} Stop
                    </button>
                  )}
                  <button onClick={() => getQR(s.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs rounded-lg transition">
                    <QrCode size={11} /> QR Code
                  </button>
                  <button onClick={() => registerWebhook(s.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs rounded-lg transition">
                    <Key size={11} /> Register Webhook
                  </button>
                  <button onClick={() => onSessionChange(s.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs rounded-lg transition">
                    Set Active
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* QR Modal */}
      <Modal open={!!qrModal} onClose={() => setQrModal(null)} title="Scan QR Code">
        <div className="text-center space-y-4">
          <p className="text-sm text-slate-400">Scan with WhatsApp on your phone</p>
          {!qrModal?.qr ? (
            <div className="flex justify-center py-8"><Spinner size={32} className="text-[#25D366]" /></div>
          ) : (
            <div className="p-4 bg-white rounded-xl inline-block">
              {qrModal.qr.startsWith('data:') ? (
                <img src={qrModal.qr} alt="QR Code" className="w-64 h-64 object-contain" />
              ) : (
                <div className="text-xs font-mono text-black break-all max-w-64">{qrModal.qr}</div>
              )}
            </div>
          )}
          <p className="text-xs text-slate-600">Open WhatsApp → Linked Devices → Link a Device</p>
        </div>
      </Modal>

      {/* Create Session Modal */}
      <CreateSessionModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />
    </div>
  )
}

function CreateSessionModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!name.trim()) return
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }),
      })
      if (res.ok) { onCreated(); onClose(); setName('') }
      else { const d = await res.json(); setError(d.error || d.message || 'Failed') }
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Create WhatsApp Session">
      <div className="space-y-4">
        {error && <div className="text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{error}</div>}
        <div>
          <label className="label">Session Name *</label>
          <input className="input" placeholder="e.g. main-bot, support-agent" value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} />
          <p className="text-xs text-slate-600 mt-1">Lowercase letters, numbers and hyphens only.</p>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={submit} disabled={saving || !name.trim()} className="btn-primary">
            {saving ? <Spinner size={14} /> : <Plus size={14} />} Create Session
          </button>
        </div>
      </div>
    </Modal>
  )
}
