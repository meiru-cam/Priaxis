# Priaxis Engineering Standards

适用范围：本仓库所有新功能、重构、bugfix。  
目标：保证可维护性、安全性、双语一致性、可公开仓库质量。

## 1. 核心原则

1. 先保证行为正确，再优化结构。
2. 新功能必须同时支持中文/英文。
3. 不在组件里堆业务逻辑；复杂逻辑放到 `lib/`、`services/`、`stores/*-helpers.ts`。
4. 所有对用户数据有破坏性的 AI/自动操作必须有确认层。
5. 可公开仓库标准：禁止追踪真实密钥，发布前必须跑安全自检。

## 2. 分层约定

1. `features/*`：页面与交互（UI orchestration），避免重计算与复杂业务规则。
2. `stores/*`：状态与领域动作（Zustand），可调用 helper 纯函数。
3. `services/*`：AI/外部集成、跨模块流程编排。
4. `lib/*`：纯工具函数，无 UI 依赖。
5. `docs/*`：行为和约束文档，功能变化时同步更新。

## 3. 文件与复杂度约定

1. 单文件建议上限：`~600` 行；超过后优先拆 helper/content 模块。
2. 单函数建议上限：`~80` 行；超出需拆子函数。
3. 拆分优先级：
   1. 可复用纯函数
   2. 常量/配置
   3. 文案与 prompt 内容
4. 拆分后要求行为不变，必须通过 `lint + build`。

## 4. 状态管理（Zustand + Immer）

1. Store action 命名使用动词：`addX / updateX / deleteX / recalculateX`。
2. 业务计算优先在 action 内完成，UI 只传必要输入。
3. 数据兼容/迁移逻辑放统一 normalize 函数（如 `normalizeStoreData`）。
4. 日志型状态（task/resource/finance）更新时保证原子性和可追溯性。

## 5. i18n 规范（强制）

1. 禁止新增硬编码用户文案（`tsx/ts` 中直接中文/英文字符串）。
2. 新 key 必须同时更新：
   1. `src/lib/i18n/translations/en.ts`
   2. `src/lib/i18n/translations/zh.ts`
   3. `src/lib/i18n/types.ts`
3. key 命名按 feature 前缀：`task.*`、`quest.*`、`rewards.*`。

## 6. 表单与可访问性规范

1. 每个输入控件必须有 `id` + `name`。
2. 每个输入控件必须有可访问名称：
   1. `<label htmlFor="...">`
   2. 或 `aria-label / aria-labelledby`
3. 分组标题不要用 `Label as="div"`，使用独立 `GroupLabel` 或 `fieldset/legend`。
4. 对键盘交互控件（按钮/贴纸）保持 `aria-label` 与语义一致。

## 7. AI 与工具调用规范

1. Provider 走 bridge 代理，密钥仅在服务端环境变量中读取。
2. 默认 provider 策略：Gemini -> 遇到 `429/limit` 当前请求回退 OpenAI。
3. Tool schema 必须兼容 provider（OpenAI/Gemini 类型映射要统一）。
4. 危险工具（如删除任务/删除笔记）必须二次确认。
5. AI 失败时必须有 deterministic fallback，不阻塞主流程。

## 8. 安全与公开仓库规范

1. `.env`、`*.backup` 必须保持 `.gitignore`，不得追踪。
2. 发布前必须执行：
   1. `npm run check:public`
   2. `npm run lint`
   3. `npm run build`
3. 发现密钥泄漏时：立即轮换 key，再清理历史（必要时重写历史）。
4. 不在前端源码中保留真实 API key 或本地绝对路径。

## 9. Package 使用规范

1. `react` / `react-dom`：UI 与 hooks。
2. `zustand`：全局状态；`immer` 仅用于复杂不可变更新。
3. `react-hook-form` + `zod`：表单与校验；校验规则集中定义。
4. `styled-components`：样式系统，复用主题 token，避免页面内联样式泛滥。
5. `express` + `cors` + `dotenv`：本地 bridge 与 AI 代理。
6. `date-fns`：日期计算优先使用，避免手写复杂日期逻辑。

## 10. 提交与评审规范

1. Commit 信息格式：
   1. `fix:` 行为修复
   2. `refactor:` 结构调整（无行为变更）
   3. `chore:` 工具/文档/流程
2. 一个 commit 尽量只做一类改动（便于回滚）。
3. PR/提交前自检清单：
   1. i18n 三件套已更新
   2. 表单 label/id/name 合规
   3. `check:public + lint + build` 通过
   4. 对应 `docs/tabs/*` 或专题文档已更新
