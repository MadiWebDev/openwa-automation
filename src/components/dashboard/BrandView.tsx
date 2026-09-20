'use client'
import { useEffect, useState } from 'react'
import { Settings, Save, Bot, Clock, Building2 } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function BrandView({ sessionId }: { sessionId: string }) {
  const [form, setForm] = useState({
    businessName: '', tagline: '', welcomeMessage: '', fallbackMessage: '',
    aiPersonality: 'professional and helpful', aiLanguage: 'English',
    maxAiTokens: 300, signOff: '',
    outOfHoursMessage: '', logoUrl: '', primaryColor: '#25D366',
    enableBusinessHours: false,
    businessHours: { open: '09:00', close: '18:00', timezone: 'UTC', daysOff: ['Saturday', 'Sunday'] },
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionId) { setLoading(false); return }
    fetch(`/api/brand?sessionId=${encodeURIComponent(sessionId)}`)
      .then(r => r.json())
      .then(d => {
        if (d.businessName) setForm(f => ({
          ...f, ...d,
          enableBusinessHours: !!d.businessHours,
          businessHours: d.businessHours || f.businessHours,
        }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionId])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const setBH = (k: string, v: any) => setForm(f => ({ ...f, businessHours: { ...f.businessHours, [k]: v } }))

  const toggleDay = (day: string) => {
    const days = form.businessHours.daysOff
    setBH('daysOff', days.includes(day) ? days.filter(d => d !== day) : [...days, day])
  }

  const submit = async () => {
    setSaving(true); setError(''); setSaved(false)
    try {
      const body: any = {
        sessionId,
        businessName: form.businessName,
        tagline: form.tagline,
        welcomeMessage: form.welcomeMessage,
        fallbackMessage: form.fallbackMessage,
        aiPersonality: form.aiPersonality,
        aiLanguage: form.aiLanguage,
        maxAiTokens: Number(form.maxAiTokens),
        signOff: form.signOff,
        primaryColor: form.primaryColor,
      }
      if (form.logoUrl) body.logoUrl = form.logoUrl
      if (form.enableBusinessHours) {
        body.businessHours = form.businessHours
        body.outOfHoursMessage = form.outOfHoursMessage
      }

      const res = await fetch('/api/brand', {
        method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) setSaved(true)
      else { const d = await res.json(); setError(d.error || 'Failed') }
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size={28} className="text-[#25D366]" /></div>

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="section-header">
        <div>
          <h1 className="page-title">Brand & AI Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure your AI assistant's personality and business identity</p>
        </div>
        <button onClick={submit} disabled={saving} className="btn-primary">
          {saving ? <Spinner size={14} /> : <Save size={14} />}
          {saved ? 'Saved ✓' : 'Save Settings'}
        </button>
      </div>

      {error && <div className="text-xs text-red-400 bg-red-500/10 rounded-xl px-4 py-3">{error}</div>}
      {saved && <div className="text-xs text-green-400 bg-green-500/10 rounded-xl px-4 py-3">Settings saved successfully.</div>}

      {/* Business Identity */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Building2 size={15} className="text-blue-400" /> Business Identity
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Business Name *</label>
            <input className="input" placeholder="Your Business Name" value={form.businessName} onChange={e => set('businessName', e.target.value)} />
          </div>
          <div>
            <label className="label">Tagline</label>
            <input className="input" placeholder="Your brand slogan" value={form.tagline} onChange={e => set('tagline', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Welcome Message</label>
          <textarea className="textarea" rows={3} placeholder="Sent to new contacts automatically…" value={form.welcomeMessage} onChange={e => set('welcomeMessage', e.target.value)} />
        </div>
        <div>
          <label className="label">Sign-Off</label>
          <input className="input" placeholder="e.g. Best regards, Support Team" value={form.signOff} onChange={e => set('signOff', e.target.value)} />
        </div>
      </div>

      {/* AI Configuration */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Bot size={15} className="text-purple-400" /> AI Configuration
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">AI Personality</label>
            <input className="input" placeholder="professional and helpful" value={form.aiPersonality} onChange={e => set('aiPersonality', e.target.value)} />
          </div>
          <div>
            <label className="label">Reply Language</label>
            <input className="input" placeholder="English" value={form.aiLanguage} onChange={e => set('aiLanguage', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Max AI Response Tokens</label>
          <input className="input w-32" type="number" min={50} max={2000} value={form.maxAiTokens} onChange={e => set('maxAiTokens', e.target.value)} />
          <p className="text-xs text-slate-600 mt-1">Controls response length. 300 ≈ ~230 words. GPT-4o-mini is used by default.</p>
        </div>
        <div>
          <label className="label">Fallback Message (when AI fails)</label>
          <input className="input" placeholder="Thanks for your message! We'll get back to you shortly." value={form.fallbackMessage} onChange={e => set('fallbackMessage', e.target.value)} />
        </div>
      </div>

      {/* Business Hours */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock size={15} className="text-yellow-400" /> Business Hours
          </h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <div className={`w-10 h-5 rounded-full transition ${form.enableBusinessHours ? 'bg-[#25D366]' : 'bg-slate-600'}`}
              onClick={() => set('enableBusinessHours', !form.enableBusinessHours)}>
              <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${form.enableBusinessHours ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-slate-400">{form.enableBusinessHours ? 'Enabled' : 'Disabled'}</span>
          </label>
        </div>

        {form.enableBusinessHours && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Opens at</label>
                <input className="input" type="time" value={form.businessHours.open} onChange={e => setBH('open', e.target.value)} />
              </div>
              <div>
                <label className="label">Closes at</label>
                <input className="input" type="time" value={form.businessHours.close} onChange={e => setBH('close', e.target.value)} />
              </div>
              <div>
                <label className="label">Timezone</label>
                <input className="input" placeholder="UTC" value={form.businessHours.timezone} onChange={e => setBH('timezone', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">Days Off</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {DAYS.map(day => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition ${
                      form.businessHours.daysOff.includes(day)
                        ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                        : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Out-of-Hours Message</label>
              <textarea className="textarea" rows={3}
                placeholder="We're currently closed. Our hours are Mon–Fri 9am–6pm. We'll reply as soon as we're back!"
                value={form.outOfHoursMessage} onChange={e => set('outOfHoursMessage', e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={submit} disabled={saving} className="btn-primary px-6">
          {saving ? <Spinner size={14} /> : <Save size={14} />}
          {saved ? '✓ Saved' : 'Save All Settings'}
        </button>
      </div>
    </div>
  )
}
