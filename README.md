# OpenWA Control Plane

A Next.js control plane for the unofficial OpenWA gateway at `https://openwa-qz0a.onrender.com`. It adds a MongoDB-backed consent ledger, campaign queue, throttled sender, idempotency records, HMAC-verified webhook ingestion, audit logging, and a responsive architecture dashboard.

## Verified OpenWA routes used

The implementation was checked against the live OpenAPI document at `/api/docs-json` and uses:

- `GET /api/health`
- `GET|POST /api/sessions`
- `POST /api/sessions/{sessionId}/messages/send-text`
- `POST /api/sessions/{sessionId}/webhooks`
- `X-OpenWA-Signature: sha256=<hex>` webhook verification

The sender intentionally calls one `send-text` request per opted-in recipient. This keeps our consent gate, MongoDB idempotency key, and pacing visible. OpenWA's own `RATE_LIMIT_*` envelope remains authoritative; configure `MIN_DELAY_MS`/`MAX_DELAY_MS` conservatively for the deployed account.

## Run locally

```bash
cp .env.example .env
# fill in MONGODB_URI, OPENWA_API_KEY, OPENWA_WEBHOOK_SECRET, and APP_URL
npm install
npm run dev
curl -X POST http://localhost:3000/api/setup
```

## API examples

Register an opted-in contact:

```bash
curl -X POST http://localhost:3000/api/contacts \
  -H 'content-type: application/json' \
  -d '{"phone":"15551234567@c.us","name":"Ada","consent":{"method":"web-form","source":"newsletter-2026-09"}}'
```

Create a campaign. Recipients without a current opt-in are rejected before enqueueing:

```bash
curl -X POST http://localhost:3000/api/campaigns \
  -H 'content-type: application/json' \
  -d '{"name":"September update","sessionId":"YOUR_SESSION_ID","text":"Hi {{name}}, your update is ready.","recipients":["15551234567@c.us"],"minDelayMs":1500,"maxDelayMs":3500}'
```

Process up to 20 queued recipients:

```bash
curl -X POST http://localhost:3000/api/campaigns/CAMPAIGN_ID/process
```

Register OpenWA's webhook delivery against the app's public URL:

```bash
curl -X POST https://your-app.example.com/api/webhooks/openwa/register \
  -H 'content-type: application/json' \
  -d '{"sessionId":"YOUR_SESSION_ID"}'
```

Opt out a contact:

```bash
curl -X POST https://your-app.example.com/api/contacts/15551234567%40c.us/optout
```

## MongoDB collections

`contacts` stores the consent state and ledger metadata. `campaigns` stores the operator intent. `campaignRecipients` stores the queued recipient state. `outboundMessages` stores the idempotency key, OpenWA message id, send response, and webhook delivery status. `webhookEvents` stores raw payloads with event deduplication. `auditLogs` stores operator and ingress audit entries.

## Deployment

Use the included `Dockerfile` and `docker-compose.yml`, or deploy the Next.js app to a Node-compatible host with MongoDB Atlas. The app must have a public HTTPS URL before registering the OpenWA webhook. Do not expose `OPENWA_API_KEY` or `OPENWA_WEBHOOK_SECRET` to the browser.

## Safety notes

This project does not claim Meta template approval semantics. Templates are internal text with placeholders only. Bulk enrollment requires a recorded opt-in, and opt-outs are checked again inside the worker immediately before sending. Webhook bodies are verified against the exact raw bytes with HMAC-SHA256 before parsing. Any OpenWA behavior not represented in the live schema should be verified against `/api/docs` before extending the adapter.
# openwa-automation
