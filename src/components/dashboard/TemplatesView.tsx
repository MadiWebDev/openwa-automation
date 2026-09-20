'use client'
import { useEffect, useState, useCallback } from 'react'
import { FileText, Plus, Trash2, Edit2, RefreshCw, Copy, Check } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import Modal from '@/components/ui/Modal'

interface Template {
  _id: string
  name: string
  category: string
  body: string
  variables: string[]
  description?: string
  language: string
  useCount: number
  createdAt: string
}

const CATEGORIES = ['greeting', 'order', 'promo', 'support', 'reminder', 'custom']
const CAT_COLORS: Record<string, string> = {
  greeting: 'badge-green', order: 'badge-yellow', promo: 'badge-purple',
  support: 'badge-blue', reminder: 'badge-rose', custom: 'badge-gray',
}

const STARTER_TEMPLATES = [
  { name: 'Order Confirmation', category: 'order', body: '✅ Hi {{name}}, your order has been confirmed!\n\nOrder ID: {{orderId}}\nTotal: {{total}}\n\nWe\'ll notify you when it\'s ready. Thank you! 🙏', description: 'Sent when an order is confirmed' },
  { name: 'Welcome Message', category: 'greeting', body: 'Welcome to {{businessName}}! 👋\n\nHi {{name}}, thanks for reaching out. How can we help you today?', description: 'First contact welcome' },
  { name: 'Order Cancelled', category: 'order', body: '❌ Hi {{name}}, your order {{orderId}} has been cancelled.\n\nReason: {{reason}}\n\nFeel free to place a new order anytime.', description: 'Order cancellation notice' },
  { name: 'Promo Blast', category: 'promo', body: '🎉 Special offer for you, {{name}}!\n\n{{promoDetails}}\n\nValid until: {{expiryDate}}\n\nReply to order now!', description: 'Promotional campaign message' },
]

export default function TemplatesView() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = category ? `?category=${category}` : ''
      const res = await fetch(`/api/templates${params}`)
      if (res.ok) setTemplates(await res.json())
    } catch {}
    setLoading(false)
  }, [category])

  useEffect(() => { load() }, [load])

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return
    await fetch(`/api/templates/${id}`, { method: 'DELETE' })
    setTemplates(templates.filter(t => t._id !== id))
  }

  const copyBody = (body: string, id: string) => {
    navigator.clipboard.writeText(body)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  const seedStarters = async () => {
    for (const t of STARTER_TEMPLATES) {
      try {
        await fetch('/api/templates', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...t, language: 'en' }),
        })
      } catch {}
    }
    load()
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Message Templates</h1>
          <p className="text-sm text-slate-500 mt-0.5">{templates.length} templates</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary"><RefreshCw size={14} /></button>
          {!templates.length && (
            <button onClick={seedStarters} className="btn-secondary">Seed Starters</button>
          )}
          <button onClick={() => { setEditing(null); setShowModal(true) }} className="btn-primary">
            <Plus size={14} />New Template
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['', ...CATEGORIES] as const).map(c => (
          <button
            key={c || 'all'}
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition capitalize ${
              category === c
                ? 'bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30'
                : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            {c || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} className="text-[#25D366]" /></div>
      ) : !templates.length ? (
        <EmptyState icon={FileText} title="No templates yet"
          description="Create reusable message templates with variables like {{name}}, {{orderId}}, etc."
          action={
            <div className="flex gap-2">
              <button onClick={seedStarters} className="btn-secondary">Load starters</button>
              <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={14} />Create Template</button>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map(tmpl => (
            <div key={tmpl._id} className="card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-white text-sm">{tmpl.name}</h3>
                  {tmpl.description && <p className="text-xs text-slate-500 mt-0.5">{tmpl.description}</p>}
                </div>
                <span className={`badge flex-shrink-0 capitalize ${CAT_COLORS[tmpl.category] || 'badge-gray'}`}>
                  {tmpl.category}
                </span>
              </div>

              <div className="flex-1 bg-white/[0.03] rounded-xl p-3">
                <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed line-clamp-6">
                  {tmpl.body}
                </pre>
              </div>

              {tmpl.variables.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tmpl.variables.map(v => (
                    <span key={v} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded font-mono">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-[#1e2d45]">
                <span className="text-xs text-slate-600">{tmpl.useCount} uses</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => copyBody(tmpl.body, tmpl._id)} className="p-1.5 hover:bg-white/10 rounded-lg transition text-slate-400 hover:text-white">
                    {copied === tmpl._id ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  </button>
                  <button onClick={() => { setEditing(tmpl); setShowModal(true) }} className="p-1.5 hover:bg-white/10 rounded-lg transition text-slate-400 hover:text-white">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => deleteTemplate(tmpl._id)} className="p-1.5 hover:bg-red-500/10 rounded-lg transition text-slate-400 hover:text-red-400">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <TemplateModal open={showModal} onClose={() => setShowModal(false)} editing={editing} onSaved={load} />
    </div>
  )
}

function TemplateModal({ open, onClose, editing, onSaved }: {
  open: boolean; onClose: () => void; editing: Template | null; onSaved: () => void
}) {
  const [form, setForm] = useState({ name: '', category: 'greeting', body: '', description: '', language: 'en' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editing) setForm({ name: editing.name, category: editing.category, body: editing.body, description: editing.description || '', language: editing.language })
    else setForm({ name: '', category: 'greeting', body: '', description: '', language: 'en' })
    setError('')
  }, [editing, open])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  // Auto-detect vars for preview
  const detectedVars = Array.from(form.body.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)).map(m => m[1])

  const submit = async () => {
    setSaving(true); setError('')
    try {
      const url = editing ? `/api/templates/${editing._id}` : '/api/templates'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) })
      if (res.ok) { onSaved(); onClose() }
      else { const d = await res.json(); setError(d.error || 'Failed') }
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Template' : 'New Template'}>
      <div className="space-y-4">
        {error && <div className="text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Name *</label>
            <input className="input" placeholder="Order Confirmation" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="select" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Message Body *</label>
          <textarea className="textarea font-mono" rows={8}
            placeholder={"Hi {{name}}, your order {{orderId}} is confirmed!"}
            value={form.body} onChange={e => set('body', e.target.value)}
          />
          {detectedVars.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              <span className="text-xs text-slate-600">Variables:</span>
              {detectedVars.map(v => (
                <span key={v} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded font-mono">{`{{${v}}}`}</span>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <input className="input" placeholder="When to use this template…" value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary">
            {saving ? <Spinner size={14} /> : null} {editing ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
