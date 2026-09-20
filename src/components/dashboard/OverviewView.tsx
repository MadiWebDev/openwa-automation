'use client'
import { useEffect, useState } from 'react'
import {
  Users, MessageSquare, ShoppingBag, Zap,
  TrendingUp, Clock, CheckCircle2, XCircle,
  BarChart3, ArrowUpRight, Inbox, Bot
} from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import Spinner from '@/components/ui/Spinner'

interface DashboardData {
  stats: {
    contacts: { total: number; optedIn: number }
    campaigns: { total: number; active: number }
    orders: { total: number; pending: number; active: number; byStatus: Record<string, number> }
    messages: { total: number }
    conversations: { total: number; open: number }
    automation: { activeRules: number }
  }
  recent: {
    orders: any[]
    messages: any[]
    campaigns: any[]
  }
}

function StatCard({ icon: Icon, label, value, sub, color = 'green' }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string
}) {
  const colors: Record<string, string> = {
    green: 'text-green-400 bg-green-400/10',
    blue: 'text-blue-400 bg-blue-400/10',
    purple: 'text-purple-400 bg-purple-400/10',
    yellow: 'text-yellow-400 bg-yellow-400/10',
    rose: 'text-rose-400 bg-rose-400/10',
    teal: 'text-teal-400 bg-teal-400/10',
  }
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${colors[color]}`}>
          <Icon size={20} />
        </div>
        <ArrowUpRight size={14} className="text-slate-600 mt-1" />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value.toLocaleString()}</div>
        <div className="text-sm text-slate-400">{label}</div>
        {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

function timeAgo(date: string | Date): string {
  const d = new Date(date)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function OverviewView({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await fetch(`/api/dashboard${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''}`)
      if (res.ok) setData(await res.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [sessionId])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={32} className="text-[#25D366]" />
    </div>
  )

  const s = data?.stats
  const r = data?.recent

  const orderStatusColors: Record<string, string> = {
    pending: 'bg-yellow-400', confirmed: 'bg-blue-400', processing: 'bg-purple-400',
    completed: 'bg-green-400', cancelled: 'bg-slate-400', rejected: 'bg-red-400',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Users} label="Opted-in Contacts" value={s?.contacts.optedIn ?? 0}
          sub={`${s?.contacts.total ?? 0} total`} color="green" />
        <StatCard icon={Inbox} label="Open Conversations" value={s?.conversations.open ?? 0}
          sub={`${s?.conversations.total ?? 0} total`} color="blue" />
        <StatCard icon={ShoppingBag} label="Pending Orders" value={s?.orders.pending ?? 0}
          sub={`${s?.orders.active ?? 0} active`} color="yellow" />
        <StatCard icon={MessageSquare} label="Total Messages" value={s?.messages.total ?? 0}
          color="teal" />
        <StatCard icon={Zap} label="Active Campaigns" value={s?.campaigns.active ?? 0}
          sub={`${s?.campaigns.total ?? 0} total`} color="purple" />
        <StatCard icon={Bot} label="Automation Rules" value={s?.automation.activeRules ?? 0}
          color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShoppingBag size={15} className="text-yellow-400" /> Recent Orders
            </h3>
            <span className="text-xs text-slate-500">{r?.orders.length ?? 0} shown</span>
          </div>
          {!r?.orders.length ? (
            <p className="text-sm text-slate-500 text-center py-8">No orders yet</p>
          ) : (
            <div className="space-y-2">
              {r.orders.map((o: any) => (
                <div key={o._id} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl hover:bg-white/[0.06] transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366] text-xs font-bold">
                      {(o.contactName || o.phone || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{o.orderId}</div>
                      <div className="text-xs text-slate-500">{o.contactName || o.phone} · {o.items?.length ?? 0} item(s)</div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <StatusBadge status={o.status} size="sm" />
                    <span className="text-xs text-slate-600">{timeAgo(o.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Breakdown */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <BarChart3 size={15} className="text-purple-400" /> Orders by Status
          </h3>
          <div className="space-y-3">
            {Object.entries(s?.orders.byStatus ?? {}).length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No order data</p>
            ) : Object.entries(s?.orders.byStatus ?? {}).map(([status, count]) => (
              <div key={status}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 capitalize">{status}</span>
                  <span className="text-white font-medium">{count}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${orderStatusColors[status] ?? 'bg-slate-500'} transition-all duration-500`}
                    style={{ width: `${Math.min(100, (count / (s?.orders.total || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Recent Campaigns */}
          <div className="mt-6 pt-5 border-t border-[#1e2d45]">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <TrendingUp size={15} className="text-blue-400" /> Recent Campaigns
            </h3>
            {!r?.campaigns.length ? (
              <p className="text-xs text-slate-500 text-center py-3">No campaigns</p>
            ) : r.campaigns.map((c: any) => (
              <div key={c._id} className="flex items-center justify-between py-2 border-b border-[#1e2d45] last:border-0">
                <div>
                  <div className="text-xs font-medium text-slate-200">{c.name}</div>
                  <div className="text-xs text-slate-600">{timeAgo(c.createdAt)}</div>
                </div>
                <StatusBadge status={c.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Messages */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
          <MessageSquare size={15} className="text-teal-400" /> Recent Inbound Messages
        </h3>
        {!r?.messages.length ? (
          <p className="text-sm text-slate-500 text-center py-6">No messages received yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {r.messages.map((m: any) => (
              <div key={m._id} className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                <div className="w-8 h-8 rounded-full bg-[#128C7E]/20 flex items-center justify-center text-[#25D366] text-xs font-bold flex-shrink-0 mt-0.5">
                  {(m.phone || '?').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-300 truncate">{m.phone}</span>
                    <span className="text-xs text-slate-600 flex-shrink-0">{timeAgo(m.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{m.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
