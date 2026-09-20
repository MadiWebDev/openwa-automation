/**
 * Messaging helpers — direct send, conversation logging, brand message formatting
 */

import { collection } from './mongodb'
import { openwa } from './openwa'
import { ObjectId } from 'mongodb'

export interface MessageRecord {
  _id?: ObjectId
  sessionId: string
  phone: string
  conversationId?: string
  direction: 'inbound' | 'outbound'
  text: string
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'audio' | 'document'
  openwaMessageId?: string
  status?: string
  autoReplyRuleId?: string
  source?: 'manual' | 'campaign' | 'auto_reply' | 'ai'
  createdAt: Date
}

/** Log a message (inbound or outbound) to the messages collection */
export async function logMessage(msg: Omit<MessageRecord, '_id' | 'createdAt'>): Promise<MessageRecord> {
  const now = new Date()
  const record: Omit<MessageRecord, '_id'> = { ...msg, createdAt: now }
  const coll = await collection<any>('messages')
  const result = await coll.insertOne(record)

  // Update conversation's last message timestamp
  await updateConversation(msg.phone, msg.sessionId, msg.text, msg.direction)

  return { ...record, _id: result.insertedId }
}

/** Update or create a conversation record */
async function updateConversation(
  phone: string,
  sessionId: string,
  lastMessage: string,
  direction: 'inbound' | 'outbound'
) {
  const convs = await collection<any>('conversations')
  await convs.updateOne(
    { phone, sessionId },
    {
      $set: {
        lastMessage: lastMessage.substring(0, 120),
        lastMessageAt: new Date(),
        lastMessageDirection: direction,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        phone,
        sessionId,
        status: 'open',
        unreadCount: 0,
        createdAt: new Date(),
      },
      $inc: direction === 'inbound' ? { unreadCount: 1 } : {},
    },
    { upsert: true }
  )
}

/** Send a direct message via OpenWA and log it.
 *
 * Returns `sendFailed: true` when the OpenWA send did not succeed so callers
 * can take appropriate action (e.g. skip audit logging of a "sent" event).
 */
export async function sendDirectMessage(
  sessionId: string,
  phone: string,
  text: string,
  source: MessageRecord['source'] = 'manual',
  autoReplyRuleId?: string
): Promise<{ openwaMessageId: string | null; messageRecord: MessageRecord; sendFailed: boolean }> {
  let openwaMessageId: string | null = null
  let sendFailed = false

  try {
    const response: any = await openwa(
      `/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`,
      { method: 'POST', body: JSON.stringify({ chatId: phone, text }) }
    )
    openwaMessageId = response?.id || response?.messageId || response?.message?.id || null
    // If we got a response but no message ID, treat it as a send failure
    if (!openwaMessageId) sendFailed = true
  } catch (err: any) {
    console.error('sendDirectMessage error:', err.message)
    sendFailed = true
  }

  const messageRecord = await logMessage({
    sessionId,
    phone,
    direction: 'outbound',
    text,
    openwaMessageId: openwaMessageId || undefined,
    status: sendFailed ? 'failed' : 'sent',
    source,
    autoReplyRuleId,
  })

  return { openwaMessageId, messageRecord, sendFailed }
}

/** Get message history for a conversation */
export async function getConversationMessages(
  phone: string,
  sessionId: string,
  limit = 50,
  offset = 0
): Promise<MessageRecord[]> {
  return (await collection<any>('messages'))
    .find({ phone, sessionId })
    .sort({ createdAt: 1 })
    .skip(offset)
    .limit(limit)
    .toArray()
}

/** List conversations with pagination */
export async function listConversations(
  sessionId: string | null,
  status: string | null,
  limit = 50,
  offset = 0
) {
  const query: any = {}
  if (sessionId) query.sessionId = sessionId
  if (status) query.status = status

  const coll = await collection<any>('conversations')
  const [convs, total] = await Promise.all([
    coll.find(query).sort({ updatedAt: -1 }).skip(offset).limit(limit).toArray(),
    coll.countDocuments(query),
  ])
  return { conversations: convs, total }
}

/** Mark conversation as read (reset unread count) */
export async function markConversationRead(phone: string, sessionId: string) {
  await (await collection<any>('conversations')).updateOne(
    { phone, sessionId },
    { $set: { unreadCount: 0, updatedAt: new Date() } }
  )
}
