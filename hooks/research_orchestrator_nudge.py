#!/usr/bin/env python3
"""
Hook: Nudge the research orchestrator before stopping.

Scoped to research-orchestrator agent via agent definition.
"""
import json
import sys


def main():
    input_data = json.load(sys.stdin)
    stop_hook_active = input_data.get("stop_hook_active", False)

    # Prevent infinite loops
    if stop_hook_active:
        sys.exit(0)

    output = {
        "decision": "block",
        "reason": """Before finishing, consider:

1. Is there anything else worth a quick check to strengthen your conclusions?
2. Would a colleague review help validate your reasoning?
3. Are there any loose ends or anomalies you noticed but didn't follow up on?
4. Is RESEARCH_STATE.md updated with your latest thinking?

If you're confident you're done, just say so and I'll let you stop."""
    }
    print(json.dumps(output))
    sys.exit(0)


if __name__ == "__main__":
    main()
