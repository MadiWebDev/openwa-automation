import { NextResponse } from 'next/server'
import { openwa } from '@/lib/openwa'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    const url = body.url || `${process.env.APP_URL || new URL(request.url).origin}/api/webhooks/openwa`
    const secret = body.secret || process.env.OPENWA_WEBHOOK_SECRET
    if (!secret || secret.length < 16) return NextResponse.json({ error: 'Provide OPENWA_WEBHOOK_SECRET or a secret of at least 16 characters' }, { status: 400 })
    const response = await openwa(`/api/sessions/${encodeURIComponent(body.sessionId)}/webhooks`, { method: 'POST', body: JSON.stringify({ url, secret, events: body.events || ['message.received', 'message.sent', 'message.ack', 'message.failed', 'session.status'], retryCount: body.retryCount ?? 3 }) })
    return NextResponse.json({ ok: true, url, response }, { status: 201 })
  } catch (error: any) { return NextResponse.json({ error: error.message, detail: error.payload }, { status: error.status || 500 }) }
}
