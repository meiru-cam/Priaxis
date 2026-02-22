# AI Agent Module

## 入口

- UI：`src/features/ai/AIChatInterface.tsx`
- 对话状态：`src/stores/chat-store.ts`
- 服务层：
  - `src/services/ai-base.ts`
  - `src/services/coach-ai.ts`
  - `src/services/friend-ai.ts`
- Tool use：`src/lib/ai/tools.ts`

## 当前实现

- 双人格：`friend` 与 `coach`
- 支持会话历史、会话切换、消息流
- 输入框已做 IME 兼容（中文输入时避免误触 Enter 发送）
- AI provider 由 `.env` 控制：
  - 默认 `gemini`
  - Gemini 命中 429 / quota / limit reached 时，当前请求 fallback 到 OpenAI
- Tool use 与 provider 统一走 `ai-base`，不再固定单通道

## 能力范围（tools）

- 读取玩家状态、任务清单
- 新增/更新/完成/删除任务
- 调整日期、优先级、任务属性
- 资源更新（金币/精力等）

## 关键约束

- 前端直连 API key（`dangerouslyAllowBrowser: true`）适用于个人本地应用场景，不适合公开部署
- tool 参数目前仍有 `any`，类型约束需继续收敛

## 后续建议

1. 给 tool schema 与执行结果建立强类型
2. 增加 tool 审计日志（请求参数 + 执行结果）
3. 增加高风险工具二次确认（例如批量删除）

