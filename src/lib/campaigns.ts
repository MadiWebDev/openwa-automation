import { ObjectId } from 'mongodb'
import { collection } from './mongodb'
import { idempotencyKey, openwa } from './openwa'

export type CampaignInput = { name: string; sessionId: string; template?: string; text?: string; minDelayMs?: number; maxDelayMs?: number }

export function renderTemplate(template: string, variables: Record<string, string | number> = {}) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => variables[key] === undefined ? '' : String(variables[key]))
}

export async function processCampaign(campaignId: string, limit = 20) {
  const campaigns = await collection<any>('campaigns')
  const recipients = await collection<any>('campaignRecipients')
  const outbound = await collection<any>('outboundMessages')
  const campaign = await campaigns.findOne({ _id: new ObjectId(campaignId) })
  if (!campaign) throw new Error('Campaign not found')
  await campaigns.updateOne({ _id: campaign._id }, { $set: { status: 'running', startedAt: new Date(), updatedAt: new Date() } })
  const jobs = await recipients.find({ campaignId: campaign._id, status: 'queued' }).limit(limit).toArray()
  let processed = 0
  for (const job of jobs) {
    const claim = await recipients.findOneAndUpdate({ _id: job._id, status: 'queued' }, { $set: { status: 'sending', updatedAt: new Date() } }, { returnDocument: 'after' })
    if (!claim) continue
    const contact = await collection<any>('contacts').then(c => c.findOne({ _id: job.contactId }))
    if (!contact || !contact.optedIn || contact.optedOut) {
      await recipients.updateOne({ _id: job._id }, { $set: { status: 'blocked', blockedReason: 'missing_or_revoked_opt_in', updatedAt: new Date() } })
      continue
    }
    const key = idempotencyKey(campaignId, String(contact._id))
    const existing = await outbound.findOne({ idempotencyKey: key })
    if (existing?.status === 'sent' || existing?.status === 'accepted') {
      await recipients.updateOne({ _id: job._id }, { $set: { status: 'sent', outboundMessageId: existing._id, updatedAt: new Date() } })
      continue
    }
    const text = renderTemplate(campaign.text || campaign.template || '', { ...contact.variables, name: contact.name || '', phone: contact.phone })
    try {
      const response: any = await openwa(`/api/sessions/${encodeURIComponent(campaign.sessionId)}/messages/send-text`, { method: 'POST', body: JSON.stringify({ chatId: contact.phone, text }) })
      const message = await outbound.findOneAndUpdate({ idempotencyKey: key }, { $setOnInsert: { idempotencyKey: key, campaignId: campaign._id, recipientId: job._id, contactId: contact._id, createdAt: new Date() }, $set: { status: 'accepted', openwaMessageId: response?.id || response?.messageId || response?.message?.id || null, response, updatedAt: new Date() } }, { upsert: true, returnDocument: 'after' })
      await recipients.updateOne({ _id: job._id }, { $set: { status: 'sent', outboundMessageId: message?._id, updatedAt: new Date() } })
    } catch (error: any) {
      await recipients.updateOne({ _id: job._id }, { $set: { status: 'failed', error: error?.message || 'send failed', updatedAt: new Date() } })
    }
    processed++
    const delay = Math.max(250, Number(campaign.minDelayMs || 250)) + Math.floor(Math.random() * Math.max(0, Number(campaign.maxDelayMs || 750) - Number(campaign.minDelayMs || 250)))
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  const remaining = await recipients.countDocuments({ campaignId: campaign._id, status: 'queued' })
  await campaigns.updateOne({ _id: campaign._id }, { $set: { status: remaining ? 'running' : 'completed', updatedAt: new Date(), ...(remaining ? {} : { completedAt: new Date() }) } })
  return { processed, remaining }
}
