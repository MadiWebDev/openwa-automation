import { NextResponse } from 'next/server'
import { collection } from '@/lib/mongodb'

export async function POST(request: Request, { params }: { params: { phone: string } }) {
  try {
    const body = await request.json().catch(() => ({}))
    const phone = decodeURIComponent(params.phone)
    const result = await (await collection<any>('contacts')).findOneAndUpdate({ phone }, { $set: { optedIn: false, optedOut: true, optOut: { method: body.method || 'api', source: body.source || 'operator', timestamp: new Date() }, updatedAt: new Date() } }, { returnDocument: 'after' })
    if (!result) return NextResponse.json({ error: 'contact not found' }, { status: 404 })
    return NextResponse.json({ ok: true, contact: result })
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
}
