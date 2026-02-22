/**
 * MCP Bridge Server
 * 
 * Acts as a middleman between the Web App (SSE/HTTP) and Local MCP Servers (Stdio).
 * 
 * Usage: node scripts/mcp-bridge.js
 */

import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ override: true });

const app = express();
const PORT = process.env.BRIDGE_PORT || 3002;
const HOST = process.env.BRIDGE_HOST || '127.0.0.1';
const JSON_BODY_LIMIT = process.env.BRIDGE_JSON_LIMIT || '1mb';
const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN || '';
const REQUIRE_BRIDGE_TOKEN = process.env.BRIDGE_REQUIRE_TOKEN !== 'false';
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const ALLOWED_ORIGINS = (process.env.BRIDGE_ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

if (REQUIRE_BRIDGE_TOKEN && !BRIDGE_TOKEN) {
    console.error('[BRIDGE ERROR] BRIDGE_TOKEN is required. Refusing to start insecure bridge.');
    process.exit(1);
}
if (IS_PRODUCTION && !REQUIRE_BRIDGE_TOKEN) {
    console.error('[BRIDGE ERROR] BRIDGE_REQUIRE_TOKEN cannot be false in production.');
    process.exit(1);
}
if (!REQUIRE_BRIDGE_TOKEN && !BRIDGE_TOKEN) {
    console.warn('[BRIDGE WARN] BRIDGE_TOKEN is empty. Running in local insecure mode.');
}

app.use(cors({
    origin(origin, callback) {
        const isLocalhostOrigin = typeof origin === 'string' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
        if (!origin || ALLOWED_ORIGINS.includes(origin) || isLocalhostOrigin) {
            return callback(null, true);
        }
        // Reject CORS without throwing server error (avoid 500 on EventSource).
        return callback(null, false);
    },
    credentials: false,
}));
app.use(express.json({ limit: JSON_BODY_LIMIT }));

// Vault path from environment
const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || process.env.VITE_OPENAI_MODEL || 'gpt-4o-mini';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';

// Store active MCP process
let mcpProcess = null;
let sseClients = [];
let nextClientId = 1;

function isLoopbackAddress(rawAddress) {
    if (typeof rawAddress !== 'string') return false;
    const address = rawAddress.trim();
    return (
        address === '::1' ||
        address === '127.0.0.1' ||
        address.startsWith('127.') ||
        address.startsWith('::ffff:127.')
    );
}

function isAuthorized(req) {
    if (!REQUIRE_BRIDGE_TOKEN) {
        const remoteAddress = req.socket?.remoteAddress || '';
        return isLoopbackAddress(remoteAddress);
    }
    const headerToken = req.headers['x-bridge-token'];
    const queryToken = req.query?.token;
    return headerToken === BRIDGE_TOKEN || queryToken === BRIDGE_TOKEN;
}

function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateRpcMessageBody(body) {
    if (!isPlainObject(body)) return 'Body must be a JSON object.';
    if (body.jsonrpc !== '2.0') return 'jsonrpc must be "2.0".';
    const idType = typeof body.id;
    if (!(idType === 'string' || idType === 'number')) return 'id must be string or number.';
    if (typeof body.method !== 'string' || !body.method.trim()) return 'method must be a non-empty string.';
    if (body.params !== undefined && !isPlainObject(body.params)) return 'params must be an object when provided.';
    return null;
}

function validateOpenAIChatBody(body) {
    if (!isPlainObject(body)) return 'Body must be a JSON object.';
    if (!Array.isArray(body.messages) || body.messages.length === 0) return 'messages must be a non-empty array.';
    if (body.model !== undefined && typeof body.model !== 'string') return 'model must be a string when provided.';
    if (body.tools !== undefined && !Array.isArray(body.tools)) return 'tools must be an array when provided.';
    return null;
}

function validateGeminiBody(body) {
    if (!isPlainObject(body)) return 'Body must be a JSON object.';
    if (body.model !== undefined && typeof body.model !== 'string') return 'model must be a string when provided.';
    if (body.body !== undefined && !isPlainObject(body.body)) return 'body must be an object when provided.';
    if (body.contents !== undefined && !Array.isArray(body.contents)) return 'contents must be an array when provided.';
    if (body.config !== undefined && !isPlainObject(body.config)) return 'config must be an object when provided.';
    return null;
}

async function relayJson(url, options = {}) {
    const response = await fetch(url, options);
    const raw = await response.text();
    let data = {};
    try {
        data = raw ? JSON.parse(raw) : {};
    } catch {
        data = { error: raw || response.statusText };
    }
    if (!response.ok) {
        const message = typeof data?.error?.message === 'string'
            ? data.error.message
            : (typeof data?.error === 'string' ? data.error : response.statusText);
        throw new Error(message || `Upstream request failed: ${response.status}`);
    }
    return data;
}

/**
 * Start the MCP Process
 */
function startMcpProcess() {
    if (mcpProcess) return;

    if (!VAULT_PATH) {
        console.error('[BRIDGE ERROR] OBSIDIAN_VAULT_PATH is not set in .env');
        return;
    }

    console.log('Starting Obsidian MCP Process...');
    console.log(`Using obsidian-mcp with Vault: ${VAULT_PATH}`);

    // Spawn npx obsidian-mcp with the vault path
    mcpProcess = spawn('npx', ['-y', 'obsidian-mcp', VAULT_PATH], {
        stdio: ['pipe', 'pipe', 'pipe'] // stdin, stdout, stderr
    });

    mcpProcess.on('error', (err) => {
        console.error('[BRIDGE ERROR] Failed to spawn MCP process:', err);
    });

    // Handle Stdout (JSON-RPC responses from MCP)
    mcpProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (!line.trim()) return;
            console.log('[MCP OUT]', line);
            // Broadcast to all SSE clients
            broadcastSse({ type: 'mcp-message', data: line });
        });
    });

    // Handle Stderr (Logs from MCP)
    mcpProcess.stderr.on('data', (data) => {
        console.error('[MCP ERR]', data.toString());
    });

    mcpProcess.on('exit', (code) => {
        console.log(`MCP Process exited with code ${code}`);
        mcpProcess = null;
    });
}

/**
 * Broadcast message to SSE clients
 */
function broadcastSse(message) {
    sseClients.forEach(client => {
        try {
            client.res.write(`data: ${JSON.stringify(message)}\n\n`);
        } catch (e) {
            console.error(`[BRIDGE ERROR] Failed to send to client ${client.id}:`, e);
            // Optionally remove client here, but let the 'close' handler do it
        }
    });
}

/**
 * SSE Endpoint - Client connects here to receive events
 */
app.get('/sse', (req, res) => {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);

    const clientId = nextClientId++;
    const newClient = {
        id: clientId,
        res
    };
    sseClients.push(newClient);

    console.log(`SSE Client connected: ${clientId}`);

    // Send initial connected message
    res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

    // Start MCP if not running
    if (!mcpProcess) {
        startMcpProcess();
    }

    // Remove client on close
    req.on('close', () => {
        console.log(`SSE Client disconnected: ${clientId}`);
        sseClients = sseClients.filter(c => c.id !== clientId);
    });
});

/**
 * Message Endpoint - Client sends JSON-RPC requests here
 */
app.post('/message', (req, res) => {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!mcpProcess) {
        return res.status(503).json({ error: 'MCP Process not running' });
    }

    const validationError = validateRpcMessageBody(req.body);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    const message = req.body;
    console.log('[CLIENT IN]', JSON.stringify(message));

    // Write to MCP Stdin (needs newline delimiter for JSON-RPC)
    mcpProcess.stdin.write(JSON.stringify(message) + '\n');

    res.json({ status: 'ok' });
});

/**
 * AI Proxy Endpoints
 * Keeps provider API keys on server side only.
 */
app.post('/ai/openai/chat', async (req, res) => {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const validationError = validateOpenAIChatBody(req.body);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    if (!OPENAI_API_KEY) {
        return res.status(503).json({ error: 'OPENAI_API_KEY is not configured on bridge server' });
    }
    try {
        const body = {
            ...req.body,
            model: req.body?.model || OPENAI_MODEL,
        };
        const data = await relayJson('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify(body),
        });
        return res.json(data);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return res.status(500).json({ error: message });
    }
});

app.post('/ai/gemini/generate', async (req, res) => {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const validationError = validateGeminiBody(req.body);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    if (!GEMINI_API_KEY) {
        return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on bridge server' });
    }
    try {
        const model = req.body?.model || GEMINI_MODEL;
        const requestBody = (req.body?.body && typeof req.body.body === 'object')
            ? req.body.body
            : {
                contents: Array.isArray(req.body?.contents) ? req.body.contents : [],
                ...((req.body?.config && typeof req.body.config === 'object') ? req.body.config : {}),
            };
        if (typeof requestBody.systemInstruction === 'string') {
            requestBody.systemInstruction = {
                parts: [{ text: requestBody.systemInstruction }],
            };
        }
        const data = await relayJson(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            }
        );
        return res.json(data);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return res.status(500).json({ error: message });
    }
});

// Final error handler: return JSON instead of HTML 500 pages.
app.use((err, _req, res, _next) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[BRIDGE ERROR] Unhandled middleware error:', message);
    if (!res.headersSent) {
        return res.status(500).json({ error: message });
    }
});

app.listen(PORT, HOST, () => {
    console.log(`
  🌉 MCP Bridge running at http://${HOST}:${PORT}
  📡 SSE Endpoint: http://${HOST}:${PORT}/sse
  📨 Message Endpoint: http://${HOST}:${PORT}/message
  `);
});
