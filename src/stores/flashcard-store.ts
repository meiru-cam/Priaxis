/**
 * Flashcard Store
 * 
 * Zustand store for managing flashcard state, review sessions,
 * and persisting progress locally.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
    Flashcard,
    FlashcardProgress,
    DeckStats,
    ReviewSession,
    SRSettings,
    NewFlashcardInput,
} from '../types/flashcard';
import { DEFAULT_SR_SETTINGS } from '../types/flashcard';
import { getUniqueDecks } from '../lib/flashcard-parser';
import {
    calculateNextReview,
    getDueCards,
    calculateStats,
    getIntervalPreview,
    formatInterval
} from '../lib/sm2-algorithm';
import { mcpClient } from '../lib/mcp';

interface FlashcardStore {
    // Data
    flashcards: Flashcard[];
    progress: Record<string, FlashcardProgress>;
    decks: string[];

    // Settings
    settings: SRSettings;

    // Loading state
    isLoading: boolean;
    error: string | null;
    errorCode: 'NO_DUE_CARDS' | null;
    lastSync: string | null;

    // Review session
    session: ReviewSession | null;
    showAnswer: boolean;
    showHint: boolean;

    // Actions - Data
    loadFlashcards: () => Promise<void>;
    refreshFromVault: () => Promise<void>;
    addCard: (input: NewFlashcardInput) => Promise<void>;
    importData: (data: { flashcards: Flashcard[]; progress: Record<string, FlashcardProgress> }) => void;

    // Actions - Review
    startReview: (deckName?: string | null) => void;
    endReview: () => void;
    flipCard: () => void;
    toggleHint: () => void;
    submitReview: (rating: 'easy' | 'good' | 'hard') => void;

    // Actions - Settings
    updateSettings: (settings: Partial<SRSettings>) => void;

    // Actions - Utilities
    openInObsidian: (card: Flashcard) => void;
    getDeckStats: () => DeckStats[];
    getReviewableCount: (deckName?: string | null) => number;
    getCurrentCard: () => Flashcard | null;
    getIntervalPreview: (language?: 'zh' | 'en') => { hard: string; good: string; easy: string } | null;
}

// Vault path from environment
const VAULT_PATH = import.meta.env.VITE_OBSIDIAN_VAULT_PATH || '';

export const useFlashcardStore = create<FlashcardStore>()(
    persist(
        (set, get) => ({
            // Initial state
            flashcards: [],
            progress: {},
            decks: [],
            settings: DEFAULT_SR_SETTINGS,
            isLoading: false,
            error: null,
            errorCode: null,
            lastSync: null,
            session: null,
            showAnswer: false,
            showHint: false,

            // Load flashcards from vault via MCP
            loadFlashcards: async () => {
                const { flashcards, lastSync } = get();

                // If we have cached data and it's less than 5 minutes old, skip
                if (flashcards.length > 0 && lastSync) {
                    const elapsed = Date.now() - new Date(lastSync).getTime();
                    if (elapsed < 5 * 60 * 1000) {
                        return;
                    }
                }

                await get().refreshFromVault();
            },

            refreshFromVault: async () => {
                // LOCAL-ONLY MODE: MCP sync is disabled
                // Cards are stored in localStorage via Zustand persist
                // Use "+ Add Card" to create cards manually

                const { flashcards: existingCards } = get();

                set({
                    isLoading: false,
                    error: null,
                    errorCode: null,
                    lastSync: new Date().toISOString(),
                });

                if (existingCards.length === 0) {
                    console.log('[FlashcardStore] No cards yet. Use + Add Card to create cards.');
                } else {
                    console.log(`[FlashcardStore] Loaded ${existingCards.length} cards from local storage`);
                }
            },

            // Add a new card
            addCard: async (input: NewFlashcardInput) => {
                try {
                    // Generate ID for new card
                    const timestamp = Date.now();
                    const id = `local-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;

                    // Create new flashcard object
                    const newCard: Flashcard = {
                        id,
                        deck: input.deck,
                        question: input.question,
                        answer: input.answer,
                        hint: input.hint,
                        imageUrl: input.imageUrl,
                        sourceFile: `flashcards/${input.deck}.md`,
                        sourceLine: 0,
                        type: 'basic',
                        createdAt: new Date().toISOString(),
                    };

                    // Format as markdown for Obsidian
                    const cardMarkdown = input.hint
                        ? `\n${input.question} ;; ${input.answer} ;; ${input.hint}\n`
                        : `\n${input.question} ;; ${input.answer}\n`;

                    // Try to append to Obsidian file via MCP
                    try {
                        const targetFile = `flashcards/${input.deck}.md`;
                        await mcpClient.callTool('edit-note', {
                            name: targetFile,
                            content: cardMarkdown,
                            mode: 'append',
                        });
                        console.log(`[FlashcardStore] Appended card to ${targetFile}`);
                    } catch (mcpError) {
                        console.warn('[FlashcardStore] Could not sync to Obsidian:', mcpError);
                        // Continue anyway - card will be stored locally
                    }

                    // Add to local state
                    set(state => {
                        const newDecks = state.decks.includes(input.deck)
                            ? state.decks
                            : [...state.decks, input.deck].sort();

                        return {
                            flashcards: [...state.flashcards, newCard],
                            decks: newDecks,
                            error: null,
                            errorCode: null,
                        };
                    });

                    console.log(`[FlashcardStore] Added card: ${id}`);

                } catch (error: unknown) {
                    console.error('[FlashcardStore] Failed to add card:', error);
                    set({ error: `Failed to add card: ${error instanceof Error ? error.message : 'Unknown error'}` });
                    throw error;
                }
            },

            // Import data from backup
            importData: (data) => {
                const { flashcards: importedCards, progress: importedProgress } = data;

                set(state => {
                    // Merge imported cards (avoid duplicates by ID)
                    const existingIds = new Set(state.flashcards.map(c => c.id));
                    const newCards = importedCards.filter(c => !existingIds.has(c.id));
                    const allCards = [...state.flashcards, ...newCards];

                    // Merge progress
                    const mergedProgress = {
                        ...state.progress,
                        ...importedProgress,
                    };

                    // Update decks
                    const allDecks = getUniqueDecks(allCards);

                    return {
                        flashcards: allCards,
                        progress: mergedProgress,
                        decks: allDecks,
                        lastSync: new Date().toISOString(),
                    };
                });

                console.log(`[FlashcardStore] Imported ${importedCards.length} cards`);
            },

            // Start a review session
            startReview: (deckName = null) => {
                const { flashcards, progress, settings } = get();

                // Filter by deck if specified
                const eligibleCards = deckName
                    ? flashcards.filter(c => c.deck === deckName)
                    : flashcards;

                // Get due cards
                const dueCardIds = getDueCards(
                    eligibleCards.map(c => c.id),
                    progress,
                    settings.dailyLimit
                );

                // Build queue
                const queue = dueCardIds
                    .map(id => eligibleCards.find(c => c.id === id))
                    .filter((c): c is Flashcard => c !== undefined);

                if (queue.length === 0) {
                    set({ error: 'No cards due for review!', errorCode: 'NO_DUE_CARDS' });
                    return;
                }

                set({
                    session: {
                        deckName,
                        queue,
                        currentIndex: 0,
                        stats: { reviewed: 0, easy: 0, good: 0, hard: 0 },
                        startedAt: new Date().toISOString(),
                    },
                    showAnswer: false,
                    showHint: false,
                    error: null,
                    errorCode: null,
                });
            },

            // End review session
            endReview: () => {
                set({ session: null, showAnswer: false, showHint: false });
            },

            // Flip card to show answer
            flipCard: () => {
                set({ showAnswer: true });
            },

            // Toggle hint visibility
            toggleHint: () => {
                set(state => ({ showHint: !state.showHint }));
            },

            // Submit review rating
            submitReview: (rating) => {
                const { session, progress } = get();
                if (!session) return;

                const currentCard = session.queue[session.currentIndex];
                if (!currentCard) return;

                // Calculate new progress
                const currentProgress = progress[currentCard.id];
                const newProgress = calculateNextReview(
                    currentProgress ? { ...currentProgress, cardId: currentCard.id } : undefined,
                    rating
                );
                newProgress.cardId = currentCard.id;

                // Update stats
                const newStats = { ...session.stats };
                newStats.reviewed++;
                newStats[rating]++;

                // Move to next card or end session
                const nextIndex = session.currentIndex + 1;
                const isComplete = nextIndex >= session.queue.length;

                set(state => ({
                    progress: {
                        ...state.progress,
                        [currentCard.id]: newProgress,
                    },
                    session: isComplete ? null : {
                        ...session,
                        currentIndex: nextIndex,
                        stats: newStats,
                    },
                    showAnswer: false,
                    showHint: false,
                }));

                if (isComplete) {
                    console.log(`[FlashcardStore] Session complete! Reviewed: ${newStats.reviewed}`);
                }
            },

            // Update settings
            updateSettings: (newSettings) => {
                set(state => ({
                    settings: { ...state.settings, ...newSettings }
                }));
            },

            // Open card source in Obsidian
            openInObsidian: (card) => {
                const obsidianUrl = `obsidian://open?vault=${encodeURIComponent(VAULT_PATH)}&file=${encodeURIComponent(card.sourceFile)}`;
                window.open(obsidianUrl, '_blank', 'noopener,noreferrer');
            },

            // Get deck statistics
            getDeckStats: () => {
                const { flashcards, progress, decks } = get();

                return decks.map(deckName => {
                    const deckCards = flashcards.filter(c => c.deck === deckName);
                    const stats = calculateStats(
                        deckCards.map(c => c.id),
                        progress
                    );

                    return {
                        deckName,
                        totalCards: stats.total,
                        dueToday: stats.dueToday,
                        newCards: stats.new,
                        masteredCards: stats.mastered,
                    };
                });
            },

            getReviewableCount: (deckName = null) => {
                const { flashcards, progress, settings } = get();

                const eligibleCards = deckName
                    ? flashcards.filter(c => c.deck === deckName)
                    : flashcards;

                return getDueCards(
                    eligibleCards.map(c => c.id),
                    progress,
                    settings.dailyLimit
                ).length;
            },

            // Get current card in session
            getCurrentCard: () => {
                const { session } = get();
                if (!session) return null;
                return session.queue[session.currentIndex] || null;
            },

            // Get interval preview for current card
            getIntervalPreview: (language = 'en') => {
                const { session, progress } = get();
                if (!session) return null;

                const currentCard = session.queue[session.currentIndex];
                if (!currentCard) return null;

                const currentProgress = progress[currentCard.id];
                const preview = getIntervalPreview(currentProgress);

                return {
                    hard: formatInterval(preview.hard, language),
                    good: formatInterval(preview.good, language),
                    easy: formatInterval(preview.easy, language),
                };
            },
        }),
        {
            name: 'flashcard-storage',
            partialize: (state) => ({
                progress: state.progress,
                settings: state.settings,
                flashcards: state.flashcards,
                decks: state.decks,
                lastSync: state.lastSync,
            }),
        }
    )
);
