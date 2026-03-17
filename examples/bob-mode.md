# Using mcp-github-extras with IBM Project Bob

## MCP server setup

Register both the official server and this one in your project-level `.mcp.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}" }
    },
    "github-extra": {
      "command": "node",
      "args": ["./mcp-github-extras/index.js"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}" }
    },
    "jira": { "...": "..." },
    "cve":  { "...": "..." }
  }
}
```

## Bob mode routing rules

Add this to your `.bob/mode.md`:

```markdown
## MCP tool routing

Standard GitHub operations (create PR, push files, create branch, list commits):
→ use `github` server

Extended PR operations (reviewers, assignees, labels, tags):
→ use `github-extra` server

Never call `github-extra` for tools that exist in `github`.
Always prefer the official server for standard operations.
```

## Full CVE remediation flow

```
1.  cve          → get_cve_details(CVE-XXXX-XXXX)
                   returns: severity, affected packages, publish date

2.  github-extra → list_tags(ibm-webmethods, stig-hardened-base-images)
                   returns: latest available patched image tag + SHA

3.  github       → create_branch(fix/cve-xxxx-xxxx)

4.  github       → get_file_contents(path: Dockerfile)
                   read current FROM line

5.  github       → push_files(updated Dockerfile with new base image tag)

6.  github       → create_pull_request(
                     title: "fix: remediate CVE-XXXX-XXXX",
                     body:  "Bumps base image to <tag>. Resolves CVE-XXXX-XXXX.",
                     head:  fix/cve-xxxx-xxxx,
                     base:  main
                   )
                   returns: pull_number

7.  github-extra → create_label(name: "severity:critical", color: "d73a4a")
                   skips gracefully if label already exists

8.  github-extra → set_pr_labels(
                     pull_number: <n>,
                     labels: ["cve-remediation", "severity:critical"],
                     replace: true
                   )

9.  github-extra → add_pr_assignees(pull_number: <n>, assignees: ["vidhya03"])

10. github-extra → add_pr_reviewers(pull_number: <n>, reviewers: ["teammate1"])

11. jira         → update_issue(
                     status: "In Review",
                     comment: "Remediation PR raised: <pr_url>"
                   )
```

## CVE severity → label mapping

| CVSS score | Severity label      | Label color |
|------------|---------------------|-------------|
| 9.0 – 10.0 | `severity:critical` | `d73a4a`    |
| 7.0 – 8.9  | `severity:high`     | `e4e669`    |
| 4.0 – 6.9  | `severity:medium`   | `fbca04`    |
| 0.1 – 3.9  | `severity:low`      | `0e8a16`    |

Always include `cve-remediation` as a base label on every automated PR.
