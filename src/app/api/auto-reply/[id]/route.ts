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
    const rule = await (await collection<any>('autoReplies')).findOne({ _id: oid })
    if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(rule)
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
    const allowed = ['name', 'trigger', 'pattern', 'keywords', 'responseType', 'fixedResponse',
      'templateId', 'aiInstructions', 'isActive', 'priority']
    const update: any = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    // Cross-field validation
    const responseType = update.responseType
    if (responseType === 'fixed' && 'fixedResponse' in update && !update.fixedResponse) {
      return NextResponse.json({ error: 'fixedResponse is required when responseType is fixed' }, { status: 400 })
    }
    if (responseType === 'template' && 'templateId' in update && !update.templateId) {
      return NextResponse.json({ error: 'templateId is required when responseType is template' }, { status: 400 })
    }

    update.updatedAt = new Date()

    const result = await (await collection<any>('autoReplies')).findOneAndUpdate(
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
    const result = await (await collection<any>('autoReplies')).deleteOne({ _id: oid })
    if (!result.deletedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
