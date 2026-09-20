import { NextResponse } from 'next/server'
import { collection } from '@/lib/mongodb'
import { z } from 'zod'

const BrandSchema = z.object({
  sessionId: z.string().min(1),
  businessName: z.string().min(1),
  tagline: z.string().optional(),
  welcomeMessage: z.string().optional(),
  fallbackMessage: z.string().optional(),
  aiPersonality: z.string().optional(),
  aiLanguage: z.string().optional(),
  businessHours: z.object({
    open: z.string(),
    close: z.string(),
    timezone: z.string(),
    daysOff: z.array(z.string()),
  }).optional(),
  outOfHoursMessage: z.string().optional(),
  maxAiTokens: z.number().int().min(50).max(2000).optional(),
  signOff: z.string().optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (sessionId) {
      const brand = await (await collection<any>('brandSettings')).findOne({ sessionId })
      return NextResponse.json(brand || {})
    }

    const brands = await (await collection<any>('brandSettings')).find({}).toArray()
    return NextResponse.json(brands)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const parsed = BrandSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { sessionId, ...data } = parsed.data
    const now = new Date()

    const result = await (await collection<any>('brandSettings')).findOneAndUpdate(
      { sessionId },
      { $set: { ...data, updatedAt: now }, $setOnInsert: { sessionId, createdAt: now } },
      { upsert: true, returnDocument: 'after' }
    )

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
