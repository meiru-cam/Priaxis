# Recurring Tab (`/recurring`)

## 入口

- 页面：`src/features/recurring/RecurringPage.tsx`
- 主要组件：`HabitList`, `HabitFormModal`, `RecurringTaskList`, `RecurringTaskFormModal`, `HabitHeatmapCard`

## 当前实现

- 习惯创建、编辑、归档、恢复、删除
- 习惯卡片支持拖拽排序
- 归档习惯列表支持恢复与删除
- 重复任务模板（每日/每周/每月）
- 热力图与习惯统计

## 关键状态来源

- `useGameStore.habits`
- `useGameStore.archivedHabits`
- `useGameStore.recurringTasks`

## 风险与待优化

- 习惯与重复任务属于两套机制，用户理解成本较高，后续可统一“循环行为”心智模型

