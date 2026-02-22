# Weekly Tab (`/weekly`)

## 入口

- 页面：`src/features/weekly/WeeklyPage.tsx`
- 主要组件：`WeeklyCalendarView`, `WeekSummary`, `WeeklyReviewModal`

## 当前实现

- 周视图看板（任务按周展示）
- 本周完成率、本周任务数统计
- 即将截止的副本/篇章提醒
- 支持写周回顾

## 关键状态来源

- `useGameStore.customTasks`
- `useGameStore.archivedTasks`
- `useGameStore.mainQuests`
- `useGameStore.activeSeasons`

## 统计口径

- 近期已修正为更贴近截止日期口径（而非创建日期口径）
- 会同时考虑本周已完成与未完成任务

## 风险与待优化

- 周范围边界（时区、周起始日）对统计有影响，建议后续集中封装时间口径

