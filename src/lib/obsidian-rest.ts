/**
 * Obsidian Local REST API Client
 * 
 * Provides methods to interact with Obsidian via the Local REST API plugin.
 * Used for executing commands (like Spaced Repetition) and file operations.
 */

const API_URL = import.meta.env.VITE_OBSIDIAN_REST_API_URL || 'http://127.0.0.1:27123';
const API_KEY = import.meta.env.VITE_OBSIDIAN_REST_API_KEY || '';

interface CommandInfo {
    id: string;
    name: string;
}

interface SearchResult {
    filename: string;
    score: number;
    matches: { match: { start: number; end: number }; context: string }[];
}

interface FileInfo {
    path: string;
    content?: string;
}

class ObsidianRestClient {
    private baseUrl: string;
    private apiKey: string;
    private isConnected: boolean = false;

    constructor() {
        this.baseUrl = API_URL;
        this.apiKey = API_KEY;
    }

    /**
     * Make authenticated request to Obsidian REST API
     */
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const headers: HeadersInit = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            ...options.headers,
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            if (!response.ok) {
                throw new Error(`Obsidian API Error: ${response.status} ${response.statusText}`);
            }

            // Some endpoints return no content
            if (response.status === 204) {
                return {} as T;
            }

            return await response.json();
        } catch (error: unknown) {
            if (error instanceof Error && error.message.includes('Failed to fetch')) {
                console.warn('[ObsidianRest] Cannot connect - is Obsidian running?');
                this.isConnected = false;
            }
            throw error;
        }
    }

    /**
     * Check if Obsidian REST API is reachable
     */
    async checkConnection(): Promise<boolean> {
        try {
            await this.request<{ status: string }>('/');
            this.isConnected = true;
            console.log('[ObsidianRest] Connected to Obsidian');
            return true;
        } catch {
            this.isConnected = false;
            console.warn('[ObsidianRest] Not connected to Obsidian');
            return false;
        }
    }

    /**
     * Get connection status
     */
    getConnectionStatus(): boolean {
        return this.isConnected;
    }

    /**
     * Get list of available commands
     */
    async getCommands(): Promise<CommandInfo[]> {
        return this.request<CommandInfo[]>('/commands/');
    }

    /**
     * Execute a command by ID
     */
    async executeCommand(commandId: string): Promise<void> {
        await this.request(`/commands/${encodeURIComponent(commandId)}/`, {
            method: 'POST',
        });
    }

    /**
     * Search vault for matching text
     */
    async searchVault(query: string): Promise<SearchResult[]> {
        return this.request<SearchResult[]>(`/search/simple/?query=${encodeURIComponent(query)}`);
    }

    /**
     * Get the currently active file
     */
    async getActiveFile(): Promise<FileInfo | null> {
        try {
            const content = await this.request<string>('/active/', {
                headers: { 'Accept': 'text/markdown' },
            });
            // The API returns the file path in a header or we need to parse it
            return { path: 'active', content: content as unknown as string };
        } catch {
            return null;
        }
    }

    /**
     * Open a file in Obsidian
     */
    async openFile(path: string): Promise<void> {
        await this.request(`/open/${encodeURIComponent(path)}`, {
            method: 'POST',
        });
    }

    // ==================== Spaced Repetition Commands ====================

    /**
     * SR: Review flashcards from all notes
     */
    async srReviewAllFlashcards(): Promise<void> {
        await this.executeCommand('obsidian-spaced-repetition:srs-cram-flashcards');
    }

    /**
     * SR: Open notes review queue in sidebar
     */
    async srOpenReviewQueue(): Promise<void> {
        await this.executeCommand('obsidian-spaced-repetition:srs-open-review-queue-sidebar');
    }

    /**
     * SR: Review note as Easy
     */
    async srReviewEasy(): Promise<void> {
        await this.executeCommand('obsidian-spaced-repetition:srs-note-review-easy');
    }

    /**
     * SR: Review note as Good
     */
    async srReviewGood(): Promise<void> {
        await this.executeCommand('obsidian-spaced-repetition:srs-note-review-good');
    }

    /**
     * SR: Review note as Hard
     */
    async srReviewHard(): Promise<void> {
        await this.executeCommand('obsidian-spaced-repetition:srs-note-review-hard');
    }

    /**
     * SR: Open a note for review
     */
    async srOpenNoteForReview(): Promise<void> {
        await this.executeCommand('obsidian-spaced-repetition:srs-open-note-for-review');
    }

    /**
     * SR: Review flashcards in current note
     */
    async srReviewCurrentNoteFlashcards(): Promise<void> {
        await this.executeCommand('obsidian-spaced-repetition:srs-cram-flashcards-in-note');
    }
}

// Export singleton instance
export const obsidianRest = new ObsidianRestClient();
export type { CommandInfo, SearchResult, FileInfo };
