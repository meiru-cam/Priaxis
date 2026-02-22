# Quest Tab (`/quest`)

## 入口

- 页面：`src/features/quest/QuestPage.tsx`
- 主要组件：`QuestList`, `QuestFormModal`, `QuestReviewModal`

## 当前实现

- 副本创建、编辑、归档、恢复
- 重要度筛选（高/中/低）
- 副本与任务联动：可在副本下新增任务
- 副本复盘（满意度、总结）

## 关键状态来源

- `useGameStore.mainQuests`
- `useGameStore.customTasks`
- `useGameStore.archivedMainQuests`

## 层级关系

- 副本可关联到 chapter/season
- 副本进度会向上影响 chapter/season 的展示状态与进度

## 风险与待优化

- 部分状态由多处触发更新（任务完成、手动编辑、重算函数），建议统一进度计算入口

