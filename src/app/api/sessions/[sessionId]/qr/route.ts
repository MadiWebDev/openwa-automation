import { NextResponse } from 'next/server'
import { openwa } from '@/lib/openwa'

export async function GET(_: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params
    const data = await openwa(`/api/sessions/${encodeURIComponent(sessionId)}/qr`)
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 })
  }
}
