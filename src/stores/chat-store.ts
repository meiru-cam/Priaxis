import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from '../types/ai';
import { createLooseId } from '../lib/id';

// Simple UUID generator
const generateId = () => createLooseId(12);

export type Persona = 'friend' | 'coach';

// A single conversation session
export interface ChatSession {
    id: string;
    persona: Persona;
    messages: ChatMessage[];
    createdAt: number;
    lastUpdatedAt: number;
    archived: boolean;
    // Preview for history list
    preview: string;
}

interface ChatState {
    // All sessions (active + archived)
    sessions: ChatSession[];

    // Active session ID per persona
    activeSessionId: { friend: string | null; coach: string | null };

    // Current active persona
    activePersona: Persona;

    // Greeting tracking
    lastGreetingTime: number | null;

    // UI state
    isLoading: boolean;
    error: string | null;
    isOpen: boolean;
    showHistory: boolean;

    // Session actions
    createSession: (persona: Persona) => string;
    archiveAndCreateNew: (persona: Persona) => string;
    switchSession: (sessionId: string) => void;
    getActiveSession: () => ChatSession | null;
    getArchivedSessions: (persona: Persona) => ChatSession[];

    // Message actions
    addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;

    // UI actions
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setIsOpen: (isOpen: boolean) => void;
    setShowHistory: (show: boolean) => void;
    setActivePersona: (persona: Persona) => void;

    // Greeting
    markGreetingShown: () => void;
    shouldShowGreeting: () => boolean;

    // Legacy compatibility
    getMessages: () => ChatMessage[];
    clearHistory: (persona?: Persona) => void;
    deleteSession: (sessionId: string) => void;
}

const MAX_ARCHIVED_SESSIONS = 20; // Increased history limit for better UX

export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => ({
            sessions: [],
            activeSessionId: { friend: null, coach: null },
            activePersona: 'friend',
            lastGreetingTime: null,
            isLoading: false,
            error: null,
            isOpen: false,
            showHistory: false,

            createSession: (persona) => {
                const newSession: ChatSession = {
                    id: generateId(),
                    persona,
                    messages: [],
                    createdAt: Date.now(),
                    lastUpdatedAt: Date.now(),
                    archived: false,
                    preview: '',
                };

                set((state) => ({
                    sessions: [...state.sessions, newSession],
                    activeSessionId: {
                        ...state.activeSessionId,
                        [persona]: newSession.id,
                    },
                }));

                return newSession.id;
            },

            archiveAndCreateNew: (persona) => {
                const state = get();
                const currentSessionId = state.activeSessionId[persona];

                // Archive current session if it has messages
                if (currentSessionId) {
                    const currentSession = state.sessions.find(s => s.id === currentSessionId);
                    if (currentSession && currentSession.messages.length > 0) {
                        // Mark as archived
                        set((s) => ({
                            sessions: s.sessions.map(session =>
                                session.id === currentSessionId
                                    ? { ...session, archived: true }
                                    : session
                            ),
                        }));

                        // Clean up old archived sessions (keep max 5)
                        const archived = get().sessions
                            .filter(s => s.persona === persona && s.archived)
                            .sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt);

                        if (archived.length > MAX_ARCHIVED_SESSIONS) {
                            const toDelete = archived.slice(MAX_ARCHIVED_SESSIONS).map(s => s.id);
                            set((s) => ({
                                sessions: s.sessions.filter(session => !toDelete.includes(session.id)),
                            }));
                        }
                    }
                }

                // Create new session
                return get().createSession(persona);
            },

            switchSession: (sessionId) => {
                const session = get().sessions.find(s => s.id === sessionId);
                if (!session) return;

                set((state) => ({
                    activeSessionId: {
                        ...state.activeSessionId,
                        [session.persona]: sessionId,
                    },
                    activePersona: session.persona,
                    showHistory: false,
                }));
            },

            getActiveSession: () => {
                const state = get();
                const sessionId = state.activeSessionId[state.activePersona];
                return state.sessions.find(s => s.id === sessionId) || null;
            },

            getArchivedSessions: (persona) => {
                return get().sessions
                    .filter(s => s.persona === persona && s.archived)
                    .sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt)
                    .slice(0, MAX_ARCHIVED_SESSIONS);
            },

            addMessage: (message) => {
                const state = get();
                let sessionId = state.activeSessionId[state.activePersona];

                // Create session if none exists
                if (!sessionId) {
                    sessionId = state.createSession(state.activePersona);
                }

                const newMessage: ChatMessage = {
                    id: generateId(),
                    timestamp: Date.now(),
                    ...message,
                };

                set((s) => ({
                    sessions: s.sessions.map(session =>
                        session.id === sessionId
                            ? {
                                ...session,
                                messages: [...session.messages, newMessage],
                                lastUpdatedAt: Date.now(),
                                preview: message.content.slice(0, 50),
                            }
                            : session
                    ),
                }));
            },

            setLoading: (loading) => set({ isLoading: loading }),
            setError: (error) => set({ error }),
            setIsOpen: (isOpen) => set({ isOpen }),
            setShowHistory: (show) => set({ showHistory: show }),
            setActivePersona: (persona) => set({ activePersona: persona }),

            markGreetingShown: () => {
                set({ lastGreetingTime: Date.now() });
            },

            shouldShowGreeting: () => {
                const state = get();
                if (state.activePersona !== 'friend') return false;

                if (!state.lastGreetingTime) return true;

                const now = Date.now();
                const hoursSince = (now - state.lastGreetingTime) / (1000 * 60 * 60);
                return hoursSince >= 4; // Greet every 4 hours
            },

            // Legacy compatibility
            getMessages: () => {
                const session = get().getActiveSession();
                return session?.messages || [];
            },

            clearHistory: (persona) => {
                if (persona) {
                    get().archiveAndCreateNew(persona);
                } else {
                    get().archiveAndCreateNew('friend');
                    get().archiveAndCreateNew('coach');
                }
            },

            deleteSession: (sessionId) => {
                set((state) => {
                    // Filter out the session
                    const newSessions = state.sessions.filter(s => s.id !== sessionId);

                    // Check if we deleted an active session
                    const newActiveIds = { ...state.activeSessionId };

                    // If friend active session deleted
                    if (state.activeSessionId.friend === sessionId) {
                        newActiveIds.friend = null;
                    }
                    // If coach active session deleted
                    if (state.activeSessionId.coach === sessionId) {
                        newActiveIds.coach = null;
                    }

                    return {
                        sessions: newSessions,
                        activeSessionId: newActiveIds
                    };
                });

                // If we deleted the active session, strictly create a new one for the current persona
                // We do this outside the set to reuse createSession logic if needed, 
                // but createSession uses 'set' internally so we just call it if ID is missing.
                const state = get();
                const currentPersona = state.activePersona;
                if (!state.activeSessionId[currentPersona]) {
                    state.createSession(currentPersona);
                }
            },
        }),
        {
            name: 'earth-online-chat-storage-v2',
            partialize: (state) => ({
                sessions: state.sessions,
                activeSessionId: state.activeSessionId,
                activePersona: state.activePersona,
                lastGreetingTime: state.lastGreetingTime,
            }),
        }
    )
);
