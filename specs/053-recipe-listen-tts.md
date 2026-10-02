---
spec: 053
title: "Listen" read-aloud button on the recipe page via ElevenLabs TTS
status: accepted
approved: yes # ONLY a human flips this to yes — implementation is gated on it
tier: 3 # closer — accessibility + third-party API integration, timeboxed ~45 min
owner: apps/web · packages/analytics
---

# Problem / gap

Sorrel has no audio alternative for its prose content. The recipe detail page
(`apps/web/app/[locale]/recipes/[slug]/page.tsx`, spec 011) is the chosen surface:
**it is the only page that is one self-contained block of descriptive prose
(`RecipeBlok.description`) a cat owner reads before choosing, so "listen" has one
obvious, bounded thing to read.** The funnel steps are forms (nothing to read
aloud) and the landing is a collage of short CMS sections.

No existing approved spec covers a server route to a TTS vendor, a new client
component, or `tts_*` analytics events.

# Vendor facts (verified 2026-10-02 against current ElevenLabs docs, not memory)

- Endpoint: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream`
- Auth header: `xi-api-key: <key>`
- Body: `{ text: string (required), model_id?: string, voice_settings?, language_code?, … }`.
  Default `model_id` is `eleven_multilingual_v2` (not low-latency).
- Query: `output_format` (default `mp3_44100_128`), `optimize_streaming_latency` (0–4).
- Response: chunked audio bytes in the requested format.
- Low-latency model: **`eleven_flash_v2_5`** (~75 ms, multilingual — covers en + de
  locales). `eleven_turbo_v2_5` is deprecated in favour of it.
- Official JS SDK: `@elevenlabs/elevenlabs-js` —
  `new ElevenLabsClient({ apiKey }).textToSpeech.stream(voiceId, { text, modelId, outputFormat })`
  → `Promise<ReadableStream<Uint8Array>>`.

**Decision: call the REST endpoint with `fetch`, no SDK dependency.** It is one
POST; `fetch` already returns a `ReadableStream` we can pipe straight into the
`Response`. Adding the SDK would add a dependency (and a `readiness-dependency-auditor`
surface) for zero behavioural gain.

# Scope

1. **`apps/web/app/api/tts/route.ts`** — `POST` Next.js route handler, `runtime = "nodejs"`.
   - Reads `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` from `process.env` at
     request time. Server-only; never `NEXT_PUBLIC_*`, never imported into a
     `"use client"` file. Missing either → `503 { error: "not_configured" }`.
   - Validates the JSON body via `validateTtsRequest` (below).
   - Rate-limits per IP via `createRateLimiter` (below). IP from the first entry of
     `x-forwarded-for`, else `"unknown"`.
   - Calls the vendor with `model_id: "eleven_flash_v2_5"`,
     `output_format=mp3_44100_128`, and streams `upstream.body` back with
     `Content-Type: audio/mpeg`, `Cache-Control: no-store`.
   - Upstream non-2xx → `502 { error: "upstream_error" }`. The vendor body is
     not forwarded (it may echo account detail).

2. **`apps/web/lib/tts.ts`** — pure, unit-testable logic, no Next imports:
   - `TTS_MAX_CHARS = 1000`.
   - `type TtsError = "invalid_json" | "text_required" | "text_too_long" | "rate_limited" | "not_configured" | "upstream_error"`.
   - `validateTtsRequest(body: unknown): { ok: true; text: string } | { ok: false; error: TtsError }`
     — `text` must be a string, non-empty after trim, `≤ TTS_MAX_CHARS` chars.
   - `createRateLimiter({ limit, windowMs, now? })` → `{ check(key): boolean }`,
     fixed-window, in-memory `Map`. Route uses **5 requests / 60 s / IP**. `now`
     is injectable for deterministic tests.
   - Error responses are `{ error: TtsError }` with status 400 / 429 / 502 / 503.

3. **`apps/web/app/[locale]/recipes/[slug]/ListenButton.tsx`** — `"use client"`.
   - Props: `{ text: string; contentId: string }` (`contentId` = recipe slug).
   - States: `idle | loading | playing | paused | error`. (`paused` is required for
     the `tts_pause` event to mean anything; it is the only addition to the four
     states in the brief.)
   - Click in `idle`/`error` → `fetch("/api/tts")` → `blob` → object URL →
     `new Audio(url).play()`. Click in `playing` → pause. Click in `paused` → resume.
     Audio `ended` → back to `idle`, object URL revoked. Unmount → pause + revoke.
     (Blob-then-play rather than MediaSource streaming: ≤1,000 chars is a few
     seconds of mp3, and `<audio>` + blob works in every browser incl. Safari.)
   - Button uses `AppButton`; visible label + `aria-label` change per state
     ("Listen", "Loading audio…", "Pause", "Resume", "Retry").
     `aria-busy` while loading.
   - A visually-hidden `role="status" aria-live="polite"` region announces
     "Loading audio", "Playing", "Paused", "Finished", "Audio unavailable".
   - Copy lives in `next-intl` messages under `Recipes.listen.*` (en + de).

4. **Recipe page** — render `<ListenButton text={recipe.description} contentId={recipe.slug} />`
   above the `RecipeCard`. Text longer than 1,000 chars is truncated client-side
   at a word boundary before sending (the route still enforces the cap).

5. **README** — short "Text to speech" section: what it does, the two env vars,
   the fetch-not-SDK design decision.

6. **`.env.example`** — `ELEVENLABS_API_KEY=` and `ELEVENLABS_VOICE_ID=` (empty) in
   the "Runtime server-only" block.

# Contract impact

- `schema.graphql`: none. `packages/domain`: none.
- **`packages/analytics/src/events.ts`** (additive, contract file): four new members
  of the `FunnelEvent` union. They are not funnel steps, so they carry `content_id`
  instead of `step`:
  - `TtsPlay { name: "tts_play"; content_id: string; chars: number }`
  - `TtsPause { name: "tts_pause"; content_id: string; position_s: number }`
  - `TtsEnded { name: "tts_ended"; content_id: string }`
  - `TtsError { name: "tts_error"; content_id: string; error: TtsErrorCode }`
    where `TtsErrorCode` mirrors `TtsError` plus `"playback_failed"` (client-side
    `audio.play()` rejection) and `"network"` (fetch threw).
- `events.test.ts` `summarize()` switch gains the four cases (exhaustiveness check).
- Any sink/insights code that switches on `event.name` exhaustively gets the new
  cases; funnel dashboards filter by name so are unaffected.
- `track` is imported from `apps/web/app/[locale]/wizard/analytics.ts` (the existing
  app tracker); no new tracker.

# Out of scope

- Reading any page other than the recipe page; reading the landing or funnel steps.
- Voice picker, speed control, seek bar, word highlighting.
- MediaSource / progressive playback in the browser.
- Caching generated audio (server or CDN).
- Distributed / persistent rate limiting (Redis, Vercel KV). The in-memory limiter is
  per-instance and resets on cold start — documented as such, acceptable for a demo.
- Adding `@elevenlabs/elevenlabs-js` as a dependency.
- Any real call to ElevenLabs from tests or CI.

# Acceptance criteria

- [ ] `yarn type-check` and `yarn lint` green
- [ ] Unit (`apps/web`, jest): `validateTtsRequest` — missing, non-string, empty/whitespace,
      exactly 1,000 (ok), 1,001 (`text_too_long`), non-object body
- [ ] Unit: `createRateLimiter` — allows `limit`, blocks `limit+1`, isolates keys,
      resets after `windowMs` (injected clock)
- [ ] Unit: `ListenButton` — idle → loading → playing → paused → playing → ended→idle;
      fetch 429 → error state + `tts_error{error:"rate_limited"}`; `aria-live` text per
      state; `tts_play` / `tts_pause` / `tts_ended` fired with correct props.
      `fetch` and `HTMLAudioElement` are mocked.
- [ ] Cypress `apps/web/cypress/e2e/recipe/listen.cy.ts`: `cy.intercept("POST", "/api/tts")`
      with fixture `cypress/fixtures/tts-sample.mp3`; click Listen → request body has
      `text`; status region reaches "Playing"; `window.__sorrelAnalyticsQueue` contains
      `tts_play`. No request reaches `api.elevenlabs.io`.
- [ ] API key never appears in any client bundle or `NEXT_PUBLIC_*` var
- [ ] README section + `.env.example` entries present
- [ ] Commits carry `Spec: 053`

# Analytics

| Event       | When                                   | Props                        |
| ----------- | -------------------------------------- | ---------------------------- |
| `tts_play`  | audio starts (first play and resume)   | `content_id`, `chars`        |
| `tts_pause` | user pauses                            | `content_id`, `position_s`   |
| `tts_ended` | audio `ended` event                    | `content_id`                 |
| `tts_error` | fetch non-2xx / network / play() fails | `content_id`, `error` (enum) |
