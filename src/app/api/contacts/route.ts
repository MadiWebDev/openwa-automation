import { NextResponse } from 'next/server'
import { collection } from '@/lib/mongodb'

export async function GET() {
  try { const contacts = await collection<any>('contacts'); const rows = await contacts.find({}).sort({ updatedAt: -1 }).limit(500).toArray(); return NextResponse.json(rows) }
  catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const phone = String(body.phone || '').trim()
    if (!phone || !body.consent?.method || !body.consent?.source) return NextResponse.json({ error: 'phone and consent.method/source are required' }, { status: 400 })
    const contacts = await collection<any>('contacts')
    const now = new Date()
    const result = await contacts.findOneAndUpdate({ phone }, { $set: { name: body.name || '', variables: body.variables || {}, optedIn: true, optedOut: false, consent: { method: body.consent.method, source: body.consent.source, timestamp: body.consent.timestamp ? new Date(body.consent.timestamp) : now }, updatedAt: now }, $setOnInsert: { createdAt: now } }, { upsert: true, returnDocument: 'after' })
    return NextResponse.json(result)
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
}
