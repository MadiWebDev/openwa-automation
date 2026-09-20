import crypto from 'node:crypto'

const baseUrl = (process.env.OPENWA_BASE_URL || 'https://openwa-qz0a.onrender.com').replace(/\/$/, '')
const apiKey = process.env.OPENWA_API_KEY

export class OpenWAError extends Error {
  status: number
  payload: unknown
  constructor(message: string, status: number, payload: unknown) { super(message); this.status = status; this.payload = payload }
}

export async function openwa(path: string, init: RequestInit = {}) {
  if (!apiKey) throw new Error('OPENWA_API_KEY is required')
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', 'X-API-Key': apiKey, ...(init.headers || {}) },
    cache: 'no-store',
  })
  const text = await response.text()
  let payload: unknown = null
  try { payload = text ? JSON.parse(text) : null } catch { payload = text }
  if (!response.ok) throw new OpenWAError(`OpenWA request failed (${response.status})`, response.status, payload)
  return payload
}

export function verifyOpenWASignature(rawBody: Buffer, header: string | null, secret = process.env.OPENWA_WEBHOOK_SECRET) {
  if (!secret || !header) return false
  const received = header.replace(/^sha256=/, '').trim()
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(received, 'utf8'); const b = Buffer.from(expected, 'utf8')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function idempotencyKey(campaignId: string, contactId: string) {
  return crypto.createHash('sha256').update(`${campaignId}:${contactId}`).digest('hex')
}

export const openwaConfig = { baseUrl }
