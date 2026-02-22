import type { Content, Part } from '@google/genai';
import { useChatStore } from '../stores/chat-store';
import { toolsList, executeTool } from '../lib/ai/tools';
import type { ChatMessage } from '../types/ai';
import { GEMINI_MODEL, proxyGeminiGenerate } from '../lib/ai/provider-proxy';

const SYSTEM_PROMPT = `
You are the "Game Master" and intelligent assistant for Earth Online, a gamified life management app.
Your goal Is to help the player (Web Developer, Level 1) manage their life, habits, and finances.

You have access to "Tools" that can read and modify the game state.
- Always use tools when the user asks for information you can retrieve (e.g., "how much money do I have", "what are my tasks").
- Always use tools when the user wants to perform an action (e.g., "add a task", "I spent money").
- If a tool is executed, you will receive the output. Use that output to formulate your final response to the user.
- Be friendly, encouraging, and immersive. Use emojis.
- If the user asks something unrelated to the game/productivity, answer normally as a helpful assistant.
- Language: Simplified Chinese (unless user speaks English).
- Current Context: The user is playing "Earth Online".
`;

interface GeminiResponseShape {
    candidates?: Array<{
        content?: {
            parts?: Part[];
        };
    }>;
}

export class AIAgentService {

    static async sendMessage(content: string) {
        const store = useChatStore.getState();
        const { addMessage, setLoading, setError } = store;

        setLoading(true);
        setError(null);

        // 1. Add User Message to Store
        addMessage({ role: 'user', content });

        try {
            // 2. Prepare History for Gemini
            const currentHistory = [...useChatStore.getState().getMessages()];

            const contents = this.formatHistory(currentHistory);

            // 3. Initial API Call
            await this.chatLoop(contents);

        } catch (err: unknown) {
            console.error('AI Agent Error:', err);
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    }

    // The recursive loop for handling Tool Calls
    private static async chatLoop(contents: Content[], maxTurns = 5) {
        if (maxTurns <= 0) return; // Prevent infinite loops

        const response = await this.callGemini(contents);

        // Check if response has tool calls
        // In @google/genai SDK, structure might be candidates[0].content.parts
        // Note: response type from 'generateContent' is GenerateContentResponse
        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) return;

        const content = candidates[0].content;
        if (!content) return;

        const parts = (content.parts || []) as Part[];
        const textPart = parts.find((p) => 'text' in p && typeof p.text === 'string');
        const functionCalls = parts.filter((p): p is Part & { functionCall: { name: string; args?: Record<string, unknown> } } =>
            'functionCall' in p && !!p.functionCall
        );

        // If there is text, add it to UI
        if (textPart && textPart.text) {
            useChatStore.getState().addMessage({
                role: 'model',
                content: textPart.text
            });
        }

        // If no function calls, we are done
        if (functionCalls.length === 0) {
            return;
        }

        // Handle Tool Calls
        const toolOutputs: Part[] = [];

        // Append model turn to history
        contents.push({
            role: 'model',
            parts: parts
        });

        for (const call of functionCalls) {
            // cast call to any to access functionCall which TS might check
            const { name, args } = call.functionCall;

            console.log(`[AI] Executing tool: ${name}`, args);

            const result = await executeTool(name, args);

            // Create Function Response Part
            toolOutputs.push({
                functionResponse: {
                    name: name,
                    response: { result: result }
                }
            });
        }

        // Add tool outputs
        // Cast strict type
        contents.push({
            role: 'user',
            parts: toolOutputs
        });

        // 4. Recursive Call with updated history
        await this.chatLoop(contents, maxTurns - 1);
    }

    private static async callGemini(contents: Content[]): Promise<GeminiResponseShape> {
        const result = await proxyGeminiGenerate({
            model: GEMINI_MODEL,
            config: {
                systemInstruction: SYSTEM_PROMPT,
                tools: [{ functionDeclarations: toolsList }]
            },
            contents
        });
        return result as GeminiResponseShape;
    }

    private static formatHistory(messages: ChatMessage[]): Content[] {
        return messages.map(m => {
            const parts: Part[] = [];

            if (m.content) {
                parts.push({ text: m.content });
            }

            if (m.toolCalls) {
                m.toolCalls.forEach(tc => {
                    parts.push({
                        functionCall: {
                            name: tc.name,
                            args: tc.args
                        }
                    });
                });
            }

            if (m.toolOutputs) {
                m.toolOutputs.forEach(to => {
                    parts.push({
                        functionResponse: {
                            name: to.name,
                            response: to.output
                        }
                    });
                });
            }

            return {
                role: m.role === 'tool' ? 'function' : m.role,
                parts: parts
            };
        });
    }
}
