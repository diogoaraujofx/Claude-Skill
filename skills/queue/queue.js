#!/usr/bin/env node
// Message queue for Claude Code.
//   node queue.js add <sessionId>   (message on stdin)  -> called by the /queue skill
//   node queue.js drain             (hook JSON on stdin) -> called by the Stop hook
// Queues live in ~/.claude/queue/<sessionId>.json, one file per session.

const fs = require("fs");
const os = require("os");
const path = require("path");

const QUEUE_DIR = path.join(os.homedir(), ".claude", "queue");
const FALLBACK_SESSION = "default";
const STALE_MS = 7 * 24 * 60 * 60 * 1000;

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function sessionKey(id) {
  id = (id || "").trim();
  // Unsubstituted placeholder or empty -> shared fallback queue.
  if (!id || id.includes("CLAUDE_SESSION_ID")) return FALLBACK_SESSION;
  return id.replace(/[^A-Za-z0-9_.-]/g, "_");
}

function queueFile(key) {
  return path.join(QUEUE_DIR, `${key}.json`);
}

function load(key) {
  try {
    const items = JSON.parse(fs.readFileSync(queueFile(key), "utf8"));
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function save(key, items) {
  fs.mkdirSync(QUEUE_DIR, { recursive: true });
  const file = queueFile(key);
  if (items.length === 0) {
    fs.rmSync(file, { force: true });
    return;
  }
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

function removeStaleQueues() {
  try {
    for (const name of fs.readdirSync(QUEUE_DIR)) {
      const file = path.join(QUEUE_DIR, name);
      if (Date.now() - fs.statSync(file).mtimeMs > STALE_MS) fs.rmSync(file, { force: true });
    }
  } catch {}
}

function preview(text, max = 80) {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

function add(sessionId) {
  const key = sessionKey(sessionId);
  const message = readStdin().trim();
  const items = load(key);

  if (message === "" || message === "--list") {
    if (items.length === 0) {
      console.log("[queue] The queue is empty.");
    } else {
      console.log(`[queue] ${items.length} message(s) waiting:`);
      items.forEach((it, i) => console.log(`  ${i + 1}. ${preview(it.message)}`));
    }
    return;
  }

  if (message === "--clear") {
    save(key, []);
    console.log(`[queue] Queue cleared (${items.length} message(s) removed).`);
    return;
  }

  if (message === "$ARGUMENTS") {
    console.log("[queue] ERROR: the message was not received ($ARGUMENTS was not substituted). Nothing was queued.");
    return;
  }

  removeStaleQueues();
  items.push({ message, queuedAt: new Date().toISOString() });
  save(key, items);
  console.log(`[queue] Message queued at position ${items.length}. It will be delivered automatically once the current task is finished.`);
}

function drain() {
  let input = {};
  try {
    input = JSON.parse(readStdin() || "{}");
  } catch {}

  // Own session first, then the fallback queue.
  for (const key of [sessionKey(input.session_id), FALLBACK_SESSION]) {
    const items = load(key);
    if (items.length === 0) continue;

    const next = items.shift();
    save(key, items);

    const remaining = items.length === 0 ? "the queue is now empty" : `${items.length} more waiting`;
    const reason = [
      `[queue] The previous task is finished. This is the next message the user queued with /queue (${remaining}).`,
      "Treat it as a new, independent request from the user and carry it out fully now:",
      "",
      next.message,
    ].join("\n");

    process.stdout.write(JSON.stringify({ decision: "block", reason }));
    return;
  }
  // Nothing queued: exit silently and let Claude stop.
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "add") add(arg);
else if (cmd === "drain") drain();
else {
  console.error("usage: queue.js add <sessionId> | drain");
  process.exit(1);
}
