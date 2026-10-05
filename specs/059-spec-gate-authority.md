---
spec: 059
title: Make the CI spec gate the authority — base-branch approval, unskippable, proven by fixtures
status: proposed
approved: no # ONLY a human flips this to yes — implementation is gated on it
tier: 1 # governance core — "wrong is un-mergeable" must hold where it merges
owner: .github/workflows/spec-gate.yml · scripts/governance
---

# Problem / gap

`spec-gate.yml` (spec 015) checks every non-merge commit in `BASE..HEAD`. A read of the
workflow found five ways around it:

1. **Self-approval.** Approval is read from the PR's own checkout. A PR that adds
   `specs/0NN-x.md` with `approved: yes` and code citing `Spec: 0NN` passes.
2. **Editable gate.** On `pull_request`, GitHub runs the PR's copy of the workflow, so a
   PR can weaken the gate and pass it.
3. **Skippable.** `main` has no branch protection (`gh api …/branches/main/protection` →
   404). The check is not required, and direct pushes to `main` never run it.
4. **Loose parsing.** `Spec:` anywhere in the body counts, not only as a trailer.
   `^approved: yes` anywhere in the file counts, not only in the front-matter.
5. **No tests.** None of the rejections has ever been demonstrated.

# Scope

## A — Logic moves to a testable script

`scripts/governance/spec-gate.sh <base> <head>` uses bash, git, grep and awk only. It exits
1 with a `::error::` line per failure. Rules for each non-merge commit in `base..head`:

- **Missing:** the commit has no `Spec: NNN` **trailer**. Trailers are parsed with
  `git interpret-trailers --parse`, so a body mention does not count. Every trailer present
  is checked.
- **Unknown:** no `specs/NNN-*.md` exists at `head`, or more than one exists.
- **Unapproved:** the spec's front-matter (between the first two `---` lines) does not say
  `approved: yes` **at `base`**, read with `git show base:path`. Approval written inside the
  PR does not count.
- **Spec-only exemption:** a commit that touches only `specs/**` (a draft or an approval
  flip) only needs its spec to exist at `head`. The human merges that spec PR, and that
  merge is the approval act. Implementation then goes in a later PR whose base already has
  the approved spec.

## B — Workflow cannot be edited or skipped by the PR

- Trigger `pull_request_target` (types: opened, synchronize, reopened). GitHub then runs
  **main's** copy of the workflow and script. The job checks out the base, fetches the head
  SHA, and runs `scripts/governance/spec-gate.sh "$BASE" "$HEAD"` from the base checkout.
  It never executes PR code: it only reads git objects. `permissions: contents: read`.
- Add a `push: branches: [main]` trigger that runs the same script on
  `before..after`. This is a detective control if protection is ever bypassed.
- Branch protection, **applied by the human** (decision recorded 2026-10-05):

  ```bash
  gh api -X PUT repos/akin-oz/sorrel/branches/main/protection --input - <<'EOF'
  {"required_status_checks":{"strict":true,"contexts":["Commits reference an approved spec","Verify","Governance tests"]},
   "enforce_admins":true,"required_pull_request_reviews":null,"restrictions":null,
   "allow_force_pushes":false,"allow_deletions":false}
  EOF
  ```

  With required checks, `[skip ci]` leaves the check pending, and the merge stays blocked.

## C — Fixture tests proving every rejection

`scripts/governance/spec-gate.test.mjs` uses `node:test` and has no dependencies. It builds
throwaway git repos in `os.tmpdir()` and runs the script for each fixture:

| Fixture                                                       | Expected                       |
| ------------------------------------------------------------- | ------------------------------ |
| commit without trailer                                        | exit 1, "missing"              |
| `Spec: 056` only mid-body, not a trailer                      | exit 1, "missing"              |
| `Spec: 999` (no file)                                         | exit 1, "unknown"              |
| spec exists, `approved: no` at base                           | exit 1, "not approved"         |
| spec flipped to `approved: yes` inside the PR (self-approval) | exit 1, "not approved at base" |
| `approved: yes` only in body text, front-matter says `no`     | exit 1                         |
| two commits, one bad                                          | exit 1, names only the bad one |
| spec-only draft commit                                        | exit 0                         |
| spec approved at base, code commit cites it                   | exit 0                         |

It runs in the `governance` CI job from spec 057.

# Contract impact

None.

# Out of scope

- CODEOWNERS and required reviews. In a solo repo the owner cannot review their own PR,
  and Claude commits under the same git identity, so neither tells the two apart.
- Signed-commit verification of approval flips.

# Acceptance criteria

- [ ] Every fixture row shows the expected exit code in `node --test` output.
- [ ] A throwaway PR that self-approves a spec fails the gate in GitHub (link pasted).
- [ ] After the human applies protection, `gh api …/protection` returns the three required
      contexts and `enforce_admins.enabled: true`.
- [ ] `yarn lint` and `yarn type-check` green.

# Residual risk

- `--no-merges` skips merge commits. An "evil merge" that adds code during conflict
  resolution carries no trailer check.
- Until the human applies protection, the gate is advisory.
- A spec-only PR can still carry a self-written `approved: yes`. The human merging it is
  the control. This is stated in `specs/README.md`.

# Analytics

None.
