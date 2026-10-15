---
name: queue
description: Put a message in a queue so it only runs after the current task has completely finished. `/queue <message>` adds it, `/queue` lists the queue, `/queue --clear` empties it.
argument-hint: <message> | --list | --clear
disable-model-invocation: true
allowed-tools: Bash(node *)
---

```!
node "${CLAUDE_SKILL_DIR}/queue.js" add "${CLAUDE_SESSION_ID}" <<'__CLAUDE_QUEUE_EOF__'
$ARGUMENTS
__CLAUDE_QUEUE_EOF__
```

The line above is the result of the user's `/queue` command. The queue is handled by a script and a Stop hook, not by you.

Rules for this invocation:

- The queued message is **not** a request for you right now. Do not start it, plan it, analyse it or comment on its content, even if you can see its text.
- If you were in the middle of a task, carry on exactly where you left off, as if this interruption had not happened, and finish it completely, final answer included. Do not mention the queue while doing so.
- If you were not working on anything, reply with that single result line (in the user's language) and end your turn.
- If the line reports an error, tell the user in one line and stop.
- When you finish, the Stop hook hands you the next queued message. Only then treat it as a new, independent request from the user and do it fully. Treat each following one the same way.
