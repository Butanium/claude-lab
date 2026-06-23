"""Estimate sample budget for qualitative reading.

Counts tokens of one or more dump files via Anthropic's count_tokens endpoint,
reports how much of the context budget they consume, and prints how many
samples fit. All current Claude models have a 1M-token context window.

Usage:
    uv run --with anthropic count_budget.py path/to/dump.txt --model <model>
"""
import argparse
import os
from pathlib import Path

from anthropic import Anthropic

WINDOW = 1_000_000  # all current Claude models have a 1M-token context window


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
    ap.add_argument("--budget-frac", type=float, default=0.5,
                    help="Fraction of the 1M window to budget for sample reading")
    ap.add_argument("--block-marker", default="==========",
                    help="Substring that starts each sample block (for counting)")
    args = ap.parse_args()

    text = args.dump.read_text()
    n_blocks = sum(1 for line in text.splitlines() if line.startswith(args.block_marker))
    assert n_blocks > 0, f"no blocks matching {args.block_marker!r} in {args.dump}"

    client = Anthropic(api_key=os.environ["ANTHROPIC_TOKENIZER_API_KEY"])
    total = count_tokens(client, text, model=args.model)

    avg = total / n_blocks
    budget = int(WINDOW * args.budget_frac)
    fits = budget // avg

    print(f"file: {args.dump}")
    print(f"  blocks: {n_blocks}")
    print(f"  total tokens: {total:,}")
    print(f"  avg tokens/block: {avg:.0f}")
    print(f"  budget ({args.budget_frac:.0%} of 1M window): {budget:,} tokens")
    print(f"  samples that fit at avg rate: {fits:.0f}")
    print(f"  this file uses: {100*total/budget:.1f}% of budget")


if __name__ == "__main__":
    main()
