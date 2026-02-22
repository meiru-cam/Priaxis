# AI Router Feature Plan

## Goal

Add a deterministic routing layer before model tool-calling, so key task-intent queries are handled reliably even when user phrasing changes.

## Why

Current behavior relies on model intent understanding + prompt rules. This works for many cases, but can fail when wording changes, context is implicit, or mixed-language input is used.

## Non-Goals (v1)

- Full intent classification for all app capabilities
- Replacing model tool-calling entirely
- Multi-turn planner orchestration

## Scope (v1)

Implement a lightweight pre-router for high-value task queries:

1. Completed tasks by time window
- Examples:
  - "昨天完成了什么"
  - "今天完成了哪些任务"
  - "本周完成情况"
- Route to:
  - `get_tasks`
- Normalized params:
  - `status: "completed"`
  - `relativeDate: "yesterday" | "today" | "this_week"` (or explicit dateFrom/dateTo)

2. Due yesterday but still unfinished
- Examples:
  - "昨天截止但今天没完成的任务"
  - "昨天到期还没做完的有哪些"
- Route to:
  - `get_overdue_tasks`
- Normalized params:
  - `relativeDate: "yesterday"`
  - `matchDeadline: "on_reference"`

3. Generic overdue list
- Examples:
  - "有哪些逾期任务"
  - "现在没完成的过期任务"
- Route to:
  - `get_overdue_tasks`
- Normalized params:
  - `relativeDate: "today"`
  - `matchDeadline: "before_reference"`

## Proposed Architecture

1. Pre-router module
- New module candidate:
  - `src/lib/ai/router.ts`
- Input:
  - raw user message
  - optional language flag
- Output:
  - `null` (no deterministic route)
  - or `{ toolName, args, confidence, reason }`

2. Execution flow
- In `FriendAI.chat` (and optionally Coach):
  1. call pre-router first
  2. if route matched and confidence >= threshold:
     - call tool directly
     - generate user-facing answer using tool result template
  3. else:
     - fallback to current model tool-calling flow

3. Safety
- Keep existing tool-level validations.
- Router only handles read/query intents in v1.
- Mutation intents remain in model tool-calling with confirmation rules.

## Language Support

v1 must support:
- Simplified Chinese
- English

Matching strategy:
- keyword + pattern bundles for zh/en
- normalize punctuation/spaces before matching

## Acceptance Criteria

1. Query reliability
- For at least 20 paraphrases of each scoped intent, route hit rate >= 95%.

2. Correctness
- "昨天完成了什么" returns tasks completed yesterday (from task logs source).
- "昨天截止但今天没完成" returns tasks with deadline == yesterday and not completed.

3. Safety
- No router path performs destructive mutations.

4. Observability
- Add debug log for routed calls:
  - intent
  - chosen tool
  - normalized args

## Iteration Plan

### v1.0
- Implement deterministic routing for 3 scoped intents above.
- Add unit tests for parser + arg normalization.

### v1.1
- Expand to "tomorrow due", "this month completed", "by specific date".
- Add typo tolerance and mixed zh/en phrase handling.

### v1.2
- Add confidence fallback strategy:
  - low confidence => ask clarification question before tool call.

## Risks

1. Over-matching
- A broad pattern could trigger wrong route.
- Mitigation:
  - stricter patterns
  - confidence score + fallback to model

2. Date ambiguity
- "昨天" depends on local timezone.
- Mitigation:
  - use app local timezone consistently
  - log normalized date for debugging

3. Drift with future tool schema changes
- Mitigation:
  - centralize router arg schema constants
  - test router against current tool contract

## Implementation Notes

- Keep router small and explicit. Prefer maintainable rule tables over complex NLP.
- Start with deterministic behavior for known high-impact intents.
- Do not remove model tool-calling path; router is a reliability guardrail.
