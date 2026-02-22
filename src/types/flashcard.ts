/**
 * Flashcard Types
 * 
 * Core data structures for the in-app spaced repetition system.
 */

/**
 * A flashcard parsed from Obsidian markdown
 */
export interface Flashcard {
    /** Unique identifier (hash of file:line:question) */
    id: string;
    /** Deck name (from tag, e.g., "transformer") */
    deck: string;
    /** The question/front side (supports markdown with images/links) */
    question: string;
    /** The answer/back side (supports markdown with images/links) */
    answer: string;
    /** Optional hint (available for cloze cards) */
    hint?: string;
    /** Source Obsidian file path (relative to vault) */
    sourceFile: string;
    /** Source line number in the file */
    sourceLine: number;
    /** Card type */
    type: 'basic' | 'cloze';
    /** Optional image URL (for cards with images) */
    imageUrl?: string;
    /** Creation timestamp */
    createdAt?: string;
}

/**
 * Input for creating a new flashcard
 */
export interface NewFlashcardInput {
    question: string;
    answer: string;
    hint?: string;
    deck: string;
    imageUrl?: string;
}

/**
 * Progress tracking for a single flashcard
 * Implements SM-2 algorithm state
 */
export interface FlashcardProgress {
    /** Reference to Flashcard.id */
    cardId: string;
    /** Ease factor (starts at 2.5, range 1.3-3.0) */
    ease: number;
    /** Current interval in days */
    interval: number;
    /** Next review date (ISO string YYYY-MM-DD) */
    dueDate: string;
    /** Number of successful reviews */
    repetitions: number;
    /** Last rating given */
    lastRating?: 'easy' | 'good' | 'hard';
    /** Last review date (ISO string) */
    lastReviewDate?: string;
}

/**
 * Statistics for a deck
 */
export interface DeckStats {
    /** Deck name (tag without #) */
    deckName: string;
    /** Total cards in deck */
    totalCards: number;
    /** Cards due for review today */
    dueToday: number;
    /** New cards (never reviewed) */
    newCards: number;
    /** Mastered cards (interval > 21 days) */
    masteredCards: number;
}

/**
 * Review session state
 */
export interface ReviewSession {
    /** Deck being reviewed (null = all decks) */
    deckName: string | null;
    /** Cards to review in this session */
    queue: Flashcard[];
    /** Current card index */
    currentIndex: number;
    /** Session statistics */
    stats: {
        reviewed: number;
        easy: number;
        good: number;
        hard: number;
    };
    /** Session start time */
    startedAt: string;
}

/**
 * User preferences for spaced repetition
 */
export interface SRSettings {
    /** Maximum cards to review per day */
    dailyLimit: number;
    /** Whether to show hints by default */
    showHintsByDefault: boolean;
    /** Enable keyboard shortcuts (1/2/3) */
    enableKeyboardShortcuts: boolean;
    /** Include new cards in daily review */
    includeNewCards: boolean;
    /** Maximum new cards per day */
    newCardsPerDay: number;
}

/**
 * Default settings
 */
export const DEFAULT_SR_SETTINGS: SRSettings = {
    dailyLimit: 20,
    showHintsByDefault: false,
    enableKeyboardShortcuts: true,
    includeNewCards: true,
    newCardsPerDay: 5,
};

/**
 * Default progress for a new card
 */
export const DEFAULT_PROGRESS: Omit<FlashcardProgress, 'cardId'> = {
    ease: 2.5,
    interval: 0,
    dueDate: new Date().toISOString().split('T')[0],
    repetitions: 0,
};
