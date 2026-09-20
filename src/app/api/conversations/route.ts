import { NextResponse } from 'next/server'
import { listConversations } from '@/lib/messaging'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const result = await listConversations(
      searchParams.get('sessionId'),
      searchParams.get('status'),
      parseInt(searchParams.get('limit') || '50'),
      parseInt(searchParams.get('offset') || '0'),
    )
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
