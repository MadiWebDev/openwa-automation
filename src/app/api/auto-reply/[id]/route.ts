import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { collection } from '@/lib/mongodb'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const rule = await (await collection<any>('autoReplies')).findOne({ _id: new ObjectId(params.id) })
    if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(rule)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const allowed = ['name', 'trigger', 'pattern', 'keywords', 'responseType', 'fixedResponse',
      'templateId', 'aiInstructions', 'isActive', 'priority']
    const update: any = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }
    update.updatedAt = new Date()

    const result = await (await collection<any>('autoReplies')).findOneAndUpdate(
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
    const result = await (await collection<any>('autoReplies')).deleteOne({ _id: new ObjectId(params.id) })
    if (!result.deletedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
