'use client'
import { useEffect, useState, useCallback } from 'react'
import { Megaphone, Plus, Play, RefreshCw, Search, Users } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import Modal from '@/components/ui/Modal'

interface Campaign {
  _id: string
  name: string
  sessionId: string
  text?: string
  template?: string
  status: string
  blockedCount?: number
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
}

function timeAgo(date: string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(date).toLocaleDateString()
}

export default function CampaignsView({ sessionId }: { sessionId: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [result, setResult] = useState<{ campaignId: string; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/campaigns')
      if (res.ok) setCampaigns(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const processCampaign = async (id: string) => {
    setProcessing(id)
    try {
      const res = await fetch(`/api/campaigns/${id}/process`, { method: 'POST' })
      if (res.ok) {
        const d = await res.json()
        setResult({ campaignId: id, text: `Processed ${d.processed} messages. ${d.remaining} remaining.` })
        await load()
      }
    } catch {}
    setProcessing(null)
  }

  const filtered = campaigns.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="text-sm text-slate-500 mt-0.5">{campaigns.length} total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary"><RefreshCw size={14} /></button>
          <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={14} />New Campaign</button>
        </div>
      </div>

      {result && (
        <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-400">
          <span>{result.text}</span>
          <button onClick={() => setResult(null)} className="text-green-600 hover:text-green-400">×</button>
        </div>
      )}

      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input className="input pl-9" placeholder="Search campaigns…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} className="text-[#25D366]" /></div>
      ) : !filtered.length ? (
        <EmptyState icon={Megaphone} title="No campaigns yet"
          description="Create a bulk messaging campaign to send to your opted-in contacts."
          action={<button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={14} />New Campaign</button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e2d45]">
                  {['Name', 'Session', 'Message preview', 'Blocked', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c._id} className="border-b border-[#1e2d45]/50 table-row-hover">
                    <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-400">{c.sessionId}</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-slate-400 truncate">{c.text || c.template}</p>
                    </td>
                    <td className="px-4 py-3">
                      {c.blockedCount ? (
                        <span className="badge badge-red">{c.blockedCount} blocked</span>
                      ) : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} size="sm" /></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{timeAgo(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      {(c.status === 'queued' || c.status === 'running') && (
                        <button
                          onClick={() => processCampaign(c._id)}
                          disabled={processing === c._id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] text-xs font-medium rounded-lg transition"
                        >
                          {processing === c._id ? <Spinner size={12} /> : <Play size={12} />}
                          Process
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateCampaignModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        sessionId={sessionId}
        onCreated={load}
      />
    </div>
  )
}

function CreateCampaignModal({ open, onClose, sessionId, onCreated }: {
  open: boolean; onClose: () => void; sessionId: string; onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [recipients, setRecipients] = useState('')
  const [minDelay, setMinDelay] = useState(1000)
  const [maxDelay, setMaxDelay] = useState(3000)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setSaving(true); setError('')
    try {
      const recipientList = recipients.split('\n').map(r => r.trim()).filter(Boolean)
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, sessionId, text, recipients: recipientList, minDelayMs: minDelay, maxDelayMs: maxDelay }),
      })
      if (res.ok) {
        const d = await res.json()
        onCreated(); onClose()
        setName(''); setText(''); setRecipients('')
      } else {
        const d = await res.json(); setError(d.error || 'Failed')
      }
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="New Bulk Campaign" maxWidth="max-w-xl">
      <div className="space-y-4">
        {error && <div className="text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Campaign Name *</label>
            <input className="input" placeholder="e.g. Summer Sale Promo" value={name} onChange={e => setName(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Message *</label>
          <textarea className="textarea" rows={5}
            placeholder={"Use {{name}}, {{phone}} for personalization\n\nHi {{name}}! We have a special offer for you…"}
            value={text} onChange={e => setText(e.target.value)}
          />
          <p className="text-xs text-slate-600 mt-1">Supports {'{{name}}'}, {'{{phone}}'}, and any contact variable.</p>
        </div>

        <div>
          <label className="label flex items-center gap-1.5"><Users size={12} /> Recipients (one phone per line) *</label>
          <textarea className="textarea font-mono" rows={4}
            placeholder={"1234567890@c.us\n9876543210@c.us"}
            value={recipients} onChange={e => setRecipients(e.target.value)}
          />
          <p className="text-xs text-slate-600 mt-1">Only opted-in contacts will receive messages. Others are auto-blocked.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Min Delay (ms)</label>
            <input className="input" type="number" min={250} value={minDelay} onChange={e => setMinDelay(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Max Delay (ms)</label>
            <input className="input" type="number" min={250} value={maxDelay} onChange={e => setMaxDelay(Number(e.target.value))} />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary">
            {saving ? <Spinner size={14} /> : <Megaphone size={14} />} Create Campaign
          </button>
        </div>
      </div>
    </Modal>
  )
}
