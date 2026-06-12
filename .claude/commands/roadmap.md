---
description: Report where the build stands against the tiered roadmap — done, in-flight, gaps, next.
---

Audit progress against the roadmap and report honestly. **Read-only — change no code.**

1. **Specs** — list `specs/NNN-*.md` with their `tier`, `approved`, and `status`. Flag
   approved-but-unimplemented and proposed-awaiting-approval.
2. **Implemented vs. claimed** — for each workspace (`apps/web`, `services/api`,
   `packages/{ui,domain,analytics}`) check what actually exists (package.json, source,
   tests) versus what `README.md` / the architecture section claims. Use
   `git log --grep='Spec:' --oneline` to see what shipped under which spec.
3. **Roadmap position** — map findings to the README tiers (1 credible core, 2 coverage,
   3 closers). Mark each item: done / in-progress / not-started.
4. **Gaps & risks** — anything claimed in docs but not built; anything built without a
   spec; and the never-cut items (deployment, mobile Lighthouse, instrumentation, README)
   and whether they're on track.
5. **Next** — the single highest-value next action, following the doc's build order
   (delivery date picker → wizard shell → Apollo write path → Storyblok/i18n).

Output:

```
## Roadmap status — [timestamp]

### Specs         [NNN — title — tier — approved? — implemented?]
### Tier 1         [item → done / in-progress / not-started]
### Tier 2         [...]
### Tier 3         [...]
### Gaps & risks   [doc-vs-reality mismatches, unspecced code, at-risk never-cut items]
### Next           [one action]
```

Be honest — if a tier is barely started, say so. No vanity progress.
