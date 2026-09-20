import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { collection } from '@/lib/mongodb'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const tmpl = await (await collection<any>('templates')).findOne({ _id: new ObjectId(params.id) })
    if (!tmpl) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(tmpl)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const allowed = ['name', 'category', 'body', 'variables', 'description', 'language']
    const update: any = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }
    // Re-detect variables if body changed
    if (update.body) {
      const detected = [...update.body.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)].map((m: any) => m[1])
      update.variables = Array.from(new Set([...(update.variables || []), ...detected]))
    }
    update.updatedAt = new Date()

    const result = await (await collection<any>('templates')).findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      { $set: update },
      { returnDocument: 'after' }
    )
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const result = await (await collection<any>('templates')).deleteOne({ _id: new ObjectId(params.id) })
    if (!result.deletedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
