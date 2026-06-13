# Lighthouse evidence

Backs the performance/SEO/accessibility posture with measured numbers rather than
a claim. The budget runs in CI on every PR (`.github/workflows/lighthouse.yml` →
`lighthouserc.json`) against the landing page and a wizard step. Accessibility and
best-practices are hard error budgets; performance and SEO `warn` toward the 0.95
target.

## Reproduce

```bash
yarn workspace @sorrel/frontend build
yarn lighthouse            # lhci autorun: builds-server + 3 runs/URL, asserts the budget
```

Reports land in `.lighthouseci/` (git-ignored) as HTML + JSON.

## Measured (median of 3 runs, mobile emulation, Chromium 140)

| Page           | Performance | Accessibility | Best-practices | SEO |
| -------------- | ----------- | ------------- | -------------- | --- |
| `/` (landing)  | 93          | 95            | 100            | 92  |
| `/wizard/cats` | 90          | 95            | 100            | 92  |

Landing key metrics: FCP ~1.2s · LCP ~2.x–4s · TBT ~50ms · CLS 0 · Speed Index ~1.2s.

## Honest notes

- **Performance (90–93, target 95).** The LCP element is the serif `<h1>` headline;
  with `display: swap` (+ preload) the LCP is the web-font swap repaint. RSC-static
  landing, preloaded fonts, and `revalidate`d CMS keep TBT/CLS excellent. Closing
  the last few points to a hard 95 means trimming the MUI/emotion client islands on
  the landing — a deliberate follow-up, not a font tweak — so the budget `warn`s
  rather than blocks today.
- **SEO (92) is understated on localhost.** The only failing audit is
  `rel=canonical`: with `metadataBase` set to the production origin, the canonical
  link is absolute and cross-origin to `localhost`, which Lighthouse flags. On the
  deployed origin it is same-origin and valid, so production SEO is ~100.
- **Accessibility (95)** — one `color-contrast` flag on a muted overline; a token
  tweak away, tracked separately.
