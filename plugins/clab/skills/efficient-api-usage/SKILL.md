---
name: efficient-api-usage
description: Cost and latency optimization for Anthropic API usage. Covers prompt caching, batch API, and when to combine them.
---

# Efficient API Usage

## Prompt Caching

Caches the KV representations of prompt prefixes so repeated requests with shared context skip re-processing.

**How it works:**
- Prefix-based: the cache matches up to the last `cache_control` breakpoint where the prefix is identical
- Place `cache_control` at the boundary between stable context and variable content
- Default TTL is 5 minutes; use `"ttl": "1h"` for 1-hour duration (value must be a string: `"5m"` or `"1h"`)

**Pricing (relative to base input cost):**
- Cache write: 25% more expensive than base
- Cache read: 90% cheaper than base

**Two modes:**

1. Explicit breakpoints — mark specific content blocks:
```python
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": "<large stable context>",
            "cache_control": {"type": "ephemeral"},
        }
    ],
    messages=[{"role": "user", "content": "variable question"}],
)
```

2. Automatic caching — top-level flag, auto-applies to last cacheable block:
```python
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    cache_control={"type": "ephemeral"},
    system="<large stable context>",
    messages=[{"role": "user", "content": "variable question"}],
)
```

**Verifying cache behavior** — check `response.usage`:
- `cache_creation_input_tokens > 0` → cache miss, wrote to cache
- `cache_read_input_tokens > 0` → cache hit

## Batch API

Processes requests asynchronously at 50% of standard pricing. Most batches complete in <1 hour, max 24 hours.

**Limits:** 100k requests or 256 MB per batch, whichever comes first.

**When to use:** any workload that doesn't need real-time responses — evals, bulk classification, data analysis, content generation.

**With structured outputs (`output_config.format.json_schema`):** all object types in the schema must have `"additionalProperties": false`. This is an API-level requirement (not batch-specific).

```python
from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
from anthropic.types.messages.batch_create_params import Request

batch = client.messages.batches.create(
    requests=[
        Request(
            custom_id=f"request-{i}",
            params=MessageCreateParamsNonStreaming(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                messages=[{"role": "user", "content": question}],
            ),
        )
        for i, question in enumerate(questions)
    ]
)
```

## Decision Matrix

| Scenario | Real-time needed? | Shared prefix? | Strategy | Discount vs base |
|---|---|---|---|---|
| Chat / interactive | Yes | Yes (system prompt) | Prompt caching | ~90% on cached input |
| Chat / interactive | Yes | No | Standard API | None |
| Bulk eval / analysis | No | Yes | Batch + caching | 50% base + ~90% on cached input |
| Bulk eval / analysis | No | No | Batch only | 50% |

## Combining Batch + Caching

The discounts stack. Include identical `cache_control` blocks in every request within the batch.

**Caveat:** batch requests are processed concurrently and asynchronously, so cache hits are best-effort (typically 30-98% hit rate). To maximize hits:
- Use 1-hour TTL: `{"type": "ephemeral", "ttl": "1h"}`
- Keep the cached prefix identical across all requests
- Maintain steady request volume to keep caches warm

```python
shared_system = [
    {
        "type": "text",
        "text": "<large shared context>",
        "cache_control": {"type": "ephemeral", "ttl": "1h"},
    }
]

batch = client.messages.batches.create(
    requests=[
        Request(
            custom_id=f"request-{i}",
            params=MessageCreateParamsNonStreaming(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                system=shared_system,
                messages=[{"role": "user", "content": q}],
            ),
        )
        for i, q in enumerate(questions)
    ]
)
```
