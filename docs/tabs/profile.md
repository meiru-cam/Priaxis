# Profile Module

## 入口

- 迷你卡片：`src/features/profile/components/PlayerCard.tsx`
- 详情弹窗：`src/features/profile/components/ProfileModal.tsx`
- 主要数据：`src/stores/game-store.ts`

## 当前实现

- 玩家基础资源展示：
  - 金币（`resources.money.balance`）
  - 精力（`resources.energy.current`）
  - 总专注时长（`resources.time.total`）
- 技能系统：9 个技能，分属 3 大类（magician / systemBalancer / observer）
- 称号系统：
  - 默认称号（随等级解锁）
  - 自动生成称号（任务/章节/主线完成触发）
  - 可设置当前称号、删除自定义称号
- 信念系统：
  - 默认模式与个人模式
  - 可在 profile 中查看并配置
- Orchestra/Lore profile 入口（用于后续世界观演化）

## 关键状态字段

- `skills`
- `beliefSystem`
- `titleCatalog`
- `currentTitle`
- `resources`

## 与任务系统联动

- 任务完成后可影响技能 XP、属性变化、称号解锁
- 反思分析会使用信念系统配置参与生成建议

## 风险与待优化

- 游戏化变量较多，建议补充“字段定义文档 + 计算口径文档”避免口径漂移
- 资源变动建议统一走一层 domain service（当前部分逻辑分散在 store/action/tool）

