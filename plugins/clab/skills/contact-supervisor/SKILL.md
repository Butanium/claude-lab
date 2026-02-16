---
name: contact-supervisor
description: How to send notifications to the human supervisor via ntfy.sh. Use when you need input, hit a blocker, or update them on your progress.
---

# Contacting the Supervisor

When you need human input, hit a blocker, have significant findings to report, or achieved a milestone, send a notification via ntfy.sh.

## How to Notify

```bash
curl -s -d "Your message here" "ntfy.sh/$CLAB_NTFY_TOPIC"
```

The `CLAB_NTFY_TOPIC` environment variable must be set. If it's not configured, ask the user to set it.

## When to Notify

- **Blockers**: Something prevents progress and you need guidance
- **Decision points**: Multiple valid approaches, need human judgment
- **Significant findings**: Results that warrant immediate attention
- **Milestones**: Major milestones or experiment completion

## Message Format

Keep messages concise but informative:
- State what happened or what you need
- Include relevant context (experiment name, file path)
- Suggest next steps if applicable

Example:
```bash
curl -s -d "exp003 complete: Found 3 attention heads with consistent activation patterns. Ready for colleague review." "ntfy.sh/$CLAB_NTFY_TOPIC"
```

## Default Behavior

By default, notifications are **fire-and-forget**. Send the message and continue working — do NOT wait for a reply unless you have nothing left to do.

## Idling for Supervisor Input (only when blocked)

If you've sent a notification because you're **blocked and cannot make any further progress** (e.g. you need a decision, or all tasks are done and you're awaiting next instructions):

1. **State clearly** in your output that you're idling until the supervisor responds via ntfy
2. **Launch a background polling job** to fetch the reply:
   ```bash
   while true; do msg=$(curl -s "ntfy.sh/$CLAB_NTFY_TOPIC/json?poll=1&since=10s" | tail -1 | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))" 2>/dev/null); if [ -n "$msg" ]; then echo "Supervisor replied: $msg"; break; fi; sleep 10; done
   ```
   Run this with `run_in_background: true`.
3. **Idle** until the background job returns with the supervisor's reply, then act on it.
