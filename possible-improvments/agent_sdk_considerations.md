# Agent SDK Considerations

Notes on potentially using the Claude Agent SDK for clab orchestration.

## Current Architecture

```
Orchestrator (interactive, has Task)
    └── Scientists (via Task tool)
            └── Judges (via claude --print)
```

- Orchestrator runs interactively with Task tool available
- Scientists spawned via Task, inherit tools from parent
- Judges spawned via `claude --print` (no Task needed - just evaluate and write files)

## What Agent SDK Provides

The Agent SDK wraps Claude Code CLI and provides programmatic control:

```python
from claude_code_sdk import ClaudeSDKClient, ClaudeAgentOptions, tool

@tool
async def judge(folder: str, criteria: str) -> dict:
    """Typed tool for spawning judges."""
    async with ClaudeSDKClient(...) as j:
        await j.query(f"Evaluate {folder} against: {criteria}")
        ...
    return results

async def run_orchestrator():
    async with ClaudeSDKClient(options) as orchestrator:
        await orchestrator.query("Begin research...")
        async for msg in orchestrator.receive_response():
            print(msg)
```

### Benefits

| Feature | Current (plugin) | Agent SDK |
|---------|-----------------|-----------|
| Typed tool arguments | String interpolation in prompts | `judge(folder="...", criteria="...")` |
| Structured returns | Write to files, read files | Python dict/objects |
| Embedding in apps | N/A | Web UI, API, larger Python systems |
| Multiple orchestrators | Manual | Programmatic spawning |
| Error handling | Hope it works | try/except, retries |

### When SDK Makes Sense

- Building a web UI around research orchestration
- Running multiple parallel orchestrators programmatically
- Integrating with other Python tooling (databases, APIs)
- Wanting typed interfaces instead of prompt construction

### When Current Approach Is Sufficient

- Single orchestrator per research project
- File-based communication (judges write to `judgments/`)
- Running in tmux/Slurm interactively
- LLM-to-LLM delegation (LLMs are good at constructing prompts)

## Conclusion

For current research needs, the plugin architecture + `--print` for judges is sufficient. The SDK would add value if we later want:
- Programmatic multi-orchestrator management
- Web/API interfaces
- Tighter Python integration

The main practical difference: SDK gives typed `tool(arg1, arg2)` calls instead of string-based prompt construction. For LLM agents, this matters less since they construct prompts naturally.

## References

- [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Claude Code Headless Mode](https://code.claude.com/docs/en/headless.md)
