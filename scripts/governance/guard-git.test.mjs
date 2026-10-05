// Adversarial tests for the PreToolUse Bash guard (spec 057).
//
// Reads the hook commands actually wired under PreToolUse → "Bash" in
// .claude/settings.json and feeds each case to them as hook JSON on stdin, so
// this always tests what Claude Code really runs. A case is denied when any
// wired hook exits 2. Dependency-free: `node --test scripts/governance/`.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const settings = JSON.parse(readFileSync(join(repoRoot, ".claude", "settings.json"), "utf8"));
const bashHooks = settings.hooks.PreToolUse.filter((entry) => entry.matcher === "Bash").flatMap(
  (entry) => entry.hooks.map((hook) => hook.command),
);

// A throwaway repo that stands in for Claude's cwd: it carries a `ci` alias
// and two commit-message files, so alias expansion and `-F <file>` are tested.
let cwd;
before(() => {
  cwd = mkdtempSync(join(tmpdir(), "guard-git-"));
  execFileSync("git", ["init", "-q"], { cwd });
  execFileSync("git", ["config", "alias.ci", "commit"], { cwd });
  execFileSync("git", ["config", "alias.shipit", "!git push --force"], { cwd });
  writeFileSync(join(cwd, "msg-ok.txt"), "feat: x\n\nSpec: 057\n");
  writeFileSync(join(cwd, "msg-missing.txt"), "feat: x\n");
});
after(() => rmSync(cwd, { recursive: true, force: true }));

/** Runs every wired Bash hook; returns 2 if any hook denies, else 0. */
function guard(command) {
  const input = JSON.stringify({
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    tool_input: { command },
    cwd,
  });
  for (const hook of bashHooks) {
    const result = spawnSync("bash", ["-c", hook], {
      cwd,
      input,
      env: { ...process.env, CLAUDE_PROJECT_DIR: repoRoot },
      encoding: "utf8",
    });
    if (result.status === 2) return 2;
    if (result.status !== 0) {
      throw new Error(`hook crashed (exit ${result.status}): ${hook}\n${result.stderr}`);
    }
  }
  return 0;
}

const DENY = [
  // The spec 057 table.
  "git -C . commit -m x",
  "git -c a=b commit -m x",
  "/usr/bin/git commit -m x",
  "git add .env",
  'git commit -n -m "x" -m "Spec: 057"',
  'git commit --no-verify -m "x" -m "Spec: 057"',
  'git commit -m "docs: explain --no-verify" -m "Spec: 057"',
  'git commit -m "feat: x"',
  // Wrappers, flag clusters and spoofed trailers.
  'git commit -nm "x" -m "Spec: 057"',
  "sh -c 'git commit -m x'",
  'bash -c "git -C . commit -m x"',
  "env git commit -m x",
  "GIT_AUTHOR_NAME=x git commit -m x",
  "cd /tmp && git commit -m x",
  'echo "Spec: 057"; git commit -m x',
  'git commit -m "$(echo x)"',
  'git -c core.hooksPath=/dev/null commit -m "x" -m "Spec: 057"',
  "git commit -F msg-missing.txt",
  "git ci -m x",
  "git add -f apps/web/.env",
  'git commit -m "x',
  // Push / reset in any form (pairs with spec 056).
  "git push",
  "git -C . push origin main",
  "git push --force origin main",
  "git push origin +main",
  "git shipit",
  "git -C . reset --hard",
  "git reset --soft HEAD~1",
];

const ALLOW = [
  "git status",
  "git diff --stat",
  'git commit -m "feat: x" -m "Spec: 057"',
  'git -C . commit -m "feat: x" -m "Spec: 057"',
  'git commit -am "feat: x" -m "Spec: 057"',
  "git commit -q -F - <<'EOF'\nfeat: x\n\nSpec: 057\nEOF",
  "git commit -q -F - <<'EOF'\nfeat: x\n\nSpec: 057\nEOF\ngit log --oneline -1 && sed -n 1,5p README.md",
  "git commit -F msg-ok.txt",
  'git ci -m "feat: x" -m "Spec: 057"',
  "git commit --amend --no-edit",
  "git add .env.example",
  "echo git commit",
  "ls -la .env.example",
];

/** One-line test title, so heredoc cases stay readable in the report. */
const title = (code, command) => `exit ${code} ← ${command.replaceAll("\n", " ⏎ ")}`;

describe("guard denies every bypass attempt (exit 2)", () => {
  for (const command of DENY) {
    test(title(2, command), () => {
      assert.equal(guard(command), 2, `allowed, expected deny: ${command}`);
    });
  }
});

describe("guard allows legitimate commands (exit 0)", () => {
  for (const command of ALLOW) {
    test(title(0, command), () => {
      assert.equal(guard(command), 0, `denied, expected allow: ${command}`);
    });
  }
});
