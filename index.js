#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";

const GH_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const BASE = "https://api.github.com";

const headers = {
  "Authorization": `Bearer ${GH_TOKEN}`,
  "Accept": "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json"
};

async function ghFetch(path, method = "GET", body = null) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

const server = new McpServer({
  name: "github-extra-mcp",
  version: "1.0.0",
  description: "Extended GitHub tools for PR reviewers, assignees, labels, and tags"
});

// ─── Tool 1: list_tags ─────────────────────────────────────────────────────

server.tool(
  "list_tags",
  "List the latest git tags for a repository",
  {
    owner:    z.string().describe("Repository owner or org"),
    repo:     z.string().describe("Repository name"),
    per_page: z.number().optional().default(10).describe("Number of tags to return")
  },
  async ({ owner, repo, per_page }) => {
    const { ok, data } = await ghFetch(
      `/repos/${owner}/${repo}/tags?per_page=${per_page}`
    );
    return {
      content: [{
        type: "text",
        text: ok
          ? JSON.stringify(
              data.map(t => ({ name: t.name, sha: t.commit.sha })),
              null, 2
            )
          : `Error: ${data.message}`
      }]
    };
  }
);

// ─── Tool 2: add_pr_reviewers ──────────────────────────────────────────────

server.tool(
  "add_pr_reviewers",
  "Request reviewers on an existing pull request",
  {
    owner:       z.string().describe("Repository owner or org"),
    repo:        z.string().describe("Repository name"),
    pull_number: z.number().describe("Pull request number"),
    reviewers:   z.array(z.string()).describe("GitHub usernames to add as reviewers")
  },
  async ({ owner, repo, pull_number, reviewers }) => {
    const { ok, data } = await ghFetch(
      `/repos/${owner}/${repo}/pulls/${pull_number}/requested_reviewers`,
      "POST",
      { reviewers }
    );
    return {
      content: [{
        type: "text",
        text: ok
          ? `Reviewers added to PR #${pull_number}: ${reviewers.join(", ")}`
          : `Error: ${data.message}`
      }]
    };
  }
);

// ─── Tool 3: add_pr_assignees ──────────────────────────────────────────────

server.tool(
  "add_pr_assignees",
  "Set assignees on an existing pull request",
  {
    owner:       z.string().describe("Repository owner or org"),
    repo:        z.string().describe("Repository name"),
    pull_number: z.number().describe("Pull request number"),
    assignees:   z.array(z.string()).describe("GitHub usernames to assign")
  },
  async ({ owner, repo, pull_number, assignees }) => {
    const { ok, data } = await ghFetch(
      `/repos/${owner}/${repo}/issues/${pull_number}`,
      "PATCH",
      { assignees }
    );
    return {
      content: [{
        type: "text",
        text: ok
          ? `Assignees set on PR #${pull_number}: ${assignees.join(", ")}`
          : `Error: ${data.message}`
      }]
    };
  }
);

// ─── Tool 4: set_pr_labels ─────────────────────────────────────────────────

server.tool(
  "set_pr_labels",
  "Add or replace labels on an existing pull request",
  {
    owner:       z.string().describe("Repository owner or org"),
    repo:        z.string().describe("Repository name"),
    pull_number: z.number().describe("Pull request number"),
    labels:      z.array(z.string()).describe("Label names to apply"),
    replace:     z.boolean().optional().default(false)
                   .describe("If true, replaces all existing labels. If false, adds to existing.")
  },
  async ({ owner, repo, pull_number, labels, replace }) => {
    const method = replace ? "PUT" : "POST";
    const { ok, data } = await ghFetch(
      `/repos/${owner}/${repo}/issues/${pull_number}/labels`,
      method,
      { labels }
    );
    return {
      content: [{
        type: "text",
        text: ok
          ? `Labels ${replace ? "replaced with" : "added"} on PR #${pull_number}: ${labels.join(", ")}`
          : `Error: ${data.message}`
      }]
    };
  }
);

// ─── Tool 5: create_label ──────────────────────────────────────────────────

server.tool(
  "create_label",
  "Create a label in a repository if it does not already exist",
  {
    owner:       z.string().describe("Repository owner or org"),
    repo:        z.string().describe("Repository name"),
    name:        z.string().describe("Label name e.g. severity:critical"),
    color:       z.string().describe("Hex color without # e.g. d73a4a"),
    description: z.string().optional().default("").describe("Short label description")
  },
  async ({ owner, repo, name, color, description }) => {
    const { ok, status, data } = await ghFetch(
      `/repos/${owner}/${repo}/labels`,
      "POST",
      { name, color, description }
    );
    if (ok) {
      return { content: [{ type: "text", text: `Label created: "${name}" (#${color})` }] };
    }
    if (status === 422) {
      return { content: [{ type: "text", text: `Label "${name}" already exists — skipping.` }] };
    }
    return { content: [{ type: "text", text: `Error: ${data.message}` }] };
  }
);

// ─── Start server ──────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("github-extra-mcp running");
