#!/usr/bin/env node
// PreToolUse (Bash): the commit contract for spec-gated execution (spec 057).
//
// Replaces the regex guard-commit.sh, which any `git -C <dir>` / `git -c k=v`
// prefix skipped. This hook tokenises the command like a shell would, unwraps
// wrappers (env, sh -c, eval, xargs, …), skips git's global options, expands
// git aliases, then enforces:
//   1. Every `git commit` message carries a `Spec: NNN` trailer.
//   2. No `--no-verify` / `-n` (also inside flag clusters), and no
//      `-c core.hooksPath=…` — the verification hooks are the definition of done.
//   3. Never stage or commit `.env*` secrets (template names are exempt).
//   4. No `git push` or `git reset` in any form (pairs with spec 056's deny rules).
// It fails closed: a command that mentions git but cannot be parsed is denied.
// Exit 2 = deny (reason on stderr); exit 0 = allow. Dependency-free Node.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import process from "node:process";

class Deny extends Error {}
const deny = (reason) => {
  throw new Deny(reason);
};

// ---------------------------------------------------------------------------
// Lexer: command string → simple commands of words, plus heredoc bodies and
// the contents of $(…) / `…` substitutions (analysed as scripts of their own).
// A word is { text, dynamic } — dynamic when it holds a substitution or a
// variable, i.e. its runtime value is unknowable here.

class ParseError extends Error {}

function lex(src) {
  const commands = [];
  const subs = [];
  let words = [];
  let heredocs = [];
  let pending = []; // heredoc delimiters awaiting their body (after the newline)
  let word = null;
  let i = 0;

  const startWord = () => (word ??= { text: "", dynamic: false });
  const endWord = () => {
    if (word) words.push(word);
    word = null;
  };
  const endCommand = () => {
    endWord();
    if (words.length || heredocs.length) commands.push({ words, heredocs });
    words = [];
    heredocs = [];
  };

  // Reads a balanced $( … ) starting after "$(", returns the inner text.
  const readParen = () => {
    let depth = 1;
    let quote = null;
    const start = i;
    for (; i < src.length; i++) {
      const c = src[i];
      if (quote) {
        if (c === quote) quote = null;
        else if (c === "\\" && quote === '"') i++;
      } else if (c === "'" || c === '"') quote = c;
      else if (c === "\\") i++;
      else if (c === "(") depth++;
      else if (c === ")" && --depth === 0) {
        const inner = src.slice(start, i);
        i++;
        return inner;
      }
    }
    throw new ParseError("unbalanced $(");
  };

  const readBacktick = () => {
    const end = src.indexOf("`", i);
    if (end === -1) throw new ParseError("unterminated backtick");
    const inner = src.slice(i, end);
    i = end + 1;
    return inner;
  };

  const readHeredocBodies = () => {
    for (const { delim, strip } of pending) {
      const lines = [];
      for (;;) {
        if (i >= src.length) throw new ParseError(`unterminated heredoc (${delim})`);
        const nl = src.indexOf("\n", i);
        const line = src.slice(i, nl === -1 ? src.length : nl);
        i = nl === -1 ? src.length : nl + 1;
        const cmp = strip ? line.replace(/^\t+/, "") : line;
        if (cmp === delim) break;
        lines.push(cmp);
      }
      commands.at(-1)?.heredocs.push(lines.join("\n"));
    }
    pending = [];
  };

  while (i < src.length) {
    const c = src[i];

    if (c === " " || c === "\t") {
      endWord();
      i++;
    } else if (c === "\n") {
      i++;
      endCommand();
      if (pending.length) readHeredocBodies();
    } else if (c === ";" || c === "&" || c === "|" || c === "(" || c === ")") {
      endCommand();
      i++;
      if ((c === "&" || c === "|") && (src[i] === c || src[i] === "&")) i++;
    } else if (c === "#" && !word) {
      while (i < src.length && src[i] !== "\n") i++;
    } else if (c === "'") {
      const end = src.indexOf("'", i + 1);
      if (end === -1) throw new ParseError("unterminated single quote");
      startWord().text += src.slice(i + 1, end);
      i = end + 1;
    } else if (c === '"') {
      startWord();
      i++;
      for (;;) {
        if (i >= src.length) throw new ParseError("unterminated double quote");
        const d = src[i];
        if (d === '"') {
          i++;
          break;
        }
        if (d === "\\" && '"\\$`\n'.includes(src[i + 1])) {
          word.text += src[i + 1];
          i += 2;
        } else if (d === "$" && src[i + 1] === "(") {
          i += 2;
          subs.push(readParen());
          word.dynamic = true;
        } else if (d === "`") {
          i++;
          subs.push(readBacktick());
          word.dynamic = true;
        } else {
          if (d === "$" && /[A-Za-z_{]/.test(src[i + 1] ?? "")) word.dynamic = true;
          word.text += d;
          i++;
        }
      }
    } else if (c === "\\") {
      if (src[i + 1] === "\n") i += 2;
      else {
        startWord().text += src[i + 1] ?? "";
        i += 2;
      }
    } else if (c === "$" && src[i + 1] === "(") {
      i += 2;
      subs.push(readParen());
      startWord().dynamic = true;
    } else if (c === "`") {
      i++;
      subs.push(readBacktick());
      startWord().dynamic = true;
    } else if (c === "<" && src.startsWith("<<<", i)) {
      // Here-string: its next word is stdin data, recorded like a heredoc body.
      endWord();
      i += 3;
      while (src[i] === " ") i++;
      const end = scanWord(src, i);
      const { commands: inner } = lex(src.slice(i, end)); // unquote the one word
      heredocs.push(inner.flatMap((cmd) => cmd.words.map((x) => x.text)).join(" "));
      i = end;
    } else if (c === "<" && src[i + 1] === "<") {
      endWord();
      i += 2;
      const strip = src[i] === "-";
      if (strip) i++;
      while (src[i] === " ") i++;
      const end = scanWord(src, i);
      const raw = src.slice(i, end);
      i = end;
      pending.push({ delim: raw.replace(/['"\\]/g, ""), strip });
    } else if (c === ">" || c === "<") {
      // Redirection: drop an fd-number word ("2>"), then skip the target word.
      if (word && /^\d+$/.test(word.text) && !word.dynamic) word = null;
      endWord();
      i++;
      if (src[i] === ">" || src[i] === "&") i++;
      while (src[i] === " ") i++;
      i = scanWord(src, i);
    } else if (c === "$") {
      startWord().text += c;
      if (/[A-Za-z_{]/.test(src[i + 1] ?? "")) word.dynamic = true;
      i++;
    } else {
      startWord().text += c;
      i++;
    }
  }
  if (pending.length) throw new ParseError("unterminated heredoc");
  endCommand();
  return { commands, subs };
}

// End index of one shell word starting at `start` (quote-aware, no expansion).
function scanWord(src, start) {
  let i = start;
  while (i < src.length && !" \t\n;&|<>()".includes(src[i])) {
    if (src[i] === "'" || src[i] === '"') {
      const end = src.indexOf(src[i], i + 1);
      if (end === -1) throw new ParseError("unterminated quote");
      i = end + 1;
    } else if (src[i] === "\\") i += 2;
    else i++;
  }
  return i;
}

// ---------------------------------------------------------------------------
// Analysis

const SHELLS = new Set(["sh", "bash", "zsh", "dash", "ksh"]);
const PLAIN_WRAPPERS = new Set([
  "command",
  "builtin",
  "exec",
  "nohup",
  "time",
  "noglob",
  "nocorrect",
]);
const ENV_FILE = /(^|\/)\.env([.\w-]*)$/;
const ENV_TEMPLATE = /(^|\/)\.env\.(example|sample|template)$/;
const SPEC_TRAILER = /^Spec:[ \t]*\d{3}[ \t]*$/m;
const isEnvPath = (p) => ENV_FILE.test(p) && !ENV_TEMPLATE.test(p);

function analyseScript(src, ctx, depth = 0) {
  if (depth > 8) deny("BLOCKED: command nesting too deep to inspect.");
  const { commands, subs } = lex(src);
  for (const cmd of commands) analyseCommand(cmd.words, cmd.heredocs, ctx, depth);
  for (const sub of subs) analyseScript(sub, ctx, depth + 1);
}

function analyseCommand(words, heredocs, ctx, depth) {
  let w = [...words];
  const text = () => w[0]?.text ?? "";

  // Strip assignments and wrappers until the real program is in front.
  for (;;) {
    while (w.length && !w[0].dynamic && /^[A-Za-z_][A-Za-z0-9_]*=/.test(text())) w.shift();
    if (!w.length) return;
    const prog = basename(text());
    if (prog === "env") {
      w.shift();
      while (w.length && (text().startsWith("-") || text().includes("="))) {
        const opt = w.shift().text;
        if (opt === "-u" || opt === "-C" || opt === "-S") w.shift();
      }
    } else if (PLAIN_WRAPPERS.has(prog)) {
      w.shift();
      if (prog === "command" && (text() === "-v" || text() === "-V")) return;
      while (w.length && text().startsWith("-")) w.shift();
    } else if (prog === "sudo" || prog === "nice" || prog === "stdbuf" || prog === "ionice") {
      w.shift();
      while (w.length && text().startsWith("-")) {
        const opt = w.shift().text;
        if (/^-[ugnpCDrtUc]$/.test(opt)) w.shift();
      }
    } else if (prog === "timeout") {
      w.shift();
      while (w.length && text().startsWith("-")) {
        const opt = w.shift().text;
        if (opt === "-s" || opt === "-k") w.shift();
      }
      w.shift(); // duration
    } else if (prog === "xargs") {
      w.shift();
      while (w.length && text().startsWith("-")) {
        const opt = w.shift().text;
        if (/^-[IiLlnPsdEa]$/.test(opt)) w.shift();
      }
    } else break;
  }

  const prog = basename(text());

  if (prog === "eval") {
    analyseScript(
      w
        .slice(1)
        .map((x) => x.text)
        .join(" "),
      ctx,
      depth + 1,
    );
    return;
  }

  if (SHELLS.has(prog)) {
    const cIdx = w.findIndex((x, n) => n > 0 && /^-[a-z]*c[a-z]*$/.test(x.text));
    if (cIdx !== -1 && w[cIdx + 1]) {
      analyseScript(w[cIdx + 1].text, ctx, depth + 1);
    } else if (w.length === 1 || w.slice(1).every((x) => x.text.startsWith("-"))) {
      // The shell reads its script from stdin: inspect heredoc bodies, and
      // refuse a pipe into it when the command line mentions git.
      for (const body of heredocs) analyseScript(body, ctx, depth + 1);
      if (!heredocs.length && /\bgit\b/.test(ctx.raw)) {
        deny(
          "BLOCKED: piping a script into a shell hides git commands from the guard. Run git directly.",
        );
      }
    }
    return;
  }

  if (prog === "git" && !w[0].dynamic) analyseGit(w.slice(1), heredocs, ctx, depth);
}

const GIT_FLAG_ONLY = new Set([
  "-p",
  "--paginate",
  "-P",
  "--no-pager",
  "--bare",
  "--no-replace-objects",
  "--literal-pathspecs",
  "--glob-pathspecs",
  "--noglob-pathspecs",
  "--icase-pathspecs",
  "--no-optional-locks",
  "--no-advice",
  "--no-lazy-fetch",
]);
const GIT_WITH_VALUE = new Set([
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--exec-path",
  "--super-prefix",
  "--config-env",
  "--attr-source",
  "--list-cmds",
]);
const GIT_BUILTINS = new Set(["commit", "add", "push", "reset", "status", "diff", "log", "show"]);

function checkConfigKey(kv) {
  if (/^core\.hookspath\b/i.test(kv)) {
    deny("BLOCKED: overriding core.hooksPath disables the repo's verification hooks.");
  }
}

function analyseGit(args, heredocs, ctx, depth) {
  ctx.invokesGit = true;
  let a = [...args];
  let dir = ctx.cwd;

  // Global options before the subcommand.
  while (a.length && a[0].text.startsWith("-")) {
    const opt = a.shift();
    const t = opt.text;
    if (t === "-C") dir = resolve(dir, a.shift()?.text ?? ".");
    else if (t === "-c") checkConfigKey(a.shift()?.text ?? "");
    else if (t.startsWith("--config-env")) {
      checkConfigKey(t.includes("=") ? t.slice(t.indexOf("=") + 1) : (a.shift()?.text ?? ""));
    } else if (GIT_WITH_VALUE.has(t)) a.shift();
    else if (GIT_FLAG_ONLY.has(t) || t.includes("=")) continue;
    else if (t === "--version" || t === "--help" || t === "-v" || t === "-h") return;
  }
  if (!a.length) return;

  const subWord = a.shift();
  if (subWord.dynamic)
    deny("BLOCKED: the git subcommand is computed at runtime and cannot be inspected.");
  const sub = subWord.text;

  if (!GIT_BUILTINS.has(sub)) {
    const alias = gitAlias(dir, sub);
    if (alias !== null) {
      if (depth > 8) deny("BLOCKED: git alias nesting too deep to inspect.");
      if (alias.startsWith("!")) {
        analyseScript(alias.slice(1), ctx, depth + 1);
        return;
      }
      const { commands } = lex(alias);
      const expanded = commands[0]?.words ?? [];
      analyseGit([...expanded, ...a], heredocs, { ...ctx, cwd: dir }, depth + 1);
      return;
    }
  }

  if (sub === "push") {
    deny("BLOCKED: git push is not allowed from Claude (spec 056). The human pushes after review.");
  }
  if (sub === "reset") {
    deny(
      "BLOCKED: git reset is not allowed from Claude (spec 056). Ask the human, or use git restore --staged.",
    );
  }
  if (sub === "add") analyseAdd(a);
  if (sub === "commit") analyseCommit(a, heredocs, dir);
}

function gitAlias(dir, name) {
  try {
    return execFileSync("git", ["-C", dir, "config", "--get", `alias.${name}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function denyEnvPaths(paths) {
  if (paths.some(isEnvPath)) {
    deny(
      "BLOCKED: refusing to stage/commit .env* files. Use environment variables or a secrets manager.",
    );
  }
}

function analyseAdd(args) {
  const texts = args.map((x) => x.text);
  denyEnvPaths(texts);
  const force = texts.some(
    (t) => t === "-f" || t === "--force" || /^-[a-zA-Z]*f[a-zA-Z]*$/.test(t),
  );
  const broad = texts.some((t) => [".", "*", ":/", "-A", "--all"].includes(t) || t.endsWith("/"));
  if (force && broad) {
    deny(
      "BLOCKED: `git add --force` over a directory can stage ignored secrets (.env, *.pem). Name the files.",
    );
  }
}

const COMMIT_SHORT_WITH_VALUE = new Set(["m", "F", "C", "c", "t", "S"]);
const COMMIT_LONG_WITH_VALUE = new Set([
  "--message",
  "--file",
  "--reuse-message",
  "--reedit-message",
  "--template",
  "--author",
  "--date",
  "--cleanup",
  "--trailer",
  "--fixup",
  "--squash",
  "--pathspec-from-file",
]);

// git accepts any unambiguous prefix of a long option (`--no-ver`, `--mess=x`).
// Any prefix of --no-verify past "--no-" is refused outright; otherwise a
// unique prefix resolves to the option it abbreviates.
const COMMIT_LONG = ["--no-verify", "--amend", "--no-edit", ...COMMIT_LONG_WITH_VALUE];
function resolveCommitLong(name) {
  if (name.length > "--no-".length && "--no-verify".startsWith(name)) return "--no-verify";
  if (COMMIT_LONG.includes(name)) return name;
  const matches = COMMIT_LONG.filter((o) => o.startsWith(name));
  return matches.length === 1 ? matches[0] : name;
}

function analyseCommit(args, heredocs, dir) {
  const messages = []; // { text, dynamic }
  const files = [];
  const paths = [];
  let reuse = false;
  let amend = false;
  let noEdit = false;

  for (let n = 0; n < args.length; n++) {
    const word = args[n];
    const t = word.text;
    if (t === "--") {
      paths.push(...args.slice(n + 1).map((x) => x.text));
      break;
    }
    if (t.startsWith("--")) {
      const eq = t.indexOf("=");
      const name = resolveCommitLong(eq === -1 ? t : t.slice(0, eq));
      const value = () =>
        eq === -1 ? args[++n] : { text: t.slice(eq + 1), dynamic: word.dynamic };
      if (name === "--no-verify") deny(NO_VERIFY);
      else if (name === "--amend") amend = true;
      else if (name === "--no-edit") noEdit = true;
      else if (!COMMIT_LONG_WITH_VALUE.has(name)) continue;
      else {
        const v = value() ?? { text: "", dynamic: false };
        if (name === "--message") messages.push(v);
        else if (name === "--file") files.push(v);
        else if (name === "--reuse-message" || name === "--reedit-message") reuse = true;
        else if (name === "--trailer") {
          messages.push({ text: v.text.replace(/^([\w-]+)\s*=\s*/, "$1: "), dynamic: v.dynamic });
        }
      }
    } else if (t.startsWith("-") && t.length > 1) {
      // Short-flag cluster: a value-taking flag consumes the rest of the cluster.
      for (let k = 1; k < t.length; k++) {
        const f = t[k];
        if (f === "n") deny(NO_VERIFY);
        if (COMMIT_SHORT_WITH_VALUE.has(f)) {
          const rest = t.slice(k + 1);
          const v = rest
            ? { text: rest, dynamic: word.dynamic }
            : (args[++n] ?? { text: "", dynamic: false });
          if (f === "m") messages.push(v);
          else if (f === "F") files.push(v);
          else if (f === "C" || f === "c") reuse = true;
          break;
        }
      }
    } else paths.push(t);
  }

  denyEnvPaths(paths);

  if (reuse || (amend && noEdit)) return; // reuses an existing, already-trailered message

  const known = messages.filter((m) => !m.dynamic).map((m) => m.text);
  let unknown = messages.some((m) => m.dynamic);
  for (const f of files) {
    if (f.dynamic) unknown = true;
    else if (f.text === "-") {
      if (heredocs.length) known.push(...heredocs);
      else unknown = true;
    } else {
      try {
        known.push(readFileSync(resolve(dir, f.text), "utf8"));
      } catch {
        unknown = true;
      }
    }
  }

  if (SPEC_TRAILER.test(known.join("\n\n"))) return;
  if (!messages.length && !files.length) {
    deny(
      "BLOCKED: git commit without -m/-F opens an editor; the guard cannot see the message. Pass it with -m or -F.",
    );
  }
  deny(
    `BLOCKED: commit is missing a 'Spec: NNN' trailer${unknown ? " (part of the message is computed at runtime, so it cannot be checked)" : ""}.
Every commit must reference the approved spec it implements, e.g.:

  git commit -m "feat(wizard): add cat-quantity step" -m "Spec: 003"

If no approved spec covers this work, write one first:
  specs/NNN-name.md  with  approved: yes  in the front-matter (use /spec-new).`,
  );
}

const NO_VERIFY =
  "BLOCKED: 'git commit --no-verify' / '-n' is not allowed. The verification hooks ARE the definition of done.";

// ---------------------------------------------------------------------------
// Entry point

function main(raw) {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return 0; // not a hook payload — nothing to guard
  }
  const command = input?.tool_input?.command;
  if (typeof command !== "string" || !/git/.test(command)) return 0;

  const ctx = { raw: command, cwd: input.cwd || process.cwd() };
  try {
    analyseScript(command, ctx);
    // Conservative by design (spec 057, case 7): any mention of --no-verify
    // next to a git invocation is refused, even inside a commit message.
    if (ctx.invokesGit && /--no-verify/.test(command)) deny(NO_VERIFY);
  } catch (err) {
    if (err instanceof Deny) {
      process.stderr.write(err.message + "\n");
      return 2;
    }
    if (err instanceof ParseError) {
      process.stderr.write(
        `BLOCKED: could not parse this command (${err.message}); the git guard fails closed.\n`,
      );
      return 2;
    }
    throw err;
  }
  return 0;
}

const chunks = [];
process.stdin.on("data", (c) => chunks.push(c));
process.stdin.on("end", () => {
  process.exitCode = main(chunks.join(""));
});
