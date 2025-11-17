# Claude Code Agent

Claude Code AI assistant exposed as an A2A server for integration with Ark.

## Features

- Exposes Claude Code as an A2A agent
- Includes **Ark Analysis** skill for analyzing the Ark codebase
- Session management for multi-turn conversations
- Configurable tool access and permissions

## Quickstart

```bash
make help

make install
make uninstall

make dev
```

## Requirements

- Node.js 20+
- `ANTHROPIC_API_KEY` environment variable

## Local Development

```bash
# Install dependencies
npm install

# Set your API key
export ANTHROPIC_API_KEY=your_key_here

# Run locally
make dev
# or
npm run dev
```

Server runs on `http://localhost:2528`

## Testing

```bash
# View agent card
curl http://localhost:2528/.well-known/agent-card.json | jq .

# Health check
curl http://localhost:2528/health

# Send a message
curl -X POST http://localhost:2528/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "message/send",
    "params": {
      "message": {
        "messageId": "test-1",
        "contextId": "ctx-1",
        "role": "user",
        "parts": [{"kind": "text", "text": "Write a hello world function in Python"}]
      }
    },
    "id": 1
  }' | jq .
```

## Deployment

```bash
# Create secret with your API key
kubectl create secret generic claude-code-secrets \
  --from-literal=api-key=$ANTHROPIC_API_KEY

# Deploy with DevSpace
devspace dev    # Development mode with hot-reload
devspace deploy # Production deployment
devspace purge  # Remove deployment

# Query via Ark
ark agent query claude-agent "Write a hello world function in Python"
```

## Configuration

Environment variables:
- `ANTHROPIC_API_KEY` - Required API key
- `CLAUDE_ALLOWED_TOOLS` - Comma-separated list of allowed tools (default: "Bash,Read,Edit,Write,Grep,Glob")
- `CLAUDE_PERMISSION_MODE` - Permission mode (default: "acceptEdits")

## Skills

The agent includes the following Claude Code skills:

### Ark Analysis

Analyzes the Ark codebase by cloning the repository. Ask questions like:
- "How does the query controller work in Ark?"
- "Explain the A2A server implementation in Ark"
- "Find all CRD definitions in the Ark codebase"

Skills are located in `.claude/skills/` and automatically loaded by Claude Code.
