"""Count tokens of sample dump files for qualitative reading.

Counts total tokens of one or more dump files via Anthropic's count_tokens
endpoint and reports the average per sample block, so you can size a read
against your context window by eye.

Usage:
    uv run --with anthropic count_budget.py path/to/dump.txt --model <model>
"""
import argparse
import os
from pathlib import Path

from anthropic import Anthropic


def count_tokens(client: Anthropic, text: str, model: str) -> int:
    """Count input tokens for a single message via the count_tokens endpoint."""
    resp = client.messages.count_tokens(
        model=model,
        messages=[{"role": "user", "content": text}],
    )
    return resp.input_tokens


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dump", type=Path, help="Sample dump file (one block per sample)")
    ap.add_argument("--model", required=True,
                    help="Model identifier for the count_tokens endpoint, e.g. claude-opus-4-8")
    ap.add_argument("--block-marker", default="==========",
                    help="Substring that starts each sample block (for counting)")
    args = ap.parse_args()

    text = args.dump.read_text()
    n_blocks = sum(1 for line in text.splitlines() if line.startswith(args.block_marker))
    assert n_blocks > 0, f"no blocks matching {args.block_marker!r} in {args.dump}"

    client = Anthropic(api_key=os.environ["ANTHROPIC_TOKENIZER_API_KEY"])
    total = count_tokens(client, text, model=args.model)

    print(f"file: {args.dump}")
    print(f"  blocks: {n_blocks}")
    print(f"  total tokens: {total:,}")
    print(f"  avg tokens/block: {total / n_blocks:.0f}")


if __name__ == "__main__":
    main()
