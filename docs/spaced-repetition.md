# 🧠 Spaced Repetition (间隔重复) 系统

> 基于 SM-2 算法的闪卡复习系统，支持本地存储和 Obsidian 集成

---

## 📋 概述

Spaced Repetition 模块提供了一个完整的闪卡学习系统，使用 SM-2 算法（SuperMemo 2）来优化记忆间隔，帮助用户高效地记忆知识点。

### 核心特性

| 功能 | 描述 |
|------|------|
| **SM-2 算法** | 根据回答质量动态调整复习间隔 |
| **本地存储** | 通过 Zustand persist 保存卡片和进度 |
| **多主题支持** | 完全适配 Solarized Light/Dark、Tomorrow Night 等主题 |
| **导入/导出** | 支持 JSON 格式的数据备份和恢复 |
| **手动添加** | 无需 MCP 也可以手动创建闪卡 |

---

## 🏗️ 架构设计

### 目录结构

```
src/
├── features/spaced-repetition/
│   └── components/
│       ├── SpacedRepetitionTab.tsx    # 主页面组件
│       ├── FlashcardReview.tsx        # 卡片复习界面
│       ├── DeckSelector.tsx           # deck 选择器
│       ├── ReviewSettings.tsx         # 设置面板
│       ├── AddCardModal.tsx           # 添加卡片弹窗
│       └── ImportExportModal.tsx      # 导入导出弹窗
├── stores/
│   └── flashcard-store.ts             # Zustand 状态管理
├── lib/
│   ├── sm2-algorithm.ts               # SM-2 算法实现
│   └── flashcard-parser.ts            # Markdown 解析器
└── types/
    └── flashcard.ts                   # TypeScript 类型定义
```

### 数据流

```
用户操作 → Zustand Store → LocalStorage (持久化)
                ↓
           SM-2 算法计算
                ↓
         下次复习时间
```

---

## 🎯 SM-2 算法

SM-2 是经过验证的间隔重复算法，核心公式：

### Easiness Factor (简易系数)

```typescript
EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
// 其中 q = 用户评分 (0-5)
// EF 最小值为 1.3
```

### 评分映射

| 用户选择 | 算法评分 | 含义 |
|----------|----------|------|
| **Again** | 1 | 完全忘记，重置间隔 |
| **Good** | 3 | 记起来了，正常进度 |
| **Easy** | 5 | 太简单了，加速进度 |

### 间隔计算

```typescript
// 首次复习: 1天
// 第二次: 6天  
// 之后: interval * easinessFactor
```

---

## 🎨 主题系统集成

所有组件都使用 styled-components 的 theme 系统，确保颜色自动适配：

### 颜色使用规范

```tsx
// ✅ 正确 - 使用 theme
color: ${({ theme }) => theme.colors.text.primary};
background: ${({ theme }) => theme.colors.bg.card};

// ❌ 错误 - 硬编码颜色
color: #fff;
background: rgba(255, 255, 255, 0.05);

// ❌ 错误 - CSS 变量 (不被 styled-components 主题管理)
color: var(--text-primary, #fff);
```

### 常用主题属性

| 作用 | 属性路径 |
|------|----------|
| 主要文字 | `theme.colors.text.primary` |
| 次要文字 | `theme.colors.text.secondary` |
| 卡片背景 | `theme.colors.bg.card` |
| 紫色强调 | `theme.colors.accent.purple` |
| 成功状态 | `theme.colors.semantic.success` |
| 危险状态 | `theme.colors.semantic.danger` |
| 边框颜色 | `theme.colors.border.primary` |
| 输入框 | `theme.colors.input.bg/text/border` |

---

## 📦 数据类型

### Flashcard

```typescript
interface Flashcard {
    id: string;
    question: string;
    answer: string;
    hint?: string;
    deck: string;           // tag/分类
    type: 'qa' | 'cloze';   // 问答 或 填空
    sourceFile?: string;    // 来源文件
    imageUrl?: string;
    createdAt: string;
    updatedAt?: string;
}
```

### FlashcardProgress

```typescript
interface FlashcardProgress {
    cardId: string;
    easinessFactor: number;  // 初始 2.5
    interval: number;        // 天数
    repetitions: number;     // 复习次数
    nextReviewDate: string;  // ISO 日期
    lastReviewDate?: string;
    streak: number;          // 连续正确次数
}
```

### SRSettings

```typescript
interface SRSettings {
    dailyLimit: number;              // 每日最大复习数 (默认 50)
    newCardsPerDay: number;          // 每日新卡数 (默认 10)
    enableKeyboardShortcuts: boolean; // 键盘快捷键
    includeNewCards: boolean;         // 是否混入新卡
}
```

---

## ⌨️ 键盘快捷键

| 快捷键 | 动作 |
|--------|------|
| `Space` / `Enter` | 翻转卡片 |
| `H` | 显示提示 |
| `1` | Again (再来一次) |
| `2` | Good (记住了) |
| `3` | Easy (太简单) |

---

## 📥 导入格式

### JSON 格式

```json
{
  "version": "1.0",
  "exportDate": "2026-02-07T12:00:00Z",
  "flashcards": [
    {
      "id": "card-001",
      "question": "What is React?",
      "answer": "A JavaScript library for building UIs",
      "deck": "frontend",
      "createdAt": "2026-02-07T12:00:00Z"
    }
  ],
  "progress": {}
}
```

### Obsidian Markdown 格式 (参考)

```markdown
---
tags: transformer
---

# Flashcards

Q1 ;; Answer 1

Q2
? Part 1 of answer
? Part 2 of answer

Cloze with ==hidden text==
```

---

## 🔧 扩展开发

### 添加新组件

1. 在 `features/spaced-repetition/components/` 创建组件
2. 所有颜色使用 `${({ theme }) => theme.colors.xxx}`
3. 导入到 `SpacedRepetitionTab.tsx` 使用

### 修改算法

1. 编辑 `src/lib/sm2-algorithm.ts`
2. 主要函数：
   - `calculateNextReview()` - 计算下次复习
   - `getDueCards()` - 获取今日待复习
   - `getIntervalPreview()` - 预览间隔

### 添加新存储字段

1. 更新 `src/types/flashcard.ts` 类型定义
2. 更新 `src/stores/flashcard-store.ts` store
3. 注意：Zustand persist 会自动序列化

---

## 🐛 已知限制

1. **MCP 同步已禁用** - 当前使用纯本地模式，MCP Bridge 超时问题待修复
2. **Markdown 导入未实现** - 目前只支持 JSON 导入
3. **LaTeX 渲染未支持** - 卡片中的数学公式显示为原文

---

## 📝 更新日志

### 2026-02-07
- ✅ 修复所有组件主题适配问题
- ✅ 切换到纯本地存储模式
- ✅ 修复 keyframe 动画错误

### 2026-02-06
- ✅ 初始实现 Spaced Repetition 模块
- ✅ 实现 SM-2 算法
- ✅ 添加导入/导出功能
