/**
 * Event System Types
 */

/**
 * Event Types
 */
export type EventType =
  // Task events
  | 'task.created'
  | 'task.completed'
  | 'task.checklist_tick' // DoD item completed
  | 'task.paused'
  | 'task.resumed'
  | 'task.deleted'
  | 'task.progress'
  | 'task.promoted'
  // Quest events
  | 'quest.created'
  | 'quest.completed'
  | 'quest.updated'
  | 'quest.paused'
  | 'quest.resumed'
  // Skill events
  | 'skill.xp'
  | 'skill.levelup'
  // Reflection events
  | 'reflection.started'
  | 'belief.observed'
  | 'inner.permission'
  | 'pattern.recognized'
  // State events
  | 'state.changed'
  // Rest events
  | 'rest.recorded'
  | 'sleep.recorded'
  // Pomodoro events
  | 'pomodoro.completed'
  // Season events
  | 'season.created'
  | 'season.completed'
  | 'chapter.completed';

/**
 * Entity Reference
 */
export interface EventEntity {
  type: 'task' | 'quest' | 'season' | 'chapter' | 'skill' | 'state';
  id: string;
  name: string;
}

/**
 * Event Relations
 */
export interface EventRelations {
  causes: string[]; // Events this event caused
  causedBy: string[]; // Events that caused this
  subevents: string[]; // Contained events
  parentEvent: string | null;
  before: string[]; // Temporally before
  after: string[]; // Temporally after
  concurrent: string[]; // Parallel events
}

/**
 * Belief Analysis
 */
export interface BeliefAnalysis {
  name: string;
  strength: number; // 0-100
}

/**
 * Emotion Analysis
 */
export interface EmotionAnalysis {
  type: string;
  intensity: 'low' | 'medium' | 'high';
  note?: string;
}

/**
 * Next Action Suggestion
 */
export interface NextAction {
  text: string;
  priority: 'low' | 'medium' | 'high';
}

/**
 * AI Event Analysis
 */
export interface EventAnalysis {
  skills?: string[];
  beliefs?: {
    positive: BeliefAnalysis[];
    limiting: BeliefAnalysis[];
  };
  emotion?: EmotionAnalysis;
  nextAction?: NextAction;
  confidence: number; // 0-100
  analyzedAt: string;
}

/**
 * Game Event
 */
export interface GameEvent {
  id: string;
  type: EventType;
  timestamp: string;
  entity: EventEntity;
  details: Record<string, unknown>;
  relations: EventRelations;
  analysis: EventAnalysis | null;
}

/**
 * Event Summary (for memory)
 */
export interface EventSummary {
  id: string;
  period: {
    start: string;
    end: string;
  };
  eventCount: number;
  highlights: string[];
  patterns: string[];
  createdAt: string;
}

/**
 * Core Event (milestone)
 */
export interface CoreEvent {
  eventId: string;
  significance: 'high' | 'milestone' | 'breakthrough';
  description: string;
  flaggedAt: string;
}

/**
 * Event Memories
 */
export interface EventMemories {
  summaries: EventSummary[];
  coreEvents: CoreEvent[];
}

/**
 * Create Event Params
 */
export interface CreateEventParams {
  type: EventType;
  entity: EventEntity;
  details?: Record<string, unknown>;
  parentEventId?: string;
}
