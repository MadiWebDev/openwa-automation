import { NextResponse } from 'next/server'
import { getOrder, updateOrderStatus, OrderStatus } from '@/lib/orders'
import { collection } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const order = await getOrder(params.id)
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    return NextResponse.json(order)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const allowedStatuses: OrderStatus[] = ['pending', 'confirmed', 'processing', 'completed', 'cancelled', 'rejected']
    
    if (body.status && !allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` }, { status: 400 })
    }

    // Status update
    if (body.status) {
      const updated = await updateOrderStatus(params.id, body.status, body.reason, body.changedBy)
      if (!updated) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      return NextResponse.json(updated)
    }

    // Field update (address, notes, scheduledFor, items, totalAmount)
    const allowed = ['notes', 'address', 'scheduledFor', 'items', 'totalAmount', 'currency', 'contactName']
    const update: any = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }
    if (!Object.keys(update).length) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }
    update.updatedAt = new Date()

    const orders = await collection<any>('orders')
    const order = await getOrder(params.id)
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const result = await orders.findOneAndUpdate(
      { _id: order._id },
      { $set: update },
      { returnDocument: 'after' }
    )
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
