---
spec: 041
title: Pre-delivery security hardening — remove committed TLS PEMs, Apollo prod hardening + input length caps + drafts-mock comment, security headers via Next + draft-route constant-time secret compare, /api/graphql + /api/checkout/intent rate limit, insights-posthog seed-filter boolean fix, EMAIL action 254-char cap
approved: yes
tier: 2 # JD coverage — pre-delivery security posture
owner: .gitignore · apps/web/app/api/graphql/route.ts · services/api/src/resolvers.ts · apps/web/next.config.ts · apps/web/app/api/draft/route.ts · apps/web/app/api/checkout/intent/route.ts · apps/web/lib/insights-posthog.ts · apps/web/app/[locale]/wizard/email-validation.ts
---

# Problem / gap

The 2026-06-15 delivery-readiness audit (security reviewer) found seven
independent security gaps that together degrade the demo's security posture
on a public Vercel deploy. None of them has its own spec; they have been
treated as ambient risks. They are not equally severe — one is a tracked-file
TLS-key blocker, one is the Apollo Route Handler shipping the Sandbox in
production, and the rest are hardening of routes that are already in place
(draft preview, EMAIL action, checkout intent) plus a missing CSP block.

(The audit also surfaced an even-higher-severity finding — live PostHog
personal key + Storyblok PAT in the maintainer's working tree — but that is
purely operational: rotate the tokens in the PostHog and Storyblok dashboards
and replace them in the Vercel project environment. No tracked file changes.
This spec deliberately does **not** scope rotation.)

The seven concrete findings, with severity from the audit:

1. **BLOCKER (Security-B2) — `localhost-key.pem` is committed.** `git ls-files
| grep pem` returns `localhost-key.pem` and `localhost.pem` (header
   `-----BEGIN PRIVATE KEY-----`, added in commit `3c049ba` on 2026-06-12).
   Even a localhost mkcert key is not a usable credential in itself, but
   committing any file containing `BEGIN PRIVATE KEY` fails every standard
   secret scanner (GitHub Advanced Security, Gitleaks, TruffleHog) on the
   public mirror and tells the next contributor "PEM files are fine to commit
   here". The right norm is "never". Each developer should `mkcert localhost`
   locally and the artefact must not enter the tree.

2. **MAJOR (Security-M1) — Apollo Server `/api/graphql` is shipping its
   Sandbox + introspection in production, no depth/complexity limit, no input
   length caps, and the drafts store is a shared module-level `Map` with no
   owner check.**
   - `apps/web/app/api/graphql/route.ts:18` —
     `new ApolloServer({ typeDefs, resolvers })`. Apollo Server v5 defaults
     to `introspection: true` and shows the Sandbox landing page on `GET`.
     A public deploy at `/api/graphql` lets anyone query
     `{ __schema { types { name } } }` and the schema is `schema.graphql`
     contents anyway (open source), but this is a routine pentest ding.
   - No `validationRules` and no depth/complexity plugin. The current
     schema is shallow so a deeply-nested attack is bounded by the schema
     itself, but `query { a:recipes a2:recipes … a1000:recipes }` is
     unbounded today.
   - `services/api/src/resolvers.ts:197` —
     `const drafts = new Map<string, FunnelDraft>();` is module-level state
     shared across requests on the same Lambda container. `funnelDraft(id)`
     and `updateFunnelPlan(draftId, input)` accept any UUID-shaped id with
     no owner check. Draft IDs are server-minted `crypto.randomUUID()` so
     they are unguessable, but the store has no read-protection. There is
     no comment in the file saying "mock — not productionizable as-is".
   - No length caps on `CatInput.name`, `email`, or `recipeSlugs`/`cats`
     array sizes. Bounded only by Vercel's body-size limit.

3. **MAJOR (Security-M2 + Release-M4) — No security headers, no CSP block.**
   `apps/web/next.config.ts` has no `headers()` function (the file ends at
   line 31). There is no `vercel.json` (spec 040 adds one). Missing on a
   public deploy: CSP (`frame-ancestors 'self' https://app.storyblok.com`
   for the Visual Editor iframe, plus `connect-src` allowlisting
   `https://*.i.posthog.com`, `https://api-eu.mixpanel.com`,
   `https://js.stripe.com`, `https://api.stripe.com`,
   `https://app.storyblok.com`, `https://a.storyblok.com`, and `'self'`;
   `script-src` for `https://js.stripe.com` and `'self'`), HSTS
   (`max-age=63072000; includeSubDomains; preload`), `X-Content-Type-Options:
nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
   `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
   `X-Frame-Options: DENY` cannot be used because the Storyblok Visual
   Editor embeds the site — `frame-ancestors` covers it correctly.

4. **MAJOR (Security-M3) — No rate limit on `/api/graphql` or
   `/api/checkout/intent`.** The intent endpoint uses
   `pi-${draftId}` as the Stripe idempotency key (`apps/web/app/api/checkout/intent/route.ts:131`)
   which is solid for honest clients. But a hostile client can mint UUIDs
   via `saveFunnelDraft` and hammer Stripe `paymentIntents.create` in
   test mode — Stripe Dashboard noise today, audit-log pollution on
   `sk_live_` tomorrow. The GraphQL endpoint has the same exposure.

5. **MINOR (Security-m1) — Insights query seed filter uses string `"true"`.**
   `apps/web/lib/insights-posthog.ts:43`:

   ```ts
   query.properties = [{ key: "seed", type: "event", value: ["true"], operator: "is_not" }];
   ```

   The event payload sends `seed` as a boolean (per spec 023), but the
   PostHog REST filter compares to the string `"true"`. The "organic-only"
   filter silently fails-open: seeded sessions are not excluded. The page
   would still show a correct _seeded+organic_ mix, but the "organic only"
   honesty signal is broken.

6. **MINOR (Security-m2) — Draft preview-secret compare is not
   constant-time.** `apps/web/app/api/draft/route.ts:15`:

   ```ts
   if (!process.env.STORYBLOK_PREVIEW_SECRET || secret !== process.env.STORYBLOK_PREVIEW_SECRET) {
     return new Response("Invalid preview secret", { status: 401 });
   }
   ```

   `!==` on strings is short-circuit; for a 32-hex secret the timing-oracle
   exposure is theoretical (~10^38 oracle calls), but the webhook handler
   at `apps/web/app/api/storyblok/revalidate/route.ts:12-18` already uses
   `timingSafeEqual` for the same shape of comparison. The two routes
   should be consistent.

7. **MINOR (Security-m3) — EMAIL server-action has no length cap.**
   `apps/web/app/[locale]/wizard/email-validation.ts:21` validates with a
   ReDoS-safe regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`. There is no length cap
   so an address longer than RFC 5321's 254-character maximum would pass.
   Bounded by Next.js form-data body limit upstream, but belt-and-braces.

No existing approved spec covers any of these seven items.

# Scope

The exact files this spec touches. No file outside these is edited.

## 1. Remove committed TLS PEMs

- `git rm /Users/akinoztorun/Documents/projects/sorrel/localhost-key.pem` and
  `git rm /Users/akinoztorun/Documents/projects/sorrel/localhost.pem`. The
  files leave the tracked tree.
- Edit `/Users/akinoztorun/Documents/projects/sorrel/.gitignore`: append two
  lines under the existing "Env / secrets" block:
  ```
  *.pem
  *-key.pem
  ```
  Each developer regenerates with `mkcert localhost` locally if HTTPS is
  needed (which the current `apps/web/package.json` `dev` script does not
  require — `next dev` on `localhost:3000` over HTTP is the documented
  path).
- This spec does **not** rewrite git history. The single committed copy
  remains in the public log; that is the cost of the project rule against
  `git push --force` on `main`. The README adds a one-line disposition
  note acknowledging the historical commit.

## 2. Apollo `/api/graphql` production hardening

- Edit `apps/web/app/api/graphql/route.ts`: replace the constructor at
  line 18 with a version that toggles production hardening by `NODE_ENV`:

  ```ts
  import {
    ApolloServerPluginLandingPageLocalDefault,
    ApolloServerPluginLandingPageProductionDefault,
  } from "@apollo/server/plugin/landingPage/default";

  const isProd = process.env.NODE_ENV === "production";
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: !isProd,
    plugins: [
      isProd
        ? ApolloServerPluginLandingPageProductionDefault({ footer: false })
        : ApolloServerPluginLandingPageLocalDefault(),
    ],
  });
  ```

  No new package dependency — these plugins ship with `@apollo/server`.

- Edit `services/api/src/resolvers.ts` near line 197 (the `const drafts =
new Map<...>()` line): add a 3-line block-comment immediately above:
  ```ts
  // Mock draft store: process-local Map keyed by server-minted UUID. No owner
  // check; relies on UUID unguessability. Not productionizable as-is — a real
  // backend needs auth, ownership, persistence, and PII-retention bounds.
  ```
- Edit `saveDraft` (`services/api/src/resolvers.ts:203`) and `updateDraft`
  (line 242): add a small `validate(input)` helper at the top of the
  resolvers module that enforces the four caps below; both functions call
  it before touching the Map. Caps:
  - `email` (when present): `length <= 254` (RFC 5321).
  - `cats[].name`: `length <= 80`.
  - `cats.length`: `<= 20`.
  - `recipeSlugs.length`: `<= 20`.
    On failure, throw `new GraphQLError("invalid input", { extensions: {
code: "BAD_USER_INPUT" } })` — the standard Apollo path.

## 3. Security headers + CSP via `next.config.ts`

- Edit `apps/web/next.config.ts`: add a `headers()` async function returning
  a single matcher object for all routes (`source: "/(.*)"`) with:
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Content-Security-Policy` (report-only on first deploy — see Decision
    A) with directives:
    - `default-src 'self'`
    - `script-src 'self' 'unsafe-inline' https://js.stripe.com`
    - `style-src 'self' 'unsafe-inline'`
    - `connect-src 'self' https://*.i.posthog.com https://api-eu.mixpanel.com https://js.stripe.com https://api.stripe.com https://app.storyblok.com https://a.storyblok.com https://api.storyblok.com`
    - `img-src 'self' data: https: blob:`
    - `frame-src https://js.stripe.com https://hooks.stripe.com`
    - `frame-ancestors 'self' https://app.storyblok.com`
    - `font-src 'self' data:`
- **Decision A — `Content-Security-Policy-Report-Only` vs enforcing.**
  Recommendation: ship as **report-only** on the first deploy. Walk the
  funnel + Visual Editor preview + Stripe checkout, capture any violation
  warnings in the browser console, tighten directives, then promote to
  enforcing on a follow-up commit (still under this spec's `Spec: 041`
  trailer). Too-strict enforcing CSP silently breaks Storyblok preview.

## 4. Constant-time draft preview-secret compare

- Edit `apps/web/app/api/draft/route.ts` line 15: replace the `!==`
  comparison with `timingSafeEqual`, matching the pattern used at
  `apps/web/app/api/storyblok/revalidate/route.ts:12-18`. The
  length-guard-before-compare pattern is required to avoid
  `timingSafeEqual` throwing on unequal-length buffers.
- The early-return on missing `STORYBLOK_PREVIEW_SECRET` stays unchanged.

## 5. Rate limit on `/api/graphql` and `/api/checkout/intent`

- Decision B — implementation surface. Two options:
  - **B1 (recommended) — Vercel KV + a tiny token-bucket helper.** Add
    `@vercel/kv` as a dep of `apps/web`. Wrap the two route handlers with
    a `rateLimit(key, max, windowSeconds)` helper that reads the client
    IP from `request.headers.get("x-forwarded-for")` (Vercel sets it),
    increments a KV counter with a TTL, and returns `429 Too Many
Requests` with `Retry-After` when over budget. Budgets: - `/api/graphql`: 60 requests / minute / IP (loose — the page legit
    makes several queries per pageview). - `/api/checkout/intent`: 5 requests / minute / IP (tight — one
    checkout per user is the expected path; 5 covers normal retries
    and dev tooling).
  - **B2 — in-memory token bucket.** No new dep. A `Map<ip, {count,
resetAt}>` in a module-level helper. Works inside a single Lambda
    container, doesn't survive container churn, doesn't share across
    serverless invocations. Honest for the demo, won't survive real
    traffic, but adds zero deps.
  - Recommendation: **B1**. Akın picks at approval.
- Either way, the rate-limit helper module lives at
  `apps/web/lib/rate-limit.ts` and is imported by the two route handlers.
  Disabled in test (`process.env.NODE_ENV === "test"` early-return).

## 6. Insights query seed-filter boolean

- Edit `apps/web/lib/insights-posthog.ts:43`: replace `value: ["true"]`
  with `value: [true]` — match the boolean shape the event payload
  actually sends (per spec 023, `seed` is a boolean property when the
  seed scripts stamp it). Operator stays `is_not`. The `is_not` filter
  on `[true]` excludes seeded sessions; the "organic only" honesty
  signal is restored.

## 7. EMAIL action length cap

- Edit `apps/web/app/[locale]/wizard/email-validation.ts:21`: before the
  regex check, add an explicit length cap:
  ```ts
  if (raw.length > 254) return { email: "", error: "invalid" };
  ```
  Matches RFC 5321's address length limit. The existing required /
  invalid branches stay unchanged.

# Contract impact

None.

- `schema.graphql`: untouched. The `validate()` helper rejects via
  `GraphQLError` — no new fields, no new operations.
- `packages/domain`: untouched.
- `packages/analytics`: untouched.
- `packages/ui`: untouched.
- New dependency under Decision B1: `@vercel/kv` added to
  `apps/web/package.json`. Documented as required by this spec (not a
  stealth dep). Under B2: no new dep.

# Out of scope

- Rotating the live `phx_…` PostHog personal API key and the
  `sb_pat_…` Storyblok PAT (Security-B1 from the audit). Both are in
  the maintainer's working tree `.env`; rotation happens in the PostHog
  and Storyblok dashboards and the Vercel project environment
  variables. No tracked file changes.
- Adding a `gitleaks` / `trufflehog` pre-commit hook for `phx_`,
  `sb_pat_`, `sk_live_`, `whsec_` patterns. That is a developer
  tooling change worth a separate spec (it touches `.claude/hooks/`).
- Rewriting git history to remove the `3c049ba` PEM commit. The project
  rule against `git push --force` on `main` makes this explicitly
  out-of-scope.
- The `NEXT_PUBLIC_SITE_URL` preview-vs-prod scoping (Release-MAJOR-4).
  That is a Vercel dashboard operational change, not in tree.
- Authentication / authorization on the GraphQL endpoint. The drafts
  store remains a mock; the comment added in §2 documents that.

# Acceptance criteria

- [ ] `yarn type-check && yarn lint && yarn format:check` — clean (0
      warnings, 0 errors).
- [ ] `yarn workspaces run test` — every workspace's jest suite green.
- [ ] `yarn workspace @sorrel/frontend cypress run` — identical pass
      count to the pre-spec baseline. The CSP report-only mode must not
      block the Cypress happy-path.
- [ ] `git ls-files | grep -E '\.pem$'` returns **zero hits**.
- [ ] `.gitignore` contains the `*.pem` line and the `!.env.example`
      exception (the latter shared with spec 040).
- [ ] `apps/web/app/api/graphql/route.ts` constructs `ApolloServer` with
      `introspection: !isProd` and the `ApolloServerPluginLandingPageProductionDefault`
      plugin in prod. A `grep -c 'introspection: !isProd' apps/web/app/api/graphql/route.ts`
      returns `1`.
- [ ] `services/api/src/resolvers.ts` contains the three-line "Mock draft
      store ... Not productionizable as-is" comment immediately above the
      `const drafts = new Map<...>` line. The `validate(input)` helper
      exists and is called from both `saveDraft` and `updateDraft`.
- [ ] A new unit test in `services/api/src/resolvers.test.ts` covers the
      four input-cap rejections
      (`email.length === 255`, `name.length === 81`,
      `cats.length === 21`, `recipeSlugs.length === 21`).
- [ ] `apps/web/next.config.ts` exports a `headers()` async function that
      returns an array containing every header listed in §3 above. The
      CSP shipping is report-only on first commit (per Decision A).
- [ ] `apps/web/app/api/draft/route.ts` no longer compares
      `STORYBLOK_PREVIEW_SECRET` with `!==`. A
      `grep -n 'timingSafeEqual' apps/web/app/api/draft/route.ts`
      returns the match.
- [ ] Under Decision B1: `@vercel/kv` is in
      `apps/web/package.json` dependencies and `yarn.lock`.
      `apps/web/lib/rate-limit.ts` exists and is imported by both
      `/api/graphql` and `/api/checkout/intent` route handlers. A
      manual test (or a Cypress task) confirms a 6th rapid
      `/api/checkout/intent` request returns `429`.
- [ ] `apps/web/lib/insights-posthog.ts:43` value array is `[true]` (not
      `["true"]`). `grep -n 'value: \[true\]' apps/web/lib/insights-posthog.ts`
      returns the line.
- [ ] `apps/web/app/[locale]/wizard/email-validation.ts` rejects an
      input of length 255 with `error: "invalid"`. A unit test in
      `email-validation.test.ts` covers it.
- [ ] No `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or
      `ignoreDeprecations` added anywhere in the diff.
- [ ] The implementation commit subject(s) include the `Spec: 041`
      trailer (canonical form).

# Analytics

None. This spec touches security posture only; no typed funnel events
change, no `packages/analytics` change, no spec-009 surface change. The
`insights-posthog.ts` seed-filter fix in §6 changes which events the
**read** path filters out, not what the **write** path emits.
