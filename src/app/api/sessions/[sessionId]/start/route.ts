import { NextResponse } from 'next/server'
import { openwa } from '@/lib/openwa'

export async function POST(_: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params
    const data = await openwa(`/api/sessions/${encodeURIComponent(sessionId)}/start`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 })
  }
}
