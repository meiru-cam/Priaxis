# Daily Tab (`/daily`)

## 入口

- 页面：`src/features/daily/DailyPage.tsx`
- 主要组件：`TaskList`, `MatrixView`, `TaskFormModal`, `TaskReviewModal`, `DailySuccessModal`

## 当前实现

- 快速添加任务（同一行输入任务名/类型/日期/关联）
- 列表视图与四象限视图切换
- 锁定中任务列表（不进入四象限/普通列表）
- 已归档任务折叠区
- 任务编辑支持未保存离开确认
- 任务完成后可进入 AI 回顾（快速/详细）

## 关键状态来源

- store：`useGameStore`（任务、主线关联、归档）
- pomodoro：`usePomodoroStore`

## 关联机制

- 与 Quest/Season/Chapter 关联会影响重要度继承
- 与反思系统联动：完成后可写 review 并进入总结统计

## 风险与待优化

- `TaskFormModal` 有 inheritance + draft 同步逻辑，状态分支多
- lint 对该模块有 `setState in effect` 告警，后续建议拆分初始化/继承逻辑

