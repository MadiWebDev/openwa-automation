/**
 * Order Management System
 * Handles booking, confirmation, rejection, cancellation, and status tracking
 * of WhatsApp-initiated orders.
 */

import { ObjectId } from 'mongodb'
import { collection } from './mongodb'
import { v4 as uuidv4 } from 'uuid'

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled' | 'rejected'

export interface OrderItem {
  name: string
  quantity: number
  price?: number
  notes?: string
}

export interface Order {
  _id?: ObjectId
  orderId: string           // human-readable like ORD-2026-XXXX
  phone: string
  sessionId: string
  contactName?: string
  items: OrderItem[]
  totalAmount?: number
  currency?: string
  status: OrderStatus
  notes?: string
  address?: string
  scheduledFor?: Date
  statusHistory: Array<{ status: OrderStatus; reason?: string; changedAt: Date; changedBy?: string }>
  conversationId?: string
  createdAt: Date
  updatedAt: Date
}

function generateOrderId(): string {
  const year = new Date().getFullYear()
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ORD-${year}-${rand}`
}

/** Create a new order */
export async function createOrder(data: {
  phone: string
  sessionId: string
  contactName?: string
  items: OrderItem[]
  totalAmount?: number
  currency?: string
  notes?: string
  address?: string
  scheduledFor?: Date
  conversationId?: string
}): Promise<Order> {
  const now = new Date()
  const order: Omit<Order, '_id'> = {
    orderId: generateOrderId(),
    phone: data.phone,
    sessionId: data.sessionId,
    contactName: data.contactName,
    items: data.items,
    totalAmount: data.totalAmount,
    currency: data.currency || 'USD',
    status: 'pending',
    notes: data.notes,
    address: data.address,
    scheduledFor: data.scheduledFor,
    conversationId: data.conversationId,
    statusHistory: [{ status: 'pending', changedAt: now }],
    createdAt: now,
    updatedAt: now,
  }

  const orders = await collection<any>('orders')
  const result = await orders.insertOne(order)
  return { ...order, _id: result.insertedId }
}

/** Update order status with history tracking */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  reason?: string,
  changedBy?: string
): Promise<Order | null> {
  const orders = await collection<any>('orders')
  const order = await orders.findOne({
    $or: [{ orderId }, { _id: (() => { try { return new ObjectId(orderId) } catch { return null } })() }]
  })
  if (!order) return null

  const historyEntry = { status: newStatus, reason, changedAt: new Date(), changedBy }
  await orders.updateOne(
    { _id: order._id },
    {
      $set: { status: newStatus, updatedAt: new Date() },
      $push: { statusHistory: historyEntry } as any,
    }
  )
  return orders.findOne({ _id: order._id }) as Promise<Order | null>
}

/** Get orders by phone */
export async function getOrdersByPhone(phone: string, limit = 20): Promise<Order[]> {
  return (await collection<any>('orders'))
    .find({ phone })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()
}

/** Get order by orderId or _id */
export async function getOrder(id: string): Promise<Order | null> {
  const orders = await collection<any>('orders')
  let obj: ObjectId | null = null
  try { obj = new ObjectId(id) } catch { /* not an ObjectId */ }

  return orders.findOne({
    $or: [{ orderId: id }, ...(obj ? [{ _id: obj }] : [])],
  })
}

/** List all orders with optional filters */
export async function listOrders(filters: {
  status?: OrderStatus
  phone?: string
  sessionId?: string
  from?: Date
  to?: Date
  limit?: number
  offset?: number
} = {}): Promise<{ orders: Order[]; total: number }> {
  const query: any = {}
  if (filters.status) query.status = filters.status
  if (filters.phone) query.phone = filters.phone
  if (filters.sessionId) query.sessionId = filters.sessionId
  if (filters.from || filters.to) {
    query.createdAt = {}
    if (filters.from) query.createdAt.$gte = filters.from
    if (filters.to) query.createdAt.$lte = filters.to
  }

  const coll = await collection<any>('orders')
  const [orders, total] = await Promise.all([
    coll.find(query).sort({ createdAt: -1 }).skip(filters.offset || 0).limit(filters.limit || 50).toArray(),
    coll.countDocuments(query),
  ])
  return { orders, total }
}

/** Generate a human-readable order confirmation message */
export function formatOrderConfirmation(order: Order, brandName = 'Us'): string {
  const itemsList = order.items
    .map(i => `• ${i.name} x${i.quantity}${i.price ? ` ($${i.price})` : ''}`)
    .join('\n')

  let msg = `✅ *Order Confirmed!*\n\n`
  msg += `Order ID: *${order.orderId}*\n`
  msg += `Status: ${order.status.toUpperCase()}\n\n`
  msg += `*Items:*\n${itemsList}\n`
  if (order.totalAmount) msg += `\n*Total: ${order.currency} ${order.totalAmount}*\n`
  if (order.scheduledFor) msg += `\nScheduled for: ${order.scheduledFor.toLocaleString()}\n`
  if (order.address) msg += `\nDelivery to: ${order.address}\n`
  msg += `\nThank you for ordering from ${brandName}! 🙏`
  return msg
}

/** Generate a cancellation message */
export function formatCancellationMessage(order: Order, reason?: string): string {
  let msg = `❌ *Order Cancelled*\n\n`
  msg += `Order ID: *${order.orderId}* has been cancelled.\n`
  if (reason) msg += `Reason: ${reason}\n`
  msg += `\nIf you have any questions, please don't hesitate to reach out.`
  return msg
}

/** Generate a rejection message */
export function formatRejectionMessage(order: Order, reason?: string): string {
  let msg = `⚠️ *Order Update*\n\n`
  msg += `We're sorry, but order *${order.orderId}* could not be processed.\n`
  if (reason) msg += `Reason: ${reason}\n`
  msg += `\nPlease contact us to place a new order or for assistance.`
  return msg
}

/** Get order status summary message */
export function formatOrderStatus(order: Order): string {
  const statusEmoji: Record<OrderStatus, string> = {
    pending: '⏳',
    confirmed: '✅',
    processing: '🔄',
    completed: '🎉',
    cancelled: '❌',
    rejected: '⚠️',
  }
  const emoji = statusEmoji[order.status] || '📦'
  return `${emoji} Order *${order.orderId}* is currently *${order.status.toUpperCase()}*.\n\nLast updated: ${order.updatedAt.toLocaleString()}`
}

/** Extract order intent from a WhatsApp message (basic keyword parsing) */
export function detectOrderIntent(text: string): 'book' | 'cancel' | 'status' | 'none' {
  const lower = text.toLowerCase()
  if (/\b(order|book|buy|purchase|get|want|need|place)\b/.test(lower)) return 'book'
  if (/\b(cancel|cancell?ation|stop|abort|remove)\b/.test(lower)) return 'cancel'
  if (/\b(status|track|where|update|check|progress)\b/.test(lower)) return 'status'
  return 'none'
}
