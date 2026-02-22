# Season Tab (`/season`)

## 入口

- 页面：`src/features/season/SeasonPage.tsx`
- 主要组件：`SeasonCard`, `SeasonWizardModal`, `ChapterFormModal`, `ChapterReviewModal`

## 当前实现

- 主线创建向导（SMART + 激励）
- 篇章新增/编辑/复盘
- 主线分类筛选
- 历史主线折叠区
- 主线/篇章状态由时间窗口和子项进度自动判定

## 关键状态来源

- `useGameStore.activeSeasons`
- `useGameStore.seasonHistory`
- `useGameStore.mainQuests`

## 状态层级

- 若主线锁定，章节/副本应视为锁定
- 篇章支持 `locked/active/paused/completed/overdue_*` 展示状态

## 风险与待优化

- 时间状态与“完成状态”并行存在，需持续避免“有未完成子项但显示已完成”的边界问题

