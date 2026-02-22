# Progress Propagation Spec

最后更新：2026-02-18

本文档描述 Priaxis 当前代码中的“层级进度反向传播”规则：

- `Task -> Quest -> Chapter -> Season(展示)`

## 1. 层级模型

1. `Season`（主线）
2. `Chapter`（篇章）
3. `Quest`（副本）
4. `Task`（任务）

关联字段（核心）：

- `Task.linkedMainQuestId`
- `Quest.linkedChapterId`
- `Quest.seasonId`
- `Season.chapters[]`

## 2. 进度计算公式

## 2.1 Task -> Quest

实现：`src/stores/game-store.ts:1626` `recalculateQuestProgress`

计算口径：

1. 找到该 `questId` 的所有关联任务：
   - 活跃任务：`customTasks`
   - 归档任务：`archivedTasks`
2. 按 `task.id` 去重（避免重复统计）
3. 进度公式：

```text
Quest.autoProgress = round(completedTasks / totalTasks * 100)
```

4. 更新 `progressTracking`：
   - `linkedTasksCount`
   - `completedTasksCount`
   - `autoProgress`
5. `Quest.progress` 的最终值：
   - 若 `progressTracking.mode === 'manual'`，保留手动进度
   - 否则使用 `autoProgress`

说明：没有关联任务时函数直接返回，不修改该 quest。

## 2.2 Quest -> Chapter

实现：`src/stores/game-store.ts:1683` `recalculateChapterProgress`

计算口径：

1. 找到某 `seasonId + chapterId` 下所有关联 quest
2. 每个 quest 的贡献进度：
   - 若 `quest.status === 'completed'`，按 100 计
   - 否则按 `quest.progress` 计
3. 进度公式：

```text
Chapter.progress = round(sum(questContribution) / linkedQuestsCount)
```

4. 章节完成判定：

```text
allCompleted = every(linkedQuest.status === 'completed')
```

5. `Chapter.status` 更新规则：
   - `allCompleted` 为 true -> `completed`
   - 否则，如果原来是 `completed`，回退为 `active`
   - 其他情况保持原状态

6. 同步写回：
   - `linkedQuests`
   - `completedAt`（全部完成时记录）

说明：没有关联 quest 时函数直接返回，不修改 chapter。

## 2.3 Task 事件触发向上传播

实现：`src/stores/game-store.ts:1773` `propagateProgressUp`

规则：

- 找到 task
- 若有 `linkedMainQuestId`，调用 `recalculateQuestProgress`
- `recalculateQuestProgress` 内部再触发 `recalculateChapterProgress`

## 2.4 批量重算

实现：`src/stores/game-store.ts:1784` / `1792`

- `recalculateAllQuestProgress()`：遍历全部 quest 重算
- `recalculateAllChapterProgress()`：遍历全部 season/chapter 重算

典型触发场景：

- 数据导入后
- migration 后
- 需要全量校正进度时

## 3. Season 进度展示口径

当前 UI 主要以章节完成数展示主线进度（而非独立 season.progress 字段）：

- `src/features/season/components/SeasonCard.tsx:242`

展示形式：

```text
completedChapters / totalChapters
```

这意味着 Season 的“进度条展示口径”与 Chapter 的精确百分比可能并非同一个公式体系。

## 4. 状态判定与层级锁定（展示层）

状态有效值计算在：`src/lib/hierarchy-status.ts`

- `getEffectiveSeasonStatus`
- `getChapterEffectiveDisplayStatus`
- `getEffectiveQuestStatus`

核心逻辑：

- 主线 startDate 在未来 -> locked
- 父层 locked 时子层展示为 locked
- 任务页会依据有效状态把锁定任务放入“锁定中列表”而不是普通列表

## 5. 边界与注意事项

1. 归档任务仍参与 quest 进度统计（只要关联 quest 且 completed 状态存在）。
2. 关联为空时不会自动把进度置 0，而是保持原值（按当前实现）。
3. Quest 手动进度模式下，任务完成不会覆盖 `quest.progress`，但会更新 `progressTracking.autoProgress`。
4. Chapter 的完成判定依赖 quest 的 `status`，不是仅看 quest.progress 是否 100。

## 6. 建议改进

1. 明确“无关联项”时的目标行为（保持原值 vs 自动归零）。
2. 将 Season 展示进度与 Chapter/Quest 百分比体系统一，避免口径差异。
3. 把公式抽离为纯函数并补单元测试，覆盖以下场景：
   - 归档任务参与统计
   - 重复 ID 去重
   - 手动/自动 quest 进度切换
   - chapter 完成/回退

## 7. 代码入口速查

- Quest重算：`src/stores/game-store.ts:1626`
- Chapter重算：`src/stores/game-store.ts:1683`
- 单任务向上传播：`src/stores/game-store.ts:1773`
- 全量重算：`src/stores/game-store.ts:1784`, `src/stores/game-store.ts:1792`
- 层级状态：`src/lib/hierarchy-status.ts`

