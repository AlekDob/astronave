#!/usr/bin/env node
// Fills apps/{web,desktop} it.json from en.json with the local Claude Code CLI (no GT API key).
// Default: translate only keys missing from it.json. `--all`: retranslate everything.
// Options: --app web|desktop (repeatable, default both), --limit-batches N (pilot runs).
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const APPS = { web: "apps/web", desktop: "apps/desktop" };
const BATCH_SIZE = 150;
const CONCURRENCY = 4;
const MODEL = process.env.ASTRONAVE_TRANSLATE_MODEL ?? "claude-sonnet-5-5";

// Style guide for Astronave: Italian-first product for beginners.
const SYSTEM_PROMPT = `You translate UI strings of a desktop code editor from English to Italian.
Input: a JSON object {key: value}. Output: ONLY the same JSON object with every value translated. No prose, no code fences.
Rules:
- Same keys, same order. Never change keys.
- A value is either a string or an array (rich text). In arrays translate only the plain string items; keep every object item byte-identical (you may move object items to fit Italian word order). Inside objects, translate only string values under "c" (child text) and under "b" (branch labels); keep all other fields as is.
- Keep placeholders exactly: {name}, {count}, and ICU syntax like {n, plural, one {...} other {...}} or {x, select, ...}: keep variable names, the words plural/select/selectordinal, the case keys (one, other, =0, yes...) and #; translate only the human text inside the cases.
- Never translate URLs, file paths, code, commands, CLI flags, env vars, keyboard shortcuts (Cmd+K, Ctrl, Shift, Enter...), model or package names.
- Keep leading/trailing spaces and punctuation the way the source has them.
Style: simple, friendly Italian for beginners. Use the "tu" form. Short UI labels (imperative for buttons: "Salva", "Apri"). Avoid jargon when a common Italian word works.
Keep these well-known dev terms in English: commit, branch, push, pull, pull request, merge, worktree, diff, token, prompt, provider, repository, thread, chat, log, plugin, debug. "terminal" becomes "terminale".
Product name: the app is "Astronave". Replace every "T3 Code" with "Astronave", and "T3" when it means this app. Keep "T3 Connect" and "T3 Chat" unchanged: they are separate services. Do not change URLs or package names (e.g. t3code, @t3tools, t3@1.2).`;

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const parseArgs = (argv) => ({
  all: argv.includes("--all"),
  check: argv.includes("--check"),
  apps: argv.flatMap((a, i) => (argv[i - 1] === "--app" ? [a] : [])),
  limitBatches: Number(argv[argv.indexOf("--limit-batches") + 1]) || Infinity,
});

// Text lives in plain strings, array string items, strings under "c" (children) and branch labels in "b".
const isText = (key, parentKey) => key === "c" || parentKey === "b";
const textLeaves = (v, inText = true, key) => {
  if (typeof v === "string") return inText ? [v] : [];
  if (Array.isArray(v)) return v.flatMap((x) => textLeaves(x));
  if (v && typeof v === "object")
    return Object.entries(v).flatMap(([k, x]) => textLeaves(x, isText(k, key), k));
  return [];
};

// Structure with text removed; array object items are sorted since Italian may reorder them.
const skeleton = (v, inText = true, key) => {
  if (typeof v === "string") return inText ? null : v;
  if (Array.isArray(v))
    return v.filter((x) => typeof x !== "string").map((x) => JSON.stringify(skeleton(x))).sort();
  if (v && typeof v === "object")
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, skeleton(x, isText(k, key), k)]));
  return v;
};

// Minimal ICU walk: returns "name" / "name,type,caseKeys" for each argument. Case bodies ({minute})
// are text, not arguments, so a plain regex would flag translated plural words as broken placeholders.
// shortcut: ignores ICU apostrophe escaping; no catalog entry uses it today.
const icuArgs = (text) => {
  const args = [];
  let i = 0;
  const readUntil = (stops) => {
    const start = i;
    while (i < text.length && !stops.includes(text[i])) i++;
    return text.slice(start, i).trim();
  };
  const parseText = () => {
    while (i < text.length && text[i] !== "}") (text[i++] === "{" ? parseArg() : null);
  };
  const parseArg = () => {
    const name = readUntil(",}");
    if (text[i++] === "}") return args.push(name);
    const type = readUntil(",}");
    if (text[i++] === "}") return args.push(`${name},${type}`);
    const keys = [];
    while (i < text.length && text[i] !== "}") {
      keys.push(readUntil("{}"));
      if (text[i] === "{") (i++, parseText(), i++);
    }
    i++;
    args.push(`${name},${type},${keys.filter(Boolean).sort()}`);
  };
  parseText();
  return args.sort();
};

// ICU arguments, brace count and other T3 service names must survive translation.
const placeholderSignature = (v) => {
  const texts = textLeaves(v);
  const all = texts.join("\u0000");
  // Other T3 services keep their name; only "T3 Code" becomes "Astronave".
  const services = all.match(/T3 (Connect|Chat)/g)?.length ?? 0;
  return JSON.stringify([texts.flatMap(icuArgs).sort(), services, all.split("{").length, all.split("}").length]);
};

const entryProblem = (source, target) => {
  if (Array.isArray(source) !== Array.isArray(target) || typeof source !== typeof target) return "type changed";
  if (JSON.stringify(skeleton(source)) !== JSON.stringify(skeleton(target))) return "structure changed";
  if (placeholderSignature(source) !== placeholderSignature(target)) return "placeholders changed";
  return null;
};

const batchProblems = (batch, result) => {
  if (!result || typeof result !== "object" || Array.isArray(result)) return ["not a JSON object"];
  const keys = Object.keys(batch);
  const extra = Object.keys(result).filter((k) => !(k in batch));
  const problems = extra.map((k) => `${k}: unexpected key`);
  for (const k of keys) {
    const p = k in result ? entryProblem(batch[k], result[k]) : "missing";
    if (p) problems.push(`${k}: ${p}`);
  }
  return problems;
};

// One headless CLI call, no tools, no MCP, no saved session: it only has to return JSON.
const runClaude = (input) =>
  new Promise((resolve, reject) => {
    const args = ["-p", "--model", MODEL, "--output-format", "json", "--system-prompt", SYSTEM_PROMPT,
      "--tools", "", "--strict-mcp-config", "--no-session-persistence"];
    const child = spawn("claude", args, { cwd: os.tmpdir(), stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`claude exited ${code}: ${err || out}`))));
    child.stdin.end(JSON.stringify(input, null, 1));
  });

const parseReply = (raw) => {
  const reply = JSON.parse(raw);
  if (reply.is_error) throw new Error(`claude error: ${reply.result}`);
  const text = String(reply.result).trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  return JSON.parse(text);
};

// Retry once: a single bad batch is usually a model slip, twice means the prompt or input is wrong.
const translateBatch = async (batch, label) => {
  let last = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = parseReply(await runClaude(batch));
      last = batchProblems(batch, result);
      if (last.length === 0) return result;
    } catch (error) {
      last = [String(error.message ?? error).slice(0, 500)];
    }
    console.warn(`${label} attempt ${attempt} failed:\n  ${last.slice(0, 10).join("\n  ")}`);
  }
  throw new Error(`${label} failed twice`);
};

const chunk = (list, size) =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

// Small worker pool: CLI calls are slow, but too many at once hit rate limits.
const runPool = async (tasks, limit) => {
  const results = [];
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
};

// Keys in en.json order; keys en.json no longer has are dropped (i18n-check requires parity).
const writeCatalog = (file, source, target) => {
  const ordered = Object.fromEntries(Object.keys(source).filter((k) => k in target).map((k) => [k, target[k]]));
  fs.writeFileSync(file, `${JSON.stringify(ordered, null, 2)}\n`);
  return Object.keys(ordered).length;
};

const translateApp = async (name, options) => {
  const dir = path.join(ROOT, APPS[name], "src/i18n/translations");
  const source = readJson(path.join(dir, "en.json"));
  const file = path.join(dir, "it.json");
  const target = !options.all && fs.existsSync(file) ? readJson(file) : {};
  const todo = Object.keys(source).filter((k) => !(k in target));
  const batches = chunk(todo, BATCH_SIZE).slice(0, options.limitBatches);
  console.log(`${name}: ${todo.length} keys to translate, running ${batches.length} batches`);
  const failed = [];
  await runPool(batches.map((keys, i) => async () => {
    const label = `${name} batch ${i + 1}/${batches.length}`;
    try {
      Object.assign(target, await translateBatch(Object.fromEntries(keys.map((k) => [k, source[k]])), label));
      writeCatalog(file, source, target); // save progress so a crash does not lose finished batches
      console.log(`${label} ok`);
    } catch (error) {
      failed.push(label);
      console.error(error.message);
    }
  }), CONCURRENCY);
  const total = writeCatalog(file, source, target);
  console.log(`${name}: it.json has ${total}/${Object.keys(source).length} keys`);
  return failed;
};

// --check: offline validation of it.json against en.json (key parity + entry rules). `--fix` drops bad
// entries so the next run retranslates them.
const checkApp = (name, fix) => {
  const dir = path.join(ROOT, APPS[name], "src/i18n/translations");
  const source = readJson(path.join(dir, "en.json"));
  const file = path.join(dir, "it.json");
  const target = readJson(file);
  const problems = batchProblems(source, target);
  if (fix) {
    for (const p of problems) delete target[p.split(":")[0]];
    writeCatalog(file, source, target);
  }
  console.log(`${name}: ${problems.length} problems${fix ? " (bad entries removed)" : ""}`);
  for (const p of problems.slice(0, 20)) console.log(`  ${p}`);
  return problems.length;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const apps = options.apps.length ? options.apps : Object.keys(APPS);
  if (options.check) {
    const fix = process.argv.includes("--fix");
    if (apps.map((app) => checkApp(app, fix)).some((n) => n > 0)) process.exitCode = 1;
    return;
  }
  const failed = [];
  for (const app of apps) failed.push(...(await translateApp(app, options)));
  if (failed.length) {
    console.error(`Failed batches: ${failed.join(", ")}`);
    process.exitCode = 1;
  }
};

await main();
