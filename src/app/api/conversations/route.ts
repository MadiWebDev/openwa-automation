import { NextResponse } from 'next/server'
import { listConversations } from '@/lib/messaging'

function safeInt(value: string | null, fallback: number): number {
  const n = parseInt(value || '')
  return isNaN(n) || n < 0 ? fallback : n
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const result = await listConversations(
      searchParams.get('sessionId'),
      searchParams.get('status'),
      safeInt(searchParams.get('limit'), 50),
      safeInt(searchParams.get('offset'), 0),
    )
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
