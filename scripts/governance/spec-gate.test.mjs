// Fixture tests for the CI spec gate (spec 059).
//
// Each case builds a throwaway git repo: a `base` (what main holds) and a PR
// range on top of it, then runs scripts/governance/spec-gate.sh <base> <head>
// and asserts the exit code and the reason. Dependency-free:
// `node --test 'scripts/governance/*.test.mjs'`.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const gate = join(dirname(fileURLToPath(import.meta.url)), "spec-gate.sh");
const dirs = [];
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

/** A spec file whose front-matter says approved: <approved>, plus an optional body. */
const spec = (n, approved, body = "") =>
  `---\nspec: ${n}\ntitle: fixture\napproved: ${approved} # only a human flips this\n---\n\n# Problem\n${body}\n`;

/** Fresh repo with one base commit; returns helpers bound to it. */
function fixture(baseFiles) {
  const cwd = mkdtempSync(join(tmpdir(), "spec-gate-"));
  dirs.push(cwd);
  const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  git("init", "-q", "-b", "main");
  git("config", "user.email", "fixture@example.com");
  git("config", "user.name", "Fixture");
  git("config", "commit.gpgsign", "false");
  const commit = (files, message) => {
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(join(cwd, dirname(path)), { recursive: true });
      writeFileSync(join(cwd, path), content);
    }
    git("add", "-A");
    execFileSync("git", ["commit", "-q", "-F", "-"], { cwd, input: message });
    return git("rev-parse", "HEAD");
  };
  const base = commit({ "README.md": "fixture\n", ...baseFiles }, "chore: base\n\nSpec: 001\n");
  const run = () => {
    const r = spawnSync("bash", [gate, base, git("rev-parse", "HEAD")], { cwd, encoding: "utf8" });
    return { code: r.status, out: r.stdout + r.stderr };
  };
  return { commit, run };
}

describe("spec gate rejects", () => {
  test("a commit without a Spec trailer → exit 1, missing", () => {
    const f = fixture({ "specs/056-x.md": spec("056", "yes") });
    f.commit({ "src/a.ts": "a\n" }, "feat: no trailer\n");
    const r = f.run();
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /missing a 'Spec: NNN' trailer/);
  });

  test("Spec: NNN mentioned mid-body but not as a trailer → exit 1, missing", () => {
    const f = fixture({ "specs/056-x.md": spec("056", "yes") });
    f.commit({ "src/a.ts": "a\n" }, "feat: x\n\nImplements Spec: 056 as discussed in review.\n");
    const r = f.run();
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /missing a 'Spec: NNN' trailer/);
  });

  test("an unknown spec number → exit 1, unknown", () => {
    const f = fixture({ "specs/056-x.md": spec("056", "yes") });
    f.commit({ "src/a.ts": "a\n" }, "feat: x\n\nSpec: 999\n");
    const r = f.run();
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /Spec: 999.*(unknown|does not exist)/);
  });

  test("a spec that is approved: no at base → exit 1, not approved", () => {
    const f = fixture({ "specs/056-x.md": spec("056", "no") });
    f.commit({ "src/a.ts": "a\n" }, "feat: x\n\nSpec: 056\n");
    const r = f.run();
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /not .*approved/);
  });

  test("self-approval: the PR flips approved: yes, then cites it → exit 1, not approved at base", () => {
    const f = fixture({ "specs/056-x.md": spec("056", "no") });
    f.commit({ "specs/056-x.md": spec("056", "yes") }, "docs(specs): approve 056\n\nSpec: 056\n");
    f.commit({ "src/a.ts": "a\n" }, "feat: x\n\nSpec: 056\n");
    const r = f.run();
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /not approved at base/);
  });

  test("self-approval in one commit: spec flip + code together → exit 1", () => {
    const f = fixture({ "specs/056-x.md": spec("056", "no") });
    f.commit({ "specs/056-x.md": spec("056", "yes"), "src/a.ts": "a\n" }, "feat: x\n\nSpec: 056\n");
    const r = f.run();
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /not approved at base/);
  });

  test("approved: yes only in the body, front-matter says no → exit 1", () => {
    const body = "Example front-matter:\n\napproved: yes\n";
    const f = fixture({ "specs/056-x.md": spec("056", "no", body) });
    f.commit({ "src/a.ts": "a\n" }, "feat: x\n\nSpec: 056\n");
    const r = f.run();
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /not .*approved/);
  });

  test("one of several trailers unapproved → exit 1", () => {
    const f = fixture({
      "specs/056-x.md": spec("056", "yes"),
      "specs/057-y.md": spec("057", "no"),
    });
    f.commit({ "src/a.ts": "a\n" }, "feat: x\n\nSpec: 056\nSpec: 057\n");
    const r = f.run();
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /Spec: 057/);
  });

  test("two commits, one bad → exit 1, names only the bad one", () => {
    const f = fixture({ "specs/056-x.md": spec("056", "yes") });
    f.commit({ "src/a.ts": "a\n" }, "feat: good thing\n\nSpec: 056\n");
    f.commit({ "src/b.ts": "b\n" }, "feat: bad thing\n");
    const r = f.run();
    assert.equal(r.code, 1, r.out);
    const errors = r.out.split("\n").filter((l) => l.startsWith("::error::"));
    assert.equal(errors.length, 1, r.out);
    assert.match(errors[0], /bad thing/);
  });

  test("a spec-only commit citing a spec that does not exist → exit 1", () => {
    const f = fixture({});
    f.commit({ "specs/061-z.md": spec("061", "no") }, "docs(specs): draft 061\n\nSpec: 062\n");
    const r = f.run();
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /Spec: 062/);
  });
});

describe("spec gate accepts", () => {
  test("a spec-only draft commit (approved: no) → exit 0", () => {
    const f = fixture({});
    f.commit({ "specs/061-z.md": spec("061", "no") }, "docs(specs): draft 061\n\nSpec: 061\n");
    const r = f.run();
    assert.equal(r.code, 0, r.out);
  });

  test("code citing a spec approved at base → exit 0", () => {
    const f = fixture({ "specs/056-x.md": spec("056", "yes") });
    f.commit({ "src/a.ts": "a\n" }, "feat: x\n\nSpec: 056\n");
    const r = f.run();
    assert.equal(r.code, 0, r.out);
  });

  test("several trailers, all approved at base → exit 0", () => {
    const f = fixture({
      "specs/056-x.md": spec("056", "yes"),
      "specs/057-y.md": spec("057", "yes"),
    });
    f.commit({ "src/a.ts": "a\n" }, "feat: x\n\nSpec: 056\nSpec: 057\n");
    const r = f.run();
    assert.equal(r.code, 0, r.out);
  });
});
