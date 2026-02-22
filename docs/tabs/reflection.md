# Reflection Tab (`/reflection`)

## 入口

- 仪表盘：`src/features/planner/components/SummaryDashboard.tsx`
- 子模块：`PeriodSummaryCard`, `CalendarHeatmap`, `WeeklyReviewContent`

## 当前实现

- 周/月/季/年多周期总结
- 汇总任务复盘、满意度、总专注时间
- 历史总结查看与导出 RL 训练数据
- 从任务 review 与 task log 合并构建反思数据

## 关键状态来源

- `usePlannerStore.summaries/reflections/interventionHistory`
- `useGameStore.customTasks/archivedTasks/taskLogs`

## 风险与待优化

- 数据来源多路合并，需保持字段口径一致（完成时间、满意度、review 文本）

