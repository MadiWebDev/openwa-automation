/**
 * AI Auto-Reply Engine
 * Uses OpenAI to generate smart replies based on business context,
 * brand settings, conversation history, and custom auto-reply rules.
 */

import OpenAI from 'openai'
import { collection } from './mongodb'
import { ObjectId } from 'mongodb'

let _openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set')
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

export interface AutoReplyRule {
  _id?: ObjectId
  sessionId: string
  name: string
  trigger: 'keyword' | 'regex' | 'any' | 'order_keyword'
  pattern?: string          // keyword or regex string
  keywords?: string[]
  responseType: 'fixed' | 'ai' | 'template'
  fixedResponse?: string
  templateId?: string
  aiInstructions?: string   // extra instructions for AI mode
  isActive: boolean
  priority: number          // lower = higher priority
  matchCount?: number
  createdAt: Date
  updatedAt: Date
}

export interface BrandSettings {
  businessName: string
  tagline?: string
  welcomeMessage?: string
  fallbackMessage?: string
  aiPersonality?: string    // e.g. "professional", "friendly", "concise"
  aiLanguage?: string       // e.g. "English", "Arabic"
  businessHours?: { open: string; close: string; timezone: string; daysOff: string[] }
  outOfHoursMessage?: string
  maxAiTokens?: number
  signOff?: string          // e.g. "Best, Support Team"
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

/**
 * Check if a message matches an auto-reply rule.
 */
export function matchesRule(rule: AutoReplyRule, messageText: string): boolean {
  const text = messageText.toLowerCase().trim()
  if (rule.trigger === 'any') return true
  if (rule.trigger === 'keyword' || rule.trigger === 'order_keyword') {
    const kw = rule.keywords?.length ? rule.keywords : rule.pattern ? [rule.pattern] : []
    return kw.some(k => text.includes(k.toLowerCase().trim()))
  }
  if (rule.trigger === 'regex' && rule.pattern) {
    try { return new RegExp(rule.pattern, 'i').test(messageText) } catch { return false }
  }
  return false
}

/**
 * Get the best matching active rule for a message.
 */
export async function findMatchingRule(
  sessionId: string,
  messageText: string
): Promise<AutoReplyRule | null> {
  const rules = await (await collection<AutoReplyRule>('autoReplies'))
    .find({ sessionId, isActive: true })
    .sort({ priority: 1 })
    .toArray()

  for (const rule of rules) {
    if (matchesRule(rule, messageText)) return rule
  }
  return null
}

/**
 * Build the AI system prompt from brand settings.
 */
function buildSystemPrompt(brand: BrandSettings, extraInstructions?: string): string {
  const personality = brand.aiPersonality || 'professional and helpful'
  const language = brand.aiLanguage || 'English'
  const businessName = brand.businessName || 'our business'

  let prompt = `You are a ${personality} WhatsApp assistant for ${businessName}.`
  if (brand.tagline) prompt += ` ${brand.tagline}.`
  prompt += `\n\nRespond in ${language}. Keep replies concise and natural for WhatsApp (no markdown formatting, no bullet points unless explicitly useful, use short paragraphs).`

  if (brand.signOff) prompt += `\n\nAlways end replies with: ${brand.signOff}`

  prompt += `\n\nYou help customers with inquiries, orders, product information, and support.`
  prompt += `\nFor ORDER MANAGEMENT: customers can book orders, cancel orders, check order status. When they mention ordering or booking, ask for details and confirm.`
  prompt += `\nFor CANCELLATIONS: acknowledge empathetically, ask for order ID if not provided, and confirm the cancellation request has been logged.`
  prompt += `\nNever make up information you don't have. If unsure, say you'll check and get back to them.`

  if (extraInstructions) {
    prompt += `\n\nAdditional instructions: ${extraInstructions}`
  }

  return prompt
}

/**
 * Generate an AI reply using conversation history and brand context.
 */
export async function generateAIReply(
  messageText: string,
  phone: string,
  sessionId: string,
  extraInstructions?: string
): Promise<string> {
  const openai = getOpenAI()

  // Load brand settings
  const brandDoc = await (await collection<any>('brandSettings')).findOne({ sessionId })
  const brand: BrandSettings = brandDoc || { businessName: 'Our Business' }

  // Load recent conversation history (last 10 exchanges)
  const recentMessages = await (await collection<any>('messages'))
    .find({ phone, sessionId })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray()

  const history: ConversationMessage[] = recentMessages
    .reverse()
    .map((m: any) => ({ role: m.direction === 'inbound' ? 'user' : 'assistant', content: m.text, timestamp: m.createdAt }))

  const systemPrompt = buildSystemPrompt(brand, extraInstructions)

  // Build OpenAI messages
  const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map(h => ({ role: h.role, content: h.content } as OpenAI.Chat.Completions.ChatCompletionMessageParam)),
    { role: 'user', content: messageText },
  ]

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: openaiMessages,
    max_tokens: brand.maxAiTokens || 300,
    temperature: 0.7,
  })

  return completion.choices[0]?.message?.content?.trim() || brand.fallbackMessage || "Thanks for your message! We'll get back to you shortly."
}

/**
 * Check if current time is within business hours.
 */
export function isWithinBusinessHours(brand: BrandSettings): boolean {
  if (!brand.businessHours) return true

  const { open, close, timezone, daysOff } = brand.businessHours
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      hour: 'numeric', minute: 'numeric', hour12: false,
      weekday: 'long',
    })
    const parts = formatter.formatToParts(now)
    const dayName = parts.find(p => p.type === 'weekday')?.value || ''
    const hourPart = parts.find(p => p.type === 'hour')?.value || '0'
    const minPart = parts.find(p => p.type === 'minute')?.value || '0'
    const currentMins = parseInt(hourPart) * 60 + parseInt(minPart)

    if (daysOff?.includes(dayName)) return false

    const [openH, openM] = open.split(':').map(Number)
    const [closeH, closeM] = close.split(':').map(Number)
    const openMins = openH * 60 + openM
    const closeMins = closeH * 60 + closeM

    return currentMins >= openMins && currentMins < closeMins
  } catch {
    return true
  }
}

/**
 * Process an inbound message: find a matching rule and generate a reply.
 * Returns the reply text or null if no rule matched and AI is disabled.
 */
export async function processInboundMessage(
  messageText: string,
  phone: string,
  sessionId: string
): Promise<{ reply: string; source: 'rule' | 'ai' | 'out_of_hours' | 'none'; ruleId?: string } | null> {
  // Load brand to check business hours
  const brandDoc = await (await collection<any>('brandSettings')).findOne({ sessionId })
  const brand: BrandSettings = brandDoc || { businessName: 'Our Business' }

  // Out-of-hours check
  if (!isWithinBusinessHours(brand) && brand.outOfHoursMessage) {
    return { reply: brand.outOfHoursMessage, source: 'out_of_hours' }
  }

  // Find matching auto-reply rule
  const rule = await findMatchingRule(sessionId, messageText)

  if (rule) {
    // Increment match count
    await (await collection('autoReplies')).updateOne(
      { _id: rule._id },
      { $inc: { matchCount: 1 }, $set: { updatedAt: new Date() } }
    )

    if (rule.responseType === 'fixed' && rule.fixedResponse) {
      return { reply: rule.fixedResponse, source: 'rule', ruleId: String(rule._id) }
    }

    if (rule.responseType === 'template' && rule.templateId) {
      const tmpl = await (await collection<any>('templates')).findOne({ _id: new ObjectId(rule.templateId) })
      if (tmpl) {
        const contactDoc = await (await collection<any>('contacts')).findOne({ phone })
        const vars = { name: contactDoc?.name || '', phone, ...contactDoc?.variables }
        const rendered = tmpl.body.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_: string, k: string) => vars[k] || '')
        return { reply: rendered, source: 'rule', ruleId: String(rule._id) }
      }
    }

    if (rule.responseType === 'ai') {
      try {
        const reply = await generateAIReply(messageText, phone, sessionId, rule.aiInstructions)
        return { reply, source: 'ai', ruleId: String(rule._id) }
      } catch (err: any) {
        console.error('AI reply error:', err.message)
        return null
      }
    }
  }

  // Fallback: global AI auto-reply if enabled
  const globalAI = await (await collection<any>('autoReplies')).findOne({
    sessionId, trigger: 'any', responseType: 'ai', isActive: true
  })
  if (globalAI) {
    try {
      const reply = await generateAIReply(messageText, phone, sessionId)
      return { reply, source: 'ai', ruleId: String(globalAI._id) }
    } catch (err: any) {
      console.error('AI fallback reply error:', err.message)
    }
  }

  return null
}
