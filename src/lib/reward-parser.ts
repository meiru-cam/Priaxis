import type { RewardSticker, RewardVerb } from '../types/task';

export type ParsedReward = Pick<RewardSticker, 'rawText' | 'verb' | 'object' | 'quantity' | 'unit'>;

const verbPatterns: Array<{ verb: RewardVerb; patterns: RegExp[] }> = [
  { verb: 'drink', patterns: [/^(喝)\s*/i, /\b(drink)\b/i] },
  { verb: 'eat', patterns: [/^(吃|来|整)\s*/i, /\b(eat)\b/i] },
  { verb: 'buy', patterns: [/^(买|购|购买|下单)\s*/i, /\b(buy|get|purchase)\b/i] },
  { verb: 'watch', patterns: [/^(看|追)\s*/i, /\b(watch)\b/i] },
  { verb: 'play', patterns: [/^(玩|打)\s*/i, /\b(play)\b/i] },
  { verb: 'rest', patterns: [/^(休息|睡|躺)\s*/i, /\b(rest|sleep)\b/i] },
];

const cnNumberMap: Record<string, number> = {
  一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
};

const objectVerbHints: Array<{ verb: RewardVerb; keywords: string[] }> = [
  {
    verb: 'drink',
    keywords: [
      '奶茶', '咖啡', '可乐', '饮料', '气泡水', '果汁', '茶', '喝',
    ],
  },
  {
    verb: 'eat',
    keywords: [
      'kfc', '肯德基', '麦当劳', 'mcd', 'kineya', '鸡翅', '炸鸡', '汉堡', '薯条',
      '拉面', '面', '寿司', '披萨', 'pizza', '蛋糕', '甜点',
      '冰淇淋', '饭', '火锅', '烧烤', '小龙虾', '吃',
    ],
  },
  {
    verb: 'watch',
    keywords: ['电影', '剧', '综艺', '动漫', '番', 'youtube', 'bilibili', 'netflix', 'watch'],
  },
  {
    verb: 'play',
    keywords: ['游戏', 'steam', 'switch', 'ps5', 'xbox', 'play'],
  },
  {
    verb: 'rest',
    keywords: ['休息', '睡觉', '午睡', '按摩', '泡澡', 'spa', 'sleep', 'rest'],
  },
  {
    verb: 'buy',
    keywords: ['购物', '下单', '网购', '买', '购买', 'buy'],
  },
];

const SPLIT_TOKENS = /(?:[+,，、;；]|\s+和\s+|\s+and\s+)/i;
const QUANTITY_UNIT_REGEX = /(来)?(\d+|[一二两三四五六七八九十]{1,2})\s*(个|次|份|只|杯|块|顿|小时|分钟|集|pieces?|times?)?/i;

function normalizeText(input: string) {
  return input
    .replace(/[（(].*?[)）]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCnNumber(token: string): number | undefined {
  if (!token) return undefined;
  if (/^\d+$/.test(token)) return Number(token);
  if (token === '十') return 10;
  if (token.length === 2 && token[0] === '十' && cnNumberMap[token[1]]) return 10 + cnNumberMap[token[1]];
  if (token.length === 2 && cnNumberMap[token[0]] && token[1] === '十') return cnNumberMap[token[0]] * 10;
  if (cnNumberMap[token]) return cnNumberMap[token];
  return undefined;
}

function inferVerbByObject(text: string): RewardVerb {
  const lower = text.toLowerCase();
  for (const hint of objectVerbHints) {
    if (hint.keywords.some((kw) => lower.includes(kw.toLowerCase()))) return hint.verb;
  }
  return 'other';
}

function parseSingleReward(rawText: string): ParsedReward | null {
  const text = normalizeText(rawText);
  if (!text) return null;

  let verb: RewardVerb = 'other';
  for (const item of verbPatterns) {
    if (item.patterns.some((pattern) => pattern.test(text))) {
      verb = item.verb;
      break;
    }
  }

  const quantityMatch = text.match(QUANTITY_UNIT_REGEX);
  const quantity = quantityMatch ? parseCnNumber(quantityMatch[2]) : undefined;
  const unit = quantityMatch?.[3] || undefined;

  let object = text
    .replace(/^(吃|喝|买|购|购买|看|追|玩|打|休息|睡|躺|来|整)\s*/i, '')
    .replace(/^(eat|drink|buy|get|watch|play|rest|sleep|have)\s+/i, '')
    .trim();

  if (quantityMatch) {
    object = object.replace(quantityMatch[0], '').trim();
  }

  object = object
    .replace(/^(一下|一次|一个|一份|一顿)\s*/i, '')
    .trim();

  if (!object) object = text;
  if (verb === 'other') verb = inferVerbByObject(`${object} ${text}`);

  return { rawText: text, verb, object, quantity, unit };
}

export function parseRewardTexts(rawText: string): ParsedReward[] {
  const normalized = normalizeText(rawText);
  if (!normalized) return [];

  const chunks = normalized
    .split(SPLIT_TOKENS)
    .map((chunk) => normalizeText(chunk || ''))
    .filter(Boolean);

  // If no split markers, parse as one.
  const targets = chunks.length > 0 ? chunks : [normalized];
  const results: ParsedReward[] = [];
  for (const target of targets) {
    const parsed = parseSingleReward(target);
    if (parsed) results.push(parsed);
  }
  return results;
}
