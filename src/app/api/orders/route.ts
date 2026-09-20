import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createOrder, listOrders } from '@/lib/orders'

const OrderSchema = z.object({
  phone: z.string().min(1),
  sessionId: z.string().min(1),
  contactName: z.string().optional(),
  items: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().int().positive(),
    price: z.number().optional(),
    notes: z.string().optional(),
  })).min(1),
  totalAmount: z.number().optional(),
  currency: z.string().default('USD'),
  notes: z.string().optional(),
  address: z.string().optional(),
  scheduledFor: z.string().datetime().optional(),
  conversationId: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const result = await listOrders({
      status: (searchParams.get('status') as any) || undefined,
      phone: searchParams.get('phone') || undefined,
      sessionId: searchParams.get('sessionId') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
      from: searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined,
      to: searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined,
    })
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = OrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data
    const order = await createOrder({
      ...data,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
    })
    return NextResponse.json(order, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
