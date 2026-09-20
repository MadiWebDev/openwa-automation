'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { MessageSquare, Send, RefreshCw, Search, ChevronRight } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'

interface Conversation {
  _id: string
  phone: string
  sessionId: string
  lastMessage: string
  lastMessageAt: string
  lastMessageDirection: 'inbound' | 'outbound'
  unreadCount: number
  status: string
}

interface Message {
  _id: string
  direction: 'inbound' | 'outbound'
  text: string
  createdAt: string
  status?: string
  source?: string
}

function timeAgo(date: string): string {
  if (!date) return ''
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return new Date(date).toLocaleDateString()
}

export default function ConversationsView({ sessionId }: { sessionId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [msgLoading, setMsgLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadConversations = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (sessionId) params.set('sessionId', sessionId)
      params.set('limit', '100')
      const res = await fetch(`/api/conversations?${params}`)
      if (res.ok) { const d = await res.json(); setConversations(d.conversations) }
    } catch {}
    setLoading(false)
  }, [sessionId])

  const loadMessages = useCallback(async (conv: Conversation) => {
    setMsgLoading(true)
    setMessages([])
    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(conv.phone)}?sessionId=${encodeURIComponent(conv.sessionId)}`)
      if (res.ok) { const d = await res.json(); setMessages(d.messages) }
    } catch {}
    setMsgLoading(false)
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])
  useEffect(() => { if (selected) loadMessages(selected) }, [selected, loadMessages])
  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendReply = async () => {
    if (!reply.trim() || !selected) return
    setSending(true)
    try {
      await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId: selected.sessionId, phone: selected.phone, text: reply }),
      })
      setReply('')
      await loadMessages(selected)
      await loadConversations()
    } catch {}
    setSending(false)
  }

  const filtered = conversations.filter(c =>
    !search || c.phone.includes(search) || c.lastMessage?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="animate-fade-in">
      <div className="section-header mb-5">
        <h1 className="page-title">Conversations</h1>
        <button onClick={loadConversations} className="btn-secondary"><RefreshCw size={14} /></button>
      </div>

      <div className="card flex overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: 500 }}>
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 border-r border-[#1e2d45] flex flex-col">
          <div className="p-3 border-b border-[#1e2d45]">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className="input pl-8 py-2 text-xs" placeholder="Search conversations…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12"><Spinner size={22} className="text-[#25D366]" /></div>
            ) : !filtered.length ? (
              <div className="text-center py-12 text-slate-500 text-xs px-4">No conversations yet. Messages will appear here when contacts write to you.</div>
            ) : filtered.map(conv => (
              <button
                key={conv._id}
                onClick={() => setSelected(conv)}
                className={`w-full text-left p-3 border-b border-[#1e2d45]/50 hover:bg-white/[0.03] transition flex items-start gap-3 ${selected?._id === conv._id ? 'bg-[#25D366]/5' : ''}`}
              >
                <div className="w-9 h-9 rounded-full bg-[#128C7E]/20 flex items-center justify-center text-[#25D366] text-sm font-bold flex-shrink-0">
                  {conv.phone.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-medium text-white truncate">{conv.phone}</span>
                    <span className="text-xs text-slate-600 flex-shrink-0">{timeAgo(conv.lastMessageAt)}</span>
                  </div>
                  <p className={`text-xs mt-0.5 truncate ${conv.lastMessageDirection === 'inbound' ? 'text-slate-300' : 'text-slate-500'}`}>
                    {conv.lastMessageDirection === 'outbound' && <span className="text-slate-600">↪ </span>}
                    {conv.lastMessage}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#25D366] text-black text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare size={40} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Select a conversation</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Chat header */}
            <div className="px-5 py-3.5 border-b border-[#1e2d45] flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#128C7E]/20 flex items-center justify-center text-[#25D366] font-bold">
                {selected.phone.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium text-white">{selected.phone}</div>
                <div className="text-xs text-slate-500">Session: {selected.sessionId}</div>
              </div>
              <div className="ml-auto">
                <button onClick={() => loadMessages(selected)} className="text-slate-500 hover:text-white transition">
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {msgLoading ? (
                <div className="flex justify-center py-12"><Spinner size={22} className="text-[#25D366]" /></div>
              ) : !messages.length ? (
                <p className="text-center text-xs text-slate-600 py-12">No messages in history</p>
              ) : messages.map(msg => (
                <div key={msg._id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.direction === 'outbound'
                      ? 'bg-[#25D366]/20 text-white rounded-br-sm'
                      : 'bg-white/[0.07] text-slate-200 rounded-bl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    <div className={`text-[10px] mt-1 flex items-center gap-1 ${msg.direction === 'outbound' ? 'text-green-400/60 justify-end' : 'text-slate-600'}`}>
                      {timeAgo(msg.createdAt)}
                      {msg.source && msg.source !== 'manual' && (
                        <span className="opacity-70">· {msg.source === 'auto_reply' ? '🤖' : msg.source}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply box */}
            <div className="p-4 border-t border-[#1e2d45]">
              <div className="flex items-end gap-2">
                <textarea
                  className="textarea flex-1 resize-none py-2.5 min-h-[42px] max-h-32"
                  rows={1}
                  placeholder="Type a reply…"
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                />
                <button
                  onClick={sendReply}
                  disabled={!reply.trim() || sending}
                  className="btn-primary px-4 py-2.5 flex-shrink-0"
                >
                  {sending ? <Spinner size={14} /> : <Send size={14} />}
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-1.5">Enter to send · Shift+Enter for new line</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
