# Code Health Review (2026-02-18)

本评审基于当前 `main` 分支代码与本地静态检查结果。

## 执行结果

- `npm run build`：通过
- `npm run lint`：失败（`323 errors`, `12 warnings`）

## 主要结论

1. 构建链路可用，但 lint 质量门失效。
2. 当前问题以“可维护性风险”为主，少量可能影响运行时行为。
3. 新功能速度较快，文档与类型约束滞后，需要一次系统性收敛。

## Findings（按严重级别）

### High

- 代码库存在大量 lint error，导致真正的高风险改动容易被淹没。
- `store partialize/export` 处通过大规模解构移除 actions，触发大量 `no-unused-vars`，维护成本高。

示例：

- `src/stores/game-store.ts:2626`
- `src/stores/game-store.ts:2666`
- `src/stores/planner-store.ts:586`
- `src/stores/planner-store.ts:610`

### Medium

- 部分组件存在 `setState in useEffect` 模式，触发 `react-hooks/set-state-in-effect`；其中一部分可能导致额外重渲染和状态同步复杂化。
- 仍存在 `any` 较多的区域（AI、store、migration），压低了类型系统收益。

示例：

- `src/features/daily/components/TaskFormModal.tsx:210`
- `src/features/planner/components/PeriodSummaryCard.tsx:271`
- `src/types/ai.ts:6`
- `src/lib/ai/tools.ts:11`

### Low

- 个别函数定义顺序/依赖声明问题造成 hooks 规则报警，短期不一定坏，但长期不稳定。

示例：

- `src/features/planner/components/InterventionPopup.tsx:162`

## 建议的修复顺序

### Phase 1（先恢复质量门）

1. 统一处理 store 的 `partialize/export`：改成白名单 pick，而不是黑名单解构。
2. 清理最噪音的 `no-unused-vars`（先 `stores/*`）。
3. 修复 `InputField/TextareaField` 中 impure id 生成（改 `useId`）。

### Phase 2（收敛 hooks 与状态同步）

1. 针对 `setState in effect` 按场景重构：
   - 初始化用 lazy initializer
   - 外部输入变化用 key remount 或 reducer
   - 仅在必要时 effect 同步
2. 修复 `exhaustive-deps` 的真实缺失依赖。

### Phase 3（类型治理）

1. 给 AI tool 参数、返回值建立严格类型。
2. 降低 `any` 使用比例，优先 `types/ai.ts`、`lib/ai/tools.ts`、`services/*`。

## 回归测试建议

- 关键路径手测：
  - 任务创建/编辑/完成与复盘
  - 主线-篇章-副本状态传播
  - 奖励池兑换与金币变更
  - AI chat tool use（增删改任务、资源更新）
- 增加最小自动化：
  - store 纯函数与 migration 单测
  - i18n key 完整性检查

