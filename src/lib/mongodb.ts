import { Db, MongoClient, Collection, Document } from 'mongodb'

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'openwa_control_plane'

if (!uri) console.warn('MONGODB_URI is not set; API routes will return configuration errors until it is provided.')

type MongoCache = { client: MongoClient; db: Db }
const globalForMongo = globalThis as typeof globalThis & { __mongo?: Promise<MongoCache> }

export async function getMongo(): Promise<MongoCache> {
  if (!uri) throw new Error('MONGODB_URI is required')
  if (!globalForMongo.__mongo) {
    const client = new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 })
    globalForMongo.__mongo = client.connect().then((connected) => ({ client: connected, db: connected.db(dbName) }))
  }
  return globalForMongo.__mongo
}

export async function collection<T extends Document = Document>(name: string): Promise<Collection<T>> {
  const { db } = await getMongo()
  return db.collection<T>(name)
}

export async function ensureIndexes() {
  const contacts      = await collection('contacts')
  const campaigns     = await collection('campaigns')
  const recipients    = await collection('campaignRecipients')
  const outbound      = await collection('outboundMessages')
  const events        = await collection('webhookEvents')
  const conversations = await collection('conversations')
  const orders        = await collection('orders')
  const autoReplies   = await collection('autoReplies')
  const templates     = await collection('templates')
  const messages      = await collection('messages')

  await Promise.all([
    // existing
    contacts.createIndex({ phone: 1 }, { unique: true }),
    campaigns.createIndex({ status: 1, createdAt: -1 }),
    recipients.createIndex({ campaignId: 1, status: 1 }),
    recipients.createIndex({ campaignId: 1, contactId: 1 }, { unique: true }),
    outbound.createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true }),
    outbound.createIndex({ campaignId: 1, createdAt: -1 }),
    events.createIndex({ eventId: 1 }, { unique: true, sparse: true }),
    events.createIndex({ receivedAt: -1 }),

    // new
    conversations.createIndex({ phone: 1, sessionId: 1 }, { unique: true }),
    conversations.createIndex({ updatedAt: -1 }),
    conversations.createIndex({ status: 1 }),
    orders.createIndex({ phone: 1, createdAt: -1 }),
    orders.createIndex({ status: 1, createdAt: -1 }),
    orders.createIndex({ orderId: 1 }, { unique: true }),
    autoReplies.createIndex({ sessionId: 1, isActive: 1 }),
    autoReplies.createIndex({ trigger: 1 }),
    templates.createIndex({ name: 1 }, { unique: true }),
    templates.createIndex({ category: 1 }),
    messages.createIndex({ conversationId: 1, createdAt: 1 }),
    messages.createIndex({ phone: 1, createdAt: -1 }),
    messages.createIndex({ sessionId: 1, createdAt: -1 }),
  ])
}
