import { NextResponse } from 'next/server'
import { collection } from '@/lib/mongodb'

export async function GET() {
  try {
    const rows = await (await collection<any>('campaigns')).find({}).sort({ createdAt: -1 }).limit(100).toArray()
    return NextResponse.json(rows)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (
      !body.name ||
      !body.sessionId ||
      (!body.text && !body.template) ||
      !Array.isArray(body.recipients) ||
      !body.recipients.length
    ) {
      return NextResponse.json(
        { error: 'name, sessionId, text/template, and recipients are required' },
        { status: 400 }
      )
    }

    const contacts = await collection<any>('contacts')
    const campaigns = await collection<any>('campaigns')
    const recipientsColl = await collection<any>('campaignRecipients')
    const now = new Date()

    // Deduplicate recipient phones before processing
    const uniquePhones: string[] = Array.from(
      new Set(body.recipients.map((item: any) => (typeof item === 'string' ? item : item.phone)))
    )

    // Bulk opt-in check instead of per-recipient O(n) queries
    const eligibleContacts = await contacts
      .find({ phone: { $in: uniquePhones }, optedIn: true, optedOut: { $ne: true } })
      .toArray()

    const eligiblePhoneSet = new Set(eligibleContacts.map((c: any) => c.phone))
    const eligible = eligibleContacts.map((contact: any) => ({ contact, phone: contact.phone }))
    const blocked = uniquePhones.filter((p) => !eligiblePhoneSet.has(p))

    if (!eligible.length) {
      return NextResponse.json(
        { error: 'No recipients have a valid recorded opt-in', blocked },
        { status: 422 }
      )
    }

    const campaign = {
      name: body.name,
      sessionId: body.sessionId,
      text: body.text || null,
      template: body.template || null,
      minDelayMs: Math.max(250, Number(body.minDelayMs || 1000)),
      maxDelayMs: Math.max(Number(body.maxDelayMs || 2500), Number(body.minDelayMs || 1000)),
      status: 'queued',
      blockedCount: blocked.length,
      createdAt: now,
      updatedAt: now,
    }

    const created = await campaigns.insertOne(campaign)

    await recipientsColl.insertMany(
      eligible.map(({ contact, phone }: { contact: any; phone: string }) => ({
        campaignId: created.insertedId,
        contactId: contact._id,
        phone,
        status: 'queued',
        createdAt: now,
        updatedAt: now,
      }))
    )

    return NextResponse.json(
      { campaignId: created.insertedId, accepted: eligible.length, blocked, status: 'queued' },
      { status: 201 }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
