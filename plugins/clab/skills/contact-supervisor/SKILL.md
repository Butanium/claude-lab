---
name: contact-supervisor
description: How to send notifications to the human supervisor via ntfy.sh. Use when you need input, hit a blocker, or want to report significant findings.
---

# Contacting the Supervisor

When you need human input, hit a blocker, or have significant findings to report, send a notification via ntfy.sh.

## How to Notify

```bash
curl -s -d "Your message here" "ntfy.sh/$CLAB_NTFY_TOPIC"
```

The `CLAB_NTFY_TOPIC` environment variable must be set. If it's not configured, ask the user to set it.

## When to Notify

- **Blockers**: Something prevents progress and you need guidance
- **Decision points**: Multiple valid approaches, need human judgment
- **Significant findings**: Results that warrant immediate attention
- **Completion**: Major milestones or experiment completion

## Message Format

Keep messages concise but informative:
- State what happened or what you need
- Include relevant context (experiment name, file path)
- Suggest next steps if applicable

Example:
```bash
curl -s -d "exp003 complete: Found 3 attention heads with consistent activation patterns. Ready for colleague review." "ntfy.sh/$CLAB_NTFY_TOPIC"
```
