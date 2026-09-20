import { NextResponse } from 'next/server'
import { getMongo } from '@/lib/mongodb'
import { openwa } from '@/lib/openwa'

export async function GET() {
  const result: any = { ok: true, service: 'openwa-control-plane', time: new Date().toISOString(), mongo: 'unknown', openwa: 'unknown' }
  try { const { db } = await getMongo(); await db.command({ ping: 1 }); result.mongo = 'ok' } catch { result.ok = false; result.mongo = 'error' }
  try { await openwa('/api/health'); result.openwa = 'ok' } catch { result.ok = false; result.openwa = 'error' }
  return NextResponse.json(result, { status: result.ok ? 200 : 503 })
}
