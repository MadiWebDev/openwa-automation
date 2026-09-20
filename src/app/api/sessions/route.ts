import { NextResponse } from 'next/server'
import { openwa } from '@/lib/openwa'

export async function GET() {
  try { return NextResponse.json(await openwa('/api/sessions')) }
  catch (error: any) { return NextResponse.json({ error: error.message, detail: error.payload }, { status: error.status || 500 }) }
}

export async function POST(request: Request) {
  try { const body = await request.json(); return NextResponse.json(await openwa('/api/sessions', { method: 'POST', body: JSON.stringify(body) }), { status: 201 }) }
  catch (error: any) { return NextResponse.json({ error: error.message, detail: error.payload }, { status: error.status || 500 }) }
}
