

type JsonRpcId = string | number;

interface RPCRequest {
    jsonrpc: '2.0';
    id: JsonRpcId;
    method: string;
    params?: Record<string, unknown>;
}

interface RPCResponse {
    jsonrpc: '2.0';
    id: JsonRpcId;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}

interface PendingRequest {
    resolve: (val: unknown) => void;
    reject: (err: unknown) => void;
}

class MCPClient {
    private sse: EventSource | null = null;
    private pendingRequests: Map<JsonRpcId, PendingRequest> = new Map();
    private isConnected = false;
    private connectPromise: Promise<void> | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private bridgeToken = import.meta.env.VITE_BRIDGE_TOKEN || '';
    private shouldAutoConnect = import.meta.env.VITE_MCP_AUTOCONNECT === 'true';

    private createRpcId(): JsonRpcId {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `rpc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    constructor() {
        // Auto-connect only when explicitly enabled via env var.
        if (typeof window !== 'undefined' && this.shouldAutoConnect) {
            // Delay connection slightly to avoid hydration issues or eager connection
            setTimeout(() => {
                this.connect().catch((e) => {
                    console.warn('[MCP Client] Initial auto-connect failed', e);
                });
            }, 1000);
        }
    }

    connect(): Promise<void> {
        if (this.isConnected || this.sse?.readyState === EventSource.OPEN) {
            return Promise.resolve();
        }

        if (this.connectPromise) return this.connectPromise;

        this.connectPromise = new Promise((resolve, reject) => {
            console.log('[MCP Client] Connecting to Bridge...');
            let settled = false;

            try {
                const sseUrl = this.bridgeToken ? `/mcp/sse?token=${encodeURIComponent(this.bridgeToken)}` : '/mcp/sse';
                this.sse = new EventSource(sseUrl);

                this.sse.onopen = () => {
                    console.log('[MCP Client] SSE Connected');
                    this.isConnected = true;
                    settled = true;
                    resolve();

                    // Clear any pending reconnect
                    if (this.reconnectTimer) {
                        clearTimeout(this.reconnectTimer);
                        this.reconnectTimer = null;
                    }
                };

                this.sse.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);

                        // Handle bridge messages
                        if (message.type === 'connected') {
                            console.log('[MCP Client] Bridge handshake received', message.clientId);
                        }

                        // Handle MCP JSON-RPC responses
                        if (message.type === 'mcp-message') {
                            let rpcResponse: RPCResponse;
                            try {
                                // The bridge wraps the raw stdout line in 'data'
                                rpcResponse = JSON.parse(message.data);
                            } catch {
                                console.warn('[MCP Client] Failed to parse inner RPC JSON', message.data);
                                return;
                            }

                            if (rpcResponse.id !== undefined) {
                                const pending = this.pendingRequests.get(rpcResponse.id);
                                if (pending) {
                                    this.pendingRequests.delete(rpcResponse.id);

                                    if (rpcResponse.error) {
                                        console.error('[MCP Client] RPC Error:', rpcResponse.error);
                                        pending.reject(new Error(rpcResponse.error.message || 'Unknown RPC Error'));
                                    } else {
                                        pending.resolve(rpcResponse.result);
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.error('[MCP Client] Error parsing SSE message', e);
                    }
                };

                this.sse.onerror = (err) => {
                    console.error('[MCP Client] SSE Error (Bridge might be down)', err);
                    this.isConnected = false;
                    this.sse?.close();
                    this.sse = null;
                    this.connectPromise = null;

                    // Attempt reconnect after 5s
                    if (!this.reconnectTimer) {
                        this.reconnectTimer = setTimeout(() => {
                            this.connect().catch((e) => {
                                console.warn('[MCP Client] Reconnect failed', e);
                            });
                        }, 5000);
                    }

                    if (!settled) {
                        settled = true;
                        reject(new Error('SSE Connection Failed'));
                    }
                };

            } catch (error) {
                this.connectPromise = null;
                reject(error);
            }
        });

        return this.connectPromise;
    }

    /**
     * Call a tool on the MCP server
     */
    async callTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
        if (!this.isConnected) {
            try {
                await this.connect();
            } catch (e) {
                console.warn('[MCP Client] Connection failed, retrying once...', e);
                // Simple retry
                await new Promise(r => setTimeout(r, 1000));
                await this.connect();
            }
        }

        const id = this.createRpcId();

        return new Promise((resolve, reject) => {
            // Timeout after 30s (Obsidian search might differ)
            const timeout = setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error(`MCP Tool ${toolName} timed out after 30s`));
                }
            }, 30000);

            this.pendingRequests.set(id, {
                resolve: (res) => { clearTimeout(timeout); resolve(res); },
                reject: (err) => { clearTimeout(timeout); reject(err); }
            });

            const rpcRequest: RPCRequest = {
                jsonrpc: '2.0',
                id,
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: args
                }
            };

            fetch('/mcp/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.bridgeToken ? { 'x-bridge-token': this.bridgeToken } : {})
                },
                body: JSON.stringify(rpcRequest)
            }).then(res => {
                if (!res.ok) {
                    throw new Error(`Bridge responded with ${res.status}`);
                }
            }).catch(err => {
                clearTimeout(timeout);
                this.pendingRequests.delete(id);
                reject(err);
            });
        });
    }

    /**
     * Check if Obsidian is connected (via simple ping tool or just bridge status)
     * For now, just returns connection status to bridge
     */
    isAvailable(): boolean {
        return this.isConnected;
    }
}

export const mcpClient = new MCPClient();
