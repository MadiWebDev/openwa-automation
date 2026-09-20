interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

const statusMap: Record<string, string> = {
  // Orders
  pending:    'badge-yellow',
  confirmed:  'badge-blue',
  processing: 'badge-purple',
  completed:  'badge-green',
  cancelled:  'badge-gray',
  rejected:   'badge-red',
  // Campaigns
  queued:     'badge-yellow',
  running:    'badge-blue',
  // Sessions / misc
  connected:  'badge-green',
  ready:      'badge-green',
  active:     'badge-green',
  disconnected: 'badge-gray',
  failed:     'badge-red',
  sent:       'badge-green',
  accepted:   'badge-blue',
  blocked:    'badge-red',
  // Contacts
  opted_in:   'badge-green',
  opted_out:  'badge-red',
  // Misc
  open:       'badge-blue',
  closed:     'badge-gray',
  draft:      'badge-gray',
}

const dotMap: Record<string, string> = {
  pending: 'bg-yellow-400', confirmed: 'bg-blue-400', processing: 'bg-purple-400',
  completed: 'bg-green-400', cancelled: 'bg-slate-400', rejected: 'bg-red-400',
  queued: 'bg-yellow-400', running: 'bg-blue-400', connected: 'bg-green-400',
  ready: 'bg-green-400', active: 'bg-green-400', disconnected: 'bg-slate-400',
  failed: 'bg-red-400', sent: 'bg-green-400', accepted: 'bg-blue-400',
  open: 'bg-blue-400', closed: 'bg-slate-400',
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const cls = statusMap[status.toLowerCase()] || 'badge-gray'
  const dot = dotMap[status.toLowerCase()] || 'bg-slate-400'
  return (
    <span className={`${cls} ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} inline-block`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
