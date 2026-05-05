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
- Cache write (5-min TTL): 1.25× base (25% premium)
- Cache write (1-hour TTL): 2× base (100% premium)
- Cache read: 0.1× base (90% cheaper)

**Break-even:** 5-min TTL pays off after 2 requests (1.25× + 0.1× = 1.35× vs 2× uncached). 1-hour TTL needs 3+ requests (2× + 0.2× = 2.2× vs 3× uncached). Pick 1h only when you expect the prefix to be reused enough times to amortize the doubled write cost.

**Limits and silent failures:**
- Max 4 `cache_control` breakpoints per request.
- Minimum cacheable prefix is model-dependent (4096 tokens on Opus 4.5+/Haiku 4.5; 2048 on Sonnet 4.6/Haiku 3.5; 1024 on older Sonnets). Below the threshold the API silently doesn't cache — no error, just `cache_creation_input_tokens: 0`.
- The cache key is the exact bytes of the prefix. Any byte that differs between requests invalidates everything after it, with no error. Common ways prompts silently differ across "identical" requests:
    - A timestamp or UUID interpolated into the system prompt (`f"Today is {datetime.now()}"`)
    - `json.dumps(d)` without `sort_keys=True` — Python dict iteration order can shift the bytes
    - The list of tools differs run-to-run (e.g. tools assembled from a `set` or filtered conditionally)
    - Any per-request value (user ID, request ID, session ID) included in the cached portion
  If `cache_read_input_tokens` stays 0 across runs you expect to hit, diff the rendered request bodies — one of these is almost always the cause.

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
- Pick TTL by hit rate: 5-min (1.25× write) breaks even at 2 hits — fine for high-hit batches; 1-hour (2× write) needs 3+ hits to pay off, so use it only for large batches with reliably warm caches or sustained traffic across batch jobs. A low-hit-rate batch on 1h TTL can cost more than no caching at all.
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
