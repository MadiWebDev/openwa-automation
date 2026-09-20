'use client'
import { useEffect, useState, useCallback } from 'react'
import { Users, Plus, Search, RefreshCw, UserMinus } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import Modal from '@/components/ui/Modal'

interface Contact {
  _id: string
  phone: string
  name?: string
  optedIn: boolean
  optedOut: boolean
  consent: { method: string; source: string; timestamp: string }
  optOut?: { method: string; source: string; timestamp: string }
  variables?: Record<string, string>
  createdAt: string
  updatedAt: string
}

function timeAgo(date: string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(date).toLocaleDateString()
}

export default function ContactsView() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'opted_in' | 'opted_out'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<Contact | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/contacts')
      if (res.ok) setContacts(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const optOut = async (contact: Contact) => {
    if (!confirm(`Opt out ${contact.phone}?`)) return
    await fetch(`/api/contacts/${encodeURIComponent(contact.phone)}/optout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'manual', source: 'dashboard' }),
    })
    await load()
  }

  const filtered = contacts
    .filter(c => filter === 'all' || (filter === 'opted_in' ? c.optedIn && !c.optedOut : c.optedOut))
    .filter(c => !search || c.phone.includes(search) || (c.name || '').toLowerCase().includes(search.toLowerCase()))

  const optedInCount = contacts.filter(c => c.optedIn && !c.optedOut).length
  const optedOutCount = contacts.filter(c => c.optedOut).length

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Contacts</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {optedInCount} opted-in · {optedOutCount} opted-out · {contacts.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary"><RefreshCw size={14} /></button>
          <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={14} />Add Contact</button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-9" placeholder="Search by phone or name…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {([['all', 'All'], ['opted_in', 'Opted-in'], ['opted_out', 'Opted-out']] as const).map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition ${filter === val ? 'bg-[#25D366]/15 text-[#25D366]' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} className="text-[#25D366]" /></div>
      ) : !filtered.length ? (
        <EmptyState icon={Users} title="No contacts found"
          description="Contacts with a recorded opt-in can receive campaign messages."
          action={<button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={14} />Add Contact</button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e2d45]">
                {['Contact', 'Phone', 'Consent', 'Status', 'Added', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c._id} className="border-b border-[#1e2d45]/50 table-row-hover">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366] text-xs font-bold">
                        {(c.name || c.phone).charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-white text-sm">{c.name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{c.phone}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-slate-400">{c.consent?.method}</div>
                    <div className="text-xs text-slate-600">{c.consent?.source}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.optedOut ? 'opted_out' : c.optedIn ? 'opted_in' : 'opted_out'} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{timeAgo(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setSelected(c)} className="px-2.5 py-1 text-xs bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition">
                        View
                      </button>
                      {c.optedIn && !c.optedOut && (
                        <button onClick={() => optOut(c)} className="px-2.5 py-1 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition">
                          Opt-out
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name || selected?.phone || ''}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1">Phone</div>
                <div className="font-mono text-sm text-white">{selected.phone}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1">Status</div>
                <StatusBadge status={selected.optedOut ? 'opted_out' : selected.optedIn ? 'opted_in' : 'opted_out'} />
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-xs text-slate-500 mb-2">Consent Record</div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between"><span className="text-slate-400">Method</span><span className="text-white">{selected.consent?.method}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Source</span><span className="text-white">{selected.consent?.source}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Timestamp</span><span className="text-white">{selected.consent?.timestamp ? new Date(selected.consent.timestamp).toLocaleString() : '—'}</span></div>
              </div>
            </div>
            {selected.variables && Object.keys(selected.variables).length > 0 && (
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-2">Variables</div>
                <div className="space-y-1">
                  {Object.entries(selected.variables).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-slate-400 font-mono">{k}</span>
                      <span className="text-white">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <AddContactModal open={showCreate} onClose={() => setShowCreate(false)} onAdded={load} />
    </div>
  )
}

function AddContactModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ phone: '', name: '', method: 'manual', source: 'dashboard' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: form.phone, name: form.name, consent: { method: form.method, source: form.source } }),
      })
      if (res.ok) { onAdded(); onClose(); setForm({ phone: '', name: '', method: 'manual', source: 'dashboard' }) }
      else { const d = await res.json(); setError(d.error || 'Failed') }
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Contact">
      <div className="space-y-4">
        {error && <div className="text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{error}</div>}
        <div>
          <label className="label">Phone *</label>
          <input className="input font-mono" placeholder="1234567890@c.us" value={form.phone} onChange={e => set('phone', e.target.value)} />
          <p className="text-xs text-slate-600 mt-1">Format: {'<number>@c.us'}</p>
        </div>
        <div>
          <label className="label">Name</label>
          <input className="input" placeholder="Contact name" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Consent Method</label>
            <select className="select" value={form.method} onChange={e => set('method', e.target.value)}>
              <option value="manual">Manual</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="web_form">Web Form</option>
              <option value="sms">SMS</option>
              <option value="api">API</option>
            </select>
          </div>
          <div>
            <label className="label">Source</label>
            <input className="input" placeholder="e.g. dashboard, website" value={form.source} onChange={e => set('source', e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary">
            {saving ? <Spinner size={14} /> : <Plus size={14} />} Add Contact
          </button>
        </div>
      </div>
    </Modal>
  )
}
