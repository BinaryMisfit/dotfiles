// Extension: JIRA Context Router
// Intelligently routes defect and feature tickets to correct workflows with pre-loaded context

import { joinSession } from "@github/copilot-sdk/extension";

function getJiraCredentials() {
    const url = process.env.JIRA_URL;
    const username = process.env.JIRA_USERNAME;
    const token = process.env.JIRA_API_TOKEN;
    
    if (!url || !username || !token) {
        throw new Error("Missing JIRA credentials: JIRA_URL, JIRA_USERNAME, JIRA_API_TOKEN");
    }
    
    return { url, username, token };
}

async function jiraFetch(endpoint) {
    const { url, username, token } = getJiraCredentials();
    const auth = Buffer.from(`${username}:${token}`).toString("base64");
    const fullUrl = `${url}/rest/api/3${endpoint}`;
    
    const res = await fetch(fullUrl, {
        headers: {
            Authorization: `Basic ${auth}`,
            Accept: "application/json",
        },
    });
    
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`JIRA API error ${res.status}: ${body.slice(0, 300)}`);
    }
    
    return res.json();
}

// Fetch ticket and return essentials
async function fetchTicket(ticketId) {
    const issue = await jiraFetch(`/issue/${ticketId}`);
    
    return {
        id: issue.key,
        type: issue.fields.issuetype.name, // "Bug", "Story", "Task", etc.
        summary: issue.fields.summary,
        description: issue.fields.description?.content?.[0]?.content?.[0]?.text || "",
        links: (issue.fields.issuelinks || []).map(l => ({
            relation: l.type.name, // "relates to", "is caused by", "implements", etc.
            ticketId: l.outwardIssue?.key || l.inwardIssue?.key,
            summary: l.outwardIssue?.fields?.summary || l.inwardIssue?.fields?.summary,
        })),
        status: issue.fields.status.name,
        priority: issue.fields.priority?.name || "Unknown",
    };
}

// Detect if ticket type is defect-like or feature-like
function classifyTicket(ticket) {
    const defectKeywords = ["bug", "defect", "crash", "error", "fail"];
    const featureKeywords = ["story", "feature", "epic", "enhancement", "improvement"];
    
    const type = ticket.type.toLowerCase();
    
    if (defectKeywords.some(k => type.includes(k))) return "defect";
    if (featureKeywords.some(k => type.includes(k))) return "feature";
    
    return "unknown"; // Task, Investigation, etc.
}

// Main router logic
export async function handleUserMessage(userMessage) {
    // Detect JIRA ticket mentions (UATD-1234, UA-5678, etc.)
    const ticketPattern = /([A-Z]+-\d+)/g;
    const ticketIds = userMessage.match(ticketPattern) || [];
    
    if (ticketIds.length === 0) {
        return null; // No action
    }
    
    const primaryTicketId = ticketIds[0];
    
    try {
        // Fetch primary ticket
        const primaryTicket = await fetchTicket(primaryTicketId);
        const classification = classifyTicket(primaryTicket);
        
        if (classification === "unknown") {
            return null; // Not defect or feature; let user decide
        }
        
        // Build context object for workflow
        const context = {
            primaryTicket: {
                id: primaryTicket.id,
                type: primaryTicket.type,
                summary: primaryTicket.summary,
                description: primaryTicket.description,
                status: primaryTicket.status,
                priority: primaryTicket.priority,
            },
            relatedTickets: [],
        };
        
        // Extract linked tickets (implementations, cause-by, etc.)
        const relatedLinks = primaryTicket.links.filter(l =>
            ["relates to", "is caused by", "implements", "is implemented by", "blocks", "is blocked by"].includes(l.relation.toLowerCase())
        );
        
        // Offer to fetch related tickets conversationally
        let responseMessage = `Found **${primaryTicket.id}** (${primaryTicket.type}): "${primaryTicket.summary}"\n\n`;
        
        if (relatedLinks.length > 0) {
            responseMessage += `Related work found:\n`;
            relatedLinks.forEach(link => {
                responseMessage += `  • ${link.ticketId} (${link.relation}): "${link.summary}"\n`;
            });
            responseMessage += `\nShould I load these for context? (yes/no or specific ticket IDs)`;
        } else {
            responseMessage += `Any related implementations or context tickets I should know about? (or just 'go')`;
        }
        
        // Return interactive response
        return {
            type: "context-collection",
            message: responseMessage,
            primaryTicket,
            relatedLinks,
            classification,
        };
    } catch (error) {
        console.error("Router error:", error);
        return null; // Silently fail; let normal flow continue
    }
}

// After user provides related context, invoke workflow
export async function invokeWorkflow(classification, context) {
    const skillName = classification === "defect" ? "defect-workflow" : "feature-workflow";
    
    // Format context for skill
    const skillContext = {
        tickets: [context.primaryTicket, ...context.relatedTickets],
        autoInvoked: true,
        routerConfidence: "auto-routed based on ticket type",
    };
    
    // User response varies; here we just prep the invocation message
    const ticketList = context.relatedTickets.length > 0 
        ? `${context.primaryTicket.id} (+ context from ${context.relatedTickets.map(t => t.id).join(", ")})`
        : context.primaryTicket.id;
    
    const invocationMessage = 
        classification === "defect"
            ? `Investigate ${ticketList}`
            : `Start feature ${ticketList}`;
    
    return {
        skill: skillName,
        message: invocationMessage,
        context: skillContext,
    };
}

// Export for Copilot CLI
export default {
    name: "jira-context-router",
    description: "Intelligently route defect and feature tickets with pre-loaded related context",
    handleUserMessage,
    invokeWorkflow,
};
