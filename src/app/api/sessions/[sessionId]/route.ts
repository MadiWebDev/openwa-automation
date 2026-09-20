import { NextResponse } from 'next/server'
import { openwa } from '@/lib/openwa'

export async function GET(_: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params
    const data = await openwa(`/api/sessions/${encodeURIComponent(sessionId)}`)
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params
    await openwa(`/api/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' })
    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 })
  }
}
