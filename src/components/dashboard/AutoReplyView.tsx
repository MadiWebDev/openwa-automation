'use client'
import { useEffect, useState, useCallback } from 'react'
import { Bot, Plus, Trash2, RefreshCw, ToggleLeft, ToggleRight, Edit2, Zap } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import Modal from '@/components/ui/Modal'

interface Rule {
  _id: string
  sessionId: string
  name: string
  trigger: 'keyword' | 'regex' | 'any' | 'order_keyword'
  pattern?: string
  keywords?: string[]
  responseType: 'fixed' | 'ai' | 'template'
  fixedResponse?: string
  templateId?: string
  aiInstructions?: string
  isActive: boolean
  priority: number
  matchCount?: number
  createdAt: string
}

const TRIGGER_LABELS: Record<string, string> = {
  keyword: 'Keyword Match', regex: 'Regex Pattern',
  any: 'Any Message', order_keyword: 'Order Intent',
}
const RESPONSE_LABELS: Record<string, string> = {
  fixed: 'Fixed Reply', ai: 'AI Reply', template: 'Template',
}
const RESPONSE_COLORS: Record<string, string> = {
  fixed: 'badge-blue', ai: 'badge-purple', template: 'badge-green',
}

export default function AutoReplyView({ sessionId }: { sessionId: string }) {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Rule | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/auto-reply${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''}`)
      if (res.ok) setRules(await res.json())
    } catch {}
    setLoading(false)
  }, [sessionId])

  useEffect(() => { load() }, [load])

  const toggleRule = async (rule: Rule) => {
    await fetch(`/api/auto-reply/${rule._id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isActive: !rule.isActive }),
    })
    setRules(rules.map(r => r._id === rule._id ? { ...r, isActive: !r.isActive } : r))
  }

  const deleteRule = async (id: string) => {
    if (!confirm('Delete this rule?')) return
    await fetch(`/api/auto-reply/${id}`, { method: 'DELETE' })
    setRules(rules.filter(r => r._id !== id))
  }

  const openCreate = () => { setEditing(null); setShowModal(true) }
  const openEdit = (rule: Rule) => { setEditing(rule); setShowModal(true) }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Auto Reply Rules</h1>
          <p className="text-sm text-slate-500 mt-0.5">{rules.filter(r => r.isActive).length} active rules</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary"><RefreshCw size={14} /></button>
          <button onClick={openCreate} className="btn-primary"><Plus size={14} />New Rule</button>
        </div>
      </div>

      {/* AI notice */}
      <div className="flex items-start gap-3 p-4 bg-purple-500/5 border border-purple-500/15 rounded-xl">
        <Bot size={18} className="text-purple-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-sm font-medium text-purple-300">AI-Powered Replies</div>
          <p className="text-xs text-purple-400/70 mt-0.5">
            Rules with <strong>AI Reply</strong> type use GPT-4o-mini with your brand context and conversation history.
            Set OPENAI_API_KEY in your environment to enable. Business hours and brand settings apply automatically.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} className="text-[#25D366]" /></div>
      ) : !rules.length ? (
        <EmptyState icon={Bot} title="No automation rules"
          description="Create rules to auto-reply to keywords, regex patterns, or any incoming message — with fixed text, templates, or AI."
          action={<button onClick={openCreate} className="btn-primary"><Plus size={14} />Create Rule</button>}
        />
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule._id} className={`card p-4 flex items-start gap-4 transition ${!rule.isActive ? 'opacity-50' : ''}`}>
              <div className={`p-2.5 rounded-xl flex-shrink-0 ${rule.isActive ? 'bg-purple-500/10 text-purple-400' : 'bg-white/5 text-slate-500'}`}>
                <Zap size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white text-sm">{rule.name}</span>
                  <span className={`badge ${RESPONSE_COLORS[rule.responseType]}`}>{RESPONSE_LABELS[rule.responseType]}</span>
                  <span className="badge badge-gray">{TRIGGER_LABELS[rule.trigger]}</span>
                  {rule.matchCount ? <span className="text-xs text-slate-600">{rule.matchCount} matches</span> : null}
                </div>
                {rule.keywords?.length ? (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {rule.keywords.map(kw => (
                      <span key={kw} className="px-2 py-0.5 bg-white/5 text-slate-400 text-xs rounded-md font-mono">{kw}</span>
                    ))}
                  </div>
                ) : rule.pattern ? (
                  <code className="text-xs text-slate-400 font-mono mt-1 block">{rule.pattern}</code>
                ) : null}
                {rule.fixedResponse && (
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">↪ {rule.fixedResponse}</p>
                )}
                {rule.aiInstructions && (
                  <p className="text-xs text-purple-400/70 mt-1.5 line-clamp-1">🤖 {rule.aiInstructions}</p>
                )}
                <div className="text-xs text-slate-600 mt-1.5">Priority {rule.priority}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleRule(rule)} className="text-slate-400 hover:text-white transition">
                  {rule.isActive ? <ToggleRight size={22} className="text-[#25D366]" /> : <ToggleLeft size={22} />}
                </button>
                <button onClick={() => openEdit(rule)} className="p-1.5 hover:bg-white/10 rounded-lg transition text-slate-400 hover:text-white">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => deleteRule(rule._id)} className="p-1.5 hover:bg-red-500/10 rounded-lg transition text-slate-400 hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <RuleModal
        open={showModal}
        onClose={() => setShowModal(false)}
        sessionId={sessionId}
        editing={editing}
        onSaved={load}
      />
    </div>
  )
}

function RuleModal({ open, onClose, sessionId, editing, onSaved }: {
  open: boolean; onClose: () => void; sessionId: string; editing: Rule | null; onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: '', trigger: 'keyword', pattern: '', keywords: '',
    responseType: 'fixed', fixedResponse: '', aiInstructions: '', templateId: '',
    isActive: true, priority: 10,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name, trigger: editing.trigger, pattern: editing.pattern || '',
        keywords: editing.keywords?.join(', ') || '', responseType: editing.responseType,
        fixedResponse: editing.fixedResponse || '', aiInstructions: editing.aiInstructions || '',
        templateId: editing.templateId || '', isActive: editing.isActive, priority: editing.priority,
      })
    } else {
      setForm({ name: '', trigger: 'keyword', pattern: '', keywords: '', responseType: 'fixed',
        fixedResponse: '', aiInstructions: '', templateId: '', isActive: true, priority: 10 })
    }
    setError('')
  }, [editing, open])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setSaving(true); setError('')
    try {
      const body = {
        sessionId, name: form.name, trigger: form.trigger,
        pattern: form.trigger === 'regex' ? form.pattern : undefined,
        keywords: form.trigger === 'keyword' || form.trigger === 'order_keyword'
          ? form.keywords.split(',').map(k => k.trim()).filter(Boolean) : undefined,
        responseType: form.responseType,
        fixedResponse: form.responseType === 'fixed' ? form.fixedResponse : undefined,
        aiInstructions: form.responseType === 'ai' ? form.aiInstructions : undefined,
        templateId: form.responseType === 'template' ? form.templateId : undefined,
        isActive: form.isActive, priority: Number(form.priority),
      }

      const url = editing ? `/api/auto-reply/${editing._id}` : '/api/auto-reply'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { onSaved(); onClose() }
      else { const d = await res.json(); setError(d.error || 'Failed to save') }
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Rule' : 'New Auto Reply Rule'}>
      <div className="space-y-4">
        {error && <div className="text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{error}</div>}

        <div>
          <label className="label">Rule Name *</label>
          <input className="input" placeholder="e.g. Greeting Reply" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Trigger Type</label>
            <select className="select" value={form.trigger} onChange={e => set('trigger', e.target.value)}>
              <option value="keyword">Keyword Match</option>
              <option value="regex">Regex Pattern</option>
              <option value="any">Any Message</option>
              <option value="order_keyword">Order Intent</option>
            </select>
          </div>
          <div>
            <label className="label">Priority (lower = first)</label>
            <input className="input" type="number" min={0} value={form.priority} onChange={e => set('priority', e.target.value)} />
          </div>
        </div>

        {(form.trigger === 'keyword' || form.trigger === 'order_keyword') && (
          <div>
            <label className="label">Keywords (comma-separated)</label>
            <input className="input" placeholder="hello, hi, hey, good morning" value={form.keywords} onChange={e => set('keywords', e.target.value)} />
          </div>
        )}
        {form.trigger === 'regex' && (
          <div>
            <label className="label">Regex Pattern</label>
            <input className="input font-mono" placeholder="\border\b" value={form.pattern} onChange={e => set('pattern', e.target.value)} />
          </div>
        )}

        <div>
          <label className="label">Response Type</label>
          <div className="grid grid-cols-3 gap-2">
            {(['fixed', 'ai', 'template'] as const).map(t => (
              <button
                key={t}
                onClick={() => set('responseType', t)}
                className={`py-2 rounded-xl text-xs font-medium border transition ${
                  form.responseType === t
                    ? 'bg-[#25D366]/15 border-[#25D366]/30 text-[#25D366]'
                    : 'bg-white/5 border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {t === 'fixed' ? '✉️ Fixed' : t === 'ai' ? '🤖 AI' : '📋 Template'}
              </button>
            ))}
          </div>
        </div>

        {form.responseType === 'fixed' && (
          <div>
            <label className="label">Reply Message *</label>
            <textarea className="textarea" rows={4} placeholder="Your automatic reply…" value={form.fixedResponse} onChange={e => set('fixedResponse', e.target.value)} />
          </div>
        )}
        {form.responseType === 'ai' && (
          <div>
            <label className="label">AI Instructions (optional)</label>
            <textarea className="textarea" rows={3} placeholder="e.g. Always ask for the customer's order number. Be concise." value={form.aiInstructions} onChange={e => set('aiInstructions', e.target.value)} />
            <p className="text-xs text-slate-500 mt-1.5">Extra context on top of your brand settings. Leave empty to use brand defaults.</p>
          </div>
        )}
        {form.responseType === 'template' && (
          <div>
            <label className="label">Template Name or ID</label>
            <input className="input" placeholder="template-name or MongoDB _id" value={form.templateId} onChange={e => set('templateId', e.target.value)} />
          </div>
        )}

        <div className="flex items-center gap-3 py-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />
            <div className={`w-10 h-5 rounded-full transition ${form.isActive ? 'bg-[#25D366]' : 'bg-slate-600'}`}>
              <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </label>
          <span className="text-sm text-slate-400">{form.isActive ? 'Rule is active' : 'Rule is disabled'}</span>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary">
            {saving ? <Spinner size={14} /> : null} {editing ? 'Save Changes' : 'Create Rule'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
