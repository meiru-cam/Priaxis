# Spaced Repetition Tab (`/spaced-repetition`)

## 入口

- 组件：`src/features/spaced-repetition/components/SpacedRepetitionTab.tsx`
- store：`src/stores/flashcard-store.ts`

## 当前实现

- Deck 选择与统计
- 复习会话（翻卡、显示提示、评分）
- 设置面板（复习参数）
- 导入/导出与新增卡片弹窗
- 与 Obsidian/MCP 的连接状态展示

## 算法

- 采用 SM-2 风格调度（具体参数在 flashcard store 中维护）

## 风险与待优化

- 与外部数据源同步时的错误恢复与冲突处理需要更细粒度日志

