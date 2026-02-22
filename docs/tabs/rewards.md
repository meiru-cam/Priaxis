# Rewards Tab (`/rewards`)

## 入口

- 页面：`src/features/rewards/RewardBoardPage.tsx`
- 解析器：`src/lib/reward-parser.ts`

## 当前实现

- 奖励文本解析为贴纸（verb/object/tier）
- 贴纸随机散落布局（位置、角度）
- 支持拖拽、选中、兑换、恢复、删除
- 兑换基于金币与价格档位（A/B/C）
- 操作日志记录兑换事件

## 关键状态来源

- `useGameStore.rewardStickers`
- `useGameStore.rewardActionLogs`
- `useGameStore.resources.money.balance`

## 已知 v1.1 方向

- 解析升级：弱指令文本（如“一个鸡翅”）更好识别
- 布局升级：更自然的 board 分布与重排
- 兑换体验升级：选择反馈、批量操作、日志持久可追踪

