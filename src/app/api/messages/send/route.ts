import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendDirectMessage } from '@/lib/messaging'
import { collection } from '@/lib/mongodb'

const SendSchema = z.object({
  sessionId: z.string().min(1),
  phone: z.string().min(1),
  text: z.string().min(1),
  templateId: z.string().optional(),
  variables: z.record(z.string(), z.string()).optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = SendSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    let text = parsed.data.text

    // If templateId is given, render the template
    if (parsed.data.templateId) {
      const tmpl = await (await collection<any>('templates')).findOne({ name: parsed.data.templateId })
        || await (async () => {
          try {
            const { ObjectId } = await import('mongodb')
            return (await collection<any>('templates')).findOne({ _id: new ObjectId(parsed.data.templateId!) })
          } catch { return null }
        })()

      if (tmpl) {
        const vars = parsed.data.variables || {}
        text = tmpl.body.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_: string, k: string) => vars[k] || '')
        // Track usage
        await (await collection<any>('templates')).updateOne(
          { _id: tmpl._id },
          { $inc: { useCount: 1 }, $set: { lastUsedAt: new Date() } }
        )
      }
    }

    const { openwaMessageId, messageRecord, sendFailed } = await sendDirectMessage(
      parsed.data.sessionId,
      parsed.data.phone,
      text,
      'manual'
    )

    return NextResponse.json(
      { ok: !sendFailed, openwaMessageId, messageId: messageRecord._id, ...(sendFailed && { warning: 'Message logged but WhatsApp delivery failed' }) },
      { status: 201 }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
