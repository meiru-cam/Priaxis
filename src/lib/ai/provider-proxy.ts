import type { Content } from '@google/genai';

export const AI_PROVIDER = (import.meta.env.VITE_AI_PROVIDER || 'gemini') as 'openai' | 'gemini';
export const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini';
export const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';
const BRIDGE_TOKEN = import.meta.env.VITE_BRIDGE_TOKEN || '';

interface OpenAIChatRequest {
  model: string;
  messages: Array<Record<string, unknown>>;
  tools?: Array<Record<string, unknown>>;
  tool_choice?: 'auto';
  response_format?: { type: 'json_object' };
  temperature?: number;
  max_tokens?: number;
}

interface GeminiGenerateRequest {
  model: string;
  config?: Record<string, unknown>;
  contents: Content[];
}

function normalizeGeminiBody(payload: GeminiGenerateRequest): Record<string, unknown> {
  const rawConfig = (payload.config && typeof payload.config === 'object') ? { ...payload.config } : {};
  const systemInstruction = rawConfig.systemInstruction;
  if (typeof systemInstruction === 'string') {
    rawConfig.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }
  return {
    contents: payload.contents,
    ...rawConfig,
  };
}

async function postJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(BRIDGE_TOKEN ? { 'x-bridge-token': BRIDGE_TOKEN } : {}),
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = raw ? JSON.parse(raw) as Record<string, unknown> : {};
  } catch {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    throw new Error('Invalid JSON response from AI proxy');
  }
  if (!response.ok) {
    const message = (data && typeof data.error === 'string' ? data.error : response.statusText) || 'AI proxy request failed';
    throw new Error(message);
  }
  return data as T;
}

export async function proxyOpenAIChat(payload: OpenAIChatRequest): Promise<Record<string, unknown>> {
  return postJson<Record<string, unknown>>('/mcp/ai/openai/chat', payload as unknown as Record<string, unknown>);
}

export async function proxyGeminiGenerate(payload: GeminiGenerateRequest): Promise<Record<string, unknown>> {
  const normalizedBody = normalizeGeminiBody(payload);
  return postJson<Record<string, unknown>>('/mcp/ai/gemini/generate', {
    model: payload.model,
    body: normalizedBody,
  });
}
