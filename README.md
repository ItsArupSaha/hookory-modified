# Hookline.io – LinkedIn Repurposing SaaS (Next.js + Firebase + Stripe)

Hookline.io turns one piece of content into multiple ready-to-post LinkedIn formats with strong hooks, clean structure, and CTAs. This repo is a production-ready Next.js App Router project with Firebase Auth/Firestore, Stripe billing, usage limits, caching, and an AI provider adapter (Gemini now, OpenAI-ready).

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: TailwindCSS + shadcn/ui-style components
- **Auth**: Firebase Authentication (Google + email/password)
- **Database**: Firestore (users, jobs, cache)
- **Billing**: Stripe subscriptions + webhook
- **AI**: OpenAI GPT-4o-mini via `openai`
- **Hosting target**: Vercel

## Features Overview

- Landing page with hero, before/after, “Why different” and pricing sections.
- Auth pages:
  - `/login`: Google + email/password login.
  - `/signup`: Google + email/password signup with email verification.
- Protected routes with app shell:
  - Sidebar: Dashboard, History (paid), Usage, Settings.
  - Top bar: plan badge, upgrade / manage billing, user menu and logout.
- **Dashboard** (`/dashboard`):
  - Tabs: Paste Text / Paste URL (URL is Creator-only).
  - Context: target audience, goal, style, emoji toggle, tone preset (Creator-only).
  - Format selection: thought leadership, story-based, educational/carousel, short viral hook.
  - Generate button with cooldown and disabled states.
  - Outputs per format: editable textarea, copy button, character count.
  - History + regenerate behaviour wired server-side (regenerate counts as a usage action; UI currently focuses on primary generate).
- **History** (`/history` – Creator-only):
  - List of past jobs with date/time and formats.
  - Detail view with input and per-format outputs.
  - Free users see an upgrade paywall.
- **Usage** (`/usage`):
  - Monthly usage count and limit.
  - Usage bar + reset date.
  - Plan info and upgrade / billing portal buttons.
- **Settings** (`/settings`):
  - Account email and verification status.
  - Resend verification email.
  - Soft-delete account (clears subscription metadata, marks deleted; no hard delete).
- Legal pages: `/terms` and `/privacy`.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

### Firebase Client

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Create a Firebase project, enable **Email/Password** and **Google** sign-in, and copy the client config from the Firebase console.

### Firebase Admin

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

Create a **Service Account** key in Firebase, then:

- Set `FIREBASE_ADMIN_PROJECT_ID` to your project ID.
- Set `FIREBASE_ADMIN_CLIENT_EMAIL` to the service account email.
- Set `FIREBASE_ADMIN_PRIVATE_KEY` to the private key (escape newlines as `\n`).

### Stripe

- `STRIPE_SECRET_KEY` – Secret key from Stripe dashboard.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` – Publishable key.
- `STRIPE_WEBHOOK_SECRET` – Webhook signing secret for the endpoint `/api/stripe/webhook`.
- `STRIPE_PRICE_ID_CREATOR` – Price ID for the `$9.99/mo` "Creator" subscription.

Configure a recurring product in Stripe and copy the price ID.

### AI Provider

- `OPENAI_API_KEY` – from OpenAI Platform.

## Data Model (Firestore)

**Collection: `users` (docId = uid)**

- `email`, `displayName`
- `plan`: `"free"` | `"creator"`
- `emailVerified`: boolean
- `usageCount`: number
- `usageLimitMonthly`: number (5 free, 100 creator)
- `usageResetAt`: timestamp (start of next month)
- `lastGenerateAt`: timestamp (for cooldown)
- `stripeCustomerId`, `stripeSubscriptionId`, `stripeStatus`
- `createdAt`, `updatedAt`
- `deletedAt` (optional, for soft delete)

**Collection: `jobs` (Creator history)**  
Only for paid users who opt to save:

- `userId`
- `inputText` (truncated)
- `context`
- `formatsSelected`
- `outputs` – `{ formatType: outputText }`
- `createdAt`

**Collection: `cache`**

- `cacheKey`
- `outputText`
- `provider`
- `createdAt`

## Firestore Security Rules

See `firestore.rules` (draft):

- Users can only read/write their own document.
- Jobs are readable/writable only by the owner (`userId`).
- `cache` collection is server-only (no client access).

Deploy these rules from the Firebase CLI for production.

## Usage Limits & Cooldown

Implemented in `lib/usage.ts` + `lib/auth-server.ts` + `/api/generate`:

- Each **Generate** call counts as **one** repurpose for the current month.
- Regenerates (if you extend UI) also count as actions.
- Monthly counters reset when `now > usageResetAt`, then `usageResetAt` is set to the first day of next month (UTC).
- Cooldown: 45 seconds between generate calls per user; enforced server-side and surfaced as a 429 error with `secondsRemaining`.

## AI Adapter

`lib/ai/index.ts` exports:

- `generateLinkedInFormat(format, inputText, context)`

Supported formats:

- `"thought-leadership"`
- `"story-based"`
- `"educational-carousel"`
- `"short-viral-hook"`

The adapter:

- Builds format-specific prompts enforcing:
  - Hook in first 2 lines.
  - Short lines and whitespace.
  - Optional emojis (controlled by `emojiOn`).
  - Clear CTA.
  - Max 3 hashtags or none.
  - Avoids “AI-sounding” phrases and fluff.
- Uses Gemini (or OpenAI when `AI_PROVIDER` is switched).
- Adds timeouts and error handling; empty responses are rejected.

## URL Extraction (Creator-only)

`lib/url-extractor.ts`:

- Fetches HTML server-side with a modern `User-Agent`.
- Removes scripts/styles and finds main content via common selectors, falling back to `<body>`.
- Normalizes whitespace and truncates to a max length.
- Throws if text is too short (likely invalid).
- No raw HTML is stored—only extracted text is used.

## Caching

`lib/cache.ts`:

- Cache key is `sha256(input + context + format + emoji + tonePreset)`.
- Data stored in `cache` collection with `createdAt` and `provider`.
- TTL: 30 days (expired entries are ignored and cleaned lazily).
- `/api/generate` checks cache first:
  - If hit: returns cached text, still counts toward usage.
  - If miss: calls AI, stores cache, then returns.

## Billing (Stripe)

API routes:

- `POST /api/stripe/checkout` – creates a Checkout Session for the Creator plan.
- `POST /api/stripe/portal` – opens Stripe Billing Portal for existing customers.
- `POST /api/stripe/webhook` – handles:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `invoice.paid`

On successful subscription / updates:

- Sets `plan = "creator"` and `usageLimitMonthly = 100`.
- Stores `stripeCustomerId`, `stripeSubscriptionId`, `stripeStatus`.

On cancellation / failure:

- Updates `stripeStatus` and flips `plan` back to `"free"` with limit `5` when the subscription is no longer active.

## Auth & Access Rules

- Client auth: Firebase Auth; Google is primary, email/password as secondary.
- Server verification: Firebase Admin in `lib/auth-server.ts` reads ID token from `Authorization: Bearer <token>`.
- Protected routes (`/dashboard`, `/usage`, `/history`, `/settings`) are wrapped with `AppShell`:
  - Redirects to `/login` if not authenticated.
  - Fetches `/api/me` to show plan + usage.
- `/api/generate`:
  - Requires valid ID token.
  - Requires `emailVerified === true`.
  - Enforces cooldown and monthly usage.
  - Enforces plan-specific access:
    - Free: no URL input, no tone presets, no regenerate.
    - Creator: full access.

## Running Locally

1. **Install dependencies:**

```bash
npm install
```

2. **Set up environment:**

- Copy `.env.example` to `.env.local`.
- Fill in Firebase client + admin, Stripe, and AI keys.

3. **Run dev server:**

```bash
npm run dev
```

The app should be available at `http://localhost:3000`.

4. **Configure Stripe webhook in dev:**

Use the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Paste the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## Deployment (Vercel)

- Add all environment variables in the Vercel dashboard for the project.
- Ensure Firebase service account env vars are set with newlines escaped as `\n`.
- Deploy normally; `app/api/stripe/webhook` is configured for Node.js runtime and reads the raw body for signature verification.

## Notes & Extensibility

- AI provider is OpenAI GPT-4o-mini.
- History UI can be extended with regenerate buttons that call `/api/generate` with `regenerate: true`.
- Soft-delete currently:
  - Clears Stripe metadata.
  - Resets plan to free.
  - Marks `deletedAt`.
  - Optionally disables the Firebase Auth user via Admin SDK.

This implementation is intentionally focused on LinkedIn repurposing with a premium, minimal UI and opinionated product constraints as described in the original spec.

