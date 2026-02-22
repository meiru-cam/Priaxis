/**
 * Base AI Service
 * 处理所有 AI 提供商的连接、配置、限流和基础调用逻辑
 * 为 Coach 和 Friend 提供共享的基础设施
 * 支持 Function Calling
 */

import type { Content, Part } from '@google/genai';
import { toolsList, executeTool, type ToolDefinition } from '../lib/ai/tools';
import {
    AI_PROVIDER,
    GEMINI_MODEL,
    OPENAI_MODEL,
    proxyGeminiGenerate,
    proxyOpenAIChat,
} from '../lib/ai/provider-proxy';

// ==================== Configuration ====================

// Provider/model configuration is read from env, while API keys are server-side only.

// ==================== Types ====================

export interface AIServiceOptions {
    systemPrompt: string;
    role: 'coach' | 'friend';
}

export interface ToolCallResult {
    textResponse: string | null;
    toolsExecuted: { name: string; result: unknown }[];
}

interface GeminiFunctionCall {
    name: string;
    args?: Record<string, unknown>;
}

interface GeminiPartWithFunctionCall extends Part {
    functionCall: GeminiFunctionCall;
}

interface GeminiResponseShape {
    candidates?: Array<{
        content?: {
            parts?: Part[];
        };
    }>;
}

function hasFunctionCall(part: Part): part is GeminiPartWithFunctionCall {
    return 'functionCall' in part && !!part.functionCall;
}

function normalizeOpenAISchema(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => normalizeOpenAISchema(item));
    }
    if (!value || typeof value !== 'object') {
        return value;
    }

    const schema = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    const typeMap: Record<string, string> = {
        OBJECT: 'object',
        STRING: 'string',
        NUMBER: 'number',
        BOOLEAN: 'boolean',
        ARRAY: 'array',
        INTEGER: 'integer',
    };

    for (const [key, raw] of Object.entries(schema)) {
        if (key === 'type' && typeof raw === 'string') {
            normalized[key] = typeMap[raw] || raw.toLowerCase();
            continue;
        }
        normalized[key] = normalizeOpenAISchema(raw);
    }
    return normalized;
}

// ==================== Base Service Class ====================

export abstract class BaseAIService {
    protected isAvailable: boolean;
    protected isRateLimited: boolean = false;
    protected rateLimitResetTime: number = 0;
    protected provider: 'openai' | 'gemini';
    protected lastInteractionId: string | null = null; // For Gemini multi-turn
    protected systemPrompt: string;
    protected role: 'coach' | 'friend';

    // Rate limiting
    private lastRequestTime = 0;
    private MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

    private isRateLimitError(error: unknown): boolean {
        const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
        return (
            msg.includes('429') ||
            msg.includes('quota') ||
            msg.includes('rate') ||
            msg.includes('limit reached')
        );
    }

    constructor(options: AIServiceOptions) {
        this.provider = AI_PROVIDER;
        this.systemPrompt = options.systemPrompt;
        this.role = options.role;

        if (this.provider === 'openai') {
            this.isAvailable = true;
            console.log(`[${options.role}] Using OpenAI via secure proxy with model: ${OPENAI_MODEL}`);
        } else {
            this.isAvailable = true;
            console.log(`[${options.role}] Using Gemini via secure proxy with model: ${GEMINI_MODEL}`);
        }
    }

    /**
     * 获取当前使用的 AI 提供商
     */
    getProvider(): string {
        return this.provider;
    }

    /**
     * 获取当前使用的模型
     */
    getModel(): string {
        return this.provider === 'openai' ? OPENAI_MODEL : GEMINI_MODEL;
    }

    /**
     * Set the system prompt dynamically (for i18n)
     */
    setSystemPrompt(prompt: string) {
        this.systemPrompt = prompt;
    }

    /**
     * 检查服务是否可用
     */
    checkAvailability(): boolean {
        return this.isAvailable && !this.isRateLimited;
    }

    /**
     * 重置对话上下文
     */
    resetConversation(): void {
        this.lastInteractionId = null;
    }

    /**
     * 核心 API 调用方法 (带限流和重试) - 不含 Function Calling
     */
    protected async callAI(prompt: string, continueConversation: boolean = false): Promise<string | null> {
        // Check if currently rate limited
        if (this.isRateLimited && Date.now() < this.rateLimitResetTime) {
            console.log('[AI-Base] Rate limited, skipping request');
            return null;
        }

        // Ensure minimum interval between requests
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
            await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
        }
        this.lastRequestTime = Date.now();

        console.debug(`[AI-Base] Sending request to ${this.provider}. Prompt preview: ${prompt.substring(0, 50)}...`);

        if (this.provider === 'openai') {
            try {
                return await this.callOpenAI(prompt);
            } catch (error: unknown) {
                console.error('[AI-Base] OpenAI call failed:', error);
                if (this.isRateLimitError(error)) {
                    this.isRateLimited = true;
                    this.rateLimitResetTime = Date.now() + 60000;
                }
                throw error;
            }
        }

        if (this.provider === 'gemini') {
            try {
                return await this.callGemini(prompt, continueConversation);
            } catch (error: unknown) {
                console.error('[AI-Base] Gemini call failed:', error);
                // Per-request fallback: if Gemini is rate-limited, use OpenAI for this request.
                if (this.isRateLimitError(error)) {
                    console.warn('[AI-Base] Gemini 429/limit reached. Falling back to OpenAI for this request.');
                    return await this.callOpenAI(prompt);
                }
                throw error;
            }
        }

        return null;
    }

    /**
     * 带 Function Calling 的 API 调用
     * 根据 .env 的 VITE_AI_PROVIDER 走 OpenAI 或 Gemini
     */
    async callAIWithTools(
        userMessage: string,
        conversationHistory: Content[] = [],
        customTools?: ToolDefinition[]
    ): Promise<ToolCallResult> {
        if (!this.checkAvailability()) {
            return { textResponse: null, toolsExecuted: [] };
        }

        // Rate limiting
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
            await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
        }
        this.lastRequestTime = Date.now();

        const tools = customTools || toolsList;
        const toolsExecuted: { name: string; result: unknown }[] = [];

        if (this.provider === 'openai') {
            return this.callOpenAIWithTools(userMessage, conversationHistory, tools);
        }

        const contents: Content[] = [...conversationHistory, { role: 'user', parts: [{ text: userMessage }] }];

        try {
            if (this.provider === 'gemini') {
                try {
                    const textResponse = await this.processGeminiToolLoop(contents, tools, toolsExecuted);
                    return { textResponse, toolsExecuted };
                } catch (error: unknown) {
                    // Per-request fallback: if Gemini tool-call path is rate-limited, use OpenAI tool-calling.
                    if (this.isRateLimitError(error)) {
                        console.warn('[AI-Base] Gemini tools 429/limit reached. Falling back to OpenAI tools for this request.');
                        return this.callOpenAIWithTools(userMessage, conversationHistory, tools);
                    }
                    throw error;
                }
            }
            return { textResponse: null, toolsExecuted };

        } catch (error: unknown) {
            console.error('[AI-Base] Tool call failed:', error);

            // Check for rate limit error
            if (this.isRateLimitError(error)) {
                console.warn('[AI-Base] Rate limited by API (Tools), switching to fallback mode');
                this.isRateLimited = true;
                this.rateLimitResetTime = Date.now() + 60000; // Reset after 60 seconds
            }

            return { textResponse: null, toolsExecuted };
        }
    }

    private async processGeminiToolLoop(
        initialContents: Content[],
        tools: ToolDefinition[],
        toolsExecuted: { name: string; result: unknown }[],
        depth = 0
    ): Promise<string | null> {
        if (depth > 5) {
            console.warn('[AI-Base] Max tool call depth reached');
            return null;
        }

        const response = await this.callGeminiWithTools(initialContents, tools);
        if (!response) return null;

        const candidates = (response as GeminiResponseShape).candidates;
        if (!candidates || candidates.length === 0) return null;

        const content = candidates[0].content;
        if (!content || !content.parts) return null;

        const parts = content.parts as Part[];
        const textPart = parts.find((part) => 'text' in part && typeof part.text === 'string');
        const functionCalls = parts.filter(hasFunctionCall);

        if (functionCalls.length === 0) {
            return textPart?.text || null;
        }

        const toolOutputs: Part[] = [];
        for (const call of functionCalls) {
            const fn = call.functionCall;
            console.log(`[${this.role}] Executing tool: ${fn.name}`, fn.args);
            const result = await executeTool(fn.name, fn.args || {});
            toolsExecuted.push({ name: fn.name, result });

            toolOutputs.push({
                functionResponse: {
                    name: fn.name,
                    response: { result },
                },
            });
        }

        const nextContents: Content[] = [
            ...initialContents,
            { role: 'model', parts },
            { role: 'user', parts: toolOutputs },
        ];
        return this.processGeminiToolLoop(nextContents, tools, toolsExecuted, depth + 1);
    }

    /**
     * 调用 OpenAI API (带 Function Calling)
     */
    private async callOpenAIWithTools(
        userMessage: string,
        conversationHistory: Content[],
        tools: ToolDefinition[]
    ): Promise<ToolCallResult> {
        const toolsExecuted: { name: string; result: unknown }[] = [];
        const openAITools = tools.map((tool) => ({
            type: 'function' as const,
            function: {
                name: tool.name,
                description: tool.description,
                parameters: normalizeOpenAISchema({
                    type: 'object',
                    properties: tool.parameters.properties || {},
                    required: tool.parameters.required || [],
                }),
            },
        }));

        const historyMessages = conversationHistory
            .map((msg): Record<string, unknown> | null => {
                const text = (msg.parts || [])
                    .map((part) => ('text' in part && typeof part.text === 'string' ? part.text : undefined))
                    .filter(Boolean)
                    .join('\n')
                    .trim();

                if (!text) return null;
                return {
                    role: msg.role === 'model' ? 'assistant' : 'user',
                    content: text,
                };
            })
            .filter((msg): msg is Record<string, unknown> => msg !== null);

        const messages: Array<Record<string, unknown>> = [
            { role: 'system', content: this.systemPrompt },
            ...historyMessages,
            { role: 'user', content: userMessage },
        ];

        for (let depth = 0; depth <= 5; depth++) {
            const response = await proxyOpenAIChat({
                model: OPENAI_MODEL,
                messages,
                tools: openAITools,
                tool_choice: 'auto',
                temperature: 0.7,
                max_tokens: 700,
            });

            const choices = Array.isArray(response.choices) ? response.choices as Array<Record<string, unknown>> : [];
            const assistantMessage = (choices[0]?.message || null) as Record<string, unknown> | null;
            if (!assistantMessage) {
                return { textResponse: null, toolsExecuted };
            }

            const toolCalls = Array.isArray(assistantMessage.tool_calls) ? assistantMessage.tool_calls as Array<Record<string, unknown>> : [];
            const assistantContent = typeof assistantMessage.content === 'string' ? assistantMessage.content : '';

            if (toolCalls.length === 0) {
                return {
                    textResponse: typeof assistantContent === 'string' ? assistantContent : null,
                    toolsExecuted,
                };
            }

            messages.push({
                role: 'assistant',
                content: assistantContent || '',
                tool_calls: toolCalls,
            });

            for (const call of toolCalls) {
                if (call.type !== 'function') continue;
                const fn = call.function as { name?: string; arguments?: string } | undefined;
                if (!fn?.name) continue;

                let args: Record<string, unknown> = {};
                try {
                    args = fn.arguments ? JSON.parse(fn.arguments) : {};
                } catch {
                    args = {};
                }

                console.log(`[${this.role}] Executing tool: ${fn.name}`, args);
                const result = await executeTool(fn.name, args);
                toolsExecuted.push({ name: fn.name, result });

                messages.push({
                    role: 'tool',
                    tool_call_id: call.id,
                    content: JSON.stringify(result),
                });
            }
        }

        console.warn('[AI-Base] Max tool call depth reached (OpenAI)');
        return { textResponse: null, toolsExecuted };
    }

    /**
     * 调用 OpenAI API
     */
    private async callOpenAI(prompt: string): Promise<string> {
        const response = await proxyOpenAIChat({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: this.systemPrompt },
                { role: 'user', content: prompt }
            ],
            max_tokens: 500,
            temperature: 0.7,
        });

        const choices = Array.isArray(response.choices) ? response.choices as Array<Record<string, unknown>> : [];
        const message = (choices[0]?.message || null) as Record<string, unknown> | null;
        return typeof message?.content === 'string' ? message.content : '';
    }

    /**
     * 调用 Gemini API (无 tools)
     */
    private async callGemini(prompt: string, continueConversation: boolean = false): Promise<string> {
        // Combine system prompt with user prompt
        const fullPrompt = this.systemPrompt
            ? `${this.systemPrompt}\n\n---\n\n用户消息：${prompt}`
            : prompt;

        const input = continueConversation && this.lastInteractionId ? prompt : fullPrompt;

        const response = await proxyGeminiGenerate({
            model: GEMINI_MODEL,
            contents: [{ role: 'user', parts: [{ text: input }] }],
        });

        const candidates = (response as GeminiResponseShape).candidates;
        const parts = candidates?.[0]?.content?.parts || [];
        const textPart = parts.find((part) => 'text' in part && typeof part.text === 'string');
        if (textPart && typeof textPart.text === 'string') {
            return textPart.text;
        }

        console.warn('[AI-Base] Gemini returned no text output');
        return '';
    }

    /**
     * 调用 Gemini API (带 Function Calling)
     */
    private async callGeminiWithTools(contents: Content[], tools: ToolDefinition[]): Promise<unknown> {
        return proxyGeminiGenerate({
            model: GEMINI_MODEL,
            config: {
                systemInstruction: this.systemPrompt,
                tools: [{ functionDeclarations: tools }],
            },
            contents,
        });
    }
}
