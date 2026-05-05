# {{CHANNEL_NAME}}

Ad-supported finance/news channel — part of the 6-channel network.

## Stack

Next.js 14 (App Router), TypeScript, Tailwind CSS, next-intl (11 locales), Vercel KV, Anthropic Claude API, MGID + Adsterra.

## Setup

```bash
cp .env.example .env.local
# fill in keys
npm install
npm run dev
```

## Cron

`/api/cron/collect` runs every 5 minutes (configured in `vercel.json`). Drops dups by URL/title hash, generates rewritten + translated articles via Claude, persists to KV.

## Deployment

1. Push to GitHub
2. Import into Vercel
3. Add env vars
4. Connect IONOS domain → Vercel
5. SSL provisioned automatically

See top-level `README.md` for the network-wide guide.
