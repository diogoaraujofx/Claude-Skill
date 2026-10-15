# queue: a `/queue` command for Claude Code

When you send Claude Code a new message while it is still working, it starts reasoning about the new message straight away. Sometimes it never properly finishes the first task.

`/queue` fixes that. A queued message is **only delivered once Claude has completely finished the current task**, final answer included, and it then runs as a fresh, independent request. Queue as many messages as you like and they run one after another, in order.

```
> refactor the auth module and run the tests
  ...Claude is working...
> /queue update the CHANGELOG with what changed
> /queue then write a short summary for the PR description
```

## Install

Inside Claude Code:

```
/plugin marketplace add diogoaraujofx/Claude-Skill
/plugin install queue@queue-plugin
```

Or from a shell:

```
claude plugin marketplace add diogoaraujofx/Claude-Skill
claude plugin install queue@queue-plugin
```

Restart Claude Code (or open a new session) afterwards.

**Requirements:** Node.js 18+ on your `PATH`. It works on Windows, macOS and Linux.

## Usage

| Command | What it does |
| --- | --- |
| `/queue <message>` | Add a message to the queue |
| `/queue` or `/queue --list` | Show the waiting messages |
| `/queue --clear` | Empty the queue |

If another command already uses the name `/queue`, use the full name `/queue:queue`.

## How it works

A skill alone cannot hold a message back, so the plugin has two parts:

1. **The `/queue` skill** runs a small script that saves the message to `~/.claude/queue/<session-id>.json` before Claude reads it. Claude is told to ignore it and carry on with what it was doing.
2. **A `Stop` hook** runs every time Claude finishes a turn. If the session's queue has messages, it takes the next one and hands it back to Claude as a new request, so Claude keeps working. When the queue is empty, Claude stops normally.

Queues are per session. Queue files older than 7 days are removed automatically.

## Notes and limitations

- Only messages sent with `/queue` are held. Plain messages typed while Claude works are still delivered mid-turn, as usual.
- If you interrupt Claude with `Esc`, the Stop hook does not run. The queue is kept and continues after the next turn ends.
- Claude Code may label the hand-off as "Stop hook feedback". That is expected and is not an error.

## Uninstall

```
/plugin uninstall queue@queue-plugin
```

## License

MIT
