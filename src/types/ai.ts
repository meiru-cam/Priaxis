export type Role = 'user' | 'model' | 'tool';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface ToolCall {
    id: string;
    name: string;
    args: Record<string, JsonValue>;
}

export interface ToolOutput {
    id: string; // Must match ToolCall id
    name: string;
    output: Record<string, JsonValue>;
    isError?: boolean;
}

export interface ToolExecuted {
    name: string;
    result: JsonValue | Record<string, unknown>;
}

export interface ChatMessage {
    id: string;
    role: Role;
    content: string;
    timestamp: number;
    toolCalls?: ToolCall[];
    toolOutputs?: ToolOutput[];
    toolsExecuted?: ToolExecuted[];
}

export interface GlobalAIState {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}
