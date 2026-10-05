---
spec: 061
title: DO NOT MERGE — spec-gate self-approval probe
status: probe
approved: yes # set inside the PR on purpose; the gate must reject code citing it
tier: 1
owner: scripts/governance
---

# Problem / gap

Spec 059 acceptance: a PR that approves its own spec must fail the gate. This file
is that PR's self-approval. Close the PR unmerged and delete the branch.
