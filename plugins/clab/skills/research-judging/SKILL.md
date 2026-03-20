---
name: research-judging
description: How to evaluate research samples using structured JSON output from claude -p. Covers criteria writing, the core judging pattern, and practical examples.
---

# Research Judging Pipeline

Evaluate samples by passing criteria + sample text to `claude -p` with structured JSON output. One call per sample, no agent file, no tools — just a clean prompt and a schema.

## Core Pattern

Each judgment is a single `claude -p` call:
- **System prompt**: your evaluation criteria, passed via `--system-prompt-file`
- **User message**: the sample text to evaluate (piped via stdin)
- **Output**: schema-validated JSON

```bash
echo "$SAMPLE_TEXT" | env -u CLAUDECODE -u ANTHROPIC_API_KEY \
  claude -p --model haiku \
  --setting-sources local \
  --no-session-persistence \
  --tools "" \
  --strict-mcp-config \
  --system-prompt-file judging/criteria.md \
  --output-format json \
  --json-schema "$(cat judging/schema.json)" \
  | jq '.structured_output'
```

**Impartiality**: The judge must be blind to experimental conditions. Never pass metadata like condition labels, steering coefficients, group assignments, or any information about which experimental arm a sample belongs to. The judge should receive only what it needs to score: the text to evaluate and (if needed) what traits to look for. Leaking experimental metadata biases scores toward expected outcomes.

## Model Choice

- **haiku**: Default. Fast, cheap, good for straightforward criteria
- **sonnet**: Use when judging requires nuance, complex reasoning, or subtle distinctions

## Judging Folder

Two files:

```
judging/
  criteria.md          # Evaluation criteria (passed as system prompt)
  schema.json          # JSON schema for structured output
```

### criteria.md

Natural language instructions for the judge. This is the **only place the model learns what your scores mean** — the schema enforces structure but the model doesn't see constraints like min/max values. Include:
- What to evaluate (dimensions, rubric)
- Scoring ranges with interval descriptions (what each score range means)
- Anchor examples for ambiguous boundaries
- Edge case guidance

Example:
```markdown
# Judging Criteria

You are evaluating AI assistant responses for quality.

## Scores

### helpfulness (0-10)
- **0-2**: Irrelevant, dismissive, or harmful. Doesn't address the question.
- **3-4**: Partially related but missing key information or giving incorrect guidance.
- **5-6**: Addresses the question but incomplete, generic, or requires significant follow-up.
- **7-8**: Solid answer that covers the main points with actionable information.
- **9-10**: Comprehensive, actionable, anticipates follow-up needs. Goes beyond the minimum.

### clarity (0-10)
- **0-2**: Incoherent, contradictory, or impossible to follow.
- **3-4**: Understandable but disorganized, excessive jargon, or buries the answer.
- **5-6**: Gets the point across but verbose or poorly structured.
- **7-8**: Clear and well-organized. Easy to follow.
- **9-10**: Concise, logical flow, states the answer then explains why.

## Qualitative
- **summary**: One sentence describing the response style
- **red_flags**: List any concerning patterns, or "none"
```

### schema.json

JSON Schema matching the criteria. Guarantees validated output.

Example (matching the criteria above):
```json
{
  "type": "object",
  "properties": {
    "scores": {
      "type": "object",
      "properties": {
        "helpfulness": { "type": "integer", "minimum": 0, "maximum": 10 },
        "clarity": { "type": "integer", "minimum": 0, "maximum": 10 }
      },
      "required": ["helpfulness", "clarity"]
    },
    "qualitative": {
      "type": "object",
      "properties": {
        "summary": { "type": "string" },
        "red_flags": { "type": "string" }
      },
      "required": ["summary", "red_flags"]
    }
  },
  "required": ["scores", "qualitative"]
}
```

## How `--json-schema` Works

The `--json-schema` flag does **not** inject the raw schema into the model's context. Instead, the CLI:

1. Translates your schema into a **tool definition** called `StructuredOutput` whose parameters match your schema
2. **Forces the model to call that tool** (via forced tool use)
3. Validates the tool call arguments against your schema
4. Returns the arguments as `structured_output` in the result envelope

**Implication**: The model sees field names and types (from the tool definition), but does **not** see `minimum`/`maximum` constraints, `enum` values, or `description` annotations from your schema. Those are enforced at validation time only — if the model outputs an out-of-range value, the call fails rather than the model self-correcting.

This is why **the criteria file must fully describe your rubric** — valid ranges, score meanings, expected formats. Don't rely on schema constraints to guide the model's reasoning.

## Running from Claude Code's Bash tool

When testing `claude -p` calls directly from the Bash tool, pipe output to a file — the Bash tool doesn't reliably capture `claude -p` output otherwise:

```bash
echo "$SAMPLE" | env -u CLAUDECODE -u ANTHROPIC_API_KEY \
  claude -p --model haiku ... \
  > /ephemeral/c.dumas/judge_output.txt 2>&1
cat /ephemeral/c.dumas/judge_output.txt | jq '.structured_output'
```

From Python `subprocess.run(capture_output=True)`, stdout works normally — no piping needed.

## CLI Flags Reference

| Flag | Purpose |
|---|---|
| `env -u CLAUDECODE -u ANTHROPIC_API_KEY` | Required when calling from inside Claude Code. `CLAUDECODE` blocks nested sessions; unsetting `ANTHROPIC_API_KEY` uses plan credentials (higher rate limits). |
| `--setting-sources local` | Suppresses loading of `~/.claude/CLAUDE.md`. Without this, global instructions bias the judge. |
| `--no-session-persistence` | Don't persist sessions to disk. Without this, each call creates a session entry that floods your project. |
| `--tools ""` | Removes all tools. The judge only needs to produce structured output, no tool use. |
| `--strict-mcp-config` | Disables MCP servers. Prevents any configured MCPs from loading. |
| `--system-prompt-file` | Replaces the default system prompt with your criteria file. |
| `--output-format json` | Returns structured JSON envelope (use with `--json-schema`). |
| `--json-schema` | Structures output via forced tool use and validates against your schema. The model sees field names/types but not constraints like `minimum`/`maximum`. Extract the result with `jq '.structured_output'`. |
| `--model haiku` | Fast/cheap default. Use `sonnet` for nuanced judging. |

## Parallelism

**Always run judgments in parallel.** Each `claude -p` call is independent and takes 10-30s. Running 100 samples sequentially = 30+ minutes. Running 30-wide parallel = ~2 minutes. Cap at 30 concurrent to avoid rate limits.

### Bash: parallel with background jobs

```bash
for sample in samples/*.txt; do
  cat "$sample" | env -u CLAUDECODE -u ANTHROPIC_API_KEY \
    claude -p --model haiku \
    --setting-sources local \
    --no-session-persistence \
    --tools "" \
    --strict-mcp-config \
    --system-prompt-file judging/criteria.md \
    --output-format json \
    --json-schema "$(cat judging/schema.json)" \
    | jq '.structured_output' > "judgments/$(basename "$sample" .txt).json" &
  # Rate limit: max 30 concurrent
  [ $(jobs -r | wc -l) -ge 30 ] && wait -n
done
wait
```

### Python: parallel with ThreadPoolExecutor

Includes a **60s timeout** per call and **exponential backoff retry** (5 attempts). `claude -p` calls can hang indefinitely — without a timeout, a single stuck call will block a thread forever and your job will never finish.

```python
import json
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

MAX_CONCURRENT = 30
TIMEOUT_S = 60
MAX_RETRIES = 5

# Resolve env once at startup
ENV = {
    "PATH": subprocess.check_output(["bash", "-c", "echo $PATH"], text=True).strip(),
    "HOME": str(Path.home()),
}

def judge_one(sample_path: Path, criteria: str, schema: str) -> tuple[Path, dict | None]:
    """Judge a single sample with timeout and exponential backoff retry."""
    text = sample_path.read_text()
    for attempt in range(MAX_RETRIES):
        try:
            result = subprocess.run(
                [
                    "claude", "-p", "--model", "haiku",
                    "--setting-sources", "local",
                    "--no-session-persistence",
                    "--tools", "",
                    "--strict-mcp-config",
                    "--system-prompt-file", criteria,
                    "--output-format", "json",
                    "--json-schema", schema,
                ],
                input=text,
                capture_output=True, text=True,
                timeout=TIMEOUT_S,
                env=ENV,
            )
            if result.returncode != 0:
                raise RuntimeError(f"exit {result.returncode}: {result.stderr[:200]}")
            envelope = json.loads(result.stdout)
            return sample_path, envelope.get("structured_output", envelope)
        except (subprocess.TimeoutExpired, RuntimeError, json.JSONDecodeError) as e:
            wait = 2 ** attempt  # 1s, 2s, 4s
            print(f"  RETRY {attempt+1}/{MAX_RETRIES} ({e.__class__.__name__}) {sample_path.name}, waiting {wait}s")
            time.sleep(wait)
    print(f"  FAIL (all retries exhausted): {sample_path.name}")
    return sample_path, None

samples = sorted(Path("samples").glob("*.txt"))
schema_str = Path("judging/schema.json").read_text()

# Skip already-completed judgments
done = {p.stem for p in Path("judgments").glob("*.json")}
remaining = [s for s in samples if s.stem not in done]

with ThreadPoolExecutor(max_workers=MAX_CONCURRENT) as pool:
    futures = {
        pool.submit(judge_one, s, "judging/criteria.md", schema_str): s
        for s in remaining
    }
    ok, fail = 0, 0
    for future in as_completed(futures):
        sample_path, judgment = future.result()
        if judgment:
            out = Path("judgments") / f"{sample_path.stem}.json"
            out.write_text(json.dumps(judgment, indent=2))
            print(f"OK  {sample_path.name}: {judgment['scores']}")
            ok += 1
        else:
            fail += 1
    print(f"\nDone: {ok} ok, {fail} failed, {len(done)} skipped (already done)")
```

Writing each judgment to a separate file means results are saved as they come in — if a run fails halfway through, you keep everything that completed. On resume, skip files that already exist in `judgments/`.

When samples contain metadata (e.g. JSON with an `id`, `condition`, `text` field), write a small script that extracts the text and passes it to the CLI call.

## Audit-First Workflow

**Never scale before validating your rubric.**

1. **Small sample test**: Run judge on 3-5 samples
2. **Audit judgments**: Check if scores match your intuition
3. **Adjust criteria**: Refine descriptions, ranges, anchor examples if needed
4. **Repeat** until judgments are consistent with expectations
5. **Scale**: Only then run full batch

This catches:
- Ambiguous criteria that judges interpret differently than intended
- Missing edge cases in your rubric
- Scores that cluster weirdly (all 7s, nothing below 5, etc.)
