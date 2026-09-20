import { NextResponse } from 'next/server'
import { collection } from '@/lib/mongodb'
import { verifyOpenWASignature } from '@/lib/openwa'
import { processInboundMessage } from '@/lib/ai'
import { sendDirectMessage, logMessage } from '@/lib/messaging'
import { detectOrderIntent, getOrdersByPhone, formatOrderStatus } from '@/lib/orders'

function pick(payload: any, keys: string[]) {
  for (const key of keys) {
    const value = key.split('.').reduce((obj, part) => obj?.[part], payload)
    if (value !== undefined && value !== null) return value
  }
  return null
}

/** Extract the sender's phone + message text from various OpenWA payload shapes */
function extractInboundMessage(payload: any): { phone: string; text: string; sessionId: string } | null {
  // OpenWA typically sends: event = "message.received" with data containing from + body
  const eventType = String(payload.event || payload.type || payload.name || '')
  if (!eventType.includes('message')) return null

  // Various payload shapes from different OpenWA engines
  const phone =
    pick(payload, ['data.from', 'from', 'data.message.from', 'message.from', 'data.key.remoteJid']) ||
    pick(payload, ['sender', 'data.sender.id'])

  const text =
    pick(payload, ['data.body', 'body', 'data.message.body', 'message.body', 'data.text', 'text']) ||
    pick(payload, ['data.message.text', 'message.text', 'data.content', 'content'])

  const sessionId =
    pick(payload, ['sessionId', 'data.sessionId', 'session', 'data.session']) || ''

  if (!phone || !text || typeof text !== 'string') return null

  // Only process inbound (fromMe = false)
  const fromMe =
    pick(payload, ['data.fromMe', 'fromMe', 'data.message.fromMe', 'message.fromMe']) === true
  if (fromMe) return null

  return { phone: String(phone), text: String(text), sessionId: String(sessionId) }
}

export async function POST(request: Request) {
  const raw = Buffer.from(await request.arrayBuffer())

  if (!verifyOpenWASignature(raw, request.headers.get('x-openwa-signature'))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  try {
    const payload: any = JSON.parse(raw.toString('utf8'))
    const eventType = String(payload.event || payload.type || payload.name || 'unknown')
    const eventId = String(
      payload.id || payload.eventId || payload.event_id ||
      `${eventType}:${raw.toString('utf8').slice(0, 120)}`
    )

    // ── Deduplication ───────────────────────────────────────────────
    const events = await collection<any>('webhookEvents')
    const duplicate = await events.findOne({ eventId })
    if (duplicate) return NextResponse.json({ ok: true, duplicate: true })

    await events.insertOne({
      eventId,
      type: eventType,
      raw: payload,
      normalizedAt: new Date(),
      receivedAt: new Date(),
    })

    // ── Delivery status updates ──────────────────────────────────────
    const messageId = pick(payload, [
      'messageId', 'message.id', 'data.messageId', 'data.message.id', 'ack.id',
    ])
    const outbound = await collection<any>('outboundMessages')

    if (messageId) {
      const status =
        eventType.includes('ack')
          ? String(pick(payload, ['ack', 'data.ack', 'message.ack']) || 'acknowledged').toLowerCase()
          : eventType.includes('failed')
          ? 'failed'
          : eventType.includes('sent')
          ? 'sent'
          : null

      if (status) {
        await outbound.updateMany(
          { $or: [{ openwaMessageId: messageId }, { 'response.id': messageId }] },
          {
            $set: {
              status,
              lastWebhookType: eventType,
              lastWebhookAt: new Date(),
              updatedAt: new Date(),
            },
          }
        )
        // Also update message record status
        await (await collection<any>('messages')).updateMany(
          { openwaMessageId: messageId },
          { $set: { status, updatedAt: new Date() } }
        )
      }
    }

    // ── Inbound message processing ───────────────────────────────────
    const inbound = extractInboundMessage(payload)
    if (inbound) {
      const { phone, text, sessionId } = inbound

      // Log the inbound message
      await logMessage({
        sessionId,
        phone,
        direction: 'inbound',
        text,
        openwaMessageId: pick(payload, ['data.id', 'id', 'data.message.id']) || undefined,
        status: 'received',
        source: 'manual',
      })

      // Check for order status intent first
      const orderIntent = detectOrderIntent(text)
      if (orderIntent === 'status') {
        const orders = await getOrdersByPhone(phone, 3)
        if (orders.length > 0) {
          const latestOrder = orders[0]
          const statusMsg = formatOrderStatus(latestOrder)
          const { sendFailed } = await sendDirectMessage(sessionId, phone, statusMsg, 'auto_reply')
          if (!sendFailed) {
            await logAudit('auto_reply.order_status', eventType, eventId, phone, sessionId)
            return NextResponse.json({ ok: true, eventId, action: 'order_status_sent' })
          }
        }
      }

      // AI / rule-based auto-reply
      if (sessionId) {
        try {
          const result = await processInboundMessage(text, phone, sessionId)
          if (result) {
            const { sendFailed } = await sendDirectMessage(sessionId, phone, result.reply, 'auto_reply', result.ruleId)
            if (!sendFailed) {
              await logAudit('auto_reply.sent', eventType, eventId, phone, sessionId, {
                source: result.source, ruleId: result.ruleId,
              })
              return NextResponse.json({ ok: true, eventId, action: 'auto_reply_sent', source: result.source })
            }
          }
        } catch (aiErr: any) {
          console.error('Auto-reply processing error:', aiErr.message)
        }
      }
    }

    // ── Audit log ────────────────────────────────────────────────────
    await logAudit('webhook.received', eventType, eventId, null, null, { messageId })

    return NextResponse.json({ ok: true, eventId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

async function logAudit(
  action: string,
  eventType: string,
  eventId: string,
  phone: string | null,
  sessionId: string | null,
  extra: Record<string, any> = {}
) {
  try {
    await (await collection<any>('auditLogs')).insertOne({
      action,
      eventType,
      eventId,
      phone,
      sessionId,
      ...extra,
      createdAt: new Date(),
    })
  } catch { /* audit failures are non-fatal */ }
}
