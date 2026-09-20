import { NextResponse } from 'next/server'
import { processCampaign } from '@/lib/campaigns'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    return NextResponse.json(await processCampaign(id, 20))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
