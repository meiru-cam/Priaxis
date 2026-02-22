/**
 * AI Analysis Service
 * Handles AI-powered task analysis via provider selected in .env.
 * API keys remain server-side in bridge env vars.
 */

import {
  AI_PROVIDER,
  GEMINI_MODEL,
  OPENAI_MODEL,
  proxyGeminiGenerate,
  proxyOpenAIChat
} from '../lib/ai/provider-proxy';

function isRateLimitError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('rate') ||
    msg.includes('limit reached')
  );
}

const LIMITING_BELIEF_PATTERNS_ZH: Array<{ pattern: RegExp; alert: string; reframe: string }> = [
  {
    pattern: /我不行|我做不到|我肯定失败/,
    alert: '出现了“能力否定”倾向',
    reframe: '改写为“我现在还不熟练，但可以通过下一步行动变强”。',
  },
  {
    pattern: /必须完美|不能出错|要一次做对/,
    alert: '出现了“完美主义”倾向',
    reframe: '改写为“先完成可用版本，再迭代优化”。',
  },
  {
    pattern: /太晚了|来不及了|已经错过/,
    alert: '出现了“时间灾难化”倾向',
    reframe: '改写为“我先推进最小一步，时间仍可被重构”。',
  },
  {
    pattern: /别人都比我好|我比不上/,
    alert: '出现了“比较型自我否定”倾向',
    reframe: '改写为“我和昨天的自己比较，今天前进了多少”。',
  },
];

const LIMITING_BELIEF_PATTERNS_EN: Array<{ pattern: RegExp; alert: string; reframe: string }> = [
  {
    pattern: /i can't|i am not capable|i will fail/,
    alert: 'Detected capability-denial belief',
    reframe: 'Rewrite as: "I am not fluent yet, but I can improve via the next concrete step."',
  },
  {
    pattern: /must be perfect|can't make mistakes|one shot/,
    alert: 'Detected perfectionism belief',
    reframe: 'Rewrite as: "Ship a workable version first, then iterate."',
  },
  {
    pattern: /too late|no time left|missed the chance/,
    alert: 'Detected time-catastrophizing belief',
    reframe: 'Rewrite as: "Move one smallest step now; the timeline can still be redesigned."',
  },
];

function detectLimitingBeliefs(
  review: string,
  language: 'zh' | 'en'
): { alerts: string[]; reframes: string[] } {
  const text = (review || '').toLowerCase();
  const source = language === 'zh' ? LIMITING_BELIEF_PATTERNS_ZH : LIMITING_BELIEF_PATTERNS_EN;
  const matched = source.filter((item) => item.pattern.test(text)).slice(0, 3);
  return {
    alerts: matched.map((item) => item.alert),
    reframes: matched.map((item) => item.reframe),
  };
}

/**
 * Try to parse JSON with repair attempts for common issues
 */
function tryParseJSON(jsonString: string): Record<string, unknown> | null {
  // First, try direct parse
  try {
    return JSON.parse(jsonString);
  } catch {
    // Continue with repair attempts
  }

  let repaired = jsonString;

  // Attempt 1: Fix truncated JSON by adding closing brackets
  try {
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;

    repaired = repaired + ']'.repeat(Math.max(0, openBrackets - closeBrackets));
    repaired = repaired + '}'.repeat(Math.max(0, openBraces - closeBraces));

    return JSON.parse(repaired);
  } catch {
    // Continue with more repairs
  }

  // Attempt 2: Fix trailing commas and unclosed strings
  try {
    repaired = jsonString.replace(/,(\s*[\]}])/g, '$1');

    const quoteCount = (repaired.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      repaired = repaired + '"';
    }

    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;

    repaired = repaired + ']'.repeat(Math.max(0, openBrackets - closeBrackets));
    repaired = repaired + '}'.repeat(Math.max(0, openBraces - closeBraces));

    return JSON.parse(repaired);
  } catch {
    // Continue with extraction attempt
  }

  // Attempt 3: Extract partial valid JSON
  try {
    const summaryMatch = jsonString.match(/"summary"\s*:\s*"([^"]+)"/);
    const affirmationMatch = jsonString.match(/"affirmation"\s*:\s*"([^"]+)"/);

    if (summaryMatch) {
      return {
        summary: summaryMatch[1],
        affirmation: affirmationMatch?.[1] || 'Keep going!',
        beliefPatterns: [],
        emotionalInsights: [],
        growthSuggestions: [],
      };
    }
  } catch {
    // All attempts failed
  }

  return null;
}

export interface TaskAnalysisInput {
  taskName: string;
  taskDescription?: string;
  review: string;
  satisfaction?: number;
  actualTime?: number;
  actualEnergy?: number;
  taskType?: 'creative' | 'tax' | 'maintenance';
  linkedTo?: string;
  analysisMode?: 'quick' | 'detailed';
  beliefSystem?: {
    mode: 'default' | 'profile';
    profileBeliefs?: string[];
  };
  language?: 'zh' | 'en';
}

export interface TaskAnalysisResult {
  success: boolean;
  analysis?: {
    summary: string;
    beliefPatterns?: string[];
    limitingBeliefAlerts?: string[];
    reframeSuggestions?: string[];
    emotionalInsights?: string[];
    growthSuggestions?: string[];
    affirmation?: string;
    // Structured attribute gains
    attributeGains?: {
      attribute: string;
      reason: string;
    }[];
    skillProgress?: {
      skill: string;
      reason: string;
    }[];
  };
  error?: string;
}

/**
 * Analyze completed task with Gemini AI
 */
export async function analyzeTaskCompletion(
  input: TaskAnalysisInput
): Promise<TaskAnalysisResult> {
  const lang = input.language || 'zh';

  try {
    const isZh = lang === 'zh';
    const analysisMode = input.analysisMode || 'quick';
    const defaultBeliefs = isZh
      ? ['先完成再优化', '行动产生反馈', '小步快跑更可持续', '尊重精力边界', '长期主义']
      : ['Done before perfect', 'Action creates feedback', 'Small steps compound', 'Respect energy limits', 'Think long-term'];
    const beliefSource = input.beliefSystem?.mode === 'profile'
      ? ((input.beliefSystem.profileBeliefs || []).filter(Boolean).slice(0, 8))
      : defaultBeliefs;
    const beliefModeLabel = input.beliefSystem?.mode === 'profile'
      ? (isZh ? '个性化信念库' : 'Personalized Belief Library')
      : (isZh ? '默认信念库' : 'Default Belief Library');
    const analysisInstruction = analysisMode === 'quick'
      ? (isZh
        ? '输出简洁版本：summary 最多 1 句；growthSuggestions 最多 1 条；beliefPatterns 最多 1 条；emotionalInsights 可空；affirmation 1 句。'
        : 'Return concise mode: summary max 1 sentence; max 1 growth suggestion; max 1 belief pattern; emotionalInsights may be empty; 1-sentence affirmation.')
      : (isZh
        ? '输出详细版本：summary 1-2 句；growthSuggestions 最多 3 条；beliefPatterns 最多 3 条；emotionalInsights 最多 2 条。'
        : 'Return detailed mode: summary 1-2 sentences; up to 3 growth suggestions; up to 3 belief patterns; up to 2 emotional insights.');
    const prompt = isZh ? `你是一个专业的个人成长教练，擅长通过任务完成回顾来帮助用户发现信念模式和成长机会。

分析以下任务完成情况，提供：
1. 简短总结（1-2句话）
2. 可能的信念模式（如果有的话）
3. 检测潜在限制性信念（如果有的话）
4. 给出对应的重构建议（如果有的话）
5. 情绪洞察
6. 成长建议
7. 一句鼓励的话
8. 这个任务可能提升的属性（从这些中选择：生命力、求真力、洞察力、想象力、行动力、魅力）
9. 这个任务可能锻炼的技能

任务信息：
- 任务名称：${input.taskName}
${input.taskDescription ? `- 描述：${input.taskDescription}` : ''}
${input.linkedTo ? `- 关联项目：${input.linkedTo}` : ''}
- 任务类型：${input.taskType || 'creative'}
- 完成回顾：${input.review || '(未填写)'}
- 满意度：${input.satisfaction || 3}/5
${input.actualTime ? `- 实际用时：${input.actualTime}小时` : ''}
${input.actualEnergy ? `- 消耗精力：${input.actualEnergy}` : ''}

信念系统（用于判断 beliefPatterns）：
- 来源：${beliefModeLabel}
- 信念列表：${beliefSource.join('；')}

分析模式：${analysisMode === 'quick' ? 'quick' : 'detailed'}
模式要求：${analysisInstruction}

请用中文回复，语气温暖、专业。

重要：只返回纯 JSON 对象，不要添加 markdown 代码块标记：
{
  "summary": "总结",
  "beliefPatterns": ["信念1", "信念2"],
  "limitingBeliefAlerts": ["限制性信念预警"],
  "reframeSuggestions": ["对应重构建议"],
  "emotionalInsights": ["洞察1"],
  "growthSuggestions": ["建议1", "建议2"],
  "affirmation": "鼓励的话",
  "attributeGains": [
    {"attribute": "行动力", "reason": "完成任务展现了执行力"}
  ],
  "skillProgress": [
    {"skill": "时间管理", "reason": "合理安排任务时间"}
  ]
}` : `You are a professional personal growth coach, skilled at helping users discover belief patterns and growth opportunities through task reviews.

Analyze the following task completion, providing:
1. Brief summary (1-2 sentences)
2. Potential belief patterns (if any)
3. Potential limiting beliefs detected (if any)
4. Reframe suggestions for those limiting beliefs (if any)
5. Emotional insights
6. Growth suggestions
7. An encouraging affirmation
8. Attributes improved by this task (choose from: Vitality, Truth, Insight, Imagination, Action, Charm)
9. Skills practiced

Task Information:
- Name: ${input.taskName}
${input.taskDescription ? `- Description: ${input.taskDescription}` : ''}
${input.linkedTo ? `- Linked Project: ${input.linkedTo}` : ''}
- Task Type: ${input.taskType || 'creative'}
- Review: ${input.review || '(None)'}
- Satisfaction: ${input.satisfaction || 3}/5
${input.actualTime ? `- Time Spent: ${input.actualTime} hours` : ''}
${input.actualEnergy ? `- Energy Used: ${input.actualEnergy}` : ''}

Belief system context (for beliefPatterns):
- Source: ${beliefModeLabel}
- Beliefs: ${beliefSource.join('; ')}

Analysis mode: ${analysisMode === 'quick' ? 'quick' : 'detailed'}
Mode constraints: ${analysisInstruction}

Reply in English, warm and professional tone.

IMPORTANT: Return ONLY raw JSON object, no markdown blocks:
{
  "summary": "Summary",
  "beliefPatterns": ["Belief 1", "Belief 2"],
  "limitingBeliefAlerts": ["Limiting belief alert"],
  "reframeSuggestions": ["Reframe suggestion"],
  "emotionalInsights": ["Insight 1"],
  "growthSuggestions": ["Suggestion 1", "Suggestion 2"],
  "affirmation": "Encouraging words",
  "attributeGains": [
    {"attribute": "Action", "reason": "Showed execution power"}
  ],
  "skillProgress": [
    {"skill": "Time Management", "reason": "Managed time well"}
  ]
}`;

    let content = '';
    if (AI_PROVIDER === 'openai') {
      const response = await proxyOpenAIChat({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' as const },
        temperature: 0.7,
        max_tokens: analysisMode === 'quick' ? 380 : 1000,
      });
      const choices = Array.isArray(response.choices) ? response.choices as Array<Record<string, unknown>> : [];
      const message = (choices[0]?.message || null) as Record<string, unknown> | null;
      content = typeof message?.content === 'string' ? message.content : '';
    } else if (AI_PROVIDER === 'gemini') {
      try {
        const response = await proxyGeminiGenerate({
          model: GEMINI_MODEL,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        const candidates = (response as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates || [];
        const parts = candidates[0]?.content?.parts || [];
        const textPart = parts.find((part) => typeof part.text === 'string');
        content = textPart?.text || '';
      } catch (error) {
        if (isRateLimitError(error)) {
          console.warn('[AI Analysis] Gemini 429/limit reached. Falling back to OpenAI for this request.');
          const response = await proxyOpenAIChat({
            model: OPENAI_MODEL,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' as const },
            temperature: 0.7,
            max_tokens: analysisMode === 'quick' ? 380 : 1000,
          });
          const choices = Array.isArray(response.choices) ? response.choices as Array<Record<string, unknown>> : [];
          const message = (choices[0]?.message || null) as Record<string, unknown> | null;
          content = typeof message?.content === 'string' ? message.content : '';
        } else {
          throw error;
        }
      }
    }

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Extract JSON from response
    let jsonContent = content.trim();

    // Handle ```json ... ``` code blocks
    const codeBlockMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonContent = codeBlockMatch[1].trim();
    }

    // Extract JSON object
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    // Parse JSON with repair attempts
    const analysis = tryParseJSON(jsonContent);

    if (analysis && typeof analysis.summary === 'string' && analysis.summary.length > 0) {
      const detection = detectLimitingBeliefs(input.review || '', lang);
      const limitingBeliefAlerts = Array.isArray(analysis.limitingBeliefAlerts) && analysis.limitingBeliefAlerts.length > 0
        ? (analysis.limitingBeliefAlerts as string[]).slice(0, 3)
        : detection.alerts;
      const reframeSuggestions = Array.isArray(analysis.reframeSuggestions) && analysis.reframeSuggestions.length > 0
        ? (analysis.reframeSuggestions as string[]).slice(0, 3)
        : detection.reframes;
      return {
        success: true,
        analysis: {
          summary: String(analysis.summary),
          ...(analysis as TaskAnalysisResult['analysis']),
          limitingBeliefAlerts,
          reframeSuggestions,
        },
      };
    }

    throw new Error('Invalid analysis structure');
  } catch (error) {
    console.error('[AI Analysis] Failed:', error);
    // Fall back to local analysis
    return generateLocalAnalysis(input);
  }
}

/**
 * Generate a local (non-AI) analysis based on task data
 * Used as fallback when AI is unavailable
 */
export function generateLocalAnalysis(input: TaskAnalysisInput): TaskAnalysisResult {
  const { taskName, review, satisfaction = 3, language = 'zh' } = input;
  const isZh = language === 'zh';

  const summaryOptions = isZh ? [
    `完成了「${taskName}」，继续保持这种执行力！`,
    `「${taskName}」已完成，每一步都是进步。`,
    `又一个任务完成！「${taskName}」让你离目标更近了。`,
  ] : [
    `Completed "${taskName}", keep up the momentum!`,
    `"${taskName}" done. Every step counts.`,
    `Another task down! "${taskName}" brings you closer to your goals.`,
  ];

  const affirmations = isZh ? [
    '每一个小小的完成，都是通往伟大的一步。',
    '坚持是一种力量，完成是一种奖励。',
    '今天的努力，是明天的回报。',
    '不积跬步，无以至千里。',
    '你正在成为更好的自己。',
  ] : [
    'Every small finish is a step towards greatness.',
    'Persistence is power, completion is the reward.',
    'Today\'s effort is tomorrow\'s reward.',
    'Progress, not perfection.',
    'You are becoming a better version of yourself.',
  ];

  const growthSuggestions: string[] = [];

  if (satisfaction >= 4) {
    growthSuggestions.push(isZh ? '继续保持这种状态，你做得很好！' : 'Keep it up, you are doing great!');
  } else if (satisfaction <= 2) {
    growthSuggestions.push(isZh ? '下次可以尝试把任务拆分成更小的步骤' : 'Try breaking tasks into smaller steps next time');
    growthSuggestions.push(isZh ? '注意休息，保持精力充沛' : 'Remember to rest and keep your energy up');
  }

  if (review && review.length > 50) {
    growthSuggestions.push(isZh ? '很棒的反思习惯，持续记录会帮助你看到成长轨迹' : 'Great reflection habit, keep recording to see your growth');
  }
  const detection = detectLimitingBeliefs(review || '', language);

  return {
    success: true,
    analysis: {
      summary: summaryOptions[Math.floor(Math.random() * summaryOptions.length)],
      growthSuggestions: growthSuggestions.length > 0 ? growthSuggestions : [isZh ? '保持当前的节奏，稳步前进' : 'Keep your current pace, steady progress'],
      limitingBeliefAlerts: detection.alerts,
      reframeSuggestions: detection.reframes,
      affirmation: affirmations[Math.floor(Math.random() * affirmations.length)],
    },
  };
}

/**
 * Check if AI service is available
 */
export function isAIAvailable(): boolean {
  return true;
}
