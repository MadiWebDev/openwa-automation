import { NextResponse } from 'next/server'
import { openwa } from '@/lib/openwa'

export async function GET(_: Request, { params }: { params: { sessionId: string } }) {
  try {
    const data = await openwa(`/api/sessions/${encodeURIComponent(params.sessionId)}`)
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { sessionId: string } }) {
  try {
    await openwa(`/api/sessions/${encodeURIComponent(params.sessionId)}`, { method: 'DELETE' })
    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 })
  }
}
