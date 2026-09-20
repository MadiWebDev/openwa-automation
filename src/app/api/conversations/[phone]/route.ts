import { NextResponse } from 'next/server'
import { getConversationMessages, markConversationRead } from '@/lib/messaging'
import { collection } from '@/lib/mongodb'

function safeInt(value: string | null, fallback: number): number {
  const n = parseInt(value || '')
  return isNaN(n) || n < 0 ? fallback : n
}

export async function GET(request: Request, { params }: { params: Promise<{ phone: string }> }) {
  try {
    const { searchParams } = new URL(request.url)
    const { phone: rawPhone } = await params
    const phone = decodeURIComponent(rawPhone)
    const sessionId = searchParams.get('sessionId') || ''
    const limit = safeInt(searchParams.get('limit'), 50)
    const offset = safeInt(searchParams.get('offset'), 0)

    const [messages, conversation] = await Promise.all([
      getConversationMessages(phone, sessionId, limit, offset),
      (await collection<any>('conversations')).findOne({ phone, ...(sessionId ? { sessionId } : {}) }),
    ])

    // Mark as read when fetched (only if a specific session is targeted)
    if (sessionId) await markConversationRead(phone, sessionId)

    return NextResponse.json({ conversation, messages })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
