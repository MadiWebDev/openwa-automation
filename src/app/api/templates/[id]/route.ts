import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { collection } from '@/lib/mongodb'

function toObjectId(id: string) {
  try {
    return new ObjectId(id)
  } catch {
    return null
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const oid = toObjectId(id)
    if (!oid) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    const tmpl = await (await collection<any>('templates')).findOne({ _id: oid })
    if (!tmpl) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(tmpl)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const oid = toObjectId(id)
    if (!oid) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const body = await request.json()
    const allowed = ['name', 'category', 'body', 'variables', 'description', 'language']
    const update: any = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }
    // Re-detect variables if body changed; merge with existing DB variables so we don't lose them
    if (update.body) {
      const detected = [...update.body.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)].map((m: any) => m[1])
      const existing = await (await collection<any>('templates')).findOne({ _id: oid }, { projection: { variables: 1 } })
      const base = update.variables ?? existing?.variables ?? []
      update.variables = Array.from(new Set([...base, ...detected]))
    }
    update.updatedAt = new Date()

    const result = await (await collection<any>('templates')).findOneAndUpdate(
      { _id: oid },
      { $set: update },
      { returnDocument: 'after' }
    )
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const oid = toObjectId(id)
    if (!oid) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    const result = await (await collection<any>('templates')).deleteOne({ _id: oid })
    if (!result.deletedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
