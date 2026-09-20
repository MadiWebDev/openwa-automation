import { NextResponse } from 'next/server'
import { getConversationMessages, markConversationRead } from '@/lib/messaging'
import { collection } from '@/lib/mongodb'

export async function GET(request: Request, { params }: { params: { phone: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = decodeURIComponent(params.phone)
    const sessionId = searchParams.get('sessionId') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const [messages, conversation] = await Promise.all([
      getConversationMessages(phone, sessionId, limit, offset),
      (await collection<any>('conversations')).findOne({ phone, sessionId }),
    ])

    // Mark as read when fetched
    if (sessionId) await markConversationRead(phone, sessionId)

    return NextResponse.json({ conversation, messages })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
