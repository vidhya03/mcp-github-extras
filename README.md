# mcp-github-extras

> Extended GitHub tools for [Model Context Protocol (MCP)](https://modelcontextprotocol.io) —
> filling the gaps left by the official `github-mcp` server.

## Why this exists

The official `github-mcp` server covers most GitHub operations but is missing
several PR workflow tools essential for automation pipelines:

| Missing operation | GitHub API endpoint |
|-------------------|-------------------|
| Add PR reviewers  | `POST /pulls/{n}/requested_reviewers` |
| Add PR assignees  | `PATCH /issues/{n}` |
| Set PR labels     | `POST /issues/{n}/labels` |
| List repo tags    | `GET /repos/{owner}/{repo}/tags` |
| Create label      | `POST /repos/{owner}/{repo}/labels` |

`mcp-github-extras` fills exactly these gaps. It is designed to run
**alongside** the official server, not replace it.

## Tools

| Tool | Description |
|------|-------------|
| `list_tags` | List the latest git tags for a repository |
| `add_pr_reviewers` | Request reviewers on an existing pull request |
| `add_pr_assignees` | Set assignees on an existing pull request |
| `set_pr_labels` | Add or replace labels on an existing pull request |
| `create_label` | Create a label in a repository if it does not exist |

## Requirements

- Node.js 18+
- A GitHub personal access token with `repo` scope

## Installation

```bash
git clone https://github.com/vidhya03/mcp-github-extras
cd mcp-github-extras
npm install
cp .env.example .env
# edit .env and add your GITHUB_TOKEN
```

## Configuration

### Global — `~/.claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "github-extra": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-github-extras/index.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

### Project level — `.mcp.json`

```json
{
  "mcpServers": {
    "github-extra": {
      "command": "node",
      "args": ["./mcp-github-extras/index.js"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

> Keep the official `github-mcp` registered separately under the name `github`.
> Both servers can run side by side without conflict as long as they have distinct names.

## Tool reference

### `list_tags`

```json
{
  "owner":    "ibm-webmethods",
  "repo":     "stig-hardened-base-images",
  "per_page": 10
}
```

### `add_pr_reviewers`

```json
{
  "owner":       "vidhya03",
  "repo":        "my-repo",
  "pull_number": 42,
  "reviewers":   ["teammate1", "teammate2"]
}
```

### `add_pr_assignees`

```json
{
  "owner":       "vidhya03",
  "repo":        "my-repo",
  "pull_number": 42,
  "assignees":   ["vidhya03"]
}
```

### `set_pr_labels`

```json
{
  "owner":       "vidhya03",
  "repo":        "my-repo",
  "pull_number": 42,
  "labels":      ["cve-remediation", "severity:critical"],
  "replace":     true
}
```

### `create_label`

```json
{
  "owner":       "vidhya03",
  "repo":        "my-repo",
  "name":        "severity:critical",
  "color":       "d73a4a",
  "description": "CVE with CVSS score 9.0+"
}
```

## Running locally

```bash
GITHUB_TOKEN=ghp_xxx node index.js
```

You should see:

```
github-extra-mcp running
```

## Contributing

PRs welcome. If you find another gap in the official `github-mcp` toolset,
open an issue and we can add it here.

## License

MIT © [Vidhya](https://github.com/vidhya03)
