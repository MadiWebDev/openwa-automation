import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { collection } from '@/lib/mongodb'
import { z } from 'zod'

const RuleSchema = z.object({
  sessionId: z.string().min(1),
  name: z.string().min(1),
  trigger: z.enum(['keyword', 'regex', 'any', 'order_keyword']),
  pattern: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  responseType: z.enum(['fixed', 'ai', 'template']),
  fixedResponse: z.string().optional(),
  templateId: z.string().optional(),
  aiInstructions: z.string().optional(),
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).default(10),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const query: any = {}
    if (sessionId) query.sessionId = sessionId

    const rules = await (await collection<any>('autoReplies'))
      .find(query)
      .sort({ priority: 1, createdAt: -1 })
      .limit(200)
      .toArray()

    return NextResponse.json(rules)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = RuleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const now = new Date()
    const rule = { ...parsed.data, matchCount: 0, createdAt: now, updatedAt: now }
    const result = await (await collection<any>('autoReplies')).insertOne(rule)

    return NextResponse.json({ ...rule, _id: result.insertedId }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
