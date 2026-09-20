import { NextResponse } from 'next/server'
import { ensureIndexes } from '@/lib/mongodb'

export async function POST() {
  try { await ensureIndexes(); return NextResponse.json({ ok: true, message: 'MongoDB indexes ready' }) }
  catch (error: any) { return NextResponse.json({ error: error?.message || 'setup failed' }, { status: 500 }) }
}
