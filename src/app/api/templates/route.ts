import { NextResponse } from 'next/server'
import { collection } from '@/lib/mongodb'
import { z } from 'zod'

const TemplateSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['greeting', 'order', 'promo', 'support', 'reminder', 'custom']),
  body: z.string().min(1),
  variables: z.array(z.string()).optional().default([]),
  description: z.string().optional(),
  language: z.string().default('en'),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const query: any = {}
    if (category) query.category = category

    const templates = await (await collection<any>('templates'))
      .find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray()

    return NextResponse.json(templates)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = TemplateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    // Auto-detect variables from {{varName}} patterns
    const detectedVars = Array.from(parsed.data.body.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)).map(m => m[1])
    const allVars = Array.from(new Set([...parsed.data.variables, ...detectedVars]))

    const now = new Date()
    const template = { ...parsed.data, variables: allVars, useCount: 0, createdAt: now, updatedAt: now }

    const result = await (await collection<any>('templates')).insertOne(template)
    return NextResponse.json({ ...template, _id: result.insertedId }, { status: 201 })
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'A template with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
