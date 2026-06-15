# Pre-delivery manual smoke checklist (spec 044 §8)

Run this top-to-bottom against the deployed URL (or against
`yarn workspace @sorrel/frontend build && yarn workspace @sorrel/frontend start`)
immediately before any demo or delivery. Each item: **route → action → pass
condition**. The whole list takes 10–15 minutes; the goal is to catch anything
the CI suite wouldn't (real Stripe in test mode, real Storyblok preview, real
locale switching, real PostHog ingestion when keys are set).

## Funnel — happy path (English)

1. **`/en` landing.** Hero renders English copy. CTA button visible and
   clickable. DevTools console clean (zero application errors).
2. **`/en/wizard/cats`.** Step form loads. Click "2 cats" — option highlights.
   Continue enables. Click Continue → navigates to `/en/wizard/profile`.
3. **`/en/wizard/profile`.** Either variant A (pill buttons for age + weight)
   or variant B (autocomplete selects) renders. Empty-name submit shows an
   inline required error. Name + age pill + weight pill → Continue enables →
   navigates to `/en/wizard/recipes`.
4. **`/en/wizard/recipes`.** Recipe cards load (GraphQL). Click "Add" on the
   first card — label changes to "Added." Continue enables → navigates to
   `/en/wizard/delivery`.
5. **`/en/wizard/delivery`.** Closed card shows the earliest deliverable day
   (3 days from today, skipping the blocked Tue/Fri/Sat). **Continue is
   already enabled on entry** — the earliest date is pre-committed to funnel
   state per spec 020 §DELIVERY, so the modal dance is optional. "Change"
   opens the modal. Blocked days are dimmed (`aria-disabled="true"`) — click
   is a no-op. Click a valid Wednesday — `aria-selected` updates. Confirm
   closes the modal and updates the closed card. Open again; Cancel closes
   without changing. Open again; ESC closes without changing. Open again;
   backdrop click closes without changing. Continue → navigates to
   `/en/wizard/plan`.
6. **`/en/wizard/plan`.** Portion grams/day + per-day/per-box/first-box pricing
   render. Toggle frequency (2-week ↔ 4-week) — pricing updates in real time.
   Continue → navigates to `/en/wizard/email`.
7. **`/en/wizard/email`.** Empty submit → required error. `notanemail` →
   invalid error. Valid `name@example.com` → confirmation. Continue →
   navigates to `/en/wizard/summary`.
8. **`/en/wizard/summary`.** Renders cat count, recipes, delivery date, plan +
   pricing, email. Continue → navigates to `/en/wizard/checkout`.
9. **`/en/wizard/checkout`.** Stripe PaymentElement iframe loads (requires
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` + `STRIPE_SECRET_KEY` in env). No
   "Stripe test mode is not configured" alert. Enter card `4242 4242 4242
4242`, exp `12/34`, CVC `123`. Click "Pay now" → resolves without
   redirect. Open DevTools and run
   `window.__sorrelAnalyticsQueue?.at(-1)` — the last event should be
   `{ name: "payment_succeeded", step: "CHECKOUT", intent_id: "pi_…",
variant: "A" | "B" }` (spec 043 added the `variant` field).

## Calendar — extended

10. **Calendar — single-month view.** Open the picker modal. Confirm all cells
    in the current month render. Blocked weekdays (Tue/Fri/Sat) are dimmed with
    `aria-disabled="true"` and non-interactive. Valid weekdays are selectable.
    Keyboard: arrow keys move focus within the month grid, clamping at the month
    boundary. No prev/next month navigation exists — this is by design (spec
    001).

## Locale switch

11. **`/de/wizard/cats`.** Full German copy across the funnel — no raw
    `Wizard.cats.continue` keys leak. Walk to SUMMARY in German. Calendar
    weekday + month labels are German. No missing-key fallback strings.
12. **Back to `/en`.** English restored. No hydration or routing errors in
    the console.

## Back-navigation + resume

13. **Back-button.** From `/en/wizard/profile`, browser-back to
    `/en/wizard/cats`. The CATS step shows the previous selection. Forward
    resumes at the furthest step reached (no validation bypass).

## /insights

14. **`/en/insights`.** Renders the funnel charts (not blank, not 0%). Footer
    line reads either "Live funnel data from PostHog…" (if
    `POSTHOG_PERSONAL_API_KEY` is set) or "Illustrative synthetic data…"
    (static fallback). After spec 043's seed re-run, the live numbers should
    match the seeded curve (variant A ≈ 24% completion, B ≈ 27%).

## Storyblok draft preview

15. **Enter draft mode.** `GET /api/draft?secret=<STORYBLOK_PREVIEW_SECRET>&slug=/`
    — sets the `__prerender_bypass` cookie and redirects. Draft content
    visible on the landing page.
16. **Exit draft mode.** `GET /api/draft/disable` — cookie cleared.
17. **Revalidate webhook.** `POST /api/storyblok/revalidate` with correct
    `x-webhook-secret` header and `{ "slug": "/" }` body → 200. Server logs
    show on-demand revalidation.

## Console + perf

18. **Console clean.** Walk steps 1–9 with DevTools console open. Zero
    application errors, zero 4xx / 5xx network responses.
19. **Lighthouse re-run.** `yarn workspace @sorrel/frontend build && yarn
lighthouse`. Confirm `categories:accessibility ≥ 0.95` (spec 040 gate),
    `categories:performance ≥ 0.9`. Update the median row in
    `docs/lighthouse.md` if the numbers shifted, and bump that doc's
    `Last updated` line.

---

If anything in this list fails, **do not ship**. File a bug, fix the bug,
re-run the section that failed, and re-run sections downstream of it.
