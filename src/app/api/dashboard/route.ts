import { NextResponse } from 'next/server'
import { collection } from '@/lib/mongodb'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    const matchSession = sessionId ? { sessionId } : {}
    const matchSessionOrAll = sessionId ? { sessionId } : {}

    const [
      totalContacts,
      totalOptedIn,
      totalCampaigns,
      activeCampaigns,
      totalOrders,
      pendingOrders,
      confirmedOrders,
      totalMessages,
      totalConversations,
      openConversations,
      activeRules,
      recentOrders,
      recentMessages,
      campaignStats,
      ordersByStatus,
    ] = await Promise.all([
      (await collection('contacts')).countDocuments(),
      (await collection('contacts')).countDocuments({ optedIn: true, optedOut: { $ne: true } }),
      (await collection('campaigns')).countDocuments(matchSession),
      (await collection('campaigns')).countDocuments({ ...matchSession, status: { $in: ['queued', 'running'] } }),
      (await collection('orders')).countDocuments(matchSession),
      (await collection('orders')).countDocuments({ ...matchSession, status: 'pending' }),
      (await collection('orders')).countDocuments({ ...matchSession, status: { $in: ['confirmed', 'processing'] } }),
      (await collection('messages')).countDocuments(matchSessionOrAll),
      (await collection('conversations')).countDocuments(matchSession),
      (await collection('conversations')).countDocuments({ ...matchSession, status: 'open' }),
      (await collection('autoReplies')).countDocuments({ ...matchSession, isActive: true }),
      (await collection<any>('orders')).find(matchSession).sort({ createdAt: -1 }).limit(5).toArray(),
      (await collection<any>('messages')).find({ ...matchSessionOrAll, direction: 'inbound' }).sort({ createdAt: -1 }).limit(10).toArray(),
      (await collection<any>('campaigns')).find(matchSession).sort({ createdAt: -1 }).limit(5).toArray(),
      (await collection<any>('orders')).aggregate([
        { $match: matchSession },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).toArray(),
    ])

    const orderStatusMap: Record<string, number> = {}
    for (const row of ordersByStatus) {
      if (row._id) orderStatusMap[row._id] = row.count
    }

    return NextResponse.json({
      stats: {
        contacts: { total: totalContacts, optedIn: totalOptedIn },
        campaigns: { total: totalCampaigns, active: activeCampaigns },
        orders: { total: totalOrders, pending: pendingOrders, active: confirmedOrders, byStatus: orderStatusMap },
        messages: { total: totalMessages },
        conversations: { total: totalConversations, open: openConversations },
        automation: { activeRules },
      },
      recent: {
        orders: recentOrders,
        messages: recentMessages,
        campaigns: campaignStats,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
