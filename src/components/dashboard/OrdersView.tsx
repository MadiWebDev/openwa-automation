'use client'
import { useEffect, useState, useCallback } from 'react'
import { ShoppingBag, Plus, Search, RefreshCw, ChevronDown, Package, Phone } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import Modal from '@/components/ui/Modal'

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'completed', 'cancelled', 'rejected'] as const
type OrderStatus = typeof ORDER_STATUSES[number]

interface Order {
  _id: string
  orderId: string
  phone: string
  contactName?: string
  sessionId: string
  items: { name: string; quantity: number; price?: number }[]
  totalAmount?: number
  currency?: string
  status: OrderStatus
  notes?: string
  address?: string
  createdAt: string
  updatedAt: string
  statusHistory: { status: string; reason?: string; changedAt: string }[]
}

function timeAgo(date: string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(date).toLocaleDateString()
}

export default function OrdersView({ sessionId }: { sessionId: string }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Order | null>(null)
  const [updateStatus, setUpdateStatus] = useState<{ orderId: string; current: OrderStatus } | null>(null)
  const [newStatus, setNewStatus] = useState<OrderStatus>('confirmed')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (sessionId) params.set('sessionId', sessionId)
      if (statusFilter) params.set('status', statusFilter)
      params.set('limit', '50')
      const res = await fetch(`/api/orders?${params}`)
      if (res.ok) { const d = await res.json(); setOrders(d.orders); setTotal(d.total) }
    } catch {}
    setLoading(false)
  }, [sessionId, statusFilter])

  useEffect(() => { load() }, [load])

  const handleStatusUpdate = async () => {
    if (!updateStatus) return
    setSaving(true)
    try {
      await fetch(`/api/orders/${updateStatus.orderId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason }),
      })
      setUpdateStatus(null); setReason('')
      await load()
    } catch {}
    setSaving(false)
  }

  const filtered = orders.filter(o =>
    !search || o.orderId.toLowerCase().includes(search.toLowerCase()) ||
    (o.phone || '').includes(search) || (o.contactName || '').toLowerCase().includes(search.toLowerCase())
  )

  const statusCounts = ORDER_STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length; return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} total orders</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-secondary"><RefreshCw size={14} /></button>
          <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={14} />New Order</button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['', ...ORDER_STATUSES] as const).map(s => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              statusFilter === s
                ? 'bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30'
                : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            {s || 'All'} {s ? `(${statusCounts[s] ?? 0})` : `(${orders.length})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="input pl-9"
          placeholder="Search by Order ID, phone, or name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} className="text-[#25D366]" /></div>
      ) : !filtered.length ? (
        <EmptyState icon={ShoppingBag} title="No orders found"
          description="Orders created via WhatsApp or manually will appear here."
          action={<button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={14} />Create Order</button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e2d45]">
                  {['Order ID', 'Customer', 'Items', 'Amount', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr key={order._id} className="border-b border-[#1e2d45]/50 table-row-hover">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-[#25D366]">{order.orderId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366] text-xs font-bold">
                          {(order.contactName || order.phone || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-white text-xs">{order.contactName || 'Unknown'}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Phone size={10} />{order.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">
                      {order.items?.slice(0, 2).map(i => `${i.name} ×${i.quantity}`).join(', ')}
                      {(order.items?.length ?? 0) > 2 && ` +${order.items.length - 2} more`}
                    </td>
                    <td className="px-4 py-3 text-slate-200 text-xs font-medium">
                      {order.totalAmount ? `${order.currency ?? 'USD'} ${order.totalAmount}` : '—'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} size="sm" /></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{timeAgo(order.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelected(order)}
                          className="px-2.5 py-1 text-xs bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition"
                        >View</button>
                        <button
                          onClick={() => { setUpdateStatus({ orderId: order._id, current: order.status }); setNewStatus(order.status) }}
                          className="px-2.5 py-1 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition"
                        >Update</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Order ${selected?.orderId}`} maxWidth="max-w-2xl">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Customer</div>
                <div className="font-medium text-white">{selected.contactName || 'Unknown'}</div>
                <div className="text-xs text-slate-400">{selected.phone}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Status</div>
                <StatusBadge status={selected.status} />
                <div className="text-xs text-slate-500 mt-1">Updated {timeAgo(selected.updatedAt)}</div>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-3">Items</div>
              <div className="space-y-2">
                {selected.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-300">{item.name} <span className="text-slate-500">×{item.quantity}</span></span>
                    {item.price && <span className="text-white font-medium">{selected.currency} {item.price}</span>}
                  </div>
                ))}
              </div>
              {selected.totalAmount && (
                <div className="flex justify-between text-sm font-semibold mt-3 pt-3 border-t border-white/10">
                  <span className="text-slate-300">Total</span>
                  <span className="text-white">{selected.currency} {selected.totalAmount}</span>
                </div>
              )}
            </div>

            {selected.notes && (
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Notes</div>
                <p className="text-sm text-slate-300">{selected.notes}</p>
              </div>
            )}

            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-3">Status History</div>
              <div className="space-y-2">
                {selected.statusHistory?.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-[#25D366] flex-shrink-0" />
                    <span className="capitalize text-slate-300 font-medium">{h.status}</span>
                    {h.reason && <span className="text-slate-500">— {h.reason}</span>}
                    <span className="ml-auto text-slate-600">{timeAgo(h.changedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Update Status Modal */}
      <Modal open={!!updateStatus} onClose={() => setUpdateStatus(null)} title="Update Order Status">
        {updateStatus && (
          <div className="space-y-4">
            <div>
              <label className="label">New Status</label>
              <select className="select" value={newStatus} onChange={e => setNewStatus(e.target.value as OrderStatus)}>
                {ORDER_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Reason (optional)</label>
              <input className="input" placeholder="e.g. Out of stock, Customer requested…" value={reason} onChange={e => setReason(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setUpdateStatus(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleStatusUpdate} className="btn-primary" disabled={saving}>
                {saving ? <Spinner size={14} /> : null} Update Status
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Order Modal */}
      <CreateOrderModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        sessionId={sessionId}
        onCreated={load}
      />
    </div>
  )
}

function CreateOrderModal({ open, onClose, sessionId, onCreated }: {
  open: boolean; onClose: () => void; sessionId: string; onCreated: () => void
}) {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemQty, setItemQty] = useState(1)
  const [itemPrice, setItemPrice] = useState('')
  const [items, setItems] = useState<{ name: string; quantity: number; price?: number }[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addItem = () => {
    if (!itemName.trim()) return
    setItems([...items, { name: itemName.trim(), quantity: itemQty, price: itemPrice ? parseFloat(itemPrice) : undefined }])
    setItemName(''); setItemQty(1); setItemPrice('')
  }

  const submit = async () => {
    if (!phone || !items.length) { setError('Phone and at least one item are required'); return }
    setSaving(true); setError('')
    try {
      const total = items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0)
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone, contactName: name, sessionId, items, totalAmount: total || undefined, notes }),
      })
      if (res.ok) { onCreated(); onClose(); setPhone(''); setName(''); setItems([]); setNotes('') }
      else { const d = await res.json(); setError(d.error || 'Failed') }
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Create New Order">
      <div className="space-y-4">
        {error && <div className="text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Phone *</label>
            <input className="input" placeholder="e.g. 1234567890@c.us" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="label">Customer Name</label>
            <input className="input" placeholder="Optional" value={name} onChange={e => setName(e.target.value)} />
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-400 mb-3">Items</div>
          <div className="flex gap-2 mb-3">
            <input className="input flex-1" placeholder="Item name" value={itemName} onChange={e => setItemName(e.target.value)} />
            <input className="input w-16 text-center" type="number" min={1} value={itemQty} onChange={e => setItemQty(parseInt(e.target.value) || 1)} />
            <input className="input w-20" placeholder="Price" value={itemPrice} onChange={e => setItemPrice(e.target.value)} />
            <button onClick={addItem} className="btn-primary px-3"><Plus size={14} /></button>
          </div>
          {items.length > 0 && (
            <div className="space-y-1">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-slate-300">{item.name} ×{item.quantity}</span>
                  <div className="flex items-center gap-2">
                    {item.price && <span className="text-slate-400">${item.price}</span>}
                    <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300">×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea className="textarea" rows={2} placeholder="Delivery instructions, special requests…" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary">
            {saving ? <Spinner size={14} /> : <Plus size={14} />} Create Order
          </button>
        </div>
      </div>
    </Modal>
  )
}
