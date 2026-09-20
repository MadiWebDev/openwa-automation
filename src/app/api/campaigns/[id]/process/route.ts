import { NextResponse } from 'next/server'
import { processCampaign } from '@/lib/campaigns'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try { return NextResponse.json(await processCampaign(params.id, 20)) }
  catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
}
