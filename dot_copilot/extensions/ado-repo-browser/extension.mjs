// Extension: ado-repo-browser
// Browse and read files from Azure DevOps repositories without cloning

import { joinSession } from "@github/copilot-sdk/extension";
import { execSync } from "child_process";

// Parse an ADO git URL into { org, project, repo }
// Handles: https://dev.azure.com/{org}/{project}/_git/{repo}
//          https://{org}@dev.azure.com/{org}/{project}/_git/{repo}
function parseAdoUrl(url) {
    const match = url.match(/dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/([^/?#]+)/);
    if (!match) throw new Error(`Cannot parse ADO URL: ${url}`);
    return { org: match[1], project: match[2], repo: match[3] };
}

function getAuthHeaders() {
    // Try ADO_MCP_AUTH_TOKEN env var first (scoped for API ops)
    const envToken = process.env.ADO_MCP_AUTH_TOKEN;
    if (envToken) {
        const b64 = Buffer.from(`:${envToken}`).toString("base64");
        return { Authorization: `Basic ${b64}` };
    }
    // Fall back to az CLI access token for Azure DevOps resource
    try {
        const raw = execSync(
            "az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798 --query accessToken -o tsv",
            { encoding: "utf8", timeout: 10000 }
        ).trim();
        if (raw) return { Authorization: `Bearer ${raw}` };
    } catch (_) {}
    throw new Error("No ADO credentials available. Set ADO_MCP_AUTH_TOKEN or run `az login`.");
}

async function adoGet(url) {
    const headers = { ...getAuthHeaders(), Accept: "application/json" };
    const res = await fetch(url, { headers });
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`ADO API error ${res.status}: ${body.slice(0, 300)}`);
    }
    return res.json();
}

async function adoGetText(url) {
    const headers = { ...getAuthHeaders(), Accept: "text/plain" };
    const res = await fetch(url, { headers });
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`ADO API error ${res.status}: ${body.slice(0, 300)}`);
    }
    return res.text();
}

const session = await joinSession({
    tools: [
        {
            name: "ado_browse_repo",
            description: "List files and directories in an Azure DevOps repository at a given path. Pass the ADO repo URL and optional path (defaults to root). Returns a file tree.",
            skipPermission: true,
            parameters: {
                type: "object",
                properties: {
                    repo_url: {
                        type: "string",
                        description: "Full ADO git URL, e.g. https://dev.azure.com/MyOrg/MyProject/_git/MyRepo",
                    },
                    path: {
                        type: "string",
                        description: "Path to browse, e.g. /src/features/login. Defaults to / (root).",
                    },
                    branch: {
                        type: "string",
                        description: "Branch name. Defaults to the repo default branch.",
                    },
                    recursive: {
                        type: "boolean",
                        description: "If true, returns all files recursively under the path. Defaults to false (one level only).",
                    },
                },
                required: ["repo_url"],
            },
            handler: async (args) => {
                const { org, project, repo } = parseAdoUrl(args.repo_url);
                const scopePath = args.path ?? "/";
                const recursionLevel = args.recursive ? "Full" : "OneLevel";
                const base = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}/items`;
                const params = new URLSearchParams({
                    scopePath,
                    recursionLevel,
                    "api-version": "7.1",
                    includeContentMetadata: "true",
                });
                if (args.branch) params.set("versionDescriptor.version", args.branch);

                const data = await adoGet(`${base}?${params}`);
                const items = (data.value ?? []).map((item) => {
                    const type = item.gitObjectType === "tree" ? "dir" : "file";
                    return `${type}  ${item.path}`;
                });
                return items.length
                    ? `${items.length} items in ${scopePath}:\n${items.join("\n")}`
                    : `No items found at ${scopePath}`;
            },
        },
        {
            name: "ado_read_file",
            description: "Read the contents of a file from an Azure DevOps repository. Pass the ADO repo URL and file path. Optionally specify branch.",
            skipPermission: true,
            parameters: {
                type: "object",
                properties: {
                    repo_url: {
                        type: "string",
                        description: "Full ADO git URL, e.g. https://dev.azure.com/MyOrg/MyProject/_git/MyRepo",
                    },
                    path: {
                        type: "string",
                        description: "File path within the repo, e.g. /src/features/login/LoginViewModel.kt",
                    },
                    branch: {
                        type: "string",
                        description: "Branch name. Defaults to the repo default branch.",
                    },
                },
                required: ["repo_url", "path"],
            },
            handler: async (args) => {
                const { org, project, repo } = parseAdoUrl(args.repo_url);
                const base = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}/items`;
                const params = new URLSearchParams({
                    path: args.path,
                    "api-version": "7.1",
                    "$format": "text",
                });
                if (args.branch) params.set("versionDescriptor.version", args.branch);

                const content = await adoGetText(`${base}?${params}`);
                // Cap at ~400 lines to avoid flooding context
                const lines = content.split("\n");
                const capped = lines.length > 400;
                const output = lines.slice(0, 400).join("\n");
                return capped
                    ? `${output}\n\n[truncated — ${lines.length} total lines, showing first 400]`
                    : output;
            },
        },
    ],
});
