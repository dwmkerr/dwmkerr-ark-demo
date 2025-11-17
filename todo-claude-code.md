# Claude Code Agent - Status & TODO

## What We Built

Created a Claude Code AI assistant exposed as an A2A (Agent-to-Agent) server for integration with Ark. Located in `agents/claude-code-agent/`.

## Current Status: ✅ Working

The agent is functional and can:
- Execute Claude Code in headless mode via subprocess
- Handle A2A protocol messages
- Support multi-turn conversations with session management
- Use the Ark Analysis skill to examine the Ark codebase

## What's Implemented

### Core Functionality
- **A2A Server** (`src/claude_code_agent/a2a_server.py`)
  - Exposes Claude Code via A2A protocol
  - `ClaudeCodeExecutor` runs `claude` CLI in subprocess
  - Streams JSON output from Claude and converts to A2A messages
  - Session management for multi-turn conversations

- **Skills**
  - Ark Analysis skill (`.claude/skills/ark-analysis/SKILL.md`)
  - Instructs Claude to clone and analyze the Ark repository
  - Provides codebase structure guidance

- **Configuration**
  - DevSpace setup with API key prompt
  - Kubernetes manifests (Deployment, Service, A2AServer)
  - Icon annotation for Ark dashboard

### Technical Details
- Uses `@anthropic-ai/claude-code` npm package
- Python 3.12 with `uv` for dependency management
- `shutil.which()` for portable Claude CLI discovery
- Proper PATH setup for npm global bins

## Testing

Tested via:
- Local development with `devspace dev`
- A2A inspector at http://127.0.0.1:5001
- Agent card accessible at `/.well-known/agent-card.json`

## Known Issues / Limitations

None currently blocking.

## TODO

### High Priority
- [ ] Test agent in ark-demo cluster
- [ ] Verify Ark Analysis skill works (clones repo and analyzes)
- [ ] Document in ark-demo README

### Medium Priority
- [ ] Add more skills as needed
- [ ] Tune resource limits (currently 2Gi memory, 2 CPU)
- [ ] Consider streaming support (currently disabled)

### Low Priority
- [ ] Add unit tests for executor
- [ ] Add metrics/observability
- [ ] Support for cancellation (code exists but untested)

## Key Decisions Made

1. **Installation method**: Using npm package `@anthropic-ai/claude-code`
2. **Base image**: `python:3.12-slim` with Node.js added (not node with Python added)
3. **CLI discovery**: Using `shutil.which()` for portability
4. **Skills location**: `.claude/skills/` mounted to container
5. **API key**: Kubernetes secret created by DevSpace hook

## Commands

```bash
# Run locally
cd agents/claude-code-agent
export ANTHROPIC_API_KEY=your_key
make dev

# Deploy to cluster
devspace dev

# Test
curl http://localhost:8000/.well-known/agent-card.json
```

## Files Structure

```
agents/claude-code-agent/
├── .claude/skills/ark-analysis/  # Claude Code skills
├── src/claude_code_agent/        # Python package
│   ├── __init__.py
│   ├── __main__.py
│   └── a2a_server.py            # Main A2A server
├── Dockerfile                    # Container image
├── devspace.yaml                 # DevSpace config
├── manifests.yaml                # K8s resources
├── pyproject.toml                # Python dependencies
├── Makefile                      # Build commands
└── README.md                     # Usage docs
```

## Next Session

Ready to test deployment and verify the Ark Analysis skill works correctly.
