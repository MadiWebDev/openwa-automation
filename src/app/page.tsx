'use client'

import { useState, useEffect } from 'react'
import {
  LayoutDashboard, MessageSquare, ShoppingBag, Bot,
  Megaphone, FileText, Users, Settings, Smartphone,
  ChevronDown, Menu, X, Zap, Activity, Bell
} from 'lucide-react'
import dynamic from 'next/dynamic'
import Spinner from '@/components/ui/Spinner'

// Lazy load heavy views
const OverviewView     = dynamic(() => import('@/components/dashboard/OverviewView'),     { loading: () => <PageLoader /> })
const OrdersView       = dynamic(() => import('@/components/dashboard/OrdersView'),       { loading: () => <PageLoader /> })
const AutoReplyView    = dynamic(() => import('@/components/dashboard/AutoReplyView'),    { loading: () => <PageLoader /> })
const CampaignsView    = dynamic(() => import('@/components/dashboard/CampaignsView'),    { loading: () => <PageLoader /> })
const ConversationsView= dynamic(() => import('@/components/dashboard/ConversationsView'),{ loading: () => <PageLoader /> })
const TemplatesView    = dynamic(() => import('@/components/dashboard/TemplatesView'),    { loading: () => <PageLoader /> })
const ContactsView     = dynamic(() => import('@/components/dashboard/ContactsView'),     { loading: () => <PageLoader /> })
const BrandView        = dynamic(() => import('@/components/dashboard/BrandView'),        { loading: () => <PageLoader /> })
const SessionsView     = dynamic(() => import('@/components/dashboard/SessionsView'),     { loading: () => <PageLoader /> })

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={28} className="text-[#25D366]" />
    </div>
  )
}

type ViewId = 'overview' | 'conversations' | 'orders' | 'auto-reply' | 'campaigns' | 'templates' | 'contacts' | 'brand' | 'sessions'

interface NavItem {
  id: ViewId
  label: string
  icon: any
  badge?: string
  group?: string
}

const NAV: NavItem[] = [
  { id: 'overview',       label: 'Overview',       icon: LayoutDashboard, group: 'Main' },
  { id: 'conversations',  label: 'Conversations',  icon: MessageSquare,   group: 'Main' },
  { id: 'orders',         label: 'Orders',         icon: ShoppingBag,     group: 'Main' },
  { id: 'auto-reply',     label: 'Auto Reply',     icon: Bot,             group: 'Automation' },
  { id: 'campaigns',      label: 'Campaigns',      icon: Megaphone,       group: 'Automation' },
  { id: 'templates',      label: 'Templates',      icon: FileText,        group: 'Automation' },
  { id: 'contacts',       label: 'Contacts',       icon: Users,           group: 'Data' },
  { id: 'sessions',       label: 'Sessions',       icon: Smartphone,      group: 'Settings' },
  { id: 'brand',          label: 'Brand & AI',     icon: Settings,        group: 'Settings' },
]

const GROUPS = ['Main', 'Automation', 'Data', 'Settings']

export default function Dashboard() {
  const [view, setView] = useState<ViewId>('overview')
  const [sessionId, setSessionId] = useState('')
  const [sessions, setSessions] = useState<any[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [health, setHealth] = useState<'ok' | 'error' | 'loading'>('loading')

  // Load sessions for the selector
  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then((d: any) => {
        // API may return an array directly, or wrap it in a property
        const list: any[] = Array.isArray(d) ? d : Array.isArray(d?.sessions) ? d.sessions : []
        setSessions(list)
        if (list.length > 0 && !sessionId) setSessionId(list[0].id || list[0].name || '')
      })
      .catch(() => setSessions([]))

    fetch('/api/health')
      .then(r => r.ok ? setHealth('ok') : setHealth('error'))
      .catch(() => setHealth('error'))
  }, [])

  const navigate = (id: ViewId) => {
    setView(id)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0d16]">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col bg-[#0d1120] border-r border-[#1a2235]
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-[#1a2235] flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center flex-shrink-0">
            <Zap size={18} className="text-black" />
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">WhatsApp</div>
            <div className="text-xs text-[#25D366] font-medium">Control Plane</div>
          </div>
          <button className="ml-auto lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Session picker */}
        <div className="px-3 py-3 border-b border-[#1a2235] flex-shrink-0">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest font-medium mb-1.5 px-2">Active Session</div>
          <div className="relative">
            <select
              className="w-full bg-white/5 border border-[#1e2d45] text-slate-200 rounded-xl px-3 py-2 text-xs appearance-none focus:outline-none focus:border-[#25D366] cursor-pointer pr-8"
              value={sessionId}
              onChange={e => setSessionId(e.target.value)}
            >
              <option value="">— Select session —</option>
              {sessions && sessions?.map(s => (
                <option key={s.id || s.name} value={s.id || s.name}>{s.name || s.id}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {GROUPS.map(group => {
            const items = NAV.filter(n => n.group === group)
            return (
              <div key={group}>
                <div className="text-[10px] text-slate-600 uppercase tracking-widest font-medium mb-1.5 px-2">{group}</div>
                <div className="space-y-0.5">
                  {items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.id)}
                      className={`nav-item ${view === item.id ? 'active' : ''}`}
                    >
                      <item.icon size={16} />
                      {item.label}
                      {item.badge && (
                        <span className="ml-auto text-[10px] bg-[#25D366]/20 text-[#25D366] px-1.5 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Status footer */}
        <div className="px-4 py-3 border-t border-[#1a2235] flex-shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              health === 'ok' ? 'bg-green-400' : health === 'error' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'
            }`} />
            <span className="text-slate-500 truncate">
              {health === 'ok' ? 'Connected to OpenWA' : health === 'error' ? 'Connection issues' : 'Checking…'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center gap-4 px-6 border-b border-[#1a2235] bg-[#0d1120] flex-shrink-0">
          <button className="lg:hidden text-slate-400 hover:text-white transition" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Activity size={14} className="text-[#25D366]" />
            <span>{NAV.find(n => n.id === view)?.label}</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Session indicator */}
            {sessionId && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#25D366]/5 border border-[#25D366]/15 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                <span className="text-xs text-[#25D366] font-medium">{sessionId}</span>
              </div>
            )}

            {/* Send message quick action */}
            <QuickSendButton sessionId={sessionId} />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {view === 'overview'      && <OverviewView sessionId={sessionId} />}
          {view === 'conversations' && <ConversationsView sessionId={sessionId} />}
          {view === 'orders'        && <OrdersView sessionId={sessionId} />}
          {view === 'auto-reply'    && <AutoReplyView sessionId={sessionId} />}
          {view === 'campaigns'     && <CampaignsView sessionId={sessionId} />}
          {view === 'templates'     && <TemplatesView />}
          {view === 'contacts'      && <ContactsView />}
          {view === 'sessions'      && <SessionsView onSessionChange={(id) => { setSessionId(id); setView('overview') }} />}
          {view === 'brand'         && <BrandView sessionId={sessionId} />}
        </main>
      </div>
    </div>
  )
}

// Quick send floating button
function QuickSendButton({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const send = async () => {
    if (!phone || !text || !sessionId) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, phone, text }),
      })
      const data = await res.json()
      if (res.ok) {
        setSent(true)
        setPhone('')
        setText('')
        setTimeout(() => { setSent(false); setOpen(false) }, 1500)
      } else {
        setError(data.error || `Send failed (${res.status})`)
      }
    } catch (e: any) {
      setError(e.message || 'Network error')
    }
    setSending(false)
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] text-xs font-medium rounded-lg transition border border-[#25D366]/20">
        <MessageSquare size={13} /> Quick Send
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="bg-[#161b2e] border border-[#1e2d45] rounded-2xl w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d45]">
              <h2 className="text-base font-semibold text-white flex items-center gap-2"><MessageSquare size={15} /> Quick Send</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"><X size={15} /></button>
            </div>
            <div className="p-6 space-y-4">
              {sent ? (
                <div className="text-center py-6 text-green-400">
                  <div className="text-2xl mb-2">✓</div>
                  <div className="text-sm font-medium">Message sent!</div>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2 border border-red-500/20">
                      ⚠ {error}
                    </div>
                  )}
                  <div>
                    <label className="label">To (Phone)</label>
                    <input className="input" placeholder="1234567890@c.us" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Message</label>
                    <textarea className="textarea" rows={4} placeholder="Type your message…" value={text} onChange={e => setText(e.target.value)} />
                  </div>
                  {!sessionId && <p className="text-xs text-yellow-400">⚠ No session selected. Choose a session in the sidebar.</p>}
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
                    <button onClick={send} disabled={sending || !sessionId || !phone || !text} className="btn-primary">
                      {sending ? <Spinner size={14} /> : <MessageSquare size={14} />} Send
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
