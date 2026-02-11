---
name: test-hooks
description: Test agent to verify hooks fire
tools:
  - Read
hooks:
  PreToolUse:
    - matcher: "Read"
      hooks:
        - type: command
          command: "env | grep CLAUDE >> /run/user/2011/agent_hook_test.log"
---

# Test Hooks Agent

You are a test agent. Read the file you are asked to read and report what happened.
