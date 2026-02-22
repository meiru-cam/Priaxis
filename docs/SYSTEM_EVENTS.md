# System Events & Activity Logs

Priaxis 采用 **双层事件系统** 来追踪用户行为和系统状态。这种设计既保证了细粒度的审计追踪，又支持高层级的剧情事件分析。

## 1. 核心架构

### A. 任务日志 (Task Logs)
**用途**: 低层级审计追踪，记录"发生了什么修改"。
**位置**: `src/types/task.ts` -> `TaskLog`
**存储**: `gameStore.taskLogs` (线性数组)

主要记录对 Task 实体的原子操作：
- `create`: 创建任务
- `update`: 修改任务 (标题、DDL、开始/暂停)
- `complete`: 完成任务
- `archive`: 归档

**同步机制**:
在 `game-store.ts` 中，对 Task 状态的修改是**原子性**的。
当调用 `updateTask` 时，系统会同时：
1. 更新 `customTasks` 数组中的状态。
2. 生成一条 `TaskLog` 并推入 `taskLogs` 数组。
这确保了状态与日志永远一致。

### B. 游戏事件 (Game Events)
**用途**: 高层级语义事件，记录"对人生有什么影响"。
**位置**: `src/types/event.ts` -> `GameEvent`
**存储**: `gameStore.events`

主要记录具有剧情意义或系统影响的变更：
- `quest.completed`: 副本完成 (可能触发升级)
- `skill.xp`: 获得经验值
- `season.created`: 开启新篇章
- `pomodoro.completed`: 专注时刻

## 2. 数据结构定义

### Activity Event (GameEvent)
```typescript
interface GameEvent {
  id: string;
  type: EventType;       // 例如 'quest.completed'
  timestamp: string;     // ISO 8601 时间
  entity: {              // 关联实体
    type: 'quest' | 'skill';
    id: string;
    name: string;
  };
  details: Record<string, unknown>; // 动态参数
  relations: {           // 事件关联网络
    causes: string[];    // 导致此事件的原因
    causedBy: string[];  // 此事件引发的后果
  };
}
```

## 3. Monitor & AI 如何调用

### Monitor Engine (监控引擎)
监控引擎 (`src/services/monitor-engine.ts`) 是连接数据与 AI 的桥梁。
它**每 10 分钟** (配置可调) 扫描一次系统状态。

1. **读取**: Monitor 直接读取 `gameStore.taskLogs` 以计算用户的活跃度。
   - *例子*: "Calculate Time Since Last Completion" (计算距上次完成任务过去了多久) 就是通过过滤 `taskLogs` 中的 `complete` 类型事件实现的。
2. **分析**: 如果发现异常 (如 2小时无产出)，会触发干预规则。
3. **分发**: 触发的干预信号会携带上下文数据传递给 AI Agent。

### AI Agent (Friend/Coach)
AI Agent 获取信息的方式分为 **被动注入** 和 **主动获取** (规划中)。

#### A. 上下文注入 (当前实现)
在每次对话时，系统会自动在 Prompt 头部注入以下信息：
- **系统时间**: `[系统时间: 2025/05/20 14:30:00]`
- **活跃副本**: `[系统上下文: 当前活跃副本: ID_1...]`

当 Monitor 触发主动干预时，它会更进一步，将详细的分析数据注入给 AI：
> "用户今日完成率仅 20%，且已有 3 个任务逾期。请用朋友语气给予鼓励。"

#### B. 主动调用 (Agency)
通过 Function Calling (Tool Use)，AI 可以主动查询数据。
目前支持的工具 (在 `src/lib/ai/tools.ts`):
- `add_task`: 创建任务
- `get_player_status`: (规划中) 查询当前状态表格

### 未来的 AI 能力 (Obsidian Integration)
正如开发计划所述，我们将引入 **MCP Bridge**。这将允许 AI：
1. **Search**: 调用 `search_obsidian(query)` 搜索你的笔记库。
2. **Read**: 调用 `read_note(path)` 读取具体内容。
这些操作将作为新的 `GameEvent` (类型如 `ai.knowledge.access`) 被记录下来。
