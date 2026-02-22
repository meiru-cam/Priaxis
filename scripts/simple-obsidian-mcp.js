/**
 * Simple Obsidian MCP Server
 * 
 * A minimal implementation of MCP (Model Context Protocol) for local file access.
 * Communicates via Stdio (JSON-RPC 2.0).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Environment variables are inherited from the parent process (which runs dotenv)

const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH;

// Logging helper (goes to stderr to avoid polluting stdout json-rpc)
function log(...args) {
    console.error('[ObsidianMCP]', ...args);
}

if (!VAULT_PATH) {
    log('ERROR: OBSIDIAN_VAULT_PATH is not set in environment or .env');
} else {
    log(`Initialized with Vault: ${VAULT_PATH}`);
}

/**
 * Scan directory recursively
 */
function searchFiles(dir, query, limit = 10) {
    let results = [];
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir);

    for (const file of files) {
        if (file.startsWith('.')) continue; // Skip hidden
        if (results.length >= limit) break;

        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            results = results.concat(searchFiles(fullPath, query, limit - results.length));
        } else if (file.toLowerCase().endsWith('.md')) {
            // Simple logic: match filename or content
            if (file.toLowerCase().includes(query.toLowerCase())) {
                results.push(fullPath);
            } else {
                // Only read content if filename doesn't match to save IO?
                // For now, let's keep it simple: only match filename
                // Implementing full grep in JS might be slow.
                // Let's try to match content too if file is small (< 100KB)
                if (stat.size < 100 * 1024) {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    if (content.toLowerCase().includes(query.toLowerCase())) {
                        results.push(fullPath);
                    }
                }
            }
        }
    }
    return results;
}

/**
 * JSON-RPC Handler
 */
async function handleRequest(request) {
    const { id, method, params } = request;

    switch (method) {
        case 'initialize':
            return {
                protocolVersion: '2024-11-05',
                capabilities: {
                    tools: {}
                },
                serverInfo: {
                    name: 'simple-obsidian-mcp',
                    version: '1.0.0'
                }
            };

        case 'tools/list':
            return {
                tools: [
                    {
                        name: 'obsidian_search',
                        description: 'Search for notes in the Obsidian Vault by keyword. Matches filename or content.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                query: { type: 'string', description: 'The search keyword' }
                            },
                            required: ['query']
                        }
                    },
                    {
                        name: 'obsidian_read',
                        description: 'Read the content of a specific note file.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                filepath: { type: 'string', description: 'Absolute path to the file' }
                            },
                            required: ['filepath']
                        }
                    }
                ]
            };

        case 'tools/call':
            if (params.name === 'obsidian_search') {
                if (!VAULT_PATH) throw new Error('Vault Path not configured');
                const { query } = params.arguments;
                log(`Executing search: ${query}`);
                const files = searchFiles(VAULT_PATH, query, 10);
                return {
                    content: [
                        {
                            type: 'text',
                            text: files.length > 0
                                ? files.map(f => f.replace(VAULT_PATH, '')).join('\n')
                                : 'No matches found.'
                        }
                    ]
                };
            }

            if (params.name === 'obsidian_read') {
                const { path: filePath } = params.arguments;
                // Security check: ensure path is within vault
                let safePath = filePath;
                if (!filePath.startsWith(VAULT_PATH)) {
                    // Try to resolve relative path
                    safePath = path.join(VAULT_PATH, filePath.replace(/^\//, '')); // Remove leading slash if present in relative
                }

                if (!safePath.startsWith(VAULT_PATH)) {
                    throw new Error('Access denied: Path outside vault');
                }

                if (fs.existsSync(safePath)) {
                    const content = fs.readFileSync(safePath, 'utf-8');
                    return {
                        content: [{ type: 'text', text: content }]
                    };
                } else {
                    throw new Error(`File not found: ${filePath}`);
                }
            }
            throw new Error(`Unknown tool: ${params.name}`);

        case 'notifications/initialized':
            return null; // No response needed

        default:
            // Ignore other methods or ping
            return null;
    }
}

// Stdin listener
process.stdin.setEncoding('utf8');

let buffer = '';

process.stdin.on('data', async (chunk) => {
    buffer += chunk;

    // Handle multiple messages in one chunk or split messages
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.trim()) {
            try {
                const request = JSON.parse(line);
                const result = await handleRequest(request);

                if (result !== null && request.id) {
                    const response = {
                        jsonrpc: '2.0',
                        id: request.id,
                        result
                    };
                    console.log(JSON.stringify(response));
                }
            } catch (error) {
                log('Error handling request:', error.message);
                // Only verify id if it was a request
                const reqId = tryExtractId(line);
                if (reqId) {
                    console.log(JSON.stringify({
                        jsonrpc: '2.0',
                        id: reqId,
                        error: { code: -32603, message: error.message }
                    }));
                }
            }
        }
    }
});

function tryExtractId(jsonStr) {
    try {
        return JSON.parse(jsonStr).id;
    } catch {
        return null;
    }
}

log('Server running...');
