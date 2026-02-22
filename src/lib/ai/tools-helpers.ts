type ToolArgs = Record<string, unknown>;

export function parseDateRange(
    dateFrom?: string,
    dateTo?: string,
    relativeDate?: 'yesterday' | 'today' | 'this_week'
): { fromTime: number | null; toTime: number | null } {
    const now = new Date();
    let from = dateFrom;
    let to = dateTo;

    if (relativeDate === 'today') {
        const key = now.toISOString().slice(0, 10);
        from = from || key;
        to = to || key;
    } else if (relativeDate === 'yesterday') {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        const key = y.toISOString().slice(0, 10);
        from = from || key;
        to = to || key;
    } else if (relativeDate === 'this_week') {
        const start = new Date(now);
        const day = start.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        start.setDate(start.getDate() + diffToMonday);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        from = from || start.toISOString().slice(0, 10);
        to = to || end.toISOString().slice(0, 10);
    }

    const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toTime = to ? new Date(`${to}T23:59:59.999`).getTime() : null;
    return {
        fromTime: fromTime && !Number.isNaN(fromTime) ? fromTime : null,
        toTime: toTime && !Number.isNaN(toTime) ? toTime : null,
    };
}

export function sanitizeTaskUpdates(raw: ToolArgs): ToolArgs {
    const updates: ToolArgs = {};

    const normalizedName = typeof raw.name === 'string' ? raw.name : (typeof raw.title === 'string' ? raw.title : undefined);
    if (typeof normalizedName === 'string' && normalizedName.trim()) updates.name = normalizedName.trim();
    if (typeof raw.description === 'string') updates.description = raw.description;
    if (typeof raw.deadline === 'string') updates.deadline = raw.deadline;
    if (typeof raw.context === 'string') updates.context = raw.context;
    if (typeof raw.motivation === 'string') updates.motivation = raw.motivation;
    if (typeof raw.consequence === 'string') updates.consequence = raw.consequence;
    if (typeof raw.attainable === 'string') updates.attainable = raw.attainable;

    if (typeof raw.importance === 'string' && ['low', 'medium', 'high'].includes(raw.importance)) {
        updates.importance = raw.importance;
    }
    if (typeof raw.effort === 'string' && ['light', 'medium', 'heavy'].includes(raw.effort)) {
        updates.effort = raw.effort;
    }
    if (typeof raw.taskType === 'string' && ['creative', 'tax', 'maintenance'].includes(raw.taskType)) {
        updates.taskType = raw.taskType;
    }
    if (typeof raw.status === 'string' && ['todo', 'in_progress', 'completed'].includes(raw.status)) {
        updates.status = raw.status;
    }
    if (typeof raw.linkType === 'string' && ['mainQuest', 'chapter', 'season', 'none'].includes(raw.linkType)) {
        updates.linkType = raw.linkType;
    }
    if (typeof raw.linkedMainQuestId === 'string') updates.linkedMainQuestId = raw.linkedMainQuestId;
    if (typeof raw.linkedQuestId === 'string') updates.linkedMainQuestId = raw.linkedQuestId;
    if (typeof raw.linkedChapterId === 'string') updates.linkedChapterId = raw.linkedChapterId;
    if (typeof raw.linkedSeasonId === 'string') updates.linkedSeasonId = raw.linkedSeasonId;

    if (Array.isArray(raw.checklist)) {
        const safeChecklist = raw.checklist
            .map((item) => {
                if (!item || typeof item !== 'object') return null;
                const candidate = item as Record<string, unknown>;
                if (typeof candidate.id !== 'string' || typeof candidate.text !== 'string' || typeof candidate.completed !== 'boolean') {
                    return null;
                }
                return {
                    id: candidate.id,
                    text: candidate.text,
                    completed: candidate.completed,
                };
            })
            .filter((item): item is { id: string; text: string; completed: boolean } => item !== null);
        updates.checklist = safeChecklist;
    }

    return updates;
}

export function normalizeNotePath(input: string): string {
    return input.trim().replace(/\\/g, '/').replace(/^\/+/, '');
}

export function withMdExtension(path: string): string {
    return path.toLowerCase().endsWith('.md') ? path : `${path}.md`;
}

export function getBaseName(path: string): string {
    const normalized = normalizeNotePath(path);
    const lastPart = normalized.split('/').pop() || normalized;
    return lastPart.replace(/\.md$/i, '');
}

export function extractNotePathsFromUnknown(value: unknown, results: Set<string>, depth = 0): void {
    if (depth > 5 || value == null) return;

    if (typeof value === 'string') {
        const direct = value.trim();
        if (direct.toLowerCase().endsWith('.md')) {
            results.add(normalizeNotePath(direct));
        }
        const matches = direct.match(/[^\s"'`]+\.md/gi) || [];
        matches.forEach((item) => results.add(normalizeNotePath(item)));

        const wikiMatches = Array.from(direct.matchAll(/\[\[([^\]]+)\]\]/g));
        wikiMatches.forEach((entry) => {
            const inner = (entry[1] || '').trim();
            if (!inner) return;
            const withoutAlias = inner.split('|')[0]?.trim() || '';
            const withoutHeading = withoutAlias.split('#')[0]?.trim() || '';
            if (!withoutHeading) return;
            const normalized = normalizeNotePath(withoutHeading);
            results.add(normalized);
            results.add(withMdExtension(normalized));
        });
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((item) => extractNotePathsFromUnknown(item, results, depth + 1));
        return;
    }

    if (typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        const keyCandidates = ['path', 'name', 'file', 'filename', 'sourceFile', 'notePath'];
        keyCandidates.forEach((key) => {
            const candidate = obj[key];
            if (typeof candidate === 'string') {
                const normalized = normalizeNotePath(candidate);
                if (!normalized) return;
                if (normalized.toLowerCase().endsWith('.md')) {
                    results.add(normalized);
                } else if (['name', 'file', 'filename', 'notePath', 'path'].includes(key)) {
                    results.add(withMdExtension(normalized));
                }
            }
        });

        Object.values(obj).forEach((item) => extractNotePathsFromUnknown(item, results, depth + 1));
    }
}

export function attachResolvedPath(result: unknown, resolvedPath: string): Record<string, unknown> {
    if (result && typeof result === 'object' && !Array.isArray(result)) {
        return { ...(result as Record<string, unknown>), resolvedPath };
    }
    return { result, resolvedPath };
}

export function toDebugSnippet(value: unknown): string {
    try {
        const serialized = JSON.stringify(value);
        return serialized.length > 400 ? `${serialized.slice(0, 400)}...` : serialized;
    } catch {
        return String(value);
    }
}
