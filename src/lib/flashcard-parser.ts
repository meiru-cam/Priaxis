/**
 * Flashcard Parser
 * 
 * Parses Obsidian markdown files to extract flashcards.
 * Supports multiple formats used by Obsidian Spaced Repetition plugin.
 */

import type { Flashcard } from '../types/flashcard';

/**
 * Configuration matching Obsidian SR plugin settings
 */
const PARSER_CONFIG = {
    // Single line: Question ;; Answer
    singleLineSeparator: ';;',
    // Multi-line: Question \n ? \n Answer
    multiLineSeparator: '?',
    // Cloze pattern: ==[1;;]answer[;;hint]==
    clozePattern: /==\[(\d*);;?\]([^[]+?)(?:\[;;([^\]]+)\])?==/g,
    // Tags that define decks
    flashcardTagPattern: /#(\w+)/g,
};

/**
 * Generate a unique ID for a flashcard
 */
function generateCardId(sourceFile: string, sourceLine: number, question: string): string {
    const str = `${sourceFile}:${sourceLine}:${question}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

/**
 * Extract tags from file content (typically in frontmatter or body)
 */
function extractTags(content: string): string[] {
    const tags: string[] = [];

    // Check frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        // Match tags: [tag1, tag2] or tags: tag1
        const tagsMatch = frontmatter.match(/tags:\s*(?:\[([^\]]*)\]|(\S+))/);
        if (tagsMatch) {
            const tagStr = tagsMatch[1] || tagsMatch[2];
            // Split by comma or space, clean up
            tagStr.split(/[,\s]+/).forEach(tag => {
                const cleaned = tag.replace(/^#/, '').trim();
                if (cleaned) tags.push(cleaned);
            });
        }
    }

    // Also check for inline tags in the body
    const bodyTags = content.match(/#(\w+)/g);
    if (bodyTags) {
        bodyTags.forEach(tag => {
            const cleaned = tag.replace(/^#/, '');
            if (!tags.includes(cleaned)) {
                tags.push(cleaned);
            }
        });
    }

    return tags;
}

/**
 * Parse single-line flashcards (Question ;; Answer)
 */
function parseSingleLineCards(
    content: string,
    sourceFile: string,
    deck: string
): Flashcard[] {
    const cards: Flashcard[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.includes(PARSER_CONFIG.singleLineSeparator)) {
            const parts = trimmed.split(PARSER_CONFIG.singleLineSeparator);
            if (parts.length >= 2) {
                const question = parts[0].trim();
                const answer = parts.slice(1).join(PARSER_CONFIG.singleLineSeparator).trim();

                if (question && answer) {
                    cards.push({
                        id: generateCardId(sourceFile, index + 1, question),
                        deck,
                        question,
                        answer,
                        sourceFile,
                        sourceLine: index + 1,
                        type: 'basic',
                    });
                }
            }
        }
    });

    return cards;
}

/**
 * Parse multi-line flashcards (Question \n ? \n Answer)
 */
function parseMultiLineCards(
    content: string,
    sourceFile: string,
    deck: string
): Flashcard[] {
    const cards: Flashcard[] = [];
    const lines = content.split('\n');

    let i = 0;
    while (i < lines.length) {
        // Look for a line that is just "?"
        if (lines[i].trim() === PARSER_CONFIG.multiLineSeparator) {
            // Find the question (lines above until empty line or header)
            const questionLines: string[] = [];
            let j = i - 1;
            while (j >= 0 && lines[j].trim() !== '' && !lines[j].startsWith('#')) {
                questionLines.unshift(lines[j]);
                j--;
            }

            // Find the answer (lines below until empty line or next card)
            const answerLines: string[] = [];
            let k = i + 1;
            while (k < lines.length &&
                lines[k].trim() !== '' &&
                lines[k].trim() !== PARSER_CONFIG.multiLineSeparator &&
                !lines[k].includes(PARSER_CONFIG.singleLineSeparator)) {
                answerLines.push(lines[k]);
                k++;
            }

            const question = questionLines.join('\n').trim();
            const answer = answerLines.join('\n').trim();

            if (question && answer) {
                cards.push({
                    id: generateCardId(sourceFile, j + 2, question),
                    deck,
                    question,
                    answer,
                    sourceFile,
                    sourceLine: j + 2, // 1-indexed, first line of question
                    type: 'basic',
                });
            }

            i = k; // Skip to after the answer
        } else {
            i++;
        }
    }

    return cards;
}

/**
 * Parse cloze deletion cards (==[1;;]answer[;;hint]==)
 */
function parseClozeCards(
    content: string,
    sourceFile: string,
    deck: string
): Flashcard[] {
    const cards: Flashcard[] = [];
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
        // Reset regex state
        PARSER_CONFIG.clozePattern.lastIndex = 0;

        let match;
        let clozeIndex = 0;

        while ((match = PARSER_CONFIG.clozePattern.exec(line)) !== null) {
            const [fullMatch, _clozeNum, answer, hint] = match;
            clozeIndex++;

            // The question is the line with the cloze replaced by [...]
            const question = line.replace(fullMatch, '[...]');

            cards.push({
                id: generateCardId(sourceFile, lineIndex + 1, `${question}-${clozeIndex}`),
                deck,
                question: question.trim(),
                answer: answer.trim(),
                hint: hint?.trim(),
                sourceFile,
                sourceLine: lineIndex + 1,
                type: 'cloze',
            });
        }
    });

    return cards;
}

/**
 * Parse a single markdown file and extract all flashcards
 */
export function parseMarkdownFile(
    content: string,
    sourceFile: string,
    defaultDeck: string = 'default'
): Flashcard[] {
    // Extract tags to determine deck
    const tags = extractTags(content);
    // Use first tag as deck name, or default
    const deck = tags[0] || defaultDeck;

    const allCards: Flashcard[] = [];

    // Parse all formats
    allCards.push(...parseSingleLineCards(content, sourceFile, deck));
    allCards.push(...parseMultiLineCards(content, sourceFile, deck));
    allCards.push(...parseClozeCards(content, sourceFile, deck));

    // Deduplicate by ID (in case of overlapping matches)
    const seen = new Set<string>();
    return allCards.filter(card => {
        if (seen.has(card.id)) return false;
        seen.add(card.id);
        return true;
    });
}

/**
 * Parse multiple files and group by deck
 */
export function parseMultipleFiles(
    files: Array<{ path: string; content: string }>
): { cards: Flashcard[]; deckNames: string[] } {
    const allCards: Flashcard[] = [];
    const deckSet = new Set<string>();

    for (const file of files) {
        const cards = parseMarkdownFile(file.content, file.path);
        allCards.push(...cards);
        cards.forEach(card => deckSet.add(card.deck));
    }

    return {
        cards: allCards,
        deckNames: Array.from(deckSet).sort(),
    };
}

/**
 * Filter cards by deck
 */
export function filterByDeck(cards: Flashcard[], deckName: string | null): Flashcard[] {
    if (!deckName) return cards;
    return cards.filter(card => card.deck === deckName);
}

/**
 * Get unique decks from a list of cards
 */
export function getUniqueDecks(cards: Flashcard[]): string[] {
    return [...new Set(cards.map(card => card.deck))].sort();
}
